# ClaudIA - Chrome Sidebar Extension

ClaudIA is a Chrome extension that provides convenient access to Claude AI through a sidebar interface, allowing you to chat with Claude while browsing the web.

![ClaudIA Screenshot Placeholder](https://i.ibb.co/vdVj3cy/screenshot.png)

## Features

- 💬 Easy-to-use sidebar interface
- 🔐 Secure API key storage
- 📱 Responsive design
- 🎨 Clean, modern UI
- ⚡ Fast response times

## Installation

### Prerequisites

- Google Chrome browser
- Claude API key from Anthropic ([Get API Key](https://www.anthropic.com/))

### Installation Steps

1. **Download the Extension**
   - Clone this repository or download it as a ZIP file
   - Extract the ZIP file if necessary

2. **Enable Developer Mode in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - In the top-right corner, toggle "Developer mode" to ON

3. **Load the Extension**
   - Click "Load unpacked" in the top-left corner
   - Navigate to the extracted extension folder and select it
   - The ClaudIA extension icon should appear in your Chrome toolbar

4. **Configure the Extension**
   - Click the extension icon in the Chrome toolbar
   - The sidebar will open
   - Click the settings icon (⚙️) in the top-right corner
   - Enter your Claude API key
   - Click "Save"

## Usage

1. **Opening the Sidebar**
   - Click the ClaudIA extension icon in your Chrome toolbar
   - The sidebar will appear on the right side of your browser

2. **Starting a Conversation**
   - Type your message in the input field at the bottom
   - Press Enter or click the send button
   - Claude will respond in the chat window

3. **Starting a New Chat**
   - Click the "+" icon to start a fresh conversation

## Security Note

Your Claude API key is stored locally in Chrome's secure storage and is never shared with any third parties. The extension only communicates directly with Anthropic's API.

## Troubleshooting

### Common Issues

1. **Extension Not Loading**
   - Make sure Developer mode is enabled
   - Try reloading the extension
   - Restart Chrome

2. **API Key Issues**
   - Verify your API key is correct
   - Check if your API key has sufficient permissions
   - Ensure you have proper internet connectivity

3. **Sidebar Not Opening**
   - Check if other extensions are conflicting
   - Try reinstalling the extension

### Error Messages

- "Invalid API key": Double-check your API key in the settings
- "Failed to send message": Check your internet connection

## Technical Architecture

### Project Structure
```
claudia-extension/
├── manifest.json
├── background.js
├── styles/
│   ├── main.css        # Base styles and variables
│   └── chat.css        # Chat interface styles
├── scripts/
│   ├── apiService.js   # Claude API interactions
│   ├── chatManager.js  # Conversation management
│   ├── uiManager.js    # UI updates and events
│   └── sidepanel.js    # Main orchestration
├── images/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── sidepanel.html
```

### Core Components

#### ApiService (apiService.js)
- Handles all Claude API interactions
- Manages API key validation and storage
- Formats messages for API calls

Key methods:
- `initialize()` - Set up API service
- `validateApiKey(apiKey)` - Test API key validity
- `sendMessage(message)` - Send message to Claude API
- `cleanMessages(messages)` - Format messages for API

#### ChatManager (chatManager.js)
- Manages conversation state
- Handles conversation storage and retrieval
- Manages state management

Key methods:
- `initialize()` - Set up chat manager
- `createNewConversation()` - Start new chat
- `addMessage(role, content)` - Add message to current chat
- `saveCurrentState()` - Save chat to storage

#### UIManager (uiManager.js)
- Manages UI updates and animations
- Handles user input
- Shows loading states and errors
- Manages settings modal

Key methods:
- `initialize()` - Set up UI manager
- `handleSend()` - Process message sending
- `addMessage(role, content)` - Add message to display
- `showLoading()` - Show typing indicator
- `showError(message)` - Display error message
- `toggleSettings()` - Show/hide settings

#### SidePanel (sidepanel.js)
- Orchestrates all components
- Manages initialization flow
- Handles global error catching
- Coordinates component interactions

Key methods:
- `initialize()` - Set up side panel
- `handleSendMessage()` - Process message sending
- `handleNewChat()` - Create new chat
- `saveSettings()` - Save API key

### Data Flow

#### Message Flow
```
User Input -> UIManager.handleSend() 
  -> ApiService.sendMessage() 
    -> ChatManager.addMessage()
```

#### Storage Structure
```javascript
{
  apiKey: "string",
  currentChat: {
    messages: [{
      role: "user" | "assistant",
      content: string,
      timestamp: string
    }]
  }
}
```

### Error Handling

The extension implements robust error handling for various scenarios:

#### API Errors
```javascript
try {
  const response = await makeAnthropicRequest();
} catch (error) {
  if (error.type === 'rate_limit_error') {
    // Implements exponential backoff
  } else if (error.type === 'authentication_error') {
    // Prompts for new API key
  }
}
```

#### Storage Errors
```javascript
try {
  await chrome.storage.local.set(data);
} catch (error) {
  // Handles quota exceeded
  await cleanupOldConversations();
}
```


## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

[MIT License](LICENSE)

## Support

For support, please open an issue on GitHub.

---

Made with ❤️ by Ryan Register & Claude Sonnet, sampling by gpt4o 
