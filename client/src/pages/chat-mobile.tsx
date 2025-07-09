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
  const [isWakeWordListening, setIsWakeWordListening] = useState(false); // Enable Hey Turbo
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

  // Wake word detection setup - optimized and working
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window && isWakeWordListening) {
      const startWakeWordDetection = () => {
        try {
          if (wakeWordRef.current) {
            wakeWordRef.current.stop();
            wakeWordRef.current = null;
          }
          
          const SpeechRecognition = (window as any).webkitSpeechRecognition;
          wakeWordRef.current = new SpeechRecognition();
          wakeWordRef.current.continuous = true;
          wakeWordRef.current.interimResults = true;
          wakeWordRef.current.lang = 'en-US';

          wakeWordRef.current.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript.toLowerCase().trim();
              
              if (transcript.includes('hey turbo') || transcript.includes('turbo')) {
                console.log('🎤 "Hey Turbo" detected! Starting voice input...');
                wakeWordRef.current?.stop();
                setTimeout(() => startListening(), 100);
                break;
              }
            }
          };

          wakeWordRef.current.onerror = (event: any) => {
            if (event.error !== 'aborted' && event.error !== 'not-allowed') {
              console.log('🎤 Wake word error:', event.error);
            }
          };

          wakeWordRef.current.onend = () => {
            if (isWakeWordListening) {
              timeoutId = setTimeout(startWakeWordDetection, 1500);
            }
          };

          wakeWordRef.current.start();
        } catch (error) {
          console.log('🎤 Wake word setup error:', error);
        }
      };

      // Add small delay before starting
      timeoutId = setTimeout(startWakeWordDetection, 500);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (wakeWordRef.current) {
          wakeWordRef.current.stop();
          wakeWordRef.current = null;
        }
      };
    }
  }, [isWakeWordListening]);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
        
        // Auto-send after voice input
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
        }, 200);
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
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">T</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Turbo</h1>
            {isWakeWordListening && (
              <p className="text-xs text-green-400">Say "Hey Turbo" to activate</p>
            )}
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
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold">T</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Hi! I'm Turbo</h2>
            <p className="text-gray-400 mb-4">Your AI assistant for live conversations</p>
            <p className="text-sm text-green-400">Say "Hey Turbo" to start talking</p>
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
  );
}