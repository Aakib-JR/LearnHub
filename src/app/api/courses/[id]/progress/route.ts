import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { connectMongoDB } from "@/lib/mongodb";
import CourseContent from "@/models/CourseContent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function checkEnrollment(userId: number, courseId: number) {
  const result = await db.query(
    `SELECT id FROM enrollments
     WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId]
  );

  return result.rows.length > 0;
}

// GET: Retrieve completed lessons
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("learnhub_token")?.value;
    const userId = verifyAuthToken(token);

    if (!userId) {
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

    const enrolled = await checkEnrollment(userId, courseId);

    if (!enrolled) {
      return NextResponse.json(
        { success: false, message: "You must enroll to view progress." },
        { status: 403 }
      );
    }

    const result = await db.query(
      `SELECT lesson_id, completed_at
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2
       ORDER BY completed_at ASC`,
      [userId, courseId]
    );

    return NextResponse.json({
      success: true,
      completedLessons: result.rows,
    });
  } catch (error) {
    console.error("Get progress error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to retrieve progress." },
      { status: 500 }
    );
  }
}

// POST: Mark a lesson as completed
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("learnhub_token")?.value;
    const userId = verifyAuthToken(token);

    if (!userId) {
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

    const enrolled = await checkEnrollment(userId, courseId);

    if (!enrolled) {
      return NextResponse.json(
        { success: false, message: "You must enroll to complete lessons." },
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
      [userId, courseId, lessonId]
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
