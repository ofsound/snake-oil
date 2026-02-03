<script lang="ts">
	import { authClient, signUpWithSlug } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { validateRedirectUrl, slugify } from '$lib/utils';
	import AuthForm from '$lib/components/AuthForm.svelte';
	import FormInput from '$lib/components/FormInput.svelte';

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let slug = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Derived slug from name - used for auto-generation
	const derivedSlug = $derived(name ? slugify(name) : '');

	// Sync slug from name when name changes (user requested always sync behavior)
	$effect(() => {
		slug = derivedSlug;
	});

	// Get and validate the redirect URL from query parameters
	const redirectUrl = $derived(validateRedirectUrl(page.url.searchParams.get('redirect')));

	async function handleSignUp() {
		loading = true;
		error = null;

		// Validation
		if (!name.trim()) {
			error = 'Name is required';
			loading = false;
			return;
		}

		if (!slug.trim()) {
			error = 'Username is required';
			loading = false;
			return;
		}

		try {
			const result = await signUpWithSlug({
				email,
				password,
				name,
				slug
			});

			// Better-Auth returns { data, error } consistently
			const { data, error: authError } = result as unknown as {
				data?: { user: unknown };
				error?: { message: string };
			};

			if (authError) {
				// Check for slug collision errors
				if (authError.message?.includes('slug') || authError.message?.includes('unique')) {
					error = `The username "${slug}" is already taken. Please choose a different one.`;
				} else {
					error = authError.message || 'Failed to sign up';
				}
				return;
			}

			// Success - redirect to the return URL or home page
			if (data) {
				console.log('Sign up successful:', data.user);
				email = '';
				password = '';
				name = '';
				slug = '';
				// Redirect to the validated return URL and refresh session data
				goto(redirectUrl, { invalidateAll: true });
			}
		} catch (err: unknown) {
			console.error('Sign up error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign up';
		} finally {
			loading = false;
		}
	}
</script>

<AuthForm
	title="Sign Up"
	{loading}
	{error}
	onsubmit={(e) => {
		e.preventDefault();
		handleSignUp();
	}}
>
	{#snippet children()}
		<FormInput type="text" placeholder="Name" bind:value={name} required disabled={loading} />

		<div>
			<FormInput
				type="text"
				placeholder="Username (for your profile URL)"
				bind:value={slug}
				required
				disabled={loading}
			/>
			{#if slug}
				<p class="mt-1 text-sm text-gray-600">
					Your profile URL: <span class="font-mono">/users/{slug}</span>
				</p>
			{/if}
		</div>

		<FormInput type="email" placeholder="Email" bind:value={email} required disabled={loading} />
		<FormInput
			type="password"
			placeholder="Password"
			bind:value={password}
			required
			disabled={loading}
		/>
	{/snippet}

	{#snippet footer()}
		<p>
			Already have an account?
			<a href="/login?redirect={encodeURIComponent(page.url.searchParams.get('redirect') || '')}">
				Sign in here
			</a>
		</p>
	{/snippet}
</AuthForm>
