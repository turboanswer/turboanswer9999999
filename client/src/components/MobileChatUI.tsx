import { useState, useRef, useEffect, type CSSProperties } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cleanMarkdown } from "@/lib/clean-markdown";
import { X, Menu, Camera, Brain, Crown, CheckCircle, Star, Zap, Sparkles, Rocket, Settings, LogOut, Heart, MessageSquare, Copy, Users, Shield, FlaskConical, ClipboardCheck, ArrowUp, Film, Phone, Mail, Clock, ImagePlus, Loader2, Plus, Pencil, Trash2, Check, Stethoscope } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";
import { useTheme } from "@/hooks/use-theme";

const DARK_BG = "#08080F";
const DARK_CARD = "#111118";
const DARK_INPUT = "#16171F";

const CARD_STYLES = [
  { border: "1px solid rgba(66,133,244,0.35)", bg: "linear-gradient(135deg, rgba(66,133,244,0.08) 0%, #111118 100%)", dot: "#4285F4" },
  { border: "1px solid rgba(139,92,246,0.35)", bg: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, #111118 100%)", dot: "#8B5CF6" },
  { border: "1px solid rgba(20,184,166,0.35)", bg: "linear-gradient(135deg, rgba(20,184,166,0.08) 0%, #111118 100%)", dot: "#14B8A6" },
  { border: "1px solid rgba(251,146,60,0.35)", bg: "linear-gradient(135deg, rgba(251,146,60,0.08) 0%, #111118 100%)", dot: "#FB923C" },
];
const CARD_STYLES_LIGHT = [
  { border: "1px solid rgba(66,133,244,0.3)", bg: "linear-gradient(135deg, rgba(66,133,244,0.07) 0%, #F8FBFF 100%)", dot: "#4285F4" },
  { border: "1px solid rgba(139,92,246,0.3)", bg: "linear-gradient(135deg, rgba(139,92,246,0.07) 0%, #FAF8FF 100%)", dot: "#8B5CF6" },
  { border: "1px solid rgba(20,184,166,0.3)", bg: "linear-gradient(135deg, rgba(20,184,166,0.07) 0%, #F8FFFD 100%)", dot: "#14B8A6" },
  { border: "1px solid rgba(251,146,60,0.3)", bg: "linear-gradient(135deg, rgba(251,146,60,0.07) 0%, #FFFAF5 100%)", dot: "#FB923C" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const SUGGESTIONS = [
  { icon: "💡", text: "Explain something complex", prompt: "Explain quantum computing in simple terms" },
  { icon: "✍️", text: "Help me write", prompt: "Help me write a professional email" },
  { icon: "🔭", text: "Explore ideas", prompt: "What are some interesting science facts?" },
  { icon: "💪", text: "Health & wellness", prompt: "Give me a quick 10-minute workout plan" },
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
  const chatDensityPref = getPref<"compact"|"comfortable"|"spacious">("pref_chatDensity", "comfortable");
  const bubbleStylePref = getPref<"bubbles"|"flat"|"minimal">("pref_bubbleStyle", "bubbles");
  const showTimestampsPref = getPref("pref_showTimestamps", true);
  const animationsPref = getPref("pref_animations", true);

  const msgFontSize = fontSizePref === "small" ? "11px" : fontSizePref === "large" ? "16px" : "14px";
  const msgSpacing = chatDensityPref === "compact" ? "12px" : chatDensityPref === "spacious" ? "24px" : "20px";
  const getUserBubbleStyle = (): CSSProperties => {
    // Gemini-style: soft neutral pill, not heavy blue. Color is theme-driven.
    if (bubbleStylePref === "flat") return { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: TEXT_MAIN, borderRadius: "10px", padding: "10px 14px" };
    if (bubbleStylePref === "minimal") return { background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_MAIN, borderRadius: "16px", padding: "8px 14px" };
    return { background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", color: TEXT_MAIN, borderRadius: "20px 20px 6px 20px", padding: "10px 16px" };
  };
  const getAIBubbleStyle = (): CSSProperties => {
    if (bubbleStylePref === "flat") return { background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 14px" };
    if (bubbleStylePref === "minimal") return { background: "transparent", padding: "4px 0" };
    return { background: "transparent", padding: "0" };
  };
  const GEMINI_BG = isDark ? DARK_BG : "#F8F9FC";
  const CARD_BG = isDark ? DARK_CARD : "#FFFFFF";
  const INPUT_BG = isDark ? DARK_INPUT : "#F0F1F8";
  const DRAWER_BG = isDark ? "#12131A" : "#FFFFFF";
  const BORDER = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const TEXT_MUTED = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const TEXT_DIM = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)";
  const TEXT_MAIN = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)";
  const TEXT_TS = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)";
  const ACTIVE_CARD_STYLES = isDark ? CARD_STYLES : CARD_STYLES_LIGHT;

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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [messageContent]);

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const tierLabel = selectedAIModel === "gemini-flash" ? "Free" : selectedAIModel === "gemini-pro" ? "Pro" : selectedAIModel === "enterprise-research" ? "Enterprise" : "Research";
  // Deep Think + confidence/verified badges are RESEARCH-EXCLUSIVE.
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
    <div className="flex flex-col" style={{ position: "fixed", inset: 0, background: GEMINI_BG, overflow: "hidden", overscrollBehavior: "none", touchAction: "pan-y", color: TEXT_MAIN }}>

      {/* Hidden camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraSelect}
      />

      {/* Camera analyze modal */}
      {cameraImage && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: isDark ? "#0D0D14" : "#FFFFFF", borderBottom: `1px solid ${BORDER}` }}>
            <button onClick={() => { setCameraImage(null); setCameraImageFull(null); setCameraQuestion(""); }} style={{ color: TEXT_DIM }}>
              <X className="h-5 w-5" />
            </button>
            <span className="font-semibold text-sm" style={{ color: TEXT_MAIN }}>AI Scanner</span>
            <div className="w-8" />
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="relative w-full" style={{ background: "#000" }}>
              <img src={`data:image/jpeg;base64,${cameraImage}`} alt="Captured" className="w-full object-contain" style={{ maxHeight: "55vh" }} />
            </div>

            <div className="px-4 pt-4 pb-2">
              <p className="text-xs mb-2" style={{ color: TEXT_DIM }}>Ask something specific (optional)</p>
              <textarea
                value={cameraQuestion}
                onChange={(e) => setCameraQuestion(e.target.value)}
                placeholder="e.g. What does this say? How much is the total? Translate this..."
                rows={2}
                className="w-full rounded-2xl px-3 py-2.5 text-sm resize-none outline-none"
                style={{ background: INPUT_BG, border: "1px solid rgba(66,133,244,0.2)", color: TEXT_MAIN, minHeight: "64px" }}
              />
            </div>
          </div>

          <div className="px-4 py-3" style={{ background: isDark ? "#0D0D14" : "#FFFFFF", borderTop: `1px solid ${BORDER}`, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <button
              onClick={handleCameraAnalyze}
              disabled={cameraProcessing}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #4285F4, #34A853)", boxShadow: "0 4px 20px rgba(66,133,244,0.3)" }}
            >
              {cameraProcessing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Camera className="h-4 w-4" /> Analyze with AI</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Drawer backdrop */}
      {showDrawer && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
      )}

      {/* Left drawer */}
      <div
        className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{ background: DRAWER_BG, borderRight: `1px solid ${BORDER}`, transform: showDrawer ? "translateX(0)" : "translateX(-100%)" }}
      >
        {/* Drawer header */}
        <div className="px-4 pt-12 pb-4 border-b" style={{ borderColor: BORDER, background: "linear-gradient(180deg, rgba(66,133,244,0.06) 0%, transparent 100%)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4285F4, #8B5CF6)", boxShadow: "0 4px 12px rgba(66,133,244,0.4)" }}>
              {firstName[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: TEXT_MAIN }}>{user?.firstName ? `${user.firstName}` : "My Account"}</p>
              <p className="text-xs truncate" style={{ color: TEXT_MUTED }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* New chat button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => newChatMutation.mutate()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #4285F4, #8B5CF6)", boxShadow: "0 4px 15px rgba(66,133,244,0.3)" }}
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {conversations && conversations.length > 0 ? (
            <>
              <p className="text-xs font-medium px-2 mb-2" style={{ color: TEXT_MUTED }}>Recent</p>
              {conversations.slice(0, 20).map((conv) => (
                <div key={conv.id} className="group relative rounded-xl mb-0.5" style={{ background: conv.id === currentConversationId ? "rgba(66,133,244,0.12)" : "transparent" }}>
                  {renamingId === conv.id ? (
                    <div className="flex items-center gap-1.5 px-3 py-2">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameValue.trim()) renameMutation.mutate({ id: conv.id, title: renameValue.trim() });
                          if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                        }}
                        className="flex-1 text-sm rounded-lg px-2 py-1 outline-none min-w-0"
                        style={{ background: INPUT_BG, color: TEXT_MAIN, border: `1px solid rgba(66,133,244,0.4)` }}
                      />
                      <button
                        onClick={() => { if (renameValue.trim()) renameMutation.mutate({ id: conv.id, title: renameValue.trim() }); }}
                        className="flex-shrink-0 p-1 rounded-lg text-blue-400 hover:text-blue-300"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { setRenamingId(null); setRenameValue(""); }}
                        className="flex-shrink-0 p-1 rounded-lg"
                        style={{ color: TEXT_MUTED }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setCurrentConversationId(conv.id); setShowDrawer(false); }}
                        className="flex-1 text-left px-3 py-2.5 text-sm flex items-center gap-2 min-w-0"
                        style={{ color: conv.id === currentConversationId ? (isDark ? "white" : "#1a1a2e") : TEXT_DIM }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                        <span className="truncate">{conv.title || "New Chat"}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingId(conv.id); setRenameValue(conv.title || ""); }}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-opacity"
                        style={{ color: TEXT_MUTED, opacity: 0.6 }}
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-opacity mr-1"
                        style={{ color: "rgba(239,68,68,0.6)" }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-xs text-center py-4" style={{ color: TEXT_MUTED }}>No conversations yet</p>
          )}
        </div>

        {/* Delete confirmation dialog */}
        {deleteConfirmId !== null && (
          <div className="absolute inset-0 z-60 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="rounded-2xl p-5 w-full max-w-xs" style={{ background: DRAWER_BG, border: `1px solid ${BORDER}` }}>
              <p className="font-semibold text-sm mb-1" style={{ color: TEXT_MAIN }}>Delete conversation?</p>
              <p className="text-xs mb-4" style={{ color: TEXT_MUTED }}>Are you really sure you want to delete this? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ background: INPUT_BG, color: TEXT_DIM }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirmId!)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drawer footer */}
        <div className="px-3 pb-8 border-t pt-3 space-y-1" style={{ borderColor: BORDER }}>
          <Link href="/crisis-support">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)}>
              <Heart className="h-4 w-4 text-pink-400" /> Crisis Support
            </button>
          </Link>
          <Link href="/photo-editor">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)}>
              <Camera className="h-4 w-4 text-pink-400" /> Photo Studio
            </button>
          </Link>
          <Link href="/video-studio">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)}>
              <Film className="h-4 w-4 text-violet-400" /> Video Studio
            </button>
          </Link>
          <Link href="/stack-trace-surgeon">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)} data-testid="link-stack-trace-surgeon-mobile">
              <Stethoscope className="h-4 w-4 text-purple-400" /> Stack Trace Surgeon <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>RESEARCH</span>
            </button>
          </Link>
          {user?.isEmployee && (
            <Link href="/employee/dashboard">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)}>
                <Shield className="h-4 w-4 text-red-400" /> Admin Panel
              </button>
            </Link>
          )}
          {user?.isBetaTester && (
            <Link href="/beta-feedback">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)} data-testid="link-beta-feedback-mobile">
                <ClipboardCheck className="h-4 w-4 text-blue-400" /> Beta Feedback
              </button>
            </Link>
          )}
          <Link href="/ai-settings">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)}>
              <Settings className="h-4 w-4 opacity-60" /> Settings
            </button>
          </Link>
          <button onClick={() => logout()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }}>
            <LogOut className="h-4 w-4 opacity-60" /> Sign out
          </button>
        </div>
      </div>

      {/* Header — minimal Gemini-style: no gradient overlay, no border, generous touch targets */}
      <header className="flex items-center justify-between px-3 shrink-0" style={{ paddingTop: "max(10px, env(safe-area-inset-top))", paddingBottom: "8px" }}>
        <button onClick={() => setShowDrawer(true)} className="w-10 h-10 flex items-center justify-center rounded-full transition-colors active:bg-white/5" aria-label="Menu">
          <Menu className="h-5 w-5" style={{ color: TEXT_MAIN }} />
        </button>

        <Select value={selectedAIModel} onValueChange={handleModelChange}>
          <SelectTrigger className="h-9 text-[14px] font-medium rounded-full border-0 px-3.5 gap-1.5 focus:ring-0" style={{ background: "transparent", color: TEXT_MAIN }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-flash">Free</SelectItem>
            <SelectItem value="gemini-pro">Pro</SelectItem>
            <SelectItem value="claude-research">Research</SelectItem>
            <SelectItem value="enterprise-research">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4285F4, #9B72F2)" }}
          aria-label="Account"
        >
          {firstName[0]?.toUpperCase() || "U"}
        </div>
      </header>

      {/* Main messages / welcome area */}
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isTyping ? (
          /* Gemini-style welcome — generous whitespace, big light gradient greeting, monochrome suggestions */
          <div className="flex flex-col h-full px-6 pt-12 pb-4">
            {/* Big greeting in soft 4-color gradient — light weight, lots of air */}
            <h1
              className="text-[44px] font-light leading-[1.05] tracking-tight"
              style={{
                background: "linear-gradient(90deg, #4285F4 0%, #9B72F2 35%, #D96570 65%, #F2B95E 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {getGreeting()},
            </h1>
            <h2
              className="text-[44px] font-light leading-[1.05] tracking-tight mb-2"
              style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)" }}
            >
              {firstName}.
            </h2>

            {/* Push suggestions to the bottom of the welcome area */}
            <div className="flex-1" />

            {/* Minimal monochrome suggestion chips — Gemini-style */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setMessageContent(s.prompt)}
                  className="rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
                  style={{
                    background: "transparent",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div className="text-base mb-1.5 opacity-80">{s.icon}</div>
                  <p className="text-[13px] leading-snug" style={{ color: TEXT_DIM }}>{s.text}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="px-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ marginBottom: msgSpacing, transition: animationsPref ? "all 0.15s" : "none" }}
              >
                {msg.role === "assistant" && (
                  <img src={turboLogo} alt="Turbo" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                )}
                <div className="max-w-[82%]">
                  {msg.role === "user" ? (
                    <div className="leading-relaxed break-words" style={{ fontSize: msgFontSize, ...getUserBubbleStyle() }}>
                      {renderMessageContent(msg.content, msg.role)}
                    </div>
                  ) : (
                    <div className="leading-relaxed break-words" style={{ fontSize: msgFontSize, color: TEXT_MAIN, ...getAIBubbleStyle() }}>
                      {renderMessageContent(msg.content, msg.role)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {isResearchOrAbove && msg.role === 'assistant' && verifiedMessages[msg.id] && verifiedMessages[msg.id] !== "unknown" && (
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors ${verifiedMessages[msg.id] === "verified" ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                        {verifiedMessages[msg.id] === "verified" ? (
                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.15"/><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Verified</>
                        ) : (
                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.6"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> Unverified</>
                        )}
                      </span>
                    )}
                    {showTimestampsPref && (
                      <span className="text-[10px]" style={{ color: TEXT_TS }}>
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Live streaming assistant bubble (token-by-token) */}
            {isTyping && streamingText ? (
              <div className="flex gap-3 justify-start mb-3">
                <img src={turboLogo} alt="Turbo" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                <div className="max-w-[82%]">
                  {autoDowngraded && (
                    <div className="text-[10px] mb-1 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-semibold border" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
                      ⚡ Auto-routed to fast — toggle Deep Think for verified deep reasoning
                    </div>
                  )}
                  <div className="leading-relaxed break-words whitespace-pre-wrap" style={{ fontSize: msgFontSize, color: TEXT_MAIN, ...getAIBubbleStyle() }}>
                    {cleanMarkdown(streamingText)}
                    <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-blue-500 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : isTyping && (
              /* Gemini-style thinking state — clean shimmer line + dot, no rainbow circus */
              <div className="flex gap-3 justify-start">
                <img src={turboLogo} alt="Turbo" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                <div className="flex items-center gap-2 pt-2">
                  <style>{`
                    @keyframes turbo-pulse { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
                    @keyframes turbo-shimmer-line {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                  `}</style>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
                      animation: animationsPref ? 'turbo-pulse 1.4s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span
                    className="text-[13px] font-normal"
                    style={{
                      background: animationsPref
                        ? `linear-gradient(90deg, ${TEXT_MUTED} 0%, ${TEXT_MAIN} 50%, ${TEXT_MUTED} 100%)`
                        : 'none',
                      backgroundSize: '200% 100%',
                      WebkitBackgroundClip: animationsPref ? 'text' : 'unset',
                      backgroundClip: animationsPref ? 'text' : 'unset',
                      WebkitTextFillColor: animationsPref ? 'transparent' : 'inherit',
                      color: animationsPref ? undefined : TEXT_MUTED,
                      animation: animationsPref ? 'turbo-shimmer-line 2.2s linear infinite' : 'none',
                    }}
                  >
                    Thinking
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Bottom input bar */}
      <div className="shrink-0 px-3 pt-1" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {/* Support contact - compact */}
        <div className="relative">
          {showSupportPanel && (
            <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl p-4 z-30" style={{ background: isDark ? "#1C1D26" : "#FFFFFF", border: `1px solid ${BORDER}`, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: TEXT_MAIN }}>Contact Support</p>
                <button onClick={() => setShowSupportPanel(false)} style={{ color: TEXT_MUTED }}><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2">
                <a href="mailto:support@turboanswer.it.com" className="flex items-center gap-3 py-2">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400">support@turboanswer.it.com</span>
                </a>
                <a href="tel:8664677269" className="flex items-center gap-3 py-2">
                  <Phone className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400">866-467-7269</span>
                </a>
                <div className="flex items-center gap-3 py-2">
                  <Clock className="h-4 w-4" style={{ color: TEXT_MUTED }} />
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>Mon–Fri, 9:30am–6pm EST</span>
                </div>
              </div>
            </div>
          )}

          {/* Input bar — Gemini-style pill: rounded-full, neutral border, monochrome send */}
          <div
            className="flex items-end gap-2 pl-4 pr-2 py-2 rounded-full"
            style={{
              background: INPUT_BG,
              border: `1px solid ${BORDER}`,
            }}
          >
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-shrink-0 mb-1 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 -ml-2"
              style={{ color: TEXT_DIM }}
              title="Take a photo"
              aria-label="Camera"
            >
              <Camera className="h-[18px] w-[18px]" />
            </button>

            <textarea
              ref={textareaRef}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Turbo Answer"
              rows={1}
              className="flex-1 bg-transparent text-[15px] resize-none outline-none py-2 placeholder:opacity-60"
              style={{ color: TEXT_MAIN, minHeight: "24px", maxHeight: "120px" }}
            />

            <button
              onClick={handleSend}
              disabled={!messageContent.trim() || isSending}
              className="flex-shrink-0 mb-0.5 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
              style={{
                background: messageContent.trim()
                  ? (isDark ? "#fff" : "#0b0b0d")
                  : "transparent",
                color: messageContent.trim()
                  ? (isDark ? "#0b0b0d" : "#fff")
                  : TEXT_DIM,
              }}
              aria-label="Send"
            >
              <ArrowUp className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== ALL SUBSCRIPTION MODALS (identical to web) ===== */}

      {/* Pro Upgrade Popup */}
      {showProPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProPopup(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowProPopup(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"><Crown className="text-white h-7 w-7" /></div>
              <h2 className="text-xl font-bold mb-1 text-white">Upgrade to Pro</h2>
              <p className="text-zinc-400 text-sm">Unlock Advanced AI</p>
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              <span className="text-4xl font-bold text-white">$6.99</span>
              <span className="text-zinc-400 text-base">/month</span>
              <p className="text-xs mt-1 text-zinc-500">after free trial</p>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "Advanced AI model — deeper reasoning", "Priority response speed", "Everything in Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-blue-400" />
                  <span className={`text-sm ${i === 0 ? "font-semibold text-blue-400" : "text-zinc-200"}`}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
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
              <Star className="w-4 h-4 mr-2" />{checkoutLoading ? "Loading..." : "Start Free Trial"}
            </Button>
            <p className="text-center text-xs mt-3 text-zinc-500">7 days free, then $6.99/mo. Cancel anytime.</p>
          </div>
        </div>
      )}

      {/* Research Upgrade Popup */}
      {showResearchPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowResearchPopup(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowResearchPopup(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4"><Brain className="text-white h-7 w-7" /></div>
              <h2 className="text-xl font-bold mb-1 text-white">Upgrade to Research</h2>
              <p className="text-zinc-400 text-sm">Matrix AI Research · Maximum Intelligence · Video Studio</p>
            </div>
            <div className="flex h-1 rounded-full overflow-hidden mb-4">
              {["#4285F4","#EA4335","#FBBC05","#34A853"].map((c,i) => <div key={i} className="flex-1" style={{background:c}} />)}
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              <span className="text-4xl font-bold text-white">$30</span>
              <span className="text-zinc-400 text-base">/month</span>
              <p className="text-xs mt-1 text-zinc-500">after free trial</p>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "🧠 Matrix AI Deep Research — 20+ sources per question", "🎬 AI Video Studio (Google Veo 3.1)", "🖼️ Unlimited AI image generation", "📄 Unlimited document & PDF analysis", "⚡ Always-on maximum reasoning depth", "🔗 Live citations & confidence scores", "💾 Export answers to PDF / Word / Markdown", "Everything in Pro + Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className={`text-sm ${i === 0 ? "font-semibold text-blue-400" : "text-zinc-200"}`}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
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
              <Brain className="w-4 h-4 mr-2" />{checkoutLoading ? "Loading..." : "Start Free Trial"}
            </Button>
            <p className="text-center text-xs mt-3 text-zinc-500">7 days free, then $30/mo. Cancel anytime.</p>
          </div>
        </div>
      )}

      {/* Enterprise Upgrade Popup */}
      {showEnterprisePopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowEnterprisePopup(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowEnterprisePopup(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"><Crown className="text-white h-7 w-7" /></div>
              <h2 className="text-xl font-bold mb-1 text-white">Upgrade to Enterprise</h2>
              <p className="text-zinc-400 text-sm">Matrix AI Research · For up to 5 team members</p>
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              {entCouponApplied ? (
                <><span className="text-lg line-through text-zinc-500">$100</span><span className="text-4xl font-bold ml-2 text-white">$0.99</span><span className="text-zinc-400 text-base">/month</span></>
              ) : (
                <><span className="text-4xl font-bold text-white">$100</span><span className="text-zinc-400 text-base">/month</span><p className="text-xs mt-1 text-zinc-500">after free trial</p></>
              )}
            </div>
            <div className="mb-5 flex gap-2">
              <input type="text" placeholder="Promo code" value={entCoupon}
                onChange={(e) => { setEntCoupon(e.target.value); if (entCouponApplied) setEntCouponApplied(false); }}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none bg-zinc-800 border border-zinc-600 text-white" />
              <button onClick={async () => {
                if (!entCoupon.trim()) return;
                try {
                  const res = await fetch("/api/validate-coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coupon: entCoupon.trim().toUpperCase() }), credentials: "include" });
                  if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
                  setEntCouponApplied(true);
                  toast({ title: "Promo Applied!", description: "Enterprise discounted to $0.99/mo" });
                } catch (err: any) { toast({ title: "Invalid Code", description: err.message || "This promo code is not valid.", variant: "destructive" }); setEntCouponApplied(false); }
              }} disabled={!entCoupon.trim() || entCouponApplied}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${entCouponApplied ? "bg-blue-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"} ${!entCoupon.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                {entCouponApplied ? "✓" : "Apply"}
              </button>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "🧠 Matrix AI Research — cited & verified answers", "🎬 AI Video Studio", "All Research features included", "Shareable 6-digit team code (up to 5 members)", "Save 44% vs 5 individual Research plans"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className={`text-sm ${i === 0 ? "font-semibold text-blue-400" : "text-zinc-200"}`}>{text}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
              onClick={async () => {
                setCheckoutLoading(true);
                try {
                  const body: any = { plan: "enterprise" };
                  if (entCouponApplied && entCoupon.trim()) body.coupon = entCoupon.trim().toUpperCase();
                  const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
                  const data = await res.json();
                  if (data.url) { localStorage.setItem("turbo_pending_subscription", JSON.stringify({ tier: "enterprise", timestamp: Date.now() })); window.location.href = data.url; }
                  else toast({ title: "Error", description: data.error || "Could not start checkout", variant: "destructive" });
                } catch { toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" }); }
                finally { setCheckoutLoading(false); }
              }}>
              <Crown className="w-4 h-4 mr-2" />{checkoutLoading ? "Loading..." : entCouponApplied ? "Start Free Trial - $0.99/mo after" : "Start Free Trial"}
            </Button>
            <p className="text-center text-xs mt-3 text-zinc-500">7 days free, then $100/mo. Cancel anytime.</p>
            <div className="mt-4 pt-4 border-t border-zinc-700 text-center">
              <p className="text-xs text-zinc-500">Need more than 5 members? <a href="mailto:support@turboanswer.it.com?subject=Custom%20Enterprise%20Plan%20Inquiry" className="text-amber-400 hover:text-amber-300 underline">Contact us</a></p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome after subscription */}
      {showWelcomePro && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowWelcomePro(false)}>
          <div className={`bg-zinc-900 rounded-2xl p-6 max-w-md w-full border ${welcomeTier === "enterprise" ? "border-amber-500/30" : welcomeTier === "research" ? "border-blue-500/30" : "border-purple-500/30"}`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${welcomeTier === "enterprise" ? "bg-gradient-to-br from-amber-500 to-orange-500" : welcomeTier === "research" ? "bg-gradient-to-br from-blue-500 to-cyan-500" : "bg-gradient-to-br from-purple-500 to-pink-500"}`}>
                {welcomeTier === "research" ? <Brain className="w-8 h-8 text-white" /> : <Crown className="w-8 h-8 text-white" />}
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">{welcomeTier === "enterprise" ? "Welcome to Enterprise!" : welcomeTier === "research" ? "Welcome to Research!" : "Welcome to Pro!"}</h2>
              <p className="text-zinc-400">Your subscription is now active</p>
            </div>
            {welcomeTier === "enterprise" && enterpriseCode && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm font-medium mb-2 text-amber-300">Your Team Code</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-mono tracking-[0.3em] font-bold text-white">{enterpriseCode}</span>
                  <button onClick={() => navigator.clipboard.writeText(enterpriseCode)} className="text-amber-400 hover:text-amber-300 p-1"><Copy className="w-5 h-5" /></button>
                </div>
                <p className="text-xs mt-2 text-amber-400/60">Share this code with up to 5 team members</p>
              </div>
            )}
            <Button
              className={`w-full text-white font-semibold py-5 rounded-xl text-base ${welcomeTier === "enterprise" ? "bg-gradient-to-r from-amber-600 to-orange-600" : welcomeTier === "research" ? "bg-gradient-to-r from-blue-600 to-cyan-600" : "bg-gradient-to-r from-purple-600 to-pink-600"}`}
              onClick={() => { setShowWelcomePro(false); setSelectedAIModel(welcomeTier === "enterprise" ? "claude-research" : welcomeTier === "research" ? "claude-research" : "gemini-pro"); }}>
              {welcomeTier === "enterprise" ? "Start Using Enterprise" : welcomeTier === "research" ? "Start Using Research" : "Start Using Pro"}
            </Button>
          </div>
        </div>
      )}

      {/* Promo popup for free users */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDailyLimitModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent pointer-events-none" />
            <button onClick={() => setShowDailyLimitModal(false)} className="absolute top-3 right-3 z-10 text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="relative text-center mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                <Zap className="text-white h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold mb-1 text-white">Daily Limit Reached</h2>
              <p className="text-zinc-400 text-sm">You've used all 25 free questions for today</p>
            </div>
            <div className="relative space-y-3 mb-5">
              <div className="p-4 rounded-xl text-center bg-zinc-800/50">
                <p className="text-sm text-zinc-300">
                  Your free questions reset at <strong>midnight</strong> in your time zone. Or upgrade to Pro for <strong>unlimited questions</strong> every day.
                </p>
              </div>
              {[
                { icon: <Sparkles className="w-4 h-4 text-yellow-400" />, title: "Unlimited Questions", desc: "No daily caps — ask as much as you want" },
                { icon: <Brain className="w-4 h-4 text-purple-400" />, title: "Matrix AI", desc: "A new era of intelligence" },
                { icon: <Zap className="w-4 h-4 text-cyan-400" />, title: "Priority Speed", desc: "Faster responses, always" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-700">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative text-center mb-4">
              <span className="text-3xl font-bold text-white">$6.99</span>
              <span className="text-base text-zinc-400">/month</span>
            </div>
            <Button
              className="relative w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-5 rounded-xl text-base"
              disabled={checkoutLoading}
              onClick={async () => {
                setShowDailyLimitModal(false);
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
              <Crown className="w-4 h-4 mr-2" />
              {checkoutLoading ? "Loading..." : "Upgrade to Pro — Unlimited"}
            </Button>
            <button
              onClick={() => setShowDailyLimitModal(false)}
              className="w-full text-center text-xs mt-3 py-1 text-zinc-500 hover:text-zinc-300"
            >
              I'll wait until tomorrow
            </button>
          </div>
        </div>
      )}

      {showPromoPopup && isFreeTier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={dismissPromo}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent pointer-events-none" />
            <button onClick={dismissPromo} className="absolute top-3 right-3 z-10 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            <div className="relative text-center mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25"><Rocket className="text-white h-8 w-8" /></div>
              <h2 className="text-xl font-bold mb-1 text-white">Supercharge Your Experience</h2>
              <p className="text-zinc-400 text-sm">Unlock Pro for smarter, faster answers</p>
            </div>
            <div className="relative text-center mb-4">
              <span className="text-3xl font-bold text-white">$6.99</span>
              <span className="text-base text-zinc-400">/month</span>
            </div>
            <Button className="relative w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-5 rounded-xl text-base" disabled={checkoutLoading}
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
            <button onClick={dismissPromo} className="w-full text-center text-xs mt-3 text-zinc-500 hover:text-zinc-400">Maybe later</button>
          </div>
        </div>
      )}

    </div>
  );
}
