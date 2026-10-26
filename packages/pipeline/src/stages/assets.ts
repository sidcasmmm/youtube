import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ShortScript } from "@shorts/prompts";

const execFileAsync = promisify(execFile);

export type SceneAsset = {
  beatId: string;
  /** Basename under publicDir (Remotion staticFile) */
  fileName: string;
  absolutePath: string;
  kind: "image" | "video" | "placeholder";
  source: "pexels" | "pixabay" | "mock";
  query: string;
  attribution?: string;
  pageUrl?: string;
};

export type AssetsResult = {
  assetsDir: string;
  scenes: SceneAsset[];
  attributionPath: string;
};

type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: { large2x?: string; large?: string; original?: string; portrait?: string };
};

type PixabayHit = {
  id: number;
  pageURL: string;
  largeImageURL?: string;
  webformatURL?: string;
  user: string;
};

const MOCK_COLORS = [
  "#0a1628",
  "#0f2a1f",
  "#1a1208",
  "#0c1f2e",
  "#1c1410",
  "#082018",
];

function stockQueryForBeat(
  beat: ShortScript["beats"][number],
  title: string,
): string {
  const hint = beat.stockQuery?.trim() || beat.visualHint?.trim();
  if (hint) return hint;
  return `${title} ${beat.onScreenText}`.slice(0, 80);
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "shorts-mvp/0.2 (educational; attribution recorded)" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed ${res.status} for ${url}`);
  }
  // Node 18+ fetch body is a web stream; convert via arrayBuffer for simplicity
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

async function searchPexels(
  query: string,
  apiKey: string,
): Promise<{ url: string; attribution: string; pageUrl: string } | null> {
  const endpoint = new URL("https://api.pexels.com/v1/search");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("per_page", "5");
  endpoint.searchParams.set("orientation", "portrait");

  const res = await fetch(endpoint, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    console.warn(`[assets] Pexels search failed (${res.status}) for "${query}"`);
    return null;
  }
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  const photo = data.photos?.[0];
  if (!photo) return null;
  const url =
    photo.src.portrait ??
    photo.src.large2x ??
    photo.src.large ??
    photo.src.original;
  if (!url) return null;
  return {
    url,
    pageUrl: photo.url,
    attribution: `Photo by ${photo.photographer} on Pexels (${photo.photographer_url})`,
  };
}

async function searchPixabay(
  query: string,
  apiKey: string,
): Promise<{ url: string; attribution: string; pageUrl: string } | null> {
  const endpoint = new URL("https://pixabay.com/api/");
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("image_type", "photo");
  endpoint.searchParams.set("orientation", "vertical");
  endpoint.searchParams.set("safesearch", "true");
  endpoint.searchParams.set("per_page", "5");

  const res = await fetch(endpoint);
  if (!res.ok) {
    console.warn(`[assets] Pixabay search failed (${res.status}) for "${query}"`);
    return null;
  }
  const data = (await res.json()) as { hits?: PixabayHit[] };
  const hit = data.hits?.[0];
  if (!hit) return null;
  const url = hit.largeImageURL ?? hit.webformatURL;
  if (!url) return null;
  return {
    url,
    pageUrl: hit.pageURL,
    attribution: `Image by ${hit.user} on Pixabay`,
  };
}

async function makeMockStill(
  dest: string,
  color: string,
  _label: string,
): Promise<void> {
  // Soft vignette still (1080×1920) — stands in for stock when no API key.
  // Query text stays in attribution.json only (not burned into the frame).
  void _label;
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=1080x1920:d=1`,
    "-vf",
    [
      `vignette=PI/5`,
      `noise=alls=8:allf=t`,
      `eq=contrast=1.05:brightness=-0.02`,
    ].join(","),
    "-frames:v",
    "1",
    dest,
  ]);
}

/**
 * Resolve one still (or mock placeholder) per beat.
 * Prefers Pexels → Pixabay → mock lavfi stills.
 */
export async function fetchSceneAssets(opts: {
  script: ShortScript;
  outDir: string;
  mock?: boolean;
  pexelsKey?: string;
  pixabayKey?: string;
}): Promise<AssetsResult> {
  const assetsDir = path.join(opts.outDir, "assets");
  await mkdir(assetsDir, { recursive: true });

  const pexelsKey = opts.pexelsKey ?? process.env.PEXELS_API_KEY;
  const pixabayKey = opts.pixabayKey ?? process.env.PIXABAY_API_KEY;
  const forceMock = Boolean(opts.mock) || (!pexelsKey && !pixabayKey);

  if (forceMock && !opts.mock && !pexelsKey && !pixabayKey) {
    console.warn(
      "[assets] No PEXELS_API_KEY / PIXABAY_API_KEY — using mock B-roll stills.",
    );
  }

  const scenes: SceneAsset[] = [];

  for (let i = 0; i < opts.script.beats.length; i++) {
    const beat = opts.script.beats[i]!;
    const query = stockQueryForBeat(beat, opts.script.title);
    const fileName = `scene-${String(i).padStart(2, "0")}-${beat.id}.jpg`;
    const absolutePath = path.join(assetsDir, fileName);

    let resolved:
      | { url: string; attribution: string; pageUrl: string; source: "pexels" | "pixabay" }
      | null = null;

    if (!forceMock) {
      if (pexelsKey) {
        const hit = await searchPexels(query, pexelsKey);
        if (hit) resolved = { ...hit, source: "pexels" };
      }
      if (!resolved && pixabayKey) {
        const hit = await searchPixabay(query, pixabayKey);
        if (hit) resolved = { ...hit, source: "pixabay" };
      }
    }

    if (resolved) {
      try {
        await downloadFile(resolved.url, absolutePath);
        scenes.push({
          beatId: beat.id,
          fileName,
          absolutePath,
          kind: "image",
          source: resolved.source,
          query,
          attribution: resolved.attribution,
          pageUrl: resolved.pageUrl,
        });
        continue;
      } catch (err) {
        console.warn(
          `[assets] Download failed for "${query}", falling back to mock:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    await makeMockStill(
      absolutePath,
      MOCK_COLORS[i % MOCK_COLORS.length]!,
      query,
    );
    scenes.push({
      beatId: beat.id,
      fileName,
      absolutePath,
      kind: "placeholder",
      source: "mock",
      query,
      attribution: "Mock B-roll (no stock API key)",
    });
  }

  const attributionPath = path.join(opts.outDir, "attribution.json");
  await writeFile(
    attributionPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        music: "VO-only (no bed in M2)",
        scenes: scenes.map((s) => ({
          beatId: s.beatId,
          query: s.query,
          source: s.source,
          kind: s.kind,
          attribution: s.attribution,
          pageUrl: s.pageUrl,
          fileName: s.fileName,
        })),
      },
      null,
      2,
    ),
  );

  return { assetsDir, scenes, attributionPath };
}
