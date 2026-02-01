-- Add slug column to user table (nullable initially for existing users)
ALTER TABLE "user" ADD COLUMN "slug" text;
--> statement-breakpoint

-- Generate slugs for existing users from their names
-- This handles collision by appending suffixes
DO $$
DECLARE
    user_record RECORD;
    base_slug text;
    candidate_slug text;
    counter integer;
    slug_exists boolean;
BEGIN
    FOR user_record IN SELECT id, name, email FROM "user" WHERE slug IS NULL
    LOOP
        -- Generate base slug from name, or email if name is null
        IF user_record.name IS NOT NULL AND user_record.name != '' THEN
            base_slug := lower(trim(regexp_replace(user_record.name, '[^a-z0-9]+', '-', 'gi')));
            base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
        ELSE
            -- Fallback to email username part
            base_slug := lower(split_part(user_record.email, '@', 1));
            base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'gi');
            base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
        END IF;

        -- Ensure we have a slug (fallback to 'user' if empty)
        IF base_slug = '' THEN
            base_slug := 'user';
        END IF;

        -- Find unique slug by checking existence
        candidate_slug := base_slug;
        counter := 2;

        LOOP
            SELECT EXISTS(SELECT 1 FROM "user" WHERE slug = candidate_slug) INTO slug_exists;

            IF NOT slug_exists THEN
                -- Found unique slug
                UPDATE "user" SET slug = candidate_slug WHERE id = user_record.id;
                EXIT;
            END IF;

            -- Try next candidate
            candidate_slug := base_slug || '-' || counter;
            counter := counter + 1;

            -- Safety limit
            IF counter > 1000 THEN
                RAISE EXCEPTION 'Could not find unique slug for user % after 1000 attempts', user_record.id;
            END IF;
        END LOOP;
    END LOOP;
END $$;
--> statement-breakpoint

-- Make slug column NOT NULL now that all users have slugs
ALTER TABLE "user" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint

-- Add unique index on slug
CREATE UNIQUE INDEX "user_slug_unique" ON "user" ("slug");
