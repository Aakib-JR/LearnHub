"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { updateCourseSchema } from "@/lib/validations/course";
import styles from "./page.module.css";

interface Course {
  id: number;
  user_id: number | string;
  title: string;
  description: string;
  total_seats: number;
}

interface CourseResponse {
  success: boolean;
  message?: string;
  course?: Course;
}

interface UserResponse {
  success: boolean;
  message?: string;
  user?: {
    id: number | string;
    role: string;
  };
}

interface UpdateResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export default function EditCoursePage() {
  return (
    <Suspense
      fallback={
        <main className={styles.main}>
          <div className={styles.container}>
            <p className={styles.status} role="status">
              Loading course...
            </p>
          </div>
        </main>
      }
    >
      <EditCourseContent />
    </Suspense>
  );
}

function EditCourseContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const [courseResponse, authResponse] = await Promise.all([
          fetch(`/api/courses/${id}`, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (authResponse.status === 401) {
          setRedirecting(true);
          router.replace("/login");
          return;
        }

        const [courseData, authData]: [CourseResponse, UserResponse] =
          await Promise.all([courseResponse.json(), authResponse.json()]);

        if (!authResponse.ok || !authData.success || !authData.user) {
          throw new Error(authData.message || "Unable to verify your account.");
        }

        if (!courseResponse.ok || !courseData.success || !courseData.course) {
          throw new Error(courseData.message || "Unable to load this course.");
        }

        const fetchedCourse = courseData.course;
        const role = authData.user.role;
        const isOwner =
          Number(authData.user.id) === Number(fetchedCourse.user_id);
        const permitted =
          role === "admin" || (role === "instructor" && isOwner);

        setCourse(fetchedCourse);
        setCanEdit(permitted);

        if (!permitted) {
          setError("You do not have permission to edit this course.");
          return;
        }

        setTitle(fetchedCourse.title);
        setDescription(fetchedCourse.description);
        setTotalSeats(String(fetchedCourse.total_seats));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the course."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();
    return () => controller.abort();
  }, [id, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const validation = updateCourseSchema.safeParse({
      title: title.trim(),
      description: description.trim(),
      totalSeats: Number(totalSeats),
    });

    if (!validation.success) {
      setFieldErrors(validation.error.flatten().fieldErrors);
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/courses/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.data),
      });

      const data: UpdateResponse = await response.json();

      if (!response.ok || !data.success) {
        if (data.errors) setFieldErrors(data.errors);
        throw new Error(data.message || "Failed to update course.");
      }

      router.push(`/courses/${id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isBusy = loading || redirecting;

  return (
    <>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.container}>
          <Link href={`/courses/${id}`} className={styles.backLink}>
            &larr; Back to Course
          </Link>

          <section className={styles.formCard}>
            <header className={styles.header}>
              <span className={styles.tag}>COURSE MANAGEMENT</span>
              <h1>Edit Course</h1>
              <p>Update your course information.</p>
            </header>

            {isBusy ? (
              <p className={styles.status} role="status">
                {redirecting ? "Redirecting to login..." : "Loading course..."}
              </p>
            ) : error && (!course || !canEdit) ? (
              <>
                <div className={styles.error} role="alert">
                  {error}
                </div>
                <Link href={`/courses/${id}`} className={styles.cancelButton}>
                  Back to Course
                </Link>
              </>
            ) : (
              <>
                {error && (
                  <div className={styles.error} role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className={styles.formGroup}>
                    <label htmlFor="title">Course Title</label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={255}
                      required
                      disabled={submitting}
                      aria-invalid={Boolean(fieldErrors.title?.length)}
                      aria-describedby={
                        fieldErrors.title?.length ? "title-error" : undefined
                      }
                    />
                    {fieldErrors.title?.map((message, index) => (
                      <small
                        className={styles.fieldError}
                        id={index === 0 ? "title-error" : undefined}
                        key={`${message}-${index}`}
                      >
                        {message}
                      </small>
                    ))}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="description">Course Description</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={6}
                      required
                      disabled={submitting}
                      aria-invalid={Boolean(fieldErrors.description?.length)}
                      aria-describedby={
                        fieldErrors.description?.length
                          ? "description-error"
                          : undefined
                      }
                    />
                    {fieldErrors.description?.map((message, index) => (
                      <small
                        className={styles.fieldError}
                        id={index === 0 ? "description-error" : undefined}
                        key={`${message}-${index}`}
                      >
                        {message}
                      </small>
                    ))}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="totalSeats">Total Seats</label>
                    <input
                      id="totalSeats"
                      type="number"
                      min="1"
                      step="1"
                      value={totalSeats}
                      onChange={(event) => setTotalSeats(event.target.value)}
                      required
                      disabled={submitting}
                      aria-invalid={Boolean(fieldErrors.totalSeats?.length)}
                      aria-describedby={
                        fieldErrors.totalSeats?.length
                          ? "total-seats-error"
                          : undefined
                      }
                    />
                    {fieldErrors.totalSeats?.map((message, index) => (
                      <small
                        className={styles.fieldError}
                        id={index === 0 ? "total-seats-error" : undefined}
                        key={`${message}-${index}`}
                      >
                        {message}
                      </small>
                    ))}
                    <small className={styles.helpText}>
                      Maximum number of students who can enroll.
                    </small>
                  </div>

                  <div className={styles.actions}>
                    <Link
                      href={`/courses/${id}`}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? "Updating Course..." : "Update Course"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
