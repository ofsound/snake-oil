-- Migration 0008: Index fixes (now resolved in earlier migrations)
-- 
-- This migration previously fixed:
-- 1. Renamed idx_quizzes_visibility → quizzes_visibility_idx (fixed in 0007)
-- 2. Dropped redundant speed_runs_quiz_idx index (prevented in 0006)
--
-- These issues are now resolved at the source in migrations 0006 and 0007.
-- Keeping this file as a placeholder to maintain migration sequence.
-- No action needed - indexes are correct from the start.
SELECT 'Index fixes applied in earlier migrations' AS status;
