// SPA mode. Render entirely on the client: there is no server runtime, and every
// view depends on the session cookie + live API calls, so SSR/prerender buy us
// nothing. adapter-static emits the index.html fallback shell; `ssr = false` makes
// that shell hydrate and then fetch.
//
// React equivalent: there was no server at all (Vite SPA). This file just makes
// that choice explicit and turns off the SvelteKit defaults that assume a server.
export const ssr = false;
export const prerender = false;
