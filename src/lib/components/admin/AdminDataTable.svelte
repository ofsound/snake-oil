<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '../Button.svelte';
	import PageContainer from '../PageContainer.svelte';
	import Pagination from '../Pagination.svelte';
	import Icon from '../Icon.svelte';

	interface FilterOption {
		value: string;
		label: string;
	}

	interface FilterConfig {
		id: string;
		label: string;
		type: 'text' | 'select' | 'checkbox';
		placeholder?: string;
		options?: FilterOption[];
		dynamicOptions?: string; // Key in data for dynamic options (e.g., 'quizzes', 'filterOptions.actions')
		checkboxLabel?: string;
	}

	interface Props {
		title: string;
		description: string;
		basePath: string;
		itemName: string;
		filters: FilterConfig[];
		data: {
			items: any[];
			currentPage: number;
			totalPages: number;
			totalItems: number;
			itemsPerPage: number;
			filters: Record<string, string | boolean>;
			[key: string]: any; // For dynamic data like quizzes, filterOptions
		};
		emptyMessage: string;
		headers: string[];
	}

	let { title, description, basePath, itemName, filters, data, emptyMessage, headers }: Props =
		$props();

	function updateSearch(form: HTMLFormElement) {
		const formData = new FormData(form);
		const params = new SvelteURLSearchParams();

		for (const filter of filters) {
			if (filter.type === 'checkbox') {
				const value = formData.get(filter.id);
				if (value === 'on') {
					params.set(filter.id, 'true');
				}
			} else {
				const value = formData.get(filter.id)?.toString();
				if (value && value !== 'all') {
					params.set(filter.id, value);
				}
			}
		}

		window.location.href = `${basePath}?${params.toString()}`;
	}

	function getDynamicOptions(filter: FilterConfig): FilterOption[] {
		if (!filter.dynamicOptions) return filter.options ?? [];

		const keys = filter.dynamicOptions.split('.');
		let value: any = data;
		for (const key of keys) {
			value = value?.[key];
			if (value === undefined) return [];
		}

		// Handle array of strings or array of objects
		if (Array.isArray(value)) {
			return value.map((item) => {
				if (typeof item === 'string') {
					return { value: item, label: item };
				}
				// Assume object with id/title or value/label
				return {
					value: item.id ?? item.value ?? item,
					label: item.title ?? item.label ?? item.name ?? item
				};
			});
		}

		return filter.options ?? [];
	}

	export { formatDistanceToNow };
</script>

<PageContainer>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-admin-text-primary">{title}</h1>
				<p class="mt-1 text-sm text-admin-text-muted">{description}</p>
			</div>
			<slot name="actions" />
		</div>

		<!-- Filters -->
		{#if filters.length > 0}
			<div class="rounded-lg bg-admin-surface-elevated p-4 shadow">
				<form
					class="flex flex-wrap items-end gap-4"
					onsubmit={(e: SubmitEvent) => {
						e.preventDefault();
						updateSearch(e.currentTarget as HTMLFormElement);
					}}
				>
					{#each filters as filter (filter.id)}
						{#if filter.type === 'text'}
							<div class="min-w-[200px] flex-1">
								<label
									for="filter-{filter.id}"
									class="mb-1 block text-sm font-medium text-admin-text-primary"
									>{filter.label}</label
								>
								<input
									id="filter-{filter.id}"
									type="text"
									name={filter.id}
									value={(data.filters[filter.id] as string) ?? ''}
									placeholder={filter.placeholder}
									class="w-full rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
								/>
							</div>
						{:else if filter.type === 'select'}
							<div>
								<label
									for="filter-{filter.id}"
									class="mb-1 block text-sm font-medium text-admin-text-primary"
									>{filter.label}</label
								>
								<select
									id="filter-{filter.id}"
									name={filter.id}
									class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
								>
									{#each getDynamicOptions(filter) as option (option.value)}
										<option
											value={option.value}
											selected={data.filters[filter.id] === option.value}
										>
											{option.label}
										</option>
									{/each}
								</select>
							</div>
						{:else if filter.type === 'checkbox'}
							<div class="flex items-center">
								<label class="flex items-center">
									<input
										type="checkbox"
										name={filter.id}
										checked={data.filters[filter.id] === true || data.filters[filter.id] === 'true'}
										class="rounded border-admin-border text-admin-accent-violet-text focus:ring-admin-accent-violet-border"
									/>
									<span class="ml-2 text-sm text-admin-text-primary">
										{filter.checkboxLabel ?? filter.label}
									</span>
								</label>
							</div>
						{/if}
					{/each}
					<Button type="submit" variant="admin" size="sm">Filter</Button>
				</form>
			</div>
		{/if}

		<!-- Above-table content slot -->
		<slot name="above-table" />

		<!-- Content Table -->
		<div class="overflow-hidden rounded-lg bg-admin-surface-elevated shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-admin-border">
					<thead class="bg-admin-surface-muted">
						<tr>
							{#each headers as header (header)}
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
									>{header}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-admin-border bg-admin-surface-elevated">
						{#if data.items.length === 0}
							<tr>
								<td
									colspan={headers.length}
									class="px-6 py-8 text-center text-sm text-admin-text-muted"
								>
									{emptyMessage}
								</td>
							</tr>
						{:else}
							<slot />
						{/if}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={data.currentPage}
				totalPages={data.totalPages}
				totalItems={data.totalItems}
				itemsPerPage={data.itemsPerPage}
				mode="simple"
				navigation="ssr"
				variant="admin"
				{basePath}
				{itemName}
			/>
		</div>
	</div>
</PageContainer>
