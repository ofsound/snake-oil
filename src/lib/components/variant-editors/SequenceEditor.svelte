<script lang="ts">
	import FormField from '$lib/components/FormField.svelte';
	import type { VariantEditorProps } from '$lib/types/soundbite';

	let { soundbite, onChange, editorId = 'sequence-editor' }: VariantEditorProps = $props();

	const tracks = $derived(soundbite.sequenceTracks);
	const correctTrackIndex = $derived(soundbite.sequenceCorrectTrackIndex);
	const prompt = $derived(soundbite.sequencePrompt);

	let fileInput: HTMLInputElement | null = $state(null);
	let isUploading = $state(false);
	// Store actual File objects for form submission
	let trackFiles = $state<Map<string, File>>(new Map());

	// Update parent with files when they change
	function notifyFilesChange() {
		onChange({ sequenceFiles: Array.from(trackFiles.values()) });
	}

	function extractNameFromFilename(filename: string): string {
		return filename
			.replace(/\.[^/.]+$/, '') // Remove extension
			.replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
			.replace(/\b\w/g, (l) => l.toUpperCase()); // Title case
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		isUploading = true;
		const newTracks: typeof tracks = [];

		for (const file of Array.from(files)) {
			if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
				console.warn(`Skipping non-MP3 file: ${file.name}`);
				continue;
			}

			const trackId = crypto.randomUUID();

			// Store the file for form submission
			trackFiles.set(trackId, file);

			newTracks.push({
				id: trackId,
				name: extractNameFromFilename(file.name),
				url: '' // Will be filled in by server after upload
			});
		}

		// Merge with existing tracks
		const updatedTracks = [...tracks, ...newTracks].slice(0, 10); // Max 10 tracks
		onChange({ sequenceTracks: updatedTracks });

		// Notify parent of file changes
		notifyFilesChange();

		// Reset file input
		if (fileInput) {
			fileInput.value = '';
		}

		isUploading = false;
	}

	function removeTrack(index: number) {
		const trackToRemove = tracks[index];
		if (trackToRemove) {
			trackFiles.delete(trackToRemove.id);
		}

		const updatedTracks = tracks.filter((_, i) => i !== index);
		onChange({ sequenceTracks: updatedTracks });

		// Notify parent of file changes
		notifyFilesChange();

		// Adjust correctTrackIndex if needed
		let newCorrectIndex = correctTrackIndex;
		if (correctTrackIndex >= updatedTracks.length) {
			newCorrectIndex = Math.max(0, updatedTracks.length - 1);
		} else if (correctTrackIndex === index && updatedTracks.length > 0) {
			newCorrectIndex = 0;
		}
		if (newCorrectIndex !== correctTrackIndex) {
			onChange({ sequenceCorrectTrackIndex: newCorrectIndex });
		}
	}

	function updateTrackName(index: number, newName: string) {
		const updatedTracks = tracks.map((track, i) =>
			i === index ? { ...track, name: newName } : track
		);
		onChange({ sequenceTracks: updatedTracks });
	}

	function moveTrackUp(index: number) {
		if (index === 0) return;
		const updatedTracks = [...tracks];
		[updatedTracks[index - 1], updatedTracks[index]] = [
			updatedTracks[index],
			updatedTracks[index - 1]
		];
		onChange({ sequenceTracks: updatedTracks });

		// Adjust correctTrackIndex if needed
		let newCorrectIndex = correctTrackIndex;
		if (correctTrackIndex === index) {
			newCorrectIndex = index - 1;
		} else if (correctTrackIndex === index - 1) {
			newCorrectIndex = index;
		}
		if (newCorrectIndex !== correctTrackIndex) {
			onChange({ sequenceCorrectTrackIndex: newCorrectIndex });
		}
	}

	function moveTrackDown(index: number) {
		if (index >= tracks.length - 1) return;
		const updatedTracks = [...tracks];
		[updatedTracks[index], updatedTracks[index + 1]] = [
			updatedTracks[index + 1],
			updatedTracks[index]
		];
		onChange({ sequenceTracks: updatedTracks });

		// Adjust correctTrackIndex if needed
		let newCorrectIndex = correctTrackIndex;
		if (correctTrackIndex === index) {
			newCorrectIndex = index + 1;
		} else if (correctTrackIndex === index + 1) {
			newCorrectIndex = index;
		}
		if (newCorrectIndex !== correctTrackIndex) {
			onChange({ sequenceCorrectTrackIndex: newCorrectIndex });
		}
	}

	const isValid = $derived(tracks.length >= 2 && tracks.length <= 10 && prompt.trim().length > 0);
	const canAddMore = $derived(tracks.length < 10);
