<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { JSONContent } from '@tiptap/core';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import Icon from '$lib/components/Icon.svelte';

	import { processProfileImage, validateImageFile } from '$lib/image-processing';

	import type { ActionData, PageProps } from './$types';

	let { data, form }: PageProps & { form: ActionData } = $props();

	let bio = $derived<JSONContent>((data.user.bio as JSONContent) || { type: 'doc', content: [] });
	let bioTextLength = $state(0);
	let imagePreview = $derived<string | null>(data.user.image || null);
	let selectedFile = $state<File | null>(null);
	let processingImage = $state(false);
	let saving = $state(false);
	let deletingImage = $state(false);
	let imageError = $state<string | null>(null);

	let editorRef = $state<TiptapEditor | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	// Name change state - initialized from props, but editable
	// svelte-ignore state_referenced_locally
	let displayName = $state(data.user.name ?? '');
	let updatingName = $state(false);
	let nameError = $state<string | null>(null);
	let nameSuccess = $state<string | null>(null);

	// Sync displayName when data.user.name changes (e.g., after successful update)
	$effect(() => {
		if (data.user.name !== undefined && displayName !== data.user.name) {
			displayName = data.user.name ?? '';
		}
	});

	// Password change state
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let updatingPassword = $state(false);
	let passwordError = $state<string | null>(null);
	let passwordSuccess = $state<string | null>(null);

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

	async function handleUpdateName() {
		nameError = null;
		nameSuccess = null;
		updatingName = true;

		if (!displayName.trim()) {
			nameError = 'Display name is required';
			updatingName = false;
			return;
		}

		try {
			const formData = new FormData();
			formData.set('name', displayName.trim());

			const response = await fetch('?/updateName', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				nameError = result.data?.error || 'Failed to update name';
			} else {
				nameSuccess = 'Display name updated successfully';
				// Update local data
				data.user.name = displayName.trim();
			}
		} catch (err) {
			console.error('Update name error:', err);
			nameError = 'Failed to update name. Please try again.';
		} finally {
			updatingName = false;
		}
	}

	async function handleUpdatePassword() {
		passwordError = null;
		passwordSuccess = null;

		if (!currentPassword) {
			passwordError = 'Current password is required';
			return;
		}

		if (newPassword.length < 8) {
			passwordError = 'Password must be at least 8 characters';
			return;
		}

		if (newPassword !== confirmPassword) {
			passwordError = 'Passwords do not match';
			return;
		}

		updatingPassword = true;

		try {
			const formData = new FormData();
			formData.set('currentPassword', currentPassword);
			formData.set('newPassword', newPassword);

			const response = await fetch('?/updatePassword', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.type === 'failure') {
				passwordError = result.data?.error || 'Failed to change password';
			} else {
				passwordSuccess = 'Password changed successfully';
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			}
		} catch (err) {
			console.error('Change password error:', err);
			passwordError = 'Failed to change password. Please try again.';
		} finally {
			updatingPassword = false;
		}
	}
</script>

