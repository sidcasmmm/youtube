export {
  generateShort,
  type GenerateOptions,
  type GenerateResult,
} from "./generate.js";
export { buildScript, SAMPLE_TOPICS, MOCK_SCRIPT } from "./stages/script.js";
export {
  synthesizeSpeech,
  scriptToNarration,
  probeDurationSeconds,
} from "./stages/tts.js";
export { planTimeline } from "./stages/timeline.js";
export { fetchSceneAssets } from "./stages/assets.js";
export {
  alignBeatsToVoiceover,
  transcribeWordTimings,
} from "./stages/align.js";
export { exportShortMp4, validateVerticalMp4 } from "./stages/export.js";
