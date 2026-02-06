-- Add visibility column to quizzes table
ALTER TABLE quizzes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

-- Create index for visibility queries
CREATE INDEX idx_quizzes_visibility ON quizzes(visibility);

-- Update existing quizzes to be public (backward compatible)
UPDATE quizzes SET visibility = 'public' WHERE visibility IS NULL;