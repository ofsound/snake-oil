-- Add visibility column to quizzes table
ALTER TABLE quizzes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

-- Create index for visibility queries
-- Using table_column_idx naming convention for consistency
CREATE INDEX quizzes_visibility_idx ON quizzes(visibility);

-- Update existing quizzes to be public (backward compatible)
UPDATE quizzes SET visibility = 'public' WHERE visibility IS NULL;