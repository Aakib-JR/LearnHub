import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { createCourseSchema } from "@/lib/validations/course";
import { parseJsonBody } from "@/lib/parseJsonBody";

// Create course - Admin and Instructor only
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

    // 2. Check user role
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

    const userRole = userResult.rows[0].role;

    if (userRole !== "admin" && userRole !== "instructor") {
      return NextResponse.json(
        {
          success: false,
          message: "Only Admins and Instructors can create courses.",
        },
        { status: 403 }
      );
    }

    // 3. Validate request body
    const parsedBody = await parseJsonBody(request);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const validation = createCourseSchema.safeParse(parsedBody.body);

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

    // 4. Insert course into PostgreSQL
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
