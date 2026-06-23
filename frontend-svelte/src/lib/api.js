// Single source of truth for the API shape — a near-mechanical port of the React
// src/api.js. It's framework-agnostic fetch, so almost nothing changes. The one
// removal: getProvider/setProvider moved to provider.svelte.js, because provider
// selection is now *reactive shared state*, not a localStorage helper.

const BASE = '/api';

// Send the session cookie with every request.
const opts = (o = {}) => ({ credentials: 'include', ...o });

const handle = async (r) => {
	if (r.status === 401) {
		window.location.href = `${BASE}/auth/login`;
		throw new Error('Not authenticated');
	}
	if (!r.ok) {
		// Surface backend failures as thrown errors so callers can show them,
		// instead of silently returning an error body shaped like a result.
		const detail = await r.json().catch(() => null);
		throw new Error(detail?.detail || `Request failed (${r.status})`);
	}
	return r.json();
};

export const getMe = () =>
	fetch(`${BASE}/auth/me`, opts()).then((r) => (r.ok ? r.json() : null));

export const login = () => {
	window.location.href = `${BASE}/auth/login`;
};

export const logout = () =>
	fetch(`${BASE}/auth/logout`, opts({ method: 'POST' })).then(() => {
		window.location.reload();
	});

export const getLibrary = () => fetch(`${BASE}/library`, opts()).then(handle);

export const uploadDoc = (file) => {
	const form = new FormData();
	form.append('file', file);
	return fetch(`${BASE}/library/upload`, opts({ method: 'POST', body: form })).then(handle);
};

export const deleteDoc = (id) =>
	fetch(`${BASE}/library/${id}`, opts({ method: 'DELETE' })).then(handle);

export const getDocContent = (id) => fetch(`${BASE}/docs/${id}/content`, opts()).then(handle);

export const getVoices = () => fetch(`${BASE}/voices`, opts()).then(handle);

// `voiceId` is optional — when empty the backend falls back to its default voice.
const voiceParam = (voiceId) => (voiceId ? `&voice_id=${encodeURIComponent(voiceId)}` : '');

export const summarize = (id, provider = 'anthropic', voiceId = '') =>
	fetch(`${BASE}/docs/${id}/summarize?provider=${provider}${voiceParam(voiceId)}`, opts({ method: 'POST' })).then(handle);

export const readDoc = (id, voiceId = '') =>
	fetch(`${BASE}/docs/${id}/read?_=1${voiceParam(voiceId)}`, opts()).then(handle);

export const discuss = (id, body) =>
	fetch(
		`${BASE}/docs/${id}/discuss`,
		opts({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	).then(handle);
