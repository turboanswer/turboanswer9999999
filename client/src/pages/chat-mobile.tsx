import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send, Mic, MicOff, Volume2, Plus } from 'lucide-react';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export default function ChatMobile() {
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false); // Removed wake word feature
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const wakeWordRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for current conversation
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/conversations', currentConversationId, 'messages'],
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/conversations', {}),
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      // If we have a pending message, send it now
      const pendingMessage = message.trim();
      if (pendingMessage) {
        setTimeout(() => {
          console.log('Sending pending message after conversation creation:', pendingMessage);
          setIsTyping(true);
          sendMessageMutation.mutate({
            message: pendingMessage,
            aiModel: selectedAIModel,
          });
        }, 100);
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: { message: string; aiModel: string }) => {
      if (!currentConversationId) {
        throw new Error('No conversation ID available');
      }
      const requestBody = {
        content: messageData.message,
        selectedModel: messageData.aiModel
      };
      console.log('Sending API request:', requestBody, 'to conversation:', currentConversationId);
      return apiRequest('POST', `/api/conversations/${currentConversationId}/messages`, requestBody);
    },
    onSuccess: (data) => {
      console.log('Message sent successfully:', data);
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', currentConversationId, 'messages'] 
      });
      setMessage('');
      setIsTyping(false);
      
      // Auto-speak for conversational/emotional AI
      if (data.aiMessage && (selectedAIModel === 'conversational' || selectedAIModel === 'emotional')) {
        speakText(data.aiMessage.content);
      }
    },
    onError: (error) => {
      console.error('Message send error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Create initial conversation - prevent multiple calls
  useEffect(() => {
    if (conversations.length === 0 && !currentConversationId) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations.length]);

  // Wake word detection removed for better performance

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
        
        // Auto-send after voice input with longer delay
        setTimeout(() => {
          if (currentConversationId && transcript.trim()) {
            setIsTyping(true);
            sendMessageMutation.mutate({
              message: transcript.trim(),
              aiModel: selectedAIModel,
            });
          }
        }, 800);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [currentConversationId, selectedAIModel]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = message.trim();
    
    if (!messageText || sendMessageMutation.isPending) {
      console.log('Cannot send - empty message or already pending');
      return;
    }

    // Ensure we have a conversation
    if (!currentConversationId) {
      console.log('No conversation, creating one...');
      // Store the message to send after conversation is created
      setMessage(messageText);
      createConversationMutation.mutate();
      return;
    }

    console.log('Sending message:', messageText, 'to conversation:', currentConversationId);
    setIsTyping(true);
    
    sendMessageMutation.mutate({
      message: messageText,
      aiModel: selectedAIModel,
    });
  };

  // Voice functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.log('Speech recognition start error:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.log('Speech recognition stop error:', error);
        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const newConversation = () => {
    createConversationMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-spin" style={{animationDuration: '20s'}}>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="absolute top-[-30%] right-[-30%] w-[150%] h-[150%] animate-spin" style={{animationDuration: '15s', animationDirection: 'reverse'}}>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="absolute bottom-[-40%] left-[-40%] w-[180%] h-[180%] animate-spin" style={{animationDuration: '25s'}}>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>
      
      {/* Content with backdrop */}
      <div className="relative z-10 flex flex-col min-h-screen backdrop-blur-sm bg-black/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">T</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Turbo</h1>
            <p className="text-xs text-blue-400">AI Assistant</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          
          <select
            value={selectedAIModel}
            onChange={(e) => setSelectedAIModel(e.target.value)}
            className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded-lg"
          >
            <option value="auto">Auto</option>
            <option value="conversational">Conversational</option>
            <option value="emotional">Emotional</option>
            <option value="claude-3-opus">Claude Opus</option>
            <option value="gpt-4">GPT-4</option>
          </select>
          
          <button
            onClick={newConversation}
            className="p-2 bg-gray-800 rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 px-6">
            {/* Main Logo */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-2xl font-bold text-white">T</span>
            </div>
            
            {/* Welcome Message */}
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome to Turbo
            </h1>
            <p className="text-gray-400 mb-6 text-lg">Your AI assistant for live conversations</p>
            
            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm">🎤</span>
                </div>
                <h3 className="text-sm font-semibold mb-1">Voice Commands</h3>
                <p className="text-xs text-gray-400">Click microphone to speak</p>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm">🤖</span>
                </div>
                <h3 className="text-sm font-semibold mb-1">Smart AI</h3>
                <p className="text-xs text-gray-400">Multiple AI models available</p>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm">🌍</span>
                </div>
                <h3 className="text-sm font-semibold mb-1">Weather & Location</h3>
                <p className="text-xs text-gray-400">Global weather data</p>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm">💬</span>
                </div>
                <h3 className="text-sm font-semibold mb-1">Live Chat</h3>
                <p className="text-xs text-gray-400">Natural conversations</p>
              </div>
            </div>
            
            {/* Quick Start */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 mb-4">
              <h3 className="text-sm font-semibold mb-2 text-blue-400">Quick Start</h3>
              <div className="space-y-2 text-xs text-gray-300">
                <p>• Type a message or tap the microphone to start</p>
                <p>• Ask about weather, time zones, or general questions</p>
                <p>• Choose from multiple AI models for different needs</p>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center justify-center space-x-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Ready for your questions</span>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">T</span>
                    </div>
                    <button
                      onClick={() => speakText(msg.content)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">T</span>
                </div>
                <span className="text-sm text-gray-300">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-3 rounded-full ${
              isListening 
                ? 'bg-red-600' 
                : 'bg-gray-800'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isListening ? "Listening..." : "Message Turbo"}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="p-3 bg-blue-600 disabled:bg-gray-700 rounded-full"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        
        <p className="text-xs text-gray-500 text-center mt-2">
          Turbo AI can make mistakes, so double-check it
        </p>
      </div>
    </div>
    </div>
  );
}