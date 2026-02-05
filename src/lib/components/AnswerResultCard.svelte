<script lang="ts">
	import type {
		VariantConfig,
		AnswerDetail,
		MultipleChoiceConfig,
		MultipleResponseConfig,
		SequenceConfig
	} from '$lib/variant-types';

	type Props = {
		answerDetail: AnswerDetail;
		variantConfig: VariantConfig;
		index: number;
	};

	let { answerDetail, variantConfig, index }: Props = $props();

	function getCorrectAnswerText(): string {
		if (variantConfig.type === 'simple_guess') {
			return variantConfig.correctAnswer;
		} else if (variantConfig.type === 'multiple_choice') {
			const correctOption = variantConfig.options.find((opt) => opt.isCorrect);
			return correctOption?.text ?? '';
		} else if (variantConfig.type === 'multiple_response') {
			const correctOptions = variantConfig.options.filter((opt) => opt.isCorrect);
			return correctOptions.map((opt) => opt.text).join(', ');
		} else if (variantConfig.type === 'sequence') {
			const correctTrack = variantConfig.tracks[variantConfig.correctTrackIndex];
			return correctTrack?.name ?? '';
		}
		return '';
	}

	function getUserAnswerText(): string {
		if (answerDetail.variantType === 'simple_guess') {
			return answerDetail.guess;
		} else if (answerDetail.variantType === 'multiple_choice' && answerDetail.selectedOptionId) {
			const config = variantConfig as MultipleChoiceConfig;
			const selectedOption = config.options.find((opt) => opt.id === answerDetail.selectedOptionId);
			return selectedOption?.text ?? answerDetail.guess;
		} else if (
			answerDetail.variantType === 'multiple_response' &&
			answerDetail.selectedOptionIds &&
			answerDetail.selectedOptionIds.length > 0
		) {
			const config = variantConfig as MultipleResponseConfig;
			const selectedTexts = answerDetail.selectedOptionIds
				.map((id) => config.options.find((opt) => opt.id === id)?.text)
				.filter(Boolean);
			return selectedTexts.join(', ') || answerDetail.guess;
		} else if (
			answerDetail.variantType === 'sequence' &&
			answerDetail.selectedTrackIndex !== undefined
		) {
			const config = variantConfig as SequenceConfig;
			const selectedTrack = config.tracks[answerDetail.selectedTrackIndex];
			return selectedTrack?.name ?? `Track ${answerDetail.selectedTrackIndex + 1}`;
		}
		return answerDetail.guess;
	}

	let correctAnswerText = $derived(getCorrectAnswerText());
	let userAnswerText = $derived(getUserAnswerText());
</script>

<div
	class="rounded-md border p-3"
	class:border-green-200={answerDetail.isCorrect}
	class:bg-green-50={answerDetail.isCorrect}
	class:border-red-200={!answerDetail.isCorrect}
	class:bg-red-50={!answerDetail.isCorrect}
>
	<div class="flex items-start justify-between">
		<span class="text-sm font-medium text-gray-700">Question #{index + 1}</span>
		<span
			class="text-sm font-semibold"
			class:text-green-700={answerDetail.isCorrect}
			class:text-red-700={!answerDetail.isCorrect}
		>
			{answerDetail.isCorrect ? 'Correct' : 'Incorrect'}
		</span>
	</div>
	<div class="mt-2 flex flex-col gap-1 text-sm">
		<p>
			<span class="text-gray-500">Your answer:</span>
			<span class="ml-1" class:text-red-700={!answerDetail.isCorrect}
				>{userAnswerText || '(no answer)'}</span
			>
		</p>
		{#if !answerDetail.isCorrect}
			<p>
				<span class="text-gray-500">Correct answer:</span>
				<span class="ml-1 text-green-700">{correctAnswerText}</span>
			</p>
		{/if}
	</div>
</div>
