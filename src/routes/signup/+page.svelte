<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthFormInput from '$lib/components/AuthFormInput.svelte';

	import { signUpWithSlug } from '$lib/auth-client';
	import { validateRedirectUrl, slugify, resolvePath } from '$lib/utils';
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Slug is always derived from name (always-sync behavior)
	const slug = $derived(name ? slugify(name) : '');

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

		// Check for reserved usernames
		const reservedSlugs = [
			'user',
			'login',
			'signup',
			'profile',
			'create',
			'quizzes',
			'results',
			'api',
			'auth'
		];
		if (reservedSlugs.includes(slug.toLowerCase())) {
			error = `"${slug}" is a reserved username. Please choose a different one.`;
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
				email = '';
				password = '';
				name = '';
				// Redirect to the validated return URL and refresh session data
				goto(resolvePath(redirectUrl), { invalidateAll: true });
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
	<AuthFormInput type="text" placeholder="Name" bind:value={name} required disabled={loading} />

	<div>
		<label for="username" class="sr-only">Username (for your profile URL)</label>
		<input
			id="username"
			type="text"
			placeholder="Username (for your profile URL)"
			value={slug}
			required
			disabled={loading}
			readonly
			class="box-border w-full rounded-sm border border-neutral-200 bg-white px-2 py-3 text-base focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
		/>
		{#if slug}
			<p class="mt-1 text-sm text-gray-600">
				Your profile URL: <span class="font-mono">/user/{slug}</span>
			</p>
		{/if}
	</div>

	<AuthFormInput type="email" placeholder="Email" bind:value={email} required disabled={loading} />
	<AuthFormInput
		type="password"
		placeholder="Password"
		bind:value={password}
		required
		disabled={loading}
	/>

	{#snippet footer()}
		<p>
			Already have an account?
			<a
				href={resolvePath(
					`/login?redirect=${encodeURIComponent(page.url.searchParams.get('redirect') || '')}`
				)}
			>
				Sign in here
			</a>
		</p>
	{/snippet}
</AuthForm>
