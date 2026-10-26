export {
  getYoutubeCredentialStatus,
  loadYoutubeCredentials,
  missingCredentialHints,
  type YoutubeCredentials,
  type YoutubeCredentialStatus,
} from "./credentials.js";
export {
  YOUTUBE_UPLOAD_SCOPES,
  createOAuth2Client,
  buildAuthUrl,
  captureAuthCode,
  exchangeCodeForRefreshToken,
} from "./oauth.js";
export { findLatestShortMp4, type LatestShort } from "./find-latest.js";
export {
  uploadShortToYoutube,
  buildShortsDescription,
  readScriptMeta,
  type UploadPrivacy,
  type YoutubeUploadOptions,
  type YoutubeUploadResult,
  type ScriptMeta,
} from "./upload.js";
