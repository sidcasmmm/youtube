# AI Shorts pipeline (Path A)

Greenfield MVP: **topic or script → vertical AI Short (9:16 MP4)** for manual upload to YouTube Shorts, Instagram Reels, and Facebook Reels.

**Niche:** “Things explained” — Space, Biology, Earth curiosity explainers.

**M3 status:** Operator UI (input → progress → download MP4 → copy caption/hashtags) + manual publish checklist. One command: `npm run ui`.

## Locked stack

| Layer | Choice |
|-------|--------|
| Compose | Remotion + FFmpeg export |
| TTS | OpenAI TTS |
| LLM | OpenAI |
| Stock | Pexels (preferred) → Pixabay → mock stills |
| Music | VO-only (no paid bed dependency) |
| Platforms | Manual upload + in-UI checklist |
| Operator UX | Local web UI (`apps/web`) |

## Repo layout

```
apps/web/            # Operator UI + generate API (SSE progress)
packages/prompts/    # Short script Zod schema + LLM prompts
packages/pipeline/   # CLI + stages (script → TTS → align → assets → timeline → export)
packages/compose/    # Remotion Short composition (1080×1920)
output/              # Generated runs (gitignored)
docs/                # Manual publish checklist
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

Without `OPENAI_API_KEY`, the UI and CLI fall back to **mock mode** (niche mock script + sine VO + placeholder B-roll).

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
5. Follow the on-page checklist for YouTube / Instagram / Facebook.

Regenerate: change the topic and click **Generate Short** again (or use the CLI below).

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

## Manual publish

See [docs/manual-publish-checklist.md](docs/manual-publish-checklist.md) (also embedded in the UI).

## Security

- Secrets live only in `.env` (gitignored).
- `.env.example` has placeholders only.
- The UI `/api/env-status` returns **booleans** (key present or not) — never secret values.
