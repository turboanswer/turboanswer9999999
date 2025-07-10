/**
 * Turbo Answer AI Widget
 * Embeddable AI assistant for any website
 * Version: 2.0.0
 */

(function() {
    'use strict';
    
    // Widget configuration
    const WIDGET_CONFIG = {
        apiBase: 'https://turbo-answer-ai.uc.r.appspot.com',
        version: '2.0.0',
        theme: 'auto', // 'light', 'dark', 'auto'
        position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
        primaryColor: '#3b82f6',
        size: 'medium' // 'small', 'medium', 'large'
    };

    // Widget state
    let isOpen = false;
    let conversationId = null;
    let messages = [];
    let apiKey = null;

    // Create widget HTML structure
    function createWidget() {
        const widgetHTML = `
            <div id="turbo-widget-container" style="position: fixed; z-index: 999999; ${getPositionStyles()}">
                <!-- Widget Button -->
                <div id="turbo-widget-button" style="
                    width: 60px; 
                    height: 60px; 
                    background: ${WIDGET_CONFIG.primaryColor}; 
                    border-radius: 50%; 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: all 0.3s ease;
                    border: none;
                ">
                    <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04.97 4.39L1 23l6.61-1.97C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10zm0 18c-1.1 0-2.18-.25-3.15-.72L6 20l.72-2.85C6.25 16.18 6 15.1 6 14c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                </div>

                <!-- Widget Chat Interface -->
                <div id="turbo-widget-chat" style="
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 350px;
                    height: 500px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                ">
                    <!-- Header -->
                    <div style="
                        background: ${WIDGET_CONFIG.primaryColor};
                        color: white;
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">Turbo AI Assistant</div>
                            <div style="font-size: 12px; opacity: 0.9;">Ask me anything!</div>
                        </div>
                        <button id="turbo-widget-close" style="
                            background: none;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 20px;
                            padding: 4px;
                        ">×</button>
                    </div>

                    <!-- Messages -->
                    <div id="turbo-widget-messages" style="
                        flex: 1;
                        overflow-y: auto;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    ">
                        <div class="turbo-message bot-message" style="
                            background: #f3f4f6;
                            padding: 12px;
                            border-radius: 12px;
                            max-width: 85%;
                            align-self: flex-start;
                        ">
                            Hi! I'm your AI assistant. How can I help you today?
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div style="
                        padding: 16px;
                        border-top: 1px solid #e5e7eb;
                        display: flex;
                        gap: 8px;
                    ">
                        <input 
                            id="turbo-widget-input" 
                            type="text" 
                            placeholder="Type your message..."
                            style="
                                flex: 1;
                                padding: 12px;
                                border: 1px solid #d1d5db;
                                border-radius: 6px;
                                outline: none;
                                font-size: 14px;
                            "
                        >
                        <button id="turbo-widget-send" style="
                            background: ${WIDGET_CONFIG.primaryColor};
                            border: none;
                            color: white;
                            padding: 12px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Send</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
        attachEventListeners();
    }

    // Get position styles based on configuration
    function getPositionStyles() {
        const positions = {
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;'
        };
        return positions[WIDGET_CONFIG.position] || positions['bottom-right'];
    }

    // Attach event listeners
    function attachEventListeners() {
        const button = document.getElementById('turbo-widget-button');
        const closeBtn = document.getElementById('turbo-widget-close');
        const sendBtn = document.getElementById('turbo-widget-send');
        const input = document.getElementById('turbo-widget-input');

        button.addEventListener('click', toggleWidget);
        closeBtn.addEventListener('click', closeWidget);
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
    }

    // Toggle widget open/close
    function toggleWidget() {
        const chat = document.getElementById('turbo-widget-chat');
        isOpen = !isOpen;
        chat.style.display = isOpen ? 'flex' : 'none';
        
        if (isOpen && !conversationId) {
            initializeConversation();
        }
    }

    // Close widget
    function closeWidget() {
        const chat = document.getElementById('turbo-widget-chat');
        isOpen = false;
        chat.style.display = 'none';
    }

    // Initialize conversation
    async function initializeConversation() {
        try {
            const response = await fetch(`${WIDGET_CONFIG.apiBase}/api/widget/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey || 'anonymous'}`
                },
                body: JSON.stringify({
                    domain: window.location.hostname,
                    userAgent: navigator.userAgent
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                conversationId = data.conversationId;
            }
        } catch (error) {
            console.warn('Turbo Widget: Failed to initialize conversation');
        }
    }

    // Send message
    async function sendMessage() {
        const input = document.getElementById('turbo-widget-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        input.value = '';
        addMessage(message, 'user');
        
        // Show typing indicator
        addTypingIndicator();
        
        try {
            const response = await fetch(`${WIDGET_CONFIG.apiBase}/api/widget/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey || 'anonymous'}`
                },
                body: JSON.stringify({
                    message,
                    conversationId,
                    domain: window.location.hostname
                })
            });
            
            removeTypingIndicator();
            
            if (response.ok) {
                const data = await response.json();
                addMessage(data.response, 'bot');
            } else {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            removeTypingIndicator();
            addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'bot');
        }
    }

    // Add message to chat
    function addMessage(text, sender) {
        const messagesContainer = document.getElementById('turbo-widget-messages');
        const isUser = sender === 'user';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `turbo-message ${sender}-message`;
        messageDiv.style.cssText = `
            background: ${isUser ? WIDGET_CONFIG.primaryColor : '#f3f4f6'};
            color: ${isUser ? 'white' : '#374151'};
            padding: 12px;
            border-radius: 12px;
            max-width: 85%;
            align-self: ${isUser ? 'flex-end' : 'flex-start'};
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        `;
        messageDiv.textContent = text;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add typing indicator
    function addTypingIndicator() {
        const messagesContainer = document.getElementById('turbo-widget-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'turbo-typing-indicator';
        typingDiv.style.cssText = `
            background: #f3f4f6;
            padding: 12px;
            border-radius: 12px;
            max-width: 85%;
            align-self: flex-start;
            display: flex;
            gap: 4px;
            align-items: center;
        `;
        typingDiv.innerHTML = `
            <div style="
                width: 8px; 
                height: 8px; 
                background: #9ca3af; 
                border-radius: 50%; 
                animation: turbo-typing 1.4s infinite;
            "></div>
            <div style="
                width: 8px; 
                height: 8px; 
                background: #9ca3af; 
                border-radius: 50%; 
                animation: turbo-typing 1.4s infinite 0.2s;
            "></div>
            <div style="
                width: 8px; 
                height: 8px; 
                background: #9ca3af; 
                border-radius: 50%; 
                animation: turbo-typing 1.4s infinite 0.4s;
            "></div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Remove typing indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('turbo-typing-indicator');
        if (indicator) indicator.remove();
    }

    // Add CSS animations
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes turbo-typing {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
                30% { transform: translateY(-10px); opacity: 1; }
            }
            
            #turbo-widget-input:focus {
                border-color: ${WIDGET_CONFIG.primaryColor} !important;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
            }
            
            #turbo-widget-send:hover {
                opacity: 0.9;
            }
            
            @media (max-width: 480px) {
                #turbo-widget-chat {
                    width: calc(100vw - 40px) !important;
                    height: calc(100vh - 100px) !important;
                    right: 20px !important;
                    bottom: 80px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Public API
    window.TurboWidget = {
        init: function(config = {}) {
            // Merge configuration
            Object.assign(WIDGET_CONFIG, config);
            apiKey = config.apiKey;
            
            // Initialize widget when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    addStyles();
                    createWidget();
                });
            } else {
                addStyles();
                createWidget();
            }
        },
        
        open: function() {
            if (!isOpen) toggleWidget();
        },
        
        close: function() {
            if (isOpen) closeWidget();
        },
        
        sendMessage: function(message) {
            const input = document.getElementById('turbo-widget-input');
            if (input) {
                input.value = message;
                sendMessage();
            }
        }
    };

})();