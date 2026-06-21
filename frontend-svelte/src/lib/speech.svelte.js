// `useSpeechInput` hook → `createSpeechInput` rune factory.
//
// THE KEY DIFFERENCE from a React custom hook: a hook re-runs every render, so
// returning a plain `listening` boolean is naturally fresh. A Svelte factory runs
// ONCE. To hand the caller a value that stays reactive, we back it with `$state`
// and expose it through a GETTER. Reading `speech.listening` in a template then
// tracks changes; a plain returned boolean would be frozen at call time.
//
// COROLLARY (and a real gotcha): the caller must NOT destructure `listening`.
// `const { listening } = createSpeechInput(...)` calls the getter once and copies
// a dead value. Keep the object whole and read `speech.listening`. (`start`/`stop`
// are plain functions, so destructuring those is fine — but we keep it uniform.)
//
// `onResult` needs no useCallback wrapper: the component script runs once, so the
// callback is already stable. useCallback has no analog here.

export function createSpeechInput(onResult) {
	let listening = $state(false);
	let recognition = null;

	function start() {
		const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SR) return;
		const r = new SR();
		r.lang = 'en-US';
		r.interimResults = false;
		r.onresult = (e) => onResult(e.results[0][0].transcript);
		r.onend = () => (listening = false);
		r.onerror = () => (listening = false);
		r.start();
		recognition = r;
		listening = true;
	}

	function stop() {
		recognition?.stop();
		listening = false;
	}

	return {
		get listening() {
			return listening;
		},
		start,
		stop
	};
}
