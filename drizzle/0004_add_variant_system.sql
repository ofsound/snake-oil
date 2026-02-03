-- Add variant system to soundbites
-- Remove old description column and add variant fields
ALTER TABLE "soundbites" DROP COLUMN IF EXISTS "description";
ALTER TABLE "soundbites" ADD COLUMN "variant_type" text DEFAULT 'simple_guess' NOT NULL;
ALTER TABLE "soundbites" ADD COLUMN "variant_config" jsonb NOT NULL;

-- Add scoring fields to quiz_answers
ALTER TABLE "quiz_answers" ADD COLUMN "score" integer NOT NULL DEFAULT 0;
ALTER TABLE "quiz_answers" ADD COLUMN "total_correct" integer NOT NULL DEFAULT 0;
ALTER TABLE "quiz_answers" ADD COLUMN "total_questions" integer NOT NULL DEFAULT 0;
ALTER TABLE "quiz_answers" ADD COLUMN "completed_at" timestamp;

-- Remove defaults after adding columns (clean schema)
ALTER TABLE "quiz_answers" ALTER COLUMN "score" DROP DEFAULT;
ALTER TABLE "quiz_answers" ALTER COLUMN "total_correct" DROP DEFAULT;
ALTER TABLE "quiz_answers" ALTER COLUMN "total_questions" DROP DEFAULT;
