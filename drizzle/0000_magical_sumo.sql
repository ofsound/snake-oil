CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" text,
	"display_name" text,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total_correct" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_tags" (
	"quiz_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soundbites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question" text,
	"variant_type" text DEFAULT 'simple_guess' NOT NULL,
	"variant_config" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speed_run_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speed_run_id" uuid NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"answers" jsonb NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"total_time_ms" integer NOT NULL,
	"streak_max" integer DEFAULT 0 NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speed_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"default_question_time_limit" integer,
	"reveal_delay_ms" integer DEFAULT 3000 NOT NULL,
	"audio_loop_gap_ms" integer DEFAULT 2000 NOT NULL,
	"enable_streak_bonus" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_cooccurrence" (
	"tag_id" uuid NOT NULL,
	"related_tag_id" uuid NOT NULL,
	"cooccurrence_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"slug" text NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "tags_label_unique" UNIQUE("label"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"pathname" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"slug" text NOT NULL,
	"email_verified" boolean,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_tags" ADD CONSTRAINT "quiz_tags_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_tags" ADD CONSTRAINT "quiz_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soundbites" ADD CONSTRAINT "soundbites_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soundbites" ADD CONSTRAINT "soundbites_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speed_run_results" ADD CONSTRAINT "speed_run_results_speed_run_id_speed_runs_id_fk" FOREIGN KEY ("speed_run_id") REFERENCES "public"."speed_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speed_run_results" ADD CONSTRAINT "speed_run_results_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speed_runs" ADD CONSTRAINT "speed_runs_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_cooccurrence" ADD CONSTRAINT "tag_cooccurrence_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_cooccurrence" ADD CONSTRAINT "tag_cooccurrence_related_tag_id_tags_id_fk" FOREIGN KEY ("related_tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_answers_quiz_idx" ON "quiz_answers" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_answers_user_idx" ON "quiz_answers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_tags_unique" ON "quiz_tags" USING btree ("quiz_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_owner_slug_unique" ON "quizzes" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "quizzes_owner_idx" ON "quizzes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "quizzes_visibility_idx" ON "quizzes" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "soundbites_quiz_idx" ON "soundbites" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "speed_run_results_leaderboard_idx" ON "speed_run_results" USING btree ("speed_run_id","correct_count" DESC NULLS LAST,"total_time_ms","created_at");--> statement-breakpoint
CREATE INDEX "speed_run_results_user_idx" ON "speed_run_results" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "speed_runs_quiz_unique" ON "speed_runs" USING btree ("quiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_cooccurrence_unique" ON "tag_cooccurrence" USING btree ("tag_id","related_tag_id");--> statement-breakpoint
CREATE INDEX "tag_cooccurrence_count_idx" ON "tag_cooccurrence" USING btree ("cooccurrence_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tags_use_count_idx" ON "tags" USING btree ("use_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tags_label_idx" ON "tags" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX "user_slug_unique" ON "user" USING btree ("slug");