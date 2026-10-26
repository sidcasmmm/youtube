import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShortCompositionProps } from "@shorts/compose";
import { buildScript } from "./stages/script.js";
import {
  probeDurationSeconds,
  scriptToNarration,
  synthesizeSpeech,
} from "./stages/tts.js";
import { planTimeline } from "./stages/timeline.js";
import { exportShortMp4, validateVerticalMp4 } from "./stages/export.js";

export type GenerateOptions = {
  topic?: string;
  script?: string;
  /** Offline skeleton: mock LLM + ffmpeg sine VO (no OpenAI) */
  mock?: boolean;
  outDir?: string;
  apiKey?: string;
};

export type GenerateResult = {
  outDir: string;
  scriptPath: string;
  audioPath: string;
  mp4Path: string;
  probe: Awaited<ReturnType<typeof validateVerticalMp4>>;
};

export async function generateShort(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const root = path.resolve(opts.outDir ?? path.join(process.cwd(), "output"));
  const outDir = path.join(root, `short-${stamp}`);
  await mkdir(outDir, { recursive: true });

  console.log("[1/5] Building structured beats…");
  const shortScript = await buildScript({
    topic: opts.topic,
    script: opts.script,
    mock: opts.mock,
    apiKey: opts.apiKey,
  });
  const scriptPath = path.join(outDir, "script.json");
  await writeFile(scriptPath, JSON.stringify(shortScript, null, 2));

  console.log("[2/5] Synthesizing TTS…");
  const narration = scriptToNarration(shortScript);
  const { audioPath } = await synthesizeSpeech({
    text: narration,
    outDir,
    mock: opts.mock,
    apiKey: opts.apiKey,
  });

  console.log("[3/5] Planning scenes + captions…");
  const durationSeconds = await probeDurationSeconds(audioPath);
  const timeline = planTimeline(shortScript, durationSeconds);

  const props: ShortCompositionProps = {
    audioFile: audioPath,
    title: shortScript.title,
    scenes: timeline.scenes,
    captions: timeline.captions,
    durationInFrames: timeline.durationInFrames,
  };
  await writeFile(
    path.join(outDir, "timeline.json"),
    JSON.stringify({ durationSeconds, ...timeline }, null, 2),
  );

  console.log("[4/5] Rendering Remotion → 1080×1920 H.264…");
  const mp4Path = path.join(outDir, "short.mp4");
  await exportShortMp4({
    props,
    outputPath: mp4Path,
    workDir: path.join(outDir, ".remotion-work"),
  });

  console.log("[5/5] Validating export…");
  const probe = await validateVerticalMp4(mp4Path);
  console.log(
    `Done: ${mp4Path} (${probe.width}×${probe.height} ${probe.videoCodec}, ${probe.duration.toFixed(1)}s)`,
  );

  return { outDir, scriptPath, audioPath, mp4Path, probe };
}