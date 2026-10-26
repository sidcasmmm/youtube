# AI Shorts pipeline (Path A)

Greenfield MVP: **topic or script → vertical AI Short (9:16 MP4)** for YouTube Shorts, Instagram Reels, and Facebook Reels.

**Niche:** “Things explained” — Space, Biology, Earth curiosity explainers.

**M4 status:** Optional YouTube Shorts upload via Data API v3 OAuth (`videos.insert`). IG/FB stay manual — see Meta blockers. Operator UI + CLI unchanged from M3.

## Locked stack

| Layer | Choice |
|-------|--------|
| Compose | Remotion + FFmpeg export |
| TTS | OpenAI TTS |
| LLM | OpenAI |
| Stock | Pexels (preferred) → Pixabay → mock stills |
| Music | VO-only (no paid bed dependency) |
| Platforms | Manual IG/FB + optional YouTube API upload |
| Operator UX | Local web UI (`apps/web`) |

## Repo layout

```
apps/web/            # Operator UI + generate API (SSE progress) + YT upload hook
packages/prompts/    # Short script Zod schema + LLM prompts
packages/pipeline/   # CLI + stages (script → TTS → align → assets → timeline → export)
packages/compose/    # Remotion Short composition (1080×1920)
packages/youtube/    # M4 OAuth + videos.insert upload CLI
output/              # Generated runs (gitignored)
docs/                # Publish checklist, YouTube OAuth, Meta blockers
```

## Prerequisites

- Node.js 20+
- FFmpeg + ffprobe on `PATH`
- Chromium deps for Remotion render (via `@remotion/renderer`)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — never commit real keys
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | For live generate | LLM script, TTS, optional Whisper word alignment |
| `PEXELS_API_KEY` | Recommended | Portrait stock photos per scene |
| `PIXABAY_API_KEY` | Optional fallback | Stock if Pexels misses |
| `OPENAI_LLM_MODEL` | No | Default `gpt-4.1-mini` |
| `OPENAI_TTS_MODEL` | No | Default `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | No | Default `alloy` |
| `PORT` | No | UI server port (default `4173`) |
| `YOUTUBE_CLIENT_ID` | For YT upload | Google OAuth client ID |
| `YOUTUBE_CLIENT_SECRET` | For YT upload | Google OAuth client secret |
| `YOUTUBE_REFRESH_TOKEN` | For YT upload | From `npm run youtube:auth` |
| `YOUTUBE_REDIRECT_URI` | No | Default `http://localhost:8765/oauth2callback` |
| `YOUTUBE_PRIVACY_STATUS` | No | `private` (default) / `unlisted` / `public` |

Without `OPENAI_API_KEY`, the UI and CLI fall back to **mock mode** (niche mock script + sine VO + placeholder B-roll).

Without YouTube OAuth vars, generate/download still work; upload CLI/UI stay disabled.

---

## Operator UI (recommended for non-engineers)

One command from the repo root:

```bash
npm run ui
```

Then open **http://localhost:4173**

1. Enter a **topic** (or switch to **Script** and paste a draft).
2. Optionally enable **Mock mode** (auto-on when OpenAI key is missing).
3. Click **Generate Short** — watch the progress steps.
4. **Download MP4**, **Copy caption**, **Copy hashtags**.
5. If YouTube OAuth is configured: **Upload to YouTube** (private by default).
6. Follow the on-page checklist for Instagram / Facebook (manual).

Alias: `npm start` → same as `npm run ui`.

---

## CLI

```bash
# From a topic (live keys)
npm run generate -- --topic "Why is the sky blue?"

# From a draft script
npm run generate -- --script "Stop scrolling. Here's why space is silent..."

# Offline / no keys
npm run generate -- --mock

# Caption style: explainer (default) | minimal
npm run generate -- --mock --caption-style minimal

# Three niche samples (Space / Biology / Earth)
npm run generate -- --samples
npm run generate -- --samples --mock
```

Each run writes under `output/short-<id>/`:

- `script.json` — structured beats + hashtags
- `voiceover.mp3` — TTS (or mock audio)
- `assets/` — B-roll stills
- `attribution.json` — stock credits
- `timeline.json` — scene + caption map
- `short.mp4` — **1080×1920 H.264 + AAC** with burned-in captions

---

## YouTube Shorts upload (M4 spike)

Full walkthrough: **[docs/youtube-oauth-setup.md](docs/youtube-oauth-setup.md)**

### Create Google Cloud project + OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → new project.
2. Enable **YouTube Data API v3**.
3. Configure **OAuth consent screen** (add yourself as a test user while in Testing).
4. Create **OAuth client ID** (Desktop or Web).
5. Authorized redirect URI (Web clients): `http://localhost:8765/oauth2callback`
6. Put client ID/secret in `.env` (never commit).

### One-time auth + upload

```bash
npm run youtube:auth
# Paste YOUTUBE_REFRESH_TOKEN into .env

npm run generate -- --mock
npm run upload-youtube
# or: npm run upload-youtube -- --file output/short-…/short.mp4 --privacy private
```

UI hook: after generate, **Upload to YouTube** appears when credentials are present.

Meta IG/FB auto-post is **not** in this spike — blockers: **[docs/meta-reels-api-blockers.md](docs/meta-reels-api-blockers.md)**.

## Manual publish

See [docs/manual-publish-checklist.md](docs/manual-publish-checklist.md) (also embedded in the UI).

## Security

- Secrets live only in `.env` (gitignored).
- `.env.example` has placeholders only.
- The UI `/api/env-status` returns **booleans** (key present or not) — never secret values.
- OAuth client JSON downloads and token files are gitignored.
