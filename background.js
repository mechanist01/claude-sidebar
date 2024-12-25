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

async function getActiveTabContent() {
    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return null;

        // Execute script to get page content
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                function extractMainContent() {
                    // Try to find the main content using common selectors
                    const selectors = [
                        'main',                    // Semantic main content
                        'article',                 // Article content
                        '[role="main"]',          // ARIA main content
                        '#content',               // Common content IDs
                        '#main-content',
                        '#mainContent',
                        '.content',               // Common content classes
                        '.main-content',
                        '.article-content',
                        '.post-content',
                        '.entry-content',
                        '.page-content'
                    ];

                    // Elements to remove
                    const removeSelectors = [
                        'script',
                        'style',
                        'noscript',
                        'nav',
                        'header:not(article header)', // Keep article headers
                        'footer',
                        '.ad',
                        '.ads',
                        '.advertisement',
                        '.social-share',
                        '.comments',
                        '.sidebar',
                        '.navigation',
                        '.menu',
                        '.cookie-notice',
                        'iframe',
                        '[aria-hidden="true"]',
                        '[role="complementary"]',
                        '.modal'
                    ];

                    let mainContent = '';
                    
                    // Try each selector until we find content
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            // Clone to avoid modifying the actual page
                            const clone = element.cloneNode(true);
                            
                            // Remove unwanted elements from clone
                            removeSelectors.forEach(sel => {
                                clone.querySelectorAll(sel).forEach(el => el.remove());
                            });
                            
                            // Get text and clean up whitespace
                            mainContent = clone.innerText
                                .replace(/(\n\s*){3,}/g, '\n\n')  // Replace multiple newlines
                                .trim();
                            
                            if (mainContent.length > 100) break; // Found substantial content
                        }
                    }

                    // Fallback to body if no content found or content too short
                    if (!mainContent || mainContent.length < 100) {
                        const body = document.body.cloneNode(true);
                        removeSelectors.forEach(sel => {
                            body.querySelectorAll(sel).forEach(el => el.remove());
                        });
                        mainContent = body.innerText
                            .replace(/(\n\s*){3,}/g, '\n\n')
                            .trim();
                    }

                    return mainContent;
                }

                return {
                    url: window.location.href,
                    title: document.title,
                    content: extractMainContent()
                };
            }
        });

        return result;
    } catch (error) {
        console.error('Error getting page content:', error);
        return null;
    }
}
  
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

                // If it's the first message, get webpage content
                if (request.isFirstMessage) {
                    const pageContent = await getActiveTabContent();
                    if (pageContent) {
                        const contextMessage = {
                            role: 'user',
                            content: `Current webpage context:\nURL: ${pageContent.url}\nTitle: ${pageContent.title}\n\nPage content:\n${pageContent.content}`
                        };
                        request.messages.unshift(contextMessage);
                    }
                }
                
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