<script>
	import { PenLine } from '@lucide/svelte';
	import { scale } from 'svelte/transition';

	// Callback prop (`onChange`) — Svelte 5 prefers callback props over the old
	// createEventDispatcher, so this reads identically to the React prop.
	let { mode, onChange, active = false } = $props();

	const rings = [0, 1, 2];
</script>

<!--
  Q6 in action: framer-motion is GONE, replaced by zero-dep compiled built-ins.

  - The pen <-> soundwave crossfade was <AnimatePresence> + <motion.div>. Here a
    plain {#if}/{:else} drives `transition:scale` — Svelte plays the out/in
    animations on mount/unmount automatically. The wrapper is position:relative so
    the two states overlap (absolute inset-0) during the crossfade without a
    layout jump.

  - The pulsing rings were three <motion.span>s with animate/repeat. Here they're
    CSS @keyframes in the scoped <style> below, toggled by `class:active`. Each
    ring gets its stagger (animation-delay) and grow target (--target-scale) via
    inline style — the exact values from the React version (2 + i*0.4).
-->
<button
	onclick={() => onChange(mode === 'voice' ? 'text' : 'voice')}
	class="flex flex-col items-center gap-1 focus:outline-none"
	aria-label={mode === 'voice' ? 'Switch to text mode' : 'Switch to voice mode'}
>
	<div class="relative w-16 h-16">
		{#if mode === 'voice'}
			<div
				transition:scale={{ duration: 200, start: 0.8 }}
				class="absolute inset-0 flex items-center justify-center"
			>
				{#each rings as i (i)}
					<span
						class="ring absolute rounded-full border border-sky-400"
						class:active
						style="--target-scale: {2 + i * 0.4}; animation-delay: {i * 0.4}s;"
					></span>
				{/each}
				<span class="w-4 h-4 rounded-full bg-sky-400 z-10 block"></span>
			</div>
		{:else}
			<div
				transition:scale={{ duration: 200, start: 0.8 }}
				class="absolute inset-0 flex items-center justify-center text-slate-300"
			>
				<PenLine size={32} strokeWidth={1.5} />
			</div>
		{/if}
	</div>

	<span class="text-xs text-slate-400 select-none">
		{mode === 'voice' ? 'Speaking' : 'Reading'}
	</span>
</button>

<style>
	.ring {
		width: 20px;
		height: 20px;
		opacity: 0.15;
		transform: scale(1);
	}
	.ring.active {
		animation: pulse 1.8s ease-out infinite;
	}
	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(var(--target-scale));
			opacity: 0;
		}
	}
</style>
