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
 * Builds FormData for quiz submission using bracket notation
 * soundbite[0].variantType, soundbite[0].file, etc.
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

	// Process soundbites with bracket notation
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
	const prefix = `soundbite[${index}]`;

	// ID and removal flag for existing soundbites
	if (soundbite.type === 'existing' && soundbite.id) {
		formData.append(`${prefix}.id`, soundbite.id.toString());
		if (soundbite.removed) {
			formData.append(`${prefix}.removed`, 'true');
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
	const prefix = `soundbite[${index}]`;
	const files = state.sequenceFiles || [];
	files.forEach((file) => {
		if (file && file.size > 0) {
			formData.append(`${prefix}.sequenceFiles`, file);
		}
	});
}

function appendRankFiles(formData: FormData, state: SoundbiteState, index: number): void {
	const prefix = `soundbite[${index}]`;
	const files = state.rankFiles || [];
	files.forEach((file) => {
		if (file && file.size > 0) {
			formData.append(`${prefix}.rankFiles`, file);
		}
	});
}

function appendImageChoiceFiles(formData: FormData, state: SoundbiteState, index: number): void {
	const prefix = `soundbite[${index}]`;
	const files = state.imageChoiceFiles || [];
	const optionsCount = state.imageChoiceOptions?.length || 0;

	// Ensure we append the correct number of file entries matching the options
	for (let i = 0; i < optionsCount; i++) {
		const file = files[i];
		if (file && file.size > 0) {
			formData.append(`${prefix}.imageFiles`, file);
		} else {
			// Append empty placeholder for missing/existing images
			formData.append(`${prefix}.imageFiles`, new Blob([]), 'placeholder');
		}
	}
}
