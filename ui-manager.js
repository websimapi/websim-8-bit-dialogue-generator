// ui-manager.js

const UI_ELEMENTS = {
    basePromptInput: 'basePrompt',
    talkingPromptInput: 'talkingPrompt',
    dialogueTextInput: 'dialogueText',
    audioPlayer: 'audioPlayer',
    ttsDurationDisplay: 'ttsDuration',
    talkingCanvas: 'talkingFrameCanvas',
    clipContainer: 'clipContainer',
    previewCanvas: 'previewCanvas',
    baseStatus: 'baseStatus',
    talkingStatus: 'talkingStatus',
    clipStatus: 'clipStatus',
    generateBaseFrameBtn: 'generateBaseFrame',
    cleanupBaseFrameBtn: 'cleanupBaseFrame',
    generateTalkingFrameBtn: 'generateTalkingFrame',
    previewLoopBtn: 'previewLoop',
    stopLoopBtn: 'stopLoop',
    generateClipBtn: 'generateClip',
    saveCharacterBtn: 'saveCharacter',
    loadCharacterBtn: 'loadCharacter',
    newCharacterBtn: 'newCharacter'
};

export class UIManager {
    constructor(callbacks) {
        this.elements = {};
        for (const key in UI_ELEMENTS) {
            this.elements[key] = document.getElementById(UI_ELEMENTS[key]);
        }
        this.callbacks = callbacks;
        this.isGenerating = false;
        this.loopIntervalId = null;

        this.bindEvents();
    }

    bindEvents() {
        this.elements.generateBaseFrameBtn.addEventListener('click', this.callbacks.generateBaseFrame);
        this.elements.generateTalkingFrameBtn.addEventListener('click', this.callbacks.generateTalkingFrame);
        this.elements.cleanupBaseFrameBtn.addEventListener('click', this.callbacks.cleanupBaseFrame);
        this.elements.previewLoopBtn.addEventListener('click', this.callbacks.startPreviewLoop);
        this.elements.stopLoopBtn.addEventListener('click', this.callbacks.stopPreviewLoop);
        this.elements.generateClipBtn.addEventListener('click', this.callbacks.generateClip);
        this.elements.saveCharacterBtn.addEventListener('click', this.callbacks.saveCharacter);
        this.elements.loadCharacterBtn.addEventListener('click', () => this.callbacks.loadCharacter(true));
        this.elements.newCharacterBtn.addEventListener('click', this.callbacks.newCharacter);
        this.elements.dialogueTextInput.addEventListener('input', this.callbacks.handleDialogueChange);
    }

    updateUIState(hasBase, hasTalking, hasDialogue) {
        // Base frame controls
        this.elements.basePromptInput.disabled = this.isGenerating || hasBase;
        this.elements.generateBaseFrameBtn.disabled = this.isGenerating;
        this.elements.cleanupBaseFrameBtn.disabled = this.isGenerating || !hasBase;

        // Talking frame controls
        this.elements.talkingCanvas.classList.toggle('hidden', !hasBase);
        this.elements.talkingPromptInput.disabled = this.isGenerating || !hasBase;
        this.elements.generateTalkingFrameBtn.disabled = this.isGenerating || !hasBase;

        // Loop controls
        this.elements.previewLoopBtn.disabled = this.isGenerating || !hasTalking || this.loopIntervalId !== null;
        this.elements.stopLoopBtn.disabled = this.loopIntervalId === null;

        // Clip generation
        this.elements.generateClipBtn.disabled = this.isGenerating || !hasTalking || !hasDialogue;

        // Storage controls
        this.elements.saveCharacterBtn.disabled = !hasTalking;
    }

    showLoading(target, show) {
        this.isGenerating = show;

        let loadingIconId;
        let btnTextClass;
        let btn;

        if (target === 'clip') {
            loadingIconId = 'clipLoadingIcon';
            btnTextClass = 'clip-text';
            btn = this.elements.generateClipBtn;
        } else if (target === 'cleanup') {
            loadingIconId = 'cleanupLoadingIcon';
            btnTextClass = 'cleanup-text';
            btn = this.elements.cleanupBaseFrameBtn;
        } else {
            // Base or Talking
            loadingIconId = target + 'LoadingIcon';
            btnTextClass = target + '-text';
            btn = this.elements['generate' + target.charAt(0).toUpperCase() + target.slice(1) + 'FrameBtn'];
        }

        const loadingIcon = document.getElementById(loadingIconId);
        const btnText = btn.querySelector('.' + btnTextClass);

        if (show) {
            loadingIcon.style.display = 'block';
            btnText.style.opacity = '0';
        } else {
            loadingIcon.style.display = 'none';
            btnText.style.opacity = '1';
        }
    }

    setLoopState(intervalId) {
        this.loopIntervalId = intervalId;
    }

    setStatus(target, message) {
        this.elements[`${target}Status`].textContent = message;
    }

    getPrompt(type) {
        if (type === 'base') return this.elements.basePromptInput.value.trim();
        if (type === 'talking') return this.elements.talkingPromptInput.value.trim();
        return '';
    }

    setPrompt(type, value) {
        if (type === 'base') this.elements.basePromptInput.value = value;
        if (type === 'talking') this.elements.talkingPromptInput.value = value;
        if (type === 'dialogue') this.elements.dialogueTextInput.value = value;
    }

    getDialogueText() {
        return this.elements.dialogueTextInput.value.trim();
    }

    // Methods for handling TTS display
    setAudioSource(url) {
        this.elements.audioPlayer.src = url;
        this.elements.audioPlayer.style.display = 'block';
    }

    hideAudioPlayer() {
        this.elements.audioPlayer.src = '';
        this.elements.audioPlayer.style.display = 'none';
        this.elements.ttsDurationDisplay.textContent = '';
    }

    displayDuration(duration) {
        this.elements.ttsDurationDisplay.textContent = `Audio Duration: ${duration.toFixed(2)} seconds`;
    }
}