import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { google } from "googleapis";
import {
  loadYoutubeCredentials,
  missingCredentialHints,
} from "./credentials.js";
import { createOAuth2Client } from "./oauth.js";

export type UploadPrivacy = "private" | "unlisted" | "public";

export type YoutubeUploadOptions = {
  mp4Path: string;
  title: string;
  description?: string;
  tags?: string[];
  /** Default private for the spike — safer while testing OAuth. */
  privacyStatus?: UploadPrivacy;
  /** YouTube category: 27 = Education (good for Things explained). */
  categoryId?: string;
  /** Append #Shorts if missing (helps Shorts shelf). */
  ensureShortsHashtag?: boolean;
};

export type YoutubeUploadResult = {
  videoId: string;
  watchUrl: string;
  studioUrl: string;
  title: string;
  privacyStatus: UploadPrivacy;
};

export type ScriptMeta = {
  title?: string;
  cta?: string;
  captionHashtags?: string[];
};

export async function readScriptMeta(
  scriptPath: string,
): Promise<ScriptMeta | null> {
  try {
    const raw = await readFile(scriptPath, "utf8");
    const data = JSON.parse(raw) as ScriptMeta;
    return data;
  } catch {
    return null;
  }
}

export function buildShortsDescription(opts: {
  cta?: string;
  hashtags?: string[];
  ensureShortsHashtag?: boolean;
}): string {
  const parts: string[] = [];
  if (opts.cta?.trim()) parts.push(opts.cta.trim());
  const tags = [...(opts.hashtags ?? [])];
  const ensure = opts.ensureShortsHashtag !== false;
  const hasShorts = tags.some((t) => t.replace(/^#/, "").toLowerCase() === "shorts");
  if (ensure && !hasShorts) tags.push("#Shorts");
  if (tags.length) {
    parts.push(
      tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" "),
    );
  } else if (ensure) {
    parts.push("#Shorts");
  }
  return parts.join("\n\n");
}

export async function uploadShortToYoutube(
  options: YoutubeUploadOptions,
  env: NodeJS.ProcessEnv = process.env,
): Promise<YoutubeUploadResult> {
  const creds = loadYoutubeCredentials(env);
  if (!creds) {
    const missing = missingCredentialHints();
    throw new Error(
      `YouTube credentials incomplete. Set ${missing.join(", ")} in .env (see docs/youtube-oauth-setup.md).`,
    );
  }

  const mp4Path = path.resolve(options.mp4Path);
  const fileStat = await stat(mp4Path);
  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${mp4Path}`);
  }
  if (!mp4Path.toLowerCase().endsWith(".mp4")) {
    throw new Error(`Expected an .mp4 file: ${mp4Path}`);
  }

  const privacyStatus: UploadPrivacy =
    options.privacyStatus ??
    (env.YOUTUBE_PRIVACY_STATUS as UploadPrivacy | undefined) ??
    "private";
  if (!["private", "unlisted", "public"].includes(privacyStatus)) {
    throw new Error(`Invalid privacyStatus: ${privacyStatus}`);
  }

  let title = options.title.trim().slice(0, 100) || "Things explained";
  const ensureShorts = options.ensureShortsHashtag !== false;
  if (ensureShorts && !/#shorts/i.test(title) && title.length < 92) {
    title = `${title} #Shorts`;
  }

  const description =
    options.description ??
    buildShortsDescription({ ensureShortsHashtag: ensureShorts });

  const auth = createOAuth2Client(creds);
  const youtube = google.youtube({ version: "v3", auth });

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description,
        tags: options.tags,
        categoryId: options.categoryId ?? "27",
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(mp4Path),
    },
  });

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error("YouTube videos.insert returned no video id.");
  }

  return {
    videoId,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
    title,
    privacyStatus,
  };
}
