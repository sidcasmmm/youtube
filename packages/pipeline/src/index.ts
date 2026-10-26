export { generateShort, type GenerateOptions, type GenerateResult } from "./generate.js";
export { buildScript } from "./stages/script.js";
export {
  synthesizeSpeech,
  scriptToNarration,
  probeDurationSeconds,
} from "./stages/tts.js";
export { planTimeline } from "./stages/timeline.js";
export { exportShortMp4, validateVerticalMp4 } from "./stages/export.js";