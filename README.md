# AI Shorts pipeline (Path A)

Greenfield MVP: **topic or script → vertical AI Short (9:16 MP4)** for manual upload to YouTube Shorts, Instagram Reels, and Facebook Reels.

**Niche:** “Things explained” — Space, Biology, Earth curiosity explainers.

**M2 status:** Stock/mock B-roll per scene, VO-locked cuts, caption style preset, VO-only audio. CLI can emit **3 niche sample Shorts**.

## Locked stack

| Layer | Choice |
|-------|--------|
| Compose | Remotion + FFmpeg export |
| TTS | OpenAI TTS |
| LLM | OpenAI |
| Stock | Pexels (preferred) → Pixabay → mock stills |
| Music | VO-only (no paid bed dependency in M2) |
| Platforms | Manual upload (later) |

## Repo layout

```
packages/prompts/    # Short script Zod schema + LLM prompts
packages/pipeline/   # CLI + stages (script → TTS → align → assets → timeline → export)
packages/compose/    # Remotion Short composition (1080×1920)
output/              # Generated runs (gitignored)
docs/                # Manual publish checklist
```

UI is deferred to M3 — use the CLI for now.

## Prerequisites

- Node.js 20+
- FFmpeg + ffprobe on `PATH` (duration probe / mock VO / mock B-roll stills / validation)
- Chromium deps for Remotion render (installed with `@remotion/renderer`)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env — see keys below
```

**Never commit `.env` or real keys.**

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | For live generate | LLM script, TTS, optional Whisper word alignment |
| `PEXELS_API_KEY` | Recommended for M2 | Portrait stock photos per scene ([pexels.com/api](https://www.pexels.com/api/)) |
| `PIXABAY_API_KEY` | Optional fallback | Stock photos if Pexels misses ([pixabay.com/api/docs](https://pixabay.com/api/docs/)) |
| `OPENAI_LLM_MODEL` | No | Default `gpt-4.1-mini` |
| `OPENAI_TTS_MODEL` | No | Default `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | No | Default `alloy` |

Without stock keys, the pipeline still runs using **mock B-roll stills** (ffmpeg gradients) and records that in `attribution.json`.

## Generate a Short

From the repo root:

```bash
# From a topic (OpenAI script + TTS; stock if keys set)
npm run generate -- --topic "Why is the sky blue?"

# From a draft script
npm run generate -- --script "Stop scrolling. Here's why space is silent..."

# Offline skeleton (no API keys): mock niche script + sine VO + mock B-roll
npm run generate -- --mock

# Caption style preset: explainer (default) | minimal
npm run generate -- --mock --caption-style minimal
```

### Three niche samples (M2 exit)

```bash
# Preferred when keys are set — real TTS + Pexels/Pixabay B-roll
npm run generate -- --samples

# Guaranteed offline / no keys — mock VO + placeholder B-roll for all 3
npm run generate -- --samples --mock
```

Topics (Space / Biology / Earth):

1. Why is space completely silent?
2. Why do we yawn when someone else yawns?
3. Why is the sky blue?

Each run writes under `output/short-<id>/`:

- `script.json` — structured beats + stock queries
- `voiceover.mp3` — TTS (or mock audio)
- `assets/` — B-roll stills (stock or mock)
- `attribution.json` — stock credit lines (keep for publish)
- `timeline.json` — VO-locked scene + caption frame map
- `short.mp4` — **1080×1920 H.264 + AAC** with burned-in captions

## Manual publish

See [docs/manual-publish-checklist.md](docs/manual-publish-checklist.md). Credit stock photographers when the platform allows.

## M3+ (not in this PR)

Thin web UI, louder loudness pass / optional cleared music bed, publish checklist UX.
