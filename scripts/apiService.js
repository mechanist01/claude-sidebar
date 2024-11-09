// apiService.js

class ApiService {
    constructor() {
        this.claudeApiKey = null;
        this.gptApiKey = null;
        this.model = 'claude-3-opus-20240229';
    }
  
    // Clean messages to only include required fields
    cleanMessages(messages) {
        return messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    }
  
    async initialize() {
      try {
        const settings = await chrome.storage.local.get(['claudeApiKey', 'gptApiKey', 'model']);
        
        this.claudeApiKey = settings.claudeApiKey;
        this.gptApiKey = settings.gptApiKey;
        this.model = settings.model || 'claude-3-opus-20240229';
  
        // Check if we have the required API key for the selected model
        const requiredKey = this.model.includes('gpt') ? this.gptApiKey : this.claudeApiKey;
        if (!requiredKey) {
          throw new Error('Required API key not found');
        }
  
      } catch (error) {
        console.error('API initialization error:', error);
        throw new Error('Failed to initialize API service');
      }
    }
  
    async sendMessage(message, conversationId = null) {
      if (!this.claudeApiKey && !this.gptApiKey) {
        await this.initialize();
      }
  
      try {
        const messages = await this.getConversationHistory(conversationId);
        messages.push({ 
          role: 'user', 
          content: message 
        });
  
        // Clean messages before sending
        const cleanedMessages = this.cleanMessages(messages);
  
        // Use the appropriate API key based on the model
        const apiKey = this.model.includes('gpt') ? this.gptApiKey : this.claudeApiKey;
  
        const response = await chrome.runtime.sendMessage({
          type: 'SEND_MESSAGE',
          apiKey: apiKey,
          model: this.model,
          messages: cleanedMessages
        });
  
        if (response.error) {
          throw new Error(response.error);
        }
  
        if (!response.content) {
          throw new Error('No response content received');
        }
  
        const fullMessages = [
          ...messages,
          { 
            role: 'assistant', 
            content: response.content,
            timestamp: new Date().toISOString()
          }
        ];
  
        await this.saveConversation(conversationId, fullMessages);
  
        return {
          response: response.content,
          conversationId: conversationId
        };
  
      } catch (error) {
        console.error('Message send error:', error);
        throw new Error(error.message || 'Failed to send message');
      }
    }
  
    async getConversationHistory(conversationId) {
      if (!conversationId) {
        return [];
      }
  
      try {
        const { conversations } = await chrome.storage.local.get('conversations');
        return conversations?.[conversationId]?.messages || [];
      } catch (error) {
        console.error('Error getting conversation history:', error);
        return [];
      }
    }
  
    async saveConversation(conversationId, messages) {
      if (!conversationId) return;
  
      try {
        const { conversations = {} } = await chrome.storage.local.get('conversations');
        
        conversations[conversationId] = {
          messages,
          lastUpdated: new Date().toISOString()
        };
  
        await chrome.storage.local.set({ conversations });
  
        // Cleanup old conversations if storage is near limit
        await this.cleanupOldConversations(conversations);
  
      } catch (error) {
        console.error('Error saving conversation:', error);
        throw error;
      }
    }
  
    async cleanupOldConversations(conversations) {
      try {
        // Check storage usage
        const { bytesInUse } = await chrome.storage.local.getBytesInUse();
        const maxBytes = chrome.storage.local.QUOTA_BYTES;
  
        // If using more than 80% of quota, remove oldest conversations
        if (bytesInUse > maxBytes * 0.8) {
          const conversationList = Object.entries(conversations)
            .sort(([, a], [, b]) => 
              new Date(a.lastUpdated) - new Date(b.lastUpdated)
            );
  
          // Remove oldest 20% of conversations
          const removeCount = Math.ceil(conversationList.length * 0.2);
          for (let i = 0; i < removeCount; i++) {
            delete conversations[conversationList[i][0]];
          }
  
          await chrome.storage.local.set({ conversations });
        }
      } catch (error) {
        console.error('Error cleaning up conversations:', error);
      }
    }
  
    // Helper method to format messages for Claude API
    formatMessages(messages) {
      return messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    }
  
    // Method to clear API key and reset service
    async clearApiKey() {
      try {
        await chrome.storage.local.remove('apiKey');
        this.apiKey = null;
      } catch (error) {
        console.error('Error clearing API key:', error);
        throw error;
      }
    }
  
    // Method to update API key
    async updateApiKey(newApiKey) {
      try {
        const isValid = await this.validateApiKey(newApiKey);
        if (!isValid) {
          throw new Error('Invalid API key');
        }
  
        await chrome.storage.local.set({ apiKey: newApiKey });
        this.apiKey = newApiKey;
        return true;
      } catch (error) {
        console.error('Error updating API key:', error);
        throw error;
      }
    }
  
    updateApiKeys(claudeKey, gptKey) {
      this.claudeApiKey = claudeKey;
      this.gptApiKey = gptKey;
    }
  }
  
  // Create a global instance
  window.apiService = new ApiService();