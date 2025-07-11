import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Mic, Send, FileText, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
// Logo integrated directly in component

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false); // Disabled by default to prevent lag
  const recognitionRef = useRef<any>(null);
  const wakeWordRef = useRef<any>(null);
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for current conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/conversations', currentConversationId, 'messages'],
    enabled: !!currentConversationId,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation"
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setCurrentConversationId(newConversation.id);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${currentConversationId}/messages`, {
        content,
        selectedModel: selectedAIModel
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', currentConversationId, 'messages'] 
      });
      setMessageContent("");
      setIsTyping(false);
      
      // Automatically speak the AI response for conversational models
      if (data.aiMessage && data.aiMessage.content) {
        console.log('🤖 AI Response received, selected model:', selectedAIModel);
        console.log('🤖 Response content:', data.aiMessage.content.substring(0, 100) + '...');
        
        // Auto-speak for conversational and emotional AI models
        if (selectedAIModel === 'conversational' || selectedAIModel === 'emotional') {
          console.log('🗣️ Auto-speaking enabled for', selectedAIModel);
          setTimeout(() => {
            speakResponse(data.aiMessage.content);
          }, 800); // Longer delay to ensure message is fully rendered
        } else {
          console.log('🗣️ Auto-speak disabled for model:', selectedAIModel);
        }
      }
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create initial conversation
  useEffect(() => {
    if (conversations.length === 0 && !createConversationMutation.isPending && !currentConversationId) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversationId(conversations[conversations.length - 1].id); // Use the latest conversation
    }
  }, []); // Remove dependencies to prevent re-runs

  const createNewConversation = () => {
    createConversationMutation.mutate();
  };

  const sendMessage = () => {
    if (!messageContent.trim() || isTyping) return;
    
    setIsTyping(true);
    sendMessageMutation.mutate(messageContent);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "File Upload",
        description: "Document analysis feature coming soon!",
      });
    }
  };

  // Initialize wake word detection
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('🎤 Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    // Wake word detection
    const startWakeWordDetection = () => {
      if (wakeWordRef.current || isListening) return;
      
      const wakeRecognition = new SpeechRecognition();
      wakeRecognition.continuous = true;
      wakeRecognition.interimResults = false;
      wakeRecognition.lang = 'en-US';
      
      wakeRecognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('🎤 Wake word detection:', transcript);
        
        if (transcript.includes('hey turbo') || transcript.includes('turbo')) {
          console.log('🎤 Wake word detected! Starting voice input...');
          wakeRecognition.stop();
          setIsWakeWordListening(false);
          toggleListening();
        }
      };
      
      wakeRecognition.onerror = (event: any) => {
        console.log('🎤 Wake word error:', event.error);
        wakeWordRef.current = null;
        // Restart wake word detection after error
        if (isWakeWordListening) {
          setTimeout(startWakeWordDetection, 1000);
        }
      };
      
      wakeRecognition.onend = () => {
        wakeWordRef.current = null;
        if (isWakeWordListening && !isListening) {
          // Restart wake word detection
          setTimeout(startWakeWordDetection, 500);
        }
      };
      
      wakeWordRef.current = wakeRecognition;
      try {
        wakeRecognition.start();
        console.log('🎤 Wake word detection started - say "Hey Turbo"');
      } catch (error) {
        console.log('🎤 Failed to start wake word detection:', error);
        wakeWordRef.current = null;
      }
    };
    
    if (isWakeWordListening && !isListening) {
      startWakeWordDetection();
    }
    
    return () => {
      if (wakeWordRef.current) {
        wakeWordRef.current.stop();
        wakeWordRef.current = null;
      }
    };
  }, [isWakeWordListening, isListening]);

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('🎤 Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsWakeWordListening(true); // Resume wake word detection
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
      setIsWakeWordListening(false); // Stop wake word detection during input
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');

      console.log('🎤 Transcript:', transcript);
      setMessageContent(transcript);
      
      // Auto-send if final result
      if (event.results[event.results.length - 1].isFinal) {
        setTimeout(() => {
          if (transcript.trim()) {
            sendMessage();
          }
        }, 1000);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('🎤 Speech recognition error:', event.error);
      setIsListening(false);
      setIsWakeWordListening(true); // Resume wake word detection on error
    };

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      setIsListening(false);
      setIsWakeWordListening(true); // Resume wake word detection when done
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      console.log('🗣️ Speaking:', text.substring(0, 50) + '...');
      
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        console.log('🗣️ Speech started');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('🗣️ Speech ended');
        setIsSpeaking(false);
      };
      utterance.onerror = (error) => {
        console.error('🗣️ Speech error:', error);
        setIsSpeaking(false);
      };
      
      // Try to use a more natural voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Natural') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
      ) || voices.find(voice => voice.lang.includes('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
        console.log('🗣️ Using voice:', englishVoice.name);
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.log('🗣️ Speech synthesis not supported');
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 text-white flex flex-col relative overflow-hidden">
      {/* Static background elements - no animations for better performance */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute top-60 right-40 w-40 h-40 bg-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-40 w-36 h-36 bg-cyan-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-orange-500 rounded-full blur-3xl"></div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-purple-900/80 via-black/80 to-pink-900/80 backdrop-blur-md border-b border-purple-500/30 shadow-lg z-50 sticky top-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 shrink-0">
                <img 
                  src="/src/assets/turboanswer-logo.png" 
                  alt="TURBOANSWER AI Robot" 
                  className="w-full h-full object-contain animate-pulse hover:animate-bounce transition-all duration-300"
                />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  TurboAnswer
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                    <SelectTrigger className="w-40 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 hover:border-purple-400/50 text-white text-sm h-8 transition-all duration-300 shadow-lg hover:shadow-purple-500/25">
                      <SelectValue placeholder="AI Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 shadow-2xl shadow-purple-500/20">
                      <SelectItem value="auto" className="hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-pink-600/20 text-white">🤖 Auto-Select</SelectItem>
                      <SelectItem value="conversational" className="hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-cyan-600/20 text-white">💬 Conversational</SelectItem>
                      <SelectItem value="emotional" className="hover:bg-gradient-to-r hover:from-pink-600/20 hover:to-red-600/20 text-white">❤️ Emotional</SelectItem>
                      <SelectItem value="claude-sonnet-4" className="hover:bg-gradient-to-r hover:from-orange-600/20 hover:to-yellow-600/20 text-white">🧠 Claude 4.0</SelectItem>
                      <SelectItem value="gpt-4o" className="hover:bg-gradient-to-r hover:from-green-600/20 hover:to-emerald-600/20 text-white">⚡ GPT-4o</SelectItem>
                      <SelectItem value="claude-3-opus" className="hover:bg-gradient-to-r hover:from-indigo-600/20 hover:to-purple-600/20 text-white">🎯 Claude Opus</SelectItem>
                      <SelectItem value="gpt-4" className="hover:bg-gradient-to-r hover:from-red-600/20 hover:to-pink-600/20 text-white">🔥 GPT-4</SelectItem>
                      <SelectItem value="claude-3-sonnet" className="hover:bg-gradient-to-r hover:from-cyan-600/20 hover:to-blue-600/20 text-white">📝 Claude Sonnet</SelectItem>
                      <SelectItem value="gpt-3.5-turbo" className="hover:bg-gradient-to-r hover:from-teal-600/20 hover:to-green-600/20 text-white">🚀 GPT-3.5</SelectItem>
                      <SelectItem value="gemini-pro" className="hover:bg-gradient-to-r hover:from-violet-600/20 hover:to-purple-600/20 text-white">💎 Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <button
                    onClick={createNewConversation}
                    className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-md hover:scale-105 active:scale-95 transition-all duration-300 font-medium text-sm h-8 shadow-lg hover:shadow-cyan-500/25"
                  >
                    New Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Center Content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-6xl w-full">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="text-center mb-8">
                <h2 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-12">
                  Hey! I'm Turbo, your voice assistant
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  {isWakeWordListening ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span>Listening for "Hey Turbo"...</span>
                    </span>
                  ) : isListening ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                      <span>Listening to your voice...</span>
                    </span>
                  ) : (
                    "Click the mic to start talking"
                  )}
                </p>
                <div className="w-32 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 mx-auto rounded-full opacity-60"></div>
              </div>
            )}
            
            {/* Messages */}
            {messages.length > 0 && (
              <div className="space-y-4 mb-8">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl px-4 py-3 rounded-lg transition-all duration-300 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-gradient-to-r from-gray-800 to-gray-700 text-gray-100 border border-purple-500/10 shadow-lg shadow-gray-900/50'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => speakResponse(message.content)}
                          className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
                        >
                          🗣️ Speak
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 backdrop-blur-sm border border-purple-500/20 text-gray-100 px-4 py-3 rounded-lg shadow-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-6 border-t border-purple-500/30 bg-gradient-to-t from-purple-900/50 via-black/30 to-transparent backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 bg-gray-800 border border-purple-500/20 rounded-full px-6 py-4">
              <label className="p-3 text-gray-400 hover:text-purple-400 transition-all duration-300 cursor-pointer hover:scale-110">
                <FileText className="w-6 h-6" />
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleFileUpload}
                />
              </label>
              
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Say 'Hey Turbo' or type your message..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none text-lg"
                rows={1}
                style={{ minHeight: '32px', maxHeight: '120px' }}
              />
              
              <button
                onClick={toggleListening}
                className={`p-3 rounded-lg transition-all duration-300 ${
                  isListening 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white shadow-lg shadow-red-500/25 scale-110' 
                    : 'text-gray-400 hover:text-cyan-400 hover:scale-110'
                }`}
                title={isListening ? 'Stop listening' : 'Hey Turbo - Voice Assistant'}
              >
                <Mic className="w-7 h-7" />
              </button>
              
              <button
                onClick={sendMessage}
                disabled={!messageContent.trim() || isTyping}
                className={`p-3 rounded-lg transition-all duration-300 ${
                  messageContent.trim() && !isTyping
                    ? 'text-cyan-400 hover:text-cyan-300 hover:scale-110 hover:bg-cyan-500/10'
                    : 'text-gray-600'
                }`}
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
            
            {isSpeaking && (
              <div className="text-center text-green-400 text-sm mt-2 animate-pulse">
                🗣️ <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-medium">Speaking...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}