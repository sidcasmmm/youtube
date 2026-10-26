import { createReadStream } from "node:fs";
import OpenAI from "openai";
import type { ShortScript } from "@shorts/prompts";

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

export type BeatWindow = {
  beatId: string;
  startSeconds: number;
  endSeconds: number;
};

function normalizeToken(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * Whisper word timestamps when OPENAI_API_KEY is available.
 * Falls back to null so callers can use narration-weighted VO lock.
 */
export async function transcribeWordTimings(opts: {
  audioPath: string;
  mock?: boolean;
  apiKey?: string;
}): Promise<WordTiming[] | null> {
  if (opts.mock) return null;
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });
    const result = await client.audio.transcriptions.create({
      file: createReadStream(opts.audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const words = (
      result as unknown as { words?: Array<{ word: string; start: number; end: number }> }
    ).words;
    if (!words?.length) return null;

    return words.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));
  } catch (err) {
    console.warn(
      "[align] Whisper word timings unavailable — using narration-weighted VO lock:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Map each beat onto the VO timeline.
 * Prefer Whisper word alignment; otherwise distribute by narration word count
 * across the full probed VO duration (cuts stay locked to audio length).
 */
export function alignBeatsToVoiceover(opts: {
  script: ShortScript;
  durationSeconds: number;
  words?: WordTiming[] | null;
}): BeatWindow[] {
  const { script, durationSeconds, words } = opts;
  const beats = script.beats;

  if (words && words.length > 0) {
    return alignWithWhisperWords(beats, words, durationSeconds);
  }

  return alignByWordCount(beats, durationSeconds);
}

function alignByWordCount(
  beats: ShortScript["beats"],
  durationSeconds: number,
): BeatWindow[] {
  const counts = beats.map((b) => {
    const n = b.narration.trim().split(/\s+/).filter(Boolean).length;
    const weight = b.weight ?? 1;
    return Math.max(1, n) * weight;
  });
  const total = counts.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return beats.map((beat, i) => {
    const share = counts[i]! / total;
    const startSeconds = cursor;
    const endSeconds =
      i === beats.length - 1
        ? durationSeconds
        : Math.min(durationSeconds, cursor + durationSeconds * share);
    cursor = endSeconds;
    return { beatId: beat.id, startSeconds, endSeconds };
  });
}

function alignWithWhisperWords(
  beats: ShortScript["beats"],
  words: WordTiming[],
  durationSeconds: number,
): BeatWindow[] {
  const tokens = words.map((w) => ({
    ...w,
    norm: normalizeToken(w.word),
  }));

  let wordIndex = 0;
  const windows: BeatWindow[] = [];

  for (let bi = 0; bi < beats.length; bi++) {
    const beat = beats[bi]!;
    const beatTokens = beat.narration
      .trim()
      .split(/\s+/)
      .map(normalizeToken)
      .filter(Boolean);

    const startWord = tokens[Math.min(wordIndex, tokens.length - 1)];
    let matched = 0;
    let endIdx = wordIndex;

    while (endIdx < tokens.length && matched < beatTokens.length) {
      if (tokens[endIdx]!.norm === beatTokens[matched]) {
        matched += 1;
      } else if (matched > 0 && tokens[endIdx]!.norm === beatTokens[0]) {
        // resync soft drift
        matched = 1;
      }
      endIdx += 1;
    }

    if (matched === 0) {
      // Could not match — fall back remaining proportionally
      const remainingBeats = beats.length - bi;
      const remainingWords = Math.max(1, tokens.length - wordIndex);
      const slice = Math.ceil(remainingWords / remainingBeats);
      endIdx = Math.min(tokens.length, wordIndex + slice);
    }

    const endWord = tokens[Math.max(wordIndex, endIdx - 1)] ?? tokens[tokens.length - 1]!;
    const startSeconds = bi === 0 ? 0 : (startWord?.start ?? 0);
    let endSeconds =
      bi === beats.length - 1 ? durationSeconds : (endWord?.end ?? durationSeconds);

    if (endSeconds <= startSeconds) {
      endSeconds = Math.min(durationSeconds, startSeconds + 0.4);
    }

    windows.push({
      beatId: beat.id,
      startSeconds,
      endSeconds,
    });
    wordIndex = Math.max(wordIndex + 1, endIdx);
  }

  // Ensure contiguous cover of [0, duration]
  if (windows.length) {
    windows[0]!.startSeconds = 0;
    windows[windows.length - 1]!.endSeconds = durationSeconds;
    for (let i = 1; i < windows.length; i++) {
      windows[i]!.startSeconds = windows[i - 1]!.endSeconds;
    }
  }

  return windows;
}
