/**
 * Unified form builder for quiz create and edit operations
 * Eliminates duplication between create and edit pages
 */

import type { SoundbiteState } from './types/soundbite';

export interface QuizFormOptions {
	title: string;
	description: string;
	slug?: string;
	quizMode: 'standard' | 'speed_run';
	speedRunConfig?: {
		defaultQuestionTimeLimit: string;
		revealDelayMs: string;
		audioLoopGapMs: string;
		enableStreakBonus: boolean;
	};
	soundbites: Array<{
		id?: string | number;
		state: SoundbiteState;
		type: 'new' | 'existing';
		removed?: boolean;
	}>;
}

/**
 * Builds FormData for quiz submission
 * Works for both create and edit scenarios
 */
export function buildQuizFormData(options: QuizFormOptions): FormData {
	const formData = new FormData();

	// Basic fields
	formData.append('title', options.title);
	formData.append('description', options.description);
	if (options.slug) {
		formData.append('slug', options.slug);
	}
	formData.append('quizMode', options.quizMode);

	if (options.speedRunConfig && options.quizMode === 'speed_run') {
		formData.append(
			'speedRunConfig',
			JSON.stringify({
				defaultQuestionTimeLimit:
					parseInt(options.speedRunConfig.defaultQuestionTimeLimit, 10) || 10,
				revealDelayMs: parseInt(options.speedRunConfig.revealDelayMs, 10) || 3000,
				audioLoopGapMs: parseInt(options.speedRunConfig.audioLoopGapMs, 10) || 2000,
				enableStreakBonus: options.speedRunConfig.enableStreakBonus
			})
		);
	}

	// Process soundbites
	options.soundbites.forEach((soundbite, index) => {
		appendSoundbiteToFormData(formData, soundbite, index);
	});

	return formData;
}

function appendSoundbiteToFormData(
	formData: FormData,
	soundbite: QuizFormOptions['soundbites'][number],
	index: number
): void {
	const prefix = soundbite.type === 'existing' ? 'existingSoundbite' : 'newSoundbite';

	// ID and removal flag for existing
	if (soundbite.type === 'existing' && soundbite.id) {
		formData.append(`${prefix}Id`, soundbite.id.toString());
		if (soundbite.removed) {
			formData.append(`${prefix}Remove`, soundbite.id.toString());
		}
	}

	// Standard fields are handled by SoundbiteEditor's hidden inputs
	// We only need to append variant-specific files here

	const { state } = soundbite;
	switch (state.variantType) {
		case 'sequence':
			appendSequenceFiles(formData, state, index);
			break;
		case 'rank':
			appendRankFiles(formData, state, index);
			break;
		case 'image_choice':
			appendImageChoiceFiles(formData, state, index);
			break;
	}
}

function appendSequenceFiles(formData: FormData, state: SoundbiteState, index: number): void {
	const files = state.sequenceFiles || [];
	files.forEach((file) => {
		if (file && file.size > 0) {
			formData.append(`sequenceFiles-${index}`, file);
		}
	});
}

function appendRankFiles(formData: FormData, state: SoundbiteState, index: number): void {
	const files = state.rankFiles || [];
	files.forEach((file) => {
		if (file && file.size > 0) {
			formData.append(`rankFiles-${index}`, file);
		}
	});
}

function appendImageChoiceFiles(formData: FormData, state: SoundbiteState, index: number): void {
	// Always append files for image_choice, even if empty/null
	// The server expects one entry per option
	const files = state.imageChoiceFiles || [];
	const optionsCount = state.imageChoiceOptions?.length || 0;

	// Ensure we append the correct number of file entries matching the options
	for (let i = 0; i < optionsCount; i++) {
		const file = files[i];
		if (file && file.size > 0) {
			formData.append(`imageChoiceFiles-${index}`, file);
		} else {
			// Append empty placeholder for missing/existing images
			formData.append(`imageChoiceFiles-${index}`, new Blob([]), 'placeholder');
		}
	}
}
