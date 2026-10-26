import React from "react";
import { Composition } from "remotion";
import { Short } from "./Short";
import { FPS, HEIGHT, WIDTH, type ShortCompositionProps } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        durationInFrames={900}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={
          {
            audioFile: "",
            title: "Short",
            scenes: [],
            captions: [],
            durationInFrames: 900,
            captionStyle: "explainer",
          } satisfies ShortCompositionProps
        }
        calculateMetadata={({ props }) => {
          const fromProps =
            typeof props.durationInFrames === "number"
              ? props.durationInFrames
              : 900;
          return {
            durationInFrames: Math.max(30, fromProps),
            fps: FPS,
            width: WIDTH,
            height: HEIGHT,
          };
        }}
      />
    </>
  );
};