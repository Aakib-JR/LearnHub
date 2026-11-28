import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import CourseContent from "@/models/CourseContent";
import { saveLessonsSchema } from "@/lib/validations/lesson";
import { parseJsonBody } from "@/lib/parseJsonBody";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface LessonIdProjection {
  lessons: Array<{ _id: { toString(): string } }>;
}

// GET: Read course lessons
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = request.cookies.get("learnhub_token")?.value;
    const userId = token ? verifyAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID" },
        { status: 400 }
      );
    }

    // Get user role and course access
    const result = await db.query(
      `SELECT
         c.id,
         c.user_id,
         u.role,
         EXISTS (
           SELECT 1
           FROM enrollments e
           WHERE e.course_id = c.id
             AND e.user_id = $2
         ) AS is_enrolled
       FROM courses c
       CROSS JOIN users u
       WHERE c.id = $1
         AND u.id = $2`,
      [courseId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    const course = result.rows[0];

    const isOwner =
      Number(course.user_id) === Number(userId);

    const isAdmin = course.role === "admin";

    const isEnrolled = course.is_enrolled;

    if (!isAdmin && !isOwner && !isEnrolled) {
      return NextResponse.json(
        {
          success: false,
          message: "You must enroll to view lessons",
        },
        { status: 403 }
      );
    }

    await connectMongoDB();

    const content = await CourseContent.findOne({
      courseId,
    }).lean();

    return NextResponse.json({
      success: true,
      lessons: content?.lessons ?? [],
    });
  } catch (error) {
    console.error("Get lessons error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

// PUT: Save or update course lessons
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = request.cookies.get("learnhub_token")?.value;
    const userId = token ? verifyAuthToken(token) : null;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID" },
        { status: 400 }
      );
    }

    // Check user role
    const userResult = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const role = userResult.rows[0].role;

    if (role !== "admin" && role !== "instructor") {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins and instructors can manage lessons.",
        },
        { status: 403 }
      );
    }

    // Admin can manage any course.
    // Instructor can manage only their own courses.
    const courseResult = await db.query(
      `SELECT id
       FROM courses
       WHERE id = $1
         AND ($2 = 'admin' OR user_id = $3)`,
      [courseId, role, userId]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or access denied",
        },
        { status: 404 }
      );
    }

    const parsedBody = await parseJsonBody(request);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = saveLessonsSchema.safeParse(parsedBody.body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const existingContent = await CourseContent.findOne({ courseId })
      .select("lessons._id")
      .lean<LessonIdProjection>();
    const existingLessonIds = new Set(
      (existingContent?.lessons ?? []).map((lesson) => String(lesson._id))
    );
    const submittedLessonIds = validation.data.lessons.flatMap((lesson) =>
      lesson._id ? [lesson._id] : []
    );
    const uniqueSubmittedLessonIds = new Set(submittedLessonIds);

    if (
      uniqueSubmittedLessonIds.size !== submittedLessonIds.length ||
      submittedLessonIds.some((lessonId) => !existingLessonIds.has(lessonId))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid lesson ID" },
        { status: 400 }
      );
    }

    const removedLessonIds = Array.from(existingLessonIds).filter(
      (lessonId) => !uniqueSubmittedLessonIds.has(lessonId)
    );

    const content = await CourseContent.findOneAndUpdate(
      { courseId },
      { $set: { lessons: validation.data.lessons } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    let warning: string | undefined;

    if (removedLessonIds.length > 0) {
      try {
        await db.query(
          `DELETE FROM lesson_progress
           WHERE course_id = $1
             AND lesson_id = ANY($2::text[])`,
          [courseId, removedLessonIds]
        );
      } catch (error) {
        console.error("Delete removed lesson progress error:", error);
        warning =
          "Lessons were saved, but progress records for deleted lessons could not be cleared.";
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lessons saved successfully",
      warning,
      lessons: content.lessons,
    });
  } catch (error) {
    console.error("Save lessons error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save lessons" },
      { status: 500 }
    );
  }
}
