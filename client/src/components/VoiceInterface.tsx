import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, User, UserCheck, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface VoiceInterfaceProps {
  onMessage: (message: string) => void;
  isProcessing?: boolean;
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
  voiceGender?: 'male' | 'female';
  onVoiceGenderChange?: (gender: 'male' | 'female') => void;
}

// Comprehensive world languages with proper locale codes
const WORLD_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'en-AU', name: 'English (Australia)', flag: '🇦🇺' },
  { code: 'en-CA', name: 'English (Canada)', flag: '🇨🇦' },
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
  { code: 'es-ES', name: 'Spanish (Spain)', flag: '🇪🇸' },
  { code: 'es-MX', name: 'Spanish (Mexico)', flag: '🇲🇽' },
  { code: 'es-AR', name: 'Spanish (Argentina)', flag: '🇦🇷' },
  { code: 'fr-FR', name: 'French (France)', flag: '🇫🇷' },
  { code: 'fr-CA', name: 'French (Canada)', flag: '🇨🇦' },
  { code: 'de-DE', name: 'German (Germany)', flag: '🇩🇪' },
  { code: 'de-AT', name: 'German (Austria)', flag: '🇦🇹' },
  { code: 'de-CH', name: 'German (Switzerland)', flag: '🇨🇭' },
  { code: 'it-IT', name: 'Italian (Italy)', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', flag: '🇵🇹' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'zh-HK', name: 'Chinese (Hong Kong)', flag: '🇭🇰' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', flag: '🇸🇦' },
  { code: 'ar-EG', name: 'Arabic (Egypt)', flag: '🇪🇬' },
  { code: 'ar-AE', name: 'Arabic (UAE)', flag: '🇦🇪' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali (India)', flag: '🇮🇳' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)', flag: '🇧🇩' },
  { code: 'ur-PK', name: 'Urdu (Pakistan)', flag: '🇵🇰' },
  { code: 'ur-IN', name: 'Urdu (India)', flag: '🇮🇳' },
  { code: 'fa-IR', name: 'Persian (Farsi)', flag: '🇮🇷' },
  { code: 'he-IL', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'tr-TR', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pl-PL', name: 'Polish', flag: '🇵🇱' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)', flag: '🇳🇱' },
  { code: 'nl-BE', name: 'Dutch (Belgium)', flag: '🇧🇪' },
  { code: 'sv-SE', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no-NO', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da-DK', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi-FI', name: 'Finnish', flag: '🇫🇮' },
  { code: 'is-IS', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'hu-HU', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'cs-CZ', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk-SK', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl-SI', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'hr-HR', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr-RS', name: 'Serbian', flag: '🇷🇸' },
  { code: 'bg-BG', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'ro-RO', name: 'Romanian', flag: '🇷🇴' },
  { code: 'el-GR', name: 'Greek', flag: '🇬🇷' },
  { code: 'uk-UA', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'lt-LT', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'lv-LV', name: 'Latvian', flag: '🇱🇻' },
  { code: 'et-EE', name: 'Estonian', flag: '🇪🇪' },
  { code: 'mt-MT', name: 'Maltese', flag: '🇲🇹' },
  { code: 'ga-IE', name: 'Irish', flag: '🇮🇪' },
  { code: 'cy-GB', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'eu-ES', name: 'Basque', flag: '🇪🇸' },
  { code: 'ca-ES', name: 'Catalan', flag: '🇪🇸' },
  { code: 'gl-ES', name: 'Galician', flag: '🇪🇸' },
  { code: 'th-TH', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi-VN', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id-ID', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms-MY', name: 'Malay (Malaysia)', flag: '🇲🇾' },
  { code: 'tl-PH', name: 'Filipino (Tagalog)', flag: '🇵🇭' },
  { code: 'sw-KE', name: 'Swahili (Kenya)', flag: '🇰🇪' },
  { code: 'sw-TZ', name: 'Swahili (Tanzania)', flag: '🇹🇿' },
  { code: 'am-ET', name: 'Amharic', flag: '🇪🇹' },
  { code: 'yo-NG', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'ig-NG', name: 'Igbo', flag: '🇳🇬' },
  { code: 'ha-NG', name: 'Hausa', flag: '🇳🇬' },
  { code: 'zu-ZA', name: 'Zulu', flag: '🇿🇦' },
  { code: 'af-ZA', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'xh-ZA', name: 'Xhosa', flag: '🇿🇦' },
  { code: 'ta-IN', name: 'Tamil (India)', flag: '🇮🇳' },
  { code: 'ta-LK', name: 'Tamil (Sri Lanka)', flag: '🇱🇰' },
  { code: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi (India)', flag: '🇮🇳' },
  { code: 'or-IN', name: 'Odia', flag: '🇮🇳' },
  { code: 'as-IN', name: 'Assamese', flag: '🇮🇳' },
  { code: 'ne-NP', name: 'Nepali', flag: '🇳🇵' },
  { code: 'si-LK', name: 'Sinhala', flag: '🇱🇰' },
  { code: 'my-MM', name: 'Burmese (Myanmar)', flag: '🇲🇲' },
  { code: 'km-KH', name: 'Khmer (Cambodian)', flag: '🇰🇭' },
  { code: 'lo-LA', name: 'Lao', flag: '🇱🇦' },
  { code: 'ka-GE', name: 'Georgian', flag: '🇬🇪' },
  { code: 'hy-AM', name: 'Armenian', flag: '🇦🇲' },
  { code: 'az-AZ', name: 'Azerbaijani', flag: '🇦🇿' },
  { code: 'kk-KZ', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'ky-KG', name: 'Kyrgyz', flag: '🇰🇬' },
  { code: 'uz-UZ', name: 'Uzbek', flag: '🇺🇿' },
  { code: 'tg-TJ', name: 'Tajik', flag: '🇹🇯' },
  { code: 'tk-TM', name: 'Turkmen', flag: '🇹🇲' },
  { code: 'mn-MN', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'bo-CN', name: 'Tibetan', flag: '🇨🇳' },
  { code: 'ug-CN', name: 'Uyghur', flag: '🇨🇳' },
  { code: 'dv-MV', name: 'Maldivian (Dhivehi)', flag: '🇲🇻' },
  { code: 'ps-AF', name: 'Pashto', flag: '🇦🇫' },
  { code: 'sd-PK', name: 'Sindhi', flag: '🇵🇰' },
  { code: 'ckb-IQ', name: 'Kurdish (Sorani)', flag: '🇮🇶' },
  { code: 'ku-TR', name: 'Kurdish (Kurmanji)', flag: '🇹🇷' }
];

// Voice personalities for different languages and genders
const VOICE_PERSONALITIES = {
  male: {
    'en-US': { rate: 0.9, pitch: 0.8, volume: 1.0 },
    'en-GB': { rate: 0.8, pitch: 0.7, volume: 1.0 },
    'fr-FR': { rate: 0.85, pitch: 0.8, volume: 1.0 },
    'es-ES': { rate: 0.9, pitch: 0.8, volume: 1.0 },
    'de-DE': { rate: 0.8, pitch: 0.7, volume: 1.0 },
    'it-IT': { rate: 0.9, pitch: 0.8, volume: 1.0 },
    'ja-JP': { rate: 0.8, pitch: 0.9, volume: 1.0 },
    'zh-CN': { rate: 0.85, pitch: 0.8, volume: 1.0 },
    'ru-RU': { rate: 0.8, pitch: 0.7, volume: 1.0 },
    'ar-SA': { rate: 0.85, pitch: 0.8, volume: 1.0 },
    default: { rate: 0.9, pitch: 0.8, volume: 1.0 }
  },
  female: {
    'en-US': { rate: 0.9, pitch: 1.2, volume: 1.0 },
    'en-GB': { rate: 0.8, pitch: 1.3, volume: 1.0 },
    'fr-FR': { rate: 0.85, pitch: 1.4, volume: 1.0 },
    'es-ES': { rate: 0.9, pitch: 1.3, volume: 1.0 },
    'de-DE': { rate: 0.8, pitch: 1.2, volume: 1.0 },
    'it-IT': { rate: 0.9, pitch: 1.4, volume: 1.0 },
    'ja-JP': { rate: 0.8, pitch: 1.5, volume: 1.0 },
    'zh-CN': { rate: 0.85, pitch: 1.3, volume: 1.0 },
    'ru-RU': { rate: 0.8, pitch: 1.2, volume: 1.0 },
    'ar-SA': { rate: 0.85, pitch: 1.2, volume: 1.0 },
    default: { rate: 0.9, pitch: 1.2, volume: 1.0 }
  }
};

// Voice selection preferences by gender and language
const VOICE_GENDER_KEYWORDS = {
  male: ['male', 'man', 'masculine', 'deep', 'bass', 'david', 'alex', 'daniel', 'mark', 'tom', 'james', 'microsoft', 'google'],
  female: ['female', 'woman', 'feminine', 'high', 'soprano', 'samantha', 'victoria', 'zira', 'susan', 'mary', 'anna', 'karen', 'microsoft', 'google']
};

export function VoiceInterface({ 
  onMessage, 
  isProcessing, 
  selectedLanguage = 'en-US', 
  onLanguageChange,
  voiceGender = 'male',
  onVoiceGenderChange
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  // Removed continuous mode feature as requested
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true); // Enable AI voice by default
  const [showSettings, setShowSettings] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);

  const recognitionRef = useRef<any>(null);
  const wakeWordRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handsFreeSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setConfidence(confidence || 0.9);
        } else {
          interimTranscript += transcript;
        }
      }

      setCurrentTranscript(interimTranscript || finalTranscript);

      if (finalTranscript.trim()) {
        console.log('🗣️ Final transcript:', finalTranscript);
        onMessage(finalTranscript.trim());
        setCurrentTranscript('');
        
        // Stop recognition after getting final transcript (continuous mode removed)
        if (recognitionRef.current && !isWakeWordActive) {
          recognitionRef.current.stop();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error);
      setIsListening(false);
      setCurrentTranscript('');
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      setCurrentTranscript('');
      
      // Restart if wake word is active
      if (isWakeWordActive && voiceEnabled) {
        setTimeout(() => {
          startWakeWordListening();
        }, 1000);
      }
      
      // Removed continuous mode restart logic
    };

    return recognition;
  }, [selectedLanguage, onMessage, isWakeWordActive, voiceEnabled, isProcessing]);

  // Start hands-free silence timer (7 seconds)
  const startHandsFreeSilenceTimer = useCallback(() => {
    if (handsFreeSilenceTimerRef.current) {
      clearTimeout(handsFreeSilenceTimerRef.current);
    }

    handsFreeSilenceTimerRef.current = setTimeout(() => {
      console.log('🔇 Auto-deactivating hands-free mode after 7 seconds of silence');
      setIsWakeWordActive(false);
      if (wakeWordRef.current) {
        wakeWordRef.current.stop();
      }
    }, 7000); // 7 seconds
  }, []);

  // Reset hands-free silence timer
  const resetHandsFreeSilenceTimer = useCallback(() => {
    if (handsFreeSilenceTimerRef.current) {
      clearTimeout(handsFreeSilenceTimerRef.current);
    }
    if (isWakeWordActive) {
      startHandsFreeSilenceTimer();
    }
  }, [isWakeWordActive, startHandsFreeSilenceTimer]);

  // Initialize wake word detection
  const initializeWakeWordDetection = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const wakeWordRecognition = new SpeechRecognition();

    wakeWordRecognition.continuous = true;
    wakeWordRecognition.interimResults = true;
    wakeWordRecognition.lang = selectedLanguage;

    wakeWordRecognition.onresult = (event: any) => {
      // Reset silence timer on any speech activity
      resetHandsFreeSilenceTimer();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        
        // Detect wake words in multiple languages
        const wakeWords = [
          'hey turbo', 'hi turbo', 'turbo', 'hey turboanswer',
          'hola turbo', 'bonjour turbo', 'hallo turbo', 'ciao turbo',
          'olá turbo', 'привет турбо', 'こんにちは ターボ', '你好 涡轮',
          'مرحبا تيربو', 'हैلो टर्बो', 'turbo جواب', 'تربو',
        ];

        const containsWakeWord = wakeWords.some(word => transcript.includes(word));

        if (containsWakeWord && event.results[i].isFinal) {
          console.log('🔊 Wake word detected:', transcript);
          wakeWordRecognition.stop();
          startListening();
        }
      }
    };

    wakeWordRecognition.onerror = (event: any) => {
      console.log('Wake word detection error:', event.error);
      // Restart wake word detection
      if (isWakeWordActive) {
        setTimeout(() => {
          startWakeWordListening();
        }, 2000);
      }
    };

    return wakeWordRecognition;
  }, [selectedLanguage, isWakeWordActive, resetHandsFreeSilenceTimer]);

  // Start wake word listening
  const startWakeWordListening = useCallback(() => {
    if (!isWakeWordActive || !voiceEnabled) return;

    wakeWordRef.current = initializeWakeWordDetection();
    if (wakeWordRef.current) {
      try {
        wakeWordRef.current.start();
        console.log('👂 Wake word detection started');
        // Start the 7-second silence timer
        startHandsFreeSilenceTimer();
      } catch (error) {
        console.log('Wake word detection start error:', error);
      }
    }
  }, [isWakeWordActive, voiceEnabled, initializeWakeWordDetection, startHandsFreeSilenceTimer]);

  // Start listening
  const startListening = useCallback(() => {
    if (!voiceEnabled) return;

    recognitionRef.current = initializeRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.log('Speech recognition start error:', error);
      }
    }
  }, [voiceEnabled, initializeRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Speech recognition stop error:', error);
      }
    }
    setIsListening(false);
    setCurrentTranscript('');
  }, []);

  // Find best voice based on gender and language
  const findBestVoice = useCallback((gender: 'male' | 'female', language: string) => {
    const voices = speechSynthesis.getVoices();
    const langPrefix = language.split('-')[0];
    
    // Filter voices by language
    const languageVoices = voices.filter(voice => 
      voice.lang.startsWith(langPrefix) || voice.lang.startsWith(language)
    );
    
    // For male voices, prioritize natural and enhanced voices
    const maleKeywords = ['male', 'man', 'david', 'alex', 'daniel', 'mark', 'tom', 'james', 'matthew', 'christopher', 'natural', 'enhanced'];
    
    // Try to find natural/enhanced male voice first
    const naturalMaleVoice = languageVoices.find(voice => {
      const voiceName = voice.name.toLowerCase();
      return (voiceName.includes('natural') || voiceName.includes('enhanced')) && 
             maleKeywords.some(keyword => voiceName.includes(keyword));
    });
    
    if (naturalMaleVoice) return naturalMaleVoice;
    
    // Try any male voice
    const maleVoice = languageVoices.find(voice => {
      const voiceName = voice.name.toLowerCase();
      return maleKeywords.some(keyword => voiceName.includes(keyword));
    });
    
    if (maleVoice) return maleVoice;
    
    // Fallback: prefer enhanced/premium voices
    const enhancedVoice = languageVoices.find(voice => 
      voice.name.includes('Enhanced') || 
      voice.name.includes('Premium') || 
      voice.name.includes('Neural') ||
      voice.name.includes('Natural')
    );
    
    if (enhancedVoice) return enhancedVoice;
    
    // Final fallback: any language-matching voice
    return languageVoices[0] || voices[0];
  }, []);

  // Speak text with gender and language-specific voice
  const speakText = useCallback((text: string) => {
    if (!autoSpeak || !voiceEnabled) {
      console.log('🔇 Speech disabled:', { autoSpeak, voiceEnabled });
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.log('❌ speechSynthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Wait for voices to load
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      console.log('⏳ Waiting for voices to load...');
      speechSynthesis.addEventListener('voiceschanged', () => {
        speakText(text); // Retry once voices are loaded
      }, { once: true });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use male voice settings like ChatGPT
    utterance.lang = selectedLanguage;
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 0.9; // Slightly lower pitch for male voice
    utterance.volume = 1.0;

    // Find the best male voice for language
    const bestVoice = findBestVoice('male', selectedLanguage);
    if (bestVoice) {
      utterance.voice = bestVoice;
      console.log(`🔊 Using male voice: ${bestVoice.name} (${bestVoice.lang})`);
    } else {
      console.log('⚠️ No suitable voice found, using default');
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('🔊 Speaking:', text.substring(0, 50) + '...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('🔊 Speech ended');
      
      // Removed continuous mode restart logic
    };

    utterance.onerror = (event) => {
      console.log('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };

    speechSynthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [autoSpeak, voiceEnabled, selectedLanguage, voiceGender, findBestVoice]);

  // Toggle wake word detection
  const toggleWakeWord = useCallback(() => {
    const newState = !isWakeWordActive;
    setIsWakeWordActive(newState);

    if (newState) {
      startWakeWordListening();
    } else {
      if (wakeWordRef.current) {
        wakeWordRef.current.stop();
      }
      // Clear silence timer when manually turning off hands-free mode
      if (handsFreeSilenceTimerRef.current) {
        clearTimeout(handsFreeSilenceTimerRef.current);
      }
    }
  }, [isWakeWordActive, startWakeWordListening]);

  // Removed continuous mode feature as requested

  // Language change handler
  const handleLanguageChange = useCallback((language: string) => {
    onLanguageChange?.(language);
    
    // Restart recognition with new language
    if (isListening) {
      stopListening();
      setTimeout(() => {
        startListening();
      }, 500);
    }

    if (isWakeWordActive) {
      if (wakeWordRef.current) {
        wakeWordRef.current.stop();
      }
      setTimeout(() => {
        startWakeWordListening();
      }, 500);
    }
  }, [isListening, isWakeWordActive, onLanguageChange, stopListening, startListening, startWakeWordListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (wakeWordRef.current) {
        wakeWordRef.current.stop();
      }
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (handsFreeSilenceTimerRef.current) {
        clearTimeout(handsFreeSilenceTimerRef.current);
      }
    };
  }, []);

  // Initialize wake word detection when enabled
  useEffect(() => {
    if (isWakeWordActive && voiceEnabled) {
      startWakeWordListening();
    } else if (wakeWordRef.current) {
      wakeWordRef.current.stop();
    }
  }, [isWakeWordActive, voiceEnabled, startWakeWordListening]);

  const currentLanguage = WORLD_LANGUAGES.find(lang => lang.code === selectedLanguage);

  return (
    <div className="space-y-4">
      {/* Voice Controls Bar */}
      <div className="flex items-center justify-between bg-black rounded-lg p-3 border border-gray-800">
        {/* Left side - Removed continuous mode button */}
        <div className="flex items-center space-x-3">
          {/* Continuous mode feature removed as requested */}
        </div>

        {/* Center - Voice Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-gray-400" />
            <span className="text-white">Male Voice</span>
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xl">{currentLanguage?.flag}</span>
            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-40 bg-transparent border-0 text-white hover:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-96 bg-gray-900 border-gray-700">
                {WORLD_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-gray-800">
                    <div className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right side - Settings */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Voice Status - Shows below controls when active */}
      {(isListening || isSpeaking || currentTranscript) && (
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isListening && (
                <Badge variant="default" className="bg-red-600 animate-pulse">
                  <Mic className="w-3 h-3 mr-1" />
                  Listening...
                </Badge>
              )}
              
              {isSpeaking && (
                <Badge variant="default" className="bg-orange-600">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Speaking
                </Badge>
              )}
            </div>
            
            {currentTranscript && (
              <div className="text-sm text-gray-300">
                "{currentTranscript}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice Settings Panel */}
      {showSettings && (
        <Card className="bg-black border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-white">Voice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <Label htmlFor="voice-enabled" className="text-white text-base font-normal">Voice Input</Label>
                <Switch
                  id="voice-enabled"
                  checked={voiceEnabled}
                  onCheckedChange={setVoiceEnabled}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
              
              <div className="flex items-center justify-between p-2">
                <Label htmlFor="auto-speak" className="text-white text-base font-normal">Auto-Speak Responses</Label>
                <Switch
                  id="auto-speak"
                  checked={autoSpeak}
                  onCheckedChange={setAutoSpeak}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
              
              <div className="flex items-center justify-between p-2">
                <Label htmlFor="wake-word" className="text-white text-base font-normal">Hands-Free Mode</Label>
                <Switch
                  id="wake-word"
                  checked={isWakeWordActive}
                  onCheckedChange={toggleWakeWord}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              {/* Continuous mode toggle removed as requested */}
            </div>

            {/* Stop Speech Button */}
            <div className="pt-2 space-y-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => speechSynthesis.cancel()}
                disabled={!isSpeaking}
                className="w-full border-gray-700 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50"
              >
                <VolumeX className="w-4 h-4 mr-2" />
                Stop Speech
              </Button>
              
              {/* Test Voice Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  console.log('🔊 Testing voice...');
                  console.log('🔊 Speech synthesis available:', 'speechSynthesis' in window);
                  console.log('🔊 Voices available:', speechSynthesis.getVoices().length);
                  speakText('Hello, this is a voice test. Can you hear me?');
                }}
                className="w-full border-blue-700 bg-blue-900 hover:bg-blue-800 text-white"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Test Voice
              </Button>
            </div>
            
            {/* Wake Word Instructions */}
            {isWakeWordActive && (
              <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
                <h4 className="text-base font-medium text-white mb-2">Hands-Free Mode Active:</h4>
                <p className="text-sm text-gray-300 leading-relaxed mb-3">
                  Say "Hey Turbo", "Hi Turbo", or "Turbo" to activate voice input hands-free. Wake words work in multiple languages!
                </p>
                <p className="text-xs text-yellow-300 mb-3">
                  ⏱️ Auto-deactivates after 7 seconds of silence
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleWakeWord}
                  className="w-full border-red-600 bg-red-900/50 hover:bg-red-800 text-red-200 text-sm"
                >
                  <MicOff className="w-4 h-4 mr-2" />
                  Turn Off Hands-Free Mode
                </Button>
              </div>
            )}

            {/* Continuous Mode Instructions - Removed as requested */}
            
            {/* Voice Info */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Voice Configuration:</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{currentLanguage?.flag}</span>
                  <span className="text-sm text-gray-300">{currentLanguage?.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {voiceGender === 'female' ? (
                    <User className="w-4 h-4 text-pink-400" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-blue-400" />
                  )}
                  <span className={`text-sm ${voiceGender === 'female' ? 'text-pink-400' : 'text-blue-400'}`}>
                    {voiceGender === 'female' ? 'Female Voice' : 'Male Voice'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {WORLD_LANGUAGES.length} languages • Male & Female voices
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export the speakText function for use in other components
export const useSpeakText = (selectedLanguage: string = 'en-US', voiceGender: 'male' | 'female' = 'female') => {
  const findBestVoice = useCallback((gender: 'male' | 'female', language: string) => {
    const voices = speechSynthesis.getVoices();
    const langPrefix = language.split('-')[0];
    
    const languageVoices = voices.filter(voice => 
      voice.lang.startsWith(langPrefix) || voice.lang.startsWith(language)
    );
    
    const genderKeywords = VOICE_GENDER_KEYWORDS[gender];
    const genderVoice = languageVoices.find(voice => {
      const voiceName = voice.name.toLowerCase();
      return genderKeywords.some(keyword => voiceName.includes(keyword));
    });
    
    if (genderVoice) return genderVoice;
    
    const enhancedVoice = languageVoices.find(voice => 
      voice.name.includes('Enhanced') || 
      voice.name.includes('Premium') || 
      voice.name.includes('Neural')
    );
    
    return enhancedVoice || languageVoices[0] || voices[0];
  }, []);

  return useCallback((text: string) => {
    console.log('🔊 useSpeakText called with:', { text: text.substring(0, 50) + '...', selectedLanguage, voiceGender });
    
    if (!('speechSynthesis' in window)) {
      console.log('❌ speechSynthesis not supported');
      return;
    }

    speechSynthesis.cancel();

    // Wait for voices to load
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      console.log('⏳ Waiting for voices to load...');
      speechSynthesis.addEventListener('voiceschanged', () => {
        console.log('🔊 Voices loaded, retrying speech...');
        speechSynthesis.speak(createUtterance(text));
      }, { once: true });
      return;
    }

    const createUtterance = (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Use male voice settings like ChatGPT
      utterance.lang = selectedLanguage;
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = voiceGender === 'male' ? 0.9 : 1.1; // Lower pitch for male
      utterance.volume = 1.0;

      const bestVoice = findBestVoice(voiceGender, selectedLanguage);
      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log('🔊 Using voice:', bestVoice.name, bestVoice.lang);
      } else {
        console.log('⚠️ No suitable voice found');
      }

      utterance.onstart = () => {
        console.log('🔊 Speech started');
      };

      utterance.onend = () => {
        console.log('🔊 Speech ended');
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech error:', event.error);
      };

      return utterance;
    };

    speechSynthesis.speak(createUtterance(text));
  }, [selectedLanguage, voiceGender, findBestVoice]);
};