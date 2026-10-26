import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle, type WebpackOverrideFn } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ShortCompositionProps } from "./types";
import { FPS, HEIGHT, WIDTH } from "./types";

// Resolve package root whether running from src/ (tsx) or dist/
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const entryPoint = path.join(packageRoot, "src", "entry.ts");

const webpackOverride: WebpackOverrideFn = (config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      extensionAlias: {
        ...(config.resolve?.extensionAlias ?? {}),
        ".js": [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  };
};

export type RenderShortInput = {
  props: ShortCompositionProps;
  outputPath: string;
  /** Absolute path to workDir for Remotion temp files */
  workDir?: string;
  /**
   * Directory served as Remotion public/ (must contain the VO basename).
   * Defaults to the directory of props.audioFile.
   */
  publicDir?: string;
};

export async function renderShort(input: RenderShortInput): Promise<string> {
  const publicDir =
    input.publicDir ?? path.dirname(path.resolve(input.props.audioFile));
  const audioBase = path.basename(input.props.audioFile);

  // Bundle per render so runtime VO in publicDir is included (M1: short clips).
  // Disable webpack cache so publicDir assets are always copied into the serve folder.
  const serveUrl = await bundle({
    entryPoint,
    publicDir,
    enableCaching: false,
    onProgress: () => undefined,
    webpackOverride,
  });

  const inputProps: ShortCompositionProps = {
    ...input.props,
    audioFile: audioBase,
  };

  const composition = await selectComposition({
    serveUrl,
    id: "Short",
    inputProps,
  });

  await renderMedia({
    composition: {
      ...composition,
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      durationInFrames: input.props.durationInFrames,
    },
    serveUrl,
    codec: "h264",
    outputLocation: input.outputPath,
    inputProps,
    audioCodec: "aac",
    ...(input.workDir ? { workDir: input.workDir } : {}),
  });

  return input.outputPath;
}
