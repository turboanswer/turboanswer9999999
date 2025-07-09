import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Settings, History, Send, Bot, User, Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get or create conversation
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        title: "New Conversation"
      });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${currentConversationId}/messages`, {
        content
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", currentConversationId, "messages"] 
      });
      setMessageContent("");
      setIsTyping(false);
      
      // Automatically speak the AI response if available
      if (data.aiMessage && data.aiMessage.content && 'speechSynthesis' in window) {
        // Small delay to allow UI to update first
        setTimeout(() => {
          speakResponse(data.aiMessage.content);
        }, 500);
      }
    },
    onError: (error: any) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  });

  // Initialize conversation on first load
  useEffect(() => {
    if (!currentConversationId && conversations && conversations.length === 0) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageContent]);

  // Initialize speech recognition
  useEffect(() => {
    const initializeSpeechRecognition = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsRecognitionSupported(true);
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsListening(true);
        };
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            setMessageContent(finalTranscript.trim());
          } else if (interimTranscript) {
            setMessageContent(interimTranscript.trim());
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access to use voice commands",
              variant: "destructive",
            });
          } else if (event.error === 'no-speech') {
            toast({
              title: "No Speech Detected",
              description: "Please try speaking again",
              variant: "destructive",
            });
          }
        };
        
        recognition.onend = () => {
          setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      } else {
        setIsRecognitionSupported(false);
      }
    };
    
    initializeSpeechRecognition();
  }, [toast]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;

    setIsTyping(true);
    sendMessageMutation.mutate(messageContent.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast({
          title: "Voice Command Error",
          description: "Unable to start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      // Try to use a more natural voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Natural') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
      ) || voices.find(voice => voice.lang.includes('en'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-black shadow-2xl">
      {/* Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">AI Assistant Pro</h1>
              <p className="text-sm text-zinc-400">Powered by OpenAI Assistant API</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isRecognitionSupported && (
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 ${isListening ? 'text-red-400 hover:text-red-300' : 'text-zinc-400 hover:text-zinc-300'}`}
                onClick={isListening ? stopListening : startListening}
                title={isListening ? "Stop listening" : "Start voice command"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`p-2 ${isSpeaking ? 'text-purple-400 hover:text-purple-300' : 'text-zinc-400 hover:text-zinc-300'}`}
              onClick={toggleSpeech}
              title={isSpeaking ? "Stop speaking" : "Text-to-speech available"}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-zinc-400 hover:text-zinc-300">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 text-zinc-400 hover:text-zinc-300">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-zinc-900">
        <div className="px-4 py-6 sm:px-6">
          {messages.length === 0 && !isTyping && (
            <div className="flex items-start space-x-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-xl border border-zinc-700">
                  <p className="text-zinc-100 leading-relaxed">
                    Hello! I'm your advanced AI assistant powered by OpenAI's Assistant API. I have deep knowledge across all fields and can help with coding, analysis, research, and complex problem-solving. What would you like to explore today?
                  </p>
                </Card>
                <div className="text-xs text-zinc-500 mt-2 ml-1">
                  Just now
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                  <Bot className="text-white text-sm" />
                </div>
              )}
              
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-xs sm:max-w-md' : ''}`}>
                <Card className={`px-4 py-3 shadow-xl relative group ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl rounded-tr-md' 
                    : 'bg-zinc-800 rounded-2xl rounded-tl-md border border-zinc-700'
                }`}>
                  <p className={`leading-relaxed ${message.role === 'user' ? 'text-white' : 'text-zinc-100'}`}>
                    {message.content}
                  </p>
                  {message.role === 'assistant' && 'speechSynthesis' in window && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-purple-400"
                      onClick={() => speakResponse(message.content)}
                      title="Read aloud"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  )}
                </Card>
                <div className={`text-xs text-zinc-500 mt-2 ${message.role === 'user' ? 'mr-1 text-right' : 'ml-1'}`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-zinc-300 text-sm" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-xl border border-zinc-700">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-zinc-400 text-sm">AI is processing...</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-4 sm:px-6">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask me anything or click the mic to speak..."}
                className={`w-full px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-500 bg-zinc-900 border border-zinc-700 rounded-2xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 min-h-[48px] ${isListening ? 'ring-2 ring-red-400 border-red-400' : ''}`}
                rows={1}
              />
              {isRecognitionSupported && (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  disabled={sendMessageMutation.isPending}
                  className={`absolute right-11 bottom-2 w-8 h-8 rounded-full flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-0 ${
                    isListening 
                      ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500' 
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 focus:ring-zinc-500'
                  }`}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="absolute right-2 bottom-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Input Helper Text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Press Enter to send</span>
            {isRecognitionSupported && (
              <span>{isListening ? 'Listening for voice...' : 'Voice commands available'}</span>
            )}
            <span>Secure & Private</span>
          </div>
          <div className="text-xs text-gray-400">
            {messageContent.length}/2000
          </div>
        </div>
      </div>
    </div>
  );
}
