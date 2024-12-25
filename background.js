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

// Track active tab info
let currentTabInfo = {
    url: '',
    conversationId: null,
    isFirstMessage: true  // Add flag to track first message
};

// Listen for tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.active) {
        handlePageChange(tab);
    }
});

// Listen for tab activation changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handlePageChange(tab);
});

function handlePageChange(tab) {
    // Don't notify for non-HTTP URLs or same URL
    if (!tab.url.startsWith('http') || tab.url === currentTabInfo.url) {
        return;
    }

    try {
        // Reset first message flag when page changes
        currentTabInfo.isFirstMessage = true;

        // Broadcast to all open sidepanels
        chrome.runtime.sendMessage({
            type: 'NEW_PAGE_DETECTED',
            url: tab.url,
            title: tab.title
        }).catch(error => {
            // Ignore errors about receiving end not existing
            if (!error.message.includes('Receiving end does not exist')) {
                console.error('Error sending page change message:', error);
            }
        });

        // Update current tab info
        currentTabInfo.url = tab.url;

    } catch (error) {
        console.error('Error handling page change:', error);
    }
}

async function getActiveTabContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return null;

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                function extractMainContent() {
                    const selectors = [
                        'main', 'article', '[role="main"]',
                        '#content', '#main-content', '#mainContent',
                        '.content', '.main-content', '.article-content',
                        '.post-content', '.entry-content', '.page-content'
                    ];

                    const removeSelectors = [
                        'script', 'style', 'noscript', 'nav',
                        'header:not(article header)', 'footer',
                        '.ad', '.ads', '.advertisement', '.social-share',
                        '.comments', '.sidebar', '.navigation', '.menu',
                        '.cookie-notice', 'iframe',
                        '[aria-hidden="true"]', '[role="complementary"]',
                        '.modal'
                    ];

                    let mainContent = '';
                    
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            const clone = element.cloneNode(true);
                            removeSelectors.forEach(sel => {
                                clone.querySelectorAll(sel).forEach(el => el.remove());
                            });
                            
                            mainContent = clone.innerText
                                .replace(/(\n\s*){3,}/g, '\n\n')
                                .trim();
                            
                            if (mainContent.length > 100) break;
                        }
                    }

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
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': options.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        };
        
        const response = await fetch(`https://api.anthropic.com/v1/${endpoint}`, {
            ...options,
            headers: headers
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            if (request.type === 'SEND_MESSAGE') {
                // If it's the first message, get webpage content
                if (currentTabInfo.isFirstMessage) {
                    const pageContent = await getActiveTabContent();
                    if (pageContent) {
                        // Store website info in conversation metadata
                        await chrome.storage.local.set({
                            [`websiteInfo_${request.conversationId}`]: {
                                title: pageContent.title,
                                url: pageContent.url
                            }
                        });
                        
                        // Add context message at the beginning
                        request.messages.unshift({
                            role: 'user',
                            content: `Current webpage context:\nURL: ${pageContent.url}\nTitle: ${pageContent.title}\n\nPage content:\n${pageContent.content}`
                        });
                    }
                    // Set first message flag to false after adding context
                    currentTabInfo.isFirstMessage = false;
                }

                // Update conversation ID
                currentTabInfo.conversationId = request.conversationId;
                
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
                    
                    sendResponse({ 
                        content: null, 
                        error: errorMessage
                    });
                }
            } else if (request.type === 'UPDATE_CONVERSATION_ID') {
                currentTabInfo.conversationId = request.conversationId;
                sendResponse({ success: true });
            } else if (request.type === 'RESET_FIRST_MESSAGE') {
                currentTabInfo.isFirstMessage = true;
                sendResponse({ success: true });
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
