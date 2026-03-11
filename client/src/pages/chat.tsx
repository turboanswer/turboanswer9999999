import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, FileText, X, Brain, Settings, LogOut, Zap, Menu, QrCode, ImageIcon, Crown, CheckCircle, Star, Sun, Moon, Shield, Heart, Users, Copy, Sparkles, ArrowRight, Rocket, FlaskConical, MessageSquare, Phone, Mail, Clock, Film, Code2, Camera, Scissors } from "lucide-react";
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
import MobileChatUI from "@/components/MobileChatUI";

const isNativeMobile = !!(window as any).Capacitor?.isNativePlatform?.();

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
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  const [showProPopup, setShowProPopup] = useState(false);
  const [showResearchPopup, setShowResearchPopup] = useState(false);
  const [showEnterprisePopup, setShowEnterprisePopup] = useState(false);
  const [entCoupon, setEntCoupon] = useState('');
  const [entCouponApplied, setEntCouponApplied] = useState(false);
  const [showWelcomePro, setShowWelcomePro] = useState(false);
  const [welcomeTier, setWelcomeTier] = useState<'pro' | 'research' | 'enterprise'>('pro');
  const [enterpriseCode, setEnterpriseCode] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);
  const [showAntigravityBanner, setShowAntigravityBanner] = useState(() => localStorage.getItem('ag_banner_dismissed') !== '1');
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [messageCountSinceLastPromo, setMessageCountSinceLastPromo] = useState(0);
  const [lastPromoDismissedAt, setLastPromoDismissedAt] = useState(0);
  const [showBetaFeedback, setShowBetaFeedback] = useState(false);
  const [betaFeedbackMsg, setBetaFeedbackMsg] = useState("");
  const [betaFeedbackCategory, setBetaFeedbackCategory] = useState("general");
  const [betaFeedbackSent, setBetaFeedbackSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timedPromoShown = useRef(false);

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

    let expectedTier: string | null = null;
    let subscriptionId: string | undefined = paypalSubId || undefined;

    if (subParam === 'pro' || subParam === 'research' || subParam === 'enterprise' || subParam === 'success') {
      expectedTier = subParam === 'enterprise' ? 'enterprise' : subParam === 'research' ? 'research' : 'pro';
      window.history.replaceState({}, '', '/chat');
    }

    if (!expectedTier) {
      try {
        const pending = localStorage.getItem('turbo_pending_subscription');
        if (pending) {
          const data = JSON.parse(pending);
          if (Date.now() - data.timestamp < 30 * 60 * 1000) {
            expectedTier = data.tier;
          } else {
            localStorage.removeItem('turbo_pending_subscription');
          }
        }
      } catch (e) {}
    }

    if (!expectedTier) return;

    const syncSubscription = async () => {
      const trySync = async (attempt: number): Promise<boolean> => {
        try {
          const res = await fetch("/api/sync-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expectedTier, subscriptionId }),
            credentials: "include",
          });
          if (res.status === 401) {
            console.log('[PayPal Return] Session lost, saving pending subscription for after login');
            localStorage.setItem('turbo_pending_subscription', JSON.stringify({ tier: expectedTier, subscriptionId, timestamp: Date.now() }));
            return false;
          }
          const data = await res.json();
          if (data.tier === 'pro' || data.tier === 'research' || data.tier === 'enterprise') {
            localStorage.removeItem('turbo_pending_subscription');
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
      localStorage.removeItem('turbo_pending_subscription');
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
    mutationFn: async ({ content, convId }: { content: string; convId: number }) => {
      const response = await apiRequest("POST", `/api/conversations/${convId}/messages`, {
        content, selectedModel: selectedAIModel, language: currentLanguage,
      });
      return response.json();
    },
    onSuccess: (_data, { convId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId, "messages"] });
      setMessageContent("");
      setIsTyping(false);
      if (isFreeTier) {
        setMessageCountSinceLastPromo(prev => prev + 1);
      }
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

  // Returns the current conversation ID, creating one first if needed
  const getOrCreateConversationId = async (): Promise<number | null> => {
    if (currentConversationId) return currentConversationId;
    try {
      const response = await apiRequest("POST", "/api/conversations", { title: "New Conversation" });
      const conversation: Conversation = await response.json();
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      return conversation.id;
    } catch {
      toast({ title: "Error", description: "Could not start a conversation", variant: "destructive" });
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;
    const convId = await getOrCreateConversationId();
    if (!convId) return;
    setIsTyping(true);
    sendMessageMutation.mutate({ content: messageContent.trim(), convId });
  };

  const handleDocumentAnalysis = async (analysis: any) => {
    if (!analysis) return;
    const convId = await getOrCreateConversationId();
    if (!convId) return;
    sendMessageMutation.mutate({
      content: `Document Analysis: ${analysis.filename}\n\nType: ${analysis.analysisType}\n\nResult:\n${analysis.analysis}`,
      convId,
    });
    setShowDocumentUpload(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendWithPromo(); }
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
  const isFreeTier = !subscriptionData?.tier || subscriptionData?.tier === 'free';
  const isAnyPopupOpen = showProPopup || showResearchPopup || showEnterprisePopup || showPromoPopup || showWelcomePro || checkoutLoading;
  const promoCooldownActive = lastPromoDismissedAt > 0 && (Date.now() - lastPromoDismissedAt) < 600000;

  useEffect(() => {
    if (!isFreeTier || timedPromoShown.current || promoCooldownActive) return;
    const timer = setTimeout(() => {
      if (!isAnyPopupOpen) {
        setShowPromoPopup(true);
        timedPromoShown.current = true;
      }
    }, 120000);
    return () => clearTimeout(timer);
  }, [isFreeTier, promoCooldownActive]);

  useEffect(() => {
    if (!isFreeTier || promoCooldownActive || isAnyPopupOpen) return;
    if (messageCountSinceLastPromo >= 5 && messages.length > 0) {
      setShowPromoPopup(true);
      setMessageCountSinceLastPromo(0);
    }
  }, [messageCountSinceLastPromo, isFreeTier, promoCooldownActive]);

  const dismissPromo = () => {
    setShowPromoPopup(false);
    setLastPromoDismissedAt(Date.now());
  };

  const handleSendWithPromo = async () => {
    if (!messageContent.trim() || sendMessageMutation.isPending) return;
    const convId = await getOrCreateConversationId();
    if (!convId) return;
    setIsTyping(true);
    sendMessageMutation.mutate({ content: messageContent.trim(), convId });
  };

  const handleModelChange = (value: string) => {
    const tier = subscriptionData?.tier;
    if (value === 'gemini-pro' && tier !== 'pro' && tier !== 'research' && tier !== 'enterprise') {
      setShowProPopup(true);
    } else if (value === 'claude-research' && tier !== 'research' && tier !== 'enterprise') {
      setShowResearchPopup(true);
    } else if (value === 'enterprise-research' && tier !== 'enterprise') {
      setShowEnterprisePopup(true);
    } else {
      setSelectedAIModel(value === 'enterprise-research' ? 'claude-research' : value);
    }
  };

  if (isNativeMobile) {
    return (
      <MobileChatUI
        messages={messages}
        conversations={conversations}
        currentConversationId={currentConversationId}
        setCurrentConversationId={setCurrentConversationId}
        messageContent={messageContent}
        setMessageContent={setMessageContent}
        isTyping={isTyping}
        handleSend={handleSendWithPromo}
        isSending={sendMessageMutation.isPending}
        user={user}
        logout={logout}
        subscriptionData={subscriptionData}
        selectedAIModel={selectedAIModel}
        handleModelChange={handleModelChange}
        showProPopup={showProPopup}
        setShowProPopup={setShowProPopup}
        showResearchPopup={showResearchPopup}
        setShowResearchPopup={setShowResearchPopup}
        showEnterprisePopup={showEnterprisePopup}
        setShowEnterprisePopup={setShowEnterprisePopup}
        showWelcomePro={showWelcomePro}
        setShowWelcomePro={setShowWelcomePro}
        welcomeTier={welcomeTier}
        setSelectedAIModel={setSelectedAIModel}
        enterpriseCode={enterpriseCode}
        checkoutLoading={checkoutLoading}
        setCheckoutLoading={setCheckoutLoading}
        showPromoPopup={showPromoPopup}
        setShowPromoPopup={setShowPromoPopup}
        dismissPromo={dismissPromo}
        isFreeTier={isFreeTier}
        entCoupon={entCoupon}
        setEntCoupon={setEntCoupon}
        entCouponApplied={entCouponApplied}
        setEntCouponApplied={setEntCouponApplied}
        toast={toast}
        messagesEndRef={messagesEndRef}
        renderMessageContent={renderMessageContent}
        formatTimestamp={formatTimestamp}
      />
    );
  }

  return (
    <div className={`flex flex-col h-[100dvh] ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-black/95 border-gray-800' : 'bg-white border-gray-200'} border-b px-3 sm:px-5 py-2.5 relative z-40 shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer group">
              <img src={turboLogo} alt="TurboAnswer" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover group-hover:opacity-80 transition-opacity" />
              <div className="min-w-0">
                <h1 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'} group-hover:opacity-80 transition-opacity`}>TurboAnswer</h1>
                <p className={`text-[10px] sm:text-xs hidden sm:block ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Think Faster. Build Smarter.</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Select value={selectedAIModel} onValueChange={handleModelChange}>
              <SelectTrigger className={`w-24 sm:w-32 h-8 text-[10px] sm:text-xs rounded-lg ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash">Free</SelectItem>
                <SelectItem value="gemini-pro">Pro $6.99</SelectItem>
                <SelectItem value="claude-research">Research $30</SelectItem>
                <SelectItem value="enterprise-research">Enterprise $100</SelectItem>
              </SelectContent>
            </Select>

            <button onClick={toggleTheme} className={`h-8 w-8 flex items-center justify-center rounded-lg ${isDark ? 'text-yellow-400 hover:bg-zinc-800' : 'text-gray-600 hover:bg-gray-200'}`} title="Toggle theme">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="hidden sm:flex items-center gap-1">
              <Link href="/media-editor">
                <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs ${isDark ? 'text-gray-400 hover:text-pink-400' : 'text-gray-500 hover:text-pink-500'}`} title="Media Editor — CapCut-style photo & video editor">
                  <Scissors className="h-4 w-4 mr-1" /> Edit
                </Button>
              </Link>
              <Link href="/photo-editor">
                <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-500'}`} title="AI Scanner — Scan documents, receipts & photos">
                  <Camera className="h-4 w-4 mr-1" /> Scan
                </Button>
              </Link>
              <Link href="/video-studio">
                <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs ${isDark ? 'text-gray-400 hover:text-violet-400' : 'text-gray-500 hover:text-violet-600'}`} title="Video Studio — Generate AI videos">
                  <Film className="h-4 w-4 mr-1" /> Videos
                </Button>
              </Link>
              {!isNativeMobile && (
              <Link href="/code-studio">
                <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs relative ${isDark ? 'text-gray-400 hover:text-cyan-400' : 'text-gray-500 hover:text-cyan-600'}`} title={user?.codeStudioAddon ? "Code Studio — Build & run apps with AI" : "Code Studio — $15/mo add-on"}>
                  <Code2 className="h-4 w-4 mr-1" /> Code
                  {!user?.codeStudioAddon && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400" />}
                </Button>
              </Link>
              )}
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
              {user?.isBetaTester && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-400 hover:text-green-300" title="Beta Feedback" onClick={() => { setShowBetaFeedback(true); setBetaFeedbackSent(false); setBetaFeedbackMsg(""); }}>
                  <FlaskConical className="h-4 w-4" />
                </Button>
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
              <Link href="/media-editor">
                <Button variant="ghost" size="sm" className={`h-8 px-2 text-xs ${isDark ? 'text-gray-400 hover:text-pink-400' : 'text-gray-500 hover:text-pink-500'}`}>
                  <Scissors className="h-4 w-4 mr-1" /> Edit
                </Button>
              </Link>
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
              <div className="relative">
                <Button onClick={() => setShowSupportPanel(!showSupportPanel)} variant="ghost" size="sm" className={`h-8 w-8 p-0 ${showSupportPanel ? 'text-green-400' : isDark ? 'text-gray-400 hover:text-green-400' : 'text-gray-500 hover:text-green-600'}`} title="Contact Support">
                  <Phone className="h-4 w-4" />
                </Button>
                {showSupportPanel && (
                  <div className={`absolute right-0 top-10 w-72 rounded-2xl border shadow-2xl z-50 p-4 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact Support</h3>
                      <button onClick={() => setShowSupportPanel(false)} className={`${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <a href="mailto:support@turboanswer.it.com" className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'}`}>
                        <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</p>
                          <p className="text-xs text-blue-400">support@turboanswer.it.com</p>
                        </div>
                      </a>
                      <a href="tel:8664677269" className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-50'}`}>
                        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Phone</p>
                          <p className="text-xs text-green-400">866-467-7269</p>
                        </div>
                      </a>
                      <div className={`flex items-center gap-3 p-2.5 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}`}>
                        <div className="w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Hours</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mon–Fri, 9:30am–6pm EST</p>
                        </div>
                      </div>
                    </div>
                    <Link href="/support">
                      <Button size="sm" className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-semibold h-8 rounded-xl">
                        Visit Support Center
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
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

      {/* Code Studio Banner */}
      {showAntigravityBanner && (
        <div className="shrink-0 relative z-30 overflow-hidden" style={{ background: "linear-gradient(90deg, #0d0d2e 0%, #0a0a1e 50%, #0d0a2e 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.3) 0%, rgba(34,211,238,0.2) 50%, rgba(139,92,246,0.2) 100%)" }} />
          <div className="relative flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold shrink-0" style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NEW</span>
              <span className="text-white text-xs sm:text-sm font-semibold truncate">
                Code Studio — build full apps from a single prompt
              </span>
              <span className="hidden md:inline text-xs text-gray-400 truncate">Powered by Claude + Gemini</span>
            </div>
            {!isNativeMobile && (
            <Link href="/code-studio">
              <button className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all" style={{ background: "linear-gradient(135deg, #8b5cf6, #22d3ee)", color: "white" }}>
                Try Code Studio
              </button>
            </Link>
            )}
            <button onClick={() => { setShowAntigravityBanner(false); localStorage.setItem('ag_banner_dismissed', '1'); }}
              className="shrink-0 text-gray-500 hover:text-gray-300 ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Free tier upgrade banner */}
      {isFreeTier && showUpgradeBanner && (
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 px-3 sm:px-5 py-2.5 relative z-30 shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-white flex-shrink-0" />
              <p className="text-white text-xs sm:text-sm font-medium truncate">
                Upgrade to Pro for faster, smarter AI responses
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowProPopup(true)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
              >
                Try Pro <ArrowRight className="h-3 w-3" />
              </button>
              <button onClick={() => setShowUpgradeBanner(false)} className="text-white/70 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
            <Link href="/media-editor">
              <Button variant="ghost" size="sm" className={`h-8 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'} hover:text-pink-500`} title="Media Editor">
                <Scissors className="h-4 w-4" />
              </Button>
            </Link>
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
              if (currentConversationId) sendMessageMutation.mutate({ content: `Generated Image: "${prompt}"`, convId: currentConversationId });
              setShowImageGenerator(false);
            }}
            onClose={() => setShowImageGenerator(false)}
          />
        </div>
      )}

      {/* Chat messages area with space background */}
      <div className={`flex-1 overflow-y-auto relative z-10 ${isDark ? 'bg-[#030014]' : 'bg-gray-50'}`}>
        {/* Space background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isDark ? (
            <>
              <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-600/[0.04] rounded-full blur-[100px]" />
              <div className="absolute top-1/3 right-1/5 w-56 h-56 bg-purple-600/[0.04] rounded-full blur-[80px]" />
              <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-600/[0.03] rounded-full blur-[90px]" />
            </>
          ) : null}
        </div>

        <div className="px-3 sm:px-6 py-4 sm:py-6 max-w-3xl mx-auto relative z-10">
          {/* Welcome screen - Space themed */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 relative">
              {isDark && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]" />
                  <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-purple-600/10 rounded-full blur-[60px]" />
                  <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-pink-600/8 rounded-full blur-[60px]" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`relative mb-6 ${isDark ? '' : ''}`}>
                  <img src={turboLogo} alt="TurboAnswer" className={`w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover ${isDark ? 'shadow-2xl shadow-indigo-500/20' : 'shadow-lg'}`} />
                  {isDark && <div className="absolute -inset-2 rounded-3xl border border-indigo-500/20 animate-pulse" />}
                </div>
                <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome to TurboAnswer</h2>
                <p className={`text-sm sm:text-base mb-6 ${isDark ? 'bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-medium' : 'text-gray-500'}`}>Think Faster. Build Smarter.</p>
                <div className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300' : 'bg-gray-200 text-gray-500'}`}>
                  <Brain className="h-3 w-3" />
                  <span>Model: {selectedAIModel === 'gemini-flash' ? 'Free' : selectedAIModel === 'gemini-pro' ? 'Pro' : selectedAIModel === 'enterprise-research' ? 'Enterprise' : 'Research'}</span>
                </div>
                {isDark && (
                  <div className="flex gap-3 mt-6">
                    {['Ask questions', 'Upload docs', 'Generate images'].map((hint, i) => (
                      <span key={i} className="text-[10px] sm:text-xs px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-indigo-300/50">
                        {hint}
                      </span>
                    ))}
                  </div>
                )}
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

      {/* Input area - Space themed */}
      <div className={`${isDark ? 'bg-[#030014]/90 backdrop-blur-xl border-indigo-500/10' : 'bg-white border-gray-200'} border-t p-3 sm:p-4 shrink-0 relative overflow-hidden`}>
        {isDark && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-16 bg-indigo-600/5 rounded-full blur-[40px]" />
            <div className="absolute top-0 right-1/3 w-48 h-16 bg-purple-600/5 rounded-full blur-[40px]" />
          </div>
        )}
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything across the universe..."
                className={`w-full px-4 py-3 pr-12 rounded-2xl text-sm sm:text-base resize-none min-h-[44px] max-h-28 transition-all duration-300 ${
                  isDark
                    ? 'bg-white/[0.04] border-indigo-500/20 text-white placeholder-indigo-300/30 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 focus:bg-white/[0.06]'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
                rows={1}
              />
              <Button
                onClick={handleSendWithPromo}
                disabled={!messageContent.trim() || sendMessageMutation.isPending}
                className={`absolute right-2 bottom-2 h-8 w-8 p-0 rounded-xl disabled:opacity-40 transition-all duration-300 ${
                  isDark
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={`flex items-center justify-between mt-1.5 text-[10px] sm:text-xs ${isDark ? 'text-indigo-300/30' : 'text-gray-400'}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-green-400'}`} />
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
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Unlock Gemini 3.1 Flash</p>
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$6.99</span>
              <span className={isDark ? 'text-zinc-400 text-base' : 'text-gray-500 text-base'}>/month</span>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>after free trial</p>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "Gemini 3.1 Flash - advanced reasoning", "Priority response speed", "Everything in Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className={`w-4 h-4 flex-shrink-0 ${i === 0 ? 'text-green-400' : 'text-green-400'}`} />
                  <span className={`text-sm ${i === 0 ? 'font-semibold text-green-400' : isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{text}</span>
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
                  if (data.url) {
                    localStorage.setItem('turbo_pending_subscription', JSON.stringify({ tier: 'pro', timestamp: Date.now() }));
                    window.location.href = data.url;
                  }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch (err: any) { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Star className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Start Free Trial"}
            </Button>
            <p className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>7 days free, then $6.99/mo. Cancel anytime.</p>
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
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Claude + Gemini · Maximum Intelligence · AI Video Studio</p>
            </div>
            {/* Google color bar */}
            <div className="flex h-1 rounded-full overflow-hidden mb-4">
              {["#4285F4","#EA4335","#FBBC05","#34A853"].map((c,i) => <div key={i} className="flex-1" style={{background:c}} />)}
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$30</span>
              <span className={isDark ? 'text-zinc-400 text-base' : 'text-gray-500 text-base'}>/month</span>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>after free trial</p>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "🤖 Claude + Gemini — dual AI powerhouse", "🎬 AI Video Studio (Google Veo 3.1)", "💻 Code Studio — build apps with one prompt", "Everything in Pro + Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className={`text-sm ${i === 0 ? 'font-semibold text-green-400' : isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{text}</span>
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
                  if (data.url) {
                    localStorage.setItem('turbo_pending_subscription', JSON.stringify({ tier: 'research', timestamp: Date.now() }));
                    window.location.href = data.url;
                  }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch (err: any) { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Brain className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Start Free Trial"}
            </Button>
            <p className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>7 days free, then $30/mo. Cancel anytime.</p>
          </div>
        </div>
      )}

      {showEnterprisePopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowEnterprisePopup(false)}>
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-2xl max-w-sm w-full p-6 relative`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowEnterprisePopup(false)} className={`absolute top-3 right-3 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="text-white h-7 w-7" />
              </div>
              <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upgrade to Enterprise</h2>
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Claude + Gemini · Research for up to 5 team members</p>
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              {entCouponApplied ? (
                <>
                  <span className={`text-lg line-through ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>$100</span>
                  <span className={`text-4xl font-bold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>$0.99</span>
                  <span className={isDark ? 'text-zinc-400 text-base' : 'text-gray-500 text-base'}>/month</span>
                </>
              ) : (
                <>
                  <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$100</span>
                  <span className={isDark ? 'text-zinc-400 text-base' : 'text-gray-500 text-base'}>/month</span>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>after free trial</p>
                </>
              )}
            </div>
            <div className="mb-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo code"
                  value={entCoupon}
                  onChange={(e) => { setEntCoupon(e.target.value); if (entCouponApplied) { setEntCouponApplied(false); } }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none ${isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border`}
                />
                <button
                  onClick={async () => {
                    if (!entCoupon.trim()) return;
                    try {
                      const res = await fetch("/api/validate-coupon", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ coupon: entCoupon.trim().toUpperCase() }),
                        credentials: "include",
                      });
                      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
                      setEntCouponApplied(true);
                      toast({ title: "Promo Applied!", description: "Enterprise discounted to $0.99/mo" });
                    } catch (err: any) {
                      toast({ title: "Invalid Code", description: err.message || "This promo code is not valid.", variant: "destructive" });
                      setEntCouponApplied(false);
                    }
                  }}
                  disabled={!entCoupon.trim() || entCouponApplied}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${entCouponApplied ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'} ${!entCoupon.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {entCouponApplied ? '✓' : 'Apply'}
                </button>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "🤖 Claude + Gemini — dual AI powerhouse", "🎬 AI Video Studio (Google Veo 3.1)", "All Research features included", "Shareable 6-digit team code (up to 5 members)", "Save 44% vs 5 individual Research plans"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className={`text-sm ${i === 0 ? 'font-semibold text-green-400' : isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const body: any = { plan: "enterprise" };
                  if (entCouponApplied && entCoupon.trim()) body.coupon = entCoupon.trim().toUpperCase();
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (data.url) {
                    localStorage.setItem('turbo_pending_subscription', JSON.stringify({ tier: 'enterprise', timestamp: Date.now() }));
                    window.location.href = data.url;
                  }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch (err: any) { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Crown className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : entCouponApplied ? "Start Free Trial - $0.99/mo after" : "Start Free Trial"}
            </Button>
            <p className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>7 days free, then $100/mo. Cancel anytime.</p>
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-zinc-700' : 'border-gray-200'} text-center`}>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                Need more than 5 members?{' '}
                <a href="mailto:support@turboanswer.it.com?subject=Custom%20Enterprise%20Plan%20Inquiry" className="text-amber-400 hover:text-amber-300 underline">
                  Contact us
                </a>
              </p>
            </div>
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
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Gemini 3.1 Pro Research</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Select "Research $30" to unlock maximum depth on every response</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Zap className="w-4 h-4 text-purple-400" /></div>
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Gemini 3.1 Flash Included</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>You also get access to Gemini 3.1 Flash for fast, detailed answers</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Brain className="w-4 h-4 text-purple-400" /></div>
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Gemini 3.1 Flash Model</p>
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
      {/* Pro Upgrade Promo Popup for Free Users */}
      {showPromoPopup && isFreeTier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={dismissPromo}>
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-2xl max-w-sm w-full p-6 relative overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent pointer-events-none" />
            <button onClick={dismissPromo} className={`absolute top-3 right-3 z-10 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <X className="h-5 w-5" />
            </button>
            <div className="relative text-center mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                <Rocket className="text-white h-8 w-8" />
              </div>
              <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Supercharge Your Experience</h2>
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Unlock Pro for smarter, faster answers</p>
            </div>
            <div className="relative space-y-3 mb-5">
              {[
                { icon: <Zap className="w-4 h-4 text-yellow-400" />, title: "Faster Responses", desc: "Priority speed with Gemini 3.1 Flash" },
                { icon: <Brain className="w-4 h-4 text-purple-400" />, title: "Advanced Reasoning", desc: "More accurate, detailed answers" },
                { icon: <Sparkles className="w-4 h-4 text-pink-400" />, title: "Pro-Level Intelligence", desc: "Access our most powerful free model" },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'}`}>{item.icon}</div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</p>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative text-center mb-4">
              <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$6.99</span>
              <span className={`text-base ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>/month</span>
            </div>
            <Button
              className="relative w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-5 rounded-xl text-base"
              disabled={checkoutLoading}
              onClick={async () => {
                setShowPromoPopup(false);
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan: "pro" }),
                    credentials: "include",
                  });
                  const data = await res.json();
                  if (data.url) {
                    localStorage.setItem('turbo_pending_subscription', JSON.stringify({ tier: 'pro', timestamp: Date.now() }));
                    window.location.href = data.url;
                  } else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Star className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Upgrade to Pro"}
            </Button>
            <button
              onClick={dismissPromo}
              className={`w-full text-center text-xs mt-3 py-1 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Beta Feedback Modal */}
      {showBetaFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-lg">Beta Tester Feedback</h3>
              </div>
              <button onClick={() => setShowBetaFeedback(false)} className={`p-1 rounded-md ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            {betaFeedbackSent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-lg mb-1">Thank you!</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your feedback has been sent to the team.</p>
                <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowBetaFeedback(false)}>Close</Button>
              </div>
            ) : (
              <>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Share your thoughts, bugs, or suggestions as a beta tester. Your feedback goes directly to our team.
                </p>
                <div className="mb-3">
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category</label>
                  <select
                    value={betaFeedbackCategory}
                    onChange={e => setBetaFeedbackCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border text-sm ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="ui">UI/UX Issue</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Your Feedback *</label>
                  <Textarea
                    value={betaFeedbackMsg}
                    onChange={e => setBetaFeedbackMsg(e.target.value)}
                    placeholder="Describe what you experienced, what worked well, or what could be improved…"
                    rows={4}
                    className={`resize-none ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-200'}`}
                  />
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={!betaFeedbackMsg.trim()}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/beta/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ message: betaFeedbackMsg, category: betaFeedbackCategory }),
                      });
                      if (res.ok) setBetaFeedbackSent(true);
                    } catch {}
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Send Feedback
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
