# DECISIONS.md — Questions for Mike

Forks where reasonable engineers disagree. Each has options, tradeoffs, and my
recommendation. These are conversation starters, not settled law — push back.

Status key: ✅ decided · 🔵 recommended, open · ⚪ deferred

---

## Q1 — SvelteKit vs. plain Svelte + Vite ✅ (you chose SvelteKit)

**Options**
- **SvelteKit** — file-based routing, conventions, easy adapter swap, room to grow
  (real routes, `load`, server endpoints if the app ever needs them).
- **Plain Svelte + Vite** — closest 1:1 to the current React SPA (one mount, your
  own routing). Less to learn, less structure.

**Tradeoff.** The app today has *one* route and a hand-rolled auth gate, so plain
Svelte would be a smaller conceptual jump. But SvelteKit's conventions are where
the ecosystem's docs, examples, and your future self will live, and adapter-static
makes it deploy identically to a plain SPA.

**Recommendation: SvelteKit.** You're doing this to learn idiomatic Svelte, and
SvelteKit *is* the idiom. **Decided.**

---

## Q2 — adapter-static (SPA) vs. SPA-fallback vs. SSR ✅ (locked: adapter-static SPA)

**Options**
- **adapter-static, SPA mode** (`fallback: 'index.html'`, `ssr=false`) — one static
  shell, hydrate, fetch. *Chosen in the scaffold; the scaffold's default `200.html`
  was switched to `index.html` to match CloudFront — see MIGRATION.md §6.*
- **adapter-static, prerendered pages** — prerender real HTML per route at build.
- **SSR** (adapter-node / a Lambda adapter) — render on a server per request.

**Tradeoff.** Prerendering needs build-time-knowable content; ours is 100%
auth-gated live data, so prerender would emit empty shells anyway. SSR would mean
standing up a Node runtime you don't have, re-proxying cookies/auth, and competing
with your Python Lambda — for zero user-visible gain on an auth-walled tool.

**Recommendation: adapter-static SPA.** It maps 1:1 onto your existing CloudFront
`404 → /index.html` behavior. Revisit SSR only if you later need SEO or
fast-first-paint for public, cacheable content. **Decided.**

---

## Q3 — Data fetching: client fetch vs. SvelteKit `load` ✅ (you chose client fetch)

**Options**
- **Client fetch in components** — `onMount`/`$effect` + `$state` loading/error.
- **`load` functions** (`+page.js`) — SvelteKit's data-loading convention.

**Tradeoff.** `load` is genuinely nicer *when it runs on a server* (fetch before
render, streaming, automatic invalidation). With `ssr=false` it runs client-only,
so you pay the ceremony without the payoff, and it complicates the per-row,
per-action fetching (read/summarize/discuss are triggered by clicks, not page
loads — a poor fit for route-level `load` regardless).

**Recommendation: client fetch.** Honest for a client SPA and matches the current
React structure so the diff teaches Svelte, not a new data model. **Decided.**
(If we ever flip to SSR, the api.js layer makes moving to `load` mechanical.)

---

## Q4 — Shared state: runes-in-module vs. stores ✅ (you chose runes-in-module)

**Options**
- **Runes in `.svelte.js`** — `export const x = $state(...)`. Svelte 5 direction.
- **Classic stores** — `writable()` + `$store` auto-subscription. Still supported;
  most existing tutorials use them.

**Tradeoff.** Stores have more learning material online and work in `.js` (no
`.svelte.js` rename). Runes are the future, read like plain objects, and unify
component and shared state under one mental model (no `$`-prefix subscription, no
`get()`/`update()`).

**Recommendation: runes-in-module.** Already implemented in `provider.svelte.js`
and `auth.svelte.js`. **Decided.** Worth knowing stores still exist — you'll see
them in the wild and some libraries return them.

---

## Q5 — Auth tokens against API Gateway ✅ (keep cookie-session)

Today auth is **cookie-session**, not bearer tokens: `credentials: 'include'`,
Google OAuth handled server-side, `401 → /api/auth/login`. CloudFront forwards
cookies to the API origin (`infra/cloudfront.tf:55`). The frontend never sees a
token, which is the safer design (no token in JS = no XSS token theft).

**Question for you:** keep cookie-session as-is (recommended — nothing to migrate,
it's already the better pattern), or is there an appetite to move to a token model
(e.g. for a future native client)? **Recommendation: keep cookies.** Flagging only
because "auth tokens against API Gateway" was on your list — the answer is "we
don't, and shouldn't here." **Decided: cookie-session stays as-is.**

---

## Q6 — framer-motion in ModeToggle: replace with Svelte built-ins? ✅ (Svelte built-ins)

The only heavy dep that doesn't have a trivial home. `ModeToggle` uses
framer-motion for (a) the pulsing soundwave rings and (b) a pen↔wave crossfade.

**Options**
- **Svelte built-ins** — `transition:scale`/`fade` for the crossfade + CSS
  `@keyframes` (or `svelte/motion`) for the rings. Zero deps, compiled, smaller.
- **Keep framer-motion** — it's React-only; there's no drop-in. The Svelte analog
  is `svelte-motion`/`motion`, an *added* dep.

**Recommendation: Svelte built-ins.** This is exactly the "compiled model changes
the choice" case — the animation is simple enough that built-ins delete a
dependency entirely. Before/after lives in MIGRATION.md §ModeToggle. **Decided.**

---

## Q7 — Keep the PWA (installable/offline)? ✅ (ported via @vite-pwa/sveltekit)

React app used `vite-plugin-pwa` (autoUpdate, manifest, API-navigation denylist).

**Options**
- **Port it** via `@vite-pwa/sveltekit` (same Workbox engine, SvelteKit-aware).
- **Drop it** for now and add back once the core migration is verified.

**Recommendation: defer to the end.** It's additive and slightly fiddly with the
`/api/*` navigation denylist. Get functional parity first, then re-add as a final
step. **Done** — see MIGRATION.md §7. The previously-missing PWA icons
(`icon-192.png`, `icon-512.png`) have since been added to `static/`, closing the
last inherited gap.

---

## Q8 — Directory & cutover strategy ⚪ (parallel dir approved; cutover decided at the end)

Built in `frontend-svelte/` parallel to `frontend/` so React stays runnable for
comparison. **Question:** when you're happy, do you want me to (a) replace
`frontend/` in place and update `deploy.yml`, or (b) keep both and point deploy at
the new dir? **Recommendation: (a) replace once verified**, keeping the React app
in git history. Decide at cutover, not now.

---

## Q9 — Where does the auth gate live? 🔵

React put it in `App.jsx`, wrapping everything. SvelteKit options:

**Options**
- **Conditional in root `+layout.svelte`** *(chosen)* — `onMount(checkAuth)` +
  `{#if auth.status}` renders Loading / sign-in / the page. Mirrors `App.jsx` 1:1.
- **Route group `(app)/` + `+layout.js` `load` redirect** — protect a group of
  routes by redirecting unauthenticated users. The pattern that scales when you
  have many protected routes and a real `/login` route.
- **`hooks.client.js`** — a global client hook; overkill here.

**Tradeoff.** The `load`-redirect approach is more "SvelteKit-native" and avoids a
flash of layout before the gate resolves, but it wants a separate login route and
shines mainly with multiple protected routes. We have one page and login is a
server redirect (`/api/auth/login`), so the in-layout conditional is simpler and
has no routing to invent.

**Recommendation: in-layout conditional now**, revisit the route-group pattern if
the app grows past a single page. **Recommended; flagging because it's a real
structural fork, not a mechanical port.**
