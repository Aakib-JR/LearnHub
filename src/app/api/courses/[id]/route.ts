import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { updateCourseSchema } from "@/lib/validations/course";
import { parseJsonBody } from "@/lib/parseJsonBody";
import { connectMongoDB } from "@/lib/mongodb";
import CourseContent from "@/models/CourseContent";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET SINGLE COURSE
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT
         courses.id,
         courses.user_id,
         courses.title,
         courses.description,
         courses.total_seats,
         courses.available_seats,
         courses.created_at,
         users.name AS instructor_name
       FROM courses
       INNER JOIN users ON courses.user_id = users.id
       WHERE courses.id = $1`,
      [courseId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      course: result.rows[0],
    });
  } catch (error) {
    console.error("Get single course error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE COURSE
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const token = request.cookies.get("learnhub_token")?.value;
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
          message: "Only admins and instructors can update courses.",
        },
        { status: 403 }
      );
    }

    const parsedBody = await parseJsonBody(request);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = updateCourseSchema.safeParse(parsedBody.body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, description, totalSeats } = validation.data;

    if (
      title === undefined &&
      description === undefined &&
      totalSeats === undefined
    ) {
      return NextResponse.json(
        { success: false, message: "At least one field is required" },
        { status: 400 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // The row lock serializes capacity changes with enroll/unenroll actions.
      const courseResult = await client.query(
        `SELECT id
         FROM courses
         WHERE id = $1
           AND ($2 = 'admin' OR user_id = $3)
         FOR UPDATE`,
        [courseId, role, userId]
      );

      if (courseResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            message: "Course not found or you do not have permission.",
          },
          { status: 404 }
        );
      }

      const enrollmentResult =
        totalSeats === undefined
          ? null
          : await client.query(
              `SELECT COUNT(*)::int AS active_enrollments
               FROM enrollments
               WHERE course_id = $1`,
              [courseId]
            );
      const activeEnrollments = Number(
        enrollmentResult?.rows[0].active_enrollments ?? 0
      );

      if (totalSeats !== undefined && totalSeats < activeEnrollments) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            message:
              "Total seats cannot be lower than the number of enrolled students.",
          },
          { status: 409 }
        );
      }

      const result = await client.query(
        `UPDATE courses
         SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           total_seats = COALESCE($3, total_seats),
           available_seats = CASE
             WHEN $3::integer IS NULL THEN available_seats
             ELSE $3::integer - $7::integer
           END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
           AND ($5 = 'admin' OR user_id = $6)
         RETURNING *`,
        [
          title ?? null,
          description ?? null,
          totalSeats ?? null,
          courseId,
          role,
          userId,
          activeEnrollments,
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Course updated successfully",
        course: result.rows[0],
      });
    } catch (error) {
      await client
        .query("ROLLBACK")
        .catch((rollbackError) =>
          console.error("Course update rollback error:", rollbackError)
        );
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update course error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE COURSE AND ITS MONGODB CONTENT
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const token = request.cookies.get("learnhub_token")?.value;
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
          message: "Only admins and instructors can delete courses.",
        },
        { status: 403 }
      );
    }

    const client = await db.connect();

    try {
      await client.query("BEGIN");

      // Persist cleanup work in PostgreSQL before deleting the course.
      const courseResult = await client.query(
        `SELECT id FROM courses
         WHERE id = $1
           AND ($2 = 'admin' OR user_id = $3)
         FOR UPDATE`,
        [courseId, role, userId]
      );

      if (courseResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            success: false,
            message: "Course not found or you do not have permission.",
          },
          { status: 404 }
        );
      }

      await client.query(
        `INSERT INTO course_content_cleanup_jobs (course_id)
         VALUES ($1)
         ON CONFLICT (course_id) DO NOTHING`,
        [courseId]
      );
      await client.query("DELETE FROM courses WHERE id = $1", [courseId]);
      await client.query("COMMIT");
    } catch (error) {
      await client
        .query("ROLLBACK")
        .catch((rollbackError) =>
          console.error("Course deletion rollback error:", rollbackError)
        );
      throw error;
    } finally {
      client.release();
    }

    try {
      await connectMongoDB();
      await CourseContent.deleteOne({ courseId });
      await db.query(
        "DELETE FROM course_content_cleanup_jobs WHERE course_id = $1",
        [courseId]
      );

      return NextResponse.json({
        success: true,
        message: "Course and its lessons deleted successfully",
      });
    } catch (cleanupError) {
      console.error("Course content cleanup deferred:", cleanupError);

      try {
        await db.query(
          `UPDATE course_content_cleanup_jobs
           SET attempts = attempts + 1,
               last_error = $2
           WHERE course_id = $1`,
          [courseId, "MongoDB cleanup failed"]
        );
      } catch (queueError) {
        console.error("Failed to update cleanup job details:", queueError);
      }

      return NextResponse.json(
        {
          success: true,
          cleanupPending: true,
          message:
            "The course was deleted, but lesson cleanup is pending and will be retried.",
        },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error("Delete course error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
