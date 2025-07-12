import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceCallInterface({ isOpen, onClose }: VoiceCallInterfaceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationLog, setConversationLog] = useState<Array<{role: string, content: string, timestamp: number}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initializeVoiceCall();
    } else {
      cleanup();
    }
    
    return () => cleanup();
  }, [isOpen]);

  const initializeVoiceCall = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Check if browser supports required features
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: "Browser not supported",
          description: "Your browser doesn't support speech recognition. Please use Chrome or Edge.",
          variant: "destructive"
        });
        return;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting permission
      
      // Initialize WebSocket connection
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/voice-call`;
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        setConnectionStatus('connected');
        setIsConnected(true);
        toast({
          title: "Voice call connected",
          description: "You can now speak to Turbo AI Assistant",
        });
      };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      websocketRef.current.onclose = () => {
        setConnectionStatus('disconnected');
        setIsConnected(false);
        toast({
          title: "Voice call ended",
          description: "Connection closed",
        });
      };
      
      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        toast({
          title: "Connection error",
          description: "Failed to connect to voice service",
          variant: "destructive"
        });
      };
      
      // Initialize speech recognition
      initializeSpeechRecognition();
      
    } catch (error) {
      console.error('Voice call initialization error:', error);
      setConnectionStatus('error');
      toast({
        title: "Initialization failed",
        description: "Could not initialize voice call. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsRecording(true);
      setCurrentMessage('Listening...');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setCurrentMessage(transcript);
      
      // Add user message to log
      const userMessage = {
        role: 'user',
        content: transcript,
        timestamp: Date.now()
      };
      setConversationLog(prev => [...prev, userMessage]);
      
      // Send to AI via WebSocket
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'voice_transcript',
          transcript: transcript,
          sessionId: sessionId
        }));
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setCurrentMessage('');
      toast({
        title: "Speech recognition error",
        description: "Could not process your speech. Please try again.",
        variant: "destructive"
      });
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'voice_ready':
        setSessionId(data.sessionId);
        setCurrentMessage('Ready to talk! Click the microphone to speak.');
        break;
        
      case 'ai_response':
        const aiMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: Date.now()
        };
        setConversationLog(prev => [...prev, aiMessage]);
        
        // Speak the AI response
        if (data.shouldSpeak) {
          speakText(data.message);
        }
        
        setCurrentMessage('');
        break;
        
      case 'session_ended':
        setCurrentMessage(data.message);
        setTimeout(() => {
          onClose();
        }, 2000);
        break;
        
      case 'pong':
        // Keep-alive response
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Try to use a male voice
      const voices = speechSynthesis.getVoices();
      const maleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('male') || 
        voice.name.toLowerCase().includes('david') ||
        voice.name.toLowerCase().includes('mark')
      );
      
      if (maleVoice) {
        utterance.voice = maleVoice;
      }
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      speechSynthesis.speak(utterance);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: "Recording failed",
          description: "Could not start voice recording",
          variant: "destructive"
        });
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const endCall = () => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'end_session',
        sessionId: sessionId
      }));
    }
    cleanup();
    onClose();
  };

  const cleanup = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setConnectionStatus('disconnected');
    setSessionId(null);
    setConversationLog([]);
    setCurrentMessage('');
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Connecting...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Voice Call with Turbo AI
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {currentMessage || 'Initializing voice call...'}
            </p>
          </div>

          {/* Conversation Log */}
          <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded p-3">
            {conversationLog.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">No conversation yet</p>
            ) : (
              conversationLog.map((message, index) => (
                <div key={index} className={`text-sm ${message.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                  <strong>{message.role === 'user' ? 'You' : 'Turbo AI'}:</strong> {message.content}
                </div>
              ))
            )}
          </div>

          {/* Call Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConnected}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className="flex items-center gap-2"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Stop' : 'Speak'}
            </Button>
            
            <Button
              onClick={endCall}
              variant="destructive"
              size="lg"
              className="flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </Button>
          </div>

          {/* Audio Status */}
          <div className="flex justify-center">
            {isSpeaking && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Volume2 className="w-4 h-4" />
                AI is speaking...
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center">
            <p>Click "Speak" to ask a question, then wait for Turbo AI to respond.</p>
            <p>Works best in Chrome or Edge browsers.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add TypeScript declarations for Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}