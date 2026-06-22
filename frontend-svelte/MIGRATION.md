# MIGRATION.md — React → Svelte 5 + SvelteKit

A running log of the migration, written for an experienced React engineer seeing
Svelte 5 for the first time. Each section pairs the **idiomatic Svelte choice**
with the **React equivalent you'd recognize** and *why* they differ.

The new app lives in `frontend-svelte/` (parallel to `frontend/`) so the React
app stays runnable for side-by-side comparison until we flip the deploy.

---

## 0. The big picture

| React app | Svelte app |
|---|---|
| `main.jsx` mounts `<App/>` into `#root` | SvelteKit owns the mount; `app.html` is the shell |
| `App.jsx` is a client-side auth gate | `src/routes/+layout.svelte` (done — §5) |
| `Library.jsx` is the only "page" | `src/routes/+page.svelte` |
| `react-router-dom` (installed, **never used**) | SvelteKit file-based routing |
| Vite SPA, no server | adapter-static SPA, no server |

The single biggest conceptual shift: **there is no virtual DOM and no re-render
function.** A Svelte component's `<script>` runs **once**. Reactivity is not
"re-run the function and diff" — the compiler wires specific DOM updates to
specific state reads. So most React ceremony that exists to tame re-renders
(`useCallback`, `useMemo`, dependency arrays, stable refs) simply has no analog.

---

## 1. The reactivity primitives (the rune cheat-sheet)

| React | Svelte 5 | Note |
|---|---|---|
| `const [x, setX] = useState(0)` | `let x = $state(0)` | Mutate directly: `x++`, `x = 5`. No setter. |
| `setX(x + 1)` | `x++` | Assignment *is* the update. |
| value computed each render | `const y = $derived(x * 2)` | Memoized, auto-tracked deps. |
| `useMemo(() => f(x), [x])` | `$derived.by(() => f(x))` | For multi-statement derivations. |
| `useEffect(fn, [x])` | `$effect(() => { ... })` | **No dependency array** — reads are tracked automatically. |
| `useEffect(fn, [])` (mount) | `onMount(() => { ... })` | Use `onMount` for one-shot/imperative setup; `$effect` for reactive sync. |
| `useRef(null)` → DOM | `let el; <div bind:this={el}>` | Direct node binding. |
| `useRef(x)` → mutable box | plain `let x` (non-`$state`) | No re-render, so no ref needed. |
| `function Child({ a, b })` | `let { a, b } = $props()` | Destructured runes. |
| `<input value onChange>` | `<input bind:value>` | Two-way binding built in. |
| `useContext` / provider tree | runes in a `.svelte.js` module | See §3. |
| `useCallback` / `useMemo(fn)` | — | Delete it. Compiled output is already stable. |

**The trap to internalize:** in React, forgetting a dep array entry causes a
stale closure. In Svelte, `$effect` *cannot* go stale — it re-runs whenever any
state it read changes. The skill to unlearn is dependency bookkeeping.

---

## 2. Adapter & app shell (done)

- **`adapter-static` in SPA mode** — `vite.config.js` sets
  `adapter({ fallback: 'index.html' })`. The build emits a single hydratable shell
  (`build/index.html`) that every unmatched path resolves to. We name it
  `index.html` rather than the scaffold's common `200.html` so it lines up with
  what CloudFront already serves (`default_root_object` + `404 → /index.html`,
  `infra/cloudfront.tf`), so the deploy story barely changes — zero infra edits
  (see DECISIONS.md Q2 and §"Deploy" below for the correction rationale).
- **`src/routes/+layout.js`** sets `export const ssr = false` and
  `export const prerender = false`. This is the explicit form of "it's a client
  SPA." It also means **`localStorage` and `window` are always available** — no
  `if (browser)` guards strictly required (we keep a couple as documentation).
- **`app.css`** is `@import 'tailwindcss'` (Tailwind v4 via `@tailwindcss/vite`,
  same as React). Imported once in `+layout.svelte`. The old `index.css`
  portfolio-template cruft (`#root { width: 1126px }`, centering, `border-inline`)
  was dropped — it fought the slate-950 full-bleed layout.

React equivalent: `main.jsx` + `vite.config.js` + `index.css`, minus the
`createRoot`/`StrictMode` boilerplate (SvelteKit owns mounting).

---

## 3. Shared state: runes-in-module (done)

Two modules replace what React did with `useState` + a localStorage helper:

### `src/lib/provider.svelte.js` — the Claude/Together toggle

```js
export const provider = $state({ value: 'anthropic' });
export function setProvider(value) { provider.value = value; /* + persist */ }
```

