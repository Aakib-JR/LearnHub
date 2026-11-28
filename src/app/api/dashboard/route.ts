import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { connectMongoDB } from "@/lib/mongodb";
import CourseContent from "@/models/CourseContent";

// GET DASHBOARD STATISTICS
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const token = request.cookies.get("learnhub_token")?.value;
    const userId = verifyAuthToken(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    // 2. Get user details and role
    const userResult = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 3. ADMIN DASHBOARD
    if (user.role === "admin") {
      const [users, courses, enrollments, recentUsers] =
        await Promise.all([
          db.query("SELECT COUNT(*)::int AS total FROM users"),
          db.query("SELECT COUNT(*)::int AS total FROM courses"),
          db.query("SELECT COUNT(*)::int AS total FROM enrollments"),
          db.query(
            `SELECT id, name, email, role, created_at
             FROM users
             ORDER BY created_at DESC
             LIMIT 5`
          ),
        ]);

      return NextResponse.json({
        success: true,
        role: user.role,
        user,
        stats: {
          totalUsers: users.rows[0].total,
          totalCourses: courses.rows[0].total,
          totalEnrollments: enrollments.rows[0].total,
        },
        recentUsers: recentUsers.rows,
      });
    }

    // 4. INSTRUCTOR DASHBOARD
    if (user.role === "instructor") {
      const [courses, students] = await Promise.all([
        db.query(
          `SELECT
             c.id,
             c.title,
             c.description,
             c.total_seats,
             c.available_seats,
             c.created_at,
             COUNT(DISTINCT e.user_id)::int AS total_students
           FROM courses c
           LEFT JOIN enrollments e ON e.course_id = c.id
           WHERE c.user_id = $1
           GROUP BY c.id
           ORDER BY c.created_at DESC`,
          [userId]
        ),
        db.query(
          `SELECT COUNT(DISTINCT e.user_id)::int AS total
           FROM enrollments e
           INNER JOIN courses c ON c.id = e.course_id
           WHERE c.user_id = $1`,
          [userId]
        ),
      ]);

      return NextResponse.json({
        success: true,
        role: user.role,
        user,
        stats: {
          totalCourses: courses.rows.length,
          totalStudents: students.rows[0].total,
        },
        courses: courses.rows,
      });
    }

    // 5. STUDENT DASHBOARD
    if (user.role === "user") {
      const enrolledCourses = await db.query(
        `SELECT
           c.id,
           c.title,
           c.description,
           c.created_at,
           e.enrolled_at,
           COUNT(DISTINCT lp.lesson_id)::int AS completed_lessons
         FROM enrollments e
         INNER JOIN courses c ON c.id = e.course_id
         LEFT JOIN lesson_progress lp
           ON lp.course_id = c.id AND lp.user_id = e.user_id
         WHERE e.user_id = $1
         GROUP BY c.id, e.enrolled_at
         ORDER BY e.enrolled_at DESC`,
        [userId]
      );

      // Get total lessons from MongoDB
      await connectMongoDB();

      const courseIds = enrolledCourses.rows.map(
        (course: { id: number }) => course.id
      );

      const courseContents = await CourseContent.find({
        courseId: { $in: courseIds },
      }).lean();

      const lessonCounts = new Map<number, number>();

      for (const content of courseContents) {
        lessonCounts.set(content.courseId, content.lessons.length);
      }

      const coursesWithProgress = enrolledCourses.rows.map(
        (course: {
          id: number;
          completed_lessons: number;
        }) => {
          const totalLessons = lessonCounts.get(course.id) ?? 0;
          const completedLessons = course.completed_lessons;

          const progress =
            totalLessons > 0
              ? Math.min(
                  100,
                  Math.round((completedLessons / totalLessons) * 100)
                )
              : 0;

          return {
            ...course,
            total_lessons: totalLessons,
            progress,
          };
        }
      );

      const totalCompletedLessons = coursesWithProgress.reduce(
        (total: number, course: { completed_lessons: number }) =>
          total + course.completed_lessons,
        0
      );

      const totalLessons = coursesWithProgress.reduce(
        (total: number, course: { total_lessons: number }) =>
          total + course.total_lessons,
        0
      );

      return NextResponse.json({
        success: true,
        role: user.role,
        user,
        stats: {
          totalEnrolledCourses: coursesWithProgress.length,
          totalCompletedLessons,
          totalLessons,
          overallProgress:
            totalLessons > 0
              ? Math.round((totalCompletedLessons / totalLessons) * 100)
              : 0,
        },
        courses: coursesWithProgress,
      });
    }

    // 6. Unknown role
    return NextResponse.json(
      { success: false, message: "Invalid user role." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load dashboard data." },
      { status: 500 }
    );
  }
}
