// chatHistory.js
class ChatHistory {
  constructor() {
    this.isOpen = false;
    this.initialize();
    this.attachEventListeners();
  }

  initialize() {
    // Create sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'chat-history-sidebar';
    this.sidebar.innerHTML = `
      <div class="chat-history-header">
        <h2>Chat History</h2>
        <button class="close-history-btn" title="Close history">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="chat-history-list"></div>
    `;
    document.querySelector('.app-container').appendChild(this.sidebar);

    // Create menu button in header
    this.menuButton = document.createElement('button');
    this.menuButton.id = 'history-btn';
    this.menuButton.className = 'icon-btn';
    this.menuButton.title = 'Chat History';
    this.menuButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;

    // Insert menu button before the new chat button
    const header = document.querySelector('.header');
    const newChatBtn = document.getElementById('new-chat-btn');
    header.insertBefore(this.menuButton, newChatBtn);
  }

  attachEventListeners() {
    // Toggle sidebar
    this.menuButton.addEventListener('click', () => this.toggleSidebar());
    
    // Close button
    this.sidebar.querySelector('.close-history-btn').addEventListener('click', () => 
      this.toggleSidebar(false)
    );

    // Handle chat selection and deletion
    this.sidebar.querySelector('.chat-history-list').addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('.delete-chat-btn');
      if (deleteBtn) {
        e.stopPropagation(); // Prevent chat selection when deleting
        const chatItem = deleteBtn.closest('.chat-history-item');
        await this.handleChatDeletion(chatItem.dataset.id);
        return;
      }

      const chatItem = e.target.closest('.chat-history-item');
      if (chatItem) {
        this.handleChatSelection(chatItem.dataset.id);
      }
    });

    // Outside click handler
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !this.sidebar.contains(e.target) && 
          !this.menuButton.contains(e.target)) {
        this.toggleSidebar(false);
      }
    });

    // Update history when new chats are created or messages added
    document.addEventListener('newChatCreated', () => this.updateChatList());
    document.addEventListener('messageAdded', () => this.updateChatList());
  }

  async toggleSidebar(force = null) {
    this.isOpen = force !== null ? force : !this.isOpen;
    this.sidebar.classList.toggle('open', this.isOpen);
    document.querySelector('.app-container').classList.toggle('sidebar-open', this.isOpen);
    
    if (this.isOpen) {
      await this.updateChatList();
      this.menuButton.setAttribute('aria-expanded', 'true');
    } else {
      this.menuButton.setAttribute('aria-expanded', 'false');
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  getDisplayTitle(websiteInfo) {
    if (!websiteInfo) return 'New Chat';
    if (websiteInfo.title) return websiteInfo.title;
    if (websiteInfo.url) {
      try {
        const url = new URL(websiteInfo.url);
        return url.hostname;
      } catch {
        return websiteInfo.url;
      }
    }
    return 'New Chat';
  }

  async updateChatList() {
    const listContainer = this.sidebar.querySelector('.chat-history-list');
    const conversations = await chatManager.getConversationList();
    const activeId = chatManager.currentConversationId;

    if (conversations.length === 0) {
      listContainer.innerHTML = `
        <div class="chat-history-empty">
          No chat history yet
        </div>
      `;
      return;
    }

    // Sort conversations by lastUpdated, newest first
    conversations.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    listContainer.innerHTML = conversations.map(chat => `
      <div class="chat-history-item ${chat.id === activeId ? 'active' : ''}" 
           data-id="${chat.id}"
           role="button"
           tabindex="0">
        <div class="chat-preview">
          <div class="chat-title">
            ${this.getDisplayTitle(chat.websiteInfo)}
            <span class="chat-date">${this.formatDate(chat.lastUpdated)}</span>
          </div>
          <div class="chat-url">${chat.websiteInfo?.url || ''}</div>
        </div>
        <button class="delete-chat-btn" title="Delete chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
        ${chat.id === activeId ? '<div class="active-indicator"></div>' : ''}
      </div>
    `).join('');
  }

  async handleChatDeletion(conversationId) {
    try {
      const isActive = conversationId === chatManager.currentConversationId;
      
      // Delete the conversation
      await chatManager.deleteConversation(conversationId);
      
      // If we deleted the active conversation, create a new one
      if (isActive) {
        await chatManager.createNewConversation();
        window.uiManager.clearChat();
      }
      
      // Update the chat list
      await this.updateChatList();
      
    } catch (error) {
      console.error('Error deleting conversation:', error);
      window.uiManager.showError('Failed to delete conversation');
    }
  }

  async handleChatSelection(conversationId) {
    try {
      await chatManager.loadConversation(conversationId);
      window.uiManager.clearChat();
      
      // Load and display messages
      const conversation = chatManager.getCurrentConversation();
      conversation.messages.forEach(msg => {
        window.uiManager.addMessageToUI(msg.role, msg.content);
      });

      this.updateChatList();
      
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        this.toggleSidebar(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      window.uiManager.showError('Failed to load conversation');
    }
  }
}

// Initialize the chat history component
window.chatHistory = new ChatHistory();