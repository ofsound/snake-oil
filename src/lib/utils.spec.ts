import { describe, it, expect } from 'vitest';
import { slugify } from './utils';

describe('slugify', () => {
	it('converts text to lowercase', () => {
		expect(slugify('HELLO WORLD')).toBe('hello-world');
		expect(slugify('MixedCase')).toBe('mixedcase');
	});

	it('replaces spaces with hyphens', () => {
		expect(slugify('hello world')).toBe('hello-world');
		expect(slugify('multiple word test')).toBe('multiple-word-test');
	});

	it('replaces special characters with hyphens', () => {
		expect(slugify('hello@world')).toBe('hello-world');
		expect(slugify('test!quiz#name')).toBe('test-quiz-name');
		expect(slugify('a&b|c')).toBe('a-b-c');
	});

	it('trims leading and trailing hyphens', () => {
		expect(slugify('-hello-')).toBe('hello');
		expect(slugify('--hello--')).toBe('hello');
		expect(slugify('   hello   ')).toBe('hello');
	});

	it('handles empty strings', () => {
		expect(slugify('')).toBe('');
		expect(slugify('   ')).toBe('');
	});

	it('handles multiple consecutive spaces and special characters', () => {
		expect(slugify('hello   world')).toBe('hello-world');
		expect(slugify('hello!!!world')).toBe('hello-world');
		expect(slugify('hello@@@world')).toBe('hello-world');
	});

	it('handles unicode characters', () => {
		expect(slugify('café')).toBe('caf');
		expect(slugify('hello 世界')).toBe('hello');
		expect(slugify('naïve')).toBe('na-ve');
	});

	it('handles numbers correctly', () => {
		expect(slugify('quiz123')).toBe('quiz123');
		expect(slugify('test 123 quiz')).toBe('test-123-quiz');
	});

	it('handles only special characters', () => {
		expect(slugify('!@#$%^&*()')).toBe('');
		expect(slugify('---')).toBe('');
	});
});
