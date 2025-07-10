import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Camera, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ContinuousConversationProps {
  onSpeechInput: (text: string) => void;
  onSpeechOutput: (text: string) => void;
  isListening: boolean;
  isSpeaking: boolean;
  language: string;
  onToggleListening: (enabled: boolean) => void;
  onToggleSpeaking: (enabled: boolean) => void;
  onToggleWakeWord: (enabled: boolean) => void;
  wakeWordEnabled: boolean;
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
}

export default function ContinuousConversation({
  onSpeechInput,
  onSpeechOutput,
  isListening,
  isSpeaking,
  language,
  onToggleListening,
  onToggleSpeaking,
  onToggleWakeWord,
  wakeWordEnabled,
  voiceEnabled,
  onToggleVoice
}: ContinuousConversationProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const messages = {
    en: {
      voiceChat: 'Voice Chat',
      listening: 'Listening...',
      speaking: 'Speaking...',
      startListening: 'Start Listening',
      stopListening: 'Stop Listening',
      enableSpeech: 'Enable Speech Output',
      disableSpeech: 'Disable Speech Output',
      wakeWord: 'Wake Word ("Hey Turbo")',
      notSupported: 'Voice features not supported',
      permissionDenied: 'Microphone permission denied',
      settings: 'Voice Settings'
    },
    es: {
      voiceChat: 'Chat de Voz',
      listening: 'Escuchando...',
      speaking: 'Hablando...',
      startListening: 'Comenzar a Escuchar',
      stopListening: 'Detener Escucha',
      enableSpeech: 'Habilitar Salida de Voz',
      disableSpeech: 'Deshabilitar Salida de Voz',
      wakeWord: 'Palabra de Activación ("Hey Turbo")',
      notSupported: 'Funciones de voz no compatibles',
      permissionDenied: 'Permiso de micrófono denegado',
      settings: 'Configuración de Voz'
    },
    fr: {
      voiceChat: 'Chat Vocal',
      listening: 'Écoute...',
      speaking: 'Parle...',
      startListening: 'Commencer l\'Écoute',
      stopListening: 'Arrêter l\'Écoute',
      enableSpeech: 'Activer la Sortie Vocale',
      disableSpeech: 'Désactiver la Sortie Vocale',
      wakeWord: 'Mot de Réveil ("Hey Turbo")',
      notSupported: 'Fonctions vocales non supportées',
      permissionDenied: 'Permission du microphone refusée',
      settings: 'Paramètres Vocaux'
    }
  };

  const currentMessages = messages[language as keyof typeof messages] || messages.en;

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setIsSupported(true);
      initializeSpeechRecognition();
      loadVoices();
    } else {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    if (voiceEnabled && isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Speech recognition start error:', error);
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Speech recognition stop error:', error);
      }
    }
  }, [voiceEnabled, isListening]);

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getLanguageCode(language);
    
    recognition.onstart = () => {
      setPermission('granted');
    };
    
    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      
      if (event.results[last].isFinal) {
        // Check for wake word if enabled
        if (wakeWordEnabled && text.toLowerCase().includes('hey turbo')) {
          const command = text.toLowerCase().replace('hey turbo', '').trim();
          if (command) {
            onSpeechInput(command);
          }
        } else if (!wakeWordEnabled) {
          onSpeechInput(text);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setPermission('denied');
      }
    };
    
    recognition.onend = () => {
      if (voiceEnabled && isListening) {
        // Auto-restart if still enabled
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error('Speech recognition restart error:', error);
          }
        }, 100);
      }
    };
    
    recognitionRef.current = recognition;
  };

  const loadVoices = () => {
    const availableVoices = speechSynthesis.getVoices();
    setVoices(availableVoices);
    
    // Select best voice for language
    const languageVoices = availableVoices.filter(voice => 
      voice.lang.startsWith(language) || voice.lang.startsWith(getLanguageCode(language))
    );
    
    if (languageVoices.length > 0) {
      // Prefer enhanced/premium voices
      const enhancedVoice = languageVoices.find(voice => 
        voice.name.includes('Enhanced') || voice.name.includes('Premium') || voice.name.includes('Natural')
      );
      setSelectedVoice(enhancedVoice || languageVoices[0]);
    } else {
      setSelectedVoice(availableVoices[0] || null);
    }
  };

  const getLanguageCode = (lang: string): string => {
    const codes: { [key: string]: string } = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'zh': 'zh-CN',
      'ja': 'ja-JP'
    };
    return codes[lang] || 'en-US';
  };

  const speak = (text: string) => {
    if (!selectedVoice || !window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.lang = getLanguageCode(language);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      // Temporarily pause listening while speaking
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
    
    utterance.onend = () => {
      // Resume listening after speaking
      if (recognitionRef.current && isListening && voiceEnabled) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Speech recognition resume error:', error);
          }
        }, 500);
      }
    };
    
    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    onToggleListening(!isListening);
  };

  const toggleSpeaking = () => {
    onToggleSpeaking(!isSpeaking);
  };

  const toggleWakeWord = () => {
    onToggleWakeWord(!wakeWordEnabled);
  };

  const toggleVoice = () => {
    onToggleVoice(!voiceEnabled);
  };

  // Auto-speak AI responses
  useEffect(() => {
    if (isSpeaking && voiceEnabled) {
      // This would be called from parent component when AI responds
    }
  }, [isSpeaking, voiceEnabled]);

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-900/20 rounded-lg border border-red-500">
        <p className="text-red-400">{currentMessages.notSupported}</p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center justify-center p-4 bg-red-900/20 rounded-lg border border-red-500">
        <p className="text-red-400">{currentMessages.permissionDenied}</p>
      </div>
    );
  }

  return (
    <div className="voice-controls space-y-4">
      {/* Main Voice Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          onClick={toggleVoice}
          variant={voiceEnabled ? "default" : "outline"}
          className={voiceEnabled ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {voiceEnabled ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
          {currentMessages.voiceChat}
        </Button>
        
        <Button
          onClick={toggleListening}
          variant={isListening ? "default" : "outline"}
          className={isListening ? "bg-blue-600 hover:bg-blue-700" : ""}
          disabled={!voiceEnabled}
        >
          {isListening ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
          {isListening ? currentMessages.listening : currentMessages.startListening}
        </Button>
        
        <Button
          onClick={toggleSpeaking}
          variant={isSpeaking ? "default" : "outline"}
          className={isSpeaking ? "bg-purple-600 hover:bg-purple-700" : ""}
          disabled={!voiceEnabled}
        >
          {isSpeaking ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
          {isSpeaking ? currentMessages.speaking : currentMessages.enableSpeech}
        </Button>
      </div>

      {/* Voice Settings */}
      {voiceEnabled && (
        <div className="flex items-center justify-center space-x-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-2">
            <Switch
              id="wake-word"
              checked={wakeWordEnabled}
              onCheckedChange={toggleWakeWord}
            />
            <Label htmlFor="wake-word" className="text-sm">
              {currentMessages.wakeWord}
            </Label>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      {voiceEnabled && (
        <div className="flex justify-center space-x-4 text-sm">
          {isListening && (
            <div className="flex items-center text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
              {currentMessages.listening}
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center text-purple-400">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2"></div>
              {currentMessages.speaking}
            </div>
          )}
        </div>
      )}
    </div>
  );
}