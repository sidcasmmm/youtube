export type CaptionCue = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type CaptionStyleId = "explainer" | "minimal";

export type SceneCard = {
  id: string;
  onScreenText: string;
  startFrame: number;
  endFrame: number;
  /** CSS gradient or solid color (fallback when no media) */
  background: string;
  /** Basename under Remotion publicDir */
  mediaFile?: string;
  mediaKind?: "image" | "video";
};

export type ShortCompositionProps = {
  audioFile: string;
  title: string;
  scenes: SceneCard[];
  captions: CaptionCue[];
  durationInFrames: number;
  /** Caption / on-screen typography preset (1–2 fonts) */
  captionStyle?: CaptionStyleId;
};

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
