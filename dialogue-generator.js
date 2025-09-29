import { FrameGenerator } from './frame-generator.js';
import { UIManager } from './ui-manager.js';
import { StorageManager } from './storage-manager.js';
import { PreviewManager } from './preview-manager.js';

export class DialogueGenerator {
    constructor() {
        // Initialize managers
        this.frameGenerator = new FrameGenerator();
        this.previewManager = new PreviewManager();
        this.storageManager = new StorageManager();
        this.uiManager = new UIManager(this);

        // State
        this.baseFrameData = null;
        this.talkingFrameData = null;
        this.audioUrl = null;
        this.audioDurationSeconds = 0;
        this.isGenerating = false;
        this.reactRoot = null;

        this.initialize();
    }

    initialize() {
        this.previewManager.initializeCanvases();
        this.uiManager.bindEvents();
        this.uiManager.updateUIState();
        this.storageManager.loadCharacterFromStorage();
    }

    // Frame generation methods
    async generateBaseFrame() {
        return this.frameGenerator.generateBaseFrame(this);
    }

    async generateTalkingFrame() {
        return this.frameGenerator.generateTalkingFrame(this);
    }

    async cleanupBaseFrame() {
        return this.frameGenerator.cleanupBaseFrame(this);
    }

    // Preview methods
    startPreviewLoop() {
        this.previewManager.startPreviewLoop(this.baseFrameData, this.talkingFrameData);
        this.uiManager.updateUIState();
    }

    stopPreviewLoop() {
        this.previewManager.stopPreviewLoop();
        if (this.baseFrameData) {
            this.previewManager.loadImageToCanvas(this.baseFrameData, this.previewManager.previewCtx);
        }
        this.uiManager.updateUIState();
    }

    // Clip generation
    async generateClip() {
        return this.frameGenerator.generateClip(this);
    }

    clearClipPlayer() {
        this.frameGenerator.clearClipPlayer();
    }

    // Storage methods
    saveCharacter() {
        this.storageManager.saveCharacter(this);
    }

    loadCharacterFromStorage(userInitiated = false) {
        this.storageManager.loadCharacterFromStorage(this, userInitiated);
    }

    newCharacter() {
        this.storageManager.newCharacter(this);
    }

    // Utility methods
    handleDialogueChange() {
        this.audioUrl = null;
        this.uiManager.audioPlayer.style.display = 'none';
        this.uiManager.ttsDurationDisplay.textContent = '';
        this.clearClipPlayer();
        this.uiManager.updateUIState();
    }
}