import React from "react";
import { Composition } from "remotion";
import { WalkieShort, WALKIE_FRAMES } from "./videos/walkie/Walkie";
import { BillionShort, BILLION_FRAMES } from "./videos/billion/Billion";

export const Root: React.FC = () => (
  <>
    <Composition id="WalkieShort" component={WalkieShort} durationInFrames={WALKIE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BillionShort" component={BillionShort} durationInFrames={BILLION_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
