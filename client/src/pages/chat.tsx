import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, FileText, X, Brain, Settings, LogOut, Zap, Menu, QrCode, ImageIcon, Crown, CheckCircle, Star, Sun, Moon, Shield, Heart, Users, Copy, Sparkles, ArrowRight, Rocket, FlaskConical, ClipboardCheck, MessageSquare, Phone, Mail, Clock, Film, Code2, Camera, Scissors, Loader2, Swords, Key, Plus, Upload } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useLocation } from "wouter";
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
  const [, setLocation] = useLocation();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [selectedAIModel, setSelectedAIModel] = useState("gemini-flash");
  const [deepThinkByConv, setDeepThinkByConv] = useState<Record<string, boolean>>({});
  const deepThinkKey = currentConversationId == null ? '__new__' : String(currentConversationId);
  const deepThink = !!deepThinkByConv[deepThinkKey];
  const setDeepThink = (v: boolean | ((prev: boolean) => boolean)) => {
    setDeepThinkByConv(prev => {
      const cur = !!prev[deepThinkKey];
      const next = typeof v === 'function' ? (v as (p: boolean) => boolean)(cur) : v;
      return { ...prev, [deepThinkKey]: next };
    });
  };
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
  const [showCodeStudioBanner, setShowCodeStudioBanner] = useState(() => localStorage.getItem('ag_banner_dismissed') !== '1');
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [messageCountSinceLastPromo, setMessageCountSinceLastPromo] = useState(0);
  const [lastPromoDismissedAt, setLastPromoDismissedAt] = useState(0);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [showBetaFeedback, setShowBetaFeedback] = useState(false);
  const [betaFeedbackMsg, setBetaFeedbackMsg] = useState("");
  const [betaFeedbackCategory, setBetaFeedbackCategory] = useState("general");
  const [betaFeedbackSent, setBetaFeedbackSent] = useState(false);
  const [showShareModal, setShowShareModal] = useState<{ question: string; answer: string } | null>(null);
  const [shareWgId, setShareWgId] = useState<number | null>(null);
  const [shareMode, setShareMode] = useState<'message' | 'approval' | 'ticket'>('message');
  const [shareSending, setShareSending] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [verifiedMessages, setVerifiedMessages] = useState<Record<number, "verified" | "unverified" | "unknown">>({});
  const [factChecks, setFactChecks] = useState<Record<number, any>>({});
  const [factCheckLoading, setFactCheckLoading] = useState<Record<number, boolean>>({});
  const [showFactCheck, setShowFactCheck] = useState<number | null>(null);
  // TurboAnswer Reasoning Engine streaming state
  type ReasoningStage = { id: string; label: string; status: 'pending' | 'active' | 'done' | 'skipped' | 'error'; detail?: string };
  const [reasoningStages, setReasoningStages] = useState<ReasoningStage[]>([]);
  const [reasoningSources, setReasoningSources] = useState<{ title: string; url: string; snippet: string }[]>([]);
  const [reasoningPanel, setReasoningPanel] = useState<{ model: string; preview: string }[]>([]);
  const [reasoningMode, setReasoningMode] = useState<'fast' | 'retrieval' | 'deep' | null>(null);
  const [quotaWarning, setQuotaWarning] = useState<{ used: number; limit: number; tier: string } | null>(null);
  const [confidenceMessages, setConfidenceMessages] = useState<Record<number, number>>({});
  const [reasoningTraces, setReasoningTraces] = useState<Record<number, { stages: ReasoningStage[]; sources: { title: string; url: string }[]; panel: { model: string }[]; mode: string; confidence: number }>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});
  const deepThinkUsageQuery = useQuery<{ used: number; limit: number; tier: string }>({ queryKey: ['/api/deep-think/usage'], staleTime: 30000 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timedPromoShown = useRef(false);

  // Read user preferences from Settings page
  const getPref = <T,>(key: string, def: T): T => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) as T : def; } catch { return def; }
  };
  const sendOnEnterPref = getPref("pref_sendOnEnter", true);
  const autoScrollPref = getPref("pref_autoScroll", true);
  const showTimestampsPref = getPref("pref_showTimestamps", true);
  const responseStylePref = getPref<string>("pref_responseStyle", "balanced");
  const responseTonePref = getPref<string>("pref_responseTone", "casual");
  const autoReadPref = getPref("pref_autoRead", false);
  const voiceSpeedPref = getPref<string>("pref_voiceSpeed", "normal");
  const voicePitchPref = getPref<string>("pref_voicePitch", "normal");
  const voiceGenderPref = getPref<string>("pref_voiceGender", "default");
  const fontSizePref = getPref<"small"|"medium"|"large">("pref_fontSize", "medium");
  const chatDensityPref = getPref<"compact"|"comfortable"|"spacious">("pref_chatDensity", "comfortable");
  const bubbleStylePref = getPref<"bubbles"|"flat"|"minimal">("pref_bubbleStyle", "bubbles");
  const animationsPref = getPref("pref_animations", true);

  const msgFontClass = fontSizePref === "small" ? "text-xs" : fontSizePref === "large" ? "text-base sm:text-lg" : "text-sm sm:text-base";
  const msgSpacingClass = chatDensityPref === "compact" ? "mb-2" : chatDensityPref === "spacious" ? "mb-7 sm:mb-8" : "mb-4 sm:mb-5";
  const getBubbleClass = (role: string) => {
    if (bubbleStylePref === "flat") {
      return role === "user"
        ? "px-4 py-2.5 rounded-lg border border-blue-400/40 bg-blue-500/80 text-white"
        : "px-4 py-2.5 rounded-lg";
    }
    if (bubbleStylePref === "minimal") {
      return role === "user"
        ? "px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-100"
        : "px-0 py-1";
    }
    return role === "user"
      ? "px-4 py-3 rounded-2xl rounded-br-md bg-blue-500 text-white"
      : "px-4 py-3 rounded-2xl rounded-bl-md";
  };

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

  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [droppedDocFile, setDroppedDocFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const routeIncomingFile = (file: File) => {
    if (isImageFile(file)) {
      handleImageFile(file);
    } else {
      // Premium users (Pro+, beta testers, referral-Pro) get 50MB; free users get 20MB.
      const hasReferralPro = !!(user?.referralProUntil && new Date(user.referralProUntil) > new Date());
      const isPremium = !!user && (
        user.isBetaTester ||
        hasReferralPro ||
        ['pro', 'research', 'enterprise', 'owner'].includes((user.subscriptionTier || 'free').toLowerCase())
      );
      const limitMb = isPremium ? 50 : 20;
      if (file.size > limitMb * 1024 * 1024) {
        toast({ title: "File too large", description: `Please upload a file under ${limitMb} MB.`, variant: "destructive" });
        return;
      }
      setDroppedDocFile(file);
      setShowDocumentUpload(true);
    }
  };

  const handleChatDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragging(true);
  };
  const handleChatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };
  const handleChatDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  };
  const handleChatDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;
    routeIncomingFile(files[0]);
    if (files.length > 1) {
      toast({ title: "One file at a time", description: "Only the first file was added — please send others separately." });
    }
  };

  const handleImageFile = async (file: File) => {
    const isImg = file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|gif|webp|bmp)$/i.test(file.name);
    if (!isImg) {
      toast({ title: "Not an image", description: "Please attach a JPG, PNG, GIF, WebP, or HEIC file.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please attach an image under 25 MB.", variant: "destructive" });
      return;
    }

    try {
      const dataUrl = await compressImageToDataUrl(file, 1568, 0.85);
      setAttachedImage(dataUrl);
    } catch (err: any) {
      console.error("Image processing failed:", err);
      toast({
        title: "Couldn't read image",
        description: file.type === "image/heic" || /\.heic$/i.test(file.name)
          ? "iPhone HEIC photos: please change Camera → Formats to 'Most Compatible' or convert to JPG."
          : "Try a different file.",
        variant: "destructive",
      });
    }
  };

  const compressImageToDataUrl = (file: File, maxDim: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (!dataUrl || dataUrl === "data:,") return reject(new Error("Encode failed"));
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image decode failed (possibly HEIC/unsupported format)"));
      };
      img.src = url;
    });
  };

  const handlePasteImage = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          return;
        }
      }
    }
  };

  const [streamingText, setStreamingText] = useState("");
  const [autoDowngraded, setAutoDowngraded] = useState(false);
  const streamSessionRef = useRef(0);

  const resetReasoningState = () => {
    setReasoningStages([]);
    setReasoningSources([]);
    setReasoningPanel([]);
    setReasoningMode(null);
    setStreamingText("");
    setAutoDowngraded(false);
    setQuotaWarning(null);
  };

  const runStreamingMessage = async (content: string, convId: number): Promise<any> => {
    resetReasoningState();
    // Bump session counter so any stale chunk events from a previous, still-
    // unfinished stream are dropped instead of bleeding into this run.
    const sessionId = ++streamSessionRef.current;
    const res = await fetch(`/api/conversations/${convId}/messages/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        content,
        deepThink,
        language: currentLanguage,
        responseStyle: responseStylePref,
        responseTone: responseTonePref,
      }),
    });
    if (res.status === 429) {
      let d: any = {};
      try { d = await res.json(); } catch {}
      throw { isDailyLimit: true, message: d.message };
    }
    if (!res.ok || !res.body) {
      let msg = "Failed to send message";
      try { msg = (await res.json()).message || msg; } catch {}
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let saved: any = null;
    let streamErr: string | null = null;

    const upsertStage = (stage: ReasoningStage) => {
      setReasoningStages(prev => {
        const idx = prev.findIndex(s => s.id === stage.id);
        if (idx === -1) return [...prev, stage];
        const next = [...prev];
        next[idx] = stage;
        return next;
      });
    };

    const handleEvent = (eventName: string, data: any) => {
      // Drop events that arrived after the user kicked off a new stream.
      if (sessionId !== streamSessionRef.current) return;
      switch (eventName) {
        case 'stage':
          if (data?.stage) upsertStage(data.stage);
          break;
        case 'sources':
          if (Array.isArray(data?.sources)) setReasoningSources(data.sources);
          break;
        case 'panel':
          if (data?.model) setReasoningPanel(prev => [...prev, { model: data.model, preview: data.preview || '' }]);
          break;
        case 'chunk':
          if (typeof data?.text === 'string' && data.text.length) {
            setStreamingText(prev => prev + data.text);
          }
          break;
        case 'route':
          if (data?.autoDowngraded) setAutoDowngraded(true);
          if (data?.mode) setReasoningMode(data.mode);
          break;
        case 'quota':
          if (data?.fellBackToFast) setQuotaWarning({ used: data.used, limit: data.limit, tier: data.tier });
          break;
        case 'done':
          setReasoningMode(data?.mode || null);
          break;
        case 'saved':
          saved = data;
          break;
        case 'error':
          streamErr = data?.message || 'Reasoning failed';
          break;
      }
    };

    const processBlock = (block: string) => {
      // SSE event block: one or more "event:" / "data:" lines. Multiple data:
      // lines are joined with newline per SSE spec.
      const lines = block.split("\n");
      let evtName = "message";
      const dataParts: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) evtName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataParts.push(line.slice(5).replace(/^ /, ''));
      }
      if (!dataParts.length) return;
      const dataStr = dataParts.join("\n");
      try {
        handleEvent(evtName, JSON.parse(dataStr));
      } catch {}
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let blockEnd: number;
      while ((blockEnd = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, blockEnd);
        buffer = buffer.slice(blockEnd + 2);
        processBlock(block);
      }
    }
    // Flush any trailing event that wasn't terminated by a blank line.
    if (buffer.trim().length) processBlock(buffer);

    if (streamErr && !saved) throw new Error(streamErr);
    return saved;
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, convId, imageDataUrl }: { content: string; convId: number; imageDataUrl?: string | null }) => {
      // Default text path: route through TurboAnswer Reasoning Engine (auto-routes
      // fast/retrieval/deep). Deep Think toggle becomes a force-deep override.
      // Image messages still use the legacy vision pipeline.
      if (!imageDataUrl) {
        return await runStreamingMessage(content, convId);
      }
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content, selectedModel: selectedAIModel, language: currentLanguage,
          responseStyle: responseStylePref, responseTone: responseTonePref,
          deepThink: selectedAIModel === 'claude-research' ? deepThink : false,
          imageDataUrl: imageDataUrl || undefined,
        }),
      });
      if (res.status === 429) {
        let data: any = {};
        try { data = await res.json(); } catch {}
        if (data.code === "DAILY_LIMIT_REACHED" || (data.message && data.message.includes("daily limit"))) {
          throw { isDailyLimit: true, message: data.message };
        }
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message");
      return data;
    },
    onSuccess: (data: any, { convId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", convId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deep-think/usage"] });
      setMessageContent("");
      setIsTyping(false);
      // Capture trace BEFORE resetting so we can show it persistently below the answer
      const aid = data?.aiMessage?.id;
      if (aid) {
        setReasoningTraces(prev => ({
          ...prev,
          [aid]: {
            stages: reasoningStages,
            sources: reasoningSources.map(s => ({ title: s.title, url: s.url })),
            panel: reasoningPanel.map(p => ({ model: p.model })),
            mode: data?.mode || 'fast',
            confidence: typeof data?.confidence === 'number' ? data.confidence : 0,
          },
        }));
        if (typeof data?.confidence === 'number') {
          setConfidenceMessages(prev => ({ ...prev, [aid]: data.confidence }));
        }
      }
      resetReasoningState();
      if (data?.aiMessage?.id && data?.verified) {
        setVerifiedMessages(prev => ({ ...prev, [data.aiMessage.id]: data.verified as "verified" | "unverified" | "unknown" }));
      }
      if (isFreeTier) {
        setMessageCountSinceLastPromo(prev => prev + 1);
      }
    },
    onError: (error: any, vars) => {
      setIsTyping(false);
      resetReasoningState();
      // Always refetch messages so any persisted user message stays visible even when reasoning fails
      if (vars?.convId) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", vars.convId, "messages"] });
      }
      if (error?.isDailyLimit) {
        setShowDailyLimitModal(true);
        return;
      }
      toast({ title: "Error", description: error?.message || "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!currentConversationId && conversations && conversations.length === 0) {
      createConversationMutation.mutate();
    } else if (!currentConversationId && conversations && conversations.length > 0) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  useEffect(() => {
    if (autoScrollPref) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-read AI responses aloud when pref is enabled
  useEffect(() => {
    if (!autoReadPref || !messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(last.content.replace(/[#*`_~]/g, '').slice(0, 2000));
    utterance.rate = voiceSpeedPref === 'slow' ? 0.75 : voiceSpeedPref === 'fast' ? 1.5 : 1;
    utterance.pitch = voicePitchPref === 'low' ? 0.6 : voicePitchPref === 'high' ? 1.5 : 1;
    if (voiceGenderPref !== 'default') {
      const voices = window.speechSynthesis.getVoices();
      const femaleNames = /female|woman|girl|zira|samantha|karen|victoria|fiona|moira|tessa|veena|nicky|kate|susan|serena|heather|eva|joanna|kendra|kimberly|salli|ivy|jacki/i;
      const maleNames = /male|man|david|mark|james|richard|daniel|fred|thomas|alex/i;
      const match = voiceGenderPref === 'female'
        ? voices.find(v => femaleNames.test(v.name))
        : voices.find(v => maleNames.test(v.name) && !femaleNames.test(v.name));
      if (match) utterance.voice = match;
    }
    window.speechSynthesis.speak(utterance);
  }, [messages]);

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

  const handleFactCheck = async (messageId: number, content: string) => {
    if (factChecks[messageId] || factCheckLoading[messageId]) {
      setShowFactCheck(showFactCheck === messageId ? null : messageId);
      return;
    }
    setFactCheckLoading(prev => ({ ...prev, [messageId]: true }));
    try {
      const res = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fact-check failed');
      const data = await res.json();
      setFactChecks(prev => ({ ...prev, [messageId]: data }));
      setShowFactCheck(messageId);
    } catch (e: any) {
      toast({ title: "Fact-check failed", description: e.message, variant: "destructive" });
    } finally {
      setFactCheckLoading(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleSendMessage = async () => {
    if ((!messageContent.trim() && !attachedImage) || sendMessageMutation.isPending) return;
    const convId = await getOrCreateConversationId();
    if (!convId) return;
    setIsTyping(true);
    const imgToSend = attachedImage;
    setAttachedImage(null);
    sendMessageMutation.mutate({ content: messageContent.trim() || (imgToSend ? "What's in this image?" : ""), convId, imageDataUrl: imgToSend });
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
    if (e.key === 'Enter' && !e.shiftKey && sendOnEnterPref) { e.preventDefault(); handleSendWithPromo(); }
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
    const renderTextWithTags = (text: string) => {
      // Highlight [unverified]…[/unverified] / [contested]…[/contested] / [unverified] sentence / [contested] sentence
      const tagRegex = /\[(unverified|contested)\](?:\s*([\s\S]*?)(?:\s*\[\/(?:unverified|contested)\])|([^[\n.!?]*[.!?]?))/g;
      const out: any[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      let i = 0;
      while ((m = tagRegex.exec(text)) !== null) {
        if (m.index > last) out.push(<span key={`t${i++}`}>{text.slice(last, m.index)}</span>);
        const tag = m[1];
        const inner = (m[2] || m[3] || '').trim();
        const cls = tag === 'contested'
          ? (isDark ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40' : 'bg-amber-50 text-amber-800 border border-amber-300')
          : (isDark ? 'bg-red-500/15 text-red-300 border border-red-500/40' : 'bg-red-50 text-red-800 border border-red-300');
        out.push(
          <span key={`u${i++}`} className={`inline px-1 py-0.5 rounded ${cls}`} title={tag === 'contested' ? 'Models disagreed on this claim' : 'This claim could not be verified'}>
            <span className="text-[9px] font-bold uppercase mr-1 opacity-70">{tag}</span>{inner}
          </span>
        );
        last = m.index + m[0].length;
      }
      if (last < text.length) out.push(<span key={`t${i++}`}>{text.slice(last)}</span>);
      return out.length ? out : text;
    };
    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
      return <span style={{ whiteSpace: 'pre-wrap' }}>{renderTextWithTags(content)}</span>;
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
  const { data: userWorkgroups = [] } = useQuery<any[]>({ queryKey: ['/api/workgroups'] });
  // Deep Think + confidence reasoning are RESEARCH-EXCLUSIVE features.
  // Gate all paid UI off the live subscription data (not the stale user object).
  const userTier = (subscriptionData?.tier || (user as any)?.tier || 'free') as string;
  const isPaidPro = userTier === 'pro' || userTier === 'research' || userTier === 'enterprise' || (user as any)?.isEmployee === true;
  const isResearchOrAbove = userTier === 'research' || userTier === 'enterprise' || (user as any)?.isEmployee === true;
  const isEnterpriseTier = userTier === 'enterprise' || (user as any)?.isEmployee === true;
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
    if ((!messageContent.trim() && !attachedImage) || sendMessageMutation.isPending) return;
    const convId = await getOrCreateConversationId();
    if (!convId) return;
    setIsTyping(true);
    const imgToSend = attachedImage;
    setAttachedImage(null);
    sendMessageMutation.mutate({ content: messageContent.trim() || (imgToSend ? "What's in this image?" : ""), convId, imageDataUrl: imgToSend });
  };

  const getQuestionForResponse = (messageIndex: number): string => {
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return '';
  };

  const handleShareToWorkgroup = async () => {
    if (!showShareModal || !shareWgId) return;
    setShareSending(true);
    try {
      if (shareMode === 'ticket') {
        const subject = ticketSubject.trim() || showShareModal.question.slice(0, 100);
        const context = `**AI Q&A Context:**\n\nQ: ${showShareModal.question}\n\nA: ${showShareModal.answer}`;
        await apiRequest('POST', `/api/workgroups/${shareWgId}/support-tickets`, {
          subject,
          context,
          priority: 'normal',
        });
        toast({ title: "Support ticket created in workgroup" });
      } else {
        await apiRequest('POST', `/api/workgroups/${shareWgId}/share-qa`, {
          question: showShareModal.question,
          answer: showShareModal.answer,
          mode: shareMode,
        });
        toast({ title: shareMode === 'approval' ? "Submitted for approval" : "Shared to workgroup" });
      }
      setShowShareModal(null);
      setShareWgId(null);
      setShareMode('message');
      setTicketSubject("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to share", variant: "destructive" });
    }
    setShareSending(false);
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
        streamingText={streamingText}
        autoDowngraded={autoDowngraded}
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
        showDailyLimitModal={showDailyLimitModal}
        setShowDailyLimitModal={setShowDailyLimitModal}
        messagesEndRef={messagesEndRef}
        renderMessageContent={renderMessageContent}
        formatTimestamp={formatTimestamp}
        verifiedMessages={verifiedMessages}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-[100dvh] relative"
      style={{ background: 'var(--chat-outer-bg)' }}
      onDragEnter={handleChatDragEnter}
      onDragLeave={handleChatDragLeave}
      onDragOver={handleChatDragOver}
      onDrop={handleChatDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none p-6">
          <div className={`w-full h-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-emerald-500/10 border-emerald-400 text-emerald-200' : 'bg-emerald-50 border-emerald-500 text-emerald-700'}`}>
            <Upload className="h-12 w-12" />
            <div className="text-lg font-semibold">Drop your file to upload</div>
            <div className="text-sm opacity-75">Images get analyzed in chat • Documents open in the analysis panel</div>
          </div>
        </div>
      )}
      <header className="px-3 sm:px-5 py-2.5 relative z-40 shrink-0" style={{ background: 'var(--chat-header-bg)' }}>
        <div className="flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer group">
              <img src={turboLogo} alt="TurboAnswer" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover group-hover:opacity-80 transition-opacity" />
              <h1 className={`text-base sm:text-lg font-medium truncate ${isDark ? 'text-[#e3e3e3]' : 'text-gray-900'} group-hover:opacity-80 transition-opacity`}>TurboAnswer</h1>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Select value={selectedAIModel} onValueChange={handleModelChange}>
              <SelectTrigger className={`w-24 sm:w-32 h-8 text-[10px] sm:text-xs rounded-full ${isDark ? 'bg-[#1e1f20] border-[#3c4043] text-[#c4c7c5]' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-flash">Free (Basic AI)</SelectItem>
                {isPaidPro && <SelectItem value="gemini-pro">Pro (Advanced)</SelectItem>}
                {isResearchOrAbove && <SelectItem value="claude-research">Research (Matrix AI)</SelectItem>}
                {isEnterpriseTier && <SelectItem value="enterprise-research">Enterprise</SelectItem>}
                {!isPaidPro && <SelectItem value="gemini-pro">Pro $6.99 — Upgrade</SelectItem>}
                {!isResearchOrAbove && <SelectItem value="claude-research">Research $30 — Upgrade</SelectItem>}
                {!isEnterpriseTier && <SelectItem value="enterprise-research">Enterprise $100 — Upgrade</SelectItem>}
              </SelectContent>
            </Select>

            {isResearchOrAbove && selectedAIModel !== 'gemini-flash' && selectedAIModel !== 'gemini-pro' && (
              <button
                onClick={() => setDeepThink(v => !v)}
                title={deepThink ? "Deep Think ON — forces full Matrix AI reasoning + verification" : "Deep Think OFF — Matrix AI auto-decides fast vs deep"}
                className={`h-8 px-2 sm:px-3 flex items-center gap-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors ${
                  deepThink
                    ? (isDark ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-200' : 'bg-emerald-100 border border-emerald-400 text-emerald-700')
                    : (isDark ? 'bg-[#1e1f20] border border-[#3c4043] text-[#8e918f] hover:text-[#c4c7c5]' : 'bg-gray-100 border border-gray-300 text-gray-500 hover:text-gray-900')
                }`}
                data-testid="button-deep-think"
              >
                <Brain className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deep Think</span>
                {deepThinkUsageQuery.data && deepThinkUsageQuery.data.limit !== -1 && (
                  <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    deepThinkUsageQuery.data.used >= deepThinkUsageQuery.data.limit
                      ? 'bg-red-500/20 text-red-500'
                      : (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-200 text-emerald-800')
                  }`} data-testid="deep-think-quota">
                    {Math.max(0, deepThinkUsageQuery.data.limit - deepThinkUsageQuery.data.used)}/{deepThinkUsageQuery.data.limit}
                  </span>
                )}
              </button>
            )}

            <button onClick={toggleTheme} className={`h-8 w-8 flex items-center justify-center rounded-full ${isDark ? 'text-[#c4c7c5] hover:bg-[#1e1f20]' : 'text-gray-600 hover:bg-gray-200'}`} title="Toggle theme">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="hidden sm:flex items-center gap-0.5">
              <Link href="/media-editor">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="Media Editor">
                  <Scissors className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/photo-editor">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="AI Scanner">
                  <Camera className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/video-studio">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="Video Studio">
                  <Film className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/workgroups">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="Workgroups">
                  <Users className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/collab">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="Collab AI Rooms">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </Link>

              <Button onClick={() => setShowQR(!showQR)} variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${showQR ? 'text-[#8ab4f8]' : isDark ? 'text-[#8e918f]' : 'text-gray-500'} ${isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-gray-100'}`} title="QR Code">
                <QrCode className="h-4 w-4" />
              </Button>
              {user?.isEmployee && (
                <Link href="/employee/dashboard">
                  <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full text-red-400 hover:text-red-300 ${isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-gray-100'}`} title="Admin Panel">
                    <Shield className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {user?.isBetaTester && (
                <Link href="/beta-feedback">
                  <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full text-emerald-400 hover:text-emerald-300 ${isDark ? 'hover:bg-[#1e1f20]' : 'hover:bg-gray-100'}`} title="Beta Feedback (3 questions)" data-testid="link-beta-feedback">
                    <ClipboardCheck className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link href="/crisis-support">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="Crisis Support">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/ai-settings">
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-[#e3e3e3] hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`} title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button onClick={() => logout()} variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-full ${isDark ? 'text-[#8e918f] hover:text-red-400 hover:bg-[#1e1f20]' : 'text-gray-500 hover:text-red-400 hover:bg-gray-100'}`} title="Logout">
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

      {/* Free tier upgrade banner */}
      {isFreeTier && showUpgradeBanner && (
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 px-3 sm:px-5 py-2.5 relative z-30 shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-white flex-shrink-0" />
              <p className="text-white text-xs sm:text-sm font-medium truncate">
                You're on Basic AI · Upgrade for longer answers, live search & verified results
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
            <Button onClick={() => { setShowDocumentUpload(false); setDroppedDocFile(null); }} variant="ghost" size="sm" className={isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DocumentUpload conversationId={currentConversationId ?? undefined} onAnalysisComplete={(a) => { setDroppedDocFile(null); handleDocumentAnalysis(a); }} initialFile={droppedDocFile} />
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
      <div className="flex-1 overflow-y-auto relative z-10" style={{ background: 'var(--chat-msg-bg)' }}>
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
          {messages.length === 0 && !isTyping && (() => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            const displayName = user?.firstName || user?.email?.split("@")[0] || "there";
            const suggestions = [
              { icon: <Code2 className="h-4 w-4" />, text: "Help me write code", prompt: "Can you help me analyze and improve my code?" },
              { icon: <FileText className="h-4 w-4" />, text: "Draft an email", prompt: "Help me draft a professional email" },
              { icon: <Brain className="h-4 w-4" />, text: "Explain a concept", prompt: "Explain a complex concept to me in simple terms" },
              { icon: <Sparkles className="h-4 w-4" />, text: "Brainstorm ideas", prompt: "Help me brainstorm creative ideas" },
            ];
            return (
            <div className="flex flex-col items-start py-16 sm:py-24 relative">
              <style>{`
                @keyframes gemini-gradient { 0% { background-position: 0% center; } 50% { background-position: 200% center; } 100% { background-position: 0% center; } }
              `}</style>
              <div className="relative z-10 w-full">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.15] mb-3 tracking-tight" style={{
                  background: "linear-gradient(90deg, #4285F4 0%, #9B72CB 50%, #D96570 100%)",
                  backgroundSize: "100% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  {greeting}, {displayName}
                </h1>
                <p className={`text-2xl sm:text-3xl lg:text-4xl font-medium mb-12 ${isDark ? 'text-[#444746]' : 'text-gray-300'}`}>
                  How can I help you today?
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setMessageContent(s.prompt)}
                      className={`group relative rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-lg ${isDark ? 'bg-[#1e1f20] border border-[#3c4043] hover:bg-[#282a2c]' : 'bg-gray-50 border border-gray-200 hover:bg-white hover:border-gray-300'}`}
                    >
                      <div className={`mb-3 ${isDark ? 'text-[#8e918f]' : 'text-gray-400'}`}>
                        {s.icon}
                      </div>
                      <p className={`text-sm ${isDark ? 'text-[#c4c7c5]' : 'text-gray-700'}`}>{s.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            );
          })()}

          {/* Messages */}
          {messages.map((message, msgIdx) => (
            <div key={message.id} className={`flex items-end gap-2 sm:gap-3 ${msgSpacingClass} ${message.role === 'user' ? 'justify-end' : ''} ${animationsPref ? 'transition-all' : ''}`}>
              {message.role === 'assistant' && (
                <img src={turboLogo} alt="AI" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" />
              )}

              <div className={`min-w-0 ${message.role === 'user' ? 'max-w-[80%] sm:max-w-lg' : 'max-w-[85%] sm:max-w-2xl'}`}>
                <div
                  className={`${msgFontClass} leading-relaxed break-words ${getBubbleClass(message.role)}`}
                  style={message.role !== 'user' && bubbleStylePref !== 'minimal' ? { background: 'var(--chat-bubble-ai-bg)', color: 'var(--chat-bubble-ai-text)', border: '1px solid var(--chat-bubble-ai-border)' } : message.role !== 'user' ? { color: 'var(--chat-bubble-ai-text)' } : undefined}
                >
                  {renderMessageContent(message.content, message.role)}
                </div>
                <div className={`flex items-center gap-2 mt-1 ${message.role === 'user' ? 'justify-end mr-1' : 'ml-1'}`}>
                  {isResearchOrAbove && message.role === 'assistant' && verifiedMessages[message.id] && verifiedMessages[message.id] !== "unknown" && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-colors ${verifiedMessages[message.id] === "verified" ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}
                      title={verifiedMessages[message.id] === "verified" ? "Verified by Matrix AI" : "Matrix AI could not fully verify this answer — treat with caution"}
                      data-testid={`badge-verified-${message.id}`}
                    >
                      {verifiedMessages[message.id] === "verified" ? (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor" opacity="0.15"/><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Verified</>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.6"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> Unverified</>
                      )}
                    </span>
                  )}
                  {isResearchOrAbove && message.role === 'assistant' && typeof confidenceMessages[message.id] === 'number' && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        confidenceMessages[message.id] >= 80 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
                        : confidenceMessages[message.id] >= 50 ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                        : 'text-red-500 bg-red-500/10 border-red-500/30'
                      }`}
                      title="Confidence score from the verification pass"
                      data-testid={`confidence-${message.id}`}
                    >
                      {confidenceMessages[message.id]}% confidence
                    </span>
                  )}
                  {message.role === 'assistant' && reasoningTraces[message.id] && (
                    <button
                      onClick={() => setExpandedReasoning(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${isDark ? 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'}`}
                      data-testid={`toggle-reasoning-${message.id}`}
                    >
                      <Brain className="h-3 w-3" />
                      {expandedReasoning[message.id] ? 'Hide reasoning' : 'See reasoning'}
                    </button>
                  )}
                  {showTimestampsPref && (
                    <span className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                      {formatTimestamp(message.timestamp)}
                    </span>
                  )}
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => handleFactCheck(message.id, message.content)}
                      disabled={factCheckLoading[message.id]}
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
                        factChecks[message.id]
                          ? factChecks[message.id].verdict === 'VERIFIED' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : factChecks[message.id].verdict === 'UNVERIFIED' ? 'text-red-400 bg-red-500/10 border border-red-500/20'
                            : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                          : isDark ? 'text-zinc-500 hover:text-cyan-400 hover:bg-white/5' : 'text-gray-400 hover:text-cyan-600 hover:bg-gray-100'
                      }`}
                      title="Verify this response with Matrix AI"
                    >
                      {factCheckLoading[message.id] ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /><span>Checking...</span></>
                      ) : factChecks[message.id] ? (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span>{factChecks[message.id].confidenceScore}% · {factChecks[message.id].verdict.replace(/_/g, ' ')}</span></>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><span>Fact Check</span></>
                      )}
                    </button>
                  )}
                  {message.role === 'assistant' && userWorkgroups.length > 0 && (
                    <button
                      onClick={() => {
                        const q = getQuestionForResponse(msgIdx);
                        setShowShareModal({ question: q, answer: message.content });
                        setShareWgId(userWorkgroups[0]?.id || null);
                      }}
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${isDark ? 'text-zinc-500 hover:text-[#8ab4f8] hover:bg-white/5' : 'text-gray-400 hover:text-blue-500 hover:bg-gray-100'}`}
                      title="Send to Workgroup"
                    >
                      <Users className="h-3 w-3" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
                {isResearchOrAbove && message.role === 'assistant' && expandedReasoning[message.id] && reasoningTraces[message.id] && (
                  <div className={`mt-2 rounded-xl p-3 text-xs ${isDark ? 'bg-zinc-900/60 border border-emerald-700/30' : 'bg-emerald-50/50 border border-emerald-200'}`} data-testid={`reasoning-trace-${message.id}`}>
                    <div className={`flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      <Brain className="h-3 w-3" /> Reasoning trace
                      <span className={`ml-auto text-[10px] font-normal ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        Mode: {reasoningTraces[message.id].mode} • {reasoningTraces[message.id].confidence}% confidence
                      </span>
                    </div>
                    <ol className="space-y-1 mb-2">
                      {reasoningTraces[message.id].stages.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className={`mt-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[8px] flex-shrink-0 ${
                            s.status === 'done' ? 'bg-emerald-500 text-white'
                            : s.status === 'error' ? 'bg-red-500 text-white'
                            : s.status === 'skipped' ? 'bg-gray-400 text-white'
                            : 'bg-gray-300 text-gray-600'
                          }`}>{s.status === 'done' ? '✓' : s.status === 'error' ? '!' : '·'}</span>
                          <span className={`${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                            <span className="font-medium">{s.label}</span>
                            {s.detail && <span className={`ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>— {s.detail}</span>}
                          </span>
                        </li>
                      ))}
                    </ol>
                    {reasoningTraces[message.id].panel.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {reasoningTraces[message.id].panel.map((p, i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{p.model}</span>
                        ))}
                      </div>
                    )}
                    {reasoningTraces[message.id].sources.length > 0 && (
                      <div>
                        <div className={`text-[9px] uppercase font-bold mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Sources</div>
                        <ul className="space-y-0.5">
                          {reasoningTraces[message.id].sources.slice(0, 5).map((s, i) => (
                            <li key={i} className="text-[11px] truncate">
                              <span className="opacity-50 mr-1">[{i + 1}]</span>
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${isDark ? 'text-emerald-400 hover:underline' : 'text-emerald-700 hover:underline'}`}>{s.title}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {showFactCheck === message.id && factChecks[message.id] && (
                  <div className={`mt-2 rounded-xl p-4 text-xs ${isDark ? 'bg-[#0a0f1a] border border-[#1a2a3a]' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={
                          factChecks[message.id].verdict === 'VERIFIED' ? 'text-emerald-400' : factChecks[message.id].verdict === 'UNVERIFIED' ? 'text-red-400' : 'text-amber-400'
                        }><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                        <span className="font-semibold">AI Fact-Check Report</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          factChecks[message.id].verdict === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400'
                          : factChecks[message.id].verdict === 'UNVERIFIED' ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                        }`}>{factChecks[message.id].verdict.replace(/_/g, ' ')}</span>
                      </div>
                      <button onClick={() => setShowFactCheck(null)} className={`${isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-black'} transition-colors`}>✕</button>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={isDark ? 'text-zinc-400' : 'text-gray-600'}>Confidence:</span>
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`}>
                          <div className={`h-full rounded-full transition-all ${
                            factChecks[message.id].confidenceScore >= 70 ? 'bg-emerald-500'
                            : factChecks[message.id].confidenceScore >= 40 ? 'bg-amber-500'
                            : 'bg-red-500'
                          }`} style={{ width: `${factChecks[message.id].confidenceScore}%` }} />
                        </div>
                        <span className="font-bold">{factChecks[message.id].confidenceScore}%</span>
                      </div>
                    </div>
                    {factChecks[message.id].summary && (
                      <p className={`mb-3 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>{factChecks[message.id].summary}</p>
                    )}
                    <div className="space-y-2">
                      {(Array.isArray(factChecks[message.id].claims) ? factChecks[message.id].claims : []).map((claim: any, ci: number) => (
                        <div key={ci} className={`rounded-lg p-2.5 ${isDark ? 'bg-black/40 border border-[#222]' : 'bg-white border border-gray-200'}`}>
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              claim.status === 'verified' ? 'bg-emerald-500/20 text-emerald-400'
                              : claim.status === 'unverified' ? 'bg-red-500/20 text-red-400'
                              : claim.status === 'opinion' ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-zinc-500/20 text-zinc-400'
                            }`}>{claim.status?.replace(/_/g, ' ').toUpperCase()}</span>
                            <div>
                              <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{claim.claim}</p>
                              {claim.explanation && <p className={`mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{claim.explanation}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-zinc-700' : 'bg-gray-300'}`}>
                  <User className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDark ? 'text-zinc-300' : 'text-gray-600'}`} />
                </div>
              )}
            </div>
          ))}

          {/* Live streaming assistant bubble (token-by-token) */}
          {isTyping && streamingText && (
            <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-5" data-testid="streaming-bubble">
              <div className="relative flex-shrink-0">
                <img src={turboLogo} alt="AI" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 animate-pulse" style={{ borderColor: isDark ? '#18181b' : '#fff' }} />
              </div>
              <div className="flex-1 max-w-2xl">
                {autoDowngraded && isResearchOrAbove && (
                  <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }} data-testid="auto-downgrade-badge">
                    <Zap className="h-3 w-3" />
                    Auto-routed to fast — toggle Deep Think for verified deep reasoning
                  </div>
                )}
                <div className={`rounded-2xl rounded-bl-md px-4 py-3 ${isDark ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-100' : 'bg-white border border-gray-200 shadow-sm text-gray-900'}`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words leading-relaxed">
                    {streamingText}
                    <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator + live reasoning panel */}
          {isTyping && reasoningStages.length > 0 && (
            <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-5" data-testid="reasoning-panel">
              <div className="relative flex-shrink-0">
                <img src={turboLogo} alt="AI" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 animate-pulse" style={{ borderColor: isDark ? '#18181b' : '#fff' }} />
              </div>
              <div className={`flex-1 max-w-2xl rounded-2xl rounded-bl-md p-4 ${isDark ? 'bg-zinc-900/80 border border-emerald-700/30' : 'bg-white border border-emerald-200 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className={`h-4 w-4 ${isResearchOrAbove && reasoningMode === 'deep' ? 'text-emerald-500 animate-pulse' : 'text-blue-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {isResearchOrAbove
                      ? (reasoningMode === 'deep' ? 'Deep Reasoning' : reasoningMode === 'fast' ? 'Fast Mode' : 'Thinking…')
                      : 'Thinking…'}
                  </span>
                  {isResearchOrAbove && quotaWarning && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40">
                      Deep Think quota reached ({quotaWarning.used}/{quotaWarning.limit}) — using fast mode
                    </span>
                  )}
                </div>
                <ol className="space-y-1.5">
                  {reasoningStages.map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        s.status === 'done' ? 'bg-emerald-500 text-white' :
                        s.status === 'active' ? 'bg-blue-500 text-white animate-pulse' :
                        s.status === 'error' ? 'bg-red-500 text-white' :
                        isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {s.status === 'done' ? '✓' : s.status === 'error' ? '!' : '·'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{s.label}</div>
                        {s.detail && (
                          <div className={`text-[11px] truncate ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{s.detail}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {reasoningPanel.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
                    <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Matrix AI cores engaged</div>
                    <div className="flex flex-wrap gap-1.5">
                      {reasoningPanel.map((p, i) => (
                        <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {p.model}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {reasoningSources.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${isDark ? 'border-zinc-700/50' : 'border-gray-200'}`}>
                    <div className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Live sources</div>
                    <ul className="space-y-1">
                      {reasoningSources.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-[11px] truncate">
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${isDark ? 'text-emerald-400 hover:underline' : 'text-emerald-700 hover:underline'}`}>
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {isTyping && reasoningStages.length === 0 && (
            <div className="flex items-end gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="relative flex-shrink-0">
                <img src={turboLogo} alt="AI" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 animate-pulse" style={{ borderColor: isDark ? '#18181b' : '#fff' }} />
              </div>
              <div className={`px-4 py-3 rounded-2xl rounded-bl-md relative overflow-hidden ${isDark ? 'bg-zinc-800/80 border border-zinc-700/50' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <style>{`
                  @keyframes turbo-bounce { 0%,80%,100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; } }
                  @keyframes turbo-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                  @keyframes turbo-glow { 0%,100% { box-shadow: 0 0 8px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 16px rgba(168,85,247,0.5); } }
                  @keyframes turbo-gradient-text { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
                `}</style>
                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ animation: animationsPref ? 'turbo-glow 2s ease-in-out infinite' : 'none' }}>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.08) 50%, transparent 100%)', animation: animationsPref ? 'turbo-shimmer 2s ease-in-out infinite' : 'none' }} />
                </div>
                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="flex gap-1">
                    {[
                      { color: '#818cf8', delay: '0s' },
                      { color: '#a78bfa', delay: '0.15s' },
                      { color: '#c084fc', delay: '0.3s' },
                      { color: '#e879f9', delay: '0.45s' },
                    ].map((dot, i) => (
                      <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: dot.color, animation: animationsPref ? `turbo-bounce 1.4s ease-in-out ${dot.delay} infinite` : 'none', opacity: animationsPref ? 1 : 1 - i * 0.15 }} />
                    ))}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`} style={{ background: animationsPref ? 'linear-gradient(90deg, #818cf8, #c084fc, #818cf8)' : 'none', backgroundSize: '200% auto', WebkitBackgroundClip: animationsPref ? 'text' : 'unset', WebkitTextFillColor: animationsPref ? 'transparent' : 'inherit', animation: animationsPref ? 'turbo-gradient-text 3s linear infinite' : 'none' }}>
                    Generating response...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-3 sm:p-4 shrink-0" style={{ background: 'var(--chat-outer-bg)' }}>
        <div className="max-w-3xl mx-auto">
          {attachedImage && (
            <div className="mb-2">
              <div className="relative inline-block">
                <img
                  src={attachedImage}
                  alt="Attached"
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 ${isDark ? 'border-[#3c4043]' : 'border-gray-200'}`}
                />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-zinc-900 text-white flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-[#1e1f20]"
                  aria-label="Remove image"
                  data-testid="button-remove-image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageFile(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            data-testid="input-image-file"
          />
          <input
            ref={docFileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx,.xlsx,.pptx,.csv,.json,.md,.html,.xml,.rtf,.png,.jpg,.jpeg,.webp,.gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) routeIncomingFile(f);
              if (docFileInputRef.current) docFileInputRef.current.value = "";
            }}
            data-testid="input-doc-file"
          />
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePasteImage}
                placeholder={attachedImage ? "Ask about this image..." : "Enter a prompt here"}
                className={`w-full pl-[5.5rem] pr-14 py-3.5 rounded-3xl text-sm sm:text-base resize-none min-h-[52px] max-h-28 transition-colors ${
                  isDark
                    ? 'bg-[#1e1f20] border-[#3c4043] text-[#e3e3e3] placeholder-[#8e918f] focus:ring-1 focus:ring-[#8ab4f8]/40 focus:border-[#8ab4f8]/50'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-400'
                }`}
                rows={1}
              />
              <button
                onClick={() => docFileInputRef.current?.click()}
                disabled={sendMessageMutation.isPending}
                className={`absolute left-2.5 bottom-2.5 h-9 w-9 p-0 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
                  isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Upload a file (PDF, DOCX, image, etc.) or drop one onto the chat"
                data-testid="button-attach-file"
                type="button"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sendMessageMutation.isPending}
                className={`absolute left-12 bottom-2.5 h-9 w-9 p-0 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 ${
                  isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-gray-200 text-gray-600'
                }`}
                title="Attach image (or paste with Ctrl+V)"
                data-testid="button-attach-image"
                type="button"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <Button
                onClick={handleSendWithPromo}
                disabled={(!messageContent.trim() && !attachedImage) || sendMessageMutation.isPending}
                className={`absolute right-2.5 bottom-2.5 h-9 w-9 p-0 rounded-full disabled:opacity-30 transition-colors ${
                  isDark
                    ? 'bg-[#8ab4f8] text-[#131314] hover:bg-[#aecbfa]'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={`flex items-center justify-center mt-2 text-[11px] ${isDark ? 'text-[#8e918f]' : 'text-gray-400'}`}>
            <span>TurboAnswer may display inaccurate info, including about people, so double-check its responses.</span>
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
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Unlock Advanced AI</p>
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
              {["7 days free — cancel anytime", "Advanced AI (Gemini Flash vs basic Lite)", "Longer, detailed answers (5x more)", "Live web search for current events", "Verified answer badges", "AI image generation (DALL-E 3)", "Unlimited questions (vs 15/day free)"].map((text, i) => (
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
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Matrix AI Research · Maximum Intelligence · Video Studio</p>
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
              {["7 days free — cancel anytime", "🧠 Matrix AI Research — cited & verified answers", "🎬 AI Video Studio", "Everything in Pro + Free included"].map((text, i) => (
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
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>Matrix AI Research · For up to 5 team members</p>
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
              {["7 days free — cancel anytime", "🧠 Matrix AI Research — cited & verified answers", "🎬 AI Video Studio", "All Research features included", "Shareable 6-digit team code (up to 5 members)", "Save 44% vs 5 individual Research plans"].map((text, i) => (
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
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Matrix AI Research</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Select "Research $30" to unlock maximum depth on every response</p>
                      </div>
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Zap className="w-4 h-4 text-purple-400" /></div>
                      <div>
                        <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Advanced AI Included</p>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>You also get access to our Pro AI model for fast, detailed answers</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"><Brain className="w-4 h-4 text-purple-400" /></div>
                    <div>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Advanced Pro AI Model</p>
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
      {showDailyLimitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDailyLimitModal(false)}>
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-2xl max-w-sm w-full p-6 relative overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent pointer-events-none" />
            <button onClick={() => setShowDailyLimitModal(false)} className={`absolute top-3 right-3 z-10 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <X className="h-5 w-5" />
            </button>
            <div className="relative text-center mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                <Zap className="text-white h-8 w-8" />
              </div>
              <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Daily Limit Reached</h2>
              <p className={isDark ? 'text-zinc-400 text-sm' : 'text-gray-500 text-sm'}>You've used all 25 free questions for today</p>
            </div>
            <div className="relative space-y-3 mb-5">
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  Your free questions reset at <strong>midnight</strong> in your time zone. Or upgrade to Pro for <strong>unlimited questions</strong> every day.
                </p>
              </div>
              {[
                { icon: <Sparkles className="w-4 h-4 text-yellow-400" />, title: "Unlimited Questions", desc: "No daily caps — ask as much as you want" },
                { icon: <Brain className="w-4 h-4 text-purple-400" />, title: "Matrix AI", desc: "A new era of intelligence" },
                { icon: <Zap className="w-4 h-4 text-cyan-400" />, title: "Priority Speed", desc: "Faster responses, always" },
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
              className={`w-full text-center text-xs mt-3 py-1 ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              I'll wait until tomorrow
            </button>
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
                { icon: <Zap className="w-4 h-4 text-yellow-400" />, title: "Faster Responses", desc: "Priority speed with advanced AI" },
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

      {/* Share to Workgroup Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(null)}>
          <div className={`${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'} border rounded-2xl max-w-sm w-full p-5 relative`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowShareModal(null)} className={`absolute top-3 right-3 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Users className={`h-5 w-5 ${isDark ? 'text-[#8ab4f8]' : 'text-blue-500'}`} />
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Send to Workgroup</h3>
            </div>

            <div className={`rounded-xl border p-3 mb-4 text-xs max-h-32 overflow-y-auto ${isDark ? 'border-zinc-700 bg-zinc-800/50 text-zinc-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              <p className="font-medium mb-1">Q: {showShareModal.question.slice(0, 120)}{showShareModal.question.length > 120 ? '...' : ''}</p>
              <p className="opacity-70">A: {showShareModal.answer.slice(0, 200)}{showShareModal.answer.length > 200 ? '...' : ''}</p>
            </div>

            <div className="mb-3">
              <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Select workgroup</label>
              <select
                value={shareWgId || ''}
                onChange={e => setShareWgId(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                {userWorkgroups.map((wg: any) => (
                  <option key={wg.id} value={wg.id}>{wg.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Send as</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShareMode('message')}
                  className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors border ${shareMode === 'message' ? (isDark ? 'bg-[#4285F4]/20 border-[#4285F4] text-[#8ab4f8]' : 'bg-blue-50 border-blue-400 text-blue-600') : (isDark ? 'border-zinc-700 text-zinc-400' : 'border-gray-200 text-gray-500')}`}
                >
                  Message
                </button>
                <button
                  onClick={() => setShareMode('approval')}
                  className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors border ${shareMode === 'approval' ? (isDark ? 'bg-[#4285F4]/20 border-[#4285F4] text-[#8ab4f8]' : 'bg-blue-50 border-blue-400 text-blue-600') : (isDark ? 'border-zinc-700 text-zinc-400' : 'border-gray-200 text-gray-500')}`}
                >
                  Approval
                </button>
                <button
                  onClick={() => setShareMode('ticket')}
                  className={`flex-1 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors border ${shareMode === 'ticket' ? (isDark ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-amber-50 border-amber-400 text-amber-600') : (isDark ? 'border-zinc-700 text-zinc-400' : 'border-gray-200 text-gray-500')}`}
                >
                  Support Ticket
                </button>
              </div>
            </div>

            {shareMode === 'ticket' && (
              <div className="mb-3">
                <label className={`text-xs font-medium mb-1.5 block ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Ticket subject (optional)</label>
                <input
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder="Auto-filled from question if empty"
                  className={`w-full px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>
            )}

            {!showShareModal.question.trim() && (
              <p className={`text-xs mb-2 ${isDark ? 'text-yellow-400/70' : 'text-yellow-600'}`}>No question found for this response.</p>
            )}
            <Button
              onClick={handleShareToWorkgroup}
              disabled={!shareWgId || shareSending || (shareMode !== 'ticket' && !showShareModal.question.trim())}
              className={`w-full font-medium py-2.5 rounded-xl ${shareMode === 'ticket' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[#4285F4] hover:bg-[#5a9bf4] text-white'}`}
            >
              {shareSending ? 'Sending...' : shareMode === 'ticket' ? 'Create Support Ticket' : shareMode === 'approval' ? 'Submit for Approval' : 'Send to Group Chat'}
            </Button>
          </div>
        </div>
      )}

      {/* Beta Feedback Modal */}
      {showBetaFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg">Founding Tester Feedback</h3>
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
