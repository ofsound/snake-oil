<script lang="ts">
	import { authClient } from '$lib/auth-client';

	const sessionStore = authClient.useSession();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	const session = $derived($sessionStore.data);

	async function handleSignIn() {
		loading = true;
		error = null;
		try {
			const result = await authClient.signIn.email({
				email,
				password
			});

			console.log('Sign in result:', result);

			// Check if result is an error type
			if ('error' in result && result.error) {
				const msg = result.error.message || 'Failed to sign in';
				error =
					msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('no user')
						? 'No account with this email. Sign up first, then sign in.'
						: msg;
				return;
			}

			// Check if result has data property (Data type)
			if ('data' in result && result.data) {
				console.log('Sign in successful');
				email = '';
				password = '';
				return;
			}

			// Check if result has user property (success type)
			if ('user' in result && result.user) {
				console.log('Sign in successful');
				email = '';
				password = '';
			} else {
				error = 'Sign in failed - no data returned';
			}
		} catch (err: unknown) {
			console.error('Sign in error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign in';
		} finally {
			loading = false;
		}
	}
</script>

{#if session}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md">
			<h2 class="mt-0 mb-6">You're already signed in!</h2>
			<p>Welcome back, {session.user?.name || session.user?.email}!</p>
			<a href="/" class="text-blue-500 hover:text-blue-700">Return to home</a>
		</div>
	</div>
{:else}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md">
			<h2 class="mt-0 mb-6">Sign In</h2>

			{#if error}
				<div class="mb-4 rounded bg-[#fee] px-3 py-3 text-[#c33]">{error}</div>
			{/if}

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
				onclick={handleSignIn}
				disabled={loading}
				class="mb-2 w-full cursor-pointer rounded border-none bg-[#007bff] px-3 py-3 text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Please wait...' : 'Sign In'}
			</button>

			<p class="text-center text-sm">
				Don't have an account?
				<a href="/signup" class="text-blue-500 hover:text-blue-700">Sign up here</a>
			</p>
		</div>
	</div>
{/if}
