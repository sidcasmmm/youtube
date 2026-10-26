#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { generateShort } from "./generate.js";

const repoRootForEnv = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
loadEnv({ path: path.join(repoRootForEnv, ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

function printHelp(): void {
  console.log(`shorts-generate — Path A AI Short (M1 skeleton)

Usage:
  npm run generate -- --topic "Your topic"
  npm run generate -- --script "Full draft narration..."
  npm run generate -- --topic "Habit tip" --mock

Options:
  --topic <text>    Topic for LLM script generation
  --script <text>   Draft/full script to structure
  --mock            Offline: mock script + ffmpeg sine VO (no OpenAI)
  --out <dir>       Output root (default: ./output)
  --help            Show this help

Env:
  OPENAI_API_KEY    Required unless --mock
  OPENAI_LLM_MODEL  default gpt-4.1-mini
  OPENAI_TTS_MODEL  default gpt-4o-mini-tts
  OPENAI_TTS_VOICE  default alloy
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
  const mock = args.includes("--mock");

  if (!topic && !script && !mock) {
    printHelp();
    process.exitCode = 1;
    console.error("Error: provide --topic, --script, or --mock");
    return;
  }

  // Workspace scripts run with cwd=packages/pipeline; default to repo root output/
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  await generateShort({
    topic: topic ?? (mock ? "mock topic" : undefined),
    script,
    mock,
    outDir: outDir ? path.resolve(outDir) : path.join(repoRoot, "output"),
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});