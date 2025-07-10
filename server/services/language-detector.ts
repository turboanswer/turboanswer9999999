// Multi-language support for Turbo Answer AI
// Detects user language and provides appropriate responses

interface LanguageMap {
  [key: string]: {
    code: string;
    name: string;
    welcomeMessage: string;
    errorMessage: string;
    aiThinking: string;
    voiceNotSupported: string;
    cameraNotSupported: string;
    listeningMessage: string;
    speakingMessage: string;
  };
}

export const supportedLanguages: LanguageMap = {
  'en': {
    code: 'en',
    name: 'English',
    welcomeMessage: 'Hello! I\'m Turbo, your AI assistant. How can I help you today?',
    errorMessage: 'Sorry, I encountered an error. Please try again.',
    aiThinking: 'AI is thinking...',
    voiceNotSupported: 'Voice features are not supported in this browser.',
    cameraNotSupported: 'Camera features are not supported in this browser.',
    listeningMessage: 'Listening...',
    speakingMessage: 'Speaking...'
  },
  'es': {
    code: 'es',
    name: 'Español',
    welcomeMessage: '¡Hola! Soy Turbo, tu asistente de IA. ¿En qué puedo ayudarte hoy?',
    errorMessage: 'Lo siento, encontré un error. Por favor, inténtalo de nuevo.',
    aiThinking: 'IA está pensando...',
    voiceNotSupported: 'Las funciones de voz no son compatibles con este navegador.',
    cameraNotSupported: 'Las funciones de cámara no son compatibles con este navegador.',
    listeningMessage: 'Escuchando...',
    speakingMessage: 'Hablando...'
  },
  'fr': {
    code: 'fr',
    name: 'Français',
    welcomeMessage: 'Bonjour! Je suis Turbo, votre assistant IA. Comment puis-je vous aider aujourd\'hui?',
    errorMessage: 'Désolé, j\'ai rencontré une erreur. Veuillez réessayer.',
    aiThinking: 'IA réfléchit...',
    voiceNotSupported: 'Les fonctions vocales ne sont pas prises en charge dans ce navigateur.',
    cameraNotSupported: 'Les fonctions de caméra ne sont pas prises en charge dans ce navigateur.',
    listeningMessage: 'Écoute...',
    speakingMessage: 'Parle...'
  },
  'de': {
    code: 'de',
    name: 'Deutsch',
    welcomeMessage: 'Hallo! Ich bin Turbo, Ihr KI-Assistent. Wie kann ich Ihnen heute helfen?',
    errorMessage: 'Entschuldigung, ich habe einen Fehler festgestellt. Bitte versuchen Sie es erneut.',
    aiThinking: 'KI denkt nach...',
    voiceNotSupported: 'Sprachfunktionen werden in diesem Browser nicht unterstützt.',
    cameraNotSupported: 'Kamerafunktionen werden in diesem Browser nicht unterstützt.',
    listeningMessage: 'Zuhören...',
    speakingMessage: 'Sprechen...'
  },
  'it': {
    code: 'it',
    name: 'Italiano',
    welcomeMessage: 'Ciao! Sono Turbo, il tuo assistente IA. Come posso aiutarti oggi?',
    errorMessage: 'Scusa, ho riscontrato un errore. Riprova.',
    aiThinking: 'IA sta pensando...',
    voiceNotSupported: 'Le funzioni vocali non sono supportate in questo browser.',
    cameraNotSupported: 'Le funzioni della fotocamera non sono supportate in questo browser.',
    listeningMessage: 'Ascoltando...',
    speakingMessage: 'Parlando...'
  },
  'pt': {
    code: 'pt',
    name: 'Português',
    welcomeMessage: 'Olá! Eu sou Turbo, seu assistente de IA. Como posso ajudá-lo hoje?',
    errorMessage: 'Desculpe, encontrei um erro. Tente novamente.',
    aiThinking: 'IA está pensando...',
    voiceNotSupported: 'Os recursos de voz não são suportados neste navegador.',
    cameraNotSupported: 'Os recursos da câmera não são suportados neste navegador.',
    listeningMessage: 'Ouvindo...',
    speakingMessage: 'Falando...'
  },
  'zh': {
    code: 'zh',
    name: '中文',
    welcomeMessage: '您好！我是Turbo，您的AI助手。今天我可以为您做些什么？',
    errorMessage: '抱歉，我遇到了错误。请重试。',
    aiThinking: 'AI正在思考...',
    voiceNotSupported: '此浏览器不支持语音功能。',
    cameraNotSupported: '此浏览器不支持相机功能。',
    listeningMessage: '正在听取...',
    speakingMessage: '正在说话...'
  },
  'ja': {
    code: 'ja',
    name: '日本語',
    welcomeMessage: 'こんにちは！私はTurbo、あなたのAIアシスタントです。今日はどのようにお手伝いできますか？',
    errorMessage: 'すみません、エラーが発生しました。もう一度お試しください。',
    aiThinking: 'AIが考え中...',
    voiceNotSupported: 'このブラウザでは音声機能がサポートされていません。',
    cameraNotSupported: 'このブラウザではカメラ機能がサポートされていません。',
    listeningMessage: '聞いています...',
    speakingMessage: '話しています...'
  }
};

export function detectLanguage(text: string): string {
  // Simple language detection based on common patterns
  const lowerText = text.toLowerCase();
  
  // Spanish detection
  if (lowerText.match(/\b(hola|gracias|por favor|ayuda|buenos días|buenas tardes|español|cómo|qué|dónde|cuándo|por qué)\b/)) {
    return 'es';
  }
  
  // French detection
  if (lowerText.match(/\b(bonjour|merci|s'il vous plaît|aide|français|comment|que|où|quand|pourquoi)\b/)) {
    return 'fr';
  }
  
  // German detection
  if (lowerText.match(/\b(hallo|danke|bitte|hilfe|deutsch|wie|was|wo|wann|warum)\b/)) {
    return 'de';
  }
  
  // Italian detection
  if (lowerText.match(/\b(ciao|grazie|per favore|aiuto|italiano|come|che|dove|quando|perché)\b/)) {
    return 'it';
  }
  
  // Portuguese detection
  if (lowerText.match(/\b(olá|obrigado|por favor|ajuda|português|como|que|onde|quando|por que)\b/)) {
    return 'pt';
  }
  
  // Chinese detection
  if (lowerText.match(/[\u4e00-\u9fff]/) || lowerText.match(/\b(你好|谢谢|请|帮助|中文|怎么|什么|哪里|什么时候|为什么)\b/)) {
    return 'zh';
  }
  
  // Japanese detection
  if (lowerText.match(/[\u3040-\u309f\u30a0-\u30ff]/) || lowerText.match(/\b(こんにちは|ありがとう|お願い|助け|日本語|どう|何|どこ|いつ|なぜ)\b/)) {
    return 'ja';
  }
  
  // Default to English
  return 'en';
}

export function getLanguageConfig(languageCode: string) {
  return supportedLanguages[languageCode] || supportedLanguages['en'];
}

export function getAvailableLanguages() {
  return Object.values(supportedLanguages);
}

export function formatResponseForLanguage(response: string, languageCode: string): string {
  const config = getLanguageConfig(languageCode);
  
  // Add language-specific formatting if needed
  if (languageCode === 'es') {
    // Spanish formatting - ensure proper punctuation
    return response.replace(/\?/g, '¿') + (response.includes('¿') ? '' : '');
  }
  
  if (languageCode === 'fr') {
    // French formatting - ensure proper spacing before punctuation
    return response.replace(/\s*([!?:])/g, ' $1');
  }
  
  return response;
}