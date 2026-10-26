export type CaptionCue = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type SceneCard = {
  id: string;
  onScreenText: string;
  startFrame: number;
  endFrame: number;
  /** CSS gradient or solid color */
  background: string;
};

export type ShortCompositionProps = {
  audioFile: string;
  title: string;
  scenes: SceneCard[];
  captions: CaptionCue[];
  durationInFrames: number;
};

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;