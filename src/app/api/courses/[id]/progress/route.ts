import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { connectMongoDB } from "@/lib/mongodb";
import CourseContent from "@/models/CourseContent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("learnhub_token")?.value;
  const userId = verifyAuthToken(token);

  if (!userId) return null;

  const result = await db.query(
    "SELECT id, role FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) return null;

  return {
    id: Number(result.rows[0].id),
    role: result.rows[0].role as string,
  };
}

// GET: Retrieve lesson progress
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID." },
        { status: 400 }
      );
    }

    // Check course and ownership
    const courseResult = await db.query(
      "SELECT id, user_id FROM courses WHERE id = $1",
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    const course = courseResult.rows[0];

    // STUDENT: View own progress only
    if (user.role === "user") {
      const enrollment = await db.query(
        `SELECT id FROM enrollments
         WHERE user_id = $1 AND course_id = $2`,
        [user.id, courseId]
      );

      if (enrollment.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You must enroll to view progress.",
          },
          { status: 403 }
        );
      }

      const result = await db.query(
        `SELECT lesson_id, completed_at
         FROM lesson_progress
         WHERE user_id = $1 AND course_id = $2
         ORDER BY completed_at ASC`,
        [user.id, courseId]
      );

      return NextResponse.json({
        success: true,
        completedLessons: result.rows,
      });
    }

    // INSTRUCTOR: Only view progress in own courses
    if (
      user.role === "instructor" &&
      Number(course.user_id) !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only view progress in your own courses.",
        },
        { status: 403 }
      );
    }

    // ADMIN: Can view progress in any course
    if (user.role !== "admin" && user.role !== "instructor") {
      return NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 }
      );
    }

    // Get all enrolled students and their progress
    const result = await db.query(
      `SELECT
         u.id AS user_id,
         u.name,
         u.email,
         lp.lesson_id,
         lp.completed_at
       FROM enrollments e
       INNER JOIN users u ON u.id = e.user_id
       LEFT JOIN lesson_progress lp
         ON lp.user_id = e.user_id
         AND lp.course_id = e.course_id
       WHERE e.course_id = $1
       ORDER BY u.name ASC, lp.completed_at ASC`,
      [courseId]
    );

    // Group progress by student
    const studentsMap = new Map<number, {
      userId: number;
      name: string;
      email: string;
      completedLessons: {
        lesson_id: string;
        completed_at: Date | null;
      }[];
    }>();

    for (const row of result.rows) {
      const studentId = Number(row.user_id);

      if (!studentsMap.has(studentId)) {
        studentsMap.set(studentId, {
          userId: studentId,
          name: row.name,
          email: row.email,
          completedLessons: [],
        });
      }

      if (row.lesson_id) {
        studentsMap.get(studentId)!.completedLessons.push({
          lesson_id: row.lesson_id,
          completed_at: row.completed_at,
        });
      }
    }

    return NextResponse.json({
      success: true,
      students: Array.from(studentsMap.values()),
    });
  } catch (error) {
    console.error("Get progress error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to retrieve progress." },
      { status: 500 }
    );
  }
}

// POST: Mark a lesson as completed (Student only)
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    if (user.role !== "user") {
      return NextResponse.json(
        {
          success: false,
          message: "Only students can complete lessons.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const lessonId = body.lessonId;

    if (
      typeof lessonId !== "string" ||
      !/^[a-f\d]{24}$/i.test(lessonId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid lesson ID." },
        { status: 400 }
      );
    }

    // Check student enrollment
    const enrollment = await db.query(
      `SELECT id FROM enrollments
       WHERE user_id = $1 AND course_id = $2`,
      [user.id, courseId]
    );

    if (enrollment.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "You must enroll to complete lessons.",
        },
        { status: 403 }
      );
    }

    await connectMongoDB();

    const courseContent = await CourseContent.findOne({ courseId });

    if (!courseContent) {
      return NextResponse.json(
        { success: false, message: "Course lessons not found." },
        { status: 404 }
      );
    }

    const lessonExists = courseContent.lessons.some(
      (lesson) =>
        String(
          (lesson as unknown as { _id: { toString(): string } })._id
        ) === lessonId
    );

    if (!lessonExists) {
      return NextResponse.json(
        { success: false, message: "Lesson not found." },
        { status: 404 }
      );
    }

    const result = await db.query(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, course_id, lesson_id) DO NOTHING
       RETURNING id`,
      [user.id, courseId, lessonId]
    );

    return NextResponse.json({
      success: true,
      message: result.rows.length > 0
        ? "Lesson marked as completed!"
        : "Lesson was already completed.",
    });
  } catch (error) {
    console.error("Save progress error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save lesson progress." },
      { status: 500 }
    );
  }
}
