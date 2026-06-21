<script>
	import { provider, setProvider } from '$lib/provider.svelte.js';

	const OPTIONS = [
		{ id: 'anthropic', label: 'Claude' },
		{ id: 'together', label: 'Together' }
	];
</script>

<!--
  React kept a LOCAL copy: `const [provider, setLocal] = useState(getProvider())`.
  That copy could drift from another ProviderToggle's copy. Here the component
  holds NO state of its own — it reads the shared `provider.value` rune directly
  and writes through `setProvider`. Mount two of these and they stay in lockstep
  for free. This is the concrete payoff of the runes-in-module decision (Q4).

  Note the lowercase `onclick` (Svelte 5 treats handlers as plain props/attrs,
  not the old `on:click` directive), and the class string interpolates a Svelte
  expression `{...}` exactly where React used a `${...}` template literal.
-->
<div
	role="radiogroup"
	aria-label="AI provider"
	class="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-xs"
>
	{#each OPTIONS as { id, label } (id)}
		<button
			role="radio"
			aria-checked={provider.value === id}
			onclick={() => setProvider(id)}
			class="px-3 py-1 rounded-md font-medium transition-colors {provider.value === id
				? 'bg-sky-600 text-white shadow'
				: 'text-slate-400 hover:text-white'}"
		>
			{label}
		</button>
	{/each}
</div>
