import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import type { ShortScript } from "@shorts/prompts";

const execFileAsync = promisify(execFile);

export function scriptToNarration(script: ShortScript): string {
  const parts = script.beats.map((b) => b.narration.trim());
  return parts.join(" ");
}

export async function synthesizeSpeech(opts: {
  text: string;
  outDir: string;
  mock?: boolean;
  apiKey?: string;
  voice?: string;
  model?: string;
}): Promise<{ audioPath: string; mime: string }> {
  const audioPath = path.join(opts.outDir, "voiceover.mp3");

  if (opts.mock) {
    // ~28s VO-shaped placeholder (sine) so Remotion can mux audio without OpenAI
    const seconds = 28;
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:duration=${seconds}`,
      "-af",
      "volume=0.15",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "4",
      audioPath,
    ]);
    return { audioPath, mime: "audio/mpeg" };
  }

  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required (or pass --mock for offline skeleton).",
    );
  }

  const client = new OpenAI({ apiKey });
  const model = opts.model ?? process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
  const voice =
    (opts.voice ?? process.env.OPENAI_TTS_VOICE ?? "alloy") as
      | "alloy"
      | "echo"
      | "fable"
      | "onyx"
      | "nova"
      | "shimmer";

  const response = await client.audio.speech.create({
    model,
    voice,
    input: opts.text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(audioPath, buffer);
  return { audioPath, mime: "audio/mpeg" };
}

export async function probeDurationSeconds(audioPath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);
  const n = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Could not probe audio duration for ${audioPath}`);
  }
  return n;
}