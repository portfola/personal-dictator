# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in API keys
uvicorn main:app --reload --port 8000
```

Run tests:
```bash
cd backend && source venv/bin/activate
pytest tests/ -v
pytest tests/test_ai.py -v   # single file
```

### Frontend

> **Migration in progress:** the frontend is being rewritten from React to Svelte 5 + SvelteKit. Two apps currently coexist — `frontend-svelte/` (Svelte, the deploy target) and `frontend/` (React, kept for comparison until cutover). Do new frontend work in `frontend-svelte/`.

Svelte app (`frontend-svelte/`, ships to production):
```bash
cd frontend-svelte
npm install
npm run dev       # vite dev — proxies /api → localhost:8000
npm run build     # adapter-static, SPA mode → build/
npm run check     # svelte-check (type/template check; there is no `lint` script)
```

React app (`frontend/`, legacy — retained for comparison):
```bash
cd frontend
npm install
npm run dev       # proxies /api → localhost:8000
npm run build
npm run lint
```

## Architecture

Voice-first AI document assistant. Users upload markdown files; the app reads them aloud, summarizes them, or holds a spoken conversation about them.

```
Browser (Svelte PWA)
    │ /api/*
API Gateway → Lambda (FastAPI + Mangum)
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
      DynamoDB      S3      ElevenLabs
   (docs + chat) (files,   (TTS → S3
                  audio)    presigned URL)
                    │
              Anthropic / Together AI
```

### Backend request flow

1. **`routes/library.py`** — CRUD for documents: upload MD → S3, store metadata in DynamoDB.
2. **`routes/actions.py`** — Three actions per doc: `read`, `summarize`, `discuss`.
   - All actions fetch the doc from S3 via `services/storage.py`.
   - `summarize` and `discuss` call `services/ai.py → chat()` with `provider=` param.
   - All spoken responses go through `services/tts.py → synthesize_to_url()`.
3. **`services/tts.py`** — Calls ElevenLabs, uploads MP3 to the audio S3 bucket, returns a presigned URL. Audio is content-addressed (MD5 of text), so identical text never re-synthesizes. The browser streams audio directly from S3 — audio bytes never pass through Lambda.
4. **`services/ai.py`** — Wraps `AsyncAnthropic` and `AsyncTogether`. The `provider` parameter (`"anthropic"` or `"together"`) is passed per-request from the frontend UI toggle.

### DynamoDB single-table design

- Documents: `pk=DOC#{id}`, `sk=META`
- Chat messages: `pk=DOC#{id}`, `sk=MSG#{session_id}#{iso_timestamp}#{msg_id}` — messages share their document's partition (single-table item collection). Reading one conversation queries by the `MSG#{session_id}#` prefix; deleting a doc wipes META + all its messages in one partition query (`delete_document`).
- GSI `type-updatedAt-index` uses `gsi1pk` / `gsi1sk` — used to list all docs sorted by recency. Only document items carry the GSI keys; messages do not.

### Frontend (Svelte — `frontend-svelte/`, current target)

Svelte 5 + SvelteKit with `adapter-static` in SPA mode. Idiomatic Svelte 5 throughout — runes (`$state`/`$derived`/`$effect`/`$props`) and runes-in-module for shared state instead of React Context.

- `src/lib/api.js` — all `fetch` calls to `/api/*`, single source of truth for API shape.
- `src/routes/+page.svelte` — main page: lists documents, hosts `ActionCard` and `DiscussModal`.
- `src/routes/+layout.svelte` / `+layout.js` — client-side auth gate (cookie-session, unchanged).
- `src/lib/provider.svelte.js` / `auth.svelte.js` — runes-in-module shared state (replaces React Context).
- `src/lib/speech.svelte.js` — wraps the browser Web Speech API for voice input in discuss mode.
- `src/lib/components/` — `ActionCard`, `DiscussModal`, `DocRow`, `ModeToggle`, `ProviderToggle`.
- Svelte built-ins replace React-era deps: CSS `@keyframes` + `transition:` for framer-motion, `crypto.randomUUID()` for uuid. Only `@lucide/svelte` and `@vite-pwa/sveltekit` are added.
- PWA via `@vite-pwa/sveltekit` with an `/api/*` navigation denylist and manual SW registration (adapter-static owns the HTML).
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed).
- Provider toggle (Anthropic vs. Together AI) is UI-level state passed as `provider` in every action request body.
- See `frontend-svelte/MIGRATION.md` (idiomatic choice + React equivalent per component) and `DECISIONS.md` for the rationale behind every non-mechanical fork.

### Frontend (React — `frontend/`, legacy, pending removal)

The original React 19 SPA, retained only for side-by-side comparison until the Svelte app is browser-verified; cutover (delete `frontend/`, rename `frontend-svelte/` → `frontend/`) is deferred.

- `src/api.js` — all `fetch` calls to `/api/*`.
- `src/pages/Library.jsx` — main page, hosting `ActionCard` and `DiscussModal`.
- `src/hooks/useSpeechInput.js` — wraps the browser Web Speech API for voice input.

### Infra

Terraform in `infra/` manages Lambda, API Gateway, DynamoDB, S3 (two buckets: documents + audio), and CloudFront. Remote state lives in `s3://personal-dictator-tfstate`. The Lambda entrypoint is `handler = Mangum(app, lifespan="off")` in `main.py`.

### CI/CD

- `test.yml` — runs on PRs: `pytest` + lints the React app in `frontend/`. (Not yet updated for the Svelte app — a migration follow-up.)
- `deploy.yml` — runs on push to `main`: builds the **Svelte** app in `frontend-svelte/` (Node 24 / npm 11) and syncs `build/` to S3 with PWA-aware cache-control, packages the Lambda zip, deploys via AWS CLI, invalidates CloudFront. No Terraform changes were needed — the SPA fallback emits `index.html` to match existing CloudFront 404 behavior.

## Environment Variables

All go in `backend/.env` (see `.env.example`). Required: `ANTHROPIC_API_KEY`, `TOGETHER_API_KEY`, `ELEVENLABS_API_KEY`, `DOCUMENTS_BUCKET`, `AUDIO_BUCKET`, `DYNAMODB_TABLE`, `AWS_REGION_NAME`.
