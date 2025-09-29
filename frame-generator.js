import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@websim/remotion/player';
import { DialogueComposition } from './composition.jsx';
import { Input, ALL_FORMATS, BlobSource } from 'mediabunny';

const FPS = 30;
const DURATION_SAFETY_FRAMES = 30;

export class FrameGenerator {
    async _refineBasePrompt(userPrompt) {
        const systemMessage = `You are a creative prompt refinement expert for 8-bit pixel art image generation. 
        The user is providing a prompt for a character who will be used in a dialogue sequence.
        Your task is to rewrite the user's prompt to ensure the resulting image is:
        1. A clear, head-and-shoulders portrait or close-up of the character, suitable for a classic 8-bit RPG dialogue screen.
        2. Strictly adheres to a retro 8-bit pixel art aesthetic (low resolution, limited color palette, visible pixels).
        3. The composition must NOT contain the words "dialogue box", text, or any user interface elements. The background should be simple and suitable for an in-game scene.
        4. Must be a single, detailed, image generation prompt.
        5. Prioritize stylistic fidelity to classic 8-bit gaming art over photorealism or excessive detail.

        Example refinement: If the user says "a dragon in a cave", you might output "8-bit pixel art close-up portrait of a fierce red dragon's head inside a dimly lit cave. High contrast, limited color palette, low resolution 320x240, retro JRPG style."

        Respond only with the refined prompt string, following the constraints, and no other conversational text.`;

        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemMessage,
                    },
                    {
                        role: "user",
                        content: userPrompt,
                    },
                ],
            });
            return completion.content.trim();
        } catch (error) {
            console.error("Error refining prompt:", error);
            return `8-bit pixel art portrait of a character, close-up, no dialogue box. ${userPrompt}. High quality 8-bit pixel art, low resolution 320x240, limited color palette, retro video game aesthetic.`;
        }
    }

    async generateBaseFrame(generator) {
        const prompt = generator.uiManager.basePromptInput.value.trim();
        if (!prompt) {
            alert('Please provide a prompt for the base frame.');
            return;
        }

        generator.uiManager.showLoading('base', true);
        document.getElementById('baseStatus').textContent = 'Refining prompt (AI thinking)...';

        generator.stopPreviewLoop();
        generator.clearClipPlayer();
        generator.talkingFrameData = null;
        generator.previewManager.initializeCanvases([generator.previewManager.talkingCtx]);
        document.getElementById('talkingStatus').textContent = '';

        try {
            const refinedPrompt = await this._refineBasePrompt(prompt);
            console.log("Refined Base Prompt:", refinedPrompt);

            document.getElementById('baseStatus').textContent = 'Generating image...';

            const result = await websim.imageGen({
                prompt: refinedPrompt,
                width: 320,
                height: 240,
                aspect_ratio: "4:3",
            });

            await generator.previewManager.loadImageToCanvas(result.url, generator.previewManager.baseCtx);
            generator.baseFrameData = generator.previewManager.baseCanvas.toDataURL('image/png');
            generator.previewManager.previewCtx.drawImage(generator.previewManager.baseCanvas, 0, 0);

            document.getElementById('baseStatus').textContent = 'Base Frame Ready!';
            generator.uiManager.talkingPromptInput.value = 'The character opens their mouth slightly to speak, maintaining the exact position and background. ONLY change the mouth.';

        } catch (error) {
            console.error('Error generating base frame:', error);
            document.getElementById('baseStatus').textContent = 'Generation Failed.';
            generator.baseFrameData = null;
        } finally {
            generator.uiManager.showLoading('base', false);
            generator.uiManager.updateUIState();
        }
    }

    async generateTalkingFrame(generator) {
        if (!generator.baseFrameData) return;

        const prompt = generator.uiManager.talkingPromptInput.value.trim();
        if (!prompt) {
            alert('Please provide a prompt for the talking frame difference.');
            return;
        }

        generator.uiManager.showLoading('talking', true);
        document.getElementById('talkingStatus').textContent = 'Generating...';

        try {
            const fullPrompt = `STRICTLY modify the input 8-bit pixel art image. Generate a new image that is pixel-for-pixel perfectly aligned and identical to the input image except for a small change to the character's mouth/face: "${prompt}". The character's position, scale, background, and color palette must be rigidly preserved and unchanged. DO NOT alter the background or any part of the image outside the immediate area of the mouth opening. Strict 1:1 registration required, 320x240 resolution.`;

            const result = await websim.imageGen({
                prompt: fullPrompt,
                width: 320,
                height: 240,
                aspect_ratio: "4:3",
                image_inputs: [{
                    url: generator.baseFrameData
                }]
            });

            await generator.previewManager.loadImageToCanvas(result.url, generator.previewManager.talkingCtx);
            generator.talkingFrameData = generator.previewManager.talkingCanvas.toDataURL('image/png');

            document.getElementById('talkingStatus').textContent = 'Talking Frame Ready!';
            generator.startPreviewLoop();

        } catch (error) {
            console.error('Error generating talking frame:', error);
            document.getElementById('talkingStatus').textContent = 'Generation Failed.';
            generator.talkingFrameData = null;
        } finally {
            generator.uiManager.showLoading('talking', false);
            generator.uiManager.updateUIState();
        }
    }

    async cleanupBaseFrame(generator) {
        if (!generator.baseFrameData) return;

        generator.uiManager.showLoading('cleanup', true);
        document.getElementById('baseStatus').textContent = 'Cleaning up base frame (AI Refine)...';

        try {
            generator.stopPreviewLoop();
            generator.clearClipPlayer();

            const userPrompt = generator.uiManager.basePromptInput.value.trim();
            const refinedPrompt = await this._refineBasePrompt(userPrompt);

            const cleanupPrompt = `Refine and clean up this 8-bit pixel art image based on the prompt: "${refinedPrompt}". Ensure the character remains in the extreme close-up view and the background and composition are preserved exactly. Focus on removing minor artifacts and improving overall pixel consistency and quality, while strictly maintaining the 8-bit pixel art aesthetic.`;

            const result = await websim.imageGen({
                prompt: cleanupPrompt,
                width: 320,
                height: 240,
                aspect_ratio: "4:3",
                image_inputs: [{
                    url: generator.baseFrameData
                }]
            });

            await generator.previewManager.loadImageToCanvas(result.url, generator.previewManager.baseCtx);
            generator.baseFrameData = generator.previewManager.baseCanvas.toDataURL('image/png');
            generator.previewManager.previewCtx.drawImage(generator.previewManager.baseCanvas, 0, 0);

            document.getElementById('baseStatus').textContent = 'Base Frame Cleaned Up Successfully!';

            generator.talkingFrameData = null;
            generator.previewManager.initializeCanvases([generator.previewManager.talkingCtx]);
            document.getElementById('talkingStatus').textContent = 'Talking Frame invalidated. Please regenerate.';

        } catch (error) {
            console.error('Error cleaning up base frame:', error);
            document.getElementById('baseStatus').textContent = 'Cleanup Failed.';
        } finally {
            generator.uiManager.showLoading('cleanup', false);
            generator.uiManager.updateUIState();
        }
    }

    async generateClip(generator) {
        if (!generator.baseFrameData || !generator.talkingFrameData) {
            return alert('Please generate both character frames first.');
        }
        const dialogueText = generator.uiManager.dialogueTextInput.value.trim();
        if (!dialogueText) return alert('Please enter dialogue text.');

        generator.stopPreviewLoop();
        generator.clearClipPlayer();
        generator.uiManager.showLoading('clip', true);

        try {
            document.getElementById('clipStatus').textContent = 'Generating TTS audio...';
            const ttsResult = await websim.textToSpeech({
                text: dialogueText,
                voice: "en-male",
            });
            generator.audioUrl = ttsResult.url;
            generator.uiManager.audioPlayer.src = generator.audioUrl;
            generator.uiManager.audioPlayer.style.display = 'block';

            document.getElementById('clipStatus').textContent = 'Calculating audio duration...';

            const audioBlob = await (await fetch(generator.audioUrl)).blob();
            const input = new Input({ source: new BlobSource(audioBlob), formats: ALL_FORMATS });
            generator.audioDurationSeconds = await input.computeDuration();

            if (isNaN(generator.audioDurationSeconds) || generator.audioDurationSeconds === 0) {
                generator.audioDurationSeconds = Math.max(dialogueText.length * 0.08, 1.5);
            }

            generator.uiManager.ttsDurationDisplay.textContent = `Audio Duration: ${generator.audioDurationSeconds.toFixed(2)} seconds`;

            const durationInFrames = Math.ceil(generator.audioDurationSeconds * FPS) + DURATION_SAFETY_FRAMES;

            document.getElementById('clipStatus').textContent = 'Rendering video clip...';

            const clipContainer = document.getElementById('clipContainer');
            clipContainer.style.display = 'block';
            generator.previewManager.previewCanvas.classList.add('hidden');

            if (generator.reactRoot) {
                generator.reactRoot.unmount();
            }
            generator.reactRoot = createRoot(clipContainer);

            generator.reactRoot.render(
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
                            baseFrameUrl: generator.baseFrameData,
                            talkingFrameUrl: generator.talkingFrameData,
                            audioUrl: generator.audioUrl,
                            audioDurationSeconds: generator.audioDurationSeconds
                        }}
                        autoplay={false}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                    />
                </div>
            );

            document.getElementById('clipStatus').textContent = 'Clip Ready! Press Play on the video player.';

        } catch (error) {
            console.error('Error generating clip:', error);
            document.getElementById('clipStatus').textContent = 'Clip Generation Failed.';
            generator.audioUrl = null;
        } finally {
            generator.uiManager.showLoading('clip', false);
            generator.uiManager.updateUIState();
        }
    }

    clearClipPlayer() {
        const clipContainer = document.getElementById('clipContainer');
        clipContainer.style.display = 'none';
        document.getElementById('previewCanvas').classList.remove('hidden');
        // Note: React root cleanup handled in dialogue-generator.js
    }
}