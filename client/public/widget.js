/**
 * Turbo Answer Widget - Easy Business Integration
 * Just add this script to any website to enable AI assistant
 */

(function() {
  'use strict';

  // Widget configuration
  const WIDGET_API_URL = window.TURBO_WIDGET_API || 'https://turbo-answer.replit.app/api/widget';
  const WIDGET_CONFIG = {
    position: window.TURBO_WIDGET_POSITION || 'bottom-right',
    theme: window.TURBO_WIDGET_THEME || 'dark',
    primaryColor: window.TURBO_WIDGET_COLOR || '#8b5cf6',
    businessName: window.TURBO_WIDGET_BUSINESS || 'Business',
    welcomeMessage: window.TURBO_WIDGET_WELCOME || 'Hi! How can I help you today?',
    placeholder: window.TURBO_WIDGET_PLACEHOLDER || 'Ask me anything...'
  };

  // Create widget HTML
  function createWidget() {
    const widgetHTML = `
      <div id="turbo-widget-container" class="turbo-widget-container turbo-${WIDGET_CONFIG.position}">
        <button id="turbo-widget-button" class="turbo-widget-button" aria-label="Open AI Assistant">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        
        <div id="turbo-widget-chat" class="turbo-widget-chat turbo-hidden">
          <div class="turbo-widget-header">
            <h3>${WIDGET_CONFIG.businessName} AI Assistant</h3>
            <button id="turbo-widget-close" class="turbo-widget-close" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div id="turbo-widget-messages" class="turbo-widget-messages">
            <div class="turbo-message turbo-assistant">
              <div class="turbo-message-content">${WIDGET_CONFIG.welcomeMessage}</div>
            </div>
          </div>
          
          <div class="turbo-widget-input">
            <input 
              type="text" 
              id="turbo-widget-input-field" 
              placeholder="${WIDGET_CONFIG.placeholder}"
              class="turbo-widget-input-field"
            />
            <button id="turbo-widget-send" class="turbo-widget-send" aria-label="Send">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 2L9 11M18 2L12 18L9 11L2 8L18 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add widget to page
    const container = document.createElement('div');
    container.innerHTML = widgetHTML;
    document.body.appendChild(container.firstElementChild);
  }

  // Add widget styles
  function addStyles() {
    const styles = `
      .turbo-widget-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .turbo-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .turbo-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .turbo-top-right {
        top: 20px;
        right: 20px;
      }
      
      .turbo-top-left {
        top: 20px;
        left: 20px;
      }
      
      .turbo-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${WIDGET_CONFIG.primaryColor};
        border: none;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .turbo-widget-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      
      .turbo-widget-chat {
        position: absolute;
        width: 380px;
        height: 600px;
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .turbo-bottom-right .turbo-widget-chat {
        bottom: 80px;
        right: 0;
      }
      
      .turbo-bottom-left .turbo-widget-chat {
        bottom: 80px;
        left: 0;
      }
      
      .turbo-top-right .turbo-widget-chat {
        top: 80px;
        right: 0;
      }
      
      .turbo-top-left .turbo-widget-chat {
        top: 80px;
        left: 0;
      }
      
      .turbo-hidden {
        display: none !important;
      }
      
      .turbo-widget-header {
        background: ${WIDGET_CONFIG.primaryColor};
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .turbo-widget-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .turbo-widget-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      .turbo-widget-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .turbo-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#0a0a0a' : '#f5f5f5'};
      }
      
      .turbo-message {
        margin-bottom: 16px;
        display: flex;
        align-items: flex-start;
      }
      
      .turbo-user {
        justify-content: flex-end;
      }
      
      .turbo-message-content {
        max-width: 70%;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .turbo-assistant .turbo-message-content {
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#2a2a2a' : '#ffffff'};
        color: ${WIDGET_CONFIG.theme === 'dark' ? '#ffffff' : '#000000'};
        border: 1px solid ${WIDGET_CONFIG.theme === 'dark' ? '#3a3a3a' : '#e0e0e0'};
      }
      
      .turbo-user .turbo-message-content {
        background: ${WIDGET_CONFIG.primaryColor};
        color: white;
      }
      
      .turbo-widget-input {
        display: flex;
        padding: 16px;
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        border-top: 1px solid ${WIDGET_CONFIG.theme === 'dark' ? '#3a3a3a' : '#e0e0e0'};
      }
      
      .turbo-widget-input-field {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid ${WIDGET_CONFIG.theme === 'dark' ? '#3a3a3a' : '#e0e0e0'};
        border-radius: 24px;
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#0a0a0a' : '#f5f5f5'};
        color: ${WIDGET_CONFIG.theme === 'dark' ? '#ffffff' : '#000000'};
        font-size: 14px;
        outline: none;
        transition: border 0.2s ease;
      }
      
      .turbo-widget-input-field:focus {
        border-color: ${WIDGET_CONFIG.primaryColor};
      }
      
      .turbo-widget-send {
        background: ${WIDGET_CONFIG.primaryColor};
        border: none;
        color: white;
        padding: 12px;
        margin-left: 8px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .turbo-widget-send:hover {
        transform: scale(1.1);
      }
      
      .turbo-typing {
        display: inline-block;
        padding: 12px 16px;
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#2a2a2a' : '#ffffff'};
        border: 1px solid ${WIDGET_CONFIG.theme === 'dark' ? '#3a3a3a' : '#e0e0e0'};
        border-radius: 12px;
      }
      
      .turbo-typing span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${WIDGET_CONFIG.theme === 'dark' ? '#666' : '#999'};
        margin: 0 2px;
        animation: turbo-typing 1.4s infinite;
      }
      
      .turbo-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .turbo-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes turbo-typing {
        0%, 60%, 100% {
          opacity: 0.3;
        }
        30% {
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .turbo-widget-chat {
          width: calc(100vw - 40px);
          height: calc(100vh - 100px);
          bottom: 80px !important;
          right: 20px !important;
          left: 20px !important;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Widget functionality
  let sessionId = null;
  let isOpen = false;

  function toggleWidget() {
    const chat = document.getElementById('turbo-widget-chat');
    const button = document.getElementById('turbo-widget-button');
    
    if (isOpen) {
      chat.classList.add('turbo-hidden');
      button.style.display = 'flex';
      isOpen = false;
    } else {
      chat.classList.remove('turbo-hidden');
      button.style.display = 'none';
      isOpen = true;
      document.getElementById('turbo-widget-input-field').focus();
      
      // Initialize session if needed
      if (!sessionId) {
        initializeSession();
      }
    }
  }

  async function initializeSession() {
    try {
      const response = await fetch(`${WIDGET_API_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      sessionId = data.sessionId;
    } catch (error) {
      console.error('Failed to initialize widget session:', error);
      sessionId = `local_${Date.now()}`;
    }
  }

  function addMessage(text, isUser = false) {
    const messagesContainer = document.getElementById('turbo-widget-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `turbo-message ${isUser ? 'turbo-user' : 'turbo-assistant'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'turbo-message-content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById('turbo-widget-messages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'turbo-typing-indicator';
    typingDiv.className = 'turbo-message turbo-assistant';
    typingDiv.innerHTML = `
      <div class="turbo-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function removeTypingIndicator() {
    const typingIndicator = document.getElementById('turbo-typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  async function sendMessage() {
    const inputField = document.getElementById('turbo-widget-input-field');
    const message = inputField.value.trim();
    
    if (!message) return;
    
    // Add user message
    addMessage(message, true);
    inputField.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
      const response = await fetch(`${WIDGET_API_URL}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          message: message
        })
      });
      
      const data = await response.json();
      removeTypingIndicator();
      
      if (data.response) {
        addMessage(data.response);
      } else {
        addMessage('Sorry, I couldn\'t process your request. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      removeTypingIndicator();
      addMessage('Sorry, something went wrong. Please try again later.');
    }
  }

  // Event listeners
  function attachEventListeners() {
    document.getElementById('turbo-widget-button').addEventListener('click', toggleWidget);
    document.getElementById('turbo-widget-close').addEventListener('click', toggleWidget);
    document.getElementById('turbo-widget-send').addEventListener('click', sendMessage);
    
    document.getElementById('turbo-widget-input-field').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  // Initialize widget
  function init() {
    addStyles();
    createWidget();
    attachEventListeners();
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();