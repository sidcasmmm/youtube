#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  getYoutubeCredentialStatus,
  missingCredentialHints,
} from "./credentials.js";
import { findLatestShortMp4 } from "./find-latest.js";
import {
  buildShortsDescription,
  readScriptMeta,
  uploadShortToYoutube,
  type UploadPrivacy,
} from "./upload.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

function printHelp(): void {
  console.log(`upload-youtube — upload a vertical MP4 as a YouTube Short (M4 spike)

Usage:
  npm run upload-youtube
  npm run upload-youtube -- --file output/short-…/short.mp4
  npm run upload-youtube -- --latest
  npm run upload-youtube -- --title "Why is space silent?" --privacy private

Options:
  --file <path>     MP4 to upload (default: newest output/*/short.mp4)
  --latest          Same as default — find newest short.mp4 under output/
  --title <text>    Override title (default: script.json title or filename)
  --description <t> Override description
  --privacy <s>     private | unlisted | public (default: env or private)
  --out <dir>       Output root when using --latest (default: ./output)
  --help            Show this help

Requires YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN.
Run npm run youtube:auth once after creating the OAuth client.
Docs: docs/youtube-oauth-setup.md
`);
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const status = getYoutubeCredentialStatus();
  if (!status.configured) {
    console.error(
      `Missing YouTube OAuth env: ${missingCredentialHints(status).join(", ")}`,
    );
    console.error("See docs/youtube-oauth-setup.md — then npm run youtube:auth");
    process.exitCode = 1;
    return;
  }

  const outDir = getFlag(args, "--out");
  const outputRoot = outDir
    ? path.resolve(outDir)
    : path.join(repoRoot, "output");
  const fileArg = getFlag(args, "--file");
  const titleArg = getFlag(args, "--title");
  const descriptionArg = getFlag(args, "--description");
  const privacyArg = getFlag(args, "--privacy") as UploadPrivacy | undefined;

  let mp4Path: string;
  let scriptPath: string | null = null;

  if (fileArg) {
    mp4Path = path.resolve(fileArg);
    const sibling = path.join(path.dirname(mp4Path), "script.json");
    scriptPath = sibling;
  } else {
    const latest = await findLatestShortMp4(outputRoot);
    if (!latest) {
      console.error(
        `No short.mp4 found under ${outputRoot}. Generate one first:\n  npm run generate -- --mock`,
      );
      process.exitCode = 1;
      return;
    }
    mp4Path = latest.mp4Path;
    scriptPath = latest.scriptPath;
    console.log(`Using latest: ${mp4Path}`);
  }

  const meta = scriptPath ? await readScriptMeta(scriptPath) : null;
  const title =
    titleArg?.trim() ||
    meta?.title?.trim() ||
    path.basename(path.dirname(mp4Path));
  const description =
    descriptionArg ??
    buildShortsDescription({
      cta: meta?.cta,
      hashtags: meta?.captionHashtags,
    });

  console.log(`Uploading as Short: "${title}" (${privacyArg ?? process.env.YOUTUBE_PRIVACY_STATUS ?? "private"})…`);

  const result = await uploadShortToYoutube({
    mp4Path,
    title,
    description,
    tags: meta?.captionHashtags?.map((t) => t.replace(/^#/, "")),
    privacyStatus: privacyArg,
  });

  console.log("Uploaded.");
  console.log(`  videoId:  ${result.videoId}`);
  console.log(`  watch:    ${result.watchUrl}`);
  console.log(`  studio:   ${result.studioUrl}`);
  console.log(`  privacy:  ${result.privacyStatus}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
