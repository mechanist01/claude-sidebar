# ClaudIA - Chrome Sidebar Extension

ClaudIA is a Chrome extension that provides convenient access to Claude AI through a sidebar interface, allowing you to chat with Claude while browsing the web.

![ClaudIA Screenshot Placeholder](/path/to/screenshot.png)

## Features

- 🔄 Persistent chat history
- 💬 Easy-to-use sidebar interface
- 🔐 Secure API key storage
- 📱 Responsive design
- 🎨 Clean, modern UI
- ⚡ Quick access to previous conversations

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

3. **Managing Conversations**
   - Click the chat history icon to view previous conversations
   - Start a new chat by clicking the "+" icon
   - Delete conversations by clicking the trash icon in the chat list

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
- "Rate limit exceeded": Wait a few minutes and try again

## Development

### Project Structure

```
copyclaudia-extension/
├── manifest.json           # Extension configuration
├── background.js          # Background service worker
├── styles/               # CSS styles
├── scripts/              # JavaScript modules
├── icons/               # Extension icons
└── sidepanel.html       # Main sidebar interface
```

### Local Development

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

[MIT License](LICENSE)

## Support

For support, please open an issue on GitHub or contact [your-contact-info].

---

Made with ❤️ by [Your Name/Organization]
