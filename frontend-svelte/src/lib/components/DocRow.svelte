<script>
	import { Headphones, FileText, MessageCircle, Trash2, ChevronDown } from '@lucide/svelte';
	import ActionCard from './ActionCard.svelte';
	import { summarize, readDoc, getDocContent } from '$lib/api.js';
	import { provider } from '$lib/provider.svelte.js';
	import { voice } from '$lib/voice.svelte.js';

	let { doc, onDiscuss, onDelete } = $props();

	let active = $state(null); // 'read' | 'summarize' | null
	let result = $state(null);
	let loading = $state(false);
	let error = $state(null);

	// Expanded document text (lazy-loaded on first expand, then cached).
	let expanded = $state(false);
	let content = $state(null);
	let contentLoading = $state(false);
	let contentError = $state(null);

	async function handleAction(action) {
		if (active === action) {
			active = null;
			return;
		}
		active = action;
		result = null;
		error = null;
		loading = true;
		try {
			result =
				action === 'summarize'
					? await summarize(doc.id, provider.value, voice.value)
					: await readDoc(doc.id, voice.value);
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function toggleExpand() {
		expanded = !expanded;
		if (expanded && content === null && !contentLoading) {
			contentLoading = true;
			contentError = null;
			try {
				const data = await getDocContent(doc.id);
				content = data.content;
			} catch (e) {
				contentError = e.message;
			} finally {
				contentLoading = false;
			}
		}
	}

	// React stored RENDERED JSX in this array (`icon: <Headphones/>`). Svelte stores
	// the component REFERENCE (`Icon: Headphones`) and instantiates it in markup. The
	// capital letter on `Icon` is what tells the compiler "this is a component, not an
	// element" — the idiomatic replacement for dynamic/JSX-in-array.
	const actions = [
		{ key: 'read', Icon: Headphones, label: 'Read' },
		{ key: 'summarize', Icon: FileText, label: 'Summarize' },
		{ key: 'discuss', Icon: MessageCircle, label: 'Discuss' }
	];
</script>

<div class="border border-slate-700 rounded-xl overflow-hidden mb-3">
	<div class="flex items-center justify-between px-4 py-3 bg-slate-800">
		<button
			onclick={toggleExpand}
			aria-expanded={expanded}
			class="flex items-center gap-1.5 min-w-0 mr-4 text-left text-white font-medium text-sm hover:text-sky-300 transition-colors"
		>
			<ChevronDown
				size={15}
				class="flex-shrink-0 transition-transform {expanded ? 'rotate-180' : ''}"
			/>
			<span class="truncate">{doc.title}</span>
		</button>
		<div class="flex gap-4 flex-shrink-0">
			{#each actions as { key, Icon, label } (key)}
				<button
					onclick={() => (key === 'discuss' ? onDiscuss(doc) : handleAction(key))}
					aria-label={label}
					title={label}
					class="transition-colors {active === key
						? 'text-sky-400'
						: 'text-slate-400 hover:text-white'}"
				>
					<Icon size={18} strokeWidth={1.5} />
				</button>
			{/each}
			<button
				onclick={() => onDelete(doc)}
				aria-label="Delete"
				title="Delete"
				class="text-slate-400 hover:text-red-400 transition-colors pl-2 border-l border-slate-700"
			>
				<Trash2 size={18} strokeWidth={1.5} />
			</button>
		</div>
	</div>

	{#if expanded}
		<div class="bg-slate-900 border-t border-slate-700 px-4 py-3">
			{#if contentLoading}
				<p class="text-slate-400 text-sm animate-pulse">Loading…</p>
			{:else if contentError}
				<p class="text-red-400 text-sm">{contentError}</p>
			{:else}
				<pre class="max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-200 font-sans">{content}</pre>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="bg-slate-900 border-t border-slate-700 px-5 py-4">
			<p class="text-red-400 text-sm">{error}</p>
		</div>
	{:else if active && active !== 'discuss'}
		<ActionCard {doc} action={active} {loading} {result} onClose={() => (active = null)} />
	{/if}
</div>
