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
  "Architecting with Claude + Gemini...",
  "Writing HTML structure...",
  "Crafting CSS & animations...",
  "Building JavaScript logic...",
  "Auto-deploying to the web...",
  "Done!",
];

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
  const [lastBuildCost, setLastBuildCost] = useState<{ cents: number; lines: number } | null>(null);

  // Per-line pricing: $0.02/line, 10 lines = $0.20
  // Pack key = cents to add, price = USD charged
  const CREDIT_PACKS = [
    { cents: 500,   price: 5,   lines: 250 },
    { cents: 1000,  price: 10,  lines: 500 },
    { cents: 2500,  price: 25,  lines: 1250 },
    { cents: 5000,  price: 50,  lines: 2500 },
    { cents: 10000, price: 100, lines: 5000 },
  ];

  const formatDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const activeFileData = files.find(f => f.name === activeFile);
  const isWebProject = currentProject?.mainLanguage === "html";
  const hasProject = !!currentProject;

  useEffect(() => { if (isAuthenticated) loadProjects(); }, [isAuthenticated]);

  // Fetch credit balance on load (and after addon activation)
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
  }

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || agentLoading) return;
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

      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { id: uid(), role: "assistant", content: data.error || "AI is temporarily unavailable. Please try again." }]);
        return;
      }

      if (data.intent === "build") {
        const replyMsg: ChatMsg = { id: uid(), role: "assistant", content: data.reply || "On it! Building now..." };
        setMessages(prev => [...prev, replyMsg]);
        await triggerBuild(data.buildPrompt, msg);
      } else if (data.reply) {
        setMessages(prev => [...prev, { id: uid(), role: "assistant", content: data.reply }]);
      } else {
        await triggerBuild(msg, msg);
      }
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: "Connection error. Please check your connection and try again." }]);
    } finally {
      setAgentLoading(false);
    }
  }

  async function triggerBuild(buildPrompt: string, originalMsg?: string) {
    const buildMsgId = uid();
    setBuildingMsgId(buildMsgId);

    setMessages(prev => [...prev, {
      id: buildMsgId, role: "building", content: "",
      buildPrompt, buildPhase: 0, buildDone: false,
    }]);

    let phase = 0;
    const phaseInterval = setInterval(() => {
      phase = Math.min(phase + 1, BUILD_PHASES.length - 2);
      setMessages(prev => prev.map(m => m.id === buildMsgId ? { ...m, buildPhase: phase } : m));
    }, 2800);

    try {
      const res = await fetch("/api/code/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: buildPrompt, projectId: undefined }),
      });
      const data = await res.json();
      clearInterval(phaseInterval);

      if (res.status === 402 && data.outOfCredits) {
        const bal = data.creditsDisplay || formatDollars(data.credits ?? 0);
        setMessages(prev => prev.map(m => m.id === buildMsgId ? {
          ...m, buildDone: true, content: `Insufficient balance (${bal} remaining — need at least $0.20). Add budget to keep building!`, role: "system",
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
      if (data.costCents && data.linesGenerated) {
        setLastBuildCost({ cents: data.costCents, lines: data.linesGenerated });
      }
      setMessages(prev => prev.map(m => m.id === buildMsgId ? {
        ...m, buildPhase: BUILD_PHASES.length - 1, buildDone: true,
        deployUrl: liveUrl || undefined,
        files: generatedFiles.map(f => f.name),
        discoveredFeatures: data.discoveredFeatures || [],
        costDisplay: data.costDisplay,
        linesGenerated: data.linesGenerated,
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
            {["Web-researched features from real apps — built in automatically", "Claude Opus 4.5 + Gemini 3.1 Pro build professional apps", "Monaco editor (VS Code engine) with multi-file support", "Live preview + auto-deploy to a public URL", "Run Python, JS, TypeScript, Java, Go, Rust & more"].map(f => (
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
              <div style={{ fontSize: 12, color: C.muted }}>Try it free with 5 AI credits — no charge for 7 days</div>
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
            Priced at <strong style={{ color: C.text }}>$0.02/line</strong> — 10 lines = $0.20. Need more? Add budget packs from $5. Pack budget never expires.
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

        {/* Budget Bar ($0.02/line, max $15/month) */}
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
              title={`${display} budget remaining · $0.02/line · click to add more`}
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
              <div style={{ fontSize: 10, color: C.muted }}>Claude Opus 4.5 + Gemini 3.1 Pro</div>
            </div>
            <div style={{ fontSize: 10, color: "#7c3aed", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>AI</div>
          </div>

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

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
            {messages.map(msg => {
              if (msg.role === "building") {
                const phase = msg.buildPhase ?? 0;
                const done = msg.buildDone;
                return (
                  <div key={msg.id} style={{ background: "rgba(124,58,237,0.07)", border: `1px solid rgba(124,58,237,${done ? "0.15" : "0.25"})`, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: done ? "rgba(16,185,129,0.15)" : "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {done ? <Check style={{ width: 16, height: 16, color: C.green }} /> : <Wand2 style={{ width: 15, height: 15, color: "#fff" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: done ? C.green : "#a78bfa", marginBottom: 2 }}>
                          {done ? "App Built Successfully!" : "Building your app..."}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.buildPrompt}</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: done ? 12 : 0 }}>
                      <div style={{ fontSize: 11, color: done ? C.green : "#a78bfa", marginBottom: 6, fontWeight: 500 }}>
                        {BUILD_PHASES[Math.min(phase, BUILD_PHASES.length - 1)]}
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        {BUILD_PHASES.map((_, i) => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= phase ? (done ? C.green : C.accent) : "rgba(255,255,255,0.07)", transition: "background 0.4s" }} />
                        ))}
                      </div>
                    </div>

                    {done && msg.deployUrl && (
                      <a href={msg.deployUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "7px 14px", color: C.green, textDecoration: "none", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
                        <Globe style={{ width: 13, height: 13 }} /> Open live app <ExternalLink style={{ width: 11, height: 11 }} />
                      </a>
                    )}

                    {done && msg.discoveredFeatures && msg.discoveredFeatures.length > 0 && (
                      <div style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 10, padding: "10px 12px", marginTop: done && msg.deployUrl ? 0 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          🔍 {msg.discoveredFeatures.length} features researched from real apps
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
                // URL-based preview: NO sandbox = full browser API access
                // localStorage, fetch, WebSockets, IndexedDB, geolocation all work
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#fff" }}
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

      {/* ── Buy Credits Modal ────────────────────────────────────────────────── */}
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
              <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>$0.02</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>per line</div>
                </div>
                <div style={{ width: 1, height: 30, background: C.border }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>10 lines</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>= $0.20</div>
                </div>
                <div style={{ width: 1, height: 30, background: C.border }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>$15.00</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>monthly reset</div>
                </div>
              </div>
              {nextReset && (
                <p style={{ color: "#fbbf24", fontSize: 11, margin: "8px 0 0" }}>
                  Monthly reset: {nextReset.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
            <div style={{ marginBottom: 16, padding: "8px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.15)", fontSize: 12, color: "#6ee7b7" }}>
              Extra budget packs are permanent — they never expire or reset.
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Add budget</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {CREDIT_PACKS.map(pack => (
                <button key={pack.cents}
                  onClick={() => setSelectedPack(pack.cents)}
                  style={{
                    background: selectedPack === pack.cents ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedPack === pack.cents ? "rgba(124,58,237,0.5)" : C.border}`,
                    borderRadius: 10, padding: "12px 10px", cursor: "pointer", textAlign: "center" as const, transition: "all 0.15s",
                  }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>${pack.price}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>~{pack.lines.toLocaleString()} lines</div>
                  <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 4 }}>{formatDollars(pack.cents)} budget</div>
                </button>
              ))}
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
