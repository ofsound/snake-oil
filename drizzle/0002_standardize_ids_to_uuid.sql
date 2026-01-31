-- Step 1: Add new UUID columns alongside existing serial columns
ALTER TABLE "tracks" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();
ALTER TABLE "soundbites" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();
ALTER TABLE "quiz_answers" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();
ALTER TABLE "soundbites" ADD COLUMN "track_id_new" uuid;
--> statement-breakpoint

-- Step 2: Populate UUIDs for existing rows
UPDATE "tracks" SET "id_new" = gen_random_uuid();
UPDATE "soundbites" SET "id_new" = gen_random_uuid();
UPDATE "quiz_answers" SET "id_new" = gen_random_uuid();
--> statement-breakpoint

-- Step 3: Update soundbites.track_id_new to reference tracks.id_new
UPDATE "soundbites" s
SET "track_id_new" = t."id_new"
FROM "tracks" t
WHERE s."track_id" = t."id";
--> statement-breakpoint

-- Step 4: Make UUID columns NOT NULL now that they're populated
ALTER TABLE "tracks" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "soundbites" ALTER COLUMN "id_new" SET NOT NULL;
ALTER TABLE "soundbites" ALTER COLUMN "track_id_new" SET NOT NULL;
ALTER TABLE "quiz_answers" ALTER COLUMN "id_new" SET NOT NULL;
--> statement-breakpoint

-- Step 5: Drop old foreign key constraints
ALTER TABLE "soundbites" DROP CONSTRAINT "soundbites_track_id_tracks_id_fk";
--> statement-breakpoint

-- Step 6: Drop old primary key constraints
ALTER TABLE "tracks" DROP CONSTRAINT "tracks_pkey";
ALTER TABLE "soundbites" DROP CONSTRAINT "soundbites_pkey";
ALTER TABLE "quiz_answers" DROP CONSTRAINT "quiz_answers_pkey";
--> statement-breakpoint

-- Step 7: Drop old columns (this will also drop the old foreign key constraint)
ALTER TABLE "soundbites" DROP COLUMN "track_id";
ALTER TABLE "tracks" DROP COLUMN "id";
ALTER TABLE "soundbites" DROP COLUMN "id";
ALTER TABLE "quiz_answers" DROP COLUMN "id";
--> statement-breakpoint

-- Step 8: Rename new UUID columns to replace old ones
ALTER TABLE "tracks" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "soundbites" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "soundbites" RENAME COLUMN "track_id_new" TO "track_id";
ALTER TABLE "quiz_answers" RENAME COLUMN "id_new" TO "id";
--> statement-breakpoint

-- Step 9: Add new primary key constraints
ALTER TABLE "tracks" ADD PRIMARY KEY ("id");
ALTER TABLE "soundbites" ADD PRIMARY KEY ("id");
ALTER TABLE "quiz_answers" ADD PRIMARY KEY ("id");
--> statement-breakpoint

-- Step 10: Add new foreign key constraint for soundbites.track_id
ALTER TABLE "soundbites" ADD CONSTRAINT "soundbites_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 11: Drop sequences if they exist (from serial columns)
DROP SEQUENCE IF EXISTS "tracks_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "soundbites_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "quiz_answers_id_seq" CASCADE;
--> statement-breakpoint

-- Step 12: Set default for new UUID columns
ALTER TABLE "tracks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "soundbites" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "quiz_answers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
