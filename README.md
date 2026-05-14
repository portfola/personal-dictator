# Personal Dictator

**Talk with the machine about your documents.**

A voice-first AI document assistant built as a cross-platform web app. Upload your markdown files and interact with them hands-free: have them read aloud, get a spoken summary, or hold a full conversation about the content.

---

## What It Does

| Feature | Description |
|---|---|
| 🎧 **Read** | Reads your document aloud using ElevenLabs TTS |
| 📄 **Summarize** | AI generates and speaks a concise summary |
| 💬 **Discuss** | Full voice or text conversation about the document |

Switch between **Anthropic Claude** and **Together AI (Llama 3)** on the fly via a UI toggle. Audio is cached in S3 so repeated requests don't burn API credits.

---

## Architecture

```
Browser (React PWA)
    │
    │ HTTPS
    ▼
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

**Stack at a glance:**

- **Frontend:** React + Vite PWA, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** FastAPI (Python) + Mangum (AWS Lambda adapter)
- **AI:** Anthropic Claude (default) or Together AI — switchable in the UI
- **TTS:** ElevenLabs API — audio cached in S3, served via presigned URLs
- **STT:** Web Speech API (browser-native, free)
- **Storage:** DynamoDB (single-table: doc metadata + chat history), S3 (documents + audio cache)
- **Infra:** AWS Lambda + API Gateway + S3 + DynamoDB + CloudFront, managed via Terraform
- **CI/CD:** GitHub Actions — test on PR, deploy on push to `main`

---

## Repo Structure

```
personal-dictator/
├── backend/
│   ├── main.py                  # FastAPI app + Mangum handler
│   ├── requirements.txt
│   ├── models/dynamo.py         # DynamoDB single-table helpers
│   ├── routes/
│   │   ├── library.py           # list, upload, delete docs
│   │   └── actions.py           # summarize, read, discuss
│   ├── services/
│   │   ├── ai.py                # Anthropic + Together AI
│   │   ├── tts.py               # ElevenLabs → S3
│   │   ├── storage.py           # S3 document operations
│   │   └── parser.py            # MD → sections
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── pages/Library.jsx
│   │   ├── components/
│   │   │   ├── DocRow.jsx
│   │   │   ├── ActionCard.jsx
│   │   │   ├── DiscussModal.jsx
│   │   │   ├── ModeToggle.jsx
│   │   │   └── ProviderToggle.jsx
│   │   └── hooks/useSpeechInput.js
│   └── vite.config.js
├── infra/                       # Terraform: Lambda, API GW, DynamoDB, S3, CloudFront
├── .github/workflows/
│   ├── test.yml                 # on PR: pytest + lint
│   └── deploy.yml               # on push to main: build + deploy
└── docs/plans/
```

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # fill in your keys (see table below)

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # proxies /api → localhost:8000
```

The frontend dev server proxies `/api/*` to the local FastAPI backend, so no CORS configuration is needed during development.

---

## Environment Variables

All variables go in `backend/.env`.

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `ANTHROPIC_MODEL` | — | Default: `claude-sonnet-4-5` |
| `TOGETHER_API_KEY` | ✅ | Together AI key (for Llama 3) |
| `TOGETHER_MODEL` | — | Default: `meta-llama/Llama-3-70b-chat-hf` |
| `ELEVENLABS_API_KEY` | ✅ | ElevenLabs TTS key |
| `ELEVENLABS_VOICE_ID` | — | Default: `21m00Tcm4TlvDq8ikWAM` (Rachel) |
| `DOCUMENTS_BUCKET` | ✅ | S3 bucket name for uploaded markdown files |
| `AUDIO_BUCKET` | ✅ | S3 bucket name for cached TTS audio |
| `DYNAMODB_TABLE` | ✅ | DynamoDB table name |
| `AWS_REGION_NAME` | ✅ | e.g. `us-east-2` |

---

## Deployment

### First-time setup (manual)

**1. Create Terraform state bucket:**
```bash
aws s3 mb s3://personal-dictator-tfstate --region us-east-2
```

**2. Create a placeholder Lambda package:**
```bash
cd backend && zip lambda.zip main.py
```

**3. Apply infrastructure:**
```bash
cd infra
terraform init
terraform apply
```

This provisions, among other things, a GitHub OIDC provider and an IAM role
(`personal-dictator-github-deploy`) that GitHub Actions assumes at deploy
time. No long-lived AWS keys are stored in GitHub. The role's trust policy
is scoped to pushes on `main` of the `github_repo` variable in
`infra/variables.tf`.

**4. Add GitHub Secrets** (`Settings → Secrets → Actions`):

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `github_deploy_role_arn` from `terraform output` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` from `terraform output` |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `TOGETHER_API_KEY` | Your Together AI key |
| `ELEVENLABS_API_KEY` | Your ElevenLabs key |
| `ELEVENLABS_VOICE_ID` | Voice ID (optional) |

**5. Push to `main`** — the deploy workflow fires automatically. GitHub
exchanges its OIDC token for short-lived STS credentials before each run.

### CI/CD

- **`test.yml`** — runs on every PR: `pytest` + lint
- **`deploy.yml`** — runs on push to `main`: builds frontend, packages Lambda, deploys via AWS CLI, invalidates CloudFront cache

---

## Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

---

## Monthly Cost Estimate

Running at personal/hobby scale:

| Service | Est. Cost |
|---|---|
| AWS Lambda | ~$0 (1M free req/mo) |
| API Gateway | ~$0 |
| DynamoDB (on-demand) | ~$0 |
| S3 | ~$0.05 |
| CloudFront | Free tier |
| ElevenLabs Starter | $5/mo |
| Anthropic API | $5–15/mo |
| **Total** | **~$10–20/mo** |

---

## License

MIT
