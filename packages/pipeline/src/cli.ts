#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { generateShort } from "./generate.js";
import { SAMPLE_TOPICS } from "./stages/script.js";

const repoRootForEnv = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
loadEnv({ path: path.join(repoRootForEnv, ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

function printHelp(): void {
  console.log(`shorts-generate — Path A AI Short (M2 B-roll + polish)

Usage:
  npm run generate -- --topic "Why is the sky blue?"
  npm run generate -- --script "Full draft narration..."
  npm run generate -- --mock
  npm run generate -- --samples
  npm run generate -- --samples --mock

Options:
  --topic <text>       Topic for LLM script generation
  --script <text>      Draft/full script to structure
  --mock               Offline: niche mock script + sine VO + mock B-roll
  --samples            Generate 3 niche Shorts (Space / Biology / Earth)
  --caption-style <s>  explainer (default) | minimal
  --out <dir>          Output root (default: ./output)
  --help               Show this help

Env:
  OPENAI_API_KEY       Required unless --mock (LLM + TTS + optional Whisper align)
  PEXELS_API_KEY       Preferred stock B-roll (free key at pexels.com/api)
  PIXABAY_API_KEY      Fallback stock B-roll
  OPENAI_LLM_MODEL     default gpt-4.1-mini
  OPENAI_TTS_MODEL     default gpt-4o-mini-tts
  OPENAI_TTS_VOICE     default alloy

Music: VO-only in M2 (no paid bed dependency).
`);
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const topic = getFlag(args, "--topic");
  const script = getFlag(args, "--script");
  const outDir = getFlag(args, "--out");
  const captionStyleRaw = getFlag(args, "--caption-style");
  const mock = args.includes("--mock");
  const samples = args.includes("--samples");
  const captionStyle =
    captionStyleRaw === "minimal" || captionStyleRaw === "explainer"
      ? captionStyleRaw
      : "explainer";

  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
  );
  const outputRoot = outDir
    ? path.resolve(outDir)
    : path.join(repoRoot, "output");

  if (samples) {
    const useMock = mock || !process.env.OPENAI_API_KEY;
    if (useMock && !mock) {
      console.warn(
        "[samples] OPENAI_API_KEY unset — generating 3 mock Shorts (sine VO + placeholder B-roll).",
      );
    }
    console.log(
      `Generating 3 "Things explained" samples (${useMock ? "mock" : "live"})…`,
    );
    for (const sample of SAMPLE_TOPICS) {
      console.log(`\n=== ${sample.niche}: ${sample.topic} ===`);
      const result = await generateShort({
        topic: sample.topic,
        mock: useMock,
        mockScript: useMock ? sample.mockScript : undefined,
        outDir: outputRoot,
        runId: `sample-${sample.id}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
        captionStyle,
      });
      console.log(`MP4: ${result.mp4Path}`);
      console.log(`Attribution: ${result.attributionPath}`);
    }
    return;
  }

  if (!topic && !script && !mock) {
    printHelp();
    process.exitCode = 1;
    console.error("Error: provide --topic, --script, --mock, or --samples");
    return;
  }

  await generateShort({
    topic: topic ?? (mock ? "Why is space completely silent?" : undefined),
    script,
    mock,
    outDir: outputRoot,
    captionStyle,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