</script>

<div class="flex flex-col gap-4">
	<!-- File Upload -->
	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-gray-700" for={`${editorId}-files`}>
			Upload MP3 Files (2-10 tracks)
		</label>
		<input
			id={`${editorId}-files`}
			bind:this={fileInput}
			type="file"
			accept="audio/mpeg,.mp3"
			multiple
			disabled={!canAddMore || isUploading}
			onchange={handleFileUpload}
			class="w-full text-sm text-gray-700 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-white file:px-2 file:py-1.5 file:font-medium disabled:opacity-50"
		/>
		{#if isUploading}
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"
				></div>
				<span>Uploading...</span>
			</div>
		{/if}
		{#if !canAddMore}
			<p class="text-xs text-amber-600">Maximum 10 tracks reached</p>
		{/if}
	</div>

	<!-- Track List -->
	{#if tracks.length > 0}
		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium text-gray-700">Tracks ({tracks.length})</span>
			<div class="flex flex-col gap-2">
				{#each tracks as track, index (track.id)}
					<div class="flex items-center gap-2 rounded-sm border border-neutral-200 bg-white p-2">
						<span class="w-6 text-center text-sm font-medium text-gray-500">{index + 1}</span>
						<input
							type="text"
							value={track.name}
							oninput={(e) => updateTrackName(index, e.currentTarget.value)}
							class="flex-1 rounded-sm border border-neutral-200 px-2 py-1 text-sm"
							placeholder="Track name"
						/>
						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => moveTrackUp(index)}
								disabled={index === 0}
								class="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
								title="Move up"
							>
								↑
							</button>
							<button
								type="button"
								onclick={() => moveTrackDown(index)}
								disabled={index >= tracks.length - 1}
								class="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
								title="Move down"
							>
								↓
							</button>
							<button
								type="button"
								onclick={() => removeTrack(index)}
								class="rounded p-1 text-red-600 hover:bg-red-50"
								title="Remove"
							>
								×
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Correct Answer Selection -->
		<div class="flex flex-col gap-2">
			<span class="text-sm font-medium text-gray-700">Select Correct Track (target)</span>
			<div class="flex flex-wrap gap-2">
				{#each tracks as track, index}
					<label
						class="flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 transition-colors {correctTrackIndex ===
						index
							? 'border-emerald-500 bg-emerald-50'
							: 'border-neutral-200 bg-white hover:bg-gray-50'}"
					>
						<input
							type="radio"
							name={`${editorId}-correct-track`}
							value={index}
							checked={correctTrackIndex === index}
							onchange={() => onChange({ sequenceCorrectTrackIndex: index })}
							class="sr-only"
						/>
						<span class="text-sm">{index + 1}. {track.name}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Prompt -->
	<FormField label="Prompt" id={`${editorId}-prompt`}>
		<textarea
			id={`${editorId}-prompt`}
			value={prompt}
			oninput={(e) => onChange({ sequencePrompt: e.currentTarget.value })}
			rows="2"
			class="w-full rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm"
			placeholder="e.g., Press the button when you hear the flute"
		></textarea>
	</FormField>

	{#if tracks.length < 2}
		<p class="text-sm text-amber-600">Please upload at least 2 MP3 files</p>
	{/if}
</div>
