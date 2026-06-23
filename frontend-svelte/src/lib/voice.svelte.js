// Shared, reactive ElevenLabs voice selection — the same runes-in-module pattern
// as provider.svelte.js. An empty `value` means "use the backend's default voice".

import { browser } from '$app/environment';

const STORAGE_KEY = 'voice_id';

export const voice = $state({
	value: (browser && localStorage.getItem(STORAGE_KEY)) || ''
});

export function setVoice(value) {
	voice.value = value;
	if (browser) {
		if (value) localStorage.setItem(STORAGE_KEY, value);
		else localStorage.removeItem(STORAGE_KEY);
	}
}
