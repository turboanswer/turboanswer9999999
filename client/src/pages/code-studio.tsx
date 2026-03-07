import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Editor from "@monaco-editor/react";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play, Save, Rocket, ChevronLeft, Plus, Trash2, Globe, Copy,
  Code2, Eye, Terminal, Loader2, FileCode, FolderOpen, Sparkles,
  Send, RefreshCw, X, ExternalLink, Check, Monitor, Wand2, Zap, Lock,
} from "lucide-react";
import type { CodeProject } from "@shared/schema";

type CodeFile = { name: string; content: string; language: string };

const LANGUAGES = [
  { id: "html", label: "HTML / CSS / JS", icon: "🌐" },
  { id: "python", label: "Python", icon: "🐍" },
  { id: "javascript", label: "JavaScript", icon: "📜" },
  { id: "typescript", label: "TypeScript", icon: "🔷" },
  { id: "java", label: "Java", icon: "☕" },
  { id: "cpp", label: "C++", icon: "⚙️" },
  { id: "rust", label: "Rust", icon: "🦀" },
  { id: "go", label: "Go", icon: "🐹" },
];

const BUILD_PHASES = [
  "✨ Reading your request...",
  "🧠 Antigravity · Gemini 3.1 Pro is designing the app...",
  "📝 Writing the code files...",
  "🎨 Styling the interface...",
  "⚡ Wiring up functionality...",
  "🚀 Almost ready — launching preview...",
];

function getMonacoLang(language: string): string {
  const map: Record<string, string> = {
    html: "html", css: "css", javascript: "javascript", typescript: "typescript",
    python: "python", java: "java", cpp: "cpp", c: "c", rust: "rust",
    go: "go", php: "php", ruby: "ruby",
  };
  return map[language] || "plaintext";
}

function isWebProject(lang: string) { return lang === "html"; }

function buildSrcdoc(files: CodeFile[]): string {
  const htmlFile = files.find(f => f.name === "index.html") || files.find(f => f.language === "html");
  if (!htmlFile) return "<p style='font-family:sans-serif;padding:2rem;color:#888'>No HTML file found.</p>";
  let html = htmlFile.content;
  for (const file of files) {
    if (file.language === "css") {
      html = html.replace(`<link rel="stylesheet" href="${file.name}" />`, `<style>${file.content}</style>`)
                 .replace(`<link rel="stylesheet" href="${file.name}">`, `<style>${file.content}</style>`);
    }
    if (file.language === "javascript") {
      html = html.replace(`<script src="${file.name}"></script>`, `<script>${file.content}</script>`);
    }
  }
  return html;
}

type AiMsg = { role: "user" | "assistant"; content: string };

