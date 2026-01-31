/**
 * Shared utility functions that can be used on both client and server
 */

/**
 * Converts a string to a URL-friendly slug
 */
export const slugify = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
