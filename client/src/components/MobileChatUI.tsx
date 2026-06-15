import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cleanMarkdown } from "@/lib/clean-markdown";
import { 
  X, Menu, Camera, Brain, Crown, CheckCircle, Star, Zap, Sparkles, Rocket, 
  Settings, LogOut, Heart, MessageSquare, Copy, Users, Shield, FlaskConical, 
  ClipboardCheck, ArrowUp, Phone, Mail, Clock, ImagePlus, Loader2, Plus, 
  Pencil, Trash2, Check, Stethoscope, Lightbulb, PenSquare, Telescope, Activity, Send
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";
import { useTheme } from "@/hooks/use-theme";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const SUGGESTIONS = [
  { icon: Lightbulb, text: "Explain something", prompt: "Explain quantum computing in simple terms" },
  { icon: PenSquare, text: "Help me write", prompt: "Help me write a professional email" },
  { icon: Telescope, text: "Explore ideas", prompt: "What are some interesting science facts?" },
  { icon: Activity, text: "Health & wellness", prompt: "Give me a quick 10-minute workout plan" },
];

interface Props {
  messages: Message[];
  conversations: Conversation[] | undefined;
  currentConversationId: number | null;
  setCurrentConversationId: (id: number | null) => void;
  messageContent: string;
  setMessageContent: (v: string) => void;
  isTyping: boolean;
  handleSend: () => void;
  isSending: boolean;
  streamingText?: string;
  autoDowngraded?: boolean;
  user: any;
  logout: () => void;
  subscriptionData: { tier: string; status: string } | undefined;
  selectedAIModel: string;
  handleModelChange: (v: string) => void;
  showProPopup: boolean;
  setShowProPopup: (v: boolean) => void;
  showResearchPopup: boolean;
  setShowResearchPopup: (v: boolean) => void;
  showEnterprisePopup: boolean;
  setShowEnterprisePopup: (v: boolean) => void;
  showWelcomePro: boolean;
  setShowWelcomePro: (v: boolean) => void;
  welcomeTier: 'pro' | 'research' | 'enterprise';
  setSelectedAIModel: (v: string) => void;
  enterpriseCode: string | null;
  checkoutLoading: boolean;
  setCheckoutLoading: (v: boolean) => void;
  showPromoPopup: boolean;
  setShowPromoPopup: (v: boolean) => void;
  dismissPromo: () => void;
  isFreeTier: boolean;
  entCoupon: string;
  setEntCoupon: (v: string) => void;
  entCouponApplied: boolean;
  setEntCouponApplied: (v: boolean) => void;
  toast: (opts: any) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  renderMessageContent: (content: string, role: string) => React.ReactNode;
  formatTimestamp: (ts: string | Date) => string;
  showDailyLimitModal: boolean;
  setShowDailyLimitModal: (v: boolean) => void;
  verifiedMessages?: Record<number, "verified" | "unverified" | "unknown">;
}

export default function MobileChatUI({
  messages, conversations, currentConversationId, setCurrentConversationId,
  messageContent, setMessageContent, isTyping, handleSend, isSending, streamingText, autoDowngraded,
  user, logout, subscriptionData, selectedAIModel, handleModelChange,
  showProPopup, setShowProPopup, showResearchPopup, setShowResearchPopup,
  showEnterprisePopup, setShowEnterprisePopup, showWelcomePro, setShowWelcomePro,
  welcomeTier, setSelectedAIModel, enterpriseCode, checkoutLoading, setCheckoutLoading,
  showPromoPopup, setShowPromoPopup, dismissPromo, isFreeTier,
  entCoupon, setEntCoupon, entCouponApplied, setEntCouponApplied,
  toast, messagesEndRef, renderMessageContent, formatTimestamp,
  showDailyLimitModal, setShowDailyLimitModal,
  verifiedMessages = {},
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const getPref = <T,>(key: string, def: T): T => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) as T : def; } catch { return def; }
  };
  const fontSizePref = getPref<"small"|"medium"|"large">("pref_fontSize", "medium");
  const showTimestampsPref = getPref("pref_showTimestamps", true);
  const animationsPref = getPref("pref_animations", true);

  const msgFontSize = fontSizePref === "small" ? "14px" : fontSizePref === "large" ? "18px" : "16px";

  // "Warm paper, clean glass" — warm Claude calm + Gemini spark
  const THEME = {
    bg: isDark ? "#1e1d1a" : "#faf8f3",
    surface: isDark ? "#26241f" : "#fffdf8",
    surfaceHover: isDark ? "#2f2c27" : "#f1ece1",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(60,50,30,0.10)",
    text: isDark ? "#ece8e0" : "#2a2824",
    textMuted: isDark ? "rgba(236,232,224,0.5)" : "rgba(42,40,36,0.5)",
    textDim: isDark ? "rgba(236,232,224,0.72)" : "rgba(42,40,36,0.72)",
    // Gemini spark — reserved for AI moments + primary send
    primaryGradient: isDark
      ? "linear-gradient(135deg, #5b9bff 0%, #9b8cff 50%, #e07ab0 100%)"
      : "linear-gradient(135deg, #4285F4 0%, #7c6cf0 50%, #cf6aa0 100%)",
    aiBubble: "transparent",
    userBubble: isDark ? "rgba(216,119,87,0.16)" : "rgba(201,100,66,0.10)",
    userText: isDark ? "#ece8e0" : "#2a2824",
  };

  const [showDrawer, setShowDrawer] = useState(false);
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [cameraImageFull, setCameraImageFull] = useState<string | null>(null);
  const [cameraQuestion, setCameraQuestion] = useState("");
  const [cameraProcessing, setCameraProcessing] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + "px";
    }
  }, [messageContent]);

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const userTier = ((user as any)?.subscriptionTier || 'free') as string;
  const isResearchOrAbove = userTier === 'research' || userTier === 'enterprise' || (user as any)?.isEmployee === true;

  const newChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { title: "New Chat" });
      return res.json();
    },
    onSuccess: (conv: Conversation) => {
      setCurrentConversationId(conv.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setShowDrawer(false);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${id}`, { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setRenamingId(null);
      setRenameValue("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setDeleteConfirmId(null);
      if (currentConversationId === deletedId) setCurrentConversationId(null);
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCameraSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCameraImage(result.split(",")[1]);
      setCameraImageFull(result);
      setCameraQuestion("");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCameraAnalyze = async () => {
    if (!cameraImageFull) return;
    setCameraProcessing(true);
    try {
      const res = await fetch("/api/camera/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: cameraImageFull, question: cameraQuestion.trim() || undefined }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Could not analyze image", variant: "destructive" });
        return;
      }
      const convId = await (async () => {
        if (currentConversationId) return currentConversationId;
        const r = await apiRequest("POST", "/api/conversations", { title: "Image Scan" });
        const conv = await r.json();
        setCurrentConversationId(conv.id);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        return conv.id;
      })();
      await apiRequest("POST", `/api/conversations/${convId}/messages`, {
        content: cameraQuestion.trim() ? `📷 *Photo scan — "${cameraQuestion.trim()}"*\n\n${data.result}` : `📷 *Photo scan*\n\n${data.result}`,
        selectedModel: selectedAIModel,
        language: "en",
        skipAI: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId, "messages"] });
      setCameraImage(null);
      setCameraImageFull(null);
      setCameraQuestion("");
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setCameraProcessing(false);
    }
  };

  return (
    <div 
      className="flex flex-col w-full" 
      style={{ 
        position: "fixed", inset: 0, 
        backgroundColor: THEME.bg, 
        color: THEME.text,
        overflow: "hidden", 
        overscrollBehavior: "none", 
        touchAction: "pan-y",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraSelect}
      />

      {/* Camera Analyze Modal */}
      {cameraImage && (
        <div className="fixed inset-0 z-[100] flex flex-col backdrop-blur-xl bg-black/90 transition-all duration-300">
          <div className="flex items-center justify-between px-4 py-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
            <button onClick={() => { setCameraImage(null); setCameraImageFull(null); setCameraQuestion(""); }} className="p-2 rounded-full bg-white/10 text-white active:scale-90 transition-transform">
              <X className="h-6 w-6" />
            </button>
            <span className="font-semibold text-white tracking-tight">Scanner</span>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/50">
              <img src={`data:image/jpeg;base64,${cameraImage}`} alt="Captured" className="w-full h-auto object-cover" style={{ maxHeight: "50vh" }} />
            </div>

            <div className="w-full max-w-sm mt-8 space-y-3">
              <p className="text-sm text-white/70 ml-1">Add context (optional)</p>
              <textarea
                value={cameraQuestion}
                onChange={(e) => setCameraQuestion(e.target.value)}
                placeholder="What do you want to know about this?"
                rows={2}
                className="w-full rounded-2xl px-4 py-3.5 text-[15px] resize-none outline-none bg-white/10 text-white placeholder:text-white/40 border border-white/10 focus:border-indigo-500/50 transition-colors shadow-inner"
              />
            </div>
          </div>

          <div className="px-4 py-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <button
              onClick={handleCameraAnalyze}
              disabled={cameraProcessing}
              className="w-full max-w-sm mx-auto py-4 rounded-[1.25rem] font-semibold text-white flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ background: THEME.primaryGradient }}
            >
              {cameraProcessing ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="h-5 w-5" /> Analyze Image</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Drawer */}
      {showDrawer && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300" 
          onClick={() => setShowDrawer(false)} 
        />
      )}

      <div
        className="fixed top-0 left-0 h-full w-[85%] max-w-[320px] z-[60] flex flex-col shadow-2xl transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
        style={{ 
          background: THEME.bg, 
          borderRight: `1px solid ${THEME.border}`, 
          transform: showDrawer ? "translateX(0)" : "translateX(-100%)" 
        }}
      >
        <div className="px-5 pb-5" style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-md"
              style={{ background: THEME.primaryGradient }}>
              {firstName[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[15px] truncate text-foreground">{user?.firstName ? `${user.firstName}` : "My Account"}</p>
              <p className="text-[13px] truncate" style={{ color: THEME.textMuted }}>{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={() => newChatMutation.mutate()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.98] shadow-md"
            style={{ background: THEME.primaryGradient }}
          >
            <Plus className="h-5 w-5" />
            Start New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-2 mt-2" style={{ color: THEME.textMuted }}>Chat History</p>
          {conversations && conversations.length > 0 ? (
            <div className="space-y-1 pb-4">
              {conversations.map((conv) => (
                <div key={conv.id} className="group relative rounded-xl overflow-hidden" 
                     style={{ background: conv.id === currentConversationId ? THEME.surface : "transparent" }}>
                  {renamingId === conv.id ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameValue.trim()) renameMutation.mutate({ id: conv.id, title: renameValue.trim() });
                          if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                        }}
                        className="flex-1 text-[14px] bg-transparent outline-none min-w-0"
                        style={{ color: THEME.text }}
                      />
                      <button onClick={() => { if (renameValue.trim()) renameMutation.mutate({ id: conv.id, title: renameValue.trim() }); }} className="text-indigo-500 p-1">
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setCurrentConversationId(conv.id); setShowDrawer(false); }}
                        className="flex-1 text-left px-3 py-3 text-[14px] flex items-center gap-3 min-w-0 active:bg-black/5"
                        style={{ color: conv.id === currentConversationId ? THEME.text : THEME.textDim }}
                      >
                        <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-50" />
                        <span className="truncate font-medium">{conv.title || "New Chat"}</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setRenamingId(conv.id); setRenameValue(conv.title || ""); }} className="p-2 opacity-60 active:opacity-100" style={{ color: THEME.textDim }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }} className="p-2 mr-1 opacity-60 active:opacity-100 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-center py-6" style={{ color: THEME.textMuted }}>No conversations yet</p>
          )}
        </div>

        <div className="px-4 py-4 border-t space-y-1" style={{ borderColor: THEME.border, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <Link href="/ai-settings">
             <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium active:bg-black/5" style={{ color: THEME.textDim }} onClick={() => setShowDrawer(false)}>
               <Settings className="h-4 w-4" /> Settings
             </button>
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium active:bg-black/5" style={{ color: THEME.textDim }} onClick={() => { setShowDrawer(false); setShowSupportPanel(true); }}>
            <Phone className="h-4 w-4" /> Contact Support
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium active:bg-black/5 text-red-500/80" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>

        {/* Drawer Delete Confirm */}
        {deleteConfirmId !== null && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="rounded-3xl p-5 w-full max-w-[260px] shadow-2xl" style={{ background: THEME.bg, border: `1px solid ${THEME.border}` }}>
              <p className="font-bold text-[16px] mb-2 text-center" style={{ color: THEME.text }}>Delete Chat?</p>
              <p className="text-[13px] mb-5 text-center leading-relaxed" style={{ color: THEME.textDim }}>This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-surface active:bg-surfaceHover transition-colors" style={{ color: THEME.textDim }}>Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleteConfirmId!)} disabled={deleteMutation.isPending} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-red-500 active:bg-red-600 transition-colors shadow-sm">
                  {deleteMutation.isPending ? "..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header — Floating & Clean */}
      <header 
        className="flex items-center justify-between px-3 z-30 shrink-0 backdrop-blur-2xl transition-all" 
        style={{ 
          paddingTop: "max(12px, env(safe-area-inset-top))", 
          paddingBottom: "12px",
          background: isDark ? "rgba(10, 10, 15, 0.85)" : "rgba(255, 255, 255, 0.85)",
          borderBottom: messages.length > 0 ? `1px solid ${THEME.border}` : "1px solid transparent"
        }}
      >
        <button onClick={() => setShowDrawer(true)} className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all bg-surface" aria-label="Menu">
          <Menu className="h-5 w-5" style={{ color: THEME.text }} />
        </button>

        <div className="flex-1 flex justify-center">
          <Select value={selectedAIModel} onValueChange={handleModelChange}>
            <SelectTrigger className="h-9 text-[13px] font-bold tracking-wide rounded-full border border-border/50 px-4 gap-2 bg-surface shadow-sm focus:ring-0 uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50 shadow-xl">
              <SelectItem value="gemini-flash" className="rounded-xl my-1">Matrix AI</SelectItem>
              <SelectItem value="gemini-pro" className="rounded-xl my-1 text-indigo-500 font-semibold">Matrix AI Pro</SelectItem>
              <SelectItem value="claude-research" className="rounded-xl my-1 font-semibold">Matrix AI Research</SelectItem>
              <SelectItem value="enterprise-research" className="rounded-xl my-1 font-semibold">Matrix AI Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button onClick={() => newChatMutation.mutate()} className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all bg-surface" aria-label="New Chat">
          <Plus className="h-5 w-5" style={{ color: THEME.text }} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col h-full px-6 pt-10 pb-6 items-center justify-center animate-in fade-in duration-700">
            <div className="w-20 h-20 mb-8 rounded-3xl bg-surface flex items-center justify-center shadow-lg relative overflow-hidden">
               <div className="absolute inset-0 opacity-20" style={{ background: THEME.primaryGradient }} />
               <img src={turboLogo} alt="Turbo Answer" className="w-10 h-10 object-contain relative z-10" />
            </div>
            
            <h1 className="text-[32px] font-bold text-center leading-tight tracking-tight mb-2" style={{ color: THEME.text }}>
              {getGreeting()}, <br/>
              <span style={{ 
                background: THEME.primaryGradient, 
                WebkitBackgroundClip: "text", 
                WebkitTextFillColor: "transparent" 
              }}>
                {firstName}
              </span>
            </h1>
            <p className="text-[15px] text-center mb-10 max-w-[280px]" style={{ color: THEME.textMuted }}>
              I'm ready to help. What's on your mind?
            </p>

            <div className="grid grid-cols-1 w-full gap-3 max-w-[320px] mt-auto">
              {SUGGESTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setMessageContent(s.prompt)}
                    className="flex items-center gap-4 p-4 rounded-[1.25rem] text-left transition-all active:scale-[0.98] active:opacity-70 bg-surface border border-transparent shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background shrink-0 shadow-sm" style={{ color: THEME.textDim }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: THEME.text }}>{s.text}</p>
                      <p className="text-[12px] truncate max-w-[200px]" style={{ color: THEME.textMuted }}>{s.prompt}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-4 py-6">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex flex-col mb-6 animate-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                     <img src={turboLogo} alt="Turbo" className="w-5 h-5 rounded-full object-cover" />
                     <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: THEME.textMuted }}>Turbo Answer</span>
                  </div>
                )}
                <div 
                  className="max-w-[88%] leading-relaxed break-words shadow-sm" 
                  style={{ 
                    fontSize: msgFontSize, 
                    background: msg.role === "user" ? THEME.userBubble : THEME.aiBubble,
                    color: msg.role === "user" ? THEME.userText : THEME.text,
                    padding: "12px 16px",
                    borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "4px 20px 20px 20px",
                    border: msg.role !== "user" ? `1px solid ${THEME.border}` : "none"
                  }}
                >
                  {renderMessageContent(msg.content, msg.role)}
                </div>
                
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-2 ml-1">
                    {isResearchOrAbove && verifiedMessages[msg.id] && verifiedMessages[msg.id] !== "unknown" && (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border transition-colors ${verifiedMessages[msg.id] === "verified" ? 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'}`}>
                        {verifiedMessages[msg.id] === "verified" ? (
                          <><CheckCircle className="w-3 h-3" /> Verified</>
                        ) : (
                          <><Shield className="w-3 h-3 opacity-70" /> Unverified</>
                        )}
                      </span>
                    )}
                    {showTimestampsPref && (
                      <span className="text-[11px] font-medium" style={{ color: THEME.textMuted }}>
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && streamingText && (
              <div className="flex flex-col mb-6 items-start animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-1.5 ml-1">
                   <img src={turboLogo} alt="Turbo" className="w-5 h-5 rounded-full object-cover" />
                   <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: THEME.textMuted }}>Turbo Answer</span>
                </div>
                <div className="max-w-[88%] leading-relaxed break-words shadow-sm" 
                  style={{ 
                    fontSize: msgFontSize, 
                    background: THEME.aiBubble,
                    color: THEME.text,
                    padding: "12px 16px",
                    borderRadius: "4px 20px 20px 20px",
                    border: `1px solid ${THEME.border}`
                  }}>
                  {autoDowngraded && (
                    <div className="text-[11px] mb-2 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 font-bold uppercase tracking-wide border" style={{ color: '#d97706', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
                      <Zap className="w-3 h-3" /> Auto-routed to fast
                    </div>
                  )}
                  <span className="whitespace-pre-wrap">{cleanMarkdown(streamingText)}</span>
                  <span className="inline-block w-2 h-4 ml-1 align-middle rounded-sm animate-pulse" style={{ background: THEME.primaryGradient }} />
                </div>
              </div>
            )}

            {isTyping && !streamingText && (
              <div className="flex flex-col mb-6 items-start animate-in fade-in">
                 <div className="flex items-center gap-2 mb-1.5 ml-1">
                   <img src={turboLogo} alt="Turbo" className="w-5 h-5 rounded-full object-cover" />
                </div>
                <div className="flex gap-1.5 px-4 py-3 rounded-2xl bg-surface border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-500/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </main>

      {/* Modern Floating Composer */}
      <div className="shrink-0 px-4 pt-2 z-30" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))", background: `linear-gradient(to top, ${THEME.bg} 80%, transparent)` }}>
        
        {showSupportPanel && (
          <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 rounded-[1.5rem] p-5 shadow-2xl animate-in slide-in-from-bottom-2" style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[15px] font-bold" style={{ color: THEME.text }}>Contact Support</p>
              <button onClick={() => setShowSupportPanel(false)} className="p-1.5 rounded-full bg-background active:scale-90 transition-transform"><X className="h-4 w-4" style={{ color: THEME.textDim }} /></button>
            </div>
            <div className="space-y-1">
              <a href="mailto:support@turboanswer.it.com" className="flex items-center gap-3 py-2.5 px-3 rounded-xl active:bg-black/5">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center"><Mail className="h-4 w-4 text-blue-500" /></div>
                <span className="text-[14px] font-medium text-blue-500">support@turboanswer.it.com</span>
              </a>
              <a href="/support" className="flex items-center gap-3 py-2.5 px-3 rounded-xl active:bg-black/5">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center"><MessageSquare className="h-4 w-4 text-indigo-500" /></div>
                <span className="text-[14px] font-medium text-indigo-500">Open a support ticket</span>
              </a>
            </div>
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-surface rounded-[1.75rem] p-1.5 shadow-sm border border-border/50 focus-within:border-indigo-500/30 transition-all duration-300">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-background/50 mb-0.5 ml-0.5"
            style={{ color: THEME.textDim }}
          >
            <Camera className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Turbo Answer..."
            rows={1}
            className="flex-1 bg-transparent text-[15px] resize-none outline-none py-3 placeholder:opacity-50"
            style={{ color: THEME.text, minHeight: "24px", maxHeight: "140px" }}
          />

          <button
            onClick={handleSend}
            disabled={!messageContent.trim() || isSending}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:scale-100 mb-0.5 mr-0.5"
            style={{
              background: messageContent.trim() ? THEME.primaryGradient : THEME.surfaceHover,
              color: messageContent.trim() ? "#FFF" : THEME.textMuted,
              boxShadow: messageContent.trim() ? "0 4px 12px rgba(79, 70, 229, 0.2)" : "none"
            }}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* --- ALL POPUPS (Kept functionally identical but visually tweaked for premium feel) --- */}
      {showProPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-5 animate-in fade-in" onClick={() => setShowProPopup(false)}>
          <div className="bg-surface border border-border rounded-[2rem] max-w-sm w-full p-8 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowProPopup(false)} className="absolute top-4 right-4 p-2 bg-background rounded-full"><X className="h-5 w-5" style={{ color: THEME.textDim }} /></button>
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: THEME.primaryGradient }}>
                <Crown className="text-white h-8 w-8" />
              </div>
              <h2 className="text-[22px] font-bold mb-1" style={{ color: THEME.text }}>Matrix AI Pro</h2>
              <p className="text-[14px]" style={{ color: THEME.textMuted }}>Unlock Advanced Intelligence</p>
            </div>
            <div className="text-center mb-6">
              <span className="text-[40px] font-bold" style={{ color: THEME.text }}>$6.99</span>
              <span className="text-[16px] ml-1" style={{ color: THEME.textMuted }}>/mo</span>
              <div className="inline-flex items-center gap-1.5 mt-2 bg-indigo-500/10 text-indigo-500 text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                7-day free trial
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              {["Advanced reasoning model", "Priority response speed", "Early access to new features"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <span className="text-[14px] font-medium" style={{ color: THEME.text }}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full font-bold py-6 rounded-[1rem] text-[16px] shadow-lg" disabled={checkoutLoading} style={{ background: THEME.primaryGradient, color: '#fff' }}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "pro" }), credentials: "include" });
                  const data = await res.json();
                  if (data.url) { localStorage.setItem("turbo_pending_subscription", JSON.stringify({ tier: "pro", timestamp: Date.now() })); window.location.href = data.url; }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              {checkoutLoading ? "Loading..." : "Start Free Trial"}
            </Button>
          </div>
        </div>
      )}

      {showResearchPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-5 animate-in fade-in" onClick={() => setShowResearchPopup(false)}>
          <div className="bg-surface border border-border rounded-[2rem] max-w-sm w-full p-8 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowResearchPopup(false)} className="absolute top-4 right-4 p-2 bg-background rounded-full"><X className="h-5 w-5" style={{ color: THEME.textDim }} /></button>
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[#c96442] to-[#d97757]">
                <Brain className="text-white h-8 w-8" />
              </div>
              <h2 className="text-[22px] font-bold mb-1" style={{ color: THEME.text }}>Matrix Research</h2>
              <p className="text-[14px]" style={{ color: THEME.textMuted }}>Maximum Intelligence</p>
            </div>
            <div className="text-center mb-6">
              <span className="text-[40px] font-bold" style={{ color: THEME.text }}>$30</span>
              <span className="text-[16px] ml-1" style={{ color: THEME.textMuted }}>/mo</span>
              <div className="inline-flex items-center gap-1.5 mt-2 bg-blue-500/10 text-blue-500 text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                7-day free trial
              </div>
            </div>
            <ul className="space-y-4 mb-8">
              {["Matrix AI Deep Research", "Unlimited image & doc analysis", "Live citations & confidence"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="text-[14px] font-medium" style={{ color: THEME.text }}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full font-bold py-6 rounded-[1rem] text-[16px] shadow-lg bg-[#c96442] hover:bg-[#b5573a] text-white border-0" disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "research" }), credentials: "include" });
                  const data = await res.json();
                  if (data.url) { localStorage.setItem("turbo_pending_subscription", JSON.stringify({ tier: "research", timestamp: Date.now() })); window.location.href = data.url; }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              {checkoutLoading ? "Loading..." : "Start Free Trial"}
            </Button>
          </div>
        </div>
      )}

      {showEnterprisePopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-5 animate-in fade-in" onClick={() => setShowEnterprisePopup(false)}>
          <div className="bg-surface border border-border rounded-[2rem] max-w-sm w-full p-8 relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowEnterprisePopup(false)} className="absolute top-4 right-4 p-2 bg-background rounded-full"><X className="h-5 w-5" style={{ color: THEME.textDim }} /></button>
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-500">
                <Users className="text-white h-8 w-8" />
              </div>
              <h2 className="text-[22px] font-bold mb-1" style={{ color: THEME.text }}>Enterprise</h2>
              <p className="text-[14px]" style={{ color: THEME.textMuted }}>For up to 5 members</p>
            </div>
            
            <div className="text-center mb-6">
              {entCouponApplied ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[20px] line-through" style={{ color: THEME.textMuted }}>$100</span>
                  <div>
                    <span className="text-[40px] font-bold" style={{ color: THEME.text }}>$0.99</span>
                    <span className="text-[16px] ml-1" style={{ color: THEME.textMuted }}>/mo</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-[40px] font-bold" style={{ color: THEME.text }}>$100</span>
                  <span className="text-[16px] ml-1" style={{ color: THEME.textMuted }}>/mo</span>
                </>
              )}
            </div>

            <div className="mb-6 flex gap-2">
              <input type="text" placeholder="Promo code" value={entCoupon}
                onChange={(e) => { setEntCoupon(e.target.value); if (entCouponApplied) setEntCouponApplied(false); }}
                className="flex-1 px-4 py-3 rounded-xl text-[14px] outline-none border transition-colors bg-background"
                style={{ color: THEME.text, borderColor: THEME.border }} />
              <button onClick={async () => {
                if (!entCoupon.trim()) return;
                try {
                  const res = await fetch("/api/validate-coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coupon: entCoupon.trim().toUpperCase() }), credentials: "include" });
                  if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
                  setEntCouponApplied(true);
                  toast({ title: "Promo Applied!", description: "Enterprise discounted to $0.99/mo" });
                } catch (err: any) { toast({ title: "Invalid Code", description: err.message || "This promo code is not valid.", variant: "destructive" }); setEntCouponApplied(false); }
              }} disabled={!entCoupon.trim() || entCouponApplied}
                className={`px-5 py-3 rounded-xl text-[14px] font-bold transition-all ${entCouponApplied ? "bg-amber-500 text-white" : "bg-surfaceHover"}`}
                style={{ color: entCouponApplied ? '#FFF' : THEME.text }}>
                {entCouponApplied ? "✓" : "Apply"}
              </button>
            </div>

            <Button className="w-full font-bold py-6 rounded-[1rem] text-[16px] shadow-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0" disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "enterprise", coupon: entCouponApplied ? entCoupon.trim().toUpperCase() : undefined }), credentials: "include" });
                  const data = await res.json();
                  if (data.url) { localStorage.setItem("turbo_pending_subscription", JSON.stringify({ tier: "enterprise", timestamp: Date.now() })); window.location.href = data.url; }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              {checkoutLoading ? "Loading..." : "Start Trial"}
            </Button>
          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomePro && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border border-border animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg"
                 style={{ background: welcomeTier === 'enterprise' ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : welcomeTier === 'research' ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' : THEME.primaryGradient }}>
              <Crown className="text-white h-10 w-10" />
            </div>
            <h2 className="text-[26px] font-bold mb-3" style={{ color: THEME.text }}>
              Welcome to {welcomeTier === 'enterprise' ? 'Matrix AI Enterprise' : welcomeTier === 'research' ? 'Matrix AI Research' : 'Matrix AI Pro'}!
            </h2>
            <p className="text-[15px] mb-8 leading-relaxed" style={{ color: THEME.textDim }}>
              Your account has been upgraded. You now have access to our most advanced AI models and premium features.
            </p>
            {enterpriseCode && (
               <div className="mb-8 p-5 rounded-[1.25rem] border" style={{ background: THEME.bg, borderColor: THEME.border }}>
                  <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: THEME.textMuted }}>Your Team Code</p>
                  <div className="text-[32px] font-mono tracking-widest font-bold" style={{ color: THEME.text }}>{enterpriseCode}</div>
               </div>
            )}
            <Button onClick={() => { setShowWelcomePro(false); setSelectedAIModel(welcomeTier === "enterprise" ? "claude-research" : welcomeTier === "research" ? "claude-research" : "gemini-pro"); }} className="w-full py-6 rounded-[1rem] font-bold text-[16px] shadow-md" style={{ background: THEME.text, color: THEME.bg }}>
              Start Chatting
            </Button>
          </div>
        </div>
      )}

      {/* Daily Limit Modal */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border border-border animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-5">
              <Zap className="text-red-500 h-8 w-8" />
            </div>
            <h2 className="text-[22px] font-bold mb-3" style={{ color: THEME.text }}>Daily Limit Reached</h2>
            <p className="text-[15px] mb-8 leading-relaxed" style={{ color: THEME.textDim }}>
              You've reached your free message limit for today. Upgrade to Pro for unlimited access and advanced reasoning.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => { setShowDailyLimitModal(false); setShowProPopup(true); }} className="w-full py-6 rounded-[1rem] font-bold text-[16px]" style={{ background: THEME.primaryGradient, color: '#fff' }}>
                Upgrade to Pro
              </Button>
              <Button onClick={() => setShowDailyLimitModal(false)} variant="ghost" className="w-full py-6 rounded-[1rem] font-bold text-[16px]" style={{ color: THEME.textDim }}>
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Promo / Upgrade Modal */}
      {showPromoPopup && isFreeTier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={dismissPromo}>
          <div className="bg-surface rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border border-border animate-in zoom-in-95 duration-300 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={dismissPromo} className="absolute top-4 right-4 p-1.5 rounded-full active:scale-90 transition-transform" style={{ color: THEME.textMuted }}><X className="h-5 w-5" /></button>
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg" style={{ background: THEME.primaryGradient }}>
              <Rocket className="text-white h-10 w-10" />
            </div>
            <h2 className="text-[26px] font-bold mb-2" style={{ color: THEME.text }}>Supercharge Your Experience</h2>
            <p className="text-[15px] mb-6 leading-relaxed" style={{ color: THEME.textDim }}>Unlock Matrix AI Pro for smarter, faster answers and advanced reasoning.</p>
            <div className="mb-8">
              <span className="text-[40px] font-bold" style={{ color: THEME.text }}>$6.99</span>
              <span className="text-[16px]" style={{ color: THEME.textMuted }}>/month</span>
            </div>
            <Button disabled={checkoutLoading} className="w-full py-6 rounded-[1rem] font-bold text-[16px] shadow-md" style={{ background: THEME.primaryGradient, color: '#fff' }}
              onClick={async () => {
                setShowPromoPopup(false); setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "pro" }), credentials: "include" });
                  const data = await res.json();
                  if (data.url) { localStorage.setItem("turbo_pending_subscription", JSON.stringify({ tier: "pro", timestamp: Date.now() })); window.location.href = data.url; }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch { toast({ title: "Error", description: "Could not start checkout.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              {checkoutLoading ? "Loading..." : "Upgrade to Pro"}
            </Button>
            <button onClick={dismissPromo} className="w-full text-center text-[13px] mt-4" style={{ color: THEME.textMuted }}>Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}
