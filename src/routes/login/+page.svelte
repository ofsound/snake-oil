<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import AuthForm from '$lib/components/AuthForm.svelte';
	import AuthFormInput from '$lib/components/AuthFormInput.svelte';

	import { authClient } from '$lib/auth-client';
	import { validateRedirectUrl } from '$lib/utils';
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Get and validate the redirect URL from query parameters
	const redirectUrl = $derived(validateRedirectUrl(page.url.searchParams.get('redirect')));

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
				// Redirect to the validated return URL and refresh session data
				goto(redirectUrl, { invalidateAll: true });
			}
		} catch (err: unknown) {
			console.error('Sign in error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign in';
		} finally {
			loading = false;
		}
	}
</script>

<AuthForm
	title="Sign In"
	{loading}
	{error}
	onsubmit={(e) => {
		e.preventDefault();
		handleSignIn();
	}}
>
	{#snippet children()}
		<AuthFormInput type="email" placeholder="Email" bind:value={email} disabled={loading} />
		<AuthFormInput
			type="password"
			placeholder="Password"
			bind:value={password}
			disabled={loading}
		/>
	{/snippet}

	{#snippet footer()}
		<p>
			Don't have an account?
			<a href="/signup?redirect={encodeURIComponent(page.url.searchParams.get('redirect') || '')}">
				Sign up here
			</a>
		</p>
	{/snippet}
</AuthForm>
