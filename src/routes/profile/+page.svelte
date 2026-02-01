<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Server load already validates authentication, just use the data directly
	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let quizzes = $derived(data.quizzes ?? []);
</script>

{#if user}
	<div class="mx-auto max-w-3xl p-8">
		<div class="mb-4 flex border border-gray-100 bg-neutral-100 p-6">
			<div class="mb-8 flex-1 rounded-lg bg-white">
				<div class="grid gap-4">
					<div class="flex items-center gap-2 rounded-md bg-gray-50 p-1">
						<span class="font-semibold text-gray-600">Email:</span>
						<span class="font-medium text-gray-800">{user.email}</span>
					</div>

					{#if user.name}
						<div class="items-centergap-2 flex rounded-md bg-gray-50 p-1">
							<span class="font-semibold text-gray-600">Name:</span>
							<span class="font-medium text-gray-800">{user.name}</span>
						</div>
					{/if}

					{#if profile?.slug}
						<div class="flex items-center gap-2 rounded-md bg-gray-50 p-1">
							<span class="font-semibold text-gray-600">Public Profile:</span>
							<a href="/users/{profile.slug}" class="font-medium text-blue-600 hover:underline"
								>@{profile.slug}</a
							>
						</div>
					{/if}

					{#if profile?.createdAt}
						<div class="items-centergap-2 flex rounded-md bg-gray-50 p-1">
							<span class="font-semibold text-gray-600">Account created:</span>
							<span class="font-medium text-gray-800"
								>{new Date(profile.createdAt).toLocaleDateString()}</span
							>
						</div>
					{/if}
				</div>
			</div>

			<div class="flex flex-col gap-4 text-xs">
				<button
					class="cursor-pointer rounded-md border-none bg-blue-500 px-3 py-2 font-semibold text-white transition-colors hover:bg-blue-600"
					>Update Profile</button
				>
				<button
					class="cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-200"
					>Change Password</button
				>
				<button
					class="cursor-pointer rounded-md border border-gray-300 bg-gray-100 px-3 py-2 font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-200"
					>View Activity</button
				>
				<button
					class="cursor-pointer rounded-md border-none bg-red-600 px-3 py-2 font-semibold text-white transition-colors hover:bg-red-700"
					>Delete Account</button
				>
			</div>
		</div>

		<div class="mb-8 rounded-sm border border-gray-200 bg-white p-6">
			<h2 class="mb-6 border-b border-gray-200 pb-2 text-2xl text-gray-700">My Quizzes</h2>
			{#if quizzes.length > 0}
				<div class="flex flex-col gap-3">
					{#each quizzes as quiz (quiz.id)}
						<a
							href="/quizzes/{quiz.id}"
							class="flex items-center justify-between rounded-md border-none bg-gray-50 px-3 py-2 text-white transition-colors hover:bg-gray-100"
						>
							<div class="flex flex-col">
								<h3 class="font-semibold text-gray-800">{quiz.title}</h3>
								<div class="text-sm text-gray-600">{quiz.description}</div>
							</div>
							<div class="text-xs text-gray-500">
								{new Date(quiz.createdAt).toLocaleDateString()}
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<div class="rounded-md bg-gray-50 p-8 text-center">
					<p class="mb-4 text-gray-600">You haven't created any quizzes yet.</p>
					<a
						href="/create"
						class="inline-block rounded-md border-none bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
						>Create Your First Quiz</a
					>
				</div>
			{/if}
		</div>
	</div>
{/if}
