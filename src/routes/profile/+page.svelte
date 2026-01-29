<script lang="ts">
	import { useSessionWithInitialData } from '$lib/auth-client';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Get client-side session state (hydrated from server data)
	// svelte-ignore state_referenced_locally
	const session = useSessionWithInitialData({ session: null, user: data.user });

	// User data is available both from server data and client session
	let user = $derived($session.data?.user || data.user);
	let profile = $derived(data.profile);
</script>

{#if user}
	<div class="mx-auto max-w-3xl p-8">
		<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-6 border-b-2 border-gray-200 pb-2 text-2xl text-gray-700">
				Account Information
			</h2>
			<div class="grid gap-4">
				<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
					<span class="font-semibold text-gray-600">Email:</span>
					<span class="font-medium text-gray-800">{user.email}</span>
				</div>

				{#if user.name}
					<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
						<span class="font-semibold text-gray-600">Name:</span>
						<span class="font-medium text-gray-800">{user.name}</span>
					</div>
				{/if}

				{#if profile?.createdAt}
					<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
						<span class="font-semibold text-gray-600">Member since:</span>
						<span class="font-medium text-gray-800"
							>{new Date(profile.createdAt).toLocaleDateString()}</span
						>
					</div>
				{/if}

				{#if profile?.emailVerified}
					<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
						<span class="font-semibold text-gray-600">Email verified:</span>
						<span class="font-semibold text-green-600">✓ Verified</span>
					</div>
				{:else}
					<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
						<span class="font-semibold text-gray-600">Email verified:</span>
						<span class="font-semibold text-red-600">✗ Not verified</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-6 border-b-2 border-gray-200 pb-2 text-2xl text-gray-700">Account Actions</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<button
					class="cursor-pointer rounded-md border-none bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
					>Update Profile</button
				>
				<button
					class="cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-6 py-3 font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-200"
					>Change Password</button
				>
				<button
					class="cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-6 py-3 font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-200"
					>View Activity</button
				>
				<button
					class="cursor-pointer rounded-md border-none bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
					>Delete Account</button
				>
			</div>
		</div>
	</div>
{/if}
