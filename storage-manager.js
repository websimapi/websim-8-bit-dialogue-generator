export class StorageManager {
    constructor() {
        this.CHARACTER_STORAGE_KEY = '8bit_dialogue_character';
    }

    saveCharacter(generator) {
        if (!generator.baseFrameData || !generator.talkingFrameData) {
            alert('Please generate both frames before saving.');
            return;
        }

        try {
            const characterData = {
                basePrompt: generator.uiManager.basePromptInput.value,
                talkingPrompt: generator.uiManager.talkingPromptInput.value,
                baseFrameData: generator.baseFrameData,
                talkingFrameData: generator.talkingFrameData
            };
            localStorage.setItem(this.CHARACTER_STORAGE_KEY, JSON.stringify(characterData));
            alert('Character saved successfully!');
        } catch (e) {
            console.error('Failed to save character:', e);
            alert('Failed to save character. Local storage might be full.');
        }
    }

    loadCharacterFromStorage(generator, userInitiated = false) {
        try {
            const storedData = localStorage.getItem(this.CHARACTER_STORAGE_KEY);
            if (storedData) {
                const data = JSON.parse(storedData);
                generator.baseFrameData = data.baseFrameData;
                generator.talkingFrameData = data.talkingFrameData;

                generator.uiManager.basePromptInput.value = data.basePrompt || '';
                generator.uiManager.talkingPromptInput.value = data.talkingPrompt || '';

                if (generator.baseFrameData) {
                    generator.previewManager.loadImageToCanvas(generator.baseFrameData, generator.previewManager.baseCtx).then(() => {
                        generator.previewManager.previewCtx.drawImage(generator.previewManager.baseCanvas, 0, 0);
                        document.getElementById('baseStatus').textContent = 'Base Frame Loaded!';
                    });
                }
                if (generator.talkingFrameData) {
                    generator.previewManager.loadImageToCanvas(generator.talkingFrameData, generator.previewManager.talkingCtx).then(() => {
                        document.getElementById('talkingStatus').textContent = 'Talking Frame Loaded!';
                    });
                }

                if (userInitiated) {
                    alert('Character loaded successfully!');
                }
            } else if (userInitiated) {
                alert('No saved character found.');
            }
        } catch (e) {
            console.error('Failed to load character:', e);
            if (userInitiated) {
                alert('Failed to load character data.');
            }
        } finally {
            generator.uiManager.updateUIState();
        }
    }

    newCharacter(generator) {
        if (generator.baseFrameData && !confirm('Are you sure you want to start a new character? Unsaved changes will be lost.')) {
            return;
        }

        generator.stopPreviewLoop();
        generator.clearClipPlayer();

        generator.baseFrameData = null;
        generator.talkingFrameData = null;
        generator.audioUrl = null;
        generator.audioDurationSeconds = 0;

        generator.uiManager.basePromptInput.value = '';
        generator.uiManager.talkingPromptInput.value = '';
        generator.uiManager.dialogueTextInput.value = '';

        generator.uiManager.audioPlayer.style.display = 'none';
        generator.uiManager.audioPlayer.src = '';
        generator.uiManager.ttsDurationDisplay.textContent = '';

        generator.previewManager.initializeCanvases();

        document.getElementById('baseStatus').textContent = '';
        document.getElementById('talkingStatus').textContent = '';
        document.getElementById('clipStatus').textContent = '';

        generator.uiManager.updateUIState();
    }
}

