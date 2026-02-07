import { json, error } from '@sveltejs/kit';
import { eq, like, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { tags } from '$lib/server/db/schema';
import { slugify } from '$lib/utils';

import type { RequestHandler } from './$types';

// GET /api/tags/suggest?q=query&limit=10
export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
	const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

	if (!query) {
		return json({ tags: [] });
	}

	try {
		// Search by label (case insensitive)
		const matchingTags = await db.query.tags.findMany({
			where: like(sql`LOWER(${tags.label})`, `%${query}%`),
			orderBy: desc(tags.useCount),
			limit
		});

		return json({ tags: matchingTags });
	} catch (err) {
		console.error('Error fetching tag suggestions:', err);
		error(500, 'Failed to fetch suggestions');
	}
};

// POST /api/tags - Create a new tag (authenticated users only)
export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.user) {
		error(401, 'Authentication required');
	}

	const formData = await request.formData();
	const label = formData.get('label')?.toString().trim().toLowerCase();

	if (!label) {
		error(400, 'Tag label is required');
	}

	// Check if tag already exists
	const existing = await db.query.tags.findFirst({
		where: eq(tags.label, label)
	});

	if (existing) {
		return json(existing);
	}

	const slug = slugify(label);

	// Check if slug exists
	const existingSlug = await db.query.tags.findFirst({
		where: eq(tags.slug, slug)
	});

	if (existingSlug) {
		error(400, 'A tag with this slug already exists');
	}

	try {
		const [newTag] = await db
			.insert(tags)
			.values({
				label,
				slug,
				useCount: 0,
				createdBy: locals.user.id
			})
			.returning();

		return json(newTag);
	} catch (err) {
		console.error('Error creating tag:', err);
		error(500, 'Failed to create tag');
	}
};
