/**
 * Track type for client-side use
 * Mirrors the database schema but can be imported by client components
 */

export interface Track {
	id: string;
	name: string;
	url: string;
	pathname: string | null;
	createdAt: Date | null;
}
