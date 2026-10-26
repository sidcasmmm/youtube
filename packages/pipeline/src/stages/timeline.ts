import { FPS, type CaptionCue, type SceneCard } from "@shorts/compose";
import type { ShortScript } from "@shorts/prompts";

const GRADIENTS = [
  "linear-gradient(160deg, #0f766e 0%, #134e4a 55%, #042f2e 100%)",
  "linear-gradient(160deg, #1e3a5f 0%, #0f172a 60%, #020617 100%)",
  "linear-gradient(160deg, #7c2d12 0%, #431407 55%, #1c1917 100%)",
  "linear-gradient(160deg, #365314 0%, #14532d 50%, #052e16 100%)",
  "linear-gradient(160deg, #4c1d95 0%, #1e1b4b 55%, #0f172a 100%)",
  "linear-gradient(160deg, #155e75 0%, #164e63 50%, #083344 100%)",
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
};

/**
 * M1 timing: distribute frames by beat weight across probed VO duration.
 * Captions are naive word chunks (Whisper/forced-align lands in M2).
 */
export function planTimeline(
  script: ShortScript,
  durationSeconds: number,
): TimelinePlan {
  const durationInFrames = Math.max(1, Math.round(durationSeconds * FPS));
  const weights = script.beats.map((b) => b.weight ?? 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let cursor = 0;
  const scenes: SceneCard[] = [];
  const captions: CaptionCue[] = [];

  script.beats.forEach((beat, index) => {
    const share = weights[index]! / totalWeight;
    const len = Math.max(
      1,
      index === script.beats.length - 1
        ? durationInFrames - cursor
        : Math.round(durationInFrames * share),
    );
    const startFrame = cursor;
    const endFrame = Math.min(durationInFrames, cursor + len);
    cursor = endFrame;

    scenes.push({
      id: beat.id,
      onScreenText: beat.onScreenText,
      startFrame,
      endFrame,
      background: GRADIENTS[index % GRADIENTS.length]!,
    });

    const pieces = chunkWords(beat.narration, 5);
    if (pieces.length === 0) return;
    const pieceLen = Math.max(1, Math.floor((endFrame - startFrame) / pieces.length));
    pieces.forEach((text, i) => {
      const cStart = startFrame + i * pieceLen;
      const cEnd =
        i === pieces.length - 1 ? endFrame : Math.min(endFrame, cStart + pieceLen);
      captions.push({ text, startFrame: cStart, endFrame: cEnd });
    });
  });

  return { scenes, captions, durationInFrames };
}