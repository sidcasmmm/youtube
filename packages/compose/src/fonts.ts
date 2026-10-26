import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadIbmPlexSans } from "@remotion/google-fonts/IBMPlexSans";

const sora = loadSora("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});
const ibm = loadIbmPlexSans("normal", {
  weights: ["600"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

/** On-screen punch / scene titles — font 1 */
export const displayFontFamily = sora.fontFamily;
/** Burned-in captions — font 2 */
export const captionFontFamily = ibm.fontFamily;

export type CaptionPreset = {
  id: "explainer" | "minimal";
  sceneFontSize: number;
  captionFontSize: number;
  captionBg: string;
  captionPadding: string;
  captionRadius: number;
  titleOpacity: number;
};

export const CAPTION_PRESETS: Record<"explainer" | "minimal", CaptionPreset> = {
  explainer: {
    id: "explainer",
    sceneFontSize: 68,
    captionFontSize: 48,
    captionBg: "rgba(0,0,0,0.78)",
    captionPadding: "16px 26px",
    captionRadius: 12,
    titleOpacity: 0.7,
  },
  minimal: {
    id: "minimal",
    sceneFontSize: 64,
    captionFontSize: 46,
    captionBg: "rgba(0,0,0,0.55)",
    captionPadding: "12px 22px",
    captionRadius: 8,
    titleOpacity: 0.55,
  },
};
