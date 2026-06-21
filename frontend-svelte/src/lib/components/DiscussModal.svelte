<script>
	import { onMount } from 'svelte';
	import { X, Send } from '@lucide/svelte';
	import ModeToggle from './ModeToggle.svelte';
	import { createSpeechInput } from '$lib/speech.svelte.js';
	import { discuss } from '$lib/api.js';
	import { provider } from '$lib/provider.svelte.js';

	let { doc, onClose } = $props();

	let mode = $state('voice');
	let messages = $state([]);
	let input = $state('');
	let loading = $state(false);
	let playing = $state(false);

	// `useRef(uuidv4())` → a plain `const`. The script runs once, so a const is
	// already "stable for the component's lifetime" — that's all useRef bought us.
	// Bonus: `crypto.randomUUID()` is built in, so the `uuid` dependency is GONE.
	const sessionId = crypto.randomUUID();

	let audioEl;
	let bottomEl;

	// Keep the whole object — destructuring `listening` would freeze it (see
	// speech.svelte.js). `provider.value` replaces the old getProvider() call.
	const speech = createSpeechInput((transcript) => sendMessage(transcript, 'voice'));

	async function sendMessage(text, currentMode) {
		if (!text.trim() || loading) return;
		input = '';
		// React needed setMessages(prev => [...prev, x]) to dodge a stale closure.
		// Svelte reads live $state, so `messages = [...messages, x]` is correct even
		// after the await below — no functional-updater dance.
		messages = [...messages, { role: 'user', content: text, mode: currentMode }];
		loading = true;

		const data = await discuss(doc.id, {
			message: text,
			session_id: sessionId,
			mode: currentMode,
			provider: provider.value
		});

		messages = [...messages, { role: 'assistant', content: data.reply, mode: currentMode }];
		loading = false;

		if (currentMode === 'voice' && data.audio_url && audioEl) {
			audioEl.src = data.audio_url;
			audioEl
				.play()
				.then(() => (playing = true))
				.catch(() => {});
		}
	}

	// useEffect(..., []) one-shot imperative setup → onMount reads clearer than a
	// guarded $effect. Auto-start the mic when opening in voice mode.
	onMount(() => {
		if (mode === 'voice') speech.start();
	});

	// useEffect(..., [messages]) → $effect that reads `messages`. Runs AFTER the DOM
	// updates, so the new bubble is already laid out when we scroll to it.
	$effect(() => {
		messages.length;
		bottomEl?.scrollIntoView({ behavior: 'smooth' });
	});

	function handleAudioEnd() {
		playing = false;
		if (mode === 'voice') speech.start();
	}

	function handleModeChange(newMode) {
		mode = newMode;
		if (newMode === 'voice') speech.start();
		else speech.stop();
	}
</script>

<div class="fixed inset-0 bg-slate-950/95 z-50 flex flex-col">
	<audio bind:this={audioEl} onended={handleAudioEnd}></audio>

	<!-- Header -->
	<div class="flex items-center justify-between px-5 py-4 border-b border-slate-700">
		<h2 class="font-semibold text-white truncate pr-4">{doc.title}</h2>
		<button onclick={onClose} class="text-slate-400 hover:text-white flex-shrink-0">
			<X size={20} />
		</button>
	</div>

	<!-- Mode toggle -->
	<div class="flex justify-center pt-8 pb-4">
		<ModeToggle {mode} onChange={handleModeChange} active={speech.listening || playing} />
	</div>

	<!-- Prompt hint -->
	{#if messages.length === 0}
		<p class="text-center text-slate-400 text-sm px-8 pb-4">
			{mode === 'voice'
				? 'Ask a question about this document'
				: 'Type a question about this document'}
		</p>
	{/if}

	<!-- Conversation -->
	<div class="flex-1 overflow-y-auto px-4 py-2 space-y-3">
		{#each messages as m, i (i)}
			<div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
				<div
					class="max-w-xs md:max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed {m.role ===
					'user'
						? 'bg-sky-700 text-white'
						: 'bg-slate-700 text-slate-100'}"
				>
					{m.content}
				</div>
			</div>
		{/each}
		{#if loading}
			<div class="flex justify-start">
				<div class="bg-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-400 animate-pulse">
					Thinking…
				</div>
			</div>
		{/if}
		<div bind:this={bottomEl}></div>
	</div>

	<!-- Text input — shown in text mode only -->
	{#if mode === 'text'}
		<div class="px-4 py-4 border-t border-slate-700 flex gap-2">
			<input
				bind:value={input}
				onkeydown={(e) => e.key === 'Enter' && sendMessage(input, 'text')}
				placeholder="Type a question…"
				class="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-slate-500"
			/>
			<button
				onclick={() => sendMessage(input, 'text')}
				class="bg-sky-700 text-white px-4 rounded-xl hover:bg-sky-600 transition"
			>
				<Send size={18} />
			</button>
		</div>
	{/if}
</div>
