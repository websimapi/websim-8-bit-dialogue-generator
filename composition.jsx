import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  useVideoConfig,
  useCurrentFrame,
  delayRender,
  continueRender
} from "remotion";
const DialogueComposition = ({ baseFrameUrl, talkingFrameUrl, audioUrl, audioDurationSeconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const renderHandle = React.useRef(delayRender());
  const [assetsLoaded, setAssetsLoaded] = React.useState(false);
  React.useEffect(() => {
    let loadedCount = 0;
    const totalAssets = 2;
    const checkLoad = () => {
      loadedCount++;
      if (loadedCount === totalAssets) {
        setAssetsLoaded(true);
        continueRender(renderHandle.current);
      }
    };
    const img1 = new Image();
    img1.onload = checkLoad;
    img1.onerror = () => {
      console.error("Error loading base frame");
      checkLoad();
    };
    img1.src = baseFrameUrl;
    const img2 = new Image();
    img2.onload = checkLoad;
    img2.onerror = () => {
      console.error("Error loading talking frame");
      checkLoad();
    };
    img2.src = talkingFrameUrl;
  }, [baseFrameUrl, talkingFrameUrl]);
  if (!assetsLoaded) {
    return React.createElement(
      AbsoluteFill,
      { style: { backgroundColor: "#1a1a2e", justifyContent: "center", alignItems: "center", color: "#00ff00", fontSize: 20 } },
      "Loading Assets..."
    );
  }
  const frameSwitchRate = 4;
  const isTalkingFrame = Math.floor(frame / frameSwitchRate) % 2 === 1;
  const currentFrameUrl = isTalkingFrame ? talkingFrameUrl : baseFrameUrl;
  return React.createElement(
    AbsoluteFill,
    null,
    React.createElement(Img, {
      src: currentFrameUrl,
      style: {
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        position: "absolute",
        top: 0,
        left: 0
      }
    }),
    React.createElement(Audio, { src: audioUrl })
  );
};
export {
  DialogueComposition
};
