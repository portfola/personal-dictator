// Shared, reactive AI-provider selection (Claude vs Together).
//
// THIS IS THE RUNES-IN-MODULE PATTERN — the Svelte 5 replacement for React
// Context. In React this lived two ways at once: a localStorage helper
// (getProvider/setProvider) *and* per-component useState(getProvider()), which
// meant two ProviderToggles could drift out of sync. Here there is one piece of
// state. Import `provider`, read `provider.value`, and every component that reads
// it updates automatically — no <Context.Provider>, no useContext, no prop
// drilling.
//
// Why `.svelte.js` (not `.js`): the `$state` rune only compiles in files with the
// `.svelte.js`/`.svelte.ts` extension.
//
// Why export an *object* and mutate `.value` (instead of `export let provider`):
// a reassigned top-level primitive export wouldn't be seen as reactive by
// importers. Exporting a stable object and mutating its property is the idiom.

import { browser } from '$app/environment';

const STORAGE_KEY = 'ai_provider';

export const provider = $state({
	// `browser` is always true for us (ssr = false), but guarding is good hygiene
	// and documents the assumption.
	value: (browser && localStorage.getItem(STORAGE_KEY)) || 'anthropic'
});

export function setProvider(value) {
	provider.value = value;
	if (browser) localStorage.setItem(STORAGE_KEY, value);
}

// Note: an alternative is a `$effect` that auto-persists on change, but $effect
// needs a component or $effect.root() to own it. An explicit write on set is
// simpler here and keeps persistence colocated with the mutation.
