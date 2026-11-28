import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import CourseContent from "../src/models/CourseContent";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface InitialAdminCredentials {
  email: string;
  password: string;
}

interface SeedInstructorCredentials {
  email: string;
  password?: string;
}

interface SeedLesson {
  seedKey: string;
  title: string;
  type: "text" | "video";
  body: string;
  videoUrl?: string;
}

function getInitialAdminCredentials(): InitialAdminCredentials | null {
  const email = process.env.LEARNHUB_INITIAL_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();
  const password = process.env.LEARNHUB_INITIAL_ADMIN_PASSWORD;

  if (!email && !password) return null;

  if (!email || !password) {
    throw new Error(
      "Set both LEARNHUB_INITIAL_ADMIN_EMAIL and LEARNHUB_INITIAL_ADMIN_PASSWORD to provision an initial admin."
    );
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("LEARNHUB_INITIAL_ADMIN_EMAIL must be a valid email.");
  }

  if (password.trim().length < 12) {
    throw new Error(
      "LEARNHUB_INITIAL_ADMIN_PASSWORD must be at least 12 characters."
    );
  }

  return { email, password };
}

function getSeedInstructorCredentials(): SeedInstructorCredentials | null {
  const email = process.env.LEARNHUB_SEED_INSTRUCTOR_EMAIL
    ?.trim()
    .toLowerCase();
  const password = process.env.LEARNHUB_SEED_INSTRUCTOR_PASSWORD;

  if (!email && !password) return null;

  if (!email) {
    throw new Error(
      "LEARNHUB_SEED_INSTRUCTOR_EMAIL is required when an instructor password is supplied."
    );
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "LEARNHUB_SEED_INSTRUCTOR_EMAIL must be a valid email."
    );
  }

  if (password && password.trim().length < 12) {
    throw new Error(
      "LEARNHUB_SEED_INSTRUCTOR_PASSWORD must be at least 12 characters."
    );
  }

  return password ? { email, password } : { email };
}

async function ensureSeedInstructor(
  credentials: SeedInstructorCredentials | null
): Promise<number | null> {
  if (!credentials) return null;

  const existing = await pool.query(
    "SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [credentials.email]
  );

  if (existing.rows.length > 0) {
    if (existing.rows[0].role !== "instructor") {
      throw new Error(
        "The configured seed instructor email belongs to a non-instructor account; no role or credentials were changed."
      );
    }

    console.log("Existing seed instructor preserved.");
    return Number(existing.rows[0].id);
  }

  if (!credentials.password) {
    return null;
  }

  const passwordHash = await bcrypt.hash(credentials.password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'instructor')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ["LearnHub Seed Instructor", credentials.email, passwordHash]
  );

  if (result.rows.length > 0) {
    console.log("Seed instructor created.");
    return Number(result.rows[0].id);
  }

  const conflictingUser = await pool.query(
    "SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [credentials.email]
  );

  if (conflictingUser.rows[0]?.role === "instructor") {
    return Number(conflictingUser.rows[0].id);
  }

  throw new Error(
    "Could not create the seed instructor because the email is already in use; the existing account was not changed."
  );
}

async function provisionInitialAdmin(
  credentials: InitialAdminCredentials | null
) {
  const existingAdmin = await pool.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (existingAdmin.rows.length > 0) {
    console.log("Existing admin account preserved.");
    return;
  }

  if (!credentials) {
    console.log(
      "Initial admin provisioning skipped; supply explicit admin environment credentials when needed."
    );
    return;
  }

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [credentials.email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error(
      "The requested admin email already belongs to an account; no role or credentials were changed."
    );
  }

  const passwordHash = await bcrypt.hash(credentials.password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ["LearnHub Admin", credentials.email, passwordHash]
  );

  if (result.rows.length === 0) {
    throw new Error(
      "Initial admin could not be created because the email is already in use; the existing account was not changed."
    );
  }

  console.log("Initial admin provisioned.");
}

async function syncSeedLessons(
  courseId: number,
  seedLessons: SeedLesson[]
) {
  const content = await CourseContent.findOne({ courseId });

  if (!content) {
    await CourseContent.create({ courseId, lessons: seedLessons });
    return;
  }

  for (const seedLesson of seedLessons) {
    const keyedMatches = content.lessons.filter(
      (lesson) => lesson.seedKey === seedLesson.seedKey
    );

    if (keyedMatches.length > 1) {
      throw new Error(
        `Multiple lessons use the seed key "${seedLesson.seedKey}" in course ${courseId}.`
      );
    }

    let existingLesson = keyedMatches[0];

    if (!existingLesson) {
      const unkeyedLessons = content.lessons.filter(
        (lesson) => !lesson.seedKey
      );
      const bodyMatches = unkeyedLessons.filter(
        (lesson) => lesson.body === seedLesson.body
      );
      const titleMatches = unkeyedLessons.filter(
        (lesson) =>
          lesson.title.trim().toLowerCase() ===
          seedLesson.title.trim().toLowerCase()
      );
      const legacyMatches =
        bodyMatches.length === 1
          ? bodyMatches
          : bodyMatches.length > 1
            ? bodyMatches.filter((lesson) =>
                titleMatches.includes(lesson)
              )
            : titleMatches;

      if (legacyMatches.length > 1) {
        throw new Error(
          `Could not uniquely map seeded lesson "${seedLesson.seedKey}" in course ${courseId}.`
        );
      }

      existingLesson = legacyMatches[0];
    }

    if (existingLesson) {
      existingLesson.type = seedLesson.type;
      existingLesson.body = seedLesson.body;
      existingLesson.videoUrl = seedLesson.videoUrl;
      existingLesson.seedKey = seedLesson.seedKey;
    } else {
      content.lessons.push(seedLesson);
    }
  }

  await content.save();
}

