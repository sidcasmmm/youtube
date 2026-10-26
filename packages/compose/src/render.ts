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
   * Directory served as Remotion public/ (VO + assets relative paths).
   * Defaults to the directory of props.audioFile when audioFile is absolute,
   * otherwise the parent of the first media scene path is not inferred — pass explicitly.
   */
  publicDir?: string;
};

function toPublicRelative(file: string, publicDir: string): string {
  if (
    file.startsWith("http://") ||
    file.startsWith("https://") ||
    file.startsWith("data:")
  ) {
    return file;
  }
  const abs = path.resolve(file);
  const root = path.resolve(publicDir);
  if (abs.startsWith(root + path.sep) || abs === root) {
    return path.relative(root, abs).split(path.sep).join("/");
  }
  // Already a public-relative path (e.g. voiceover.mp3 or assets/foo.jpg)
  return file.split(path.sep).join("/");
}

export async function renderShort(input: RenderShortInput): Promise<string> {
  const publicDir =
    input.publicDir ??
    (path.isAbsolute(input.props.audioFile)
      ? path.dirname(path.resolve(input.props.audioFile))
      : path.resolve(process.cwd()));

  const serveUrl = await bundle({
    entryPoint,
    publicDir,
    enableCaching: false,
    onProgress: () => undefined,
    webpackOverride,
  });

  const inputProps: ShortCompositionProps = {
    ...input.props,
    audioFile: toPublicRelative(input.props.audioFile, publicDir),
    scenes: input.props.scenes.map((scene) => ({
      ...scene,
      mediaFile: scene.mediaFile
        ? toPublicRelative(scene.mediaFile, publicDir)
        : scene.mediaFile,
    })),
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
