import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Editor from "@monaco-editor/react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Play, Save, Rocket, ChevronLeft, Plus, Trash2, Globe, Copy,
  Code2, Terminal, Loader2, FileCode, Send, RefreshCw, X,
  ExternalLink, Check, Monitor, Wand2, Zap, Lock, FolderOpen,
  ChevronRight, Bot, User, Sparkles, ChevronDown, ShoppingCart, CreditCard,
  Key, Shield, Eye, EyeOff, Clock, Settings, Brain, Search, Paintbrush,
  Bug, Gauge, Cpu, Database, LayoutGrid,
} from "lucide-react";
import type { CodeProject } from "@shared/schema";

type CodeFile = { name: string; content: string; language: string };
type MsgRole = "user" | "assistant" | "system" | "building";

interface ChatMsg {
  id: string;
  role: MsgRole;
  content: string;
  buildPrompt?: string;
  buildPhase?: number;
  buildDone?: boolean;
  deployUrl?: string;
  files?: string[];
  discoveredFeatures?: string[];
}

const BUILD_PHASES = [
  "Searching the web for similar apps...",
  "Analyzing features from real apps...",
  "Architecting with multi-model AI...",
  "Writing HTML structure...",
  "Crafting CSS & animations...",
  "Building JavaScript logic...",
  "Auto-deploying to the web...",
  "Done!",
];

const AI_AGENTS = [
  { name: "Scout", role: "Web Research", icon: "Search", color: "#06b6d4" },
  { name: "Architect", role: "System Design", icon: "LayoutGrid", color: "#8b5cf6" },
  { name: "Builder", role: "HTML Structure", icon: "Code2", color: "#3b82f6" },
  { name: "Stylist", role: "CSS & Design", icon: "Paintbrush", color: "#ec4899" },
  { name: "Engineer", role: "JavaScript Logic", icon: "Cpu", color: "#f59e0b" },
  { name: "DataBot", role: "State & Storage", icon: "Database", color: "#10b981" },
  { name: "Debugger", role: "Error Detection", icon: "Bug", color: "#ef4444" },
  { name: "Optimizer", role: "Performance", icon: "Gauge", color: "#14b8a6" },
  { name: "Guardian", role: "Security Review", icon: "Shield", color: "#6366f1" },
  { name: "Deployer", role: "Ship & Publish", icon: "Rocket", color: "#f97316" },
];

const LONG_BUILD_PHASES = [
  { agents: [0], label: "Scout researching real apps on the web..." },
  { agents: [0, 1], label: "Architect analyzing features & designing system..." },
  { agents: [1, 2, 3], label: "Builder + Stylist writing HTML & CSS foundation..." },
  { agents: [2, 3, 4], label: "Engineer coding interactive JavaScript logic..." },
  { agents: [4, 5], label: "DataBot wiring state management & localStorage..." },
  { agents: [2, 3, 4, 5], label: "All builders collaborating on features..." },
  { agents: [6], label: "Debugger scanning for errors & fixing issues..." },
  { agents: [7], label: "Optimizer tuning performance & responsiveness..." },
  { agents: [8], label: "Guardian reviewing security & accessibility..." },
  { agents: [6, 7, 8], label: "Quality team running final improvements..." },
  { agents: [9], label: "Deployer shipping your app to the web..." },
  { agents: Array.from({length: 10}, (_, i) => i), label: "All 10 agents completed! App ready." },
];

function AgentIcon({ name, size = 14 }: { name: string; size?: number }) {
  const icons: Record<string, any> = { Search, LayoutGrid, Code2, Paintbrush, Cpu, Database, Bug, Gauge, Shield, Rocket };
  const Icon = icons[name] || Brain;
  return <Icon style={{ width: size, height: size }} />;
}

const EXAMPLE_PROMPTS = [
  "A finance expense tracker with charts",
  "A Kanban project manager like Trello",
  "A Snake game with high scores",
  "A social media dashboard with analytics",
  "A recipe finder and meal planner",
  "A workout tracker with progress charts",
  "A music player with playlist support",
  "A weather dashboard app",
];

function getMonacoLang(language: string): string {
  const map: Record<string, string> = {
    html: "html", css: "css", javascript: "javascript", typescript: "typescript",
    python: "python", java: "java", cpp: "cpp", c: "c", rust: "rust",
    go: "go", php: "php", ruby: "ruby",
  };
  return map[language] || "plaintext";
}

function buildSrcdoc(files: CodeFile[]): string {
  const htmlFile = files.find(f => f.name === "index.html") || files.find(f => f.language === "html");
  if (!htmlFile) return "<p style='font-family:sans-serif;padding:2rem;color:#888'>No HTML file found.</p>";
  let html = htmlFile.content;
  for (const file of files) {
    if (file.language === "css") {
      const cssRegex = new RegExp(`<link[^>]*href=["']${file.name}["'][^>]*>`, "gi");
      html = html.replace(cssRegex, `<style>${file.content}</style>`);
    }
    if (file.language === "javascript" && file.name !== "index.html") {
      const jsRegex = new RegExp(`<script[^>]*src=["']${file.name}["'][^>]*>\\s*</script>`, "gi");
      html = html.replace(jsRegex, `<script>${file.content}</script>`);
    }
  }
  return html;
}

function uid() { return Math.random().toString(36).slice(2); }
function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", margin: "8px 0", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 12px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 11, color: "#7c3aed", fontFamily: "monospace" }}>{lang || "code"}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ fontSize: 11, color: copied ? "#10b981" : "#666", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          {copied ? <><Check style={{ width: 11, height: 11 }} /> Copied</> : <><Copy style={{ width: 11, height: 11 }} /> Copy</>}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "12px 16px", background: "#0d0d14", overflowX: "auto", fontSize: 12.5, lineHeight: 1.6, fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
        <code style={{ color: "#a5f3fc" }}>{code}</code>
      </pre>
    </div>
  );
}

function renderMessage(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = lines.slice(1).join("\n");
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    return (
      <span key={i} style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
        {part.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((chunk, j) => {
          if (chunk.startsWith("**") && chunk.endsWith("**")) return <strong key={j} style={{ color: "#e0e0ff" }}>{chunk.slice(2, -2)}</strong>;
          if (chunk.startsWith("`") && chunk.endsWith("`")) return <code key={j} style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", padding: "1px 5px", borderRadius: 4, fontSize: "0.9em", fontFamily: "monospace" }}>{chunk.slice(1, -1)}</code>;
          return chunk;
        })}
      </span>
    );
  });
}

const C = {
  bg: "#0c0c12",
  sidebar: "#080810",
  panel: "#0f0f18",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.13)",
  text: "#e2e2ff",
  muted: "#52526a",
  accent: "#7c3aed",
  accentLight: "rgba(124,58,237,0.12)",
  cyan: "#06b6d4",
  green: "#10b981",
};