- **React was:** `getProvider()`/`setProvider()` on localStorage **plus**
  `useState(getProvider())` inside `ProviderToggle`. Two sources of truth — two
  toggles could drift.
- **Svelte is:** one `$state` object. Any component does
  `import { provider } from '$lib/provider.svelte.js'`, reads `provider.value`,
  and updates automatically. No `<Context.Provider>`, no `useContext`.
- **Why export an object, not a primitive:** importers bind to the *binding*. A
  reassigned top-level `let` export won't notify them; mutating a property of a
  stable exported object will. (`provider.value = x`, not `provider = x`.)
- **Why `.svelte.js`:** the `$state` rune only compiles in `.svelte.js`/`.ts`.

### `src/lib/auth.svelte.js` — the sign-in gate state

```js
export const auth = $state({ status: 'loading', email: null });
export async function checkAuth() { /* getMe() → set status */ }
```

- **React was:** `const [auth, setAuth] = useState('loading')` + a `useEffect` in
  `App.jsx`.
- **Svelte is:** the state lives in a module; the root layout calls `checkAuth()`
  once on mount and branches on `auth.status`. Bonus: a logout button anywhere can
  read `auth.email` without prop threading.

> This is the canonical "React hook/context → Svelte rune module" translation.
> The same shape will turn `useSpeechInput` into `createSpeechInput()` later.

---

## 4. The data layer: `src/lib/api.js` (done)

A near-verbatim port of `frontend/src/api.js` — it's framework-agnostic `fetch`,
so it barely changes. Cookie auth (`credentials: 'include'`) and the
`401 → /api/auth/login` redirect are preserved exactly. The **only** change:
`getProvider`/`setProvider` left this file and became reactive state in
`provider.svelte.js` (§3).

We deliberately did **not** move fetching into SvelteKit `load` functions
(DECISIONS.md Q3): with `ssr = false` they'd run client-only, giving the `load`
ceremony without the SSR payoff. Components fetch in `onMount`/`$effect` with
`$state` loading flags — the honest match for a client SPA.

---

## 5. Component migration (done)

> _All components ported. Each row links to its write-up below._

| React component | Svelte file | Status |
|---|---|---|
| `App.jsx` (auth gate) | `routes/+layout.svelte` | ✅ |
| `pages/Library.jsx` | `routes/+page.svelte` | ✅ |
| `components/DocRow.jsx` | `lib/components/DocRow.svelte` | ✅ |
| `components/ActionCard.jsx` | `lib/components/ActionCard.svelte` | ✅ |
| `components/DiscussModal.jsx` | `lib/components/DiscussModal.svelte` | ✅ (dropped `uuid`) |
| `components/ModeToggle.jsx` | `lib/components/ModeToggle.svelte` | ✅ (dropped framer-motion) |
| `components/ProviderToggle.jsx` | `lib/components/ProviderToggle.svelte` | ✅ |
| `hooks/useSpeechInput.js` | `lib/speech.svelte.js` | ✅ (`createSpeechInput()`) |

---

### Leaf components (done)

**`ProviderToggle.svelte`** — the cleanest win. React held a *local* copy of the
provider (`useState(getProvider())`) that could drift from another toggle's copy.
The Svelte version holds **no state at all**: it reads the shared `provider.value`
rune and writes via `setProvider`. Two instances stay in lockstep for free.
- React `${active ? a : b}` template literal → Svelte `{cond ? a : b}` inside the
  `class="..."` string — same idea, `{}` instead of `${}`.
- `onClick` → `onClick`? No: **`onclick`** (lowercase). Svelte 5 handlers are
  plain attributes/props, not the old `on:click` directive.

