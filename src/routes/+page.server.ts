// src/routes/+page.server.ts
import { put } from '@vercel/blob';
import { db } from '$lib/server/db';
import { tracks } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('audio') as File;

        if (!file || file.size === 0) {
            return fail(400, { message: 'No file uploaded' });
        }

        // Validate file type
        if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
            return fail(400, { message: 'File must be an MP3 audio file' });
        }

        if (!env.BLOB_READ_WRITE_TOKEN) {
            return fail(500, { message: 'Blob storage not configured' });
        }

        try {
            // 1. Upload to Vercel Blob
            // The token can be passed explicitly or will be picked up from BLOB_READ_WRITE_TOKEN env var
            const blob = await put(file.name, file, {
                access: 'public',
                token: env.BLOB_READ_WRITE_TOKEN
            });

            // 2. Save metadata to Neon via Drizzle
            await db.insert(tracks).values({
                name: file.name,
                url: blob.url,
                pathname: blob.pathname
            });

            return { success: true };
        } catch (error) {
            console.error(error);
            return fail(500, { message: 'Upload failed' });
        }
    }
};

// import { db } from '$lib/server/db';
// import { tracks } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load = async () => {
    try {
        // Fetch all tracks from Neon, ordered by newest first
        const allTracks = await db.select().from(tracks).orderBy(desc(tracks.createdAt));

        return {
            tracks: allTracks
        };
    } catch (error) {
        console.error("Failed to fetch tracks:", error);
        return {
            tracks: [],
            error: "Could not load music library."
        };
    }
};