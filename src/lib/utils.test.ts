import { describe, it, expect } from 'vitest';
import { validateRedirectUrl } from './utils';

/**
 * REDIRECT URL VALIDATION
 *
 * This function prevents open redirect vulnerabilities - where an attacker tricks
 * users into visiting malicious sites by crafting URLs like:
 *   /login?redirect=http://evil.com
 *
 * Why test this? If this logic breaks, attackers can steal sessions or phish users.
 */
describe('validateRedirectUrl', () => {
	/**
	 * VALID CASES
	 * These should all return the URL unchanged (after trimming)
	 */
	describe('allows valid relative URLs', () => {
		it('allows root path', () => {
			expect(validateRedirectUrl('/')).toBe('/');
		});

		it('allows simple relative paths', () => {
			expect(validateRedirectUrl('/dashboard')).toBe('/dashboard');
			expect(validateRedirectUrl('/quiz/my-quiz')).toBe('/quiz/my-quiz');
		});

		it('allows paths with query strings', () => {
			expect(validateRedirectUrl('/quiz?id=123')).toBe('/quiz?id=123');
		});
	});

	/**
	 * INVALID CASES - Security threats
	 * These should all return the default URL ('/')
	 */
	describe('rejects dangerous URLs', () => {
		it('rejects absolute URLs (http/https)', () => {
			// Attackers use these to redirect to phishing sites
			expect(validateRedirectUrl('http://evil.com')).toBe('/');
			expect(validateRedirectUrl('https://phishing-site.com')).toBe('/');
		});

		it('rejects protocol-relative URLs', () => {
			// //evil.com becomes http://evil.com or https://evil.com
			expect(validateRedirectUrl('//evil.com')).toBe('/');
		});

		it('rejects javascript: protocol', () => {
			// Can execute arbitrary code in the user's browser
			expect(validateRedirectUrl('javascript:alert(1)')).toBe('/');
		});
	});

	/**
	 * EDGE CASES
	 * These test input validation and defaults
	 */
	describe('handles edge cases', () => {
		it('trims whitespace', () => {
			expect(validateRedirectUrl('  /dashboard  ')).toBe('/dashboard');
		});

		it('returns default for empty/null/undefined', () => {
			expect(validateRedirectUrl('')).toBe('/');
			expect(validateRedirectUrl(null)).toBe('/');
			expect(validateRedirectUrl(undefined)).toBe('/');
		});

		it('uses custom default URL when provided', () => {
			expect(validateRedirectUrl('http://evil.com', '/home')).toBe('/home');
		});
	});
});
