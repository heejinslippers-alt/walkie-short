import React from "react";
import { Composition } from "remotion";
import { WalkieShort, WALKIE_FRAMES } from "./videos/walkie/Walkie";
import { BillionShort, BILLION_FRAMES } from "./videos/billion/Billion";
import { ChannelArt } from "./videos/channel/ChannelArt";

export const Root: React.FC = () => (
  <>
    <Composition id="WalkieShort" component={WalkieShort} durationInFrames={WALKIE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="BillionShort" component={BillionShort} durationInFrames={BILLION_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ChannelAvatar" component={ChannelArt} defaultProps={{ kind: "avatar" as const }} durationInFrames={1} fps={30} width={800} height={800} />
    <Composition id="ChannelBanner" component={ChannelArt} defaultProps={{ kind: "banner" as const }} durationInFrames={1} fps={30} width={2560} height={1440} />
    {[1, 2, 3, 4, 5].map((k) => <Composition key={k} id={`MomAvatar${k}`} component={ChannelArt} defaultProps={{ kind: `mom${k}` as "mom1" }} durationInFrames={1} fps={30} width={800} height={800} />)}
  </>
);
