// apiService.js
class ApiService {
    constructor() {
        this.apiKey = null;
        this.model = 'claude-3-opus-20240229';
        this.hasFirstMessageBeenSent = false;
    }
  
    cleanMessages(messages) {
        return messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    }
  
    async initialize() {
      try {
        console.log('Initializing API Service...');
        const settings = await chrome.storage.local.get(['apiKey', 'model']);
        console.log('Retrieved settings:', settings);
        
        this.apiKey = settings.apiKey;
        this.model = settings.model || 'claude-3-opus-20240229';
  
        if (!this.apiKey) {
          throw new Error('Claude API key not found');
        }
  
      } catch (error) {
        console.error('API initialization error:', error);
        throw new Error('Failed to initialize API service');
      }
    }
  
    async sendMessage(message, conversationId = null) {
      if (!this.apiKey) {
        await this.initialize();
      }
  
      try {
        console.log('Sending message with model:', this.model);
        const messages = await this.getConversationHistory(conversationId);
        messages.push({ 
          role: 'user', 
          content: message 
        });
  
        const cleanedMessages = this.cleanMessages(messages);
  
        console.log('Sending to background with apiKey:', this.apiKey ? '(key present)' : '(no key)');
        const response = await chrome.runtime.sendMessage({
          type: 'SEND_MESSAGE',
          apiKey: this.apiKey,
          model: this.model,
          messages: cleanedMessages,
          isFirstMessage: !this.hasFirstMessageBeenSent,
          conversationId: conversationId
        });
  
        this.hasFirstMessageBeenSent = true;

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
  
        await this.cleanupOldConversations(conversations);
  
      } catch (error) {
        console.error('Error saving conversation:', error);
        throw error;
      }
    }
  
    async cleanupOldConversations(conversations) {
      try {
        const { bytesInUse } = await chrome.storage.local.getBytesInUse();
        const maxBytes = chrome.storage.local.QUOTA_BYTES;
  
        if (bytesInUse > maxBytes * 0.8) {
          const conversationList = Object.entries(conversations)
            .sort(([, a], [, b]) => 
              new Date(a.lastUpdated) - new Date(b.lastUpdated)
            );
  
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
  
    async updateApiKey(newApiKey) {
      try {
        console.log('Updating API key...');
        await chrome.storage.local.set({ apiKey: newApiKey });
        this.apiKey = newApiKey;
        return true;
      } catch (error) {
        console.error('Error updating API key:', error);
        throw error;
      }
    }

    resetFirstMessageFlag() {
        this.hasFirstMessageBeenSent = false;
    }
}
  
window.apiService = new ApiService();