import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { X, Menu, Plus, Mic, Send, Brain, Crown, CheckCircle, Star, Zap, Sparkles, Rocket, Settings, LogOut, Heart, MessageSquare, Copy, Users, Shield, FlaskConical, ChevronRight, ArrowUp, Camera, Film, Phone, Mail, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Conversation, Message } from "@shared/schema";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

const GEMINI_BG = "#08080F";
const CARD_BG = "#111118";
const INPUT_BG = "#16171F";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
const TEXT_DIM = "rgba(255,255,255,0.75)";

const CARD_STYLES = [
  { border: "1px solid rgba(66,133,244,0.35)", bg: "linear-gradient(135deg, rgba(66,133,244,0.08) 0%, #111118 100%)", dot: "#4285F4" },
  { border: "1px solid rgba(139,92,246,0.35)", bg: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, #111118 100%)", dot: "#8B5CF6" },
  { border: "1px solid rgba(20,184,166,0.35)", bg: "linear-gradient(135deg, rgba(20,184,166,0.08) 0%, #111118 100%)", dot: "#14B8A6" },
  { border: "1px solid rgba(251,146,60,0.35)", bg: "linear-gradient(135deg, rgba(251,146,60,0.08) 0%, #111118 100%)", dot: "#FB923C" },
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
}

export default function MobileChatUI({
  messages, conversations, currentConversationId, setCurrentConversationId,
  messageContent, setMessageContent, isTyping, handleSend, isSending,
  user, logout, subscriptionData, selectedAIModel, handleModelChange,
  showProPopup, setShowProPopup, showResearchPopup, setShowResearchPopup,
  showEnterprisePopup, setShowEnterprisePopup, showWelcomePro, setShowWelcomePro,
  welcomeTier, setSelectedAIModel, enterpriseCode, checkoutLoading, setCheckoutLoading,
  showPromoPopup, setShowPromoPopup, dismissPromo, isFreeTier,
  entCoupon, setEntCoupon, entCouponApplied, setEntCouponApplied,
  toast, messagesEndRef, renderMessageContent, formatTimestamp,
}: Props) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col" style={{ position: "fixed", inset: 0, background: GEMINI_BG, overflow: "hidden" }}>

      {/* Drawer backdrop */}
      {showDrawer && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
      )}

      {/* Left drawer */}
      <div
        className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out"
        style={{ background: "#12131A", borderRight: `1px solid ${BORDER}`, transform: showDrawer ? "translateX(0)" : "translateX(-100%)" }}
      >
        {/* Drawer header */}
        <div className="px-4 pt-12 pb-4 border-b" style={{ borderColor: BORDER, background: "linear-gradient(180deg, rgba(66,133,244,0.06) 0%, transparent 100%)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4285F4, #8B5CF6)", boxShadow: "0 4px 12px rgba(66,133,244,0.4)" }}>
              {firstName[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.firstName ? `${user.firstName}` : "My Account"}</p>
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
                <button
                  key={conv.id}
                  onClick={() => { setCurrentConversationId(conv.id); setShowDrawer(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
                  style={{
                    color: conv.id === currentConversationId ? "white" : TEXT_DIM,
                    background: conv.id === currentConversationId ? "rgba(66,133,244,0.12)" : "transparent",
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                  <span className="truncate">{conv.title || "New Chat"}</span>
                </button>
              ))}
            </>
          ) : (
            <p className="text-xs text-center py-4" style={{ color: TEXT_MUTED }}>No conversations yet</p>
          )}
        </div>

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
          {user?.isEmployee && (
            <Link href="/employee/dashboard">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }} onClick={() => setShowDrawer(false)}>
                <Shield className="h-4 w-4 text-red-400" /> Admin Panel
              </button>
            </Link>
          )}
          {user?.isBetaTester && (
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors" style={{ color: TEXT_DIM }}>
              <FlaskConical className="h-4 w-4 text-green-400" /> Beta Feedback
            </button>
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

      {/* Header */}
      <header className="flex items-center justify-between px-3 shrink-0" style={{ paddingTop: "max(10px, env(safe-area-inset-top))", paddingBottom: "8px", borderBottom: "1px solid rgba(66,133,244,0.1)", background: "linear-gradient(180deg, rgba(66,133,244,0.05) 0%, transparent 100%)" }}>
        <button onClick={() => setShowDrawer(true)} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
          <Menu className="h-4 w-4 text-white/70" />
        </button>

        <div className="flex items-center gap-1.5">
          <img src={turboLogo} alt="Turbo" className="w-5 h-5 rounded-md object-cover" />
          <span className="text-white font-semibold text-sm tracking-tight">TurboAnswer</span>
        </div>

        <div className="flex items-center gap-1">
          <Select value={selectedAIModel} onValueChange={handleModelChange}>
            <SelectTrigger className="h-7 text-[10px] rounded-full border-0 px-2.5" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_DIM, minWidth: "60px" }}>
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4285F4, #8B5CF6)" }}
          >
            {firstName[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      {/* Main messages / welcome area */}
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isTyping ? (
          /* Welcome screen */
          <div className="flex flex-col items-center px-4 pt-5 pb-2 relative">
            {/* Background glow orbs */}
            <div className="absolute top-0 left-1/4 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(66,133,244,0.07) 0%, transparent 70%)" }} />
            <div className="absolute top-12 right-1/4 w-36 h-36 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)" }} />

            {/* Big logo with ring glow */}
            <div className="relative mb-3 z-10">
              <div className="absolute -inset-2 rounded-[28px]" style={{ background: "linear-gradient(135deg, rgba(66,133,244,0.3), rgba(139,92,246,0.3))", filter: "blur(12px)" }} />
              <img src={turboLogo} alt="TurboAnswer" className="relative w-24 h-24 rounded-3xl object-cover" style={{ boxShadow: "0 8px 32px rgba(66,133,244,0.3)" }} />
            </div>

            <h1 className="text-2xl font-bold text-center mb-1 leading-tight z-10" style={{
              background: "linear-gradient(135deg, #4285F4 0%, #EA4335 35%, #FBBC05 65%, #34A853 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-sm mb-4 text-center z-10" style={{ color: TEXT_MUTED }}>How can I help you today?</p>

            {/* Colorful suggestion grid */}
            <div className="grid grid-cols-2 gap-2.5 w-full z-10">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setMessageContent(s.prompt)}
                  className="rounded-2xl p-3 text-left transition-all active:scale-95"
                  style={{ background: CARD_STYLES[i].bg, border: CARD_STYLES[i].border }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CARD_STYLES[i].dot }} />
                    <span className="text-base">{s.icon}</span>
                  </div>
                  <p className="text-xs font-medium leading-snug" style={{ color: TEXT_DIM }}>{s.text}</p>
                </button>
              ))}
            </div>

            {/* Tier badge */}
            <div className="mt-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.2)", color: "#7BA7F7" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {tierLabel} · Ready
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="px-4 py-4 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <img src={turboLogo} alt="Turbo" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                )}
                <div className={`max-w-[82%] ${msg.role === "user" ? "" : ""}`}>
                  {msg.role === "user" ? (
                    <div className="px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed break-words text-white" style={{ background: "#2563EB" }}>
                      {renderMessageContent(msg.content, msg.role)}
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed break-words" style={{ color: "rgba(255,255,255,0.87)" }}>
                      {renderMessageContent(msg.content, msg.role)}
                    </div>
                  )}
                  <p className="text-[10px] mt-1 px-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <img src={turboLogo} alt="Turbo" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl" style={{ background: CARD_BG }}>
                  {[0, 150, 300].map((delay) => (
                    <div key={delay} className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${delay}ms` }} />
                  ))}
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
            <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl p-4 z-30" style={{ background: "#1C1D26", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">Contact Support</p>
                <button onClick={() => setShowSupportPanel(false)} style={{ color: TEXT_MUTED }}><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2">
                <a href="mailto:support@turboanswer.it.com" className="flex items-center gap-3 py-2">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-blue-400">support@turboanswer.it.com</span>
                </a>
                <a href="tel:8664677269" className="flex items-center gap-3 py-2">
                  <Phone className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-400">866-467-7269</span>
                </a>
                <div className="flex items-center gap-3 py-2">
                  <Clock className="h-4 w-4" style={{ color: TEXT_MUTED }} />
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>Mon–Fri, 9:30am–6pm EST</span>
                </div>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-end gap-2 px-3 py-2.5 rounded-3xl" style={{ background: INPUT_BG, border: "1px solid rgba(66,133,244,0.2)", boxShadow: "0 0 20px rgba(66,133,244,0.05)" }}>
            <button className="flex-shrink-0 mb-0.5 p-1 rounded-full transition-colors" style={{ color: TEXT_MUTED }}>
              <Plus className="h-5 w-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Turbo..."
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none py-0.5"
              style={{ color: "rgba(255,255,255,0.9)", minHeight: "22px", maxHeight: "112px" }}
            />

            {messageContent.trim() ? (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex-shrink-0 mb-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #4285F4, #8B5CF6)", boxShadow: "0 4px 12px rgba(66,133,244,0.4)" }}
              >
                <ArrowUp className="h-4 w-4 text-white" />
              </button>
            ) : (
              <button className="flex-shrink-0 mb-0.5 p-1 rounded-full transition-colors" style={{ color: TEXT_MUTED }}>
                <Mic className="h-5 w-5" />
              </button>
            )}
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
              <p className="text-zinc-400 text-sm">Unlock Gemini 3.1 Flash</p>
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              <span className="text-4xl font-bold text-white">$6.99</span>
              <span className="text-zinc-400 text-base">/month</span>
              <p className="text-xs mt-1 text-zinc-500">after free trial</p>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "Gemini 3.1 Flash - advanced reasoning", "Priority response speed", "Everything in Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
                  <span className={`text-sm ${i === 0 ? "font-semibold text-green-400" : "text-zinc-200"}`}>{text}</span>
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
              <p className="text-zinc-400 text-sm">Antigravity · Gemini 3.1 Pro · AI Video Studio</p>
            </div>
            <div className="flex h-1 rounded-full overflow-hidden mb-4">
              {["#4285F4","#EA4335","#FBBC05","#34A853"].map((c,i) => <div key={i} className="flex-1" style={{background:c}} />)}
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle className="w-3 h-3" /> 7-day free trial — no charge today
              </div>
            </div>
            <div className="text-center mb-5">
              <span className="text-4xl font-bold text-white">$30</span>
              <span className="text-zinc-400 text-base">/month</span>
              <p className="text-xs mt-1 text-zinc-500">after free trial</p>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "🔬 Antigravity — build apps with one prompt", "🎬 AI Video Studio (Google Veo 3.1)", "Gemini 3.1 Pro — maximum intelligence", "Everything in Pro + Free included"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className={`text-sm ${i === 0 ? "font-semibold text-green-400" : "text-zinc-200"}`}>{text}</span>
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
              <p className="text-zinc-400 text-sm">Antigravity + Research for up to 5 team members</p>
            </div>
            <div className="text-center mb-1">
              <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
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
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${entCouponApplied ? "bg-green-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"} ${!entCoupon.trim() ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                {entCouponApplied ? "✓" : "Apply"}
              </button>
            </div>
            <ul className="space-y-3 mb-6">
              {["7 days free — cancel anytime", "🔬 Antigravity — build apps with one prompt", "🎬 AI Video Studio (Google Veo 3.1)", "All Research features included", "Shareable 6-digit team code (up to 5 members)", "Save 44% vs 5 individual Research plans"].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className={`text-sm ${i === 0 ? "font-semibold text-green-400" : "text-zinc-200"}`}>{text}</span>
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
