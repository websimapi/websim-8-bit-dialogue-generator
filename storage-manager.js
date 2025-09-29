// storage-manager.js

export class StorageManager {
    constructor(storageKey) {
        this.STORAGE_KEY = storageKey;
    }

    // removed function saveCharacter() {}
    saveCharacter(basePrompt, talkingPrompt, baseFrameData, talkingFrameData) {
        if (!baseFrameData || !talkingFrameData) {
            throw new Error('Both frames must be generated before saving.');
        }

        const characterData = {
            basePrompt: basePrompt,
            talkingPrompt: talkingPrompt,
            baseFrameData: baseFrameData,
            talkingFrameData: talkingFrameData
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(characterData));
    }

    // removed function loadCharacter() {}
    loadCharacter() {
        const storedData = localStorage.getItem(this.STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        }
        return null;
    }
}

