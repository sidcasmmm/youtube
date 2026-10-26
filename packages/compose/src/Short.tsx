import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  CAPTION_PRESETS,
  captionFontFamily,
  displayFontFamily,
} from "./fonts";
import type { CaptionStyleId, ShortCompositionProps } from "./types";

function resolveStaticSrc(file: string): string {
  if (!file) return "";
  if (
    file.startsWith("http://") ||
    file.startsWith("https://") ||
    file.startsWith("data:")
  ) {
    return file;
  }
  // Path relative to Remotion publicDir (e.g. voiceover.mp3 or assets/scene-00.jpg)
  return staticFile(file.replace(/^\/+/, ""));
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
      background: "linear-gradient(160deg, #0a1628 0%, #0f2a1f 55%, #041018 100%)",
    },
  ],
  captions: [],
  durationInFrames: 90,
  captionStyle: "explainer",
};

const KenBurnsMedia: React.FC<{
  src: string;
  background: string;
}> = ({ src, background }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, Math.max(1, durationInFrames)], [1.05, 1.18], {
    extrapolateRight: "clamp",
  });
  const shiftY = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, -36], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      {src ? (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateY(${shiftY}px)`,
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const SceneCard: React.FC<{
  text: string;
  background: string;
  mediaFile?: string;
  title?: string;
  styleId: CaptionStyleId;
}> = ({ text, background, mediaFile, title, styleId }) => {
  const frame = useCurrentFrame();
  const preset = CAPTION_PRESETS[styleId];
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 12], [0.96, 1], {
    extrapolateRight: "clamp",
  });
  const mediaSrc = mediaFile ? resolveStaticSrc(mediaFile) : "";

  return (
    <AbsoluteFill>
      <KenBurnsMedia src={mediaSrc} background={background} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "140px 72px",
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
                fontFamily: displayFontFamily,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: `rgba(255,255,255,${preset.titleOpacity})`,
                marginBottom: 36,
              }}
            >
              {title}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: displayFontFamily,
              fontSize: preset.sceneFontSize,
              fontWeight: 700,
              lineHeight: 1.12,
              color: "#f8fafc",
              textShadow: "0 3px 18px rgba(0,0,0,0.65)",
            }}
          >
            {text}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const CaptionOverlay: React.FC<{
  captions: ShortCompositionProps["captions"];
  styleId: CaptionStyleId;
}> = ({ captions, styleId }) => {
  const frame = useCurrentFrame();
  const preset = CAPTION_PRESETS[styleId];
  const active = captions.find(
    (c) => frame >= c.startFrame && frame < c.endFrame,
  );
  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 200,
        paddingLeft: 56,
        paddingRight: 56,
      }}
    >
      <div
        style={{
          fontFamily: captionFontFamily,
          fontSize: preset.captionFontSize,
          fontWeight: 600,
          lineHeight: 1.25,
          color: "#ffffff",
          backgroundColor: preset.captionBg,
          padding: preset.captionPadding,
          borderRadius: preset.captionRadius,
          textAlign: "center",
          maxWidth: "94%",
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
  const styleId: CaptionStyleId = input.captionStyle ?? "explainer";

  return (
    <AbsoluteFill style={{ backgroundColor: "#041018" }}>
      {input.scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={Math.max(1, scene.endFrame - scene.startFrame)}
        >
          <SceneCard
            text={scene.onScreenText}
            background={scene.background}
            mediaFile={scene.mediaFile}
            title={index === 0 ? input.title : undefined}
            styleId={styleId}
          />
        </Sequence>
      ))}
      <CaptionOverlay captions={input.captions} styleId={styleId} />
      {input.audioFile ? (
        <Audio src={resolveStaticSrc(input.audioFile)} />
      ) : null}
    </AbsoluteFill>
  );
};
