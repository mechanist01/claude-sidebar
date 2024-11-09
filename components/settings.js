// settings.js
class Settings {
    constructor() {
        this.modal = document.getElementById('settings-modal');
        this.claudeApiKeyInput = document.getElementById('claude-api-key');
        this.gptApiKeyInput = document.getElementById('gpt-api-key');
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
        
        this.modelSelect.addEventListener('change', () => this.updateRequiredFields());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    }

    showModal() {
        this.loadSettings();
        this.modal.classList.add('show');
        this.updateRequiredFields();
    }

    hideModal() {
        this.modal.classList.remove('show');
    }

    updateRequiredFields() {
        const selectedModel = this.modelSelect.value;
        const isGPT = selectedModel.includes('gpt');
        
        this.claudeApiKeyInput.parentElement.classList.toggle('required', !isGPT);
        this.gptApiKeyInput.parentElement.classList.toggle('required', isGPT);
    }

    async loadSettings() {
        const settings = await chrome.storage.local.get(['claudeApiKey', 'gptApiKey', 'model']);
        this.claudeApiKeyInput.value = settings.claudeApiKey || '';
        this.gptApiKeyInput.value = settings.gptApiKey || '';
        this.modelSelect.value = settings.model || 'claude-3-opus-20240229';
    }

    async saveSettings() {
        const model = this.modelSelect.value;
        const claudeApiKey = this.claudeApiKeyInput.value.trim();
        const gptApiKey = this.gptApiKeyInput.value.trim();

        if (model.includes('gpt') && !gptApiKey) {
            alert('OpenAI API key is required for GPT models');
            return;
        }
        if (!model.includes('gpt') && !claudeApiKey) {
            alert('Claude API key is required for Claude models');
            return;
        }

        try {
            await chrome.storage.local.set({
                claudeApiKey,
                gptApiKey,
                model
            });

            window.apiService.updateApiKeys(claudeApiKey, gptApiKey);
            window.apiService.model = model;

            this.hideModal();
            
            await window.apiService.initialize();
            await window.chatManager.initialize();
            
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings. Please try again.');
        }
    }
}

window.settings = new Settings();