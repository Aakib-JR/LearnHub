CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    course_id INTEGER NOT NULL
        REFERENCES courses(id)
        ON DELETE CASCADE,

    lesson_id VARCHAR(255) NOT NULL,

    completed_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_lesson_progress
        UNIQUE (user_id, course_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course
ON lesson_progress(user_id, course_id);
