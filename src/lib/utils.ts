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

/**
 * Validates and sanitizes a redirect URL to prevent open redirect vulnerabilities.
 * Only allows relative URLs (starting with /) and rejects absolute URLs, javascript:, data:, etc.
 *
 * @param redirectUrl - The redirect URL to validate
 * @param defaultUrl - The default URL to return if validation fails (default: '/')
 * @returns A safe redirect URL
 */
export function validateRedirectUrl(
	redirectUrl: string | null | undefined,
	defaultUrl = '/'
): string {
	if (!redirectUrl || typeof redirectUrl !== 'string') {
		return defaultUrl;
	}

	// Trim whitespace
	const trimmed = redirectUrl.trim();

	// Reject empty strings
	if (trimmed === '') {
		return defaultUrl;
	}

	// Only allow relative URLs (must start with /)
	// This prevents open redirect vulnerabilities like:
	// - http://evil.com
	// - //evil.com
	// - javascript:alert(1)
	// - data:text/html,<script>alert(1)</script>
	if (!trimmed.startsWith('/')) {
		return defaultUrl;
	}

	// Additional safety: reject URLs that contain protocol-like patterns
	// This catches edge cases like /redirect?url=http://evil.com
	if (/^\/[^/]*:/.test(trimmed)) {
		return defaultUrl;
	}

	// Reject URLs that try to escape the origin with // (protocol-relative URLs)
	if (trimmed.includes('//')) {
		return defaultUrl;
	}

	return trimmed;
}
