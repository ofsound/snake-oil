ALTER TABLE "admin_actions" DROP CONSTRAINT "admin_actions_target_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_owner_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "quizzes_owner_slug_unique";--> statement-breakpoint
DROP INDEX "quizzes_owner_idx";--> statement-breakpoint
ALTER TABLE "admin_actions" ADD COLUMN "target_creator_id" text;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "creator_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_target_creator_id_user_id_fk" FOREIGN KEY ("target_creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_creator_slug_unique" ON "quizzes" USING btree ("creator_id","slug");--> statement-breakpoint
CREATE INDEX "quizzes_creator_idx" ON "quizzes" USING btree ("creator_id");--> statement-breakpoint
ALTER TABLE "admin_actions" DROP COLUMN "target_owner_id";--> statement-breakpoint
ALTER TABLE "quizzes" DROP COLUMN "owner_id";