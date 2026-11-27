import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";


import CourseContent from "../src/models/CourseContent";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDatabase() {
  try {
    console.log("Starting LearnHub seed process...");

    // 1. Connect to MongoDB
    const { connectMongoDB } = await import("../src/lib/mongodb");
    await connectMongoDB();

    // 2. Create demo user
    const demoEmail = "demo@learnhub.com";
    const demoPassword = "Demo@12345";

    const passwordHash = await bcrypt.hash(demoPassword, 12);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ["LearnHub Demo Instructor", demoEmail, passwordHash]
    );

    const userId = userResult.rows[0].id;

    console.log("Demo user created or updated.");

    // 3. Find or create demo course
    const courseTitle = "Complete React.js for Beginners";

    const existingCourse = await pool.query(
      `SELECT id FROM courses
       WHERE user_id = $1 AND title = $2
       LIMIT 1`,
      [userId, courseTitle]
    );

    let courseId: number;

    if (existingCourse.rows.length > 0) {
      courseId = existingCourse.rows[0].id;

      await pool.query(
        `UPDATE courses
         SET description = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [
          "Learn React.js from the basics with practical examples and real-world projects.",
          courseId,
        ]
      );

      console.log("Demo course already exists. Updated description.");
    } else {
      const courseResult = await pool.query(
        `INSERT INTO courses
         (user_id, title, description, total_seats, available_seats)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        [
          userId,
          courseTitle,
          "Learn React.js from the basics with practical examples and real-world projects.",
          30,
        ]
      );

      courseId = courseResult.rows[0].id;

      console.log("Demo course created.");
    }

    // 4. Create or update MongoDB lessons
    await CourseContent.updateOne(
      { courseId },
      {
        $set: {
          lessons: [
            {
              title: "Introduction to React",
              type: "text",
              body: "React is a JavaScript library used to build modern user interfaces. It helps developers create reusable UI components.",
            },
            {
              title: "Understanding Components",
              type: "text",
              body: "Components are the building blocks of React applications. They allow you to split your UI into independent and reusable pieces.",
            },
            {
              title: "Introduction to JSX",
              type: "text",
              body: "JSX is a syntax extension for JavaScript that allows you to write HTML-like code inside JavaScript.",
            },
            {
              title: "React Tutorial",
              type: "video",
              body: "Watch this video to learn the fundamentals of React.",
              videoUrl: "https://www.youtube.com/watch?v=SqcY0GlETPk",
            },
          ],
        },
      },
      { upsert: true }
    );

    console.log("Demo lessons created or updated.");

    console.log("\nLearnHub seed completed successfully!");
    console.log("Demo email:", demoEmail);
    console.log("Demo password:", demoPassword);
    console.log("Demo course ID:", courseId);
  } catch (error) {
    console.error("Seed process failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    await mongoose.disconnect();
  }
}

seedDatabase();
