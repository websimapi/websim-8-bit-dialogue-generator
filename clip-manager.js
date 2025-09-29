// clip-manager.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@websim/remotion/player';
import { Input, ALL_FORMATS, BlobSource } from 'mediabunny';
import { DialogueComposition } from './composition.jsx';

const FPS = 30;
const DURATION_SAFETY_FRAMES = 30; // 1 second buffer 
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

export class ClipManager {
    constructor(clipContainerId, previewCanvasId) {
        this.clipContainer = document.getElementById(clipContainerId);
        this.previewCanvas = document.getElementById(previewCanvasId);
        this.reactRoot = null;
    }

    async generateAudio(dialogueText) {
        const ttsResult = await websim.textToSpeech({
            text: dialogueText,
            voice: "en-male", 
        });

        const audioUrl = ttsResult.url;

        const audioBlob = await (await fetch(audioUrl)).blob();
        const input = new Input({ source: new BlobSource(audioBlob), formats: ALL_FORMATS });
        let audioDurationSeconds = await input.computeDuration();

        if (isNaN(audioDurationSeconds) || audioDurationSeconds === 0) {
            audioDurationSeconds = Math.max(dialogueText.length * 0.08, 1.5);
        }

        return { audioUrl, audioDurationSeconds };
    }

    mountClipPlayer(baseFrameData, talkingFrameData, audioUrl, audioDurationSeconds) {
        const durationInFrames = Math.ceil(audioDurationSeconds * FPS) + DURATION_SAFETY_FRAMES;

        this.clipContainer.style.display = 'block';
        this.previewCanvas.classList.add('hidden');

        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }

        this.reactRoot = createRoot(this.clipContainer);

        this.reactRoot.render(
            <div style={{ width: "100%", height: "100%" }}>
                <Player
                    component={DialogueComposition}
                    durationInFrames={durationInFrames}
                    fps={FPS}
                    compositionWidth={CANVAS_WIDTH}
                    compositionHeight={CANVAS_HEIGHT}
                    loop={false}
                    controls
                    inputProps={{
                        baseFrameUrl: baseFrameData,
                        talkingFrameUrl: talkingFrameData,
                        audioUrl: audioUrl,
                        audioDurationSeconds: audioDurationSeconds
                    }}
                    autoplay={false}
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
            </div>
        );
    }

    clearClipPlayer() {
        this.clipContainer.style.display = 'none';
        this.previewCanvas.classList.remove('hidden');
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
    }
}