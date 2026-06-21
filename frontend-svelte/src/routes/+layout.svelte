<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { auth, checkAuth } from '$lib/auth.svelte.js';
	import { login } from '$lib/api.js';

	let { children } = $props();

	// Register the service worker. The React app's vite-plugin-pwa auto-injected
	// this into index.html; @vite-pwa/sveltekit leaves registration to us because
	// SvelteKit (not the plugin) owns HTML generation under adapter-static. With
	// registerType:'autoUpdate' there's no refresh UI to build — we just register
	// and let new deploys take over on next load. (`immediate` registers right away
	// rather than waiting for the page 'load' event.)
	useRegisterSW({ immediate: true });

	// React: App.jsx did this auth check in a useEffect and conditionally rendered
	// <Library/>. In SvelteKit the root +layout.svelte is the natural gate — it wraps
	// every route, so checking here protects the whole app. The page ({@render
	// children()}) only mounts once auth.status === 'in'.
	//
	// Alternative (flagged in DECISIONS.md Q9): a route group `(app)/` with a
	// +layout.js load() that redirects. Overkill for one page + no separate /login
	// route; the in-layout conditional is simpler and matches App.jsx 1:1.
	onMount(checkAuth);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Personal Dictator</title>
</svelte:head>

{#if auth.status === 'loading'}
	<div class="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
{:else if auth.status === 'out'}
	<div class="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
		<div class="flex items-center gap-3">
			<img src={favicon} alt="" class="w-10 h-10" />
			<h1 class="text-2xl font-semibold text-gray-800">Personal Dictator</h1>
		</div>
		<button
			onclick={login}
			class="px-5 py-2.5 rounded-lg bg-gray-900 text-white font-medium shadow hover:bg-gray-700 transition"
		>
			Sign in with Google
		</button>
	</div>
{:else}
	{@render children()}
{/if}
