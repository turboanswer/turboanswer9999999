import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, FileText, X, Brain, Settings, LogOut, Camera, Globe, Zap, Menu } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import CameraCapture from "@/components/CameraCapture";
import LanguageSelector from "@/components/LanguageSelector";

import LiveCameraFeed from "@/components/LiveCameraFeed";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("auto");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [showToolbar, setShowToolbar] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('turbo_language');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${currentConversationId}/messages`, {
        content,
        selectedModel: selectedAIModel,
        language: currentLanguage
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", currentConversationId, "messages"] 
      });
      setMessageContent("");
      setIsTyping(false);
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

  useEffect(() => {
    if (!currentConversationId && conversations && conversations.length === 0) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageContent]);

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;
    setIsTyping(true);
    sendMessageMutation.mutate(messageContent.trim());
  }

  const handleDocumentAnalysis = (analysis: any) => {
    if (currentConversationId && analysis) {
      const analysisMessage = `📄 **Document Analysis: ${analysis.filename}**\n\n**Analysis Type:** ${analysis.analysisType}\n\n**Result:**\n${analysis.analysis}`;
      sendMessageMutation.mutate(analysisMessage);
      setShowDocumentUpload(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('turbo_language', languageCode);
    toast({
      title: "Language Changed",
      description: `Switched to ${languageCode.toUpperCase()}`,
    });
  };

  const handleCameraCapture = (imageData: string) => {
    console.log('Camera captured image');
  };

  const handleImageAnalysis = async (imageData: string) => {
    try {
      const response = await apiRequest("POST", "/api/analyze-image", {
        imageData,
        query: "What do you see in this image?"
      });
      const analysis = await response.json();
      if (analysis.description) {
        sendMessageMutation.mutate(`📸 **Camera Analysis**: ${analysis.description}`);
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: "Camera Analysis Failed",
        description: "Unable to analyze the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLiveCameraAnalysis = (analysis: string) => {
    if (currentConversationId && analysis) {
      const analysisMessage = `📹 **Live Camera**: ${analysis}`;
      sendMessageMutation.mutate(analysisMessage);
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return <LoadingScreen message="Activating Maximum Power AI System..." />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-black">
      <header className="bg-black/95 backdrop-blur-sm border-b border-gray-800 px-3 sm:px-4 py-2 sm:py-3 relative z-40 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">Turbo Answer</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">AI Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
              <SelectTrigger className="w-20 sm:w-28 h-7 sm:h-8 bg-gray-900 border-gray-700 text-[10px] sm:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="ultimate-fusion">Ultimate</SelectItem>
                <SelectItem value="conversational">Fast</SelectItem>
                <SelectItem value="research-pro">Research</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden sm:flex items-center gap-1">
              <Link href="/ai-settings">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white" title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={() => logout()} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-400" title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <button
              className="sm:hidden p-1.5 text-gray-400 hover:text-white rounded-md"
              onClick={() => setShowToolbar(!showToolbar)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showToolbar && (
          <div className="sm:hidden mt-2 pt-2 border-t border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button onClick={() => { setShowDocumentUpload(!showDocumentUpload); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 px-2 text-xs ${showDocumentUpload ? 'text-blue-400' : 'text-gray-400'}`}>
                <FileText className="h-4 w-4 mr-1" /> Docs
              </Button>
              <Button onClick={() => { setShowCamera(!showCamera); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 px-2 text-xs ${showCamera ? 'text-blue-400' : 'text-gray-400'}`}>
                <Camera className="h-4 w-4 mr-1" /> Cam
              </Button>
              <Button onClick={() => { setShowLiveCamera(!showLiveCamera); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 px-2 text-xs ${showLiveCamera ? 'text-red-400' : 'text-gray-400'}`}>
                <Globe className="h-4 w-4 mr-1" /> Live
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
              <Link href="/ai-settings">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={() => logout()} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </header>

      <div className="hidden sm:block bg-gray-900/50 border-b border-gray-800 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowDocumentUpload(!showDocumentUpload)} variant="ghost" size="sm" className={`h-8 px-2 ${showDocumentUpload ? 'text-blue-400' : 'text-gray-400'} hover:text-white`} title="Upload Document">
              <FileText className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowCamera(!showCamera)} variant="ghost" size="sm" className={`h-8 px-2 ${showCamera ? 'text-blue-400' : 'text-gray-400'} hover:text-white`} title="Camera">
              <Camera className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowLiveCamera(!showLiveCamera)} variant="ghost" size="sm" className={`h-8 px-2 ${showLiveCamera ? 'text-red-400' : 'text-gray-400'} hover:text-white`} title="Live Camera">
              <Globe className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
          </div>
        </div>
      </div>

      {showDocumentUpload && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-3 sm:py-4 relative z-30 shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-medium text-white">Document Analysis</h3>
            <Button onClick={() => setShowDocumentUpload(false)} variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DocumentUpload conversationId={currentConversationId ?? undefined} onAnalysisComplete={handleDocumentAnalysis} />
        </div>
      )}

      {showCamera && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-3 sm:py-4 relative z-30 shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-medium text-white">Camera Analysis</h3>
            <Button onClick={() => setShowCamera(false)} variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CameraCapture onCapture={handleCameraCapture} onAnalyze={handleImageAnalysis} isAnalyzing={false} language={currentLanguage} onContinuousMode={() => {}} continuousMode={false} />
        </div>
      )}

      {showLiveCamera && (
        <div className="bg-gradient-to-r from-red-950 to-red-900 border-b border-red-800 px-3 sm:px-6 py-3 sm:py-4 relative z-30 shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-400" />
              Live Camera - AI Analysis
            </h3>
            <Button onClick={() => setShowLiveCamera(false)} variant="ghost" size="sm" className="text-red-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <LiveCameraFeed language={currentLanguage} onAnalysisResult={handleLiveCameraAnalysis} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-zinc-900 relative z-10">
        <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-4xl mx-auto">
          {messages.length === 0 && !isTyping && (
            <div className="flex items-start gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl border border-zinc-700">
                  <p className="text-sm sm:text-base text-zinc-100 leading-relaxed">
                    Welcome to <strong>TURBO ANSWER</strong> - The Ultimate AI Assistant! I can have natural conversations, analyze documents, and much more. Choose your AI model above and start chatting!
                  </p>
                  <div className="mt-2 sm:mt-3 flex items-center space-x-2 text-[10px] sm:text-xs text-zinc-400">
                    <Brain className="h-3 w-3" />
                    <span>Model: {selectedAIModel === 'auto' ? 'Auto-Select' : selectedAIModel}</span>
                  </div>
                </Card>
                <div className="text-[10px] sm:text-xs text-zinc-500 mt-1.5 sm:mt-2 ml-1">Just now</div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                  <Bot className="text-white h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
              
              <div className={`min-w-0 ${message.role === 'user' ? 'max-w-[85%] sm:max-w-md' : 'flex-1'}`}>
                <Card className={`px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl relative ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl rounded-tr-md' 
                    : 'bg-zinc-800 rounded-2xl rounded-tl-md border border-zinc-700'
                }`}>
                  <p className={`text-sm sm:text-base leading-relaxed break-words ${message.role === 'user' ? 'text-white' : 'text-zinc-100'}`}>
                    {message.content}
                  </p>
                </Card>
                <div className={`text-[10px] sm:text-xs text-zinc-500 mt-1 sm:mt-2 ${message.role === 'user' ? 'mr-1 text-right' : 'ml-1'}`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-zinc-300 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Bot className="text-white h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="flex-1">
                <Card className="bg-zinc-800 rounded-2xl rounded-tl-md px-3 sm:px-4 py-2.5 sm:py-3 shadow-xl border border-zinc-700">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full"></div>
                    </div>
                    <span className="text-zinc-400 text-xs sm:text-sm">AI is processing...</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-black border-t border-gray-800 p-2.5 sm:p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-11 sm:pr-12 bg-gray-900 border border-gray-700 rounded-xl text-sm sm:text-base text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[40px] sm:min-h-[44px] max-h-28 sm:max-h-32"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 h-7 w-7 sm:h-8 sm:w-8 p-0 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-500">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full"></div>
                <span>AI Ready</span>
              </span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
            <span>{messageContent.length}/2000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
