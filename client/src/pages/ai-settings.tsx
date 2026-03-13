import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Brain, Zap, CheckCircle, Star, FlaskConical, XCircle, AlertTriangle,
  Gift, Building2, Trash2, Copy, Users, Code2, History, MessageSquare, User, Palette,
  Shield, Bell, CreditCard, Sun, Moon, SlidersHorizontal, Globe,
  Download, Eye, EyeOff, ChevronRight, Lock, Volume2, VolumeX, Type,
  Smartphone, Info, RefreshCw, LogOut, Save, Check, X, Settings, Sparkles,
  HelpCircle, Mail, Clock, BarChart3, Languages, Wand2, FileText, Bot
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// ── Pref helpers ──────────────────────────────────────────────────────────────
function usePref<T>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : def; } catch { return def; }
  });
  const set = (v: T) => { setVal(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [val, set];
}

const TABS = [
  { id: "profile",     label: "Profile",      icon: User },
  { id: "appearance",  label: "Appearance",   icon: Palette },
  { id: "ai",          label: "AI & Models",  icon: Brain },
  { id: "privacy",     label: "Privacy",      icon: Shield },
  { id: "billing",     label: "Billing",      icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const AI_MODELS = {
  "gemini-flash": {
    name: "Gemini 3.1 Flash Lite",
    description: "Ultra-fast responses for everyday questions. Lightning speed with great quality.",
    tier: "Free", icon: Zap,
    color: "from-green-500 to-emerald-600", borderColor: "border-green-500",
    badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  "gemini-pro": {
    name: "Gemini 3.1 Flash",
    description: "Premium quality responses with detailed, thorough answers for complex topics.",
    tier: "Pro · $6.99/mo", icon: Star,
    color: "from-purple-500 to-pink-600", borderColor: "border-purple-500",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  "claude-research": {
    name: "Gemini 3.1 Pro Research",
    description: "Maximum intelligence — Gemini 3.1 Pro at full power on every response.",
    tier: "Research · $30/mo", icon: FlaskConical,
    color: "from-blue-500 to-cyan-600", borderColor: "border-blue-500",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

function Toggle({ value, onChange, color = "#4285F4" }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? color : "var(--s-toggle-off)", border: "none", cursor: "pointer", padding: 2, transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", transform: value ? "translateX(20px)" : "translateX(0)", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function SettingRow({ label, desc, children, stacked }: { label: string; desc?: string; children: React.ReactNode; stacked?: boolean }) {
  const mobile = typeof window !== "undefined" && window.innerWidth < 640;
  const shouldStack = stacked || mobile;
  return (
    <div style={{ display: "flex", flexDirection: shouldStack ? "column" : "row", alignItems: shouldStack ? "flex-start" : "center", justifyContent: "space-between", gap: shouldStack ? 10 : 16, padding: "14px 0", borderBottom: "1px solid var(--s-row-border)" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--s-text)" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--s-muted)", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0, flexWrap: "wrap", display: "flex", gap: 6 }}>{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: "var(--s-input-bg)", border: "1px solid var(--s-input-border)", borderRadius: 8, padding: "6px 10px", color: "var(--s-input-text)", fontSize: 13, cursor: "pointer", outline: "none" }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background: "var(--s-option-bg)" }}>{o.label}</option>)}
    </select>
  );
}

export default function AISettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedModel, setSelectedModel] = usePref("selectedAIModel", "gemini-flash");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [, setLocation] = useLocation();

  // Appearance prefs
  const [fontSize, setFontSize] = usePref<"small"|"medium"|"large">("pref_fontSize", "medium");
  const [chatDensity, setChatDensity] = usePref<"compact"|"comfortable"|"spacious">("pref_chatDensity", "comfortable");
  const [bubbleStyle, setBubbleStyle] = usePref<"bubbles"|"flat"|"minimal">("pref_bubbleStyle", "bubbles");
  const [accentColor, setAccentColor] = usePref("pref_accentColor", "#4285F4");
  const [showTimestamps, setShowTimestamps] = usePref("pref_showTimestamps", true);
  const [animationsEnabled, setAnimationsEnabled] = usePref("pref_animations", true);
  const [sidebarCollapsed, setSidebarCollapsed] = usePref("pref_sidebarCollapsed", false);

  // AI prefs
  const [responseStyle, setResponseStyle] = usePref<"concise"|"balanced"|"detailed">("pref_responseStyle", "balanced");
  const [responseTone, setResponseTone] = usePref<"professional"|"casual"|"creative"|"academic">("pref_responseTone", "casual");
  const [preferredLanguage, setPreferredLanguage] = usePref("pref_language", "en");
  const [autoScroll, setAutoScroll] = usePref("pref_autoScroll", true);
  const [sendOnEnter, setSendOnEnter] = usePref("pref_sendOnEnter", true);
  const [showThinkingTime, setShowThinkingTime] = usePref("pref_showThinkingTime", false);
  const [codeHighlighting, setCodeHighlighting] = usePref("pref_codeHighlight", true);
  const [mathRendering, setMathRendering] = usePref("pref_mathRender", false);
  const [smartSuggestions, setSmartSuggestions] = usePref("pref_smartSuggestions", true);
  const [streamResponses, setStreamResponses] = usePref("pref_streamResponses", true);


  // Privacy prefs
  const [saveHistory, setSaveHistory] = usePref("pref_saveHistory", true);
  const [analyticsEnabled, setAnalyticsEnabled] = usePref("pref_analytics", false);
  const [profileVisible, setProfileVisible] = usePref("pref_profileVisible", false);
  const [sessionTimeout, setSessionTimeout] = usePref<"never"|"1h"|"8h"|"24h">("pref_sessionTimeout", "never");
  const [dataRetention, setDataRetention] = usePref<"forever"|"1y"|"6mo"|"1mo">("pref_dataRetention", "forever");

  // Notification prefs
  const [emailNotifs, setEmailNotifs] = usePref("pref_emailNotifs", false);
  const [systemNotifs, setSystemNotifs] = usePref("pref_systemNotifs", false);
  const [updateNotifs, setUpdateNotifs] = usePref("pref_updateNotifs", true);
  const [billingNotifs, setBillingNotifs] = usePref("pref_billingNotifs", true);
  const [weeklyDigest, setWeeklyDigest] = usePref("pref_weeklyDigest", false);
  const weeklyDigestMutation = useMutation({
    mutationFn: async (enabled: boolean) => (await apiRequest("POST", "/api/settings/weekly-digest", { enabled })).json(),
    onSuccess: (_, enabled) => toast({ title: enabled ? "Weekly Digest Enabled" : "Weekly Digest Disabled", description: enabled ? "You'll receive a confirmation email shortly." : "You've unsubscribed from weekly digest emails." }),
    onError: (e: any) => toast({ title: "Error", description: e.message || "Failed to update", variant: "destructive" }),
  });
  const [betaFeatures, setBetaFeatures] = usePref("pref_betaFeatures", false);

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Responsive: detect mobile
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({ queryKey: ["/api/subscription-status"] });
  const { data: enterpriseData } = useQuery<{ hasCode: boolean; code?: string; maxUses?: number; currentUses?: number }>({ queryKey: ["/api/enterprise-code"] });

  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [enterpriseCodeInput, setEnterpriseCodeInput] = useState("");
  const [displayName, setDisplayName] = useState(user?.firstName || "");
  const [isSavingName, setIsSavingName] = useState(false);

  const promoMutation = useMutation({
    mutationFn: async ({ promoCode }: { promoCode: string }) => (await apiRequest("POST", "/api/apply-promo", { promoCode: promoCode.toUpperCase() })).json(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      setPromoCode(""); setShowPromoInput(false);
      toast({ title: "Promo Code Applied!", description: data.message });
    },
    onError: (e: any) => toast({ title: "Invalid Code", description: e.message || "Code not valid", variant: "destructive" }),
  });

  const enterpriseRedeemMutation = useMutation({
    mutationFn: async ({ code }: { code: string }) => (await apiRequest("POST", "/api/redeem-enterprise-code", { code: code.toUpperCase() })).json(),
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] }); setEnterpriseCodeInput(""); toast({ title: "Enterprise Code Redeemed!", description: data.message }); },
    onError: (e: any) => toast({ title: "Invalid Code", description: e.message || "Code not valid", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/cancel-subscription")).json(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      setShowCancelConfirm(false); setSelectedModel("gemini-flash");
      toast({ title: data.refunded ? "Cancelled & Refunded" : "Subscription Cancelled", description: data.message });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelAddonMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/cancel-addon")).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); toast({ title: "Code Studio Cancelled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/delete-account")).json(),
    onSuccess: () => { toast({ title: "Account Deleted" }); setTimeout(() => { setLocation("/"); window.location.reload(); }, 1500); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: conversations, refetch: refetchConversations } = useQuery<Array<{ id: number; title: string; createdAt: string }>>({ queryKey: ["/api/conversations"], enabled: showHistoryDialog });
  const deleteConversationMutation = useMutation({ mutationFn: async (id: number) => (await apiRequest("DELETE", `/api/conversations/${id}`)).json(), onSuccess: () => { refetchConversations(); toast({ title: "Deleted" }); } });
  const deleteAllMutation = useMutation({ mutationFn: async () => (await apiRequest("DELETE", "/api/conversations")).json(), onSuccess: () => { refetchConversations(); setShowDeleteAllConfirm(false); toast({ title: "All history cleared" }); } });

  const hasPaidSub = ["pro","research","enterprise"].includes(subscriptionData?.tier || "");
  const tierLabel = subscriptionData?.tier === "enterprise" ? "Enterprise · $100/mo" : subscriptionData?.tier === "research" ? "Research · $30/mo" : subscriptionData?.tier === "pro" ? "Pro · $6.99/mo" : "Free";
  const displayEmail = user?.email || "—";
  const initials = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—";

  const accentColors = ["#4285F4","#EA4335","#FBBC05","#34A853","#8b5cf6","#06b6d4","#f97316","#ec4899"];

  // ── Styles ──
  const C = {
    bg: isDark ? "#0a0a14" : "#f1f5f9",
    panel: isDark ? "#111122" : "#ffffff",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    text: isDark ? "#e2e8f0" : "#1e293b",
    muted: isDark ? "#64748b" : "#6b7280",
    accent: "#4285F4",
  };

  const tabStyle = (id: string) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, cursor: "pointer",
    background: activeTab === id ? `${accentColor}18` : "transparent",
    border: `1px solid ${activeTab === id ? `${accentColor}40` : "transparent"}`,
    color: activeTab === id ? accentColor : C.muted,
    fontWeight: activeTab === id ? 600 : 400, fontSize: 14, transition: "all 0.15s", width: "100%", textAlign: "left" as const,
  });

  const sectionTitle = (label: string, sub?: string) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{label}</div>
      {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const pill = (label: string, active: boolean, onClick: () => void, color = accentColor) => (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? color : "var(--s-pill-border)"}`, background: active ? `${color}20` : "transparent", color: active ? color : C.muted, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: `${C.panel}cc`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "12px 16px" : "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
            <Link href="/chat">
              <button style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
                <ArrowLeft size={16} /> {!isMobile && "Back"}
              </button>
            </Link>
            <div style={{ width: 1, height: 20, background: C.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings size={18} style={{ color: accentColor }} />
              <span style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16 }}>Settings</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, fontWeight: 600, whiteSpace: "nowrap" }}>{tierLabel}</div>
          </div>
        </div>

        {/* Mobile: horizontal scrolling tab bar */}
        {isMobile && (
          <div style={{ overflowX: "auto", display: "flex", gap: 4, padding: "8px 12px", borderTop: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? accentColor : "var(--s-pill-border)"}`, background: active ? `${accentColor}18` : "transparent", color: active ? accentColor : C.muted, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
                  <Icon size={13} />{tab.label}
                </button>
              );
            })}
            <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              <Trash2 size={13} /> Delete Account
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "20px 14px" : "32px 24px", display: "flex", gap: 28, alignItems: "flex-start" }}>

        {/* Desktop: Sidebar nav */}
        {!isMobile && (
          <div style={{ width: 200, flexShrink: 0, position: "sticky", top: 80 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabStyle(tab.id)}>
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Danger Zone</div>
              <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ══ PROFILE ══ */}
          {activeTab === "profile" && (
            <div>
              {sectionTitle("Profile", "Manage your account identity and information")}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${accentColor}, #34A853)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {user?.profileImageUrl
                      ? <img src={user.profileImageUrl} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      : initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{user?.firstName || displayEmail.split("@")[0]}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{displayEmail}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 10, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, fontWeight: 600 }}>{tierLabel}</span>
                      {user?.isBetaTester && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontWeight: 600 }}>Beta Tester</span>}
                      {user?.isAdmin && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24", fontWeight: 600 }}>Admin</span>}
                    </div>
                  </div>
                </div>
                <SettingRow label="Email address" desc="Used for login and notifications">
                  <span style={{ fontSize: 13, color: C.muted }}>{displayEmail}</span>
                </SettingRow>
                <SettingRow label="Member since" desc="Account creation date">
                  <span style={{ fontSize: 13, color: C.muted }}>{memberSince}</span>
                </SettingRow>
                <SettingRow label="Plan" desc="Your current subscription tier">
                  <Link href="/pricing"><span style={{ fontSize: 13, color: accentColor, cursor: "pointer" }}>Manage →</span></Link>
                </SettingRow>
                <SettingRow label="Account ID" desc="Your unique account identifier">
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{(user?.id || "").slice(0, 16)}…</span>
                </SettingRow>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: C.text }}>Quick Links</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  {[
                    { href: "/pricing", icon: CreditCard, label: "Upgrade Plan", color: "#4285F4" },
                    { href: "/support", icon: HelpCircle, label: "Get Support", color: "#34A853" },
                    { href: "/code-studio", icon: Code2, label: "Code Studio", color: "#8b5cf6" },
                    { href: "/beta", icon: FlaskConical, label: "Beta Program", color: "#EA4335" },
                  ].map(({ href, icon: Icon, label, color }) => (
                    <Link key={href} href={href}>
                      <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: `${color}08`, border: `1px solid ${color}25`, color: C.text, cursor: "pointer", width: "100%", fontSize: 14, fontWeight: 500 }}>
                        <Icon size={16} style={{ color }} />{label}
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ APPEARANCE ══ */}
          {activeTab === "appearance" && (
            <div>
              {sectionTitle("Appearance", "Customize how TurboAnswer looks and feels")}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Theme</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  {[
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "light", label: "Light", icon: Sun },
                  ].map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => { if (theme !== value) toggleTheme(); }} style={{ flex: 1, padding: "16px 12px", borderRadius: 12, border: `2px solid ${theme === value ? accentColor : "rgba(255,255,255,0.08)"}`, background: theme === value ? `${accentColor}12` : "rgba(255,255,255,0.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
                      <Icon size={22} style={{ color: theme === value ? accentColor : C.muted }} />
                      <span style={{ fontSize: 13, color: theme === value ? accentColor : C.muted, fontWeight: theme === value ? 600 : 400 }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Accent Color</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {accentColors.map(c => (
                    <button key={c} onClick={() => setAccentColor(c)} style={{ width: 36, height: 36, borderRadius: "50%", background: c, border: accentColor === c ? `3px solid #fff` : "3px solid transparent", cursor: "pointer", boxShadow: accentColor === c ? `0 0 0 2px ${c}` : "none", transition: "all 0.15s" }}>
                      {accentColor === c && <Check size={16} style={{ color: "#fff" }} />}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Text & Layout</div>
                <SettingRow label="Font size" desc="Controls chat message text size">
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["small","medium","large"] as const).map(s => pill(s.charAt(0).toUpperCase()+s.slice(1), fontSize===s, ()=>setFontSize(s)))}
                  </div>
                </SettingRow>
                <SettingRow label="Chat density" desc="Controls spacing between messages">
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["compact","comfortable","spacious"] as const).map(s => pill(s.charAt(0).toUpperCase()+s.slice(1), chatDensity===s, ()=>setChatDensity(s)))}
                  </div>
                </SettingRow>
                <SettingRow label="Message style" desc="Visual style for chat bubbles">
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["bubbles","flat","minimal"] as const).map(s => pill(s.charAt(0).toUpperCase()+s.slice(1), bubbleStyle===s, ()=>setBubbleStyle(s)))}
                  </div>
                </SettingRow>
                <SettingRow label="Show timestamps" desc="Display time on each message">
                  <Toggle value={showTimestamps} onChange={setShowTimestamps} color={accentColor} />
                </SettingRow>
                <SettingRow label="Animations" desc="Enable UI motion effects and transitions">
                  <Toggle value={animationsEnabled} onChange={setAnimationsEnabled} color={accentColor} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* ══ AI & MODELS ══ */}
          {activeTab === "ai" && (
            <div>
              {sectionTitle("AI & Models", "Configure your AI assistant behavior and preferences")}

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Default Model</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(AI_MODELS).map(([key, model]) => {
                    const Icon = model.icon;
                    const isSelected = selectedModel === key;
                    return (
                      <button key={key} onClick={() => setSelectedModel(key)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 14, border: `2px solid ${isSelected ? accentColor : "rgba(255,255,255,0.08)"}`, background: isSelected ? `${accentColor}08` : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${model.color.includes("green") ? "#22c55e,#10b981" : model.color.includes("purple") ? "#8b5cf6,#ec4899" : "#3b82f6,#06b6d4"})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={20} style={{ color: "#fff" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{model.name}</span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, ...Object.fromEntries(model.badgeColor.split(" ").map(cls => {
                              if (cls.startsWith("bg-")) return ["background", cls.includes("green") ? "rgba(34,197,94,0.1)" : cls.includes("purple") ? "rgba(139,92,246,0.1)" : "rgba(59,130,246,0.1)"];
                              if (cls.startsWith("text-")) return ["color", cls.includes("green") ? "#4ade80" : cls.includes("purple") ? "#a78bfa" : "#60a5fa"];
                              return ["border", "1px solid transparent"];
                            })), fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>{model.tier}</span>
                          </div>
                          <div style={{ fontSize: 13, color: C.muted }}>{model.description}</div>
                        </div>
                        {isSelected && <CheckCircle size={20} style={{ color: accentColor, flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Response Behavior</div>
                <SettingRow label="Response style" desc="How long and detailed AI answers should be">
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["concise","balanced","detailed"] as const).map(s => pill(s.charAt(0).toUpperCase()+s.slice(1), responseStyle===s, ()=>setResponseStyle(s)))}
                  </div>
                </SettingRow>
                <SettingRow label="Tone" desc="The personality and register of responses">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {(["casual","professional","creative","academic"] as const).map(s => pill(s.charAt(0).toUpperCase()+s.slice(1), responseTone===s, ()=>setResponseTone(s)))}
                  </div>
                </SettingRow>
                <SettingRow label="Preferred language" desc="Language for AI responses">
                  <Select value={preferredLanguage} onChange={setPreferredLanguage} options={[
                    {value:"en",label:"English"},{value:"es",label:"Spanish"},{value:"fr",label:"French"},
                    {value:"de",label:"German"},{value:"it",label:"Italian"},{value:"pt",label:"Portuguese"},
                    {value:"zh",label:"Chinese"},{value:"ja",label:"Japanese"},{value:"ko",label:"Korean"},
                    {value:"ar",label:"Arabic"},{value:"ru",label:"Russian"},{value:"hi",label:"Hindi"},
                  ]} />
                </SettingRow>
                <SettingRow label="Stream responses" desc="Show AI response as it generates">
                  <Toggle value={streamResponses} onChange={setStreamResponses} color={accentColor} />
                </SettingRow>
                <SettingRow label="Auto-scroll to latest" desc="Scroll down as AI responds">
                  <Toggle value={autoScroll} onChange={setAutoScroll} color={accentColor} />
                </SettingRow>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Input</div>
                <SettingRow label="Send on Enter" desc="Press Enter to send. Shift+Enter for new line.">
                  <Toggle value={sendOnEnter} onChange={setSendOnEnter} color={accentColor} />
                </SettingRow>
                <SettingRow label="Smart suggestions" desc="Show prompt suggestions and autocomplete">
                  <Toggle value={smartSuggestions} onChange={setSmartSuggestions} color={accentColor} />
                </SettingRow>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Content Rendering</div>
                <SettingRow label="Code syntax highlighting" desc="Color-code programming languages in responses">
                  <Toggle value={codeHighlighting} onChange={setCodeHighlighting} color={accentColor} />
                </SettingRow>
                <SettingRow label="Math rendering" desc="Render LaTeX math equations (β)">
                  <Toggle value={mathRendering} onChange={setMathRendering} color={accentColor} />
                </SettingRow>
                <SettingRow label="Show response timing" desc="Display how long each response took">
                  <Toggle value={showThinkingTime} onChange={setShowThinkingTime} color={accentColor} />
                </SettingRow>
              </div>
            </div>
          )}

          {/* ══ PRIVACY ══ */}
          {activeTab === "privacy" && (
            <div>
              {sectionTitle("Privacy & Data", "Control how your data is handled and stored")}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Data Storage</div>
                <SettingRow label="Save chat history" desc="Store your conversations in the cloud">
                  <Toggle value={saveHistory} onChange={setSaveHistory} color={accentColor} />
                </SettingRow>
                <SettingRow label="Data retention period" desc="How long to keep your conversations">
                  <Select value={dataRetention} onChange={setDataRetention} options={[
                    {value:"forever",label:"Forever"},{value:"1y",label:"1 year"},
                    {value:"6mo",label:"6 months"},{value:"1mo",label:"30 days"},
                  ]} />
                </SettingRow>
                <SettingRow label="Usage analytics" desc="Share anonymous usage data to improve TurboAnswer">
                  <Toggle value={analyticsEnabled} onChange={setAnalyticsEnabled} color={accentColor} />
                </SettingRow>
                <SettingRow label="Session timeout" desc="Auto-logout after inactivity">
                  <Select value={sessionTimeout} onChange={setSessionTimeout} options={[
                    {value:"never",label:"Never"},{value:"1h",label:"1 hour"},
                    {value:"8h",label:"8 hours"},{value:"24h",label:"24 hours"},
                  ]} />
                </SettingRow>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Chat History</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => { setShowHistoryDialog(true); refetchConversations(); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.03)", color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    <History size={15} /> View History
                  </button>
                  <button onClick={() => setShowDeleteAllConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    <Trash2 size={15} /> Clear All History
                  </button>
                </div>
                {showDeleteAllConfirm && (
                  <div style={{ marginTop: 16, padding: 16, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12 }}>
                    <p style={{ fontSize: 13, color: "#fca5a5", marginBottom: 12 }}>Delete ALL conversations permanently? This cannot be undone.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => deleteAllMutation.mutate()} style={{ padding: "8px 16px", background: "#dc2626", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Yes, Delete All</button>
                      <button onClick={() => setShowDeleteAllConfirm(false)} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Account Security</div>
                <SettingRow label="Email address" desc="Your login email">
                  <span style={{ fontSize: 13, color: C.muted }}>{displayEmail}</span>
                </SettingRow>
                <SettingRow label="Password" desc="Change your account password">
                  <Link href="/forgot-password"><span style={{ fontSize: 13, color: accentColor, cursor: "pointer" }}>Change →</span></Link>
                </SettingRow>
                <SettingRow label="Crisis support data" desc="View and delete your private crisis conversations">
                  <Link href="/crisis-info"><span style={{ fontSize: 13, color: accentColor, cursor: "pointer" }}>Manage →</span></Link>
                </SettingRow>
                <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, fontSize: 12, color: "#6ee7b7" }}>
                  Your conversations are stored securely. Crisis support data is AES-256-GCM encrypted and never shared.
                </div>
              </div>
            </div>
          )}

          {/* ══ BILLING ══ */}
          {activeTab === "billing" && (
            <div>
              {sectionTitle("Billing & Plans", "Manage your subscription and payment details")}

              {/* Current plan */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Current Plan</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 14, background: `${accentColor}08`, border: `1px solid ${accentColor}25` }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{tierLabel}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                      {subscriptionData?.status === "active" ? "Active subscription" : "No active subscription"}
                    </div>
                  </div>
                  <Link href="/pricing">
                    <button style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${accentColor}, #34A853)`, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                      {hasPaidSub ? "Change Plan" : "Upgrade →"}
                    </button>
                  </Link>
                </div>
              </div>

              {/* Code Studio add-on */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Code Studio Add-on</div>
                {user?.codeStudioAddon ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", marginBottom: 12 }}>
                      <Code2 size={18} style={{ color: "#34d399" }} />
                      <span style={{ fontSize: 14, color: "#34d399", fontWeight: 600 }}>Active · $15/month</span>
                    </div>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Cancel to stop future billing. Access remains until the billing period ends.</p>
                    <button onClick={() => cancelAddonMutation.mutate()} disabled={cancelAddonMutation.isPending} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 10, color: "#fb923c", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      <XCircle size={15} /> {cancelAddonMutation.isPending ? "Cancelling…" : "Cancel Code Studio"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Add the full AI-powered IDE to any plan. 7-day free trial, then $15/month.</p>
                    <Link href="/code-studio">
                      <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(52,168,83,0.1)", border: "1px solid rgba(52,168,83,0.3)", borderRadius: 10, color: "#34A853", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        <Code2 size={15} /> Try Code Studio Free →
                      </button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Enterprise code */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Enterprise Team Code</div>
                {enterpriseData?.hasCode ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: 32, fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.25em", color: "#fbbf24" }}>{enterpriseData.code}</span>
                      <button onClick={() => { navigator.clipboard.writeText(enterpriseData.code || ""); toast({ title: "Copied!" }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#fbbf24" }}>
                        <Copy size={18} />
                      </button>
                    </div>
                    <div style={{ fontSize: 13, color: C.muted }}>{enterpriseData.currentUses || 0} / {enterpriseData.maxUses || 5} team members using this code</div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Have a 6-digit enterprise code from your organization? Enter it to unlock Research-level access.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={enterpriseCodeInput} onChange={e => setEnterpriseCodeInput(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6} style={{ width: 120, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, color: C.text, fontSize: 20, fontFamily: "monospace", letterSpacing: "0.3em", textAlign: "center", outline: "none" }} />
                      <button onClick={() => enterpriseRedeemMutation.mutate({ code: enterpriseCodeInput })} disabled={enterpriseCodeInput.length !== 6 || enterpriseRedeemMutation.isPending} style={{ padding: "10px 20px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, color: "#fbbf24", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        {enterpriseRedeemMutation.isPending ? "Redeeming…" : "Redeem"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Promo code */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Promo Code</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="ENTER-CODE" style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, color: C.text, fontSize: 13, fontFamily: "monospace", outline: "none" }} onKeyDown={e => { if (e.key === "Enter" && promoCode.trim()) promoMutation.mutate({ promoCode }); }} />
                  <button onClick={() => promoMutation.mutate({ promoCode })} disabled={!promoCode.trim() || promoMutation.isPending} style={{ padding: "10px 20px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, color: "#a78bfa", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    {promoMutation.isPending ? "Applying…" : "Apply"}
                  </button>
                </div>
              </div>

              {/* Cancel subscription */}
              {hasPaidSub && (
                <div style={{ background: C.panel, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f87171", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Cancel Subscription</div>
                  {!showCancelConfirm ? (
                    <button onClick={() => setShowCancelConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      <XCircle size={15} /> Cancel Subscription
                    </button>
                  ) : (
                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <AlertTriangle size={18} style={{ color: "#f87171", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#f87171", marginBottom: 4 }}>Cancel your {tierLabel} plan?</div>
                          <p style={{ fontSize: 13, color: "#fca5a5" }}>Cancellations within 3 days get a full refund. After that, you keep access until the billing period ends.</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} style={{ padding: "9px 18px", background: "#dc2626", border: "none", borderRadius: 9, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel"}
                        </button>
                        <button onClick={() => setShowCancelConfirm(false)} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: "pointer", fontSize: 13 }}>Keep Plan</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ NOTIFICATIONS ══ */}
          {activeTab === "notifications" && (
            <div>
              {sectionTitle("Notifications", "Control what TurboAnswer communicates to you")}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email Notifications</div>
                <SettingRow label="Email notifications" desc="Receive important account emails">
                  <Toggle value={emailNotifs} onChange={setEmailNotifs} color={accentColor} />
                </SettingRow>
                <SettingRow label="Billing alerts" desc="Receive invoices and billing reminders">
                  <Toggle value={billingNotifs} onChange={setBillingNotifs} color={accentColor} />
                </SettingRow>
                <SettingRow label="Weekly digest" desc="Get a weekly summary of your AI usage">
                  <Toggle value={weeklyDigest} onChange={v => { setWeeklyDigest(v); weeklyDigestMutation.mutate(v); }} color={accentColor} />
                </SettingRow>
                <SettingRow label="Product updates" desc="Learn about new features and improvements">
                  <Toggle value={updateNotifs} onChange={setUpdateNotifs} color={accentColor} />
                </SettingRow>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>System Notifications</div>
                <SettingRow label="Browser notifications" desc="Push notifications when TurboAnswer is in the background">
                  <Toggle value={systemNotifs} onChange={async v => {
                    if (v && "Notification" in window) {
                      const perm = await Notification.requestPermission();
                      if (perm !== "granted") { toast({ title: "Notifications blocked", description: "Enable them in your browser settings", variant: "destructive" }); return; }
                    }
                    setSystemNotifs(v);
                  }} color={accentColor} />
                </SettingRow>
                <SettingRow label="Beta feature previews" desc="Get notified about early access features">
                  <Toggle value={betaFeatures} onChange={setBetaFeatures} color={accentColor} />
                </SettingRow>
              </div>

              <div style={{ background: "rgba(66,133,244,0.04)", border: "1px solid rgba(66,133,244,0.12)", borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <Info size={16} style={{ color: "#4285F4", flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: C.muted }}>All notification settings are stored locally. Email notifications require a valid email on your account. Support email: <span style={{ color: "#4285F4" }}>support@turboanswer.it.com</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chat History Dialog ── */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg bg-[#111122] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Chat History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {conversations?.length ? conversations.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                  <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => deleteConversationMutation.mutate(c.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )) : <p className="text-gray-400 text-sm py-4 text-center">No saved conversations.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-[#111122] border-red-900/50 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">This will permanently delete your account, all conversations, and cancel any active subscriptions. <strong className="text-red-400">This cannot be undone.</strong></p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1">
                {deleteMutation.isPending ? "Deleting…" : "Delete Everything"}
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-white/10 text-gray-300 hover:bg-white/5">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