export default function CodeStudio() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isDark = theme === "dark";

  // Projects
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CodeProject | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState("html");

  // Editor
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // Build with AI
  const [buildPrompt, setBuildPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildPhase, setBuildPhase] = useState(0);
  const [buildingFileName, setBuildingFileName] = useState("");
  const [justBuiltFiles, setJustBuiltFiles] = useState<Set<string>>(new Set());
  const [showRebuildInput, setShowRebuildInput] = useState(false);
  const [rebuildPrompt, setRebuildPrompt] = useState("");
  const buildPhaseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run / Preview
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [outputErr, setOutputErr] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [livePreview, setLivePreview] = useState("");
  const [rightPanel, setRightPanel] = useState<"preview" | "output" | "ai">("preview");

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [copied, setCopied] = useState(false);

  // AI Chat
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: "assistant", content: "Hi! I'm **Turbo Code**, powered by Gemini 3.1 Pro. I can write, fix, and explain any code. What are you building?" },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const activeFileData = files.find(f => f.name === activeFile);
  const mainLang = currentProject?.mainLanguage || "html";
  const hasProject = !!currentProject;

  useEffect(() => { if (isAuthenticated) loadProjects(); }, [isAuthenticated]);

  useEffect(() => {
    if (isWebProject(mainLang) && files.length > 0) setLivePreview(buildSrcdoc(files));
  }, [files, mainLang]);

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  // Handle addon activation redirect from PayPal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('addon') === 'activated') {
      const subId = params.get('subscription_id');
      if (subId) {
        fetch('/api/confirm-addon-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: subId }),
          credentials: 'include',
        }).then(r => r.json()).then(d => {
          if (d.success) {
            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            toast({ title: 'Code Studio Activated!', description: 'Your add-on is now active. Enjoy building!' });
          } else {
            toast({ title: 'Activation issue', description: d.error || 'Please contact support.', variant: 'destructive' });
          }
          window.history.replaceState({}, '', '/code-studio');
        }).catch(() => {});
      } else {
        window.history.replaceState({}, '', '/code-studio');
      }
    }
  }, []);

  const addonMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/create-addon-subscription'),
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message || 'Could not start checkout', variant: 'destructive' });
    },
  });

  async function loadProjects() {
    try {
      const res = await fetch("/api/code/projects", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0) openProject(data[0]);
      }
    } catch {}
  }

  function openProject(project: CodeProject) {
    setCurrentProject(project);
    const f = (project.files as CodeFile[]) || [];
    setFiles(f);
    setActiveFile(f[0]?.name || "");
    setUnsaved(false);
    setDeployUrl(project.isPublished && project.slug ? `/p/${project.slug}` : null);
    setShowProjects(false);
    setRightPanel(isWebProject(project.mainLanguage) ? "preview" : "output");
  }

  // ── One-prompt AI Build ──────────────────────────────────────────────────
  async function buildWithAI(prompt: string) {
    if (!prompt.trim() || isBuilding) return;
    setIsBuilding(true);
    setBuildPhase(0);
    setBuildingFileName("");
    setJustBuiltFiles(new Set());

    // Cycle through build phases for visual feedback
    let phase = 0;
    buildPhaseRef.current = setInterval(() => {
      phase = Math.min(phase + 1, BUILD_PHASES.length - 1);
      setBuildPhase(phase);
    }, 2200);

    try {
      const res = await fetch("/api/code/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: prompt.trim(), projectId: currentProject?.id }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Build failed");

      clearInterval(buildPhaseRef.current!);

      const generatedFiles: CodeFile[] = data.files;
      const project: CodeProject = data.project;

      setCurrentProject(project);
      setProjects(p => [project, ...p.filter(pr => pr.id !== project.id)]);
      setFiles([]);
      setActiveFile(generatedFiles[0]?.name || "");
      setDeployUrl(null);
      setRightPanel(isWebProject(project.mainLanguage) ? "preview" : "output");

      // Animate files appearing one by one
      for (let i = 0; i < generatedFiles.length; i++) {
        const file = generatedFiles[i];
        setBuildingFileName(file.name);
        await delay(350);
        setFiles(prev => {
          const exists = prev.find(f => f.name === file.name);
          return exists ? prev.map(f => f.name === file.name ? file : f) : [...prev, file];
        });
        setJustBuiltFiles(prev => new Set([...prev, file.name]));
        await delay(200);
      }

      setActiveFile(generatedFiles[0]?.name || "");
      setBuildingFileName("");
      setIsBuilding(false);

      // Auto-run after a short pause
      await delay(400);
      if (isWebProject(project.mainLanguage)) {
        setLivePreview(buildSrcdoc(generatedFiles));
        setPreviewKey(k => k + 1);
        setRightPanel("preview");
      } else {
        await runCodeWithFiles(generatedFiles, project.mainLanguage);
      }

      setUnsaved(false);
      toast({ title: "App built!", description: `"${project.name}" is ready` });
    } catch (e: any) {
      clearInterval(buildPhaseRef.current!);
      setIsBuilding(false);
      toast({ title: "Build failed", description: e.message, variant: "destructive" });
    }
  }

  function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  async function runCode() {
    await runCodeWithFiles(files, mainLang);
  }

  async function runCodeWithFiles(theFiles: CodeFile[], lang: string) {
    if (isWebProject(lang)) {
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
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language: mainFile.language, code: mainFile.content }),
      });
      const data = await res.json();
      setOutput(data.output || "");
      setOutputErr(data.stderr || "");
    } catch (e: any) { setOutputErr(e.message); }
    finally { setIsRunning(false); }
  }

  async function saveProject() {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/code/projects/${currentProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: currentProject.name, description: currentProject.description, files, mainLanguage: mainLang }),
      });
      const updated = await res.json();
      setCurrentProject(updated);
      setProjects(p => p.map(pr => pr.id === updated.id ? updated : pr));
      setUnsaved(false);
      toast({ title: "Saved!" });
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setIsSaving(false); }
  }

  async function createBlankProject() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/code/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim(), mainLanguage: newLang }),
      });
      const project = await res.json();
      setProjects(p => [project, ...p]);
      openProject(project);
      setShowNewModal(false);
      setNewName("");
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/code/projects/${id}`, { method: "DELETE", credentials: "include" });
    setProjects(p => p.filter(pr => pr.id !== id));
    if (currentProject?.id === id) { setCurrentProject(null); setFiles([]); }
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
      toast({ title: "Deployed!", description: `Live at ${window.location.origin}${data.publishUrl}` });
    } catch (e: any) { toast({ title: "Deploy failed", description: e.message, variant: "destructive" }); }
    finally { setIsDeploying(false); }
  }

  async function sendAiMessage() {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setAiMessages(m => [...m, { role: "user", content: msg }]);
    setAiLoading(true);
    try {
      const res = await fetch("/api/code/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, code: activeFileData?.content || "", language: activeFileData?.language || mainLang }),
      });
      const data = await res.json();
      setAiMessages(m => [...m, { role: "assistant", content: data.reply || "No response" }]);
    } catch {
      setAiMessages(m => [...m, { role: "assistant", content: "Error — please try again." }]);
    } finally { setAiLoading(false); }
  }

  function updateFileContent(content: string) {
    setFiles(f => f.map(file => file.name === activeFile ? { ...file, content } : file));
    setUnsaved(true);
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

  function copyDeployUrl() {
    if (!deployUrl) return;
    navigator.clipboard.writeText(`${window.location.origin}${deployUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderAiContent(content: string) {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.slice(3, -3).split("\n");
        const lang = lines[0] || "";
        const code = lines.slice(1).join("\n");
        return (
          <pre key={i} className={`rounded-lg p-3 text-xs overflow-x-auto my-2 ${isDark ? "bg-black/40 border border-white/10" : "bg-gray-100"}`}>
            {lang && <div className="text-violet-400 text-[10px] mb-1">{lang}</div>}
            <code className="text-green-300">{code}</code>
          </pre>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part.replace(/\*\*(.*?)\*\*/g, "$1")}</span>;
    });
  }

  // Styles
  const bg = isDark ? "bg-[#0d0d1a]" : "bg-gray-50";
  const surface = isDark ? "bg-[#13131f]" : "bg-white";
  const border = isDark ? "border-white/[0.08]" : "border-gray-200";
  const text = isDark ? "text-gray-200" : "text-gray-800";
  const muted = isDark ? "text-gray-500" : "text-gray-400";
  const tabBg = isDark ? "bg-[#1a1a2e]" : "bg-gray-100";

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="text-center">
          <Code2 className="h-12 w-12 text-violet-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold mb-4 ${text}`}>Sign in to use Code Studio</h2>
          <Button onClick={() => navigate("/login")} className="bg-violet-600 hover:bg-violet-700">Sign In</Button>
        </div>
      </div>
    );
  }

  if (!authLoading && !user?.codeStudioAddon) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${bg}`}>
        <div className="max-w-md w-full text-center">
          <div className="relative mb-6 inline-block">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30">
              <Code2 className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-[#0d1117]">
              <Lock className="h-3.5 w-3.5 text-black" />
            </div>
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${text}`}>Code Studio</h1>
          <p className={`text-sm mb-6 ${muted}`}>Full-featured AI IDE — build, run, and deploy apps with one prompt</p>
          <div className={`rounded-xl border p-5 mb-6 text-left ${isDark ? 'bg-[#111120] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-3">What you get</div>
            {[
              "AI generates full apps from a single prompt",
              "Monaco editor (VS Code engine) with multi-file support",
              "Live preview for HTML/CSS/JS projects",
              "Run Python, JS, TypeScript, Java, Go, Rust & more",
              "Deploy projects to a public shareable URL",
              "Gemini 3.1 Pro AI for code generation & debugging",
            ].map(f => (
              <div key={f} className="flex items-start gap-2 mb-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <span className={`text-sm ${text}`}>{f}</span>
              </div>
            ))}
          </div>
          <div className={`rounded-xl border p-4 mb-5 flex items-center justify-between ${isDark ? 'bg-[#0d1a0d] border-green-500/20' : 'bg-green-50 border-green-200'}`}>
            <div>
              <div className={`text-xs ${muted} mb-0.5`}>Add-on for any plan</div>
              <div className={`text-2xl font-bold ${text}`}>$10 <span className={`text-sm font-normal ${muted}`}>/ month</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-green-400 font-medium">Cancel anytime</div>
              <div className={`text-xs ${muted}`}>Separate from main plan</div>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 text-base"
            onClick={() => addonMutation.mutate()}
            disabled={addonMutation.isPending}
          >
            {addonMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to PayPal…</> : 'Add Code Studio — $10/mo'}
          </Button>
          <p className={`text-xs mt-3 ${muted}`}>Secure payment via PayPal. Your main subscription is unaffected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${bg} ${text}`}>

      {/* ── AI Build Loading Overlay ── */}
      {isBuilding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="text-center max-w-md px-6">
            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full border-2 border-violet-500/30 animate-ping" />
              <div className="absolute w-16 h-16 rounded-full border-2 border-violet-400/50 animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-2xl shadow-violet-500/40">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-violet-300 font-semibold text-lg mb-2">{BUILD_PHASES[buildPhase]}</p>
            {buildingFileName && (
              <p className="text-gray-400 text-sm">Writing <code className="text-cyan-400">{buildingFileName}</code>...</p>
            )}
            <div className="mt-6 flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Toolbar ── */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
        <button onClick={() => navigate("/chat")} className={`flex items-center gap-1 text-xs ${muted} hover:text-violet-400 transition-colors`}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 mr-2">
          <Code2 className="h-5 w-5 text-violet-500" />
          <span className="font-bold text-sm bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Code Studio</span>
        </div>

        {/* Project selector */}
        <div className="relative">
          <button onClick={() => setShowProjects(v => !v)}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]" : "bg-gray-100 border-gray-200 hover:bg-gray-200"}`}>
            <FolderOpen className="h-3.5 w-3.5 text-violet-400" />
            <span className="max-w-[140px] truncate">{currentProject?.name || "Projects"}</span>
            {unsaved && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </button>

          {showProjects && (
            <div className={`absolute left-0 top-full mt-1 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden ${isDark ? "bg-[#1a1a2e] border-white/10" : "bg-white border-gray-200"}`}>
              <div className={`p-2 border-b ${border}`}>
                <button onClick={() => { setShowNewModal(true); setShowProjects(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10">
                  <Plus className="h-4 w-4" /> Blank project
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {projects.length === 0 && <div className={`px-4 py-3 text-xs ${muted}`}>No saved projects</div>}
                {projects.map(p => (
                  <div key={p.id} className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${isDark ? "hover:bg-white/[0.05]" : "hover:bg-gray-50"} ${currentProject?.id === p.id ? isDark ? "bg-violet-500/10" : "bg-violet-50" : ""}`}>
                    <span className="flex-1 text-sm truncate" onClick={() => openProject(p)}>{p.name}</span>
                    <span className={`text-[10px] ${muted}`}>{p.mainLanguage}</span>
                    {p.isPublished && <Globe className="h-3 w-3 text-green-400" />}
                    <button onClick={() => deleteProject(p.id)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Rebuild with AI */}
        {hasProject && (
          <div className="relative">
            <Button size="sm" variant="ghost" onClick={() => setShowRebuildInput(v => !v)}
              className={`h-8 gap-1.5 text-xs ${isDark ? "text-violet-400 hover:text-violet-300" : "text-violet-600 hover:text-violet-700"}`}>
              <Wand2 className="h-3.5 w-3.5" /> Rebuild
            </Button>
            {showRebuildInput && (
              <div className={`absolute right-0 top-full mt-1 w-80 rounded-xl border shadow-2xl z-50 p-3 ${isDark ? "bg-[#1a1a2e] border-white/10" : "bg-white border-gray-200"}`}>
                <p className={`text-xs ${muted} mb-2`}>Describe changes or a new version:</p>
                <div className="flex gap-2">
                  <Input value={rebuildPrompt} onChange={e => setRebuildPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { setShowRebuildInput(false); buildWithAI(rebuildPrompt); setRebuildPrompt(""); } }}
                    placeholder="Make it a dark theme stopwatch..."
                    className={`text-xs h-8 ${isDark ? "bg-black/20 border-white/10" : ""}`} autoFocus />
                  <Button size="sm" onClick={() => { setShowRebuildInput(false); buildWithAI(rebuildPrompt); setRebuildPrompt(""); }}
                    className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-500 shrink-0">
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Button size="sm" variant="ghost" onClick={saveProject} disabled={isSaving || !hasProject}
          className={`h-8 gap-1.5 text-xs ${unsaved ? "text-orange-400" : muted}`}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </Button>

        <Button size="sm" onClick={runCode} disabled={isRunning || !hasProject}
          className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white">
          {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
        </Button>

        {deployUrl && (
          <a href={deployUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${isDark ? "border-green-500/30 text-green-400 hover:bg-green-500/10" : "border-green-300 text-green-600 hover:bg-green-50"}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <Button size="sm" onClick={() => setShowDeploy(true)} disabled={!hasProject}
          className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white">
          <Rocket className="h-3.5 w-3.5" /> {deployUrl ? "Redeploy" : "Deploy"}
        </Button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <div className={`w-48 shrink-0 flex flex-col border-r ${border} ${surface}`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Files</span>
            <button onClick={() => setShowAddFile(v => !v)} className="text-violet-400 hover:text-violet-300">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {showAddFile && (
            <div className={`p-2 border-b ${border}`}>
              <div className="flex gap-1">
                <Input value={newFileName} onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addFile()}
                  placeholder="file.js" className={`h-7 text-xs ${isDark ? "bg-black/20 border-white/10" : ""}`} />
                <button onClick={addFile} className="text-violet-400"><Check className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto py-1">
            {files.map(file => (
              <div key={file.name}
                className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs transition-all ${
                  justBuiltFiles.has(file.name) && isBuilding ? "animate-pulse" : ""
                } ${activeFile === file.name
                  ? isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700"
                  : isDark ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setActiveFile(file.name)}>
                <FileCode className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{file.name}</span>
                {justBuiltFiles.has(file.name) && <Zap className="h-3 w-3 text-yellow-400 shrink-0" />}
              </div>
            ))}
          </div>
          {/* Panel toggle */}
          <div className={`border-t ${border} p-2 space-y-1`}>
            {[
              { id: "preview", icon: <Monitor className="h-3.5 w-3.5" />, label: "Preview", color: "text-blue-400 bg-blue-500/20" },
              { id: "output", icon: <Terminal className="h-3.5 w-3.5" />, label: "Output", color: "text-green-400 bg-green-500/20" },
              { id: "ai", icon: <Sparkles className="h-3.5 w-3.5" />, label: "AI Chat", color: "text-violet-400 bg-violet-500/20" },
            ].map(p => (
              <button key={p.id} onClick={() => setRightPanel(p.id as any)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${rightPanel === p.id ? p.color : `${muted} hover:text-white`}`}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Editor or Hero */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {hasProject ? (
            <>
              {/* File tabs */}
              <div className={`flex items-center gap-0.5 px-2 py-1 border-b ${border} ${tabBg} overflow-x-auto shrink-0`}>
                {files.map(file => (
                  <button key={file.name} onClick={() => setActiveFile(file.name)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                      activeFile === file.name
                        ? isDark ? "bg-[#1e1e3f] text-violet-300 border border-violet-500/30" : "bg-white text-violet-700 border border-violet-200 shadow-sm"
                        : `${muted} hover:text-violet-400`
                    }`}>
                    <FileCode className="h-3 w-3 opacity-60" />
                    {file.name}
                    {justBuiltFiles.has(file.name) && <Zap className="h-2.5 w-2.5 text-yellow-400" />}
                  </button>
                ))}
              </div>
              {/* Monaco */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language={getMonacoLang(activeFileData?.language || "javascript")}
                  value={activeFileData?.content || ""}
                  onChange={v => updateFileContent(v || "")}
                  theme={isDark ? "vs-dark" : "light"}
                  options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    renderLineHighlight: "gutter",
                    bracketPairColorization: { enabled: true },
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                    quickSuggestions: true,
                    tabSize: 2,
                  }}
                />
              </div>
            </>
          ) : (
            /* ── Hero Build Screen ── */
            <div className={`flex-1 flex flex-col items-center justify-center p-8 ${isDark ? "bg-[#0d0d1a]" : "bg-gray-50"}`}>
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                    <Wand2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  What do you want to build?
                </h1>
                <p className={`text-sm ${muted}`}>
                  Describe your app — Antigravity (Gemini 3.1 Pro) writes all the code and builds it live
                </p>
              </div>

              <div className="w-full max-w-xl">
                <div className={`flex gap-2 p-2 rounded-2xl border ${isDark ? "bg-white/[0.04] border-white/10" : "bg-white border-gray-200 shadow-lg"}`}>
                  <input
                    value={buildPrompt}
                    onChange={e => setBuildPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { buildWithAI(buildPrompt); setBuildPrompt(""); } }}
                    placeholder="a stopwatch app with dark theme and animations..."
                    className={`flex-1 bg-transparent text-sm outline-none px-2 ${isDark ? "text-gray-200 placeholder-gray-600" : "text-gray-800 placeholder-gray-400"}`}
                    autoFocus
                  />
                  <Button
                    onClick={() => { buildWithAI(buildPrompt); setBuildPrompt(""); }}
                    disabled={!buildPrompt.trim()}
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl px-4 gap-2 shrink-0">
                    <Wand2 className="h-4 w-4" /> Build
                  </Button>
                </div>

                {/* Example prompts */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    "a stopwatch with laps",
                    "a to-do list app",
                    "a snake game",
                    "a weather dashboard",
                    "a calculator app",
                    "a budget tracker",
                    "a markdown preview editor",
                    "a quiz app",
                  ].map(ex => (
                    <button key={ex} onClick={() => { buildWithAI(ex); }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${isDark ? "border-white/10 text-gray-400 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10" : "border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50"}`}>
                      {ex}
                    </button>
                  ))}
                </div>

                <div className={`mt-6 text-center text-xs ${muted} flex items-center justify-center gap-2`}>
                  <span>or</span>
                  <button onClick={() => setShowNewModal(true)} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    start with a blank project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className={`w-96 shrink-0 flex flex-col border-l ${border} overflow-hidden`}>
          {rightPanel === "preview" && (
            <div className="flex flex-col h-full">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
                <Monitor className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold">Live Preview</span>
                <div className="flex-1" />
                <button onClick={() => { setLivePreview(buildSrcdoc(files)); setPreviewKey(k => k + 1); }} className="text-blue-400 hover:text-blue-300">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {deployUrl && (
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="flex-1 bg-white">
                {isWebProject(mainLang) ? (
                  <iframe key={previewKey} srcDoc={livePreview} className="w-full h-full border-0"
                    sandbox="allow-scripts allow-modals" title="Live Preview" />
                ) : (
                  <div className={`flex items-center justify-center h-full ${isDark ? "bg-[#0d0d1a]" : "bg-gray-50"}`}>
                    <div className={`text-center text-sm ${muted}`}>
                      <Monitor className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p>Preview is for HTML/CSS/JS apps</p>
                      <p className="text-xs opacity-60 mt-1">Use Output to run code</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {rightPanel === "output" && (
            <div className="flex flex-col h-full">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
                <Terminal className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-semibold">Output</span>
                <div className="flex-1" />
                <button onClick={runCode} disabled={isRunning} className="text-green-400 hover:text-green-300 disabled:opacity-50">
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { setOutput(""); setOutputErr(""); }} className={`${muted} hover:text-red-400`}><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-black/90">
                {isRunning && <div className="text-yellow-400 flex items-center gap-2 mb-2"><Loader2 className="h-3 w-3 animate-spin" /> Running...</div>}
                {!output && !outputErr && !isRunning && (
                  <div className="text-gray-600 text-center mt-8"><Terminal className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>Press Run to execute</p></div>
                )}
                {output && <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>}
                {outputErr && <pre className="text-red-400 whitespace-pre-wrap mt-2">{outputErr}</pre>}
              </div>
            </div>
          )}

          {rightPanel === "ai" && (
            <div className="flex flex-col h-full">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-semibold">Turbo Code AI</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-600"}`}>Antigravity · Gemini 3.1 Pro</span>
                <div className="flex-1" />
                <button onClick={() => setAiMessages([{ role: "assistant", content: "Chat cleared. How can I help?" }])} className={`${muted} hover:text-red-400`}><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isDark ? "bg-[#0d0d1a]" : "bg-gray-50"}`}>
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white" : isDark ? "bg-[#1a1a2e] border border-white/[0.06] text-gray-200" : "bg-white border border-gray-200 text-gray-800"}`}>
                      {renderAiContent(msg.content)}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className={`px-3 py-2 rounded-xl text-xs ${isDark ? "bg-[#1a1a2e] border border-white/[0.06]" : "bg-white border border-gray-200"}`}>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>
              <div className={`p-2 border-t ${border} ${surface}`}>
                <div className="flex gap-2">
                  <Input value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                    placeholder="Ask AI anything about the code..."
                    className={`text-xs h-8 ${isDark ? "bg-black/20 border-white/10" : ""}`} />
                  <Button size="sm" onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()} className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-500 shrink-0">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {["Fix bugs", "Optimize", "Explain code", "Add feature"].map(s => (
                    <button key={s} onClick={() => setAiInput(s)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${isDark ? "border-white/10 text-gray-500 hover:text-violet-400 hover:border-violet-500/30" : "border-gray-200 text-gray-400 hover:text-violet-500 hover:border-violet-300"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Blank Project Modal ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewModal(false)}>
          <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? "bg-[#13131f] border-white/10" : "bg-white border-gray-200"}`}>
            <h2 className={`text-lg font-bold mb-4 ${text}`}>New Blank Project</h2>
            <div className="space-y-4">
              <Input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createBlankProject()}
                placeholder="Project name" className={isDark ? "bg-black/20 border-white/10" : ""} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.id} onClick={() => setNewLang(lang.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${newLang === lang.id
                      ? isDark ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-violet-50 border-violet-300 text-violet-700"
                      : isDark ? "bg-white/[0.03] border-white/[0.08] text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                    <span>{lang.icon}</span> {lang.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={createBlankProject} disabled={!newName.trim()} className="flex-1 bg-violet-600 hover:bg-violet-500">Create</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Deploy Modal ── */}
      {showDeploy && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowDeploy(false)}>
          <div onClick={e => e.stopPropagation()} className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isDark ? "bg-[#13131f] border-white/10" : "bg-white border-gray-200"}`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${border} ${isDark ? "bg-gradient-to-r from-violet-900/30 to-cyan-900/20" : "bg-gradient-to-r from-violet-50 to-cyan-50"}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/20"><Rocket className="h-6 w-6 text-violet-400" /></div>
                <div>
                  <h2 className={`text-lg font-bold ${text}`}>Deploy "{currentProject?.name}"</h2>
                  <p className={`text-xs ${muted}`}>Get a public URL you can share with anyone</p>
                </div>
                <button onClick={() => setShowDeploy(false)} className={`ml-auto ${muted} hover:text-white`}><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Live URL — shown after deploy */}
              {deployUrl ? (
                <div className={`rounded-2xl border p-4 ${isDark ? "bg-green-500/8 border-green-500/25" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className={`text-sm font-semibold ${isDark ? "text-green-300" : "text-green-700"}`}>Your app is live!</span>
                  </div>
                  <div className={`rounded-xl px-3 py-2.5 mb-3 font-mono text-sm break-all ${isDark ? "bg-black/40 text-green-300" : "bg-white text-green-800 border border-green-200"}`}>
                    {window.location.origin}{deployUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copyDeployUrl} variant="outline" size="sm" className={`flex-1 gap-2 ${isDark ? "border-green-500/30 text-green-300 hover:bg-green-500/10" : "border-green-300 text-green-700"}`}>
                      {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy URL</>}
                    </Button>
                    <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white">
                        <ExternalLink className="h-3.5 w-3.5" /> Open App
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border border-dashed p-4 text-center ${isDark ? "border-white/15 text-gray-500" : "border-gray-300 text-gray-400"}`}>
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Your app will be live at:</p>
                  <p className={`text-xs mt-1 font-mono ${isDark ? "text-violet-400" : "text-violet-600"}`}>{window.location.origin}/p/your-app-name</p>
                </div>
              )}

              {/* Custom Domain */}
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider ${muted} mb-2 block`}>Custom Domain</label>
                <div className="flex gap-2">
                  <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="myapp.com or app.mysite.com"
                    className={`text-sm ${isDark ? "bg-black/20 border-white/10" : ""}`} />
                </div>
                {customDomain && (
                  <div className={`mt-2 rounded-xl border p-3 text-xs space-y-1.5 ${isDark ? "bg-blue-500/8 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
                    <p className="font-semibold">DNS Setup Instructions:</p>
                    <p>Add one of these records at your domain registrar:</p>
                    <div className={`rounded-lg p-2 font-mono text-[11px] space-y-1 ${isDark ? "bg-black/30" : "bg-white border border-blue-200"}`}>
                      <div><span className="opacity-60">Type:</span> CNAME</div>
                      <div><span className="opacity-60">Name:</span> {customDomain.includes('.') && customDomain.split('.').length > 2 ? customDomain.split('.')[0] : '@'}</div>
                      <div><span className="opacity-60">Value:</span> {window.location.host}</div>
                    </div>
                    <p className="opacity-70">DNS changes can take up to 24–48 hours to propagate worldwide.</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowDeploy(false)} className="flex-1">Cancel</Button>
                <Button onClick={deployProject} disabled={isDeploying} className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white gap-2">
                  {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {deployUrl ? "Redeploy" : "Deploy & Get URL"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
