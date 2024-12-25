class SidePanel {
  constructor() {
    this.initialized = false;
    this.initializeWhenReady();
  }

  async initializeWhenReady() {
    while (!window.apiService || !window.chatManager || !window.uiManager || !window.settings) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.elements = {
      chatOutput: document.getElementById('chat-output'),
      userInput: document.getElementById('user-input'),
      sendButton: document.getElementById('send-btn'),
      newChatButton: document.getElementById('new-chat-btn'),
      settingsButton: document.getElementById('settings-btn'),
      // Add new page modal elements
      newPageModal: document.getElementById('new-page-modal'),
      startNewChatBtn: document.getElementById('start-new-chat'),
      continueChatBtn: document.getElementById('continue-current'),
      closeNewPageBtn: document.getElementById('close-new-page'),
      webpageTitle: document.querySelector('#new-page-modal .webpage-title')
    };
    
    this.bindEventListeners();
    this.initialize();
  }

  bindEventListeners() {
    // Message sending
    this.elements.sendButton.addEventListener('click', () => this.handleSendMessage());
    this.elements.userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // New chat
    this.elements.newChatButton.addEventListener('click', () => this.handleNewChat());

    // Settings
    this.elements.settingsButton.addEventListener('click', () => {
      window.settings.showModal();
    });

    // New page modal handlers
    this.elements.startNewChatBtn.addEventListener('click', () => {
      this.hideNewPageModal();
      this.handleNewChat();
    });
    this.elements.continueChatBtn.addEventListener('click', () => {
      this.hideNewPageModal();
    });
    this.elements.closeNewPageBtn.addEventListener('click', () => {
      this.hideNewPageModal();
    });

    // Listen for page change messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'NEW_PAGE_DETECTED') {
        this.showNewPageModal(request.url, request.title);
      }
      return true;
    });

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshChat();
      }
    });

    // Global error handling
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred. Please try refreshing.');
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('An unexpected error occurred. Please try refreshing.');
    });
  }

  async initialize() {
    try {
      // Initialize services
      await window.apiService.initialize();
      await window.chatManager.initialize();

      // Load existing conversation
      const currentConversation = window.chatManager.getCurrentConversation();
      if (currentConversation.messages.length > 0) {
        this.renderConversation(currentConversation.messages);
      }

      this.initialized = true;

      // Enable input once initialized
      this.elements.userInput.disabled = false;
      this.elements.sendButton.disabled = false;

    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize chat. Please check your API key and try again.');
      window.settings.showModal();
    }
  }

  showNewPageModal(url, title) {
    if (this.elements.newPageModal) {
      // Update webpage title in modal
      if (this.elements.webpageTitle) {
        this.elements.webpageTitle.textContent = title || url;
      }
      // Show the modal
      this.elements.newPageModal.style.display = 'block';
    }
  }

  hideNewPageModal() {
    if (this.elements.newPageModal) {
      this.elements.newPageModal.style.display = 'none';
    }
  }

  async handleSendMessage() {
    const message = this.elements.userInput.value.trim();
    if (!message) return;

    // Disable input while processing
    this.elements.userInput.disabled = true;
    this.elements.sendButton.disabled = true;

    try {
      // Add user message to UI
      this.addMessageToUI('user', message);
      this.elements.userInput.value = '';

      // Show typing indicator
      this.showTypingIndicator();

      // Send to Claude API
      const response = await window.apiService.sendMessage(message, window.chatManager.currentConversationId);

      // Remove typing indicator
      this.hideTypingIndicator();

      // Add Claude's response to UI
      this.addMessageToUI('assistant', response.response);

      // Save messages to chat manager
      await window.chatManager.addMessage('user', message);
      await window.chatManager.addMessage('assistant', response.response);

    } catch (error) {
      console.error('Message send error:', error);
      this.hideTypingIndicator();
      this.showError('Failed to send message. Please try again.');
    } finally {
      // Re-enable input
      this.elements.userInput.disabled = false;
      this.elements.sendButton.disabled = false;
      this.elements.userInput.focus();
    }
  }

  async handleNewChat() {
    try {
      await window.chatManager.createNewConversation();
      this.elements.chatOutput.innerHTML = '';
      this.elements.userInput.focus();
    } catch (error) {
      console.error('New chat error:', error);
      this.showError('Failed to create new chat.');
    }
  }

  async refreshChat() {
    if (!this.initialized) return;
    
    try {
      await window.chatManager.initialize();
      const currentConversation = window.chatManager.getCurrentConversation();
      this.renderConversation(currentConversation.messages);
    } catch (error) {
      console.error('Refresh error:', error);
      this.showError('Failed to refresh chat.');
    }
  }

  renderConversation(messages) {
    this.elements.chatOutput.innerHTML = '';
    messages.forEach(message => {
      this.addMessageToUI(message.role, message.content);
    });
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
    
    this.elements.chatOutput.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'loading';
    indicatorDiv.innerHTML = `
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    this.elements.chatOutput.appendChild(indicatorDiv);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = this.elements.chatOutput.querySelector('.loading');
    if (indicator) {
      indicator.remove();
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.textContent = message;
    this.elements.chatOutput.appendChild(errorDiv);
    this.scrollToBottom();

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  scrollToBottom() {
    this.elements.chatOutput.scrollTop = this.elements.chatOutput.scrollHeight;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.sidePanel = new SidePanel();
});

// Handle extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NEW_CONVERSATION') {
    window.sidePanel.handleNewChat();
    sendResponse({ success: true });
  }
  return true;
});