<PageContainer>
	<div class="mb-6 flex items-center justify-between">
		<Heading level={1}>Edit Profile</Heading>
		<Button variant="secondary" size="sm" href="/profile" icon="arrow-left">Cancel</Button>
	</div>

	{#if form?.error}
		<div
			class="mb-4 flex items-center gap-2 rounded-lg border border-border bg-accent-red-bg p-4 text-accent-red-text"
		>
			<Icon name="error" size="sm" />
			{form.error}
		</div>
	{/if}

	{#if imageError}
		<div
			class="mb-4 flex items-center gap-2 rounded-lg border border-border bg-accent-red-bg p-4 text-accent-red-text"
		>
			<Icon name="error" size="sm" />
			{imageError}
		</div>
	{/if}

	<Card class="space-y-6" padding="lg">
		<form method="POST" action="?/updateProfile" onsubmit={handleSubmit} class="space-y-6">
			<!-- Profile Image Section -->
			<div>
				<span class="mb-2 block text-sm font-medium text-text-secondary"> Profile Image </span>
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
								class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-red-text text-text-inverse hover:brightness-90"
								onclick={handleDeleteImage}
								disabled={deletingImage}
							>
								<Icon name="close" size="xs" />
							</button>
						</div>
					{:else}
						<div
							class="flex h-[150px] w-[150px] items-center justify-center rounded-lg bg-surface-muted"
						>
							<Icon name="user-circle" size="xl" class="text-text-muted" />
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
							icon="upload"
						>
							{processingImage ? 'Processing...' : 'Upload Image'}
						</Button>
						<p class="text-xs text-text-muted">
							JPG, PNG, WebP, or HEIC. Max 10MB.<br />
							Will be cropped to 300×300px square.
						</p>
					</div>
				</div>
			</div>

			<!-- Bio Section -->
			<div>
				<span class="mb-2 block text-sm font-medium text-text-secondary"> Bio </span>
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
					<p class="mt-1 text-xs text-accent-amber-text">
						{2000 - bioTextLength} characters remaining
					</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-4">
				<Button type="submit" variant="primary" size="md" disabled={saving} icon="save">
					{saving ? 'Saving...' : 'Save Changes'}
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="md"
					onclick={handleCancel}
					disabled={saving}
					icon="close"
				>
					Cancel
				</Button>
			</div>
		</form>
	</Card>

	<!-- Account Settings Card -->
	<div class="mt-6">
		<Heading level={2} class="mb-4">Account Settings</Heading>

		<Card class="space-y-6" padding="lg">
			<!-- Display Name Section -->
			<div class="border-b border-border pb-6">
				<h3 class="mb-1 flex items-center gap-2 text-lg font-medium">
					<Icon name="user" size="sm" />
					Display Name
				</h3>
				<p class="mb-4 text-sm text-text-muted">This is how your name appears across the site</p>

				{#if nameError}
					<div
						class="mb-4 flex items-center gap-2 rounded-lg border border-border bg-accent-red-bg p-3 text-sm text-accent-red-text"
					>
						<Icon name="error" size="sm" />
						{nameError}
					</div>
				{/if}

				{#if nameSuccess}
					<div
						class="mb-4 flex items-center gap-2 rounded-lg border border-border bg-green-100 p-3 text-sm text-green-800"
					>
						<Icon name="check-circle" size="sm" />
						{nameSuccess}
					</div>
				{/if}

				<div class="flex gap-3">
					<input
						type="text"
						bind:value={displayName}
						placeholder="Your display name"
						class="box-border flex-1 rounded-sm border border-border bg-surface-elevated px-3 py-2 text-base focus:border-accent-indigo-border focus:ring-1 focus:ring-accent-indigo-border focus:outline-none"
					/>
					<Button
						type="button"
						variant="secondary"
						size="md"
						disabled={updatingName}
						onclick={handleUpdateName}
						icon="edit"
					>
						{updatingName ? 'Updating...' : 'Update Name'}
					</Button>
				</div>
			</div>

			<!-- Password Section -->
			<div>
				<h3 class="mb-1 flex items-center gap-2 text-lg font-medium">
					<Icon name="lock" size="sm" />
					Change Password
				</h3>
				<p class="mb-4 text-sm text-text-muted">Enter a new password below</p>

				{#if passwordError}
					<div
						class="mb-4 flex items-center gap-2 rounded-lg border border-border bg-accent-red-bg p-3 text-sm text-accent-red-text"
					>
						<Icon name="error" size="sm" />
						{passwordError}
					</div>
				{/if}

				{#if passwordSuccess}
					<div
						class="mb-4 flex items-center gap-2 rounded-lg border border-border bg-green-100 p-3 text-sm text-green-800"
					>
						<Icon name="check-circle" size="sm" />
						{passwordSuccess}
					</div>
				{/if}

				<div class="space-y-4">
					<div>
						<label for="current-password" class="mb-1 block text-sm font-medium text-text-secondary"
							>Current Password</label
						>
						<input
							id="current-password"
							type="password"
							bind:value={currentPassword}
							placeholder="Enter your current password"
							class="box-border w-full rounded-sm border border-border bg-surface-elevated px-3 py-2 text-base focus:border-accent-indigo-border focus:ring-1 focus:ring-accent-indigo-border focus:outline-none"
						/>
					</div>

					<div>
						<label for="new-password" class="mb-1 block text-sm font-medium text-text-secondary"
							>New Password</label
						>
						<input
							id="new-password"
							type="password"
							bind:value={newPassword}
							placeholder="Enter new password"
							class="box-border w-full rounded-sm border border-border bg-surface-elevated px-3 py-2 text-base focus:border-accent-indigo-border focus:ring-1 focus:ring-accent-indigo-border focus:outline-none"
						/>
					</div>

					<div>
						<label for="confirm-password" class="mb-1 block text-sm font-medium text-text-secondary"
							>Confirm New Password</label
						>
						<input
							id="confirm-password"
							type="password"
							bind:value={confirmPassword}
							placeholder="Re-enter new password"
							class="box-border w-full rounded-sm border border-border bg-surface-elevated px-3 py-2 text-base focus:border-accent-indigo-border focus:ring-1 focus:ring-accent-indigo-border focus:outline-none"
						/>
					</div>

					<Button
						type="button"
						variant="secondary"
						size="md"
						disabled={updatingPassword}
						onclick={handleUpdatePassword}
						icon="lock"
					>
						{updatingPassword ? 'Changing...' : 'Change Password'}
					</Button>
				</div>
			</div>
		</Card>
	</div>
</PageContainer>
