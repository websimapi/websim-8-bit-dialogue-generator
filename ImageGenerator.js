export class ImageGenerator {
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

    async generateBaseFrame(prompt) {
        const refinedPrompt = await this._refineBasePrompt(prompt);
        console.log("Refined Base Prompt:", refinedPrompt);
        
        return await websim.imageGen({
            prompt: refinedPrompt,
            width: 320,
            height: 240,
            aspect_ratio: "4:3",
        });
    }

    async generateTalkingFrame(prompt, baseFrameData) {
        const fullPrompt = `STRICTLY modify the input 8-bit pixel art image. Generate a new image that is pixel-for-pixel perfectly aligned and identical to the input image except for a small change to the character's mouth/face: "${prompt}". The character's position, scale, background, and color palette must be rigidly preserved and unchanged. DO NOT alter the background or any part of the image outside the immediate area of the mouth opening. Strict 1:1 registration required, 320x240 resolution.`;
        
        return await websim.imageGen({
            prompt: fullPrompt,
            width: 320,
            height: 240,
            aspect_ratio: "4:3",
            image_inputs: [{
                url: baseFrameData
            }]
        });
    }

    async cleanupBaseFrame(userPrompt, baseFrameData) {
        const refinedPrompt = await this._refineBasePrompt(userPrompt);
        
        const cleanupPrompt = `Refine and clean up this 8-bit pixel art image based on the prompt: "${refinedPrompt}". Ensure the character remains in the extreme close-up view and the background and composition are preserved exactly. Focus on removing minor artifacts and improving overall pixel consistency and quality, while strictly maintaining the 8-bit pixel art aesthetic.`;
        
        return await websim.imageGen({
            prompt: cleanupPrompt,
            width: 320,
            height: 240,
            aspect_ratio: "4:3",
            image_inputs: [{
                url: baseFrameData
            }]
        });
    }
}