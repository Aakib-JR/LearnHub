"use client";

import { useState } from "react";

interface Lesson {
    title: string;
    type: "text" | "video";
    body: string;
    videoUrl?: string;
}

interface LessonEditorProps {
    courseId: string;
}

export default function LessonEditor({
    courseId,
}: LessonEditorProps) {
    const [lessons, setLessons] = useState<Lesson[]>([
        {
            title: "",
            type: "text",
            body: "",
        },
    ]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    function addLesson() {
        setLessons((previousLessons) => [
            ...previousLessons,
            {
                title: "",
                type: "text",
                body: "",
            },
        ]);
    }

    function updateLesson(
        index: number,
        field: keyof Lesson,
        value: string
    ) {
        const updatedLessons = [...lessons];

        updatedLessons[index] = {
            ...updatedLessons[index],
            [field]: value,
        };

        setLessons(updatedLessons);
    }

    function removeLesson(index: number) {
        setLessons(lessons.filter((_, i) => i !== index));
    }

    async function handleSave() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(
                `/api/courses/${courseId}/lessons`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ lessons }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to save lessons");
            }

            setMessage("Lessons saved successfully!");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container py-5">
            <h2 className="fw-bold mb-2">Lesson Editor</h2>
            <p className="text-secondary mb-4">
                Create and manage your course lessons.
            </p>

            {lessons.map((lesson, index) => (
                <div className="card p-4 mb-4" key={index}>
                    <div className="d-flex justify-content-between mb-3">
                        <h5 className="fw-bold">
                            Lesson {index + 1}
                        </h5>

                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeLesson(index)}
                        >
                            Remove
                        </button>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Lesson Title</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter lesson title"
                            value={lesson.title}
                            onChange={(event) =>
                                updateLesson(index, "title", event.target.value)
                            }
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label">Lesson Type</label>
                        <select
                            className="form-select"
                            value={lesson.type}
                            onChange={(event) =>
                                updateLesson(
                                    index,
                                    "type",
                                    event.target.value
                                )
                            }
                        >
                            <option value="text">Text Lesson</option>
                            <option value="video">Video Lesson</option>
                        </select>
                    </div>

                    {lesson.type === "video" && (
                        <div className="mb-3">
                            <label className="form-label">Video URL</label>
                            <input
                                type="url"
                                className="form-control"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={lesson.videoUrl || ""}
                                onChange={(event) =>
                                    updateLesson(index, "videoUrl", event.target.value)
                                }
                            />
                        </div>
                    )}

                    <div className="mb-3">
                        <label className="form-label">Lesson Content</label>
                        <textarea
                            className="form-control"
                            rows={5}
                            placeholder="Write your lesson content..."
                            value={lesson.body}
                            onChange={(event) =>
                                updateLesson(index, "body", event.target.value)
                            }
                        />
                    </div>
                </div>
            ))}

            <button
                type="button"
                className="btn btn-outline-primary me-2"
                onClick={addLesson}
            >
                + Add Lesson
            </button>

            <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading || lessons.length === 0}
            >
                {loading ? "Saving..." : "Save Lessons"}
            </button>

            {message && (
                <p className="mt-3" role="status">
                    {message}
                </p>
            )}
        </div>
    );
}
