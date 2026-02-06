import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, FileText, X, Brain, Settings, LogOut, Zap, Menu, QrCode, ImageIcon, Crown, CheckCircle, Star } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ImageGenerator } from "@/components/ImageGenerator";

import LanguageSelector from "@/components/LanguageSelector";


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";

export default function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("gemini-flash");
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [showToolbar, setShowToolbar] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const [showProPopup, setShowProPopup] = useState(false);
  const [showResearchPopup, setShowResearchPopup] = useState(false);
  const [showWelcomePro, setShowWelcomePro] = useState(false);
  const [welcomeTier, setWelcomeTier] = useState<'pro' | 'research'>('pro');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
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
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subParam = params.get('subscription');
    if (subParam === 'pro' || subParam === 'research' || subParam === 'success') {
      const expectedTier = subParam === 'research' ? 'research' : 'pro';
      window.history.replaceState({}, '', '/chat');
      const syncSubscription = async () => {
        const trySync = async (): Promise<boolean> => {
          try {
            const res = await apiRequest("GET", "/api/subscription-status");
            const data = await res.json();
            if (data.tier === 'pro' || data.tier === 'research') {
              queryClient.invalidateQueries({ queryKey: ["/api/models"] });
              queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
              setWelcomeTier(data.tier as 'pro' | 'research');
              setShowWelcomePro(true);
              return true;
            }
          } catch (err) {
            console.error('Subscription sync error:', err);
          }
          return false;
        };

        if (await trySync()) return;
        await new Promise(r => setTimeout(r, 3000));
        if (await trySync()) return;
        await new Promise(r => setTimeout(r, 5000));
        if (await trySync()) return;
        toast({ title: "Processing", description: "Your payment is being processed. Access will activate shortly. Please refresh the page in a moment." });
      };
      syncSubscription();
    }
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

  const renderMessageContent = (content: string, role: string) => {
    const imageRegex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'image'; value: string; alt?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'image', value: match[2], alt: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.slice(lastIndex) });
    }

    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
      return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>;
    }

    return (
      <div className="space-y-3">
        {parts.map((part, i) => {
          if (part.type === 'image') {
            return (
              <div key={i} className="rounded-lg overflow-hidden border border-zinc-600">
                <img src={part.value} alt={part.alt || 'Generated image'} className="w-full max-w-md h-auto" />
                <div className="flex gap-2 p-2 bg-zinc-900/50">
                  <a
                    href={part.value}
                    download={`turbo-image-${Date.now()}.png`}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Download
                  </a>
                </div>
              </div>
            );
          }
          return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.value}</span>;
        })}
      </div>
    );
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

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({
    queryKey: ["/api/subscription-status"],
  });

  const handleModelChange = (value: string) => {
    const tier = subscriptionData?.tier;
    if (value === 'gemini-pro' && tier !== 'pro' && tier !== 'research') {
      setShowProPopup(true);
    } else if (value === 'claude-research' && tier !== 'research') {
      setShowResearchPopup(true);
    } else {
      setSelectedAIModel(value);
    }
  };

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
            <Select value={selectedAIModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-20 sm:w-28 h-7 sm:h-8 bg-gray-900 border-gray-700 text-[10px] sm:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash">Free</SelectItem>
                <SelectItem value="gemini-pro">Pro $6.99</SelectItem>
                <SelectItem value="claude-research">Research $15</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden sm:flex items-center gap-1">
              <Button onClick={() => setShowQR(!showQR)} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${showQR ? 'text-blue-400' : 'text-gray-400'} hover:text-white`} title="QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
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
              <Button onClick={() => { setShowImageGenerator(!showImageGenerator); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 px-2 text-xs ${showImageGenerator ? 'text-pink-400' : 'text-gray-400'}`}>
                <ImageIcon className="h-4 w-4 mr-1" /> Image
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
              <Button onClick={() => { setShowQR(!showQR); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${showQR ? 'text-blue-400' : 'text-gray-400'}`}>
                <QrCode className="h-4 w-4" />
              </Button>
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

      {showQR && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-4 sm:py-6 relative z-30 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              Open on Your Phone
            </h3>
            <Button onClick={() => setShowQR(false)} variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs sm:text-sm text-gray-400 text-center">Scan this QR code with your phone camera to open Turbo Answer</p>
            <div className="bg-white p-4 sm:p-5 rounded-xl">
              <QRCodeCanvas
                value={window.location.href.split('?')[0]}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                marginSize={2}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 break-all max-w-xs text-center">{window.location.href.split('?')[0]}</p>
          </div>
        </div>
      )}

      <div className="hidden sm:block bg-gray-900/50 border-b border-gray-800 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowDocumentUpload(!showDocumentUpload)} variant="ghost" size="sm" className={`h-8 px-2 ${showDocumentUpload ? 'text-blue-400' : 'text-gray-400'} hover:text-white`} title="Upload Document">
              <FileText className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowImageGenerator(!showImageGenerator)} variant="ghost" size="sm" className={`h-8 px-2 ${showImageGenerator ? 'text-pink-400' : 'text-gray-400'} hover:text-white`} title="Generate Image">
              <ImageIcon className="h-4 w-4" />
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

      {showImageGenerator && (
        <div className="bg-zinc-950 border-b border-zinc-800 px-3 sm:px-6 py-3 sm:py-4 relative z-30 shrink-0">
          <ImageGenerator
            onImageGenerated={(imageUrl, prompt) => {
              if (currentConversationId) {
                sendMessageMutation.mutate(`🎨 **Generated Image**: "${prompt}"`);
              }
              setShowImageGenerator(false);
            }}
            onClose={() => setShowImageGenerator(false)}
          />
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
                    <span>Model: {selectedAIModel === 'gemini-flash' ? 'Free' : selectedAIModel === 'gemini-pro' ? 'Pro' : selectedAIModel === 'claude-research' ? 'Research' : selectedAIModel}</span>
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
                  <div className={`text-sm sm:text-base leading-relaxed break-words ${message.role === 'user' ? 'text-white' : 'text-zinc-100'}`}>
                    {renderMessageContent(message.content, message.role)}
                  </div>
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

      {showProPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowProPopup(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowProPopup(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="text-white h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Upgrade to Pro</h2>
              <p className="text-zinc-400 text-sm">Unlock Gemini 2.5 Pro</p>
            </div>

            <div className="text-center mb-5">
              <span className="text-4xl font-bold text-white">$6.99</span>
              <span className="text-zinc-400 text-base">/month</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Gemini 2.5 Pro - advanced reasoning</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Priority response speed</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Everything in Free included</span>
              </li>
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-5 rounded-xl text-base"
              disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const response = await apiRequest("POST", "/api/checkout", { plan: "pro" });
                  const data = await response.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                  }
                } catch (err: any) {
                  toast({ title: "Error", description: err.message || "Checkout failed", variant: "destructive" });
                } finally {
                  setCheckoutLoading(false);
                }
              }}
            >
              <Star className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Subscribe Now - $6.99/mo"}
            </Button>

            <p className="text-center text-zinc-500 text-xs mt-3">Cancel anytime. Secure payment via Stripe.</p>
          </div>
        </div>
      )}

      {showResearchPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowResearchPopup(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowResearchPopup(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="text-white h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Upgrade to Research</h2>
              <p className="text-zinc-400 text-sm">Gemini 2.5 Pro for deep research</p>
            </div>

            <div className="text-center mb-5">
              <span className="text-4xl font-bold text-white">$15</span>
              <span className="text-zinc-400 text-base">/month</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Gemini 2.5 Pro - most powerful model</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Deep research analysis</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Comprehensive, in-depth answers</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-zinc-200 text-sm">Everything in Pro + Free included</span>
              </li>
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-5 rounded-xl text-base"
              disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const response = await apiRequest("POST", "/api/checkout", { plan: "research" });
                  const data = await response.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                  }
                } catch (err: any) {
                  toast({ title: "Error", description: err.message || "Checkout failed", variant: "destructive" });
                } finally {
                  setCheckoutLoading(false);
                }
              }}
            >
              <Brain className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Subscribe Now - $15/mo"}
            </Button>

            <p className="text-center text-zinc-500 text-xs mt-3">Cancel anytime. Secure payment via Stripe.</p>
          </div>
        </div>
      )}

      {showWelcomePro && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowWelcomePro(false)}>
          <div className={`bg-zinc-900 rounded-2xl p-6 sm:p-8 max-w-md w-full border ${welcomeTier === 'research' ? 'border-blue-500/30 shadow-2xl shadow-blue-500/20' : 'border-purple-500/30 shadow-2xl shadow-purple-500/20'}`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg ${welcomeTier === 'research' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/40' : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/40'}`}>
                {welcomeTier === 'research' ? <Brain className="w-8 h-8 text-white" /> : <Crown className="w-8 h-8 text-white" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{welcomeTier === 'research' ? 'Welcome to Research!' : 'Welcome to Pro!'}</h2>
              <p className="text-zinc-400">Your subscription is now active</p>
            </div>

            <div className="space-y-4 mb-6">
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${welcomeTier === 'research' ? 'text-blue-400' : 'text-purple-400'}`}>What you can do now:</h3>

              {welcomeTier === 'research' ? (
                <>
                  <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Deep Research</p>
                        <p className="text-zinc-400 text-xs mt-0.5">Select "Research $15" for deep analysis with extended responses</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Gemini Pro Included</p>
                        <p className="text-zinc-400 text-xs mt-0.5">You also get access to Gemini 2.5 Pro for fast, detailed answers</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Gemini Pro Model</p>
                        <p className="text-zinc-400 text-xs mt-0.5">Select "Pro $6.99" from the model dropdown for smarter, more detailed answers</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">How to Switch Models</p>
                    <p className="text-zinc-400 text-xs mt-0.5">Tap the model selector at the top of your chat to switch between models anytime</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              className={`w-full text-white font-semibold py-5 rounded-xl text-base ${welcomeTier === 'research' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'}`}
              onClick={() => {
                setShowWelcomePro(false);
                setSelectedAIModel(welcomeTier === 'research' ? "claude-research" : "gemini-pro");
              }}
            >
              {welcomeTier === 'research' ? 'Start Using Research' : 'Start Using Pro'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
