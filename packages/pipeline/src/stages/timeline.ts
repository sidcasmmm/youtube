import { FPS, type CaptionCue, type SceneCard } from "@shorts/compose";
import type { ShortScript } from "@shorts/prompts";
import type { BeatWindow, WordTiming } from "./align.js";
import type { SceneAsset } from "./assets.js";

const FALLBACK_GRADIENTS = [
  "linear-gradient(160deg, #0a1628 0%, #0f2a1f 55%, #041018 100%)",
  "linear-gradient(160deg, #0f2a1f 0%, #1a1208 60%, #06140c 100%)",
  "linear-gradient(160deg, #1a1208 0%, #0c1f2e 55%, #100c08 100%)",
  "linear-gradient(160deg, #0c1f2e 0%, #082018 50%, #061018 100%)",
  "linear-gradient(160deg, #1c1410 0%, #0a1628 55%, #0c0a08 100%)",
  "linear-gradient(160deg, #082018 0%, #1a1208 50%, #06140c 100%)",
];

function chunkWords(text: string, maxWords: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

export type TimelinePlan = {
  scenes: SceneCard[];
  captions: CaptionCue[];
  durationInFrames: number;
  captionStyle: "explainer" | "minimal";
};

function captionsFromWords(
  words: WordTiming[],
  durationInFrames: number,
  wordsPerCue = 4,
): CaptionCue[] {
  if (!words.length) return [];
  const cues: CaptionCue[] = [];
  for (let i = 0; i < words.length; i += wordsPerCue) {
    const slice = words.slice(i, i + wordsPerCue);
    const text = slice.map((w) => w.word).join(" ").replace(/\s+/g, " ").trim();
    const startFrame = Math.max(0, Math.round(slice[0]!.start * FPS));
    const endFrame = Math.min(
      durationInFrames,
      Math.max(startFrame + 1, Math.round(slice[slice.length - 1]!.end * FPS)),
    );
    if (text) cues.push({ text, startFrame, endFrame });
  }
  return cues;
}

function captionsFromBeats(
  script: ShortScript,
  windows: BeatWindow[],
  durationInFrames: number,
): CaptionCue[] {
  const captions: CaptionCue[] = [];
  script.beats.forEach((beat, index) => {
    const win = windows[index];
    if (!win) return;
    const startFrame = Math.round(win.startSeconds * FPS);
    const endFrame = Math.round(win.endSeconds * FPS);
    const pieces = chunkWords(beat.narration, 4);
    if (!pieces.length) return;
    const pieceLen = Math.max(1, Math.floor((endFrame - startFrame) / pieces.length));
    pieces.forEach((text, i) => {
      const cStart = startFrame + i * pieceLen;
      const cEnd =
        i === pieces.length - 1 ? endFrame : Math.min(endFrame, cStart + pieceLen);
      captions.push({
        text,
        startFrame: Math.max(0, cStart),
        endFrame: Math.min(durationInFrames, Math.max(cStart + 1, cEnd)),
      });
    });
  });
  return captions;
}

/**
 * Build Remotion scene + caption timelines locked to VO beat windows.
 */
export function planTimeline(opts: {
  script: ShortScript;
  durationSeconds: number;
  beatWindows: BeatWindow[];
  assets: SceneAsset[];
  words?: WordTiming[] | null;
  captionStyle?: "explainer" | "minimal";
}): TimelinePlan {
  const durationInFrames = Math.max(1, Math.round(opts.durationSeconds * FPS));
  const assetByBeat = new Map(opts.assets.map((a) => [a.beatId, a]));
  const captionStyle = opts.captionStyle ?? "explainer";

  const scenes: SceneCard[] = opts.script.beats.map((beat, index) => {
    const win = opts.beatWindows[index] ?? {
      beatId: beat.id,
      startSeconds: 0,
      endSeconds: opts.durationSeconds,
    };
    const startFrame = Math.round(win.startSeconds * FPS);
    const endFrame = Math.min(
      durationInFrames,
      Math.max(startFrame + 1, Math.round(win.endSeconds * FPS)),
    );
    const asset = assetByBeat.get(beat.id);

    return {
      id: beat.id,
      onScreenText: beat.onScreenText,
      startFrame,
      endFrame,
      background: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length]!,
      mediaFile: asset?.fileName,
      mediaKind: asset?.kind === "video" ? "video" : asset ? "image" : undefined,
    };
  });

  // Fix last scene to exact duration; ensure contiguous frames
  if (scenes.length) {
    scenes[0]!.startFrame = 0;
    scenes[scenes.length - 1]!.endFrame = durationInFrames;
    for (let i = 1; i < scenes.length; i++) {
      scenes[i]!.startFrame = scenes[i - 1]!.endFrame;
    }
  }

  const captions = opts.words?.length
    ? captionsFromWords(opts.words, durationInFrames)
    : captionsFromBeats(opts.script, opts.beatWindows, durationInFrames);

  return { scenes, captions, durationInFrames, captionStyle };
}
