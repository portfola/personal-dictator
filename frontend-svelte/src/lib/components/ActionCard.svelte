<script>
	import { untrack } from 'svelte';
	import { X, Play } from '@lucide/svelte';
	import ModeToggle from './ModeToggle.svelte';

	let { doc, action, loading, result, onClose } = $props();

	let mode = $state('voice');
	let playing = $state(false);
	let blocked = $state(false);

	// `useRef(null)` for a DOM node → a plain `let` + `bind:this` on the element.
	let audioEl;

	function attemptPlay() {
		if (!audioEl || !result?.audio_url) return;
		if (audioEl.src !== result.audio_url) {
			audioEl.src = result.audio_url;
		}
		audioEl
			.play()
			.then(() => {
				playing = true;
				blocked = false;
			})
			.catch((err) => {
				console.warn('Audio playback blocked or failed:', err);
				playing = false;
				blocked = true;
			});
	}

	// React: useEffect(() => { if (result?.audio_url && mode === 'voice') attemptPlay() }, [result])
	//
	// THE GOTCHA: React's dep array `[result]` ran this ONLY when `result` changed.
	// A naive Svelte $effect that reads both `result` and `mode` would ALSO re-fire
	// when you toggle voice/text — double-triggering autoplay. So we read `mode`
	// via untrack(): autoplay reacts to new audio arriving, not to mode toggles
	// (that path lives in handleModeChange). This is the canonical "$effect tracks
	// every read, unlike a dep array" lesson.
	$effect(() => {
		if (result?.audio_url && untrack(() => mode) === 'voice') attemptPlay();
	});

	function handleModeChange(newMode) {
		mode = newMode;
		if (!audioEl) return;
		if (newMode === 'text') {
			audioEl.pause();
			playing = false;
		} else if (result?.audio_url) {
			attemptPlay();
		}
	}

	// `const text = result?... ` computed in render → $derived (memoized).
	let text = $derived(result?.summary || result?.text || '');
</script>

<div class="bg-slate-900 border-t border-slate-700 px-5 py-6">
	<audio
		bind:this={audioEl}
		preload="auto"
		onplay={() => {
			playing = true;
			blocked = false;
		}}
		onpause={() => (playing = false)}
		onended={() => (playing = false)}
		onerror={(e) => {
			console.error('Audio element error:', e.currentTarget.error);
			blocked = true;
			playing = false;
		}}
	></audio>

	<div class="flex items-start justify-between mb-5">
		<h3 class="font-semibold text-white text-base leading-tight">{doc.title}</h3>
		<button onclick={onClose} class="text-slate-500 hover:text-white ml-4 flex-shrink-0">
			<X size={18} />
		</button>
	</div>

	<div class="flex justify-center my-5">
		<ModeToggle {mode} onChange={handleModeChange} active={playing} />
	</div>

	{#if loading}
		<p class="text-slate-400 text-sm text-center animate-pulse">
			{action === 'summarize' ? 'Generating summary…' : 'Preparing audio…'}
		</p>
	{/if}

	{#if !loading && mode === 'voice' && blocked && result?.audio_url}
		<div class="flex flex-col items-center gap-2 mt-2">
			<button
				onclick={attemptPlay}
				class="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium text-white transition-colors"
			>
				<Play size={16} /> Tap to play
			</button>
			<p class="text-xs text-slate-500">Browser blocked autoplay</p>
		</div>
	{/if}

	{#if mode === 'text' && text}
		<p class="mt-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
	{/if}
</div>
