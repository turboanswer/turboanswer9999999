import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, FileText, X, Brain, Settings, LogOut, Zap, Menu, QrCode, ImageIcon, Crown, CheckCircle, Star, Sun, Moon, Shield, Heart, Users, Copy } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ImageGenerator } from "@/components/ImageGenerator";
import LanguageSelector from "@/components/LanguageSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

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
  const [welcomeTier, setWelcomeTier] = useState<'pro' | 'research' | 'enterprise'>('pro');
  const [enterpriseCode, setEnterpriseCode] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isDark = theme === "dark";

  useEffect(() => {
    const savedLanguage = localStorage.getItem('turbo_language');
    if (savedLanguage) setCurrentLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subParam = params.get('subscription');
    const paypalSubId = params.get('subscription_id') || params.get('ba_token');
    if (subParam === 'pro' || subParam === 'research' || subParam === 'enterprise' || subParam === 'success') {
      window.history.replaceState({}, '', '/chat');
      const expectedTier = subParam === 'enterprise' ? 'enterprise' : subParam === 'research' ? 'research' : 'pro';
      const syncSubscription = async () => {
        const trySync = async (attempt: number): Promise<boolean> => {
          try {
            const res = await fetch("/api/sync-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ expectedTier, subscriptionId: paypalSubId }),
              credentials: "include",
            });
            const data = await res.json();
            if (data.tier === 'pro' || data.tier === 'research' || data.tier === 'enterprise') {
              queryClient.invalidateQueries({ queryKey: ["/api/models"] });
              queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
              queryClient.invalidateQueries({ queryKey: ["/api/enterprise-code"] });
              setWelcomeTier(data.tier as 'pro' | 'research' | 'enterprise');
              if (data.enterpriseCode) {
                setEnterpriseCode(data.enterpriseCode);
              }
              setShowWelcomePro(true);
              return true;
            }
          } catch (err) {}
          return false;
        };
        if (await trySync(1)) return;
        await new Promise(r => setTimeout(r, 2000));
        if (await trySync(2)) return;
        await new Promise(r => setTimeout(r, 3000));
        if (await trySync(3)) return;
        setWelcomeTier(expectedTier as 'pro' | 'research' | 'enterprise');
        setShowWelcomePro(true);
        queryClient.invalidateQueries({ queryKey: ["/api/models"] });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/enterprise-code"] });
        if (expectedTier === 'enterprise' && !enterpriseCode) {
          try {
            const codeRes = await fetch("/api/enterprise-code", { credentials: "include" });
            const codeData = await codeRes.json();
            if (codeData.hasCode && codeData.code) {
              setEnterpriseCode(codeData.code);
            }
          } catch (e) {}
        }
      };
      syncSubscription();
    }
  }, []);

  const { data: conversations } = useQuery<Conversation[]>({ queryKey: ["/api/conversations"] });
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: !!currentConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", { title: "New Conversation" });
      return response.json();
    },
    onSuccess: (conversation: Conversation) => {
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to create conversation", variant: "destructive" }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${currentConversationId}/messages`, {
        content, selectedModel: selectedAIModel, language: currentLanguage,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversationId, "messages"] });
      setMessageContent("");
      setIsTyping(false);
    },
    onError: (error: any) => {
      setIsTyping(false);
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!currentConversationId && conversations && conversations.length === 0) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

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
  };

  const handleDocumentAnalysis = (analysis: any) => {
    if (currentConversationId && analysis) {
      sendMessageMutation.mutate(`Document Analysis: ${analysis.filename}\n\nType: ${analysis.analysisType}\n\nResult:\n${analysis.analysis}`);
      setShowDocumentUpload(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('turbo_language', languageCode);
    toast({ title: "Language Changed", description: `Switched to ${languageCode.toUpperCase()}` });
  };

  const renderMessageContent = (content: string, role: string) => {
    const imageRegex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'image'; value: string; alt?: string }> = [];
    let lastIndex = 0;
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
      parts.push({ type: 'image', value: match[2], alt: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
      return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>;
    }
    return (
      <div className="space-y-3">
        {parts.map((part, i) => {
          if (part.type === 'image') {
            return (
              <div key={i} className={`rounded-lg overflow-hidden border ${isDark ? 'border-zinc-600' : 'border-gray-300'}`}>
                <img src={part.value} alt={part.alt || 'Generated image'} className="w-full max-w-md h-auto" />
                <div className={`flex gap-2 p-2 ${isDark ? 'bg-zinc-900/50' : 'bg-gray-100'}`}>
                  <a href={part.value} download={`turbo-image-${Date.now()}.png`} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">Download</a>
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
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({ queryKey: ["/api/subscription-status"] });

  const handleModelChange = (value: string) => {
    const tier = subscriptionData?.tier;
    if (value === 'gemini-pro' && tier !== 'pro' && tier !== 'research' && tier !== 'enterprise') {
      setShowProPopup(true);
    } else if (value === 'claude-research' && tier !== 'research' && tier !== 'enterprise') {
      setShowResearchPopup(true);
    } else if (value === 'enterprise-research' && tier !== 'enterprise') {
      setShowResearchPopup(true);
    } else {
      setSelectedAIModel(value === 'enterprise-research' ? 'claude-research' : value);
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-black/95 border-gray-800' : 'bg-white border-gray-200'} border-b px-3 sm:px-5 py-2.5 relative z-40 shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={turboLogo} alt="TurboAnswer" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover" />
            <div className="min-w-0">
              <h1 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>TurboAnswer</h1>
              <p className={`text-[10px] sm:text-xs hidden sm:block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Think Faster. Build Smarter.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Select value={selectedAIModel} onValueChange={handleModelChange}>
              <SelectTrigger className={`w-24 sm:w-32 h-8 text-[10px] sm:text-xs rounded-lg ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash">Free</SelectItem>
                <SelectItem value="gemini-pro">Pro $6.99</SelectItem>
                <SelectItem value="claude-research">Research $15</SelectItem>
                <SelectItem value="enterprise-research">Enterprise $50</SelectItem>
              </SelectContent>
            </Select>

            <button onClick={toggleTheme} className={`h-8 w-8 flex items-center justify-center rounded-lg ${isDark ? 'text-yellow-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-200'}`} title="Toggle theme">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="hidden sm:flex items-center gap-1">
              <Button onClick={() => setShowQR(!showQR)} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${showQR ? 'text-blue-400' : isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-blue-500`} title="QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
              {user?.isEmployee && (
                <Link href="/employee/dashboard">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" title="Admin Panel">
                    <Shield className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="/crisis-support">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-pink-400 hover:text-pink-300" title="Crisis Support">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/ai-settings">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={() => logout()} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-red-400`} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <button className={`sm:hidden p-1.5 rounded-md ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`} onClick={() => setShowToolbar(!showToolbar)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showToolbar && (
          <div className={`sm:hidden mt-2 pt-2 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} flex items-center justify-between gap-2`}>
            <div className="flex items-center gap-1">
              <Button onClick={() => { setShowDocumentUpload(!showDocumentUpload); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 px-2 text-xs ${showDocumentUpload ? 'text-blue-400' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <FileText className="h-4 w-4 mr-1" /> Docs
              </Button>
              <Button onClick={() => { setShowImageGenerator(!showImageGenerator); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 px-2 text-xs ${showImageGenerator ? 'text-pink-400' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <ImageIcon className="h-4 w-4 mr-1" /> Image
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
              <Button onClick={() => { setShowQR(!showQR); setShowToolbar(false); }} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${showQR ? 'text-blue-400' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <QrCode className="h-4 w-4" />
              </Button>
              {user?.isEmployee && (
                <Link href="/employee/dashboard">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                    <Shield className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="/crisis-support">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-pink-400 hover:text-pink-300" title="Crisis Support">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/ai-settings">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={() => logout()} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-red-400`}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </header>

      {showQR && (
        <div className={`${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'} border-b px-3 sm:px-6 py-4 sm:py-6 relative z-30 shrink-0`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-base sm:text-lg font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" /> Open on Your Phone
            </h3>
            <Button onClick={() => setShowQR(false)} variant="ghost" size="sm" className={isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className={`text-xs sm:text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scan this QR code with your phone camera</p>
            <div className="bg-white p-4 sm:p-5 rounded-xl">
              <QRCodeCanvas value={window.location.href.split('?')[0]} size={200} bgColor="#ffffff" fgColor="#000000" level="H" marginSize={2} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop toolbar */}
      <div className={`hidden sm:block ${isDark ? 'bg-zinc-950/50 border-gray-800' : 'bg-gray-50 border-gray-200'} border-b px-4 py-2 shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowDocumentUpload(!showDocumentUpload)} variant="ghost" size="sm" className={`h-8 px-2 ${showDocumentUpload ? 'text-blue-400' : isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-blue-500`} title="Upload Document">
              <FileText className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowImageGenerator(!showImageGenerator)} variant="ghost" size="sm" className={`h-8 px-2 ${showImageGenerator ? 'text-pink-400' : isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-pink-500`} title="Generate Image">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
          <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={handleLanguageChange} />
        </div>
      </div>

      {showDocumentUpload && (
        <div className={`${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'} border-b px-3 sm:px-6 py-3 sm:py-4 relative z-30 shrink-0`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className={`text-base sm:text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Document Analysis</h3>
            <Button onClick={() => setShowDocumentUpload(false)} variant="ghost" size="sm" className={isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DocumentUpload conversationId={currentConversationId ?? undefined} onAnalysisComplete={handleDocumentAnalysis} />
        </div>
      )}

      {showImageGenerator && (
        <div className={`${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-gray-200'} border-b px-3 sm:px-6 py-3 sm:py-4 relative z-30 shrink-0`}>
          <ImageGenerator
            onImageGenerated={(imageUrl, prompt) => {
              if (currentConversationId) sendMessageMutation.mutate(`Generated Image: "${prompt}"`);
              setShowImageGenerator(false);
            }}
            onClose={() => setShowImageGenerator(false)}
          />
        </div>
      )}

      {/* Chat messages area with floating bubbles */}
      <div className={`flex-1 overflow-y-auto relative z-10 ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
        {/* Floating bubbles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="bubble" />
          <div className="bubble" />
          <div className="bubble" />
          <div className="bubble" />
          <div className="bubble" />
        </div>

        <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto relative z-10">
          {/* Welcome screen */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20">
              <img src={turboLogo} alt="TurboAnswer" className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover mb-5 shadow-lg" />
              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome to TurboAnswer</h2>
              <p className={`text-sm sm:text-base mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Think Faster. Build Smarter.</p>
              <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-200 text-gray-500'}`}>
                <Brain className="h-3 w-3" />
                <span>Model: {selectedAIModel === 'gemini-flash' ? 'Free' : selectedAIModel === 'gemini-pro' ? 'Pro' : selectedAIModel === 'enterprise-research' ? 'Enterprise' : 'Research'}</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id} className={`flex items-end gap-2 sm:gap-3 mb-4 sm:mb-5 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <img src={turboLogo} alt="AI" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" />
              )}

              <div className={`min-w-0 ${message.role === 'user' ? 'max-w-[80%] sm:max-w-lg' : 'max-w-[85%] sm:max-w-2xl'}`}>
                <div className={`px-4 py-3 text-sm sm:text-base leading-relaxed break-words ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                    : isDark
                    ? 'bg-zinc-800/80 text-zinc-100 rounded-2xl rounded-bl-md border border-zinc-700/50'
                    : 'bg-white text-gray-800 rounded-2xl rounded-bl-md border border-gray-200 shadow-sm'
                }`}>
                  {renderMessageContent(message.content, message.role)}
                </div>
                <div className={`text-[10px] mt-1 ${message.role === 'user' ? 'mr-1 text-right' : 'ml-1'} ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-700' : 'bg-gray-300'}`}>
                  <User className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDark ? 'text-zinc-300' : 'text-gray-600'}`} />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-end gap-2 sm:gap-3 mb-4 sm:mb-5">
              <img src={turboLogo} alt="AI" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" />
              <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${isDark ? 'bg-zinc-800/80 border border-zinc-700/50' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-gray-400'}`}>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className={`${isDark ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-t p-3 sm:p-4 shrink-0`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className={`w-full px-4 py-3 pr-12 rounded-2xl text-sm sm:text-base resize-none min-h-[44px] max-h-28 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-white placeholder-gray-500'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-40"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={`flex items-center justify-between mt-1.5 text-[10px] sm:text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <span>Ready</span>
              </span>
              <span className="hidden sm:inline">Press Enter to send</span>
            </div>
            <span>{messageContent.length}/2000</span>
          </div>
        </div>
      </div>

      {/* Pro Upgrade Popup */}
      {showProPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProPopup(false)}>
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-2xl max-w-sm w-full p-6 relative`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowProPopup(false)} className={`absolute top-3 right-3 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="text-white h-7 w-7" />
              </div>
              <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upgrade to Pro</h2>
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Unlock Gemini Pro</p>
            </div>
            <div className="text-center mb-5">
              <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$6.99</span>
              <span className={isDark ? 'text-zinc-400 text-base' : 'text-gray-500 text-base'}>/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              {["Gemini Pro - advanced reasoning", "Priority response speed", "Everything in Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className={`text-sm ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "pro" }),
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch (err: any) { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Star className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Subscribe Now - $6.99/mo"}
            </Button>
            <p className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Cancel anytime. Secure payment via PayPal.</p>
          </div>
        </div>
      )}

      {/* Research Upgrade Popup */}
      {showResearchPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowResearchPopup(false)}>
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-2xl max-w-sm w-full p-6 relative`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowResearchPopup(false)} className={`absolute top-3 right-3 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="text-white h-7 w-7" />
              </div>
              <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upgrade to Research</h2>
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Gemini 2.5 Pro for deep research</p>
            </div>
            <div className="text-center mb-5">
              <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$15</span>
              <span className={isDark ? 'text-zinc-400 text-base' : 'text-gray-500 text-base'}>/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              {["Gemini 2.5 Pro - most powerful model", "Deep research analysis", "Comprehensive, in-depth answers", "Everything in Pro + Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className={`text-sm ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "research" }),
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch (err: any) { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Brain className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Subscribe Now - $15/mo"}
            </Button>
            <p className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Cancel anytime. Secure payment via PayPal.</p>
          </div>
        </div>
      )}

      {/* Welcome screen after subscription */}
      {showWelcomePro && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowWelcomePro(false)}>
          <div className={`${isDark ? 'bg-zinc-900' : 'bg-white'} rounded-2xl p-6 sm:p-8 max-w-md w-full border ${welcomeTier === 'enterprise' ? 'border-amber-500/30 shadow-2xl shadow-amber-500/20' : welcomeTier === 'research' ? 'border-blue-500/30 shadow-2xl shadow-blue-500/20' : 'border-purple-500/30 shadow-2xl shadow-purple-500/20'}`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg ${welcomeTier === 'enterprise' ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/40' : welcomeTier === 'research' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/40' : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/40'}`}>
                {welcomeTier === 'enterprise' ? <Crown className="w-8 h-8 text-white" /> : welcomeTier === 'research' ? <Brain className="w-8 h-8 text-white" /> : <Crown className="w-8 h-8 text-white" />}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {welcomeTier === 'enterprise' ? 'Welcome to Enterprise!' : welcomeTier === 'research' ? 'Welcome to Research!' : 'Welcome to Pro!'}
              </h2>
              <p className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Your subscription is now active</p>
            </div>

            <div className="space-y-4 mb-6">
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${welcomeTier === 'enterprise' ? 'text-amber-400' : welcomeTier === 'research' ? 'text-blue-400' : 'text-purple-400'}`}>What you can do now:</h3>
              {welcomeTier === 'enterprise' ? (
                <>
                  {enterpriseCode && (
                    <div className={`${isDark ? 'bg-amber-950/30 border-amber-800/50' : 'bg-amber-50 border-amber-200'} rounded-xl p-4 border text-center`}>
                      <p className={`text-sm font-medium mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Your Team Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className={`text-3xl font-mono tracking-[0.3em] font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{enterpriseCode}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(enterpriseCode); }}
                          className="text-amber-400 hover:text-amber-300 p-1"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                      <p className={`text-xs mt-2 ${isDark ? 'text-amber-400/60' : 'text-amber-600'}`}>Share this code with up to 5 team members</p>
                    </div>
                  )}
                  <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Users className="w-4 h-4 text-amber-400" /></div>
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Team Access</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Team members enter your code in AI Settings to get Research-level access</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Brain className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Research + Pro Included</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>You get full Research and Pro access with the most powerful AI models</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : welcomeTier === 'research' ? (
                <>
                  <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Brain className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Deep Research</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Select "Research $15" for deep analysis with extended responses</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Zap className="w-4 h-4 text-purple-400" /></div>
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Gemini Pro Included</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>You also get access to Gemini Pro for fast, detailed answers</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Brain className="w-4 h-4 text-purple-400" /></div>
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Gemini Pro Model</p>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Select "Pro $6.99" from the model dropdown for smarter answers</p>
                    </div>
                  </div>
                </div>
              )}
              <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle className="w-4 h-4 text-green-400" /></div>
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{welcomeTier === 'enterprise' ? 'Your Code is Saved' : 'How to Switch Models'}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {welcomeTier === 'enterprise'
                        ? 'Your team code is saved to your account. You can always find it in AI Settings, even after closing the browser.'
                        : 'Tap the model selector at the top to switch between models anytime'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              className={`w-full text-white font-semibold py-5 rounded-xl text-base ${welcomeTier === 'enterprise' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' : welcomeTier === 'research' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'}`}
              onClick={() => { setShowWelcomePro(false); setSelectedAIModel(welcomeTier === 'enterprise' ? "claude-research" : welcomeTier === 'research' ? "claude-research" : "gemini-pro"); }}>
              {welcomeTier === 'enterprise' ? 'Start Using Enterprise' : welcomeTier === 'research' ? 'Start Using Research' : 'Start Using Pro'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
