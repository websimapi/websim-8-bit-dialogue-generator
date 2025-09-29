import { CanvasManager } from './CanvasManager.js';
import { ImageGenerator } from './ImageGenerator.js';
import { StorageManager } from './StorageManager.js';
import { UIStateManager } from './UIStateManager.js';
import { ClipGenerator } from './ClipGenerator.js';

export class DialogueGenerator {
    constructor() {
        // Initialize managers
        this.canvasManager = new CanvasManager();
        this.imageGenerator = new ImageGenerator();
        this.storageManager = new StorageManager();
        this.uiStateManager = new UIStateManager();
        this.clipGenerator = new ClipGenerator();

        // Elements
        this.basePromptInput = document.getElementById('basePrompt');
        this.talkingPromptInput = document.getElementById('talkingPrompt');
        this.dialogueTextInput = document.getElementById('dialogueText');

        // State
        this.baseFrameData = null;
        this.talkingFrameData = null;
        this.audioUrl = null;
        this.audioDurationSeconds = 0;
        this.isGenerating = false;

        this.CHARACTER_STORAGE_KEY = '8bit_dialogue_character';

        this.bindEvents();
        this.updateUIState();
        this.loadCharacterFromStorage();
    }

    bindEvents() {
        document.getElementById('generateBaseFrame').addEventListener('click', () => this.generateBaseFrame());
        document.getElementById('generateTalkingFrame').addEventListener('click', () => this.generateTalkingFrame());
        document.getElementById('cleanupBaseFrame').addEventListener('click', () => this.cleanupBaseFrame());
        document.getElementById('previewLoop').addEventListener('click', () => this.canvasManager.startPreviewLoop(this.baseFrameData, this.talkingFrameData));
        document.getElementById('stopLoop').addEventListener('click', () => this.canvasManager.stopPreviewLoop());
        document.getElementById('generateClip').addEventListener('click', () => this.generateClip());
        document.getElementById('saveCharacter').addEventListener('click', () => this.saveCharacter());
        document.getElementById('loadCharacter').addEventListener('click', () => this.loadCharacterFromStorage(true));
        document.getElementById('newCharacter').addEventListener('click', () => this.newCharacter());

        this.dialogueTextInput.addEventListener('input', () => this.handleDialogueChange());
    }

    updateUIState() {
        this.uiStateManager.update({
            hasBase: !!this.baseFrameData,
            hasTalking: !!this.talkingFrameData,
            hasDialogue: this.dialogueTextInput.value.trim().length > 0,
            isGenerating: this.isGenerating,
            isLooping: this.canvasManager.isLooping()
        });
    }

    async generateBaseFrame() {
        const prompt = this.basePromptInput.value.trim();
        if (!prompt) {
            alert('Please provide a prompt for the base frame.');
            return;
        }

        this.uiStateManager.showLoading('base', true);
        this.isGenerating = true;
        document.getElementById('baseStatus').textContent = 'Refining prompt (AI thinking)...';

        this.canvasManager.stopPreviewLoop();
        this.clipGenerator.clearClipPlayer();
        this.talkingFrameData = null;
        this.canvasManager.clearTalkingCanvas();
        document.getElementById('talkingStatus').textContent = '';

        try {
            const result = await this.imageGenerator.generateBaseFrame(prompt);
            await this.canvasManager.loadImageToCanvas(result.url, 'base');
            this.baseFrameData = this.canvasManager.getCanvasDataURL('base');
            this.canvasManager.updatePreview(this.baseFrameData);

            document.getElementById('baseStatus').textContent = 'Base Frame Ready!';
            this.talkingPromptInput.value = 'The character opens their mouth slightly to speak, maintaining the exact position and background. ONLY change the mouth.';

        } catch (error) {
            console.error('Error generating base frame:', error);
            document.getElementById('baseStatus').textContent = 'Generation Failed.';
            this.baseFrameData = null;
        } finally {
            this.uiStateManager.showLoading('base', false);
            this.isGenerating = false;
            this.updateUIState();
        }
    }

    async generateTalkingFrame() {
        if (!this.baseFrameData) return;

        const prompt = this.talkingPromptInput.value.trim();
        if (!prompt) {
            alert('Please provide a prompt for the talking frame difference.');
            return;
        }

        this.uiStateManager.showLoading('talking', true);
        this.isGenerating = true;
        document.getElementById('talkingStatus').textContent = 'Generating...';

        try {
            const result = await this.imageGenerator.generateTalkingFrame(prompt, this.baseFrameData);
            await this.canvasManager.loadImageToCanvas(result.url, 'talking');
            this.talkingFrameData = this.canvasManager.getCanvasDataURL('talking');

            document.getElementById('talkingStatus').textContent = 'Talking Frame Ready!';
            this.canvasManager.startPreviewLoop(this.baseFrameData, this.talkingFrameData);

        } catch (error) {
            console.error('Error generating talking frame:', error);
            document.getElementById('talkingStatus').textContent = 'Generation Failed.';
            this.talkingFrameData = null;
        } finally {
            this.uiStateManager.showLoading('talking', false);
            this.isGenerating = false;
            this.updateUIState();
        }
    }

