// uiManager.js
class UIManager {
    constructor() {
      this.initialize();
      this.attachEventListeners();
    }
  
    initialize() {
      this.chatOutput = document.getElementById('chat-output');
      this.userInput = document.getElementById('user-input');
      this.sendButton = document.getElementById('send-btn');
      this.newChatButton = document.getElementById('new-chat-btn');
      this.settingsButton = document.getElementById('settings-btn');
      
      this.checkApiKey();
    }
  
    attachEventListeners() {
      this.sendButton.addEventListener('click', () => this.handleSend());
      this.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
  
      this.newChatButton.addEventListener('click', () => this.handleNewChat());
      this.settingsButton.addEventListener('click', () => {
        window.settings.showModal();
      });
    }
  
    async checkApiKey() {
      const { apiKey } = await chrome.storage.local.get('apiKey');
      if (!apiKey) {
        window.settings.showModal();
      }
    }
  
    async handleSend() {
      const message = this.userInput.value.trim();
      if (!message) return;
  
      this.userInput.value = '';
      this.userInput.disabled = true;
      this.sendButton.disabled = true;
  
      try {
        // Add user message to UI with "user" role
        this.addMessageToUI('user', message);
        
        // Show loading indicator
        this.showLoading();
  
        // Send message and get response
        const response = await apiService.sendMessage(message, chatManager.currentConversationId);
        
        // Remove loading indicator and add assistant response
        this.hideLoading();
        this.addMessageToUI('assistant', response.response);
  
        // Save to chat manager
        await chatManager.addMessage('user', message);
        await chatManager.addMessage('assistant', response.response);
  
      } catch (error) {
        this.hideLoading();
        this.showError('Failed to send message. Please try again.');
        console.error('Send message error:', error);
      } finally {
        this.userInput.disabled = false;
        this.sendButton.disabled = false;
        this.userInput.focus();
      }
    }
  
    async handleNewChat() {
      try {
        await chatManager.createNewConversation();
        this.clearChat();
      } catch (error) {
        this.showError('Failed to create new chat. Please try again.');
        console.error('New chat error:', error);
      }
    }
  
    addMessageToUI(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.textContent = content;
      
      const timestampDiv = document.createElement('div');
      timestampDiv.className = 'message-timestamp';
      timestampDiv.textContent = new Date().toLocaleTimeString();
      
      messageDiv.appendChild(contentDiv);
      messageDiv.appendChild(timestampDiv);
      
      this.chatOutput.appendChild(messageDiv);
      this.scrollToBottom();
    }
  
    showLoading() {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.innerHTML = `
        <div class="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      this.chatOutput.appendChild(loadingDiv);
      this.scrollToBottom();
    }
  
    hideLoading() {
      const loading = this.chatOutput.querySelector('.loading');
      if (loading) {
        loading.remove();
      }
    }
  
    showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'message error';
      errorDiv.textContent = message;
      this.chatOutput.appendChild(errorDiv);
      this.scrollToBottom();
  
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
  
    clearChat() {
      this.chatOutput.innerHTML = '';
    }
  
    scrollToBottom() {
      this.chatOutput.scrollTop = this.chatOutput.scrollHeight;
    }
  }
  
  window.uiManager = new UIManager();