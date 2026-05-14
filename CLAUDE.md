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
Browser (React PWA)
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
- Chat messages: `pk=SESSION#{session_id}`, `sk=MSG#{iso_timestamp}#{msg_id}`
- GSI `type-updatedAt-index` uses `gsi1pk` / `gsi1sk` — used to list all docs sorted by recency.

### Frontend

- `src/api.js` — all `fetch` calls to `/api/*`, single source of truth for API shape.
- `src/pages/Library.jsx` — main page: lists documents, hosts `ActionCard` and `DiscussModal`.
- `src/hooks/useSpeechInput.js` — wraps the browser Web Speech API for voice input in discuss mode.
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js` needed).
- Provider toggle (Anthropic vs. Together AI) is a UI-level state passed as `provider` in every action request body.

### Infra

Terraform in `infra/` manages Lambda, API Gateway, DynamoDB, S3 (two buckets: documents + audio), and CloudFront. Remote state lives in `s3://personal-dictator-tfstate`. The Lambda entrypoint is `handler = Mangum(app, lifespan="off")` in `main.py`.

### CI/CD

- `test.yml` — runs on PRs: `pytest` + lint.
- `deploy.yml` — runs on push to `main`: builds frontend, packages Lambda zip, deploys via AWS CLI, invalidates CloudFront.

## Environment Variables

All go in `backend/.env` (see `.env.example`). Required: `ANTHROPIC_API_KEY`, `TOGETHER_API_KEY`, `ELEVENLABS_API_KEY`, `DOCUMENTS_BUCKET`, `AUDIO_BUCKET`, `DYNAMODB_TABLE`, `AWS_REGION_NAME`.
