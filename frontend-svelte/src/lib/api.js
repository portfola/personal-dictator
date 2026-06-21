// Single source of truth for the API shape — a near-mechanical port of the React
// src/api.js. It's framework-agnostic fetch, so almost nothing changes. The one
// removal: getProvider/setProvider moved to provider.svelte.js, because provider
// selection is now *reactive shared state*, not a localStorage helper.

const BASE = '/api';

// Send the session cookie with every request.
const opts = (o = {}) => ({ credentials: 'include', ...o });

const handle = (r) => {
	if (r.status === 401) {
		window.location.href = `${BASE}/auth/login`;
		throw new Error('Not authenticated');
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

export const summarize = (id, provider = 'anthropic') =>
	fetch(`${BASE}/docs/${id}/summarize?provider=${provider}`, opts({ method: 'POST' })).then(handle);

export const readDoc = (id) => fetch(`${BASE}/docs/${id}/read`, opts()).then(handle);

export const discuss = (id, body) =>
	fetch(
		`${BASE}/docs/${id}/discuss`,
		opts({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	).then(handle);
