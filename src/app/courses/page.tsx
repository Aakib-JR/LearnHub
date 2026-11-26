
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
                <h3>{course.title}</h3>

                <p>{course.description}</p>

                <p>Instructor: {course.instructor_name}</p>

                <p>
                  Available Seats: {course.available_seats} /{" "}
                  {course.total_seats}
                </p>

                <Link
                  href={`/courses/${course.id}`}
                  className={styles.courseButton}
                >
                  View Course →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
