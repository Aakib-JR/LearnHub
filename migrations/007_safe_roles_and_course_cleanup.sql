ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'instructor', 'admin'));

CREATE TABLE IF NOT EXISTS course_content_cleanup_jobs (
  course_id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT
);

ALTER TABLE course_content_cleanup_jobs
  ADD COLUMN IF NOT EXISTS course_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'course_content_cleanup_jobs'::regclass
      AND contype = 'p'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
        SELECT attnum
        FROM pg_attribute
        WHERE attrelid = 'course_content_cleanup_jobs'::regclass
          AND attname = 'course_id'
          AND NOT attisdropped
      )
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM course_content_cleanup_jobs
      WHERE course_id IS NULL
    ) THEN
      RAISE EXCEPTION
        'course_content_cleanup_jobs has rows without course_id; map them before applying this migration';
    END IF;

    ALTER TABLE course_content_cleanup_jobs
      ALTER COLUMN course_id SET NOT NULL;
    ALTER TABLE course_content_cleanup_jobs
      ADD CONSTRAINT course_content_cleanup_jobs_pkey PRIMARY KEY (course_id);
  END IF;
END;
$$;
