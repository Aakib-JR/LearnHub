import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // 1. Get JWT token from cookie
    const token = request.cookies.get("learnhub_token")?.value;

    // 2. Verify authentication
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

    // 3. Get logged-in user details including role
    const result = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // 4. Return user details
    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Profile API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
