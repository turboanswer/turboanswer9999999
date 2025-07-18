import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, FileText, X, Brain, Settings, LogOut, Camera, Globe, Zap } from "lucide-react";
import { Link } from "wouter";
import turboLogo from "@assets/file_00000000d40c61f9a186294bbf2c842a_1752427622475.png";
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

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for user authentication and handle loading
  useEffect(() => {
    const userData = localStorage.getItem('turbo_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem('turbo_user');
      }
    }
    
    // Load saved language preference
    const savedLanguage = localStorage.getItem('turbo_language');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
    

    
    // Show loading screen for 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
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
        content,
        selectedModel: selectedAIModel,
        language: currentLanguage // Include language support
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", currentConversationId, "messages"] 
      });
      setMessageContent("");
      setIsTyping(false);
      
      // Automatically speak the AI response for conversational models
      if (data.aiMessage && data.aiMessage.content) {
        console.log('🤖 AI Response received, selected model:', selectedAIModel);
        console.log('🤖 Response content:', data.aiMessage.content.substring(0, 100) + '...');
        

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



  // Language change handler
  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('turbo_language', languageCode);
    toast({
      title: "Language Changed",
      description: `Switched to ${languageCode.toUpperCase()}`,
    });
  };



  // Camera analysis handlers
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
        // Send the analysis as a message
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



  // Live camera analysis result handler
  const handleLiveCameraAnalysis = (analysis: string) => {
    // Add the analysis result as a message in the current conversation
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  // Show loading screen on app start
  if (isLoading) {
    return <LoadingScreen message="Activating Maximum Power AI System..." />;
  }

  return (
    <div className="flex flex-col h-screen w-full mx-auto bg-black fixed inset-0">
      {/* Simplified Intuitive Header */}
      <header className="bg-black/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 relative z-40 shrink-0">
        <div className="flex items-center justify-between">
          {/* New Robot Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src={turboLogo} 
              alt="Turbo Answer Robot" 
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-white">Turbo Answer</h1>
              <p className="text-xs text-gray-400">Never Stop Innovating</p>
            </div>
          </div>
          
          {/* Quick Controls */}
          <div className="flex items-center space-x-3">
            {/* AI Model Quick Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 hidden sm:block">AI:</span>
              <Select value={selectedAIModel} onValueChange={setSelectedAIModel}>
                <SelectTrigger className="w-24 h-8 bg-gray-900 border-gray-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="ultimate-fusion">Ultimate</SelectItem>
                  <SelectItem value="conversational">Fast</SelectItem>
                  <SelectItem value="research-pro">Research</SelectItem>
                </SelectContent>
              </Select>
            </div>
            

            
            {/* Settings */}
            <Link href="/ai-settings">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            
            {/* User Menu */}
            {user ? (
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm text-blue-400 hover:text-white">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Quick Action Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${showDocumentUpload ? 'text-blue-400' : 'text-gray-400'} hover:text-white`}
              title="Upload Document"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowCamera(!showCamera)}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${showCamera ? 'text-blue-400' : 'text-gray-400'} hover:text-white`}
              title="Camera"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowLiveCamera(!showLiveCamera)}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${showLiveCamera ? 'text-red-400' : 'text-gray-400'} hover:text-white`}
              title="Live Camera"
            >
              <Globe className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <LanguageSelector 
              currentLanguage={currentLanguage} 
              onLanguageChange={handleLanguageChange} 
            />
          </div>
        </div>
      </div>

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

      {/* Camera Panel */}
      {showCamera && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Camera Analysis</h3>
            <Button
              onClick={() => setShowCamera(false)}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CameraCapture 
            onCapture={handleCameraCapture}
            onAnalysis={handleImageAnalysis}
          />
        </div>
      )}

      {/* Live Camera Feed Panel */}
      {showLiveCamera && (
        <div className="bg-gradient-to-r from-red-950 to-red-900 border-b border-red-800 px-4 py-4 sm:px-6 relative z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Camera className="h-5 w-5 mr-2 text-red-400" />
              Live Camera Feed - Real-time AI Analysis
            </h3>
            <Button
              onClick={() => setShowLiveCamera(false)}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <LiveCameraFeed 
            language={currentLanguage}
            onAnalysisResult={handleLiveCameraAnalysis}
          />
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
                    🚀 Welcome to <strong>TURBO ANSWER</strong> - The Ultimate AI Assistant! I can have natural conversations, understand your emotions, and talk back to you like a real person. Choose "Conversational AI" for natural chat or "Emotional AI" for deep emotional support. Ready to experience ultimate AI power?
                  </p>
                  <div className="mt-3 flex items-center space-x-2 text-xs text-zinc-400">
                    <Brain className="h-3 w-3" />
                    <span>AI Model: {selectedAIModel === 'auto' ? 'Auto-Select (Intelligent Routing)' : selectedAIModel}</span>
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

      {/* Simplified Message Input */}
      <div className="bg-black border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">

            
            {/* Message Input */}
            <div className="w-full relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              
              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Status and Tips */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>AI Ready</span>
              </span>

              <span>Press Enter to send</span>
            </div>
            <span>{messageContent.length}/2000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
