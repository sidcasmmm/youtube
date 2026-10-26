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

export type GenerateProgressStep =
  | "script"
  | "tts"
  | "align"
  | "assets"
  | "timeline"
  | "render"
  | "validate"
  | "done";

export type GenerateProgress = {
  step: GenerateProgressStep;
  index: number;
  total: number;
  message: string;
};

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
  /** Optional progress hook for UI / SSE */
  onProgress?: (progress: GenerateProgress) => void;
};

export type GenerateResult = {
  outDir: string;
  scriptPath: string;
  audioPath: string;
  mp4Path: string;
  attributionPath: string;
  script: ShortScript;
  probe: Awaited<ReturnType<typeof validateVerticalMp4>>;
};

const PROGRESS_TOTAL = 6;

function report(
  onProgress: GenerateOptions["onProgress"],
  step: GenerateProgressStep,
  index: number,
  message: string,
): void {
  console.log(message);
  onProgress?.({ step, index, total: PROGRESS_TOTAL, message });
}

export async function generateShort(
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const stamp = opts.runId ?? new Date().toISOString().replace(/[:.]/g, "-");
  const root = path.resolve(opts.outDir ?? path.join(process.cwd(), "output"));
  const outDir = path.join(root, `short-${stamp}`);
  await mkdir(outDir, { recursive: true });
  const onProgress = opts.onProgress;

  report(onProgress, "script", 1, "[1/6] Building structured beats…");
  const shortScript = await buildScript({
    topic: opts.topic,
    script: opts.script,
    mock: opts.mock,
    mockScript: opts.mockScript,
    apiKey: opts.apiKey,
  });
  const scriptPath = path.join(outDir, "script.json");
  await writeFile(scriptPath, JSON.stringify(shortScript, null, 2));

  report(onProgress, "tts", 2, "[2/6] Synthesizing TTS…");
  const narration = scriptToNarration(shortScript);
  const { audioPath } = await synthesizeSpeech({
    text: narration,
    outDir,
    mock: opts.mock,
    apiKey: opts.apiKey,
  });

  report(onProgress, "align", 3, "[3/6] Aligning cuts to VO…");
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

  report(onProgress, "assets", 4, "[4/6] Fetching stock / mock B-roll…");
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

  report(onProgress, "timeline", 5, "[5/6] Planning scenes + captions…");
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

  report(
    onProgress,
    "render",
    6,
    "[6/6] Rendering Remotion → 1080×1920 H.264…",
  );
  const mp4Path = path.join(outDir, "short.mp4");
  await exportShortMp4({
    props,
    outputPath: mp4Path,
    workDir: path.join(outDir, ".remotion-work"),
    publicDir: outDir,
  });

  report(onProgress, "validate", 6, "Validating export…");
  const probe = await validateVerticalMp4(mp4Path);
  const doneMsg = `Done: ${mp4Path} (${probe.width}×${probe.height} ${probe.videoCodec}, ${probe.duration.toFixed(1)}s)`;
  report(onProgress, "done", 6, doneMsg);

  return {
    outDir,
    scriptPath,
    audioPath,
    mp4Path,
    attributionPath: assets.attributionPath,
    script: shortScript,
    probe,
  };
}
