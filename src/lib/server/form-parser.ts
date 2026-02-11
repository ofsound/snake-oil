import { z } from 'zod';
import { VariantConfigSchema, VARIANT_TYPES } from '$lib/variant-types';

/**
 * Schema for speed run configuration
 * Validates the JSON blob stored in the form
 */
const SpeedRunConfigSchema = z.object({
	defaultQuestionTimeLimit: z.number().nullable().default(null),
	revealDelayMs: z.number().default(3000),
	audioLoopGapMs: z.number().default(2000),
	enableStreakBonus: z.boolean().default(true)
});

/**
 * Schema for individual soundbite form data
 * Uses bracket notation: soundbite[0].fieldName
 */
export const SoundbiteFormSchema = z.object({
	id: z.string().optional(),
	removed: z.enum(['true', 'false']).optional(),
	variantType: z.enum(VARIANT_TYPES),
	variantConfig: z.string().transform((str, ctx) => {
		try {
			const parsed = JSON.parse(str);
			const result = VariantConfigSchema.safeParse(parsed);
			if (!result.success) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Invalid variant config: ${result.error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`
				});
				return z.NEVER;
			}
			return result.data;
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Invalid JSON in variant config'
			});
			return z.NEVER;
		}
	}),
	prompt: z.string().optional(),
	file: z.instanceof(File).optional(),
	sequenceFiles: z.array(z.instanceof(File)).default([]),
	rankFiles: z.array(z.instanceof(File)).default([]),
	multipleMatchFiles: z.array(z.instanceof(File)).default([]),
	imageFiles: z.array(z.instanceof(File)).default([])
});

/**
 * Schema for complete quiz form data
 */
const QuizFormSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().min(1, 'Description is required'),
	slug: z.string().min(1, 'Slug is required'),
	visibility: z.enum(['public', 'unlisted']).default('public'),
	quizMode: z.enum(['standard', 'speed_run']).default('standard'),
	speedRunConfig: z
		.string()
		.optional()
		.transform((str, ctx) => {
			if (!str) return null;
			try {
				const parsed = JSON.parse(str);
				const result = SpeedRunConfigSchema.safeParse(parsed);
				if (!result.success) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Invalid speed run config: ${result.error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`
					});
					return z.NEVER;
				}
				return result.data;
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Invalid JSON in speed run config'
				});
				return z.NEVER;
			}
		}),
	soundbites: z
		.array(SoundbiteFormSchema)
		.refine((soundbites) => soundbites.filter((sb) => sb.removed !== 'true').length >= 1, {
			message: 'At least one soundbite is required'
		}),
	tags: z
		.string()
		.optional()
		.transform((str) => {
			if (!str) return [];
			try {
				return JSON.parse(str) as string[];
			} catch {
				return [];
			}
		})
		.default([])
});

/**
 * Inferred types from schemas
 */
export type SoundbiteFormData = z.infer<typeof SoundbiteFormSchema>;
type QuizFormData = z.infer<typeof QuizFormSchema>;

/**
 * Result type for parsing operations
 */
type ParseResult<T> =
	| { success: true; data: T }
	| { success: false; errors: Array<{ field: string; message: string }> };

/**
 * Extract all indices used in bracket notation fields
 * e.g., "soundbite[0].variantType" -> extracts 0
 */
function extractSoundbiteIndices(formData: FormData): number[] {
	const indices = new Set<number>();
	formData.forEach((_, key) => {
		const match = key.match(/^soundbite\[(\d+)\]/);
		if (match) {
			indices.add(parseInt(match[1], 10));
		}
	});
	return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Extract a single soundbite's form data by index
 * Returns raw FormData values without type assertions - validation happens in Zod schema
 */
function extractSoundbiteFormData(formData: FormData, index: number): Record<string, unknown> {
	const prefix = `soundbite[${index}]`;

	// Extract file inputs - FormData.getAll() returns FormDataEntryValue[] which may contain Files
	const file = formData.get(`${prefix}.file`);
	const sequenceFiles = formData.getAll(`${prefix}.sequenceFiles`);
	const rankFiles = formData.getAll(`${prefix}.rankFiles`);
	const multipleMatchFiles = formData.getAll(`${prefix}.multipleMatchFiles`);
	const imageFiles = formData.getAll(`${prefix}.imageFiles`);

	return {
		id: formData.get(`${prefix}.id`)?.toString(),
		removed: formData.get(`${prefix}.removed`)?.toString(),
		variantType: formData.get(`${prefix}.variantType`)?.toString(),
		variantConfig: formData.get(`${prefix}.variantConfig`)?.toString(),
		prompt: formData.get(`${prefix}.prompt`)?.toString(),
		// Pass files through as unknown - Zod will validate they are File instances
		file: file instanceof File ? file : undefined,
		sequenceFiles: sequenceFiles.filter((f): f is File => f instanceof File),
		rankFiles: rankFiles.filter((f): f is File => f instanceof File),
		multipleMatchFiles: multipleMatchFiles.filter((f): f is File => f instanceof File),
		imageFiles: imageFiles.filter((f): f is File => f instanceof File)
	};
}

/**
 * Parse and validate quiz form data
 * Returns typed data or validation errors
 */
export function parseQuizFormData(formData: FormData): ParseResult<QuizFormData> {
	try {
		// Extract basic fields as strings - Zod will validate them
		const title = formData.get('title')?.toString() ?? '';
		const description = formData.get('description')?.toString() ?? '';
		const slug = formData.get('slug')?.toString() ?? '';
		const visibility = formData.get('visibility')?.toString() ?? 'public';
		const quizMode = formData.get('quizMode')?.toString() ?? 'standard';
		const speedRunConfig = formData.get('speedRunConfig')?.toString();
		const tags = formData.get('tags')?.toString();

		// Extract soundbites using bracket notation
		const indices = extractSoundbiteIndices(formData);
		const soundbites = indices.map((index) => extractSoundbiteFormData(formData, index));

		// Validate with Zod
		const rawData = {
			title,
			description,
			slug,
			visibility,
			quizMode,
			speedRunConfig,
			soundbites,
			tags
		};

		const result = QuizFormSchema.safeParse(rawData);

		if (!result.success) {
			const errors = result.error.issues.map((err: z.ZodIssue) => ({
				field: err.path.join('.'),
				message: err.message
			}));
			return { success: false, errors };
		}

		return { success: true, data: result.data };
	} catch (error) {
		return {
			success: false,
			errors: [
				{
					field: 'form',
					message: error instanceof Error ? error.message : 'Failed to parse form data'
				}
			]
		};
	}
}

/**
 * Helper to check if a soundbite should be removed
 */
export function isSoundbiteRemoved(soundbite: SoundbiteFormData): boolean {
	return soundbite.removed === 'true';
}

/**
 * Helper to check if a soundbite is new (no id) or existing
 */
export function isNewSoundbite(soundbite: SoundbiteFormData): boolean {
	return !soundbite.id;
}
