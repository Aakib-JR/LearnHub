"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type UserRole = "admin" | "instructor" | "user";

function CourseDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchCourse() {
      try {
        setLoading(true);
        setError("");

        const [courseResponse, authResponse] = await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const courseData = await courseResponse.json();

        if (!courseResponse.ok || !courseData.success) {
          throw new Error(courseData.message || "Course not found.");
        }

        const fetchedCourse: Course = courseData.course;
        setCourse(fetchedCourse);

        if (authResponse.ok) {
          const authData = await authResponse.json();

          if (authData.success && authData.user) {
            const userId = Number(authData.user.id);
            const role = authData.user.role as UserRole;

            setCurrentUserId(userId);
            setCurrentUserRole(role);

            // Only students need enrollment status.
            if (role === "user" && userId !== Number(fetchedCourse.user_id)) {
              const enrollmentResponse = await fetch(
                `/api/courses/${id}/enroll`,
                { credentials: "include" }
              );

              if (enrollmentResponse.ok) {
                const enrollmentData = await enrollmentResponse.json();
                setIsEnrolled(enrollmentData.enrolled);
              }
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchCourse();
  }, [id]);

  const isOwner =
    currentUserId !== null &&
    course !== null &&
    currentUserId === Number(course.user_id);

  const canManageCourse =
    currentUserRole === "admin" ||
    (currentUserRole === "instructor" && isOwner);

  async function handleEnroll() {
    try {
      setEnrolling(true);
      setError("");
      setMessage("");

      const response = await fetch(`/api/courses/${id}/enroll`, {
        method: "POST",
        credentials: "include",
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
              available_seats: Math.max(
                0,
                previous.available_seats - 1
              ),
            }
          : previous
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleDelete() {
    if (!course) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${course.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      const response = await fetch(`/api/courses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete course.");
      }

      router.push("/courses");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <p className="text-secondary">Loading course details...</p>
        </div>
      </main>
    );
  }

  if (error && !course) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.error}>{error}</p>
          <Link href="/courses" className={styles.backLink}>
            Back to Courses
          </Link>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.error}>Course not found.</p>
          <Link href="/courses" className={styles.backLink}>
            Back to Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Link href="/courses" className={styles.backLink}>
          &larr; Back to Courses
        </Link>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success" role="status">
            {message}
          </div>
        )}

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

          {canManageCourse && (
            <div className="d-flex flex-wrap gap-2 mt-4">
              <Link
                href={`/courses/${course.id}/edit`}
                className="btn btn-primary"
              >
                Edit Course
              </Link>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Course"}
              </button>
            </div>
          )}
        </section>

        {/* COURSE OWNER / ADMIN LESSON EDITOR */}
        {canManageCourse && (
          <LessonEditor courseId={String(course.id)} />
        )}

        {/* ENROLLED STUDENT LESSON VIEWER */}
        {currentUserRole === "user" &&
          !isOwner &&
          isEnrolled && (
            <LessonViewer courseId={course.id} />
          )}

        {/* STUDENT ENROLLMENT */}
        {currentUserRole === "user" &&
          !isOwner &&
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

        {/* NOT LOGGED IN */}
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