    async cleanupBaseFrame() {
        if (!this.baseFrameData) return;

        this.uiStateManager.showLoading('cleanup', true);
        this.isGenerating = true;
        document.getElementById('baseStatus').textContent = 'Cleaning up base frame (AI Refine)...';

        try {
            this.canvasManager.stopPreviewLoop();
            this.clipGenerator.clearClipPlayer();

            const userPrompt = this.basePromptInput.value.trim();
            const result = await this.imageGenerator.cleanupBaseFrame(userPrompt, this.baseFrameData);

            await this.canvasManager.loadImageToCanvas(result.url, 'base');
            this.baseFrameData = this.canvasManager.getCanvasDataURL('base');
            this.canvasManager.updatePreview(this.baseFrameData);

            document.getElementById('baseStatus').textContent = 'Base Frame Cleaned Up Successfully!';

            this.talkingFrameData = null;
            this.canvasManager.clearTalkingCanvas();
            document.getElementById('talkingStatus').textContent = 'Talking Frame invalidated. Please regenerate.';

        } catch (error) {
            console.error('Error cleaning up base frame:', error);
            document.getElementById('baseStatus').textContent = 'Cleanup Failed.';
        } finally {
            this.uiStateManager.showLoading('cleanup', false);
            this.isGenerating = false;
            this.updateUIState();
        }
    }

    handleDialogueChange() {
        this.audioUrl = null;
        document.getElementById('audioPlayer').style.display = 'none';
        document.getElementById('ttsDuration').textContent = '';
        this.clipGenerator.clearClipPlayer();
        this.updateUIState();
    }

    async generateClip() {
        if (!this.baseFrameData || !this.talkingFrameData) return alert('Please generate both character frames first.');
        const dialogueText = this.dialogueTextInput.value.trim();
        if (!dialogueText) return alert('Please enter dialogue text.');

        this.canvasManager.stopPreviewLoop();
        this.clipGenerator.clearClipPlayer();
        this.uiStateManager.showLoading('clip', true);
        this.isGenerating = true;

        try {
            const result = await this.clipGenerator.generateClip({
                dialogueText,
                baseFrameData: this.baseFrameData,
                talkingFrameData: this.talkingFrameData
            });

            this.audioUrl = result.audioUrl;
            this.audioDurationSeconds = result.audioDurationSeconds;

            document.getElementById('clipStatus').textContent = 'Clip Ready! Press Play on the video player.';

        } catch (error) {
            console.error('Error generating clip:', error);
            document.getElementById('clipStatus').textContent = 'Clip Generation Failed.';
            this.audioUrl = null;
        } finally {
            this.uiStateManager.showLoading('clip', false);
            this.isGenerating = false;
            this.updateUIState();
        }
    }

    saveCharacter() {
        if (!this.baseFrameData || !this.talkingFrameData) {
            alert('Please generate both frames before saving.');
            return;
        }

        const characterData = {
            basePrompt: this.basePromptInput.value,
            talkingPrompt: this.talkingPromptInput.value,
            baseFrameData: this.baseFrameData,
            talkingFrameData: this.talkingFrameData
        };

        this.storageManager.saveCharacter(characterData);
    }

    loadCharacterFromStorage(userInitiated = false) {
        const data = this.storageManager.loadCharacter(userInitiated);
        if (data) {
            this.baseFrameData = data.baseFrameData;
            this.talkingFrameData = data.talkingFrameData;

            this.basePromptInput.value = data.basePrompt || '';
            this.talkingPromptInput.value = data.talkingPrompt || '';

            if (this.baseFrameData) {
                this.canvasManager.loadImageToCanvas(this.baseFrameData, 'base').then(() => {
                    this.canvasManager.updatePreview(this.baseFrameData);
                    document.getElementById('baseStatus').textContent = 'Base Frame Loaded!';
                });
            }
            if (this.talkingFrameData) {
                this.canvasManager.loadImageToCanvas(this.talkingFrameData, 'talking').then(() => {
                    document.getElementById('talkingStatus').textContent = 'Talking Frame Loaded!';
                });
            }
        }
        this.updateUIState();
    }

    newCharacter() {
        if (this.baseFrameData && !confirm('Are you sure you want to start a new character? Unsaved changes will be lost.')) {
            return;
        }

        this.canvasManager.stopPreviewLoop();
        this.clipGenerator.clearClipPlayer();

        this.baseFrameData = null;
        this.talkingFrameData = null;
        this.audioUrl = null;
        this.audioDurationSeconds = 0;

        this.basePromptInput.value = '';
        this.talkingPromptInput.value = '';
        this.dialogueTextInput.value = '';

        document.getElementById('audioPlayer').style.display = 'none';
        document.getElementById('audioPlayer').src = '';
        document.getElementById('ttsDuration').textContent = '';

        this.canvasManager.clearAllCanvases();

        document.getElementById('baseStatus').textContent = '';
        document.getElementById('talkingStatus').textContent = '';
        document.getElementById('clipStatus').textContent = '';

        this.updateUIState();
    }
}