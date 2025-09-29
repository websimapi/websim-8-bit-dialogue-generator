export class UIStateManager {
    update({ hasBase, hasTalking, hasDialogue, isGenerating, isLooping }) {
        // Base frame controls
        document.getElementById('basePrompt').disabled = isGenerating || hasBase;
        document.getElementById('generateBaseFrame').disabled = isGenerating;

        // Cleanup button state
        document.getElementById('cleanupBaseFrame').disabled = isGenerating || !hasBase;

        // Talking frame controls
        document.getElementById('talkingFrameCanvas').classList.toggle('hidden', !hasBase);
        document.getElementById('talkingPrompt').disabled = isGenerating || !hasBase;
        document.getElementById('generateTalkingFrame').disabled = isGenerating || !hasBase;

        // Loop controls
        document.getElementById('previewLoop').disabled = isGenerating || !hasTalking || isLooping;
        document.getElementById('stopLoop').disabled = !isLooping;

        // Clip generation
        document.getElementById('generateClip').disabled = isGenerating || !hasTalking || !hasDialogue;

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

        if (show) {
            loadingIcon.style.display = 'block';
            btnText.style.opacity = '0';
        } else {
            loadingIcon.style.display = 'none';
            btnText.style.opacity = '1';
        }
    }
}