# AI Shorts pipeline (Path A)

Greenfield MVP: **topic or script → vertical AI Short (9:16 MP4)** for manual upload to YouTube Shorts, Instagram Reels, and Facebook Reels.

**M1 status:** CLI skeleton — structured beats → OpenAI TTS → Remotion placeholder visuals + burned-in captions → 1080×1920 H.264.

## Locked stack

| Layer | Choice |
|-------|--------|
| Compose | Remotion + FFmpeg export |
| TTS | OpenAI TTS |
| LLM | OpenAI |
| Music | VO-only |
| Platforms | Manual upload (later) |

## Repo layout

```
packages/prompts/    # Short script Zod schema + LLM prompts
packages/pipeline/   # CLI + stages (script → TTS → timeline → export)
packages/compose/    # Remotion Short composition (1080×1920)
output/              # Generated runs (gitignored)
docs/                # Manual publish checklist
```

UI is deferred to M3 — use the CLI for now.

## Prerequisites

- Node.js 20+
- FFmpeg + ffprobe on `PATH` (used for duration probe / mock VO / validation)
- Chromium deps for Remotion render (installed with `@remotion/renderer`)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

**Never commit `.env` or real keys.** Only `OPENAI_API_KEY` (and optional model/voice overrides) are required for a real generate.

Optional env:

| Variable | Default |
|----------|---------|
| `OPENAI_LLM_MODEL` | `gpt-4.1-mini` |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` |
| `OPENAI_TTS_VOICE` | `alloy` |

## Generate a Short

From the repo root:

```bash
# From a topic (calls OpenAI for script + TTS)
npm run generate -- --topic "One weird morning habit that saves an hour"

# From a draft script
npm run generate -- --script "Stop scrolling. Here's the 20-second habit..."

# Offline skeleton (no API key): mock beats + sine VO — proves Remotion export
npm run generate -- --mock
```

Each run writes under `output/short-<timestamp>/`:

- `script.json` — structured beats
- `voiceover.mp3` — TTS (or mock audio)
- `timeline.json` — scene + caption frame map
- `short.mp4` — **1080×1920 H.264 + AAC** with burned-in captions

## Manual publish

See [docs/manual-publish-checklist.md](docs/manual-publish-checklist.md).

## M2+ (not in this PR)

Stock/gen B-roll, louder caption polish, music bed, and a thin web UI.