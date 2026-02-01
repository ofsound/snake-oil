<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { validateRedirectUrl } from '$lib/utils';

	const session = authClient.useSession();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Get and validate the redirect URL from query parameters
	const redirectUrl = $derived(validateRedirectUrl($page.url.searchParams.get('redirect')));

	async function handleSignIn() {
		loading = true;
		error = null;
		try {
			const result = await authClient.signIn.email({
				email,
				password
			});

			// Better-Auth returns { data, error } consistently
			const { data, error: authError } = result as {
				data?: { user: unknown };
				error?: { message: string };
			};

			if (authError) {
				const msg = authError.message || 'Failed to sign in';
				error =
					msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('no user')
						? 'No account with this email. Sign up first, then sign in.'
						: msg;
				return;
			}

			// Success - redirect to the return URL or home page
			if (data) {
				console.log('Sign in successful:', data.user);
				// Redirect to the validated return URL
				goto(redirectUrl);
			}
		} catch (err: unknown) {
			console.error('Sign in error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign in';
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
			<a href={redirectUrl} class="text-blue-500 hover:text-blue-700"
				>Continue to {$page.url.searchParams.get('redirect') ? 'your destination' : 'home'}</a
			>
		</div>
	</div>
{:else}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 pb-6 shadow-md">
			<h2 class="mt-0 mb-6">Sign In</h2>

			{#if error}
				<div class="mb-4 rounded bg-[#fee] px-3 py-3 text-[#c33]">{error}</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSignIn();
				}}
			>
				<input
					type="email"
					placeholder="Email"
					bind:value={email}
					disabled={loading}
					class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
				/>
				<input
					type="password"
					placeholder="Password"
					bind:value={password}
					disabled={loading}
					class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
				/>

				<button
					type="submit"
					disabled={loading}
					class="mb-2 w-full cursor-pointer rounded border-none bg-[#007bff] px-3 py-3 text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
				>
					{loading ? 'Please wait...' : 'Sign In'}
				</button>
			</form>

			<p class="mt-2 text-center text-sm">
				Don't have an account?
				<a
					href="/signup?redirect={encodeURIComponent($page.url.searchParams.get('redirect') || '')}"
					class="text-blue-500 hover:text-blue-700">Sign up here</a
				>
			</p>
		</div>
	</div>
{/if}
