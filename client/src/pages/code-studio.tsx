import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Editor from "@monaco-editor/react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play, Save, Rocket, ChevronLeft, Plus, Trash2, Globe, Copy,
  Code2, Terminal, Loader2, FileCode, Send, RefreshCw, X,
  ExternalLink, Check, Monitor, Wand2, Zap, Lock, FolderOpen,
  ChevronRight, Bot, User, Sparkles,
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
}

const BUILD_PHASES = [
  "Analyzing your request...",
  "Architecting the app with Gemini 3.1 Pro...",
  "Writing HTML structure...",
  "Crafting CSS & animations...",
  "Building JavaScript logic...",
  "Auto-deploying to the web...",
  "Done!",
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
  // Inline any separately stored CSS/JS files (legacy multi-file projects)
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

export default function CodeStudio() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Projects
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CodeProject | null>(null);
  const [showProjects, setShowProjects] = useState(false);

  // Editor
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

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [customDomain, setCustomDomain] = useState("");

  // Agent chat
  const [messages, setMessages] = useState<ChatMsg[]>([{
    id: uid(),
    role: "assistant",
    content: "Hi! I'm **Turbo Code Agent**, powered by Gemini 3.1 Pro.\n\nTell me what app you want to build — or ask me any coding question. I'll automatically detect whether to build or explain.",
  }]);
  const [input, setInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [buildingMsgId, setBuildingMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Promo code (for paywall)
  const [promoCode, setPromoCode] = useState("");

  const activeFileData = files.find(f => f.name === activeFile);
  const isWebProject = currentProject?.mainLanguage === "html";
  const hasProject = !!currentProject;

  useEffect(() => { if (isAuthenticated) loadProjects(); }, [isAuthenticated]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (isWebProject && files.length > 0) setLivePreview(buildSrcdoc(files));
  }, [files, isWebProject]);

  // Handle addon PayPal redirect
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
  }, []);

  const addonMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/create-addon-subscription"),
    onSuccess: async (res: any) => { const d = await res.json(); if (d.url) window.location.href = d.url; },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
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
  }

  // ── Unified Agent send ──────────────────────────────────────────────────
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

      // Handle API errors
      if (!res.ok || data.error) {
        setMessages(prev => [...prev, { id: uid(), role: "assistant", content: data.error || "AI is temporarily unavailable. Please try again in a moment." }]);
        return;
      }

      if (data.intent === "build") {
        const replyMsg: ChatMsg = { id: uid(), role: "assistant", content: data.reply || "On it! Building now..." };
        setMessages(prev => [...prev, replyMsg]);
        await triggerBuild(data.buildPrompt, msg);
      } else if (data.reply) {
        const replyMsg: ChatMsg = { id: uid(), role: "assistant", content: data.reply };
        setMessages(prev => [...prev, replyMsg]);
      } else {
        // Fallback — re-route to build if something slipped through
        await triggerBuild(msg, msg);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: "Connection error. Please check your connection and try again." }]);
    } finally {
      setAgentLoading(false);
    }
  }

  async function triggerBuild(buildPrompt: string, originalMsg?: string) {
    const buildMsgId = uid();
    setBuildingMsgId(buildMsgId);

    const buildMsg: ChatMsg = {
      id: buildMsgId,
      role: "building",
      content: "",
      buildPrompt,
      buildPhase: 0,
      buildDone: false,
    };
    setMessages(prev => [...prev, buildMsg]);

    // Advance phase indicator
    let phase = 0;
    const phaseInterval = setInterval(() => {
      phase = Math.min(phase + 1, BUILD_PHASES.length - 2);
      setMessages(prev => prev.map(m => m.id === buildMsgId ? { ...m, buildPhase: phase } : m));
    }, 2500);

    try {
      const res = await fetch("/api/code/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: buildPrompt, projectId: undefined }),
      });
      const data = await res.json();
      clearInterval(phaseInterval);

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
        setPreviewKey(k => k + 1);
        setRightPanel("preview");
      } else {
        await runCodeWithFiles(generatedFiles, project.mainLanguage);
      }

      // Mark build done in chat
      setMessages(prev => prev.map(m => m.id === buildMsgId ? {
        ...m,
        buildPhase: BUILD_PHASES.length - 1,
        buildDone: true,
        deployUrl: liveUrl || undefined,
        files: generatedFiles.map(f => f.name),
      } : m));
      setBuildingMsgId(null);

    } catch (e: any) {
      clearInterval(phaseInterval);
      setMessages(prev => prev.map(m => m.id === buildMsgId ? {
        ...m,
        buildDone: true,
        content: `Build failed: ${e.message}`,
        role: "system",
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
      setLivePreview(buildSrcdoc(theFiles));
      setPreviewKey(k => k + 1);
      setRightPanel("preview");
      return;
    }
    const mainFile = theFiles[0];
    if (!mainFile) return;
    setIsRunning(true);
    setOutput("");
    setOutputErr("");
    setRightPanel("output");
    try {
      const res = await fetch("/api/code/execute", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ language: mainFile.language, code: mainFile.content }) });
      const data = await res.json();
      setOutput(data.output || "");
      setOutputErr(data.stderr || "");
    } catch (e: any) { setOutputErr(e.message); }
    finally { setIsRunning(false); }
  }

  function addFile() {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const ext = name.split(".").pop() || "";
    const langMap: Record<string, string> = { html: "html", css: "css", js: "javascript", ts: "typescript", py: "python", java: "java" };
    setFiles(f => [...f, { name, content: "", language: langMap[ext] || "plaintext" }]);
    setActiveFile(name);
    setShowAddFile(false);
    setNewFileName("");
    setUnsaved(true);
  }

  function copyUrl() {
    if (!deployUrl) return;
    navigator.clipboard.writeText(`${window.location.origin}${deployUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Colors ────────────────────────────────────────────────────────────────
  const C = {
    bg: "#0e1117",
    sidebar: "#0a0a0f",
    panel: "#111118",
    border: "rgba(255,255,255,0.07)",
    text: "#e0e0ff",
    muted: "#555570",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.15)",
  };

  // ── Guards ────────────────────────────────────────────────────────────────
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
            {["Gemini 3.1 Pro builds full apps from one sentence", "Unified AI agent — chat, build, and debug in one place", "Monaco editor (VS Code engine) with multi-file support", "Live preview + auto-deploy to a public URL", "Reference any website to copy its design", "Run Python, JS, TypeScript, Java, Go, Rust & more"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <Check style={{ width: 15, height: 15, color: "#10b981", marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: C.text, fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Add-on for any plan</div><div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>$10<span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>/mo</span></div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Cancel anytime</div><div style={{ fontSize: 12, color: C.muted }}>Billed separately</div></div>
          </div>
          <button onClick={() => addonMutation.mutate()} disabled={addonMutation.isPending}
            style={{ width: "100%", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", border: "none", padding: "14px 24px", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700, marginBottom: 16, opacity: addonMutation.isPending ? 0.7 : 1 }}>
            {addonMutation.isPending ? "Redirecting to PayPal..." : "Add Code Studio — $10/mo"}
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

  // ── Main IDE Layout ───────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── Top Bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 44, borderBottom: `1px solid ${C.border}`, background: C.sidebar, flexShrink: 0 }}>
        <button onClick={() => navigate("/chat")} style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted, background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "4px 6px", borderRadius: 6 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Chat
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Code2 style={{ width: 18, height: 18, color: C.accent }} />
          <span style={{ fontWeight: 700, fontSize: 13, background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Code Studio</span>
        </div>

        {/* Project dropdown */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowProjects(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", color: C.text, cursor: "pointer", fontSize: 12 }}>
            <FolderOpen style={{ width: 13, height: 13, color: C.accent }} />
            <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentProject?.name || "Projects"}</span>
            {unsaved && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />}
            <ChevronRight style={{ width: 12, height: 12, color: C.muted, transform: showProjects ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {showProjects && (
            <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", width: 260, background: "#111118", border: `1px solid ${C.border}`, borderRadius: 12, zIndex: 50, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "6px", borderBottom: `1px solid ${C.border}` }}>
                <button onClick={() => { setCurrentProject(null); setFiles([]); setDeployUrl(null); setShowProjects(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, color: C.accent, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>
                  <Plus style={{ width: 13, height: 13 }} /> New project via AI
                </button>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {projects.length === 0 && <div style={{ padding: "12px 16px", color: C.muted, fontSize: 12 }}>No saved projects</div>}
                {projects.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: currentProject?.id === p.id ? C.accentLight : "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = currentProject?.id === p.id ? C.accentLight : "rgba(255,255,255,0.03)") }
                    onMouseLeave={e => (e.currentTarget.style.background = currentProject?.id === p.id ? C.accentLight : "transparent") }>
                    <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} onClick={() => openProject(p)}>{p.name}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{p.mainLanguage}</span>
                    {p.isPublished && <Globe style={{ width: 10, height: 10, color: "#10b981" }} />}
                    <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.6 }}>
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <button onClick={saveProject} disabled={isSaving || !hasProject}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 10px", color: unsaved ? "#f59e0b" : C.muted, cursor: hasProject ? "pointer" : "not-allowed", fontSize: 12, opacity: !hasProject ? 0.4 : 1 }}>
          {isSaving ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 13, height: 13 }} />} Save
        </button>

        <button onClick={runCode} disabled={isRunning || !hasProject}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "#059669", border: "none", borderRadius: 7, padding: "5px 12px", color: "#fff", cursor: hasProject ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, opacity: !hasProject ? 0.4 : 1 }}>
          {isRunning ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Play style={{ width: 13, height: 13 }} />} Run
        </button>

        {deployUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 7, padding: "4px 10px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>Live</span>
            </div>
            <button onClick={copyUrl} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 10px", color: C.muted, cursor: "pointer", fontSize: 11 }}>
              {copied ? <Check style={{ width: 11, height: 11, color: "#10b981" }} /> : <Copy style={{ width: 11, height: 11 }} />}
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{window.location.origin}{deployUrl}</span>
            </button>
            <a href={deployUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", padding: "5px 8px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, textDecoration: "none" }}>
              <ExternalLink style={{ width: 12, height: 12 }} />
            </a>
            <button onClick={() => setShowDeployModal(true)} disabled={!hasProject}
              style={{ display: "flex", alignItems: "center", gap: 5, background: C.accentLight, border: `1px solid rgba(124,58,237,0.3)`, borderRadius: 7, padding: "5px 10px", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              <RefreshCw style={{ width: 12, height: 12 }} /> Redeploy
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDeployModal(true)} disabled={!hasProject}
            style={{ display: "flex", alignItems: "center", gap: 5, background: C.accent, border: "none", borderRadius: 7, padding: "5px 14px", color: "#fff", cursor: hasProject ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, opacity: !hasProject ? 0.4 : 1 }}>
            <Rocket style={{ width: 13, height: 13 }} /> Deploy
          </button>
        )}
      </div>

      {/* ── Main 3-column layout ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── LEFT: Agent + Files ── */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}`, background: C.sidebar }}>

          {/* File tree */}
          {hasProject && (
            <div style={{ borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Files</span>
                <button onClick={() => setShowAddFile(v => !v)} style={{ color: C.accent, background: "none", border: "none", cursor: "pointer" }}>
                  <Plus style={{ width: 14, height: 14 }} />
                </button>
              </div>
              {showAddFile && (
                <div style={{ padding: "4px 8px 8px", display: "flex", gap: 6 }}>
                  <input value={newFileName} onChange={e => setNewFileName(e.target.value)} onKeyDown={e => e.key === "Enter" && addFile()}
                    placeholder="filename.js" autoFocus
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px", color: C.text, fontSize: 11, outline: "none", fontFamily: "monospace" }} />
                  <button onClick={addFile} style={{ color: "#10b981", background: "none", border: "none", cursor: "pointer" }}><Check style={{ width: 14, height: 14 }} /></button>
                </div>
              )}
              <div style={{ paddingBottom: 6 }}>
                {files.map(file => (
                  <button key={file.name} onClick={() => setActiveFile(file.name)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: activeFile === file.name ? C.accentLight : "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <FileCode style={{ width: 12, height: 12, color: activeFile === file.name ? C.accent : C.muted, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: activeFile === file.name ? "#a78bfa" : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Agent Chat */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles style={{ width: 11, height: 11, color: "#fff" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Turbo Code Agent</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "#7c3aed", background: "rgba(124,58,237,0.12)", padding: "2px 6px", borderRadius: 4 }}>Gemini 3.1 Pro</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map(msg => {
                if (msg.role === "building") {
                  const phase = msg.buildPhase ?? 0;
                  const done = msg.buildDone;
                  return (
                    <div key={msg.id} style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {done ? <Check style={{ width: 14, height: 14, color: "#10b981" }} /> : <Wand2 style={{ width: 14, height: 14, color: "#fff" }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: done ? "#10b981" : "#a78bfa", marginBottom: 2 }}>
                            {done ? "Build Complete!" : "Building..."}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.buildPrompt}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: done ? 10 : 0 }}>
                        <div style={{ fontSize: 11, color: done ? "#10b981" : "#a78bfa", marginBottom: 6 }}>{BUILD_PHASES[Math.min(phase, BUILD_PHASES.length - 1)]}</div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {BUILD_PHASES.map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= phase ? (done ? "#10b981" : "#7c3aed") : "rgba(255,255,255,0.08)", transition: "background 0.4s" }} />
                          ))}
                        </div>
                      </div>
                      {done && msg.deployUrl && (
                        <div style={{ marginTop: 10 }}>
                          <a href={msg.deployUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, padding: "6px 12px", color: "#10b981", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
                            <Globe style={{ width: 12, height: 12 }} /> Open deployed app <ExternalLink style={{ width: 11, height: 11 }} />
                          </a>
                        </div>
                      )}
                      {done && msg.files && (
                        <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {msg.files.map(f => (
                            <span key={f} style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: isUser ? "row-reverse" : "row" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: isUser ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isUser ? <User style={{ width: 13, height: 13, color: "#a78bfa" }} /> : <Bot style={{ width: 13, height: 13, color: "#fff" }} />}
                    </div>
                    <div style={{ maxWidth: "85%", background: isUser ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${isUser ? "rgba(124,58,237,0.2)" : C.border}`, borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px", padding: "8px 12px", fontSize: 12.5, color: C.text, lineHeight: 1.6 }}>
                      {renderMessage(msg.content)}
                    </div>
                  </div>
                );
              })}
              {agentLoading && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot style={{ width: 13, height: 13, color: "#fff" }} />
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: "4px 12px 12px 12px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `bounce 1.2s infinite ${i * 0.2}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "6px 8px" }}>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Build a todo app... or ask a question..."
                  disabled={agentLoading || !!buildingMsgId}
                  style={{ flex: 1, background: "none", border: "none", color: C.text, fontSize: 12.5, outline: "none", fontFamily: "inherit" }} />
                <button onClick={sendMessage} disabled={!input.trim() || agentLoading || !!buildingMsgId}
                  style={{ width: 28, height: 28, borderRadius: 7, background: input.trim() && !agentLoading ? C.accent : "rgba(255,255,255,0.05)", border: "none", cursor: input.trim() && !agentLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
                  {agentLoading ? <Loader2 style={{ width: 13, height: 13, color: "#fff", animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13, color: "#fff" }} />}
                </button>
              </div>
              <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {!hasProject && ["A portfolio website", "A todo app", "A snake game", "A calculator"].map(ex => (
                  <button key={ex} onClick={() => { setInput(ex); inputRef.current?.focus(); }}
                    style={{ fontSize: 10, color: C.muted, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 7px", cursor: "pointer" }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER: Editor ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {hasProject ? (
            <>
              {/* File tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: `1px solid ${C.border}`, background: C.panel, overflowX: "auto", flexShrink: 0, height: 36 }}>
                {files.map(file => (
                  <button key={file.name} onClick={() => setActiveFile(file.name)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 14px", height: "100%", background: activeFile === file.name ? C.bg : "transparent", borderRight: `1px solid ${C.border}`, border: "none", cursor: "pointer", color: activeFile === file.name ? "#a78bfa" : C.muted, fontSize: 12, whiteSpace: "nowrap", borderBottom: activeFile === file.name ? `1px solid ${C.accent}` : "1px solid transparent" }}>
                    <FileCode style={{ width: 11, height: 11, opacity: 0.7 }} />
                    {file.name}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Editor
                  height="100%"
                  language={getMonacoLang(activeFileData?.language || "javascript")}
                  value={activeFileData?.content || ""}
                  onChange={v => { setFiles(f => f.map(file => file.name === activeFile ? { ...file, content: v || "" } : file)); setUnsaved(true); }}
                  theme="vs-dark"
                  options={{ fontSize: 13.5, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontLigatures: true, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: "on", wordWrap: "on", automaticLayout: true, padding: { top: 16, bottom: 16 }, tabSize: 2, bracketPairColorization: { enabled: true } }}
                />
              </div>
            </>
          ) : (
            /* Welcome state */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #7c3aed, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 40px rgba(124,58,237,0.3)" }}>
                <Sparkles style={{ width: 32, height: 32, color: "#fff" }} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>Tell the Agent what to build</h2>
              <p style={{ fontSize: 14, color: C.muted, maxWidth: 400, lineHeight: 1.6 }}>
                Type what you want in the chat — Gemini 3.1 Pro will build the full app, deploy it, and show it here instantly.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview / Output ── */}
        <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 10px", height: 36, borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0 }}>
            {[
              { id: "preview" as const, icon: <Monitor style={{ width: 12, height: 12 }} />, label: "Preview" },
              { id: "output" as const, icon: <Terminal style={{ width: 12, height: 12 }} />, label: "Output" },
            ].map(p => (
              <button key={p.id} onClick={() => setRightPanel(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 10px", height: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: rightPanel === p.id ? "#a78bfa" : C.muted, borderBottom: rightPanel === p.id ? `1px solid ${C.accent}` : "1px solid transparent" }}>
                {p.icon} {p.label}
              </button>
            ))}
            {rightPanel === "preview" && hasProject && (
              <button onClick={runCode} style={{ marginLeft: "auto", color: C.muted, background: "none", border: "none", cursor: "pointer" }} title="Refresh preview">
                <RefreshCw style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>

          {rightPanel === "preview" ? (
            <iframe key={previewKey} srcDoc={livePreview || "<p style='font-family:sans-serif;color:#555;padding:24px;'>Run your HTML project to see the preview</p>"}
              style={{ flex: 1, border: "none", background: "#fff" }} sandbox="allow-scripts allow-same-origin allow-forms" />
          ) : (
            <div style={{ flex: 1, padding: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, overflowY: "auto", background: "#0a0a0f" }}>
              {isRunning && <div style={{ color: "#a78bfa" }}>Running...</div>}
              {output && <pre style={{ color: "#a5f3fc", margin: 0, whiteSpace: "pre-wrap" }}>{output}</pre>}
              {outputErr && <pre style={{ color: "#ef4444", margin: 0, whiteSpace: "pre-wrap" }}>{outputErr}</pre>}
              {!isRunning && !output && !outputErr && <div style={{ color: C.muted }}>Run your code to see output here</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── Deploy Modal ── */}
      {showDeployModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#111118", border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Rocket style={{ width: 20, height: 20, color: C.accent }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Deploy Project</span>
              </div>
              <button onClick={() => setShowDeployModal(false)} style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}><X style={{ width: 18, height: 18 }} /></button>
            </div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
              Your project will be published to a public URL at <strong style={{ color: C.text }}>{window.location.origin}/p/your-slug</strong>
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Custom domain (optional)</label>
              <input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="myapp.com"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
            {deployUrl && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <a href={deployUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#10b981", fontSize: 13, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis" }}>{window.location.origin}{deployUrl}</a>
                <button onClick={copyUrl} style={{ color: copied ? "#10b981" : C.muted, background: "none", border: "none", cursor: "pointer" }}>
                  {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            )}
            <button onClick={deployProject} disabled={isDeploying}
              style={{ width: "100%", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: 10, padding: "12px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: isDeploying ? 0.7 : 1 }}>
              {isDeploying ? "Deploying..." : deployUrl ? "Redeploy" : "Deploy to Web"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
