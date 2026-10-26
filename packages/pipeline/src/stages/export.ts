import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import { renderShort, type ShortCompositionProps } from "@shorts/compose";

const execFileAsync = promisify(execFile);

export async function exportShortMp4(opts: {
  props: ShortCompositionProps;
  outputPath: string;
  workDir?: string;
}): Promise<string> {
  await renderShort({
    props: opts.props,
    outputPath: opts.outputPath,
    workDir: opts.workDir,
  });
  return opts.outputPath;
}

export type Mp4Probe = {
  width: number;
  height: number;
  videoCodec: string;
  duration: number;
  hasAudio: boolean;
};

export async function validateVerticalMp4(filePath: string): Promise<Mp4Probe> {
  await access(filePath);
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,codec_name",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    filePath,
  ]);
  const { stdout: audioOut } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name",
    "-of",
    "json",
    filePath,
  ]);

  const videoJson = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number; codec_name?: string }>;
    format?: { duration?: string };
  };
  const audioJson = JSON.parse(audioOut) as {
    streams?: Array<{ codec_name?: string }>;
  };

  const stream = videoJson.streams?.[0];
  if (!stream?.width || !stream?.height || !stream.codec_name) {
    throw new Error(`Invalid video stream in ${filePath}`);
  }

  const probe: Mp4Probe = {
    width: stream.width,
    height: stream.height,
    videoCodec: stream.codec_name,
    duration: Number.parseFloat(videoJson.format?.duration ?? "0"),
    hasAudio: Boolean(audioJson.streams?.[0]),
  };

  if (probe.width !== 1080 || probe.height !== 1920) {
    throw new Error(
      `Expected 1080x1920, got ${probe.width}x${probe.height}`,
    );
  }
  if (probe.videoCodec !== "h264") {
    throw new Error(`Expected h264, got ${probe.videoCodec}`);
  }
  if (!probe.hasAudio) {
    throw new Error("Expected AAC/audio track on export");
  }

  return probe;
}