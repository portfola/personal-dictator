<script>
	import { Headphones, FileText, MessageCircle, Trash2 } from '@lucide/svelte';
	import ActionCard from './ActionCard.svelte';
	import { summarize, readDoc } from '$lib/api.js';
	import { provider } from '$lib/provider.svelte.js';

	let { doc, onDiscuss, onDelete } = $props();

	let active = $state(null); // 'read' | 'summarize' | null
	let result = $state(null);
	let loading = $state(false);

	async function handleAction(action) {
		if (active === action) {
			active = null;
			return;
		}
		active = action;
		result = null;
		loading = true;
		const data =
			action === 'summarize' ? await summarize(doc.id, provider.value) : await readDoc(doc.id);
		result = data;
		loading = false;
	}

	// React stored RENDERED JSX in this array (`icon: <Headphones/>`). Svelte stores
	// the component REFERENCE (`Icon: Headphones`) and instantiates it in markup. The
	// capital letter on `Icon` is what tells the compiler "this is a component, not an
	// element" — the idiomatic replacement for dynamic/JSX-in-array.
	const actions = [
		{ key: 'read', Icon: Headphones, label: 'Read aloud' },
		{ key: 'summarize', Icon: FileText, label: 'Summarize' },
		{ key: 'discuss', Icon: MessageCircle, label: 'Discuss' }
	];
</script>

<div class="border border-slate-700 rounded-xl overflow-hidden mb-3">
	<div class="flex items-center justify-between px-4 py-3 bg-slate-800">
		<span class="text-white font-medium truncate mr-4 text-sm">{doc.title}</span>
		<div class="flex gap-4 flex-shrink-0">
			{#each actions as { key, Icon, label } (key)}
				<button
					onclick={() => (key === 'discuss' ? onDiscuss(doc) : handleAction(key))}
					aria-label={label}
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
				class="text-slate-400 hover:text-red-400 transition-colors pl-2 border-l border-slate-700"
			>
				<Trash2 size={18} strokeWidth={1.5} />
			</button>
		</div>
	</div>

	{#if active && active !== 'discuss'}
		<ActionCard {doc} action={active} {loading} {result} onClose={() => (active = null)} />
	{/if}
</div>
