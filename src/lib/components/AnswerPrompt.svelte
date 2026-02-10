<script lang="ts">
	type Props = {
		text?: string;
	};

	let { text = 'Your answer:' }: Props = $props();
</script>

<div class="text-sm text-text-muted">{text}</div>
