import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { updateCourseSchema } from "@/lib/validations/course";
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

    const body = await request.json();
    const validation = updateCourseSchema.safeParse(body);

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

    // Admin can update any course.
    // Instructor can update only their own courses.
    const result = await db.query(
      `UPDATE courses
       SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         total_seats = COALESCE($3, total_seats),
         available_seats = available_seats +
           (COALESCE($3, total_seats) - total_seats),
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
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you do not have permission.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course updated successfully",
      course: result.rows[0],
    });
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

    // Admin can delete any course.
    // Instructor can delete only their own courses.
    const courseResult = await db.query(
      `SELECT id FROM courses
       WHERE id = $1
         AND ($2 = 'admin' OR user_id = $3)`,
      [courseId, role, userId]
    );

    if (courseResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you do not have permission.",
        },
        { status: 404 }
      );
    }

    // Delete lessons from MongoDB
    await connectMongoDB();
    await CourseContent.deleteOne({ courseId });

    // Delete course from PostgreSQL
    await db.query("DELETE FROM courses WHERE id = $1", [courseId]);

    return NextResponse.json({
      success: true,
      message: "Course and its lessons deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
