<script lang="ts">
	import { authClient } from '$lib/auth-client';

	const sessionStore = authClient.useSession();
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let isSignUp = $state(false);
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

	async function handleSignOut() {
		loading = true;
		try {
			await authClient.signOut();
		} catch (err: unknown) {
			console.error('Sign out error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign out';
		} finally {
			loading = false;
		}
	}
</script>

{#if session}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md">
			<h2 class="mt-0 mb-6">Welcome back!</h2>
			<p>Email: {session.user?.email}</p>
			{#if session.user?.name}
				<p>Name: {session.user.name}</p>
			{/if}
			<button
				onclick={handleSignOut}
				disabled={loading}
				class="mb-2 w-full cursor-pointer rounded border-none bg-[#007bff] px-3 py-3 text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Signing out...' : 'Sign Out'}
			</button>
		</div>
	</div>
{:else}
	<div class="flex min-h-[50vh] items-center justify-center p-8">
		<div class="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md">
			<h2 class="mt-0 mb-6">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>

			{#if error}
				<div class="mb-4 rounded bg-[#fee] px-3 py-3 text-[#c33]">{error}</div>
			{/if}

			<div
				class="mb-4 rounded border border-[#bae6fd] bg-[#f0f9ff] px-3 py-3 text-sm text-[#0c4a6e]"
			>
				<p class="my-1">
					<strong>Debug:</strong> Check browser DevTools → Application → Cookies to see if auth cookies
					are set after sign-in.
				</p>
				<p class="my-1">
					Check the browser console for detailed logs of sign-in and session responses.
				</p>
			</div>

			{#if isSignUp}
				<input
					type="text"
					placeholder="Name"
					bind:value={name}
					disabled={loading}
					class="mb-4 box-border w-full rounded border border-gray-300 px-3 py-3 text-base"
				/>
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
				onclick={isSignUp ? handleSignUp : handleSignIn}
				disabled={loading}
				class="mb-2 w-full cursor-pointer rounded border-none bg-[#007bff] px-3 py-3 text-base text-white hover:bg-[#0056b3] disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
			</button>

			<button
				type="button"
				onclick={() => {
					isSignUp = !isSignUp;
					error = null;
				}}
				class="mb-2 w-full cursor-pointer rounded border-none bg-transparent p-2 text-base text-[#007bff] underline hover:bg-transparent hover:no-underline"
			>
				{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
			</button>
		</div>
	</div>
{/if}