const courses = [
  {
    title: "Full Stack Web Development",
    description:
      "Learn HTML, CSS, JavaScript, React, Node.js and build real-world full stack projects.",
    totalSeats: 30,
    lessons: [
      {
        seedKey: "web-development-intro",
        title: "Introduction to Web Development",
        type: "text" as const,
        body: "Learn how websites work and understand frontend and backend development.",
      },
      {
        seedKey: "html-css-javascript",
        title: "HTML, CSS and JavaScript",
        type: "text" as const,
        body: "Learn the core technologies used to build modern websites.",
      },
      {
        seedKey: "react-node",
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
        seedKey: "ui-ux-intro",
        title: "Introduction to UI and UX",
        type: "text" as const,
        body: "Understand user interface design and user experience principles.",
      },
      {
        seedKey: "wireframing-prototyping",
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
        seedKey: "python-intro",
        title: "Introduction to Python",
        type: "text" as const,
        body: "Python is a beginner-friendly programming language used in many fields.",
      },
      {
        seedKey: "python-variables-functions",
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
        seedKey: "javascript-intro",
        title: "JavaScript Introduction",
        type: "text" as const,
        body: "Understand JavaScript and how it makes websites interactive.",
      },
      {
        seedKey: "javascript-variables-data-types",
        title: "Variables and Data Types",
        type: "text" as const,
        body: "Learn let, const, strings, numbers, booleans and basic operators.",
      },
      {
        seedKey: "javascript-functions-dom",
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
        seedKey: "nodejs-intro",
        title: "Introduction to Node.js",
        type: "text" as const,
        body: "Learn how Node.js runs JavaScript outside the browser.",
      },
      {
        seedKey: "express-fundamentals",
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
        seedKey: "database-intro",
        title: "Introduction to Databases",
        type: "text" as const,
        body: "Understand relational databases, tables, rows and columns.",
      },
      {
        seedKey: "sql-queries-joins",
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
        seedKey: "nextjs-intro",
        title: "Introduction to Next.js",
        type: "text" as const,
        body: "Understand Next.js and its features for building React applications.",
      },
      {
        seedKey: "app-router-pages",
        title: "App Router and Pages",
        type: "text" as const,
        body: "Learn layouts, pages, dynamic routes and navigation with App Router.",
      },
      {
        seedKey: "api-routes-server-components",
        title: "API Routes and Server Components",
        type: "text" as const,
        body: "Learn how to create APIs and use server components in Next.js.",
      },
    ],
  },
];

async function seedCourses(userId: number) {
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

  await syncSeedLessons(reactCourseId, [
    {
      seedKey: "react-intro",
      title: "Introduction to React",
      type: "text",
      body: "React is a JavaScript library used to build modern user interfaces.",
    },
    {
      seedKey: "react-components",
      title: "Understanding Components",
      type: "text",
      body: "Components are reusable building blocks of React applications.",
    },
    {
      seedKey: "react-jsx",
      title: "Introduction to JSX",
      type: "text",
      body: "JSX allows developers to write HTML-like syntax inside JavaScript.",
    },
  ]);

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

    await syncSeedLessons(courseId, course.lessons);
  }
}

async function seedDatabase() {
  try {
    console.log("Starting LearnHub seed process...");

    const adminCredentials = getInitialAdminCredentials();
    const instructorCredentials = getSeedInstructorCredentials();
    const { connectMongoDB } = await import("../src/lib/mongodb");
    await connectMongoDB();

    const instructorId = await ensureSeedInstructor(instructorCredentials);

    if (instructorId === null) {
      console.log(
        "Course seeding skipped. Select an existing instructor by email or provide credentials to create one."
      );
    } else {
      await seedCourses(instructorId);
    }

    await provisionInitialAdmin(adminCredentials);
    console.log("\nLearnHub seed completed successfully!");
  } catch (error) {
    console.error("Seed process failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    await mongoose.disconnect();
  }
}

seedDatabase();
