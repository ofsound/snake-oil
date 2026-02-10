// Wrapper so we only mutate .value (exported $state cannot be reassigned from other modules)
export const editFormFooterState = $state({
	value: null as { formId: string; submitting: boolean } | null
});
