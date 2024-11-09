// background.js
chrome.runtime.onInstalled.addListener(() => {
    // Open the side panel when the extension is installed
    chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidepanel.html'
    });
  });
  
  // Handle extension icon click
  chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
  });
  
  // New function to make requests to the Anthropic API
  async function makeAnthropicRequest(endpoint, options) {
    try {
      const response = await fetch(`https://api.anthropic.com/v1/${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': options.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
  
  // Handle messages from content scripts or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        if (request.type === 'SEND_MESSAGE') {
          try {
            const response = await makeAnthropicRequest('messages', {
              method: 'POST',
              apiKey: request.apiKey,
              body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                max_tokens: 1048,
                temperature: 0.7
              })
            });
            
            sendResponse({ 
              content: response.content[0].text,
              error: null 
            });
          } catch (error) {
            // Handle specific error types
            let errorMessage = error.message;
            if (error.message.includes('authentication')) {
              errorMessage = 'Invalid API key. Please check your key and try again.';
            } else if (error.message.includes('rate_limit')) {
              errorMessage = 'Too many requests. Please wait a moment and try again.';
            }
            
            console.error('Send message error:', error);
            sendResponse({ 
              content: null, 
              error: errorMessage
            });
          }
        } else {
          sendResponse({ error: 'Unknown request type' });
        }
      } catch (error) {
        console.error('General error:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Indicates async response
  });