// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidepanel.html'
    });
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
  });
  
  async function makeAnthropicRequest(endpoint, options) {
    try {
      console.log('Making Anthropic request:', {
        endpoint,
        method: options.method,
        model: JSON.parse(options.body).model,
        apiKeyLength: options.apiKey?.length
      });
      
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'  // Required header for browser requests
      };

      console.log('Request headers:', Object.keys(headers));
      
      const response = await fetch(`https://api.anthropic.com/v1/${endpoint}`, {
        ...options,
        headers: headers
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        });
        throw new Error(error.error?.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        if (request.type === 'SEND_MESSAGE') {
          console.log('Received message request:', {
            type: request.type,
            model: request.model,
            apiKeyLength: request.apiKey?.length,
            messageCount: request.messages?.length
          });
          
          try {
            const response = await makeAnthropicRequest('messages', {
              method: 'POST',
              apiKey: request.apiKey,
              body: JSON.stringify({
                model: request.model,
                messages: request.messages,
                max_tokens: 4096,
                temperature: 0.7
              })
            });
            
            sendResponse({ 
              content: response.content[0].text,
              error: null 
            });
          } catch (error) {
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
    return true;
  });