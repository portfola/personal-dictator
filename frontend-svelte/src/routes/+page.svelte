<script>
	import { onMount } from 'svelte';
	import { Upload } from '@lucide/svelte';
	import DocRow from '$lib/components/DocRow.svelte';
	import DiscussModal from '$lib/components/DiscussModal.svelte';
	import ProviderToggle from '$lib/components/ProviderToggle.svelte';
	import { getLibrary, uploadDoc } from '$lib/api.js';

	let docs = $state([]);
	let discussDoc = $state(null);
	let uploading = $state(false);

	// Client fetch (Q3): with ssr=false a route `load` would run client-only anyway,
	// so we fetch here in onMount and hold loading state in runes — the honest SPA
	// pattern, and a near-1:1 of the React `useEffect(() => load(), [])`.
	async function load() {
		docs = await getLibrary();
	}

	onMount(load);

	async function handleUpload(e) {
		// Use e.target (not e.currentTarget): after the await below, a native event's
		// currentTarget is already null, but target stays a live reference to the input.
		const input = e.target;
		const file = input.files[0];
		if (!file) return;
		uploading = true;
		await uploadDoc(file);
		await load();
		uploading = false;
		input.value = '';
	}
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="max-w-2xl mx-auto px-4 py-6">
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-2">
				<img src="/favicon.svg" alt="" class="w-7 h-7" />
				<h1 class="text-xl font-semibold tracking-tight">Personal Dictator</h1>
			</div>
			<div class="flex items-center gap-3">
				<ProviderToggle />
				<label
					class="flex items-center gap-2 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 rounded-lg text-sm font-medium cursor-pointer transition-colors"
				>
					<Upload size={15} />
					Add
					<input type="file" accept=".md,.txt" class="hidden" onchange={handleUpload} />
				</label>
			</div>
		</div>

		{#if uploading}
			<p class="text-slate-400 text-sm mb-4 animate-pulse">Uploading…</p>
		{/if}

		{#if docs.length === 0}
			<p class="text-slate-500 text-sm text-center mt-24">
				No documents yet. Add a .md or .txt file to get started.
			</p>
		{:else}
			{#each docs as doc (doc.id)}
				<DocRow {doc} onDiscuss={(d) => (discussDoc = d)} />
			{/each}
		{/if}
	</div>

	{#if discussDoc}
		<DiscussModal doc={discussDoc} onClose={() => (discussDoc = null)} />
	{/if}
</div>
