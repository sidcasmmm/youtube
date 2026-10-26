/**
 * YouTube Data API OAuth credentials from env.
 * Never log or return secret values to clients.
 */

export type YoutubeCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri: string;
};

export type YoutubeCredentialStatus = {
  configured: boolean;
  clientId: boolean;
  clientSecret: boolean;
  refreshToken: boolean;
};

const DEFAULT_REDIRECT = "http://localhost:8765/oauth2callback";

export function getYoutubeCredentialStatus(
  env: NodeJS.ProcessEnv = process.env,
): YoutubeCredentialStatus {
  const clientId = Boolean(env.YOUTUBE_CLIENT_ID?.trim());
  const clientSecret = Boolean(env.YOUTUBE_CLIENT_SECRET?.trim());
  const refreshToken = Boolean(env.YOUTUBE_REFRESH_TOKEN?.trim());
  return {
    configured: clientId && clientSecret && refreshToken,
    clientId,
    clientSecret,
    refreshToken,
  };
}

export function loadYoutubeCredentials(
  env: NodeJS.ProcessEnv = process.env,
): YoutubeCredentials | null {
  const clientId = env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = env.YOUTUBE_CLIENT_SECRET?.trim();
  const refreshToken = env.YOUTUBE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    redirectUri:
      env.YOUTUBE_REDIRECT_URI?.trim() || DEFAULT_REDIRECT,
  };
}

export function missingCredentialHints(
  status: YoutubeCredentialStatus = getYoutubeCredentialStatus(),
): string[] {
  const missing: string[] = [];
  if (!status.clientId) missing.push("YOUTUBE_CLIENT_ID");
  if (!status.clientSecret) missing.push("YOUTUBE_CLIENT_SECRET");
  if (!status.refreshToken) missing.push("YOUTUBE_REFRESH_TOKEN");
  return missing;
}
