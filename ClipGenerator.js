import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@websim/remotion/player';
import { DialogueComposition } from './composition.jsx';
import { Input, ALL_FORMATS, BlobSource } from 'mediabunny';

const FPS = 30;
const DURATION_SAFETY_FRAMES = 30;

export class ClipGenerator {
    constructor() {
        this.reactRoot = null;
    }

    async generateClip({ dialogueText, baseFrameData, talkingFrameData }) {
        // 1. Generate TTS Audio
        document.getElementById('clipStatus').textContent = 'Generating TTS audio...';
        const ttsResult = await websim.textToSpeech({
            text: dialogueText,
            voice: "en-male",
        });

        const audioUrl = ttsResult.url;
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.src = audioUrl;
        audioPlayer.style.display = 'block';

        // 2. Determine Audio Duration
        document.getElementById('clipStatus').textContent = 'Calculating audio duration...';

        const audioBlob = await (await fetch(audioUrl)).blob();
        const input = new Input({ source: new BlobSource(audioBlob), formats: ALL_FORMATS });
        let audioDurationSeconds = await input.computeDuration();

        if (isNaN(audioDurationSeconds) || audioDurationSeconds === 0) {
            audioDurationSeconds = Math.max(dialogueText.length * 0.08, 1.5);
        }

        document.getElementById('ttsDuration').textContent = `Audio Duration: ${audioDurationSeconds.toFixed(2)} seconds`;

        const durationInFrames = Math.ceil(audioDurationSeconds * FPS) + DURATION_SAFETY_FRAMES;

        // 3. Mount Remotion Player
        document.getElementById('clipStatus').textContent = 'Rendering video clip...';

        const clipContainer = document.getElementById('clipContainer');
        clipContainer.style.display = 'block';
        document.getElementById('previewCanvas').classList.add('hidden');

        if (this.reactRoot) {
            this.reactRoot.unmount();
        }
        this.reactRoot = createRoot(clipContainer);

        this.reactRoot.render(
            <div style={{ width: "100%", height: "100%" }}>
                <Player
                    component={DialogueComposition}
                    durationInFrames={durationInFrames}
                    fps={FPS}
                    compositionWidth={320}
                    compositionHeight={240}
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

        return { audioUrl, audioDurationSeconds };
    }

    clearClipPlayer() {
        const clipContainer = document.getElementById('clipContainer');
        clipContainer.style.display = 'none';
        document.getElementById('previewCanvas').classList.remove('hidden');
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
    }
}