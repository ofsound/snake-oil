import { asc } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { tracks } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const trackList = await db.query.tracks.findMany({
			orderBy: [asc(tracks.createdAt)]
		});

		return {
			tracks: trackList
		};
	} catch (error) {
		console.error('Error loading tracks:', error);
		return {
			tracks: [],
			error: 'Failed to load tracks from database'
		};
	}
};
