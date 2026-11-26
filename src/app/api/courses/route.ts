import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { createCourseSchema } from "@/lib/validations/course";

export async function POST(request: NextRequest) {
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

    // 2. Validate request body
    const body = await request.json();
    const validation = createCourseSchema.safeParse(body);

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

    // 3. Insert course into PostgreSQL
    const result = await db.query(
      `INSERT INTO courses
       (user_id, title, description, total_seats, available_seats)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING id, user_id, title, description,
                 total_seats, available_seats, created_at`,
      [userId, title, description, totalSeats]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully",
        course: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create course error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all courses with search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const result = await db.query(
      `SELECT
         courses.id,
         courses.title,
         courses.description,
         courses.total_seats,
         courses.available_seats,
         courses.created_at,
         users.name AS instructor_name
       FROM courses
       INNER JOIN users ON courses.user_id = users.id
       WHERE
         courses.title ILIKE $1
         OR courses.description ILIKE $1
       ORDER BY courses.created_at DESC`,
      [`%${search}%`]
    );

    return NextResponse.json({
      success: true,
      courses: result.rows,
    });
  } catch (error) {
    console.error("Get courses error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}