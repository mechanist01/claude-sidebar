// chatHistoryService.js

class ChatHistoryService {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            const { chats } = await chrome.storage.local.get('chats');
            if (!chats) {
                // Initialize empty chat storage
                await chrome.storage.local.set({ chats: [] });
            }
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize chat history:', error);
            throw error;
        }
    }

    async saveChat(chatId, title = null) {
        try {
            const currentChat = window.chatManager.getCurrentConversation();
            if (!currentChat.messages.length) return null;

            const { chats = [] } = await chrome.storage.local.get('chats');
            
            // Generate title from first message if not provided
            const chatTitle = title || this.generateChatTitle(currentChat.messages);
            
            const chatData = {
                id: chatId || `chat_${Date.now()}`,
                title: chatTitle,
                lastMessage: currentChat.messages[currentChat.messages.length - 1].content,
                timestamp: new Date().toISOString(),
                messages: currentChat.messages
            };

            // Check if chat already exists
            const existingIndex = chats.findIndex(chat => chat.id === chatData.id);
            if (existingIndex >= 0) {
                chats[existingIndex] = chatData;
            } else {
                chats.unshift(chatData); // Add to beginning of array
            }

            // Keep only last 50 chats
            const trimmedChats = chats.slice(0, 50);
            await chrome.storage.local.set({ chats: trimmedChats });

            return chatData;
        } catch (error) {
            console.error('Failed to save chat:', error);
            throw error;
        }
    }

    generateChatTitle(messages) {
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (!firstUserMessage) return 'New Chat';
        
        const title = firstUserMessage.content.slice(0, 30);
        return title.length < firstUserMessage.content.length ? `${title}...` : title;
    }

    async loadChat(chatId) {
        try {
            const { chats = [] } = await chrome.storage.local.get('chats');
            const chat = chats.find(c => c.id === chatId);
            
            if (!chat) {
                throw new Error('Chat not found');
            }

            return chat;
        } catch (error) {
            console.error('Failed to load chat:', error);
            throw error;
        }
    }

    async getRecentChats(limit = 10) {
        try {
            const { chats = [] } = await chrome.storage.local.get('chats');
            return chats.slice(0, limit);
        } catch (error) {
            console.error('Failed to get recent chats:', error);
            throw error;
        }
    }

    async deleteChat(chatId) {
        try {
            const { chats = [] } = await chrome.storage.local.get('chats');
            const updatedChats = chats.filter(chat => chat.id !== chatId);
            await chrome.storage.local.set({ chats: updatedChats });
        } catch (error) {
            console.error('Failed to delete chat:', error);
            throw error;
        }
    }

    async searchChats(query) {
        try {
            const { chats = [] } = await chrome.storage.local.get('chats');
            return chats.filter(chat => 
                chat.title.toLowerCase().includes(query.toLowerCase()) ||
                chat.messages.some(msg => 
                    msg.content.toLowerCase().includes(query.toLowerCase())
                )
            );
        } catch (error) {
            console.error('Failed to search chats:', error);
            throw error;
        }
    }
}

window.chatHistoryService = new ChatHistoryService();