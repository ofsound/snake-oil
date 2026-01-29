<script lang="ts">
	import { authClient } from '$lib/auth-client';

	const sessionStore = authClient.useSession();

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	const session = $derived($sessionStore.data);

	async function handleSignUp() {
		loading = true;
		error = null;
		try {
			const result = await authClient.signUp.email({
				email,
				password,
				name
			});

			console.log('Sign up result:', result);

			// Check if result is an error type
			if ('error' in result && result.error) {
				error = result.error.message || 'Failed to sign up';
				return;
			}

			// Check if result has data property (Data type)
			if ('data' in result && result.data) {
				console.log('Sign up successful');
				email = '';
				password = '';
				name = '';
				return;
			}

			// Check if result has user property (success type)
			if ('user' in result && result.user) {
				console.log('Sign up successful');
				email = '';
				password = '';
				name = '';
			} else {
				error = 'Sign up failed - no data returned';
			}
		} catch (err: unknown) {
			console.error('Sign up error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign up';
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
			<h2 class="mt-0 mb-6">Sign Up</h2>

			{#if error}
				<div class="mb-4 rounded bg-[#fee] px-3 py-3 text-[#c33]">{error}</div>
			{/if}

			<input
				type="text"
				placeholder="Name"
				bind:value={name}
				disabled={loading}
				class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
			/>
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
				onclick={handleSignUp}
				disabled={loading}
				class="mb-2 w-full cursor-pointer rounded border-none bg-[#007bff] px-3 py-3 text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Please wait...' : 'Sign Up'}
			</button>

			<p class="text-center text-sm">
				Already have an account?
				<a href="/login" class="text-blue-500 hover:text-blue-700">Sign in here</a>
			</p>
		</div>
	</div>
{/if}
