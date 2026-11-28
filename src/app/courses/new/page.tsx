"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import styles from "./page.module.css";

export default function NewCoursePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalSeats, setTotalSeats] = useState("20");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setFieldErrors({});

    if (title.trim().length < 3) {
      setError("Course title must contain at least 3 characters.");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must contain at least 10 characters.");
      return;
    }

    const seats = Number(totalSeats);

    if (!Number.isInteger(seats) || seats < 1) {
      setError("Please enter a valid number of seats.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/courses", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          totalSeats: seats,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.errors) {
          setFieldErrors(data.errors);
        }

        throw new Error(data.message || "Failed to create course.");
      }

      router.push(`/courses/${data.course.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.container}>
          <Link href="/courses" className={styles.backLink}>
            &larr; Back to Courses
          </Link>

          <div className={styles.formCard}>
            <div className={styles.header}>
              <span className={styles.tag}>INSTRUCTOR / ADMIN</span>
              <h1>Create a New Course</h1>
              <p>
                Share your knowledge and help students develop new skills.
              </p>
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Course Title</label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Full Stack Web Development"
                  maxLength={255}
                  required
                  disabled={loading}
                />

                {fieldErrors.title?.map((message) => (
                  <small className={styles.fieldError} key={message}>
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
                  placeholder="Describe what students will learn in this course..."
                  rows={6}
                  required
                  disabled={loading}
                />

                {fieldErrors.description?.map((message) => (
                  <small className={styles.fieldError} key={message}>
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
                  disabled={loading}
                />

                {fieldErrors.totalSeats?.map((message) => (
                  <small className={styles.fieldError} key={message}>
                    {message}
                  </small>
                ))}

                <small className={styles.helpText}>
                  Maximum number of students who can enroll.
                </small>
              </div>

              <div className={styles.actions}>
                <Link href="/courses" className={styles.cancelButton}>
                  Cancel
                </Link>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? "Creating Course..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
