import { createServer } from "node:http";
import { google } from "googleapis";
import type { YoutubeCredentials } from "./credentials.js";

/** Upload + manage own videos (videos.insert). */
export const YOUTUBE_UPLOAD_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

export function createOAuth2Client(
  creds: Pick<
    YoutubeCredentials,
    "clientId" | "clientSecret" | "redirectUri"
  > & { refreshToken?: string },
) {
  const client = new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    creds.redirectUri,
  );
  if (creds.refreshToken) {
    client.setCredentials({ refresh_token: creds.refreshToken });
  }
  return client;
}

export function buildAuthUrl(
  client: ReturnType<typeof createOAuth2Client>,
): string {
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...YOUTUBE_UPLOAD_SCOPES],
  });
}

/**
 * Start a one-shot localhost callback server, exchange code → tokens.
 * Used by `npm run youtube:auth`.
 */
export async function captureAuthCode(
  redirectUri: string,
  timeoutMs = 5 * 60_000,
): Promise<string> {
  const url = new URL(redirectUri);
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(
      `Auth callback must be localhost for the CLI spike (got ${url.hostname}).`,
    );
  }
  const port = Number(url.port || 80);
  const expectedPath = url.pathname || "/";

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
        if (reqUrl.pathname !== expectedPath) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const err = reqUrl.searchParams.get("error");
        if (err) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h1>OAuth error</h1><p>${err}</p>`);
          cleanup();
          reject(new Error(`OAuth error: ${err}`));
          return;
        }
        const code = reqUrl.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>Missing code</h1>");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>YouTube connected</h1><p>You can close this tab and return to the terminal.</p>",
        );
        cleanup();
        resolve(code);
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for OAuth callback."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      server.close();
    };

    server.on("error", (e) => {
      cleanup();
      reject(e);
    });

    server.listen(port, "127.0.0.1");
  });
}

export async function exchangeCodeForRefreshToken(
  client: ReturnType<typeof createOAuth2Client>,
  code: string,
): Promise<{ refreshToken: string; accessToken?: string | null }> {
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token returned. Revoke prior grant at https://myaccount.google.com/permissions then re-run with prompt=consent (this CLI already requests it).",
    );
  }
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
  };
}