export default function CodeStudio() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CodeProject | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [showFileTree, setShowFileTree] = useState(true);

  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [outputErr, setOutputErr] = useState("");
  const [rightPanel, setRightPanel] = useState<"preview" | "output">("preview");
  const [livePreview, setLivePreview] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [customDomain, setCustomDomain] = useState("");

  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: uid(),
    role: "assistant",
    content: "Hi! I'm **Turbo Code Agent**.\n\nDescribe any app and I'll build it using real features from similar apps found on the web. Every button, form, and feature will actually work.",
  }]);
  const [input, setInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [buildingMsgId, setBuildingMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  const [promoCode, setPromoCode] = useState("");
  const [credits, setCredits] = useState<number | null>(null); // stored in cents
  const [nextReset, setNextReset] = useState<Date | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [selectedPack, setSelectedPack] = useState<number>(1000); // default $10
  const [lastBuildCost, setLastBuildCost] = useState<{ cents: number; tierLabel: string } | null>(null);
  const [longBuildEnabled, setLongBuildEnabled] = useState(false);
  const [autoBuyPack, setAutoBuyPack] = useState(1000);
  const [longBuildHours, setLongBuildHours] = useState(1);
  const [showLongBuildSettings, setShowLongBuildSettings] = useState(false);

  type SecretEntry = { id: number; key: string; createdAt?: string; updatedAt?: string };
  const [secrets, setSecrets] = useState<SecretEntry[]>([]);
  const [showSecrets, setShowSecrets] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [editingSecretId, setEditingSecretId] = useState<number | null>(null);
  const [editingSecretValue, setEditingSecretValue] = useState("");
  const [showSecretValues, setShowSecretValues] = useState<Record<number, string>>({});
  const [addingSecret, setAddingSecret] = useState(false);

  // Complexity-based pricing
  const COMPLEXITY_TIERS: Record<string, { label: string; emoji: string; cents: number; desc: string; color: string }> = {
    micro:    { label: "Micro",    emoji: "⚡", cents: 10,  desc: "Single widget or minimal UI", color: "#94a3b8" },
    simple:   { label: "Simple",   emoji: "🟢", cents: 35,  desc: "Small interactive app", color: "#22c55e" },
    standard: { label: "Standard", emoji: "🔵", cents: 75,  desc: "Full-featured app", color: "#3b82f6" },
    complex:  { label: "Complex",  emoji: "🟣", cents: 150, desc: "Advanced multi-feature app", color: "#a855f7" },
    advanced: { label: "Advanced", emoji: "🔴", cents: 300, desc: "Professional-grade application", color: "#ef4444" },
  };

  type ComplexityEstimate = { tier: string; label: string; emoji: string; cents: number; display: string; description: string };
  const [complexityEstimate, setComplexityEstimate] = useState<ComplexityEstimate | null>(null);
  const [pendingBuildPrompt, setPendingBuildPrompt] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Pack key = cents to add, price = USD charged
  const CREDIT_PACKS = [
    { cents: 500,   price: 5  },
    { cents: 1000,  price: 10 },
    { cents: 2500,  price: 25 },
    { cents: 5000,  price: 50 },
    { cents: 10000, price: 100 },
  ];

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const activeFileData = files.find(f => f.name === activeFile);
  const isWebProject = currentProject?.mainLanguage === "html";
  const hasProject = !!currentProject;

  useEffect(() => { if (isAuthenticated) loadProjects(); }, [isAuthenticated]);

  useEffect(() => {
    if (user?.codeStudioAddon) {
      fetch("/api/code/credits", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setCredits(d.credits);
            if (d.nextReset) setNextReset(new Date(d.nextReset));
          }
        })
        .catch(() => {});
      fetch("/api/code/long-build", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setLongBuildEnabled(d.longBuild);
            setAutoBuyPack(d.autoBuyPack || 1000);
            setLongBuildHours(d.hours || 1);
          }
        })
        .catch(() => {});
    }
  }, [user?.codeStudioAddon]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (isWebProject && files.length > 0) setLivePreview(buildSrcdoc(files));
  }, [files, isWebProject]);

  // Close project dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (projectsRef.current && !projectsRef.current.contains(e.target as Node)) setShowProjects(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("addon") === "activated") {
      const subId = params.get("subscription_id");
      if (subId) {
        fetch("/api/confirm-addon-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: subId }), credentials: "include" })
          .then(r => r.json()).then(d => {
            if (d.success) { queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); toast({ title: "Code Studio Activated!" }); }
            window.history.replaceState({}, "", "/code-studio");
          }).catch(() => {});
      } else { window.history.replaceState({}, "", "/code-studio"); }
    }
    // Credit pack purchase complete (returned from PayPal)
    if (params.get("creditSuccess") === "1") {
      const orderId = params.get("token");
      if (orderId) {
        fetch("/api/code/capture-credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }), credentials: "include" })
          .then(r => r.json()).then(d => {
            if (d.success) {
              setCredits(d.totalCredits);
              const added = (d.creditsAdded / 100).toFixed(2);
              const total = (d.totalCredits / 100).toFixed(2);
              toast({ title: `✅ $${added} budget added!`, description: `Your balance is now $${total}.` });
            }
          }).catch(() => {});
      }
      window.history.replaceState({}, "", "/code-studio");
    }
    if (params.get("creditCancelled") === "1") {
      toast({ title: "Purchase cancelled", description: "No charges were made." });
      window.history.replaceState({}, "", "/code-studio");
    }
  }, []);

  const isEnterprise = user?.subscriptionTier === 'enterprise' && user?.subscriptionStatus === 'active';

  const addonMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/create-addon-subscription"),
    onSuccess: async (res: any) => {
      const d = await res.json();
      if (d.free) {
        toast({ title: "🎉 Code Studio Activated!", description: "Included free with your Enterprise plan!" });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (d.url) {
        window.location.href = d.url;
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function buyCredits(packSize: number) {
    setBuyingCredits(true);
    try {
      const res = await fetch("/api/code/buy-credits", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: packSize }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to create order");
      if (d.approvalUrl) {
        // Redirect to PayPal for one-time payment
        window.location.href = d.approvalUrl;
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBuyingCredits(false);
    }
  }
  const promoMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/apply-code-studio-promo", { code: promoCode.trim() }),
    onSuccess: async (res: any) => {
      const d = await res.json();
      toast({ title: "Code Studio Activated!", description: d.message });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: any) => toast({ title: "Invalid Code", description: e.message, variant: "destructive" }),
  });

  async function loadProjects() {
    try {
      const res = await fetch("/api/code/projects", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) { setProjects(data); if (data.length > 0) openProject(data[0]); }
    } catch {}
  }

  function openProject(project: CodeProject) {
    setCurrentProject(project);
    const f = (project.files as CodeFile[]) || [];
    setFiles(f);
    setActiveFile(f[0]?.name || "");
    setUnsaved(false);
    setDeployUrl(project.isPublished && project.slug ? `/p/${project.slug}` : null);
    setRightPanel(project.mainLanguage === "html" ? "preview" : "output");
    setShowProjects(false);
    if (project.mainLanguage === "html") {
      setPreviewUrl(`/code-preview/${project.id}?t=${Date.now()}`);
    }
    loadSecrets(project.id);
  }

  async function loadSecrets(pid: number) {
    try {
      const res = await fetch(`/api/code/projects/${pid}/secrets`, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setSecrets(Array.isArray(data) ? data : []); }
    } catch { setSecrets([]); }
  }

  async function addSecret() {
    if (!currentProject || !newSecretKey.trim() || !newSecretValue.trim()) return;
    setAddingSecret(true);
    try {
      const res = await fetch(`/api/code/projects/${currentProject.id}/secrets`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newSecretKey.trim().toUpperCase(), value: newSecretValue.trim() }),
      });
      if (res.ok) { setNewSecretKey(""); setNewSecretValue(""); loadSecrets(currentProject.id); toast({ title: "Secret added" }); }
      else { const d = await res.json(); toast({ title: d.error || "Failed to add secret", variant: "destructive" }); }
    } catch {} finally { setAddingSecret(false); }
  }

  async function deleteSecret(id: number) {
    if (!currentProject) return;
    await fetch(`/api/code/projects/${currentProject.id}/secrets/${id}`, { method: "DELETE", credentials: "include" });
    setSecrets(s => s.filter(x => x.id !== id));
    setShowSecretValues(v => { const n = { ...v }; delete n[id]; return n; });
  }

  async function revealSecret(id: number) {
    if (!currentProject) return;
    if (showSecretValues[id]) { setShowSecretValues(v => { const n = { ...v }; delete n[id]; return n; }); return; }
    const res = await fetch(`/api/code/projects/${currentProject.id}/secrets/${id}/value`, { credentials: "include" });
    if (res.ok) { const d = await res.json(); setShowSecretValues(v => ({ ...v, [id]: d.value })); }
  }

  async function updateLongBuild(opts: { longBuild?: boolean; autoBuyPack?: number; hours?: number }) {
    const body = { longBuild: opts.longBuild ?? longBuildEnabled, autoBuyPack: opts.autoBuyPack ?? autoBuyPack, hours: opts.hours ?? longBuildHours };
    try {
      const res = await fetch("/api/code/long-build", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const d = await res.json();
        setLongBuildEnabled(d.longBuild);
        setAutoBuyPack(d.autoBuyPack);
        setLongBuildHours(d.hours || 1);
      }
    } catch {}
  }

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || agentLoading || isEstimating || complexityEstimate) return;
    setInput("");
    setAgentLoading(true);

    const userMsg: ChatMsg = { id: uid(), role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("/api/code/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, code: activeFileData?.content || "", language: activeFileData?.language || "html" }),
      });
      const data = await res.json();

      if (res.status === 402 && data.outOfCredits) {
        setCredits(data.credits ?? 0);
        setShowBuyCredits(true);
        setMessages(prev => [...prev, { id: uid(), role: "system", content: data.error || "Insufficient credits. Add budget to continue." }]);
        return;
      }
      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { id: uid(), role: "assistant", content: data.error || "AI is temporarily unavailable. Please try again." }]);
        return;
      }

      if (typeof data.creditsRemaining === 'number') setCredits(data.creditsRemaining);

      if (data.intent === "build") {
        const costNote = data.creditCost ? ` *(${formatDollars(data.creditCost)} charged)*` : '';
        const replyMsg: ChatMsg = { id: uid(), role: "assistant", content: (data.reply || "On it! Building now...") + costNote };
        setMessages(prev => [...prev, replyMsg]);
        await triggerBuild(data.buildPrompt, msg);
      } else if (data.reply) {
        const costNote = data.creditCost ? `\n\n*${formatDollars(data.creditCost)} charged · ${formatDollars(data.creditsRemaining ?? 0)} remaining*` : '';
        setMessages(prev => [...prev, { id: uid(), role: "assistant", content: data.reply + costNote }]);
      } else {
        await triggerBuild(msg, msg);
      }
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: "Connection error. Please check your connection and try again." }]);
    } finally {
      setAgentLoading(false);
    }
  }

  // Step 1: estimate complexity and show confirmation
  async function triggerBuild(buildPrompt: string, _originalMsg?: string) {
    setIsEstimating(true);
    try {
      const res = await fetch("/api/code/estimate-complexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: buildPrompt }),
      });
      const estimate: ComplexityEstimate = await res.json();
      setComplexityEstimate(estimate);
      setPendingBuildPrompt(buildPrompt);
    } catch {
      // fallback: use standard tier and proceed
      setComplexityEstimate({ tier: "standard", label: "Standard", emoji: "🔵", cents: 75, display: "$0.75", description: "Full-featured app" });
      setPendingBuildPrompt(buildPrompt);
    } finally {
      setIsEstimating(false);
    }
  }

  // Step 2: user confirmed → actually build
  async function confirmBuild() {
    if (!pendingBuildPrompt || !complexityEstimate) return;
    const buildPrompt = pendingBuildPrompt;
    const agreedCostCents = complexityEstimate.cents;
    const tierLabel = complexityEstimate.label;

    setComplexityEstimate(null);
    setPendingBuildPrompt(null);

    const buildMsgId = uid();
    setBuildingMsgId(buildMsgId);
    setMessages(prev => [...prev, { id: buildMsgId, role: "building", content: "", buildPrompt, buildPhase: 0, buildDone: false }]);

    let phase = 0;
    const phaseInterval = setInterval(() => {
      phase = Math.min(phase + 1, LONG_BUILD_PHASES.length - 2);
      setMessages(prev => prev.map(m => m.id === buildMsgId ? { ...m, buildPhase: phase } : m));
    }, 2500);

    try {
      const res = await fetch("/api/code/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: buildPrompt, projectId: undefined, agreedCostCents }),
      });
      const data = await res.json();
      clearInterval(phaseInterval);

      if (res.status === 402 && data.outOfCredits) {
        const bal = data.creditsDisplay || formatDollars(data.credits ?? 0);
        setMessages(prev => prev.map(m => m.id === buildMsgId ? {
          ...m, buildDone: true, content: `Insufficient balance (${bal} remaining — this build costs ${formatDollars(agreedCostCents)}). Add budget to keep building!`, role: "system",
        } : m));
        setBuildingMsgId(null);
        setCredits(data.credits ?? 0);
        setShowBuyCredits(true);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Build failed");

      const generatedFiles: CodeFile[] = data.files;
      const project: CodeProject = data.project;
      const liveUrl: string | null = data.publishUrl || null;

      setCurrentProject(project);
      setProjects(p => [project, ...p.filter(pr => pr.id !== project.id)]);
      setFiles(generatedFiles);
      setActiveFile(generatedFiles[0]?.name || "");
      setDeployUrl(liveUrl);
      setUnsaved(false);

      if (project.mainLanguage === "html") {
        await delay(300);
        setLivePreview(buildSrcdoc(generatedFiles));
        setPreviewUrl(`/code-preview/${project.id}?t=${Date.now()}`);
        setPreviewKey(k => k + 1);
        setRightPanel("preview");
      } else {
        setPreviewUrl(null);
        await runCodeWithFiles(generatedFiles, project.mainLanguage);
      }

      if (data.creditsRemaining !== undefined) setCredits(data.creditsRemaining);
      if (data.costCents) setLastBuildCost({ cents: data.costCents, tierLabel });

      setMessages(prev => prev.map(m => m.id === buildMsgId ? {
        ...m, buildPhase: LONG_BUILD_PHASES.length - 1, buildDone: true,
        deployUrl: liveUrl || undefined,
        files: generatedFiles.map(f => f.name),
        discoveredFeatures: data.discoveredFeatures || [],
        costDisplay: data.costDisplay,
        balanceDisplay: data.balanceDisplay,
      } : m));
      setBuildingMsgId(null);

    } catch (e: any) {
      clearInterval(phaseInterval);
      setMessages(prev => prev.map(m => m.id === buildMsgId ? {
        ...m, buildDone: true, content: `Build failed: ${e.message}`, role: "system",
      } : m));
      setBuildingMsgId(null);
      toast({ title: "Build failed", description: e.message, variant: "destructive" });
    }
  }

  function cancelBuild() {
    setComplexityEstimate(null);
    setPendingBuildPrompt(null);
  }

  async function saveProject() {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/code/projects/${currentProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: currentProject.name, description: currentProject.description, files, mainLanguage: currentProject.mainLanguage }),
      });
      const updated = await res.json();
      setCurrentProject(updated);
      setProjects(p => p.map(pr => pr.id === updated.id ? updated : pr));
      setUnsaved(false);
      if (updated.mainLanguage === "html") {
        setPreviewUrl(`/code-preview/${updated.id}?t=${Date.now()}`);
        setPreviewKey(k => k + 1);
      }
      toast({ title: "Saved!" });
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setIsSaving(false); }
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/code/projects/${id}`, { method: "DELETE", credentials: "include" });
    setProjects(p => p.filter(pr => pr.id !== id));
    if (currentProject?.id === id) { setCurrentProject(null); setFiles([]); setDeployUrl(null); }
  }

  async function deployProject() {
    if (!currentProject) return;
    setIsDeploying(true);
    try {
      await saveProject();
      const res = await fetch(`/api/code/deploy/${currentProject.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customDomain: customDomain.trim() || undefined }),
      });
      const data = await res.json();
      setDeployUrl(data.publishUrl);
      setCurrentProject(data.project);
      setShowDeployModal(false);
      toast({ title: "Deployed!", description: `Live at ${window.location.origin}${data.publishUrl}` });
    } catch (e: any) { toast({ title: "Deploy failed", description: e.message, variant: "destructive" }); }
    finally { setIsDeploying(false); }
  }

  async function runCode() { await runCodeWithFiles(files, currentProject?.mainLanguage || "html"); }

  async function runCodeWithFiles(theFiles: CodeFile[], lang: string) {
    if (lang === "html") {
      // Live preview from current editor content (instant, no server round-trip)
      setLivePreview(buildSrcdoc(theFiles));
      setPreviewUrl(null); // use srcDoc for live editing feedback
      setPreviewKey(k => k + 1);
      setRightPanel("preview");
      return;
    }
    const mainFile = theFiles[0];
    if (!mainFile) return;
    setIsRunning(true);
    setOutput(""); setOutputErr("");
    setRightPanel("output");
    try {
      const res = await fetch("/api/code/execute", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ language: mainFile.language, code: mainFile.content }) });
      const data = await res.json();
      setOutput(data.output || ""); setOutputErr(data.stderr || "");
    } catch (e: any) { setOutputErr(e.message); }
    finally { setIsRunning(false); }
  }

  function addFile() {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const ext = name.split(".").pop() || "";
    const langMap: Record<string, string> = { html: "html", css: "css", js: "javascript", ts: "typescript", py: "python", java: "java" };
    setFiles(f => [...f, { name, content: "", language: langMap[ext] || "plaintext" }]);
    setActiveFile(name); setShowAddFile(false); setNewFileName(""); setUnsaved(true);
  }

  function copyUrl() {
    if (!deployUrl) return;
    navigator.clipboard.writeText(`${window.location.origin}${deployUrl}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Auth Guard ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <Code2 style={{ width: 48, height: 48, color: C.accent, margin: "0 auto 16px" }} />
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Sign in to use Code Studio</h2>
          <button onClick={() => navigate("/login")} style={{ background: C.accent, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Sign In</button>
        </div>
      </div>
    );
  }

  if (!authLoading && !user?.codeStudioAddon) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: "0 0 40px rgba(16,185,129,0.3)" }}>
              <Code2 style={{ width: 40, height: 40, color: "#fff" }} />
            </div>
            <div style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: "50%", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0e1117" }}>
              <Lock style={{ width: 13, height: 13, color: "#000" }} />
            </div>
          </div>
          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Code Studio</h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>AI-powered IDE — describe your app, get production-quality code in seconds</p>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>What you get</div>
            {["Web-researched features from real apps — built in automatically", "10 AI models build professional apps together", "Monaco editor (VS Code engine) with multi-file support", "Live preview + auto-deploy to a public URL", "Run Python, JS, TypeScript, Java, Go, Rust & more"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <Check style={{ width: 15, height: 15, color: "#10b981", marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: C.text, fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
          {/* Trial badge */}
          <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎉</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6ee7b7" }}>7-Day Free Trial</div>
              <div style={{ fontSize: 12, color: C.muted }}>Try it free — $1.00 trial budget, no charge for 7 days</div>
            </div>
          </div>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>After trial · Add-on for any plan</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>$15<span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>/mo</span></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>$15.00 budget/month</div>
              <div style={{ fontSize: 11, color: "#f87171", fontWeight: 500 }}>Budget resets monthly</div>
            </div>
          </div>
          <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: C.muted }}>
            Priced by <strong style={{ color: C.text }}>task complexity</strong> — Simple $0.35 · Standard $0.75 · Complex $1.50. Budget packs from $5. Pack budget never expires.
          </div>
          {isEnterprise && (
            <div style={{ marginBottom: 12, padding: "10px 16px", background: "rgba(251,188,5,0.08)", border: "1px solid rgba(251,188,5,0.3)", borderRadius: 10, fontSize: 13, color: "#FCD34D", fontWeight: 600, textAlign: "center" as const }}>
              🏆 Enterprise Perk — Code Studio is FREE for you ($15/mo value)
            </div>
          )}
          <button onClick={() => addonMutation.mutate()} disabled={addonMutation.isPending}
            style={{ width: "100%", background: isEnterprise ? "linear-gradient(135deg, #FBBC05, #f59e0b)" : "linear-gradient(135deg, #059669, #10b981)", color: isEnterprise ? "#000" : "#fff", border: "none", padding: "14px 24px", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700, marginBottom: 16, opacity: addonMutation.isPending ? 0.7 : 1 }}>
            {addonMutation.isPending ? "Activating..." : isEnterprise ? "🎉 Activate Free — Enterprise Benefit" : "Start Free Trial — $0 for 7 days"}
          </button>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Have a promo code?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="ENTER-CODE-HERE"
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", color: C.text, fontSize: 13, fontFamily: "monospace", outline: "none" }}
                onKeyDown={e => { if (e.key === "Enter" && promoCode.trim()) promoMutation.mutate(); }} />
              <button onClick={() => promoMutation.mutate()} disabled={!promoCode.trim() || promoMutation.isPending}
                style={{ background: C.accentLight, border: `1px solid rgba(124,58,237,0.4)`, color: "#a78bfa", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: (!promoCode.trim() || promoMutation.isPending) ? 0.5 : 1 }}>
                {promoMutation.isPending ? "..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main IDE Layout ────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── Top Bar ── */}
      <div style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderBottom: `1px solid ${C.border}`, background: C.sidebar }}>
        <button onClick={() => navigate("/chat")}
          style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted, background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "4px 8px", borderRadius: 6, transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Chat
        </button>

        <div style={{ width: 1, height: 20, background: C.border }} />

        <Code2 style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Code Studio
        </span>

        {/* Project Selector */}
        <div ref={projectsRef} style={{ position: "relative", marginLeft: 4 }}>
          <button onClick={() => setShowProjects(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", color: C.text, cursor: "pointer", fontSize: 12, maxWidth: 200 }}>
            <FolderOpen style={{ width: 12, height: 12, color: C.accent, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{currentProject?.name || "Projects"}</span>
            {unsaved && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />}
            <ChevronDown style={{ width: 11, height: 11, color: C.muted, flexShrink: 0 }} />
          </button>
          {showProjects && (
            <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", width: 280, background: "#13131e", border: `1px solid ${C.border}`, borderRadius: 12, zIndex: 100, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
              <button onClick={() => { setCurrentProject(null); setFiles([]); setDeployUrl(null); setShowProjects(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", color: C.accent, background: "none", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                <Plus style={{ width: 13, height: 13 }} /> New project via AI
              </button>
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
                {projects.length === 0 && <div style={{ padding: "14px 16px", color: C.muted, fontSize: 12 }}>No saved projects yet</div>}
                {projects.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: currentProject?.id === p.id ? C.accentLight : "transparent" }}
                    onClick={() => openProject(p)}>
                    <FileCode style={{ width: 12, height: 12, color: C.muted, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    {p.isPublished && <Globe style={{ width: 10, height: 10, color: C.green, flexShrink: 0 }} />}
                    <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                      style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.5, flexShrink: 0 }}>
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Budget Bar (complexity pricing, $15/month reset) */}
        {(() => {
          const MAX_CENTS = 1500; // $15.00/month
          const pct = credits === null ? 0 : Math.min(100, Math.round((credits / MAX_CENTS) * 100));
          const empty = (credits ?? 0) < 20;
          const low = (credits ?? 0) < 300;
          const barColor = empty ? "#ef4444" : low ? "#f59e0b" : "#10b981";
          const textColor = empty ? "#f87171" : low ? "#fbbf24" : "#a3e635";
          const display = credits === null ? "..." : formatDollars(credits);
          return (
            <button
              onClick={() => setShowBuyCredits(true)}
              title={`${display} budget remaining · complexity pricing · click to add more`}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
              <Zap style={{ width: 10, height: 10, color: barColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: textColor, minWidth: 34 }}>
                {display}
              </span>
              <div style={{ width: 52, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 0.4s ease, background 0.3s" }} />
              </div>
              {empty && <ShoppingCart style={{ width: 10, height: 10, color: "#f87171" }} />}
            </button>
          );
        })()}

        {/* Action Buttons */}
        <button onClick={saveProject} disabled={isSaving || !hasProject}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "6px 12px", color: unsaved ? "#f59e0b" : C.muted, cursor: hasProject ? "pointer" : "not-allowed", fontSize: 12, opacity: !hasProject ? 0.35 : 1 }}>
          {isSaving ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 12, height: 12 }} />}
          Save
        </button>

        <button onClick={runCode} disabled={isRunning || !hasProject}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "#059669", border: "none", borderRadius: 7, padding: "6px 14px", color: "#fff", cursor: hasProject ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, opacity: !hasProject ? 0.35 : 1 }}>
          {isRunning ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Play style={{ width: 12, height: 12 }} />}
          Run
        </button>

        {deployUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 7, padding: "5px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
              <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Live</span>
            </div>
            <button onClick={copyUrl}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 10px", color: C.muted, cursor: "pointer", fontSize: 11, maxWidth: 180, overflow: "hidden" }}>
              {copied ? <Check style={{ width: 11, height: 11, color: C.green }} /> : <Copy style={{ width: 11, height: 11 }} />}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{window.location.origin}{deployUrl}</span>
            </button>
            <a href={deployUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, textDecoration: "none" }}>
              <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
            <button onClick={() => setShowDeployModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: C.accentLight, border: `1px solid rgba(124,58,237,0.3)`, borderRadius: 7, padding: "6px 12px", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              <RefreshCw style={{ width: 11, height: 11 }} /> Redeploy
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDeployModal(true)} disabled={!hasProject}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 7, padding: "6px 16px", color: "#fff", cursor: hasProject ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 700, opacity: !hasProject ? 0.35 : 1 }}>
            <Rocket style={{ width: 12, height: 12 }} /> Deploy
          </button>
        )}
      </div>

      {/* ── Main 3-Panel Layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── LEFT: AI Agent Panel ── */}
        <div style={{ width: 400, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}`, background: C.sidebar, overflow: "hidden" }}>

          {/* Agent Header */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Turbo Code Agent</div>
              <div style={{ fontSize: 10, color: C.muted }}>Multi-Model AI Agent</div>
            </div>
            <div style={{ fontSize: 10, color: "#7c3aed", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>AI</div>
            {user?.codeStudioAddon && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setShowBuyCredits(true)} style={{ fontSize: 10, color: "#a3e635", background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.2)", padding: "2px 7px", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}>
                  {credits !== null ? formatDollars(credits) : "..."}
                </button>
                <button
                  onClick={() => setShowLongBuildSettings(v => !v)}
                  title={longBuildEnabled ? "Long Build ON — auto-buy enabled" : "Long Build OFF"}
                  style={{ fontSize: 10, color: longBuildEnabled ? "#22c55e" : C.muted, background: longBuildEnabled ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${longBuildEnabled ? "rgba(34,197,94,0.3)" : C.border}`, padding: "2px 7px", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}>
                  {longBuildEnabled ? "⚡ LB" : "LB"}
                </button>
              </div>
            )}
          </div>

          {showLongBuildSettings && user?.codeStudioAddon && (
            <div style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(124,58,237,0.03)" }}>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Zap style={{ width: 12, height: 12, color: "#fff" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 12 }}>Long Build Mode</div>
                      <div style={{ fontSize: 9, color: C.muted }}>10 AI agents collaborate for {longBuildHours}h to build a production app</div>
                    </div>
                  </div>
                  <button onClick={() => { const next = !longBuildEnabled; setLongBuildEnabled(next); updateLongBuild({ longBuild: next }); }}
                    style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", position: "relative", background: longBuildEnabled ? "#22c55e" : C.border, transition: "background 0.2s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: longBuildEnabled ? 21 : 3, transition: "left 0.2s" }} />
                  </button>
                </div>

                {longBuildEnabled && (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Build Duration</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 3, 6, 9].map(h => (
                          <button key={h} onClick={() => { setLongBuildHours(h); updateLongBuild({ hours: h }); }}
                            style={{ flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", textAlign: "center", border: `1px solid ${longBuildHours === h ? "rgba(124,58,237,0.4)" : C.border}`, background: longBuildHours === h ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)", transition: "all 0.15s" }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: longBuildHours === h ? "#a78bfa" : C.text }}>{h}h</div>
                            <div style={{ fontSize: 8, color: C.muted, marginTop: 1 }}>
                              {h === 1 ? "Quick" : h === 3 ? "Standard" : h === 6 ? "Deep" : "Maximum"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Auto-Refill Budget</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[500, 1000, 2500, 5000].map(amt => (
                          <button key={amt} onClick={() => { setAutoBuyPack(amt); updateLongBuild({ autoBuyPack: amt }); }}
                            style={{ flex: 1, padding: "5px 4px", borderRadius: 6, cursor: "pointer", textAlign: "center", border: `1px solid ${autoBuyPack === amt ? "rgba(34,197,94,0.3)" : C.border}`, background: autoBuyPack === amt ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)", fontSize: 10, fontWeight: autoBuyPack === amt ? 700 : 500, color: autoBuyPack === amt ? "#22c55e" : C.muted }}>
                            {formatDollars(amt)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: "rgba(124,58,237,0.06)", borderRadius: 8, padding: "7px 10px", border: "1px solid rgba(124,58,237,0.12)" }}>
                      <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>10 AI Agents</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
                        {AI_AGENTS.map((agent, i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 2px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                            <div style={{ width: 18, height: 18, borderRadius: 5, background: `${agent.color}20`, display: "flex", alignItems: "center", justifyContent: "center", color: agent.color, marginBottom: 2 }}>
                              <AgentIcon name={agent.icon} size={10} />
                            </div>
                            <div style={{ fontSize: 7, fontWeight: 700, color: agent.color, textAlign: "center" }}>{agent.name}</div>
                            <div style={{ fontSize: 6, color: C.muted, textAlign: "center", lineHeight: 1.2 }}>{agent.role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* File Tree (collapsible) */}
          {hasProject && (
            <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => setShowFileTree(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileCode style={{ width: 11, height: 11 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Files ({files.length})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); setShowAddFile(v => !v); }}
                    style={{ color: C.accent, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}>
                    <Plus style={{ width: 13, height: 13 }} />
                  </button>
                  <ChevronRight style={{ width: 12, height: 12, transform: showFileTree ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                </div>
              </button>
              {showFileTree && (
                <div style={{ paddingBottom: 4 }}>
                  {showAddFile && (
                    <div style={{ padding: "4px 10px 6px", display: "flex", gap: 6 }}>
                      <input value={newFileName} onChange={e => setNewFileName(e.target.value)} onKeyDown={e => e.key === "Enter" && addFile()}
                        placeholder="filename.js" autoFocus
                        style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", color: C.text, fontSize: 11, outline: "none", fontFamily: "monospace" }} />
                      <button onClick={addFile} style={{ color: C.green, background: "none", border: "none", cursor: "pointer" }}><Check style={{ width: 13, height: 13 }} /></button>
                    </div>
                  )}
                  {files.map(file => (
                    <button key={file.name} onClick={() => setActiveFile(file.name)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", background: activeFile === file.name ? "rgba(124,58,237,0.1)" : "none", border: "none", cursor: "pointer", textAlign: "left", borderLeft: activeFile === file.name ? `2px solid ${C.accent}` : "2px solid transparent" }}>
                      <FileCode style={{ width: 11, height: 11, color: activeFile === file.name ? C.accent : C.muted, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: activeFile === file.name ? "#c4b5fd" : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Secrets Panel (Replit-style) */}
          {hasProject && (
            <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
              <button onClick={() => setShowSecrets(v => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Key style={{ width: 11, height: 11 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Secrets ({secrets.length})</span>
                </div>
                <ChevronRight style={{ width: 12, height: 12, transform: showSecrets ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
              </button>
              {showSecrets && (
                <div style={{ padding: "0 10px 8px" }}>
                  <div style={{ padding: "6px 8px", background: "rgba(124,58,237,0.05)", borderRadius: 8, border: "1px solid rgba(124,58,237,0.1)", marginBottom: 6 }}>
                    <div style={{ fontSize: 9, color: C.muted, marginBottom: 5 }}>Add API keys and secrets for your project. They are encrypted and never exposed in code.</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      <input value={newSecretKey} onChange={e => setNewSecretKey(e.target.value.toUpperCase())}
                        placeholder="KEY_NAME" style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 7px", color: C.text, fontSize: 10, outline: "none", fontFamily: "monospace" }} />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input value={newSecretValue} onChange={e => setNewSecretValue(e.target.value)}
                        placeholder="secret_value" type="password"
                        onKeyDown={e => e.key === "Enter" && addSecret()}
                        style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 7px", color: C.text, fontSize: 10, outline: "none", fontFamily: "monospace" }} />
                      <button onClick={addSecret} disabled={addingSecret || !newSecretKey.trim() || !newSecretValue.trim()}
                        style={{ color: "#fff", background: newSecretKey.trim() && newSecretValue.trim() ? C.accent : C.border, border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 9, fontWeight: 700, cursor: newSecretKey.trim() && newSecretValue.trim() ? "pointer" : "not-allowed" }}>
                        {addingSecret ? "..." : "+ Add"}
                      </button>
                    </div>
                  </div>
                  {secrets.length === 0 && (
                    <div style={{ fontSize: 10, color: C.muted, textAlign: "center", padding: "6px 0" }}>No secrets yet. Add API keys above.</div>
                  )}
                  {secrets.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 5, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, marginBottom: 3 }}>
                      <Shield style={{ width: 10, height: 10, color: C.accent, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 10, color: "#a78bfa", fontFamily: "monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.key}</span>
                      <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {showSecretValues[s.id] || "••••••••"}
                      </span>
                      <button onClick={() => revealSecret(s.id)} style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", padding: 1 }}>
                        {showSecretValues[s.id] ? <EyeOff style={{ width: 10, height: 10 }} /> : <Eye style={{ width: 10, height: 10 }} />}
                      </button>
                      <button onClick={() => deleteSecret(s.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 1 }}>
                        <Trash2 style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            {messages.map(msg => {
              if (msg.role === "building") {
                const phase = msg.buildPhase ?? 0;
                const done = msg.buildDone;
                const lbPhase = LONG_BUILD_PHASES[Math.min(phase, LONG_BUILD_PHASES.length - 1)];
                const activeAgents = lbPhase?.agents || [];
                return (
                  <div key={msg.id} style={{ background: "rgba(124,58,237,0.07)", border: `1px solid rgba(124,58,237,${done ? "0.15" : "0.25"})`, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: done ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {done ? <Check style={{ width: 16, height: 16, color: C.green }} /> : <Wand2 style={{ width: 15, height: 15, color: "#fff" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: done ? C.green : "#a78bfa", marginBottom: 2 }}>
                          {done ? "All 10 Agents Complete!" : "10 AI Agents Building..."}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.buildPrompt}</div>
                      </div>
                    </div>

                    {/* 10-Agent Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, marginBottom: 8 }}>
                      {AI_AGENTS.map((agent, i) => {
                        const isActive = !done && activeAgents.includes(i);
                        const isCompleted = done || phase > LONG_BUILD_PHASES.findIndex(p => p.agents.includes(i) && LONG_BUILD_PHASES.indexOf(p) === Math.max(...LONG_BUILD_PHASES.filter(pp => pp.agents.includes(i)).map(pp => LONG_BUILD_PHASES.indexOf(pp))));
                        return (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "5px 2px", borderRadius: 6, background: isActive ? `${agent.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? `${agent.color}40` : done ? "rgba(16,185,129,0.2)" : C.border}`, transition: "all 0.3s", position: "relative" }}>
                            {isActive && <div style={{ position: "absolute", top: -1, right: -1, width: 6, height: 6, borderRadius: 3, background: agent.color, animation: "pulse 1.5s infinite" }} />}
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: isActive ? `${agent.color}25` : done ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? agent.color : done ? C.green : C.muted, marginBottom: 1 }}>
                              {done ? <Check style={{ width: 8, height: 8 }} /> : <AgentIcon name={agent.icon} size={8} />}
                            </div>
                            <div style={{ fontSize: 7, fontWeight: 700, color: isActive ? agent.color : done ? C.green : C.muted, textAlign: "center" }}>{agent.name}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Phase label + progress */}
                    <div style={{ marginBottom: done ? 10 : 0 }}>
                      <div style={{ fontSize: 10, color: done ? C.green : "#a78bfa", marginBottom: 4, fontWeight: 500 }}>
                        {done ? "All agents completed successfully" : lbPhase?.label || BUILD_PHASES[Math.min(phase, BUILD_PHASES.length - 1)]}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        {LONG_BUILD_PHASES.map((_, i) => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= phase ? (done ? C.green : C.accent) : "rgba(255,255,255,0.07)", transition: "background 0.4s" }} />
                        ))}
                      </div>
                    </div>

                    {done && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        {msg.deployUrl && (
                          <a href={msg.deployUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "7px 14px", color: C.green, textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
                            <Globe style={{ width: 13, height: 13 }} /> Open live app <ExternalLink style={{ width: 11, height: 11 }} />
                          </a>
                        )}
                        {msg.costDisplay && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px" }}>
                            <Zap style={{ width: 10, height: 10, color: "#a78bfa" }} /> {msg.costDisplay} charged · {msg.balanceDisplay} left
                          </span>
                        )}
                      </div>
                    )}

                    {done && msg.discoveredFeatures && msg.discoveredFeatures.length > 0 && (
                      <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <Search style={{ width: 11, height: 11 }} /> {msg.discoveredFeatures.length} features researched from real apps
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {msg.discoveredFeatures.slice(0, 18).map((f, i) => (
                            <span key={i} style={{ fontSize: 10, color: "#67e8f9", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.18)", padding: "2px 8px", borderRadius: 999, lineHeight: 1.7 }}>{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              const isUser = msg.role === "user";
              return (
                <div key={msg.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: isUser ? "rgba(124,58,237,0.25)" : "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    {isUser ? <User style={{ width: 13, height: 13, color: "#a78bfa" }} /> : <Bot style={{ width: 13, height: 13, color: "#fff" }} />}
                  </div>
                  <div style={{ maxWidth: "82%", background: isUser ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${isUser ? "rgba(124,58,237,0.2)" : C.border}`, borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "10px 13px", fontSize: 13, color: C.text, lineHeight: 1.65 }}>
                    {renderMessage(msg.content)}
                  </div>
                </div>
              );
            })}
            {agentLoading && !buildingMsgId && (
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot style={{ width: 13, height: 13, color: "#fff" }} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: "4px 14px 14px 14px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `bounce 1.2s infinite ${i * 0.2}s` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── Prompt Input (Big) ── */}
          <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "12px 12px 10px" }}>
            {/* Example chips — always visible */}
            {!hasProject && (
              <div style={{ marginBottom: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {EXAMPLE_PROMPTS.slice(0, 4).map(ex => (
                  <button key={ex} onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                    style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", lineHeight: 1.5, transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.text; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}>
                    {ex}
                  </button>
                ))}
              </div>
            )}
            {hasProject && (
              <div style={{ marginBottom: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["Add dark mode", "Add a search bar", "Add export to CSV", "Make it mobile friendly"].map(ex => (
                  <button key={ex} onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                    style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", lineHeight: 1.5 }}>
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderHover}`, borderRadius: 12, overflow: "hidden" }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasProject
                  ? "Ask me to update the app — 'Add user login', 'Make it mobile-friendly', 'Add charts'..."
                  : "Describe any app — 'A finance tracker with charts and categories', 'A Kanban board like Trello'..."}
                disabled={agentLoading || !!buildingMsgId}
                rows={4}
                style={{
                  width: "100%", background: "none", border: "none", color: C.text,
                  fontSize: 13, outline: "none", fontFamily: "inherit",
                  resize: "none", padding: "12px 14px", lineHeight: 1.6,
                  boxSizing: "border-box", display: "block",
                  opacity: (agentLoading || !!buildingMsgId) ? 0.6 : 1,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.muted }}>Enter to send · Shift+Enter for new line</span>
                <button onClick={sendMessage} disabled={!input.trim() || agentLoading || !!buildingMsgId}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: input.trim() && !agentLoading && !buildingMsgId ? "linear-gradient(135deg, #7c3aed, #06b6d4)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", cursor: input.trim() && !agentLoading && !buildingMsgId ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                  {agentLoading || buildingMsgId
                    ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Working...</>
                    : <><Zap style={{ width: 13, height: 13 }} /> Build</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER: Monaco Editor ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {hasProject ? (
            <>
              {/* File Tabs */}
              <div style={{ height: 38, flexShrink: 0, display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, background: C.panel, overflowX: "auto" }}>
                {files.map(file => (
                  <button key={file.name} onClick={() => setActiveFile(file.name)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 16px", height: "100%", background: activeFile === file.name ? C.bg : "transparent", border: "none", borderRight: `1px solid ${C.border}`, cursor: "pointer", color: activeFile === file.name ? "#c4b5fd" : C.muted, fontSize: 12, whiteSpace: "nowrap", borderBottom: activeFile === file.name ? `2px solid ${C.accent}` : "2px solid transparent", transition: "all 0.15s" }}>
                    <FileCode style={{ width: 11, height: 11, opacity: 0.7 }} />
                    {file.name}
                  </button>
                ))}
              </div>
              {/* Editor — Monaco in absolutely-positioned container to prevent layout thrash */}
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0 }}>
                  <Editor
                    height="100%"
                    language={getMonacoLang(activeFileData?.language || "javascript")}
                    value={activeFileData?.content || ""}
                    onChange={v => { setFiles(f => f.map(file => file.name === activeFile ? { ...file, content: v || "" } : file)); setUnsaved(true); }}
                    theme="vs-dark"
                    options={{
                      fontSize: 13.5,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontLigatures: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: "on",
                      wordWrap: "on",
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                      tabSize: 2,
                      bracketPairColorization: { enabled: true },
                      renderLineHighlight: "gutter",
                      smoothScrolling: true,
                      cursorSmoothCaretAnimation: "on",
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Welcome / Empty State */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, #7c3aed22, #06b6d422)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <Wand2 style={{ width: 34, height: 34, color: C.accent }} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 10, letterSpacing: "-0.02em" }}>Tell the Agent what to build</h2>
              <p style={{ fontSize: 14, color: C.muted, maxWidth: 440, lineHeight: 1.7, marginBottom: 32 }}>
                Type a description in the panel on the left. The AI will search the web for similar apps, copy their features, and build a professional working app instantly.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 480, width: "100%" }}>
                {EXAMPLE_PROMPTS.map(ex => (
                  <button key={ex} onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                    style={{ padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 12, cursor: "pointer", textAlign: "left", lineHeight: 1.4, transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.muted; }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview / Output ── */}
        <div style={{ width: 460, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}`, overflow: "hidden" }}>
          {/* Panel Tabs */}
          <div style={{ height: 38, flexShrink: 0, display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, background: C.panel, padding: "0 4px" }}>
            {[
              { id: "preview" as const, icon: <Monitor style={{ width: 12, height: 12 }} />, label: "Preview" },
              { id: "output" as const, icon: <Terminal style={{ width: 12, height: 12 }} />, label: "Terminal" },
            ].map(p => (
              <button key={p.id} onClick={() => setRightPanel(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 12px", height: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: rightPanel === p.id ? "#c4b5fd" : C.muted, borderBottom: rightPanel === p.id ? `2px solid ${C.accent}` : "2px solid transparent", transition: "all 0.15s" }}>
                {p.icon} {p.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {rightPanel === "preview" && hasProject && (
              <button
                onClick={() => {
                  if (previewUrl && currentProject) {
                    // Force reload the URL-based preview
                    setPreviewUrl(`/code-preview/${currentProject.id}?t=${Date.now()}`);
                  } else {
                    runCode();
                  }
                }}
                title="Refresh preview"
                style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}>
                <RefreshCw style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {rightPanel === "preview" ? (
              previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#fff" }}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads"
                  title="App Preview"
                />
              ) : livePreview ? (
                // srcDoc preview: used only during live editing (before save)
                <iframe
                  key={previewKey}
                  srcDoc={livePreview}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#fff" }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads"
                  title="Live Edit Preview"
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <Monitor style={{ width: 36, height: 36, color: C.muted }} />
                  <span style={{ fontSize: 13, color: C.muted }}>Build an app to see the live preview</span>
                </div>
              )
            ) : (
              <div style={{ position: "absolute", inset: 0, padding: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, overflowY: "auto", background: "#08080f" }}>
                {isRunning && <div style={{ color: "#a78bfa", marginBottom: 8 }}>⟳ Running...</div>}
                {output && <pre style={{ color: "#a5f3fc", margin: 0, whiteSpace: "pre-wrap" }}>{output}</pre>}
                {outputErr && <pre style={{ color: "#ef4444", margin: 0, whiteSpace: "pre-wrap" }}>{outputErr}</pre>}
                {!isRunning && !output && !outputErr && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                    <Terminal style={{ width: 32, height: 32, color: C.muted }} />
                    <span style={{ color: C.muted, fontSize: 13 }}>Run your code to see output</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deploy Modal ── */}
      {showDeployModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)" }}>
          <div style={{ background: "#13131e", border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Rocket style={{ width: 20, height: 20, color: C.accent }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Deploy Project</span>
              </div>
              <button onClick={() => setShowDeployModal(false)} style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
              Published to a public URL at <strong style={{ color: C.text }}>{window.location.origin}/p/your-slug</strong>
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Custom domain (optional)</label>
              <input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="myapp.com"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            {deployUrl && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <a href={deployUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.green, fontSize: 13, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis" }}>{window.location.origin}{deployUrl}</a>
                <button onClick={copyUrl} style={{ color: copied ? C.green : C.muted, background: "none", border: "none", cursor: "pointer" }}>
                  {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            )}
            <button onClick={deployProject} disabled={isDeploying}
              style={{ width: "100%", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 10, padding: "13px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: isDeploying ? 0.7 : 1 }}>
              {isDeploying ? "Deploying..." : deployUrl ? "Redeploy" : "Deploy to Web"}
            </button>
          </div>
        </div>
      )}

      {/* ── Complexity Estimate Confirmation Modal ── */}
      {(complexityEstimate || isEstimating) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: 440, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            {isEstimating ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>Analyzing complexity...</div>
                <div style={{ fontSize: 13, color: C.muted }}>Estimating the build cost for your project</div>
              </div>
            ) : complexityEstimate ? (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 42, marginBottom: 8 }}>{complexityEstimate.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 4 }}>
                    {complexityEstimate.label} Build
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{complexityEstimate.description}</div>

                  <div style={{ display: "inline-flex", alignItems: "baseline", gap: 4, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 12, padding: "10px 24px", marginBottom: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: "#a78bfa" }}>{complexityEstimate.display}</span>
                    <span style={{ fontSize: 14, color: C.muted }}>will be deducted</span>
                  </div>

                  <div style={{ fontSize: 12, color: C.muted }}>
                    Balance after: <strong style={{ color: "#a3e635" }}>{credits !== null ? formatDollars(Math.max(0, credits - complexityEstimate.cents)) : "..."}</strong>
                  </div>
                </div>

                {/* All 5 tiers reference */}
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pricing Tiers</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(COMPLEXITY_TIERS).map(([key, tier]) => (
                      <div key={key} style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: key === complexityEstimate.tier ? `${tier.color}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${key === complexityEstimate.tier ? `${tier.color}60` : C.border}`,
                        color: key === complexityEstimate.tier ? tier.color : C.muted,
                      }}>
                        {tier.emoji} {tier.label} · {formatDollars(tier.cents)}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={cancelBuild}
                    style={{ padding: "13px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                    Cancel
                  </button>
                  <button onClick={confirmBuild}
                    style={{ padding: "13px", borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                    Build It — {complexityEstimate.display}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {showBuyCredits && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap style={{ width: 18, height: 18, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Add Coding Budget</div>
                  <div style={{ fontSize: 12, color: C.muted }}>Balance: <strong style={{ color: "#a3e635" }}>{credits !== null ? formatDollars(credits) : "..."}</strong></div>
                </div>
              </div>
              <button onClick={() => setShowBuyCredits(false)} style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(124,58,237,0.06)", borderRadius: 10, border: "1px solid rgba(124,58,237,0.15)" }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>Complexity-based pricing:</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                {[
                  { tier: "Simple",   price: "$0.35", color: "#22c55e" },
                  { tier: "Standard", price: "$0.75", color: "#3b82f6" },
                  { tier: "Complex",  price: "$1.50", color: "#a855f7" },
                ].map(({ tier, price, color }) => (
                  <div key={tier} style={{ textAlign: "center", padding: "6px 4px", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}25` }}>
                    <div style={{ fontWeight: 700, color, fontSize: 13 }}>{price}</div>
                    <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{tier}</div>
                  </div>
                ))}
              </div>
              {nextReset && (
                <p style={{ color: "#fbbf24", fontSize: 11, margin: "8px 0 0" }}>
                  Monthly $15 reset: {nextReset.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <div style={{ marginBottom: 16, padding: "8px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.15)", fontSize: 12, color: "#6ee7b7" }}>
              Extra budget packs are permanent — they never expire or reset.
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Add budget</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {CREDIT_PACKS.map(pack => {
                const stdBuilds = Math.floor(pack.cents / 75);
                return (
                  <button key={pack.cents}
                    onClick={() => setSelectedPack(pack.cents)}
                    style={{
                      background: selectedPack === pack.cents ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedPack === pack.cents ? "rgba(124,58,237,0.5)" : C.border}`,
                      borderRadius: 10, padding: "12px 10px", cursor: "pointer", textAlign: "center" as const, transition: "all 0.15s",
                    }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>${pack.price}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>~{stdBuilds} Standard builds</div>
                    <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 4 }}>{formatDollars(pack.cents)} budget</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => buyCredits(selectedPack)}
              disabled={buyingCredits}
              style={{ width: "100%", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 10, padding: "14px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: buyingCredits ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {buyingCredits ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <CreditCard style={{ width: 16, height: 16 }} />}
              {buyingCredits ? "Redirecting to PayPal..." : `Add $${CREDIT_PACKS.find(p => p.cents === selectedPack)?.price ?? "?"} Budget — Pay with PayPal`}
            </button>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: C.muted }}>Secure payment via PayPal · One-time charge · Budget never expires</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
