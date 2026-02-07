
-- Migration: Add Speed Run tables for timed quiz game mode

CREATE TABLE speed_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    default_question_time_limit INTEGER,
    reveal_delay_ms INTEGER DEFAULT 3000 NOT NULL,
    audio_loop_gap_ms INTEGER DEFAULT 2000 NOT NULL,
    enable_streak_bonus BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT speed_runs_quiz_unique UNIQUE (quiz_id)
);

-- Note: No separate index needed on quiz_id - the UNIQUE constraint creates one automatically

CREATE TABLE speed_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    speed_run_id UUID NOT NULL REFERENCES speed_runs(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    answers JSONB NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_time_ms INTEGER NOT NULL,
    streak_max INTEGER DEFAULT 0 NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX speed_run_results_leaderboard_idx 
    ON speed_run_results(speed_run_id, correct_count DESC, total_time_ms ASC, created_at ASC);

CREATE INDEX speed_run_results_user_idx ON speed_run_results(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_speed_runs_updated_at 
    BEFORE UPDATE ON speed_runs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
