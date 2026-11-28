-- Enable trigram extension for efficient partial text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for course title search
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm
ON courses USING GIN (title gin_trgm_ops);

-- Index for course description search
CREATE INDEX IF NOT EXISTS idx_courses_description_trgm
ON courses USING GIN (description gin_trgm_ops);