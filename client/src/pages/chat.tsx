import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Mic, MicOff, Volume2, FileText, X, Brain, Settings, LogOut } from "lucide-react";
import { Link } from "wouter";
import { TurboLogo } from "@/components/TurboLogo";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("auto");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for user authentication
  useEffect(() => {
    const userData = localStorage.getItem('turbo_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem('turbo_user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('turbo_user');
    setUser(null);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

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
  }

  const handleDocumentAnalysis = (analysis: any) => {
    // Add the analysis result as a message in the current conversation
    if (currentConversationId && analysis) {
      const analysisMessage = `📄 **Document Analysis: ${analysis.filename}**\n\n**Analysis Type:** ${analysis.analysisType}\n\n**Result:**\n${analysis.analysis}`;
      
      // Send the analysis as a regular message
      sendMessageMutation.mutate(analysisMessage);
      setShowDocumentUpload(false);
    }
  };;

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
      {/* Header - Fixed position to prevent movement */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TurboLogo size={40} />
            <div>
              <h1 className="text-xl font-semibold text-white">Turbo Answer</h1>
              <p className="text-sm text-zinc-400">Multi-Model AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* User Authentication */}
            {user ? (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-zinc-400">Welcome, {user.username}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-400"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mr-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                    Create Account
                  </Button>
                </Link>
              </div>
            )}
            
            <Button
              onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              variant="outline"
              size="sm"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            >
              <FileText className="h-4 w-4 mr-1" />
              {showDocumentUpload ? 'Hide Upload' : 'Upload Doc'}
            </Button>
            <Button
              onClick={() => setShowModelSelector(!showModelSelector)}
              variant="outline"
              size="sm"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            >
              <Brain className="h-4 w-4 mr-1" />
              AI Model
            </Button>
          </div>
        </div>
      </header>

      {/* Document Upload Panel */}
      {showDocumentUpload && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Document Analysis</h3>
            <Button
              onClick={() => setShowDocumentUpload(false)}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DocumentUpload 
            conversationId={currentConversationId} 
            onAnalysisComplete={handleDocumentAnalysis}
          />
        </div>
      )}

      {/* AI Model Selector Panel */}
      {showModelSelector && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">AI Model Selection</h3>
            <Button
              onClick={() => setShowModelSelector(false)}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-zinc-800 border-zinc-700 p-4">
                <h4 className="font-semibold text-white mb-2">🧠 Premium Models</h4>
                <p className="text-sm text-zinc-400 mb-3">Most powerful AI for complex tasks</p>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-300">• Claude 3 Opus (Creative)</div>
                  <div className="text-xs text-zinc-300">• GPT-4 (Reasoning)</div>
                  <div className="text-xs text-zinc-300">• Claude 3 Sonnet (Balanced)</div>
                </div>
              </Card>
              
              <Card className="bg-zinc-800 border-zinc-700 p-4">
                <h4 className="font-semibold text-white mb-2">⚡ Advanced Models</h4>
                <p className="text-sm text-zinc-400 mb-3">Fast and intelligent responses</p>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-300">• GPT-3.5 Turbo (Speed)</div>
                  <div className="text-xs text-zinc-300">• Gemini Pro (Multimodal)</div>
                </div>
              </Card>
              
              <Card className="bg-zinc-800 border-zinc-700 p-4">
                <h4 className="font-semibold text-white mb-2">🚀 Specialized Models</h4>
                <p className="text-sm text-zinc-400 mb-3">Optimized for quick responses</p>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-300">• Claude Instant (Efficient)</div>
                </div>
              </Card>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-white font-medium">Select AI Model:</label>
              <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                <SelectTrigger className="w-64 bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Choose AI model" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="auto">🤖 Auto-Select (Recommended)</SelectItem>
                  <SelectItem value="claude-3-opus">🧠 Claude 3 Opus (Creative)</SelectItem>
                  <SelectItem value="gpt-4">🎯 GPT-4 (Reasoning)</SelectItem>
                  <SelectItem value="claude-3-sonnet">⚖️ Claude 3 Sonnet (Balanced)</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">⚡ GPT-3.5 Turbo (Speed)</SelectItem>
                  <SelectItem value="gemini-pro">🔬 Gemini Pro (Multimodal)</SelectItem>
                  <SelectItem value="claude-instant">🚀 Claude Instant (Efficient)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-zinc-400">
              <p><strong>Auto-Select:</strong> Automatically chooses the best AI model based on your query complexity and domain.</p>
              <p><strong>Manual Selection:</strong> Use a specific model for all responses until changed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages - Stable container */}
      <div className="flex-1 overflow-y-auto bg-zinc-900 relative z-10">
        <div className="px-4 py-6 sm:px-6">
          {messages.length === 0 && !isTyping && (
            <div className="flex items-start space-x-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white text-sm" />
              </div>
              <div className="flex-1">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-xl border border-zinc-700">
                  <p className="text-zinc-100 leading-relaxed">
                    Hi! I'm Turbo Answer, the world's most powerful AI assistant. I combine multiple state-of-the-art AI models to give you expert-level responses across all domains. What can I help you with?
                  </p>
                  <div className="mt-3 flex items-center space-x-2 text-xs text-zinc-400">
                    <Brain className="h-3 w-3" />
                    <span>Current Model: {selectedAIModel === 'auto' ? 'Auto-Select (Intelligent Routing)' : selectedAIModel}</span>
                  </div>
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
                      className="absolute top-2 right-2 w-6 h-6 p-0 text-zinc-400 hover:text-purple-400"
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
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
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

      {/* Input - Fixed position */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-4 sm:px-6 relative z-40 shrink-0">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask me anything or click the mic to speak..."}
                className={`w-full px-4 py-3 pr-20 text-zinc-100 placeholder-zinc-500 bg-zinc-900 border border-zinc-700 rounded-2xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[48px] ${isListening ? 'ring-2 ring-red-400 border-red-400' : ''}`}
                rows={1}
              />
              {isRecognitionSupported && (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  disabled={sendMessageMutation.isPending}
                  className={`absolute right-11 bottom-2 w-8 h-8 rounded-full flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed p-0 ${
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
                className="absolute right-2 bottom-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed p-0"
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
