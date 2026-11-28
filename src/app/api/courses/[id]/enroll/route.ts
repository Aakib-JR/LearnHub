import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Check enrollment status
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
        {
          success: false,
          message: "Unauthorized. Please login.",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid course ID.",
        },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT id
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    return NextResponse.json({
      success: true,
      enrolled: result.rows.length > 0,
    });
  } catch (error) {
    console.error("Check enrollment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to check enrollment status.",
      },
      { status: 500 }
    );
  }
}

// POST: Enroll student in a course
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  let client;

  try {
    // 1. Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("learnhub_token")?.value;
    const userId = verifyAuthToken(token);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please login.",
        },
        { status: 401 }
      );
    }

    // 2. Check user role
    const userResult = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found.",
        },
        { status: 404 }
      );
    }

    if (userResult.rows[0].role !== "user") {
      return NextResponse.json(
        {
          success: false,
          message: "Only students can enroll in courses.",
        },
        { status: 403 }
      );
    }

    // 3. Get and validate course ID
    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid course ID.",
        },
        { status: 400 }
      );
    }

    // 4. Start database transaction
    client = await db.connect();
    await client.query("BEGIN");

    // 5. Lock course row
    const courseResult = await client.query(
      `SELECT id, available_seats
       FROM courses
       WHERE id = $1
       FOR UPDATE`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "Course not found.",
        },
        { status: 404 }
      );
    }

    // 6. Check duplicate enrollment
    const enrollmentResult = await client.query(
      `SELECT id
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    if (enrollmentResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "You are already enrolled in this course.",
        },
        { status: 409 }
      );
    }

    // 7. Check available seats
    if (courseResult.rows[0].available_seats <= 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          message: "This course is full.",
        },
        { status: 409 }
      );
    }

    // 8. Create enrollment
    await client.query(
      `INSERT INTO enrollments (user_id, course_id)
       VALUES ($1, $2)`,
      [userId, courseId]
    );

    // 9. Decrease available seats
    await client.query(
      `UPDATE courses
       SET available_seats = available_seats - 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [courseId]
    );

    // 10. Complete transaction
    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Successfully enrolled in the course!",
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Enrollment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to enroll in course.",
      },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}

// DELETE: Unenroll the authenticated student from a course
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  let client;

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

    const userResult = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (userResult.rows[0].role !== "user") {
      return NextResponse.json(
        {
          success: false,
          message: "Only students can unenroll from courses.",
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

    client = await db.connect();
    await client.query("BEGIN");

    const courseResult = await client.query(
      `SELECT id, total_seats
       FROM courses
       WHERE id = $1
       FOR UPDATE`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    const enrollmentResult = await client.query(
      `DELETE FROM enrollments
       WHERE user_id = $1 AND course_id = $2
       RETURNING id`,
      [userId, courseId]
    );

    if (enrollmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          success: false,
          message: "You are not enrolled in this course.",
        },
        { status: 409 }
      );
    }

    const activeEnrollmentResult = await client.query(
      `SELECT COUNT(*)::int AS active_enrollments
       FROM enrollments
       WHERE course_id = $1`,
      [courseId]
    );
    const totalSeats = Number(courseResult.rows[0].total_seats);
    const activeEnrollments = Number(
      activeEnrollmentResult.rows[0].active_enrollments
    );
    const availableSeats = Math.max(0, totalSeats - activeEnrollments);

    const seatResult = await client.query(
      `UPDATE courses
       SET available_seats = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING available_seats`,
      [courseId, availableSeats]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Successfully unenrolled from the course.",
      availableSeats: Number(seatResult.rows[0].available_seats),
    });
  } catch (error) {
    if (client) {
      await client
        .query("ROLLBACK")
        .catch((rollbackError) =>
          console.error("Unenrollment rollback error:", rollbackError)
        );
    }

    console.error("Unenrollment error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to unenroll from course." },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
