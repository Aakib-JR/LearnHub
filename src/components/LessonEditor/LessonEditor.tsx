"use client";

import { useEffect, useState, type FormEvent } from "react";
import { saveLessonsSchema } from "@/lib/validations/lesson";
import styles from "./LessonEditor.module.css";

interface Lesson {
  _id: string;
  title: string;
  type: "text" | "video";
  body: string;
  videoUrl?: string;
}

interface LessonInput {
  _id?: string;
  title: string;
  type: "text" | "video";
  body: string;
  videoUrl?: string;
}

interface LessonDraft {
  title: string;
  type: "text" | "video";
  body: string;
  videoUrl: string;
}

interface LessonsApiResponse {
  success: boolean;
  message?: string;
  warning?: string;
  lessons?: Lesson[];
}

interface LessonEditorProps {
  courseId: string;
}

const EMPTY_DRAFT: LessonDraft = {
  title: "",
  type: "text",
  body: "",
  videoUrl: "",
};

function toDraft(lesson: Lesson): LessonDraft {
  return {
    title: lesson.title,
    type: lesson.type,
    body: lesson.body,
    videoUrl: lesson.videoUrl ?? "",
  };
}

export default function LessonEditor({ courseId }: LessonEditorProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LessonDraft>(EMPTY_DRAFT);
  const [isNewLesson, setIsNewLesson] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLessons() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(
          `/api/courses/${courseId}/lessons`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const data: LessonsApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load course lessons.");
        }

        const fetchedLessons = data.lessons ?? [];
        setLessons(fetchedLessons);

        if (fetchedLessons.length > 0) {
          setSelectedLessonId(fetchedLessons[0]._id);
          setDraft(toDraft(fetchedLessons[0]));
          setIsNewLesson(false);
        } else {
          setSelectedLessonId(null);
          setDraft(EMPTY_DRAFT);
          setIsNewLesson(true);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading lessons."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLessons();
    return () => controller.abort();
  }, [courseId]);

  async function persistLessons(
    nextLessons: LessonInput[],
    action: "saving" | "deleting"
  ): Promise<Lesson[] | null> {
    if (busy) return null;

    try {
      setBusy(action);
      setError("");
      setMessage("");
      setWarning("");

      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessons: nextLessons }),
      });
      const data: LessonsApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save course lessons.");
      }

      if (!data.lessons) {
        throw new Error("The server did not return the saved lessons.");
      }

      setLessons(data.lessons);
      setMessage(data.message || "Lessons saved successfully.");
      setWarning(data.warning || "");
      return data.lessons;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      return null;
    } finally {
      setBusy(null);
    }
  }

  function selectLesson(lesson: Lesson) {
    setSelectedLessonId(lesson._id);
    setDraft(toDraft(lesson));
    setIsNewLesson(false);
    setFieldErrors({});
    setError("");
    setMessage("");
    setWarning("");
  }

  function startNewLesson() {
    setSelectedLessonId(null);
    setDraft(EMPTY_DRAFT);
    setIsNewLesson(true);
    setFieldErrors({});
    setError("");
    setMessage("");
    setWarning("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setError("");
    setMessage("");
    setWarning("");
    setFieldErrors({});

    const draftInput: LessonInput = {
      title: draft.title.trim(),
      type: draft.type,
      body: draft.body.trim(),
      ...(draft.type === "video"
        ? { videoUrl: draft.videoUrl.trim() }
        : {}),
    };

    const validation = saveLessonsSchema.safeParse({
      lessons: [draftInput],
    });

    if (!validation.success) {
      const nextErrors: Record<string, string> = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[2];
        if (typeof field === "string") {
          nextErrors[field] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      return;
    }

    const validatedLesson = validation.data.lessons[0];
    let nextLessons: LessonInput[];

    if (selectedLessonId && !isNewLesson) {
      const selectedIndex = lessons.findIndex(
        (lesson) => lesson._id === selectedLessonId
      );

      if (selectedIndex === -1) {
        setError("The selected lesson could not be found. Reload and try again.");
        return;
      }

      nextLessons = lessons.map((lesson, index) =>
        index === selectedIndex
          ? { ...validatedLesson, _id: selectedLessonId }
          : lesson
      );
    } else {
      nextLessons = [...lessons, validatedLesson];
    }

    const savedLessons = await persistLessons(nextLessons, "saving");
    if (!savedLessons) return;

    const savedLesson = selectedLessonId && !isNewLesson
      ? savedLessons.find((lesson) => lesson._id === selectedLessonId)
      : savedLessons[savedLessons.length - 1];

    if (savedLesson) {
      setSelectedLessonId(savedLesson._id);
      setDraft(toDraft(savedLesson));
      setIsNewLesson(false);
    }

    setMessage(
      selectedLessonId && !isNewLesson
        ? "Lesson updated successfully."
        : "Lesson added successfully."
    );
  }

  async function handleDelete(lesson: Lesson) {
    if (busy) return;

    const confirmed = window.confirm(
      `Delete "${lesson.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    const nextLessons = lessons
      .filter((item) => item._id !== lesson._id)
      .map((item) => ({ ...item }));
    const savedLessons = await persistLessons(nextLessons, "deleting");

    if (!savedLessons) return;

    if (selectedLessonId === lesson._id) {
      const nextSelectedLesson = savedLessons[0];

      if (nextSelectedLesson) {
        setSelectedLessonId(nextSelectedLesson._id);
        setDraft(toDraft(nextSelectedLesson));
        setIsNewLesson(false);
      } else {
        setSelectedLessonId(null);
        setDraft(EMPTY_DRAFT);
        setIsNewLesson(true);
      }
    }

    setMessage("Lesson deleted successfully.");
  }

  if (loading) {
    return (
      <section className={styles.editor} aria-live="polite">
        <p className={styles.status}>Loading course lessons...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={styles.editor}>
        <h2 className={styles.heading}>Lesson Editor</h2>
        <p className={styles.error} role="alert">
          {loadError}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.editor}>
      <header className={styles.header}>
        <div>
          <span className={styles.tag}>COURSE CONTENT</span>
          <h2 className={styles.heading}>Lesson Editor</h2>
          <p className={styles.subtitle}>
            Add, edit, and organize lessons for this course.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={startNewLesson}
          disabled={busy !== null}
        >
          + Add New Lesson
        </button>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className={styles.success} role="status">
          {message}
        </div>
      )}
      {warning && (
        <div className={styles.warning} role="alert">
          {warning}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.lessonList}>
          <h3 className={styles.listHeading}>
            Lessons <span>{lessons.length}</span>
          </h3>

          {lessons.length === 0 ? (
            <p className={styles.empty}>
              No lessons yet. Add your first lesson to get started.
            </p>
          ) : (
            lessons.map((lesson, index) => (
              <article className={styles.lessonItem} key={lesson._id}>
                <button
                  type="button"
                  className={`${styles.lessonSelect} ${
                    selectedLessonId === lesson._id ? styles.selected : ""
                  }`}
                  onClick={() => selectLesson(lesson)}
                  disabled={busy !== null}
                  aria-pressed={selectedLessonId === lesson._id}
                >
                  <span className={styles.lessonNumber}>{index + 1}</span>
                  <span className={styles.lessonDetails}>
                    <strong>{lesson.title}</strong>
                    <small>{lesson.type === "video" ? "Video" : "Text"}</small>
                    <span className={styles.lessonSummary}>{lesson.body}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDelete(lesson)}
                  disabled={busy !== null}
                  aria-label={`Delete ${lesson.title}`}
                >
                  {busy === "deleting" ? "Deleting..." : "Delete"}
                </button>
              </article>
            ))
          )}
        </div>

        <form className={styles.formCard} onSubmit={handleSave} noValidate>
          <h3 className={styles.formHeading}>
            {isNewLesson ? "Add a Lesson" : "Edit Lesson"}
          </h3>

          <div className={styles.formGroup}>
            <label htmlFor={`lesson-title-${courseId}`}>Lesson Title</label>
            <input
              id={`lesson-title-${courseId}`}
              className="form-control"
              type="text"
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              maxLength={255}
              required
              disabled={busy !== null}
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title && (
              <small className={styles.fieldError}>{fieldErrors.title}</small>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={`lesson-type-${courseId}`}>Lesson Type</label>
            <select
              id={`lesson-type-${courseId}`}
              className="form-select"
              value={draft.type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as LessonDraft["type"],
                }))
              }
              disabled={busy !== null}
            >
              <option value="text">Text Lesson</option>
              <option value="video">Video Lesson</option>
            </select>
          </div>

          {draft.type === "video" && (
            <div className={styles.formGroup}>
              <label htmlFor={`lesson-video-${courseId}`}>Video URL</label>
              <input
                id={`lesson-video-${courseId}`}
                className="form-control"
                type="url"
                value={draft.videoUrl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    videoUrl: event.target.value,
                  }))
                }
                required
                disabled={busy !== null}
                aria-invalid={Boolean(fieldErrors.videoUrl)}
              />
              {fieldErrors.videoUrl && (
                <small className={styles.fieldError}>
                  {fieldErrors.videoUrl}
                </small>
              )}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor={`lesson-content-${courseId}`}>Lesson Content</label>
            <textarea
              id={`lesson-content-${courseId}`}
              className="form-control"
              rows={7}
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              required
              disabled={busy !== null}
              aria-invalid={Boolean(fieldErrors.body)}
            />
            {fieldErrors.body && (
              <small className={styles.fieldError}>{fieldErrors.body}</small>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy !== null}
          >
            {busy === "saving"
              ? "Saving..."
              : isNewLesson
                ? "Save Lesson"
                : "Update Lesson"}
          </button>
        </form>
      </div>
    </section>
  );
}
