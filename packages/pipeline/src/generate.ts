import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ShortCompositionProps } from "@shorts/compose";
import type { ShortScript } from "@shorts/prompts";
import { alignBeatsToVoiceover, transcribeWordTimings } from "./stages/align.js";
import { fetchSceneAssets } from "./stages/assets.js";
import { exportShortMp4, validateVerticalMp4 } from "./stages/export.js";
import { buildScript } from "./stages/script.js";
import { planTimeline } from "./stages/timeline.js";
import {
  probeDurationSeconds,
  scriptToNarration,
  synthesizeSpeech,
} from "./stages/tts.js";

export type GenerateOptions = {
  topic?: string;
  script?: string;
  /** Offline skeleton: mock LLM + ffmpeg sine VO (no OpenAI) */
  mock?: boolean;
  /** Override mock script (used by niche samples) */
  mockScript?: ShortScript;
  outDir?: string;
  runId?: string;
  apiKey?: string;
  captionStyle?: "explainer" | "minimal";
};

export type GenerateResult = {
  outDir: string;
  scriptPath: string;
  audioPath: string;
  mp4Path: string;
  attributionPath: string;
  probe: Awaited<ReturnType<typeof validateVerticalMp4>>;
};

export async function generateShort(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const stamp = opts.runId ?? new Date().toISOString().replace(/[:.]/g, "-");
  const root = path.resolve(opts.outDir ?? path.join(process.cwd(), "output"));
  const outDir = path.join(root, `short-${stamp}`);
  await mkdir(outDir, { recursive: true });

  console.log("[1/6] Building structured beats…");
  const shortScript = await buildScript({
    topic: opts.topic,
    script: opts.script,
    mock: opts.mock,
    mockScript: opts.mockScript,
    apiKey: opts.apiKey,
  });
  const scriptPath = path.join(outDir, "script.json");
  await writeFile(scriptPath, JSON.stringify(shortScript, null, 2));

  console.log("[2/6] Synthesizing TTS…");
  const narration = scriptToNarration(shortScript);
  const { audioPath } = await synthesizeSpeech({
    text: narration,
    outDir,
    mock: opts.mock,
    apiKey: opts.apiKey,
  });

  console.log("[3/6] Aligning cuts to VO…");
  const durationSeconds = await probeDurationSeconds(audioPath);
  const words = await transcribeWordTimings({
    audioPath,
    mock: opts.mock,
    apiKey: opts.apiKey,
  });
  const beatWindows = alignBeatsToVoiceover({
    script: shortScript,
    durationSeconds,
    words,
  });

  console.log("[4/6] Fetching stock / mock B-roll…");
  const assets = await fetchSceneAssets({
    script: shortScript,
    outDir,
    mock: opts.mock,
  });

  // Remotion publicDir = outDir; media paths relative as assets/<file>
  const scenesWithPublicPaths = assets.scenes.map((a) => ({
    ...a,
    fileName: path.posix.join("assets", a.fileName),
  }));

  console.log("[5/6] Planning scenes + captions…");
  const timeline = planTimeline({
    script: shortScript,
    durationSeconds,
    beatWindows,
    assets: scenesWithPublicPaths,
    words,
    captionStyle: opts.captionStyle ?? "explainer",
  });

  const props: ShortCompositionProps = {
    audioFile: audioPath,
    title: shortScript.title,
    scenes: timeline.scenes,
    captions: timeline.captions,
    durationInFrames: timeline.durationInFrames,
    captionStyle: timeline.captionStyle,
  };
  await writeFile(
    path.join(outDir, "timeline.json"),
    JSON.stringify(
      {
        durationSeconds,
        beatWindows,
        wordAligned: Boolean(words?.length),
        music: "vo-only",
        ...timeline,
      },
      null,
      2,
    ),
  );

  console.log("[6/6] Rendering Remotion → 1080×1920 H.264…");
  const mp4Path = path.join(outDir, "short.mp4");
  await exportShortMp4({
    props,
    outputPath: mp4Path,
    workDir: path.join(outDir, ".remotion-work"),
    publicDir: outDir,
  });

  console.log("Validating export…");
  const probe = await validateVerticalMp4(mp4Path);
  console.log(
    `Done: ${mp4Path} (${probe.width}×${probe.height} ${probe.videoCodec}, ${probe.duration.toFixed(1)}s)`,
  );

  return {
    outDir,
    scriptPath,
    audioPath,
    mp4Path,
    attributionPath: assets.attributionPath,
    probe,
  };
}
