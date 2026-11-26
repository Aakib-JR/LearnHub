"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import LessonEditor from "@/components/LessonEditor/LessonEditor";
import styles from "./page.module.css";

interface Course {
  id: number;
  user_id: number;
  title: string;
  description: string;
  total_seats: number;
  available_seats: number;
  instructor_name: string;
}

function CourseDetailsContent() {
  const params = useParams();
  const id = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        setError("");

        const [courseResponse, authResponse] = await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch("/api/auth/me"),
        ]);

        const courseData = await courseResponse.json();

        if (!courseResponse.ok || !courseData.success) {
          throw new Error(courseData.message || "Course not found");
        }

        setCourse(courseData.course);

        if (authResponse.ok) {
          const authData = await authResponse.json();

          if (authData.success) {
            setCurrentUserId(Number(authData.user.id));
          }
        }
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

    fetchCourse();
  }, [id]);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Link href="/courses" className={styles.backLink}>
          ← Back to Courses
        </Link>

        {loading && <p>Loading course details...</p>}

        {error && <p className={styles.error}>{error}</p>}

        {course && (
          <>
            <section className={styles.courseDetails}>
              <span className={styles.tag}>COURSE DETAILS</span>

              <h1>{course.title}</h1>

              <p className={styles.description}>
                {course.description}
              </p>

              <div className={styles.info}>
                <p>
                  <strong>Instructor:</strong>{" "}
                  {course.instructor_name}
                </p>

                <p>
                  <strong>Total Seats:</strong>{" "}
                  {course.total_seats}
                </p>

                <p>
                  <strong>Available Seats:</strong>{" "}
                  {course.available_seats}
                </p>
              </div>
            </section>

            {currentUserId === course.user_id && (
              <LessonEditor courseId={String(course.id)} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function CourseDetailsPage() {
  return (
    <>
      <Navbar />

      <Suspense fallback={<p>Loading course page...</p>}>
        <CourseDetailsContent />
      </Suspense>

      <Footer />
    </>
  );
}
