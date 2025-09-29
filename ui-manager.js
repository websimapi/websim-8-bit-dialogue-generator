export class UIManager {
    constructor(generator) {
        this.generator = generator;
        
        // Element references
        this.basePromptInput = document.getElementById('basePrompt');
        this.talkingPromptInput = document.getElementById('talkingPrompt');
        this.dialogueTextInput = document.getElementById('dialogueText');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.ttsDurationDisplay = document.getElementById('ttsDuration');
    }

    bindEvents() {
        document.getElementById('generateBaseFrame').addEventListener('click', () => this.generator.generateBaseFrame());
        document.getElementById('generateTalkingFrame').addEventListener('click', () => this.generator.generateTalkingFrame());
        document.getElementById('cleanupBaseFrame').addEventListener('click', () => this.generator.cleanupBaseFrame());
        document.getElementById('previewLoop').addEventListener('click', () => this.generator.startPreviewLoop());
        document.getElementById('stopLoop').addEventListener('click', () => this.generator.stopPreviewLoop());
        document.getElementById('generateClip').addEventListener('click', () => this.generator.generateClip());
        document.getElementById('saveCharacter').addEventListener('click', () => this.generator.saveCharacter());
        document.getElementById('loadCharacter').addEventListener('click', () => this.generator.loadCharacterFromStorage(true));
        document.getElementById('newCharacter').addEventListener('click', () => this.generator.newCharacter());

        this.dialogueTextInput.addEventListener('input', () => this.generator.handleDialogueChange());
    }

    updateUIState() {
        const hasBase = !!this.generator.baseFrameData;
        const hasTalking = !!this.generator.talkingFrameData;
        const hasDialogue = this.dialogueTextInput.value.trim().length > 0;

        // Base frame controls
        this.basePromptInput.disabled = this.generator.isGenerating || hasBase;
        document.getElementById('generateBaseFrame').disabled = this.generator.isGenerating;
        
        // Cleanup button state
        document.getElementById('cleanupBaseFrame').disabled = this.generator.isGenerating || !hasBase;

        // Talking frame controls
        this.generator.previewManager.talkingCanvas.classList.toggle('hidden', !hasBase);
        this.talkingPromptInput.disabled = this.generator.isGenerating || !hasBase;
        document.getElementById('generateTalkingFrame').disabled = this.generator.isGenerating || !hasBase;

        // Loop controls
        document.getElementById('previewLoop').disabled = this.generator.isGenerating || !hasTalking || this.generator.previewManager.loopIntervalId !== null;
        document.getElementById('stopLoop').disabled = this.generator.previewManager.loopIntervalId === null;

        // Clip generation
        document.getElementById('generateClip').disabled = this.generator.isGenerating || !hasTalking || !hasDialogue;

        // Storage controls
        document.getElementById('saveCharacter').disabled = !hasTalking;
    }

    showLoading(target, show) {
        let loadingIconId;
        let btnTextClass;
        let btn;

        if (target === 'clip') {
            loadingIconId = 'clipLoadingIcon';
            btnTextClass = 'clip-text';
            btn = document.getElementById('generateClip');
        } else if (target === 'cleanup') {
            loadingIconId = 'cleanupLoadingIcon';
            btnTextClass = 'cleanup-text';
            btn = document.getElementById('cleanupBaseFrame');
        } else {
            loadingIconId = target + 'LoadingIcon';
            btnTextClass = target + '-text';
            btn = document.getElementById('generate' + target.charAt(0).toUpperCase() + target.slice(1) + 'Frame');
        }

        const loadingIcon = document.getElementById(loadingIconId);
        const btnText = btn.querySelector('.' + btnTextClass);

        this.generator.isGenerating = show;

        if (show) {
            loadingIcon.style.display = 'block';
            btnText.style.opacity = '0';
        } else {
            loadingIcon.style.display = 'none';
            btnText.style.opacity = '1';
        }

        this.updateUIState();
    }
}