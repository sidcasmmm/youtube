import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ShortCompositionProps } from "./types";

function resolveAudioSrc(audioFile: string): string {
  if (!audioFile) return "";
  if (
    audioFile.startsWith("http://") ||
    audioFile.startsWith("https://") ||
    audioFile.startsWith("data:")
  ) {
    return audioFile;
  }
  // Basename relative to Remotion publicDir (set during render)
  const base = audioFile.split("/").pop() ?? audioFile;
  return staticFile(base);
}

const PLACEHOLDER_DEFAULT: ShortCompositionProps = {
  audioFile: "",
  title: "Short",
  scenes: [
    {
      id: "placeholder",
      onScreenText: "Generate a Short",
      startFrame: 0,
      endFrame: 90,
      background: "linear-gradient(160deg, #0f766e 0%, #134e4a 55%, #042f2e 100%)",
    },
  ],
  captions: [],
  durationInFrames: 90,
};

const SceneCard: React.FC<{
  text: string;
  background: string;
  title?: string;
}> = ({ text, background, title }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 12], [0.94, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background,
        justifyContent: "center",
        alignItems: "center",
        padding: "120px 80px",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: "center",
          width: "100%",
        }}
      >
        {title ? (
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 36,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              marginBottom: 48,
            }}
          >
            {title}
          </div>
        ) : null}
        <div
          style={{
            fontFamily:
              "ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif",
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#f8fafc",
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CaptionOverlay: React.FC<{
  captions: ShortCompositionProps["captions"];
}> = ({ captions }) => {
  const frame = useCurrentFrame();
  const active = captions.find(
    (c) => frame >= c.startFrame && frame < c.endFrame,
  );
  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 220,
        paddingLeft: 64,
        paddingRight: 64,
      }}
    >
      <div
        style={{
          fontFamily:
            "ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif",
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.25,
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.72)",
          padding: "18px 28px",
          borderRadius: 16,
          textAlign: "center",
          maxWidth: "92%",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};

export const Short: React.FC<ShortCompositionProps> = (props) => {
  const input = {
    ...PLACEHOLDER_DEFAULT,
    ...props,
    scenes: props.scenes?.length ? props.scenes : PLACEHOLDER_DEFAULT.scenes,
  };
  const { fps } = useVideoConfig();
  void fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#042f2e" }}>
      {input.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)}
        >
          <SceneCard
            text={scene.onScreenText}
            background={scene.background}
            title={index === 0 ? input.title : undefined}
          />
        </Sequence>
      ))}
      <CaptionOverlay captions={input.captions} />
      {input.audioFile ? <Audio src={resolveAudioSrc(input.audioFile)} /> : null}
    </AbsoluteFill>
  );
};