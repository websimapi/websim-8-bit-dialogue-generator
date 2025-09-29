// generator-service.js

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

export class GeneratorService {
    
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

    async generateBaseFrame(userPrompt) {
        const refinedPrompt = await this._refineBasePrompt(userPrompt);
        
        const result = await websim.imageGen({
            prompt: refinedPrompt,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            aspect_ratio: "4:3",
        });
        
        return { url: result.url, refinedPrompt };
    }

    async generateTalkingFrame(baseFrameData, talkingPrompt) {
        const fullPrompt = `STRICTLY modify the input 8-bit pixel art image. Generate a new image that is pixel-for-pixel perfectly aligned and identical to the input image except for a small change to the character's mouth/face: "${talkingPrompt}". The character's position, scale, background, and color palette must be rigidly preserved and unchanged. DO NOT alter the background or any part of the image outside the immediate area of the mouth opening. Strict 1:1 registration required, 320x240 resolution.`;

        const result = await websim.imageGen({
            prompt: fullPrompt,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            aspect_ratio: "4:3",
            image_inputs: [{
                url: baseFrameData
            }]
        });

        return result.url;
    }

    async cleanupBaseFrame(baseFrameData, userPrompt) {
        
        const refinedPrompt = await this._refineBasePrompt(userPrompt);
        
        const cleanupPrompt = `Refine and clean up this 8-bit pixel art image based on the prompt: "${refinedPrompt}". Ensure the character remains in the extreme close-up view and the background and composition are preserved exactly. Focus on removing minor artifacts and improving overall pixel consistency and quality, while strictly maintaining the 8-bit pixel art aesthetic.`;

        const result = await websim.imageGen({
            prompt: cleanupPrompt,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            aspect_ratio: "4:3",
            image_inputs: [{
                url: baseFrameData
            }]
        });
        
        return result.url;
    }
}