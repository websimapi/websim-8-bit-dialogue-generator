export class StorageManager {
    constructor() {
        this.CHARACTER_STORAGE_KEY = '8bit_dialogue_character';
    }

    saveCharacter(characterData) {
        try {
            localStorage.setItem(this.CHARACTER_STORAGE_KEY, JSON.stringify(characterData));
            alert('Character saved successfully!');
        } catch (e) {
            console.error('Failed to save character:', e);
            alert('Failed to save character. Local storage might be full.');
        }
    }

    loadCharacter(userInitiated = false) {
        try {
            const storedData = localStorage.getItem(this.CHARACTER_STORAGE_KEY);
            if (storedData) {
                const data = JSON.parse(storedData);
                if (userInitiated) {
                    alert('Character loaded successfully!');
                }
                return data;
            } else if (userInitiated) {
                alert('No saved character found.');
            }
            return null;
        } catch (e) {
            console.error('Failed to load character:', e);
            if (userInitiated) {
                alert('Failed to load character data.');
            }
            return null;
        }
    }
}

