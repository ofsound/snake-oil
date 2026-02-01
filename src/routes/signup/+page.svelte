<script lang="ts">
	import { authClient, signUpWithSlug } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { validateRedirectUrl, slugify } from '$lib/utils';

	const session = authClient.useSession();

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
	const redirectUrl = $derived(validateRedirectUrl($page.url.searchParams.get('redirect')));

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
				// Redirect to the validated return URL
				goto(redirectUrl);
			}
		} catch (err: unknown) {
			console.error('Sign up error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign up';
		} finally {
			loading = false;
		}
	}
</script>

{#if $session.data}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md">
			<h2 class="mt-0 mb-6">You're already signed in!</h2>
			<p>Welcome back, {$session.data.user?.name || $session.data.user?.email}!</p>
			<a href={redirectUrl} class="text-blue-500 hover:text-blue-700">Continue to {$page.url.searchParams.get('redirect') ? 'your destination' : 'home'}</a>
		</div>
	</div>
{:else}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md">
			<h2 class="mt-0 mb-6">Sign Up</h2>

			{#if error}
				<div class="mb-4 rounded bg-[#fee] px-3 py-3 text-[#c33]">{error}</div>
			{/if}

			<input
				type="text"
				placeholder="Name"
				bind:value={name}
				required
				disabled={loading}
				class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
			/>

			<div class="mb-4">
				<input
					type="text"
					placeholder="Username (for your profile URL)"
					bind:value={slug}
					required
					disabled={loading}
					class="box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
				/>
				{#if slug}
					<p class="mt-1 text-sm text-gray-600">
						Your profile URL: <span class="font-mono">/users/{slug}</span>
					</p>
				{/if}
			</div>

			<input
				type="email"
				placeholder="Email"
				bind:value={email}
				required
				disabled={loading}
				class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
			/>
			<input
				type="password"
				placeholder="Password"
				bind:value={password}
				required
				disabled={loading}
				class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
			/>

			<button
				onclick={handleSignUp}
				disabled={loading}
				class="mb-2 w-full cursor-pointer rounded border-none bg-[#007bff] px-3 py-3 text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Please wait...' : 'Sign Up'}
			</button>

			<p class="text-center text-sm">
				Already have an account?
				<a href="/login?redirect={encodeURIComponent($page.url.searchParams.get('redirect') || '')}" class="text-blue-500 hover:text-blue-700">Sign in here</a>
			</p>
		</div>
	</div>
{/if}
