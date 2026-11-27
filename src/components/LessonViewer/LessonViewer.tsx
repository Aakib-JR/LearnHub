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
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadLessons() {
      try {
        const [lessonsResponse, progressResponse] = await Promise.all([
          fetch(`/api/courses/${courseId}/lessons`),
          fetch(`/api/courses/${courseId}/progress`),
        ]);

        const lessonsData = await lessonsResponse.json();
        const progressData = await progressResponse.json();

        if (!lessonsResponse.ok) {
          setMessage(lessonsData.message || "Unable to load lessons.");
          return;
        }

        if (!progressResponse.ok) {
          setMessage(progressData.message || "Unable to load progress.");
          return;
        }

        setLessons(lessonsData.lessons || []);

        const completed = (progressData.completedLessons || []).map(
          (item: { lesson_id: string }) => item.lesson_id
        );

        setCompletedLessons(completed);

        const firstIncomplete = (lessonsData.lessons || []).find(
          (lesson: Lesson) => !completed.includes(lesson._id)
        );

        setSelectedLesson(
          firstIncomplete || lessonsData.lessons?.[0] || null
        );
      } catch {
        setMessage("Something went wrong while loading lessons.");
      } finally {
        setLoading(false);
      }
    }

    loadLessons();
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

      if (!response.ok) {
        setMessage(data.message || "Unable to update progress.");
        return;
      }

      setCompletedLessons((previous) =>
        previous.includes(selectedLesson._id)
          ? previous
          : [...previous, selectedLesson._id]
      );

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

  if (message && lessons.length === 0) {
    return <p>{message}</p>;
  }

  if (lessons.length === 0) {
    return <p>No lessons available for this course yet.</p>;
  }

  const progressPercentage = Math.round(
    (completedLessons.length / lessons.length) * 100
  );

  return (
    <section className={styles.container}>
      <h2 className={styles.heading}>Course Lessons</h2>

      <div className={styles.progressSection}>
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
          {completedLessons.length} of {lessons.length} lessons completed
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const completed = completedLessons.includes(lesson._id);

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
                  completedLessons.includes(selectedLesson._id) || saving
                }
              >
                {completedLessons.includes(selectedLesson._id)
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
