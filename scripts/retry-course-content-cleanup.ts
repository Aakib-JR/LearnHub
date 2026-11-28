import dotenv from "dotenv";
import { Pool } from "pg";
import mongoose from "mongoose";
import CourseContent from "../src/models/CourseContent";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function retryCourseContentCleanup() {
  try {
    const jobs = await pool.query(
      `SELECT course_id
       FROM course_content_cleanup_jobs
       ORDER BY created_at ASC
       LIMIT 100`
    );

    if (jobs.rows.length === 0) {
      console.log("No pending course-content cleanup jobs.");
      return;
    }

    const { connectMongoDB } = await import("../src/lib/mongodb");
    await connectMongoDB();

    let failedJobs = 0;

    for (const job of jobs.rows as Array<{ course_id: number | string }>) {
      const courseId = Number(job.course_id);

      try {
        await CourseContent.deleteOne({ courseId });
        await pool.query(
          "DELETE FROM course_content_cleanup_jobs WHERE course_id = $1",
          [courseId]
        );
        console.log(`Cleaned course content for course ${courseId}.`);
      } catch {
        failedJobs += 1;
        try {
          await pool.query(
            `UPDATE course_content_cleanup_jobs
             SET attempts = attempts + 1,
                 last_error = $2
             WHERE course_id = $1`,
            [courseId, "MongoDB cleanup retry failed"]
          );
        } catch {
          console.error(
            `Could not record the failed cleanup attempt for course ${courseId}.`
          );
        }
        console.error(
          `Course-content cleanup remains pending for course ${courseId}.`
        );
      }
    }

    if (failedJobs > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Course-content cleanup worker failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    await mongoose.disconnect();
  }
}

retryCourseContentCleanup();
