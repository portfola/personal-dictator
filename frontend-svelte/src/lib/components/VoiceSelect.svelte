<script>
	import { onMount } from 'svelte';
	import { getVoices } from '$lib/api.js';
	import { voice, setVoice } from '$lib/voice.svelte.js';

	let voices = $state([]);

	onMount(async () => {
		try {
			voices = await getVoices();
		} catch {
			// Non-fatal: without the list the dropdown just shows "Default voice".
			voices = [];
		}
	});
</script>

<select
	aria-label="Voice"
	value={voice.value}
	onchange={(e) => setVoice(e.currentTarget.value)}
	class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-300 outline-none"
>
	<option value="">Default voice</option>
	{#each voices as v (v.id)}
		<option value={v.id}>{v.name}</option>
	{/each}
</select>
