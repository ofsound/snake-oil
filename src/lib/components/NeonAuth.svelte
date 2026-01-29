<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { onMount } from 'svelte';

	const sessionStore = authClient.useSession();
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let isSignUp = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const session = $derived($sessionStore.data);

	onMount(async () => {
		// Session is automatically tracked by useSession hook
	});

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
	<div class="auth-container">
		<div class="auth-card">
			<h2>Welcome back!</h2>
			<p>Email: {session.user?.email}</p>
			{#if session.user?.name}
				<p>Name: {session.user.name}</p>
			{/if}
			<button onclick={handleSignOut} disabled={loading}>
				{loading ? 'Signing out...' : 'Sign Out'}
			</button>
		</div>
	</div>
{:else}
	<div class="auth-container">
		<div class="auth-card">
			<h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			<div class="debug-info">
				<p>
					<strong>Debug:</strong> Check browser DevTools → Application → Cookies to see if auth cookies
					are set after sign-in.
				</p>
				<p>Check the browser console for detailed logs of sign-in and session responses.</p>
			</div>

			{#if isSignUp}
				<input type="text" placeholder="Name" bind:value={name} disabled={loading} />
			{/if}

			<input type="email" placeholder="Email" bind:value={email} disabled={loading} />
			<input type="password" placeholder="Password" bind:value={password} disabled={loading} />

			<button onclick={isSignUp ? handleSignUp : handleSignIn} disabled={loading}>
				{loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
			</button>

			<button
				type="button"
				onclick={() => {
					isSignUp = !isSignUp;
					error = null;
				}}
				class="toggle"
			>
				{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
			</button>
		</div>
	</div>
{/if}

<style>
	.auth-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 50vh;
		padding: 2rem;
	}

	.auth-card {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}

	.auth-card h2 {
		margin-top: 0;
		margin-bottom: 1.5rem;
	}

	.auth-card input {
		width: 100%;
		padding: 0.75rem;
		margin-bottom: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.auth-card button {
		width: 100%;
		padding: 0.75rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		margin-bottom: 0.5rem;
	}

	.auth-card button:hover:not(:disabled) {
		background: #0056b3;
	}

	.auth-card button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auth-card button.toggle {
		background: transparent;
		color: #007bff;
		text-decoration: underline;
		padding: 0.5rem;
	}

	.auth-card button.toggle:hover {
		background: transparent;
		text-decoration: none;
	}

	.error {
		background: #fee;
		color: #c33;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.debug-info {
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		color: #0c4a6e;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.debug-info p {
		margin: 0.25rem 0;
	}
</style>