**`ModeToggle.svelte`** — the framer-motion deletion (Q6). Two animations, both
now zero-dep:
- *Pen ↔ soundwave crossfade*: `<AnimatePresence>`+`<motion.div>` → a plain
  `{#if}/{:else}` with `transition:scale={{ duration: 200, start: 0.8 }}`. Svelte
  runs the in/out animation on mount/unmount automatically. A `position:relative`
  wrapper with `absolute inset-0` children lets the two states overlap during the
  crossfade without a layout jump (Svelte runs out+in concurrently, unlike
  framer's `mode="wait"` — visually equivalent here).
- *Pulsing rings*: three `<motion.span>` with `animate`/`repeat` → CSS
  `@keyframes pulse` in a **scoped `<style>`**, toggled by `class:active`. Per-ring
  stagger and grow-target come from inline `style="--target-scale: …;
  animation-delay: …"` using the exact React values (`2 + i*0.4`, `i*0.4s`).
- `onChange` stays a **callback prop** (`let { onChange } = $props()`) — Svelte 5
  favors callback props over `createEventDispatcher`, so it reads like React.
- Icons: `lucide-react`'s `<PenLine/>` → `@lucide/svelte`'s `import { PenLine }`.
  Same icon set, per-icon tree-shaken (not a "heavy dep").

> **Why no `<style>` for ProviderToggle but one for ModeToggle?** Tailwind
> utilities cover static styling inline; you only drop to scoped `<style>` for what
> utilities can't express — here, custom `@keyframes`. Scoped styles are
> component-local by default (Svelte adds a hashed class), so no leakage.

### `useSpeechInput` → `createSpeechInput()` (done)

The "custom hook → rune factory" template. `lib/speech.svelte.js` exports a
factory that owns `$state` and returns it via a **getter**:

```js
return { get listening() { return listening; }, start, stop };
```

- **Why a getter:** a hook re-runs each render, so a returned boolean is naturally
  fresh. A factory runs once — to keep `listening` reactive for the caller it must
  be read through a getter over `$state`.
- **The gotcha (carries to all rune factories):** the caller must NOT destructure
  `const { listening } = …` — that invokes the getter once and freezes the value.
  Keep the object whole: `speech.listening`. DiscussModal does exactly this.
- **No `useCallback`** around `onResult`: the script runs once, the callback is
  already stable.

### `ActionCard` (done) — the `$effect` dependency trap

Audio orchestration. The teaching centerpiece is the autoplay effect:

```js
$effect(() => {
  if (result?.audio_url && untrack(() => mode) === 'voice') attemptPlay();
});
```

- React's `useEffect(fn, [result])` re-ran **only on `result`**. A naive Svelte
  `$effect` reads *every* signal it touches, so reading `mode` would also re-fire
  on a voice/text toggle and double-trigger autoplay. `untrack(() => mode)` reads
  `mode` without subscribing — autoplay reacts to new audio, not mode flips. This
  is the single most important `$effect`-vs-dep-array lesson.
- `useRef(null)` (DOM) → plain `let audioEl` + `bind:this={audioEl}`.
- `result?.summary || result?.text || ''` → `$derived` (memoized).
- Lowercased media events: `onplay`/`onpause`/`onended`/`onerror`.

### `DiscussModal` (done) — biggest component, four idioms at once

- **`useRef(uuidv4())` → `const sessionId = crypto.randomUUID()`.** A const is
  already "stable for the component's lifetime" (script runs once), and the
  built-in randomUUID **drops the `uuid` dependency** entirely.
- **No functional setState.** React used `setMessages(prev => [...prev, x])` to
  avoid a stale closure across the `await`. Svelte reads live `$state`, so
  `messages = [...messages, x]` is correct even post-await — the updater pattern
  has no reason to exist.
- **`bind:value={input}`** replaces the controlled `value`/`onChange` pair.
- **One-shot mic start** uses `onMount` (clearer than a guarded `$effect` for
  imperative setup); the **scroll-to-bottom** uses `$effect` reading
  `messages.length` (runs after DOM update, so the new bubble is laid out).
- `getProvider()` → `provider.value` (the shared rune).
- `{#each messages as m, i (i)}` keyed by index — fine for an append-only list.

### `DocRow` (done) — components as data

The interesting bit is the action buttons. React stored *rendered JSX* in an array
(`{ icon: <Headphones/> }`). Svelte stores the **component reference**
(`{ Icon: Headphones }`) and instantiates it in markup:

```svelte
{#each actions as { key, Icon, label } (key)}
  <Icon size={18} />
{/each}
```

The capital `Icon` is the whole trick — a capitalized variable in markup is
compiled as a component, not a DOM element. That's the idiomatic replacement for
"JSX stored in an array" and for the old `<svelte:component this={...}>`.
Otherwise: `useState(null)` active/result/loading → `$state`, `getProvider()` →
`provider.value`.

### `Library` → `routes/+page.svelte` (done)

The "page." `useEffect(() => load(), [])` → `onMount(load)`; `docs/discussDoc/
uploading` → `$state`. Two specifics:
- **Data fetching is client-side** (Q3) — `onMount` calls `getLibrary()`. A route
  `load` would run client-only under `ssr=false`, so it'd add ceremony for nothing.
- **`e.target` not `e.currentTarget`** in the upload handler: there's an `await`
  inside, and a native event's `currentTarget` is null once dispatch ends, while
  `target` stays a live reference. (React's synthetic event hid this; native
  events don't.) Subtle, but it'd be a real null-deref bug.

### `App.jsx` auth gate → `routes/+layout.svelte` (done)

React's `App` checked auth in a `useEffect` and conditionally rendered `<Library/>`.
The SvelteKit-idiomatic home is the **root layout**, which wraps every route:
`onMount(checkAuth)` runs once, and the `{#if auth.status}` block renders
Loading / the sign-in screen / `{@render children()}` (the page). Using the shared
`auth` rune means the status is also readable elsewhere (e.g. a future logout
button) without lifting state. The route-group + `load`-redirect alternative is in
DECISIONS.md Q9 — deferred until there's more than one route.

> `{@render children()}` is Svelte 5's replacement for React's `{children}` /
> `props.children`. The layout receives `children` via `$props()` and renders it
> with the `{@render}` tag (snippets), rather than a magic prop.

### Tooling note: `checkJs` turned off

The scaffold enabled `checkJs` in `jsconfig.json`, which made TypeScript flag
"implicitly any" on the untyped JS helpers (`api.js`, `provider.svelte.js`). Since
the source is plain JS (parity with the React app) and the goal is learning Svelte
not TS, `checkJs` is now `false`. **`svelte-check` still fully validates `.svelte`
files** for rune/prop/markup errors — only untyped-JS pedantry is silenced. Flip it
back on and add JSDoc if you ever want typed JS.

## 6. Deploy (done — `.github/workflows/deploy.yml`)

The S3 + CloudFront story stayed nearly identical. **No infra/Terraform changes.**

- **Build dir `dist/` → `build/`**, and source dir `frontend/` → `frontend-svelte/`.
- **SPA fallback is `index.html`, not `200.html`.** This is a correction from the
  scaffold: adapter-static with `fallback: '200.html'` emits *only* `200.html` and
  no `index.html`, but this project's CloudFront uses `index.html` as both
  `default_root_object` and the 404 `response_page_path` (infra/cloudfront.tf). So
  the root path would 404 in prod. Setting `fallback: 'index.html'` makes the build
  line up with the existing CDN config and needs **zero** infra edits.
- **Cache-control now excludes the PWA control files.** The old workflow cached
  everything-except-index.html as `immutable, max-age=1y`. The service worker
  (`sw.js`), its registration shim (`registerSW.js`), and `manifest.webmanifest`
  must be served `no-cache` — otherwise CloudFront pins a year-old `sw.js` and
  `autoUpdate` can never ship a new version. Content-hashed assets
  (`_app/immutable/*`, `workbox-*.js`) stay immutable.
- **Node 24 / npm 11** in CI (Vite 8 wants ≥20.19 / ≥22.12; the repo pins
  Node 24 via `.nvmrc` so local and CI share one npm major — see DECISIONS.md Q10).
- Dropped the unused `VITE_API_BASE` env (api.js hardcodes `/api`, same as React).

Backend, API Gateway, the `/api/*` CloudFront behavior, and cookie auth: untouched.

> **Cutover note (Q8):** `deploy.yml` now points at `frontend-svelte/`, but the
> React `frontend/` dir is left in place. Nothing deploys until this branch merges
> to `main`. The final cleanup (delete `frontend/`, optionally rename
> `frontend-svelte/` → `frontend/`) is a deliberate separate step once you've
> verified the app in a browser.

## 7. PWA (done — `@vite-pwa/sveltekit`)

Ported from `vite-plugin-pwa` with the same `autoUpdate` behavior, manifest, and —
critically — the `navigateFallbackDenylist: [/^\/api\//]` that stops the SPA
fallback from swallowing `/api/auth/*` navigations.

**The one real difference from React:** `vite-plugin-pwa` auto-injected the SW
registration + manifest `<link>` into `index.html`. `@vite-pwa/sveltekit` does
**not**, because SvelteKit (not the plugin) generates the HTML under
adapter-static. So registration is wired by hand:
- `app.html` gets the `<link rel="manifest">` + `<meta name="theme-color">`.
- `+layout.svelte` calls `useRegisterSW({ immediate: true })` from
  `virtual:pwa-register/svelte`. With `autoUpdate` there's no refresh-prompt UI to
  build — just register and let the next load take over.
- `src/app.d.ts` references `vite-plugin-pwa/svelte` + `/info` so `svelte-check`
  resolves the `virtual:` modules.

> **Resolved:** the manifest points at `/icon-192.png` and `/icon-512.png`, which
> **never existed in the React app** (absent from the old `public/`). Real 192×192
> and 512×512 PNGs now live in `frontend-svelte/static/`, so installs get a proper
> icon. `favicon.svg` was carried over to `static/` for parity.
