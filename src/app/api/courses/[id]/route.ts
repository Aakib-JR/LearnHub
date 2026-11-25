import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { updateCourseSchema } from "@/lib/validations/course";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // 1. Check authentication
    const token = request.cookies.get("learnhub_token")?.value;
    const userId = verifyAuthToken(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get and validate course ID
    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID" },
        { status: 400 }
      );
    }

    // 3. Validate request body
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

    // 4. Update only the owner's course
    const result = await db.query(
      `UPDATE courses
       SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         total_seats = COALESCE($3, total_seats),
         available_seats = available_seats +
           (COALESCE($3, total_seats) - total_seats),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        title ?? null,
        description ?? null,
        totalSeats ?? null,
        courseId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not the owner",
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


export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    // 1. Check authentication
    const token = request.cookies.get("learnhub_token")?.value;
    const userId = verifyAuthToken(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Validate course ID
    const { id } = await params;
    const courseId = Number(id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid course ID" },
        { status: 400 }
      );
    }

    // 3. Delete only the owner's course
    const result = await db.query(
      `DELETE FROM courses
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [courseId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Course not found or you are not the owner",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
