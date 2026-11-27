"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import styles from "./page.module.css";

interface Course {
  id: number;
  title: string;
  description: string;
  total_seats: number;
  available_seats: number;
  instructor_name: string;
}

const courseImages: Record<string, string> = {
  "Learn React and Next.js":
    "https://www.devwithai.blog/_next/image?url=%2Fimages%2Freact-vs-nextjs-complete-guide.png&w=3840&q=75",

  "Complete React.js for Beginners":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLyWqMvVtH8uH95ZQCtVyiTlR-w_IQO0PaB27Eh9ou2AQ39W-9nD9ut3k&s=10",

  "Full Stack Web Development":
    "https://technosoftacademy.in/wp-content/uploads/2026/08/full-stack-web-development-course.png",

  "UI/UX Design Fundamentals":
    "https://coursecentral.in/wp-content/uploads/2025/04/UI_UX-Designing.jpg",

  "Python Programming":
    "https://i.pinimg.com/736x/6a/fb/f4/6afbf45910b9b4c344737f76043d2cbc.jpg",

  "JavaScript for Beginners":
    "https://www.syncfusion.com/blogs/images/posts/prevent-javascript-memory-leaks-guide/mastering-javascript-memory-leaks-detect-fix-and-prevent.png",

  "Node.js & Express.js":
    "https://codeit.com.np/storage/01J5CG8QJYWM82K1JE6SESQAEB.png",

  "Database Management with PostgreSQL":
    "https://solvaria.com/wp-content/uploads/2026/02/Featured-1_34261013a2.webp",

  "Next.js Complete Guide":
    "https://img-c.udemycdn.com/course/480x270/5443718_2161_3.jpg?w=3840&q=75",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/courses?search=${encodeURIComponent(search)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load courses");
        }

        setCourses(data.courses);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchCourses, 300);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Explore All Courses</h1>

            <p>
              Discover courses, learn new skills,
              and achieve your goals.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search courses..."
            className={styles.searchBox}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {loading && <p>Loading courses...</p>}

          {error && <p>{error}</p>}

          {!loading && !error && courses.length === 0 && (
            <p>No courses available yet.</p>
          )}

          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <article
                className={styles.courseCard}
                key={course.id}
              >
                <img
                  src={
                    courseImages[course.title] ||
                    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600"
                  }
                  alt={course.title}
                  className={styles.courseImage}
                />

                <div className={styles.courseContent}>
                  <h3>{course.title}</h3>

                  <p>{course.description}</p>

                  <p className={styles.courseMeta}>
                    <strong>Instructor:</strong>{" "}
                    {course.instructor_name}
                  </p>

                  <p className={styles.courseMeta}>
                    <strong>Available Seats:</strong>{" "}
                    {course.available_seats} / {course.total_seats}
                  </p>

                  <Link
                    href={`/courses/${course.id}`}
                    className={styles.courseButton}
                  >
                    View Course →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
