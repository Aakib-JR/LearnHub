import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import CourseContent from "../src/models/CourseContent";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const demoEmail = "demo@learnhub.com";
const demoPassword = "Demo@12345";

const courses = [
  {
    title: "Full Stack Web Development",
    description:
      "Learn HTML, CSS, JavaScript, React, Node.js and build real-world full stack projects.",
    totalSeats: 30,
    lessons: [
      {
        title: "Introduction to Web Development",
        type: "text" as const,
        body: "Learn how websites work and understand frontend and backend development.",
      },
      {
        title: "HTML, CSS and JavaScript",
        type: "text" as const,
        body: "Learn the core technologies used to build modern websites.",
      },
      {
        title: "React and Node.js",
        type: "text" as const,
        body: "Build frontend interfaces with React and backend APIs with Node.js.",
      },
    ],
  },
  {
    title: "UI/UX Design Fundamentals",
    description:
      "Master modern UI/UX design principles, wireframing, prototyping and user experiences.",
    totalSeats: 25,
    lessons: [
      {
        title: "Introduction to UI and UX",
        type: "text" as const,
        body: "Understand user interface design and user experience principles.",
      },
      {
        title: "Wireframing and Prototyping",
        type: "text" as const,
        body: "Learn how to plan layouts and create interactive prototypes.",
      },
    ],
  },
  {
    title: "Python Programming",
    description:
      "Learn Python programming fundamentals and develop practical coding skills.",
    totalSeats: 30,
    lessons: [
      {
        title: "Introduction to Python",
        type: "text" as const,
        body: "Python is a beginner-friendly programming language used in many fields.",
      },
      {
        title: "Python Variables and Functions",
        type: "text" as const,
        body: "Learn variables, data types, conditions, loops and functions.",
      },
    ],
  },
  {
    title: "JavaScript for Beginners",
    description:
      "Learn JavaScript fundamentals, ES6 features, DOM manipulation and practical programming.",
    totalSeats: 30,
    lessons: [
      {
        title: "JavaScript Introduction",
        type: "text" as const,
        body: "Understand JavaScript and how it makes websites interactive.",
      },
      {
        title: "Variables and Data Types",
        type: "text" as const,
        body: "Learn let, const, strings, numbers, booleans and basic operators.",
      },
      {
        title: "Functions and DOM",
        type: "text" as const,
        body: "Learn functions, events and how to manipulate HTML elements using JavaScript.",
      },
    ],
  },
  {
    title: "Node.js & Express.js",
    description:
      "Build backend applications and REST APIs using Node.js and Express.js.",
    totalSeats: 25,
    lessons: [
      {
        title: "Introduction to Node.js",
        type: "text" as const,
        body: "Learn how Node.js runs JavaScript outside the browser.",
      },
      {
        title: "Express.js Fundamentals",
        type: "text" as const,
        body: "Create routes, middleware and REST API endpoints with Express.",
      },
    ],
  },
  {
    title: "Database Management with PostgreSQL",
    description:
      "Learn relational database concepts, SQL queries, joins, relationships and PostgreSQL.",
    totalSeats: 25,
    lessons: [
      {
        title: "Introduction to Databases",
        type: "text" as const,
        body: "Understand relational databases, tables, rows and columns.",
      },
      {
        title: "SQL Queries and Joins",
        type: "text" as const,
        body: "Learn SELECT, INSERT, UPDATE, DELETE and SQL JOIN operations.",
      },
    ],
  },
  {
    title: "Next.js Complete Guide",
    description:
      "Build modern full stack applications with Next.js App Router, APIs and server components.",
    totalSeats: 30,
    lessons: [
      {
        title: "Introduction to Next.js",
        type: "text" as const,
        body: "Understand Next.js and its features for building React applications.",
      },
      {
        title: "App Router and Pages",
        type: "text" as const,
        body: "Learn layouts, pages, dynamic routes and navigation with App Router.",
      },
      {
        title: "API Routes and Server Components",
        type: "text" as const,
        body: "Learn how to create APIs and use server components in Next.js.",
      },
    ],
  },
];

async function seedDatabase() {
  try {
    console.log("Starting LearnHub seed process...");

    const { connectMongoDB } = await import("../src/lib/mongodb");
    await connectMongoDB();

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

    console.log("Demo instructor ready.");

    // Keep the existing demo React course and its seats.
    const reactCourse = await pool.query(
      `SELECT id FROM courses
       WHERE user_id = $1
       AND title = $2
       LIMIT 1`,
      [userId, "Complete React.js for Beginners"]
    );

    let reactCourseId: number;

    if (reactCourse.rows.length > 0) {
      reactCourseId = reactCourse.rows[0].id;

      await pool.query(
        `UPDATE courses
         SET description = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [
          "Learn React.js from the basics with practical examples and real-world projects.",
          reactCourseId,
        ]
      );
    } else {
      const result = await pool.query(
        `INSERT INTO courses
         (user_id, title, description, total_seats, available_seats)
         VALUES ($1, $2, $3, 30, 30)
         RETURNING id`,
        [
          userId,
          "Complete React.js for Beginners",
          "Learn React.js from the basics with practical examples and real-world projects.",
        ]
      );

      reactCourseId = result.rows[0].id;
    }

    // Create or update the React course lessons.
    await CourseContent.updateOne(
      { courseId: reactCourseId },
      {
        $set: {
          lessons: [
            {
              title: "Introduction to React",
              type: "text",
              body: "React is a JavaScript library used to build modern user interfaces.",
            },
            {
              title: "Understanding Components",
              type: "text",
              body: "Components are reusable building blocks of React applications.",
            },
            {
              title: "Introduction to JSX",
              type: "text",
              body: "JSX allows developers to write HTML-like syntax inside JavaScript.",
            },
          ],
        },
      },
      { upsert: true }
    );

    // Create the seven additional courses without duplicates.
    for (const course of courses) {
      const existing = await pool.query(
        `SELECT id FROM courses
         WHERE user_id = $1 AND title = $2
         LIMIT 1`,
        [userId, course.title]
      );

      let courseId: number;

      if (existing.rows.length > 0) {
        courseId = existing.rows[0].id;

        await pool.query(
          `UPDATE courses
           SET description = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [course.description, courseId]
        );

        console.log(`Updated: ${course.title}`);
      } else {
        const result = await pool.query(
          `INSERT INTO courses
           (user_id, title, description, total_seats, available_seats)
           VALUES ($1, $2, $3, $4, $4)
           RETURNING id`,
          [
            userId,
            course.title,
            course.description,
            course.totalSeats,
          ]
        );

        courseId = result.rows[0].id;

        console.log(`Created: ${course.title}`);
      }

      await CourseContent.updateOne(
        { courseId },
        { $set: { lessons: course.lessons } },
        { upsert: true }
      );
    }

    console.log("\nLearnHub seed completed successfully!");
    console.log("Demo email:", demoEmail);
    console.log("Demo password:", demoPassword);
  } catch (error) {
    console.error("Seed process failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    await mongoose.disconnect();
  }
}

seedDatabase();
