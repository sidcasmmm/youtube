import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type LatestShort = {
  mp4Path: string;
  runDir: string;
  mtimeMs: number;
  scriptPath: string | null;
};

/**
 * Find the newest `short.mp4` under output/short-* (or sample-*) run dirs.
 */
export async function findLatestShortMp4(
  outputRoot: string,
): Promise<LatestShort | null> {
  let entries: string[];
  try {
    entries = await readdir(outputRoot);
  } catch {
    return null;
  }

  const candidates: LatestShort[] = [];
  for (const name of entries) {
    const runDir = path.join(outputRoot, name);
    const mp4Path = path.join(runDir, "short.mp4");
    try {
      const s = await stat(mp4Path);
      if (!s.isFile()) continue;
      const scriptPath = path.join(runDir, "script.json");
      let hasScript = false;
      try {
        hasScript = (await stat(scriptPath)).isFile();
      } catch {
        hasScript = false;
      }
      candidates.push({
        mp4Path,
        runDir,
        mtimeMs: s.mtimeMs,
        scriptPath: hasScript ? scriptPath : null,
      });
    } catch {
      /* skip */
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0] ?? null;
}
