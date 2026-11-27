"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import LessonEditor from "@/components/LessonEditor/LessonEditor";
import LessonViewer from "@/components/LessonViewer/LessonViewer";
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
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
            const userId = Number(authData.user.id);
            setCurrentUserId(userId);

            if (userId !== Number(courseData.course.user_id)) {
              const enrollmentResponse = await fetch(
                `/api/courses/${id}/enroll`
              );

              if (enrollmentResponse.ok) {
                const enrollmentData = await enrollmentResponse.json();
                setIsEnrolled(enrollmentData.enrolled);
              }
            }
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

  async function handleEnroll() {
    try {
      setEnrolling(true);
      setError("");
      setMessage("");

      const response = await fetch(`/api/courses/${id}/enroll`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Enrollment failed.");
        return;
      }

      setIsEnrolled(true);
      setMessage(data.message);

      setCourse((previous) =>
        previous
          ? {
              ...previous,
              available_seats: previous.available_seats - 1,
            }
          : previous
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

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

            {currentUserId !== null &&
              currentUserId !== course.user_id &&
              isEnrolled && (
                <LessonViewer courseId={course.id} />
              )}

            {currentUserId !== null &&
              currentUserId !== course.user_id &&
              !isEnrolled && (
                <section className="card p-4 mt-4">
                  <h3 className="fw-bold">Join this course</h3>

                  <p className="text-secondary">
                    Enroll in this course to access all lessons
                    and track your learning progress.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary align-self-start"
                    onClick={handleEnroll}
                    disabled={enrolling || course.available_seats <= 0}
                  >
                    {enrolling
                      ? "Enrolling..."
                      : course.available_seats <= 0
                        ? "Course Full"
                        : "Enroll Now"}
                  </button>
                </section>
              )}

            {currentUserId === null && (
              <section className="card p-4 mt-4">
                <h3 className="fw-bold">Join this course</h3>

                <p className="text-secondary">
                  Please login to enroll and access course lessons.
                </p>

                <Link
                  href="/login"
                  className="btn btn-primary align-self-start"
                >
                  Login to Enroll
                </Link>
              </section>
            )}

            {message && (
              <p className="text-success mt-3">{message}</p>
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
