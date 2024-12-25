// settings.js
class Settings {
    constructor() {
        this.modal = document.getElementById('settings-modal');
        this.apiKeyInput = document.getElementById('claude-api-key');
        this.modelSelect = document.getElementById('model');
        this.saveButton = document.getElementById('save-settings');
        this.cancelButton = document.getElementById('cancel-settings');
        this.closeButton = document.getElementById('close-settings');
        
        this.bindEvents();
    }

    bindEvents() {
        this.saveButton.addEventListener('click', () => this.saveSettings());
        this.cancelButton.addEventListener('click', () => this.hideModal());
        this.closeButton.addEventListener('click', () => this.hideModal());
        
        // Add key input sanitization
        if (this.apiKeyInput) {
            this.apiKeyInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text');
                // Remove any whitespace and newlines
                this.apiKeyInput.value = text.trim().replace(/\s+/g, '');
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    }

    showModal() {
        this.loadSettings();
        this.modal.classList.add('show');
    }

    hideModal() {
        this.modal.classList.remove('show');
    }

    async loadSettings() {
        console.log('Loading settings...');
        const settings = await chrome.storage.local.get(['apiKey', 'model']);
        console.log('Current stored settings:', {
            hasApiKey: !!settings.apiKey,
            model: settings.model
        });
        
        if (this.apiKeyInput) {
            this.apiKeyInput.value = settings.apiKey || '';
        }
        if (this.modelSelect) {
            this.modelSelect.value = settings.model || 'claude-3-opus-20240229';
        }
    }

    async saveSettings() {
        console.log('Saving settings with values:');
        let apiKey = this.apiKeyInput?.value || '';
        
        // Clean the API key
        apiKey = apiKey.trim().replace(/\s+/g, '');
        
        const model = this.modelSelect?.value || 'claude-3-opus-20240229';

        console.log('Model:', model);
        console.log('API Key length:', apiKey.length);

        if (!apiKey) {
            alert('Claude API key is required');
            return;
        }

        if (apiKey.length < 10) {
            alert('API key appears to be too short. Please check your key.');
            return;
        }

        if (apiKey.length > 200) {
            alert('API key appears to be too long. Please make sure you copied only the key.');
            return;
        }

        try {
            const settings = { apiKey, model };
            console.log('Saving settings with API key length:', settings.apiKey.length);

            // First update storage
            await chrome.storage.local.set(settings);
            console.log('Settings saved to storage');

            // Then update service
            if (window.apiService) {
                window.apiService.apiKey = apiKey;
                window.apiService.model = model;
                console.log('API service updated');
            }

            this.hideModal();
            
            // Finally reinitialize
            if (window.apiService && window.chatManager) {
                console.log('Reinitializing services...');
                await window.apiService.initialize();
                await window.chatManager.initialize();
                console.log('Services reinitialized');
            }
            
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings. Please try again.');
        }
    }
}

window.settings = new Settings();