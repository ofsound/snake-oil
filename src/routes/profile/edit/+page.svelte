<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { JSONContent } from '@tiptap/core';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';

	import { processProfileImage, validateImageFile } from '$lib/image-processing';

	import type { ActionData, PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionData } = $props();

	let bio = $state<JSONContent>({ type: 'doc', content: [] });
	let bioTextLength = $state(0);
	let imagePreview = $state<string | null>(null);

	$effect(() => {
		bio = (data.user.bio as JSONContent) || { type: 'doc', content: [] };
		imagePreview = data.user.image || null;
	});
	let selectedFile = $state<File | null>(null);
	let processingImage = $state(false);
	let saving = $state(false);
	let deletingImage = $state(false);
	let imageError = $state<string | null>(null);

	let editorRef = $state<TiptapEditor | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	async function handleImageSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		// Validate file
		const validationError = validateImageFile(file);
		if (validationError) {
			imageError = validationError;
			return;
		}

		imageError = null;
		processingImage = true;

		try {
			// Process image to 300x300
			const processedBlob = await processProfileImage(file);

			// Create preview URL
			const previewUrl = URL.createObjectURL(processedBlob);
			if (imagePreview && imagePreview.startsWith('blob:')) {
				URL.revokeObjectURL(imagePreview);
			}
			imagePreview = previewUrl;

			// Create processed file for upload
			selectedFile = new File([processedBlob], 'profile.jpg', {
				type: 'image/jpeg'
			});
		} catch (err) {
			console.error('Image processing error:', err);
			imageError = 'Failed to process image. Please try again.';
		} finally {
			processingImage = false;
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		saving = true;

		const formElement = event.target as HTMLFormElement;
		const formData = new FormData(formElement);

		// Get bio from editor as JSON
		const bioJson = editorRef?.getJSON() || { type: 'doc', content: [] };
		formData.set('bio', JSON.stringify(bioJson));

		// If there's a selected image, add it
		if (selectedFile) {
			formData.set('image', selectedFile);
		}

		try {
			// First, update bio
			const bioResponse = await fetch('?/updateProfile', {
				method: 'POST',
				body: formData
			});

			const bioResult = await bioResponse.json();

			if (bioResult.type === 'failure') {
				// Error will be shown via form prop
				return;
			}

			// If there's a new image, upload it separately
			if (selectedFile) {
				const imageFormData = new FormData();
				imageFormData.set('image', selectedFile);

				const imageResponse = await fetch('?/uploadImage', {
					method: 'POST',
					body: imageFormData
				});

				const imageResult = await imageResponse.json();

				if (imageResult.type === 'failure') {
					// Error will be shown via form prop
					return;
				}
			}

			// Success - redirect to profile
			goto(resolve('/profile'));
		} catch (err) {
			console.error('Submit error:', err);
		} finally {
			saving = false;
		}
	}

	async function handleDeleteImage() {
		if (!confirm('Are you sure you want to remove your profile image?')) return;

		deletingImage = true;

		try {
			const response = await fetch('?/deleteImage', {
				method: 'POST',
				body: new FormData()
			});

			const result = await response.json();

			if (result.type === 'success') {
				imagePreview = null;
				selectedFile = null;
			}
		} catch (err) {
			console.error('Delete image error:', err);
		} finally {
			deletingImage = false;
		}
	}

	function handleCancel() {
		goto(resolve('/profile'));
	}
</script>

<PageContainer>
	<div class="mb-6 flex items-center justify-between">
		<Heading level={1}>Edit Profile</Heading>
		<Button variant="secondary" size="sm" href="/profile">Cancel</Button>
	</div>

	{#if form?.error}
		<div
			class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
		>
			{form.error}
		</div>
	{/if}

	{#if imageError}
		<div
			class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
		>
			{imageError}
		</div>
	{/if}

	<Card class="space-y-6" padding="lg">
		<form method="POST" action="?/updateProfile" onsubmit={handleSubmit} class="space-y-6">
			<!-- Profile Image Section -->
			<div>
				<span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Profile Image
				</span>
				<div class="flex items-start gap-4">
					{#if imagePreview}
						<div class="relative">
							<img
								src={imagePreview}
								alt="Profile preview"
								class="h-[150px] w-[150px] rounded-lg object-cover"
							/>
							<button
								type="button"
								class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
								onclick={handleDeleteImage}
								disabled={deletingImage}
							>
								×
							</button>
						</div>
					{:else}
						<div
							class="flex h-[150px] w-[150px] items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800"
						>
							<span class="text-4xl text-gray-400">👤</span>
						</div>
					{/if}

					<div class="flex flex-col gap-2">
						<input
							bind:this={fileInput}
							type="file"
							accept="image/jpeg,image/png,image/webp,image/heic"
							class="hidden"
							onchange={handleImageSelect}
							disabled={processingImage}
						/>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={processingImage}
							onclick={() => fileInput?.click()}
						>
							{processingImage ? 'Processing...' : 'Upload Image'}
						</Button>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							JPG, PNG, WebP, or HEIC. Max 10MB.<br />
							Will be cropped to 300×300px square.
						</p>
					</div>
				</div>
			</div>

			<!-- Bio Section -->
			<div>
				<span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"> Bio </span>
				<TiptapEditor
					bind:this={editorRef}
					content={bio}
					onChange={(json) => {
						bio = json;
					}}
					placeholder="Tell us about yourself..."
					maxLength={2000}
				/>
				{#if bioTextLength > 1800}
					<p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
						{2000 - bioTextLength} characters remaining
					</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<Button type="submit" variant="primary" size="md" disabled={saving}>
					{saving ? 'Saving...' : 'Save Changes'}
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="md"
					onclick={handleCancel}
					disabled={saving}
				>
					Cancel
				</Button>
			</div>
		</form>
	</Card>
</PageContainer>
