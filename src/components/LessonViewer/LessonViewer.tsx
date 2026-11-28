"use client";

import { useEffect, useState } from "react";
import styles from "./LessonViewer.module.css";

interface Lesson {
  _id: string;
  title: string;
  type: "text" | "video";
  body: string;
  videoUrl?: string;
}

interface LessonViewerProps {
  courseId: number;
}

export default function LessonViewer({
  courseId,
}: LessonViewerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadLessons() {
      let lessonsLoaded = false;

      setLoading(true);
      setProgressLoading(true);
      setError("");
      setProgressError("");
      setMessage("");
      setLessons([]);
      setCompletedLessons([]);
      setSelectedLesson(null);

      try {
        const lessonsResponse = await fetch(
          `/api/courses/${courseId}/lessons`
        );
        const lessonsData = await lessonsResponse.json();

        if (
          !lessonsResponse.ok ||
          !lessonsData.success ||
          !Array.isArray(lessonsData.lessons)
        ) {
          throw new Error(
            lessonsData.message || "Unable to load lessons."
          );
        }

        const loadedLessons: Lesson[] = lessonsData.lessons;

        if (!active) return;

        lessonsLoaded = true;
        setLessons(loadedLessons);
        setSelectedLesson(loadedLessons[0] ?? null);
        setLoading(false);

        const progressResponse = await fetch(
          `/api/courses/${courseId}/progress`
        );
        const progressData = await progressResponse.json();

        if (
          !progressResponse.ok ||
          !progressData.success ||
          !Array.isArray(progressData.completedLessons)
        ) {
          throw new Error(
            progressData.message || "Unable to load progress."
          );
        }

        const currentLessonIds = new Set(
          loadedLessons.map((lesson) => lesson._id)
        );
        const completed = Array.from(
          new Set(
            (progressData.completedLessons as Array<{
              lesson_id: string;
            }>)
              .map((item) => item.lesson_id)
              .filter((lessonId) => currentLessonIds.has(lessonId))
          )
        );
        if (active) setCompletedLessons(completed);
      } catch (loadError) {
        if (!active) return;

        const messageText =
          loadError instanceof Error
            ? loadError.message
            : "Something went wrong while loading lessons.";

        if (lessonsLoaded) {
          setProgressError(messageText);
        } else {
          setError(messageText);
        }
      } finally {
        if (active) {
          setLoading(false);
          setProgressLoading(false);
        }
      }
    }

    void loadLessons();

    return () => {
      active = false;
    };
  }, [courseId]);

  async function markAsCompleted() {
    if (!selectedLesson || saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId: selectedLesson._id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Unable to update progress.");
        return;
      }

      setCompletedLessons((previous) =>
        previous.includes(selectedLesson._id)
          ? previous
          : [...previous, selectedLesson._id]
      );

      setProgressError("");
      setMessage("Lesson completed successfully!");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Loading lessons...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (lessons.length === 0) {
    return <p>No lessons available for this course yet.</p>;
  }

  const lessonIds = new Set(lessons.map((lesson) => lesson._id));
  const validCompletedLessons = new Set(
    completedLessons.filter((lessonId) => lessonIds.has(lessonId))
  );
  const progressPercentage = Math.round(
    (validCompletedLessons.size / lessons.length) * 100
  );

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>Course Lessons</h2>

      <div className={styles.progressSection}>
        {progressLoading && <p>Loading your progress...</p>}
        {!progressLoading && progressError && (
          <p role="alert">
            Progress is unavailable: {progressError}
          </p>
        )}

        <div className={styles.progressInfo}>
          <span>Your Progress</span>
          <strong>{progressPercentage}%</strong>
        </div>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <p>
          {validCompletedLessons.size} of {lessons.length} lessons completed
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const completed = validCompletedLessons.has(lesson._id);

            return (
              <button
                key={lesson._id}
                type="button"
                className={`${styles.lessonButton} ${
                  selectedLesson?._id === lesson._id ? styles.active : ""
                }`}
                onClick={() => setSelectedLesson(lesson)}
              >
                <span>
                  {completed ? "✓" : index + 1}
                </span>
                <span>{lesson.title}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.lessonContent}>
          {selectedLesson && (
            <>
              <span className={styles.lessonType}>
                {selectedLesson.type.toUpperCase()} LESSON
              </span>

              <h3>{selectedLesson.title}</h3>

              <p>{selectedLesson.body}</p>

              {selectedLesson.type === "video" &&
                selectedLesson.videoUrl && (
                  <a
                    href={selectedLesson.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch lesson video
                  </a>
                )}

              <button
                type="button"
                className={styles.completeButton}
                onClick={markAsCompleted}
                disabled={
                  validCompletedLessons.has(selectedLesson._id) || saving
                }
              >
                {validCompletedLessons.has(selectedLesson._id)
                  ? "✓ Completed"
                  : saving
                    ? "Saving..."
                    : "Mark as Completed"}
              </button>
            </>
          )}

          {message && <p>{message}</p>}
        </div>
      </div>
    </section>
  );
}
