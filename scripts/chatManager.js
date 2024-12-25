// chatManager.js
class ChatManager {
    constructor() {
      this.currentConversationId = null;
      this.messages = [];
      this.initialized = false;
    }
  
    async initialize() {
      if (this.initialized) return;
  
      try {
        const { activeConversation } = await chrome.storage.local.get('activeConversation');
        if (activeConversation) {
          await this.loadConversation(activeConversation);
        } else {
          await this.createNewConversation();
        }
        this.initialized = true;
      } catch (error) {
        console.error('Chat initialization error:', error);
        throw error;
      }
    }
  
    async createNewConversation() {
      this.currentConversationId = this.generateConversationId();
      this.messages = [];
      await this.saveCurrentState();
      return this.currentConversationId;
    }
  
    generateConversationId() {
      return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  
    async loadConversation(conversationId) {
      try {
        const { conversations } = await chrome.storage.local.get('conversations');
        if (conversations?.[conversationId]) {
          this.currentConversationId = conversationId;
          this.messages = conversations[conversationId].messages;
          await chrome.storage.local.set({ activeConversation: conversationId });
        } else {
          await this.createNewConversation();
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
        throw error;
      }
    }
  
    async addMessage(role, content) {
      // Ensure role is either 'user' or 'assistant'
      const validRole = role === 'user' ? 'user' : 'assistant';
      
      const message = {
        role: validRole,
        content,
        timestamp: new Date().toISOString()
      };
  
      this.messages.push(message);
      await this.saveCurrentState();
      return message;
    }
  
    async saveCurrentState() {
      try {
        const { conversations = {} } = await chrome.storage.local.get('conversations');
        conversations[this.currentConversationId] = {
          messages: this.messages,
          lastUpdated: new Date().toISOString()
        };
  
        await chrome.storage.local.set({
          conversations,
          activeConversation: this.currentConversationId
        });
      } catch (error) {
        console.error('Error saving chat state:', error);
        throw error;
      }
    }
  
    async getConversationList() {
      try {
        const { conversations = {} } = await chrome.storage.local.get('conversations');
        return Object.entries(conversations).map(([id, data]) => ({
          id,
          lastUpdated: data.lastUpdated,
          preview: data.messages[data.messages.length - 1]?.content.substring(0, 50) + '...'
        }));
      } catch (error) {
        console.error('Error getting conversation list:', error);
        return [];
      }
    }
  
    getCurrentConversation() {
      return {
        id: this.currentConversationId,
        messages: this.messages
      };
    }
  
    async deleteConversation(conversationId) {
      try {
        const { conversations = {} } = await chrome.storage.local.get('conversations');
        delete conversations[conversationId];
        await chrome.storage.local.set({ conversations });
  
        if (conversationId === this.currentConversationId) {
          await this.createNewConversation();
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
      }
    }
}
  
window.chatManager = new ChatManager();