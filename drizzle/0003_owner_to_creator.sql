-- Rename quizzes.owner_id to creator_id and related constraints/indexes
ALTER TABLE "quizzes" RENAME COLUMN "owner_id" TO "creator_id";
--> statement-breakpoint
ALTER TABLE "quizzes" RENAME CONSTRAINT "quizzes_owner_id_user_id_fk" TO "quizzes_creator_id_user_id_fk";
--> statement-breakpoint
ALTER INDEX "quizzes_owner_slug_unique" RENAME TO "quizzes_creator_slug_unique";
--> statement-breakpoint
ALTER INDEX "quizzes_owner_idx" RENAME TO "quizzes_creator_idx";
--> statement-breakpoint
-- Rename admin_actions.target_owner_id to target_creator_id and FK
ALTER TABLE "admin_actions" RENAME COLUMN "target_owner_id" TO "target_creator_id";
--> statement-breakpoint
ALTER TABLE "admin_actions" RENAME CONSTRAINT "admin_actions_target_owner_id_user_id_fk" TO "admin_actions_target_creator_id_user_id_fk";
