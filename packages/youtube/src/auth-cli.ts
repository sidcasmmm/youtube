#!/usr/bin/env node
/**
 * One-time OAuth: open browser → capture refresh token → print .env lines.
 * Never writes secrets to disk except what you paste into .env yourself.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import open from "open";
import {
  buildAuthUrl,
  captureAuthCode,
  createOAuth2Client,
  exchangeCodeForRefreshToken,
} from "./oauth.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
loadEnv({ path: path.join(repoRoot, ".env") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const DEFAULT_REDIRECT = "http://localhost:8765/oauth2callback";

function printHelp(): void {
  console.log(`youtube-auth — obtain YOUTUBE_REFRESH_TOKEN (M4 spike)

Prerequisites:
  1. Google Cloud project + YouTube Data API v3 enabled
  2. OAuth client (Desktop or Web) with redirect URI:
       ${DEFAULT_REDIRECT}
  3. YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env

Usage:
  npm run youtube:auth

Then paste the printed refresh token into .env as YOUTUBE_REFRESH_TOKEN.
See docs/youtube-oauth-setup.md.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI?.trim() || DEFAULT_REDIRECT;

  if (!clientId || !clientSecret) {
    console.error(
      "Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env.\nSee docs/youtube-oauth-setup.md",
    );
    process.exitCode = 1;
    return;
  }

  const client = createOAuth2Client({ clientId, clientSecret, redirectUri });
  const authUrl = buildAuthUrl(client);

  console.log("Waiting for Google OAuth on", redirectUri);
  console.log("\nOpen this URL if the browser does not open:\n");
  console.log(authUrl);
  console.log("");

  const wait = captureAuthCode(redirectUri);
  try {
    await open(authUrl);
  } catch {
    console.warn("(Could not auto-open browser — paste the URL manually.)");
  }

  const code = await wait;
  const { refreshToken } = await exchangeCodeForRefreshToken(client, code);

  console.log("\nSuccess. Add this to your local .env (never commit):\n");
  console.log(`YOUTUBE_CLIENT_ID=${clientId}`);
  console.log(`YOUTUBE_CLIENT_SECRET=${clientSecret}`);
  console.log(`YOUTUBE_REFRESH_TOKEN=${refreshToken}`);
  console.log(`YOUTUBE_REDIRECT_URI=${redirectUri}`);
  console.log(`# YOUTUBE_PRIVACY_STATUS=private`);
  console.log("\nThen: npm run upload-youtube");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
