import { useState, useEffect, useRef, useCallback } from "react";
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
  Send, RefreshCw, X, Settings, ExternalLink, Check, Monitor,
} from "lucide-react";
import type { CodeProject } from "@shared/schema";

type CodeFile = { name: string; content: string; language: string };

const LANGUAGES = [
  { id: "html", label: "HTML/CSS/JS", icon: "🌐", ext: ".html" },
  { id: "python", label: "Python", icon: "🐍", ext: ".py" },
  { id: "javascript", label: "JavaScript", icon: "☕", ext: ".js" },
  { id: "typescript", label: "TypeScript", icon: "🔷", ext: ".ts" },
  { id: "java", label: "Java", icon: "☕", ext: ".java" },
  { id: "cpp", label: "C++", icon: "⚙️", ext: ".cpp" },
  { id: "rust", label: "Rust", icon: "🦀", ext: ".rs" },
  { id: "go", label: "Go", icon: "🐹", ext: ".go" },
];

function getMonacoLang(language: string): string {
  const map: Record<string, string> = {
    html: "html", css: "css", javascript: "javascript", typescript: "typescript",
    python: "python", java: "java", cpp: "cpp", c: "c", rust: "rust",
    go: "go", php: "php", ruby: "ruby", swift: "swift", kotlin: "kotlin",
  };
  return map[language] || "plaintext";
}

function isWebProject(lang: string) {
  return lang === "html";
}

function buildSrcdoc(files: CodeFile[]): string {
  const htmlFile = files.find(f => f.name === "index.html") || files.find(f => f.language === "html");
  if (!htmlFile) return "<p>No HTML file found.</p>";
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

type AiMessage = { role: "user" | "assistant"; content: string };

export default function CodeStudio() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const isDark = theme === "dark";

  // Projects
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [currentProject, setCurrentProject] = useState<CodeProject | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLang, setNewProjectLang] = useState("html");
  const [showNewProject, setShowNewProject] = useState(false);

  // Editor state
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  // Run / Preview
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [outputErr, setOutputErr] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [rightPanel, setRightPanel] = useState<"preview" | "output" | "ai">("preview");
  const [livePreview, setLivePreview] = useState("");

  // Deploy
  const [isDeploying, setIsDeploying] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [copied, setCopied] = useState(false);

  // AI Chat
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    { role: "assistant", content: "Hi! I'm **Turbo Code**, powered by Gemini 3.1 Pro. I can help you write, debug, and optimize your code. What are you building today?" },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // New file
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const activeFileData = files.find(f => f.name === activeFile);
  const mainLang = currentProject?.mainLanguage || "html";

  // Load projects on mount
  useEffect(() => {
    if (isAuthenticated) loadProjects();
  }, [isAuthenticated]);

  // Update live preview on HTML file change
  useEffect(() => {
    if (isWebProject(mainLang)) {
      setLivePreview(buildSrcdoc(files));
    }
  }, [files, mainLang]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function loadProjects() {
    try {
      const res = await fetch("/api/code/projects", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0 && !currentProject) openProject(data[0]);
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
    if (isWebProject(project.mainLanguage)) {
      setRightPanel("preview");
    } else {
      setRightPanel("output");
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("/api/code/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newProjectName.trim(), mainLanguage: newProjectLang }),
      });
      const project = await res.json();
      setProjects(p => [project, ...p]);
      openProject(project);
      setShowNewProject(false);
      setNewProjectName("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
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
        body: JSON.stringify({ name: currentProject.name, description: currentProject.description, files, mainLanguage: mainLang }),
      });
      const updated = await res.json();
      setCurrentProject(updated);
      setProjects(p => p.map(pr => pr.id === updated.id ? updated : pr));
      setUnsaved(false);
      toast({ title: "Saved!", description: "Your project has been saved." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/code/projects/${id}`, { method: "DELETE", credentials: "include" });
    setProjects(p => p.filter(pr => pr.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setFiles([]);
    }
  }

  async function runCode() {
    if (!activeFileData) return;
    setIsRunning(true);
    setOutput("");
    setOutputErr("");
    setRightPanel("output");

    if (isWebProject(mainLang)) {
      setLivePreview(buildSrcdoc(files));
      setPreviewKey(k => k + 1);
      setRightPanel("preview");
      setIsRunning(false);
      return;
    }

    try {
      const activeCode = activeFileData.content;
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language: activeFileData.language, code: activeCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOutputErr(data.error || "Execution failed");
      } else {
        setOutput(data.output || "");
        setOutputErr(data.stderr || "");
      }
    } catch (e: any) {
      setOutputErr(e.message);
    } finally {
      setIsRunning(false);
    }
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
      const url = `${window.location.origin}${data.publishUrl}`;
      setDeployUrl(data.publishUrl);
      setCurrentProject(data.project);
      toast({ title: "Deployed!", description: `Live at ${url}` });
    } catch (e: any) {
      toast({ title: "Deploy failed", description: e.message, variant: "destructive" });
    } finally {
      setIsDeploying(false);
    }
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
        body: JSON.stringify({
          message: msg,
          code: activeFileData?.content || "",
          language: activeFileData?.language || mainLang,
        }),
      });
      const data = await res.json();
      setAiMessages(m => [...m, { role: "assistant", content: data.reply || "No response" }]);
    } catch {
      setAiMessages(m => [...m, { role: "assistant", content: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
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
    const language = langMap[ext] || "plaintext";
    setFiles(f => [...f, { name, content: "", language }]);
    setActiveFile(name);
    setShowAddFile(false);
    setNewFileName("");
    setUnsaved(true);
  }

  function removeFile(name: string) {
    if (files.length === 1) return;
    setFiles(f => f.filter(file => file.name !== name));
    if (activeFile === name) setActiveFile(files[0].name);
    setUnsaved(true);
  }

  function copyDeployUrl() {
    if (!deployUrl) return;
    navigator.clipboard.writeText(`${window.location.origin}${deployUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const bg = isDark ? "bg-[#0d0d1a]" : "bg-gray-50";
  const surface = isDark ? "bg-[#13131f]" : "bg-white";
  const border = isDark ? "border-white/[0.08]" : "border-gray-200";
  const text = isDark ? "text-gray-200" : "text-gray-800";
  const muted = isDark ? "text-gray-500" : "text-gray-400";
  const tabBg = isDark ? "bg-[#1a1a2e]" : "bg-gray-100";

  function renderAiContent(content: string) {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.slice(3, -3).split("\n");
        const lang = lines[0] || "";
        const code = lines.slice(1).join("\n");
        return (
          <pre key={i} className={`rounded-lg p-3 text-xs overflow-x-auto my-2 ${isDark ? "bg-black/40 border border-white/10" : "bg-gray-100 border border-gray-200"}`}>
            {lang && <div className="text-violet-400 text-[10px] mb-1">{lang}</div>}
            <code className="text-green-300">{code}</code>
          </pre>
        );
      }
      return <span key={i} className="whitespace-pre-wrap">{part.replace(/\*\*(.*?)\*\*/g, "$1")}</span>;
    });
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="text-center">
          <Code2 className="h-12 w-12 text-violet-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${text}`}>Sign in to use Code Studio</h2>
          <Button onClick={() => navigate("/login")} className="bg-violet-600 hover:bg-violet-700">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${bg} ${text}`}>
      {/* ── Top Toolbar ── */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
        <button onClick={() => navigate("/chat")} className={`flex items-center gap-1 text-xs ${muted} hover:text-violet-400 transition-colors mr-1`}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-2">
          <Code2 className="h-5 w-5 text-violet-500" />
          <span className="font-bold text-sm bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">Code Studio</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700"}`}>AI</span>
        </div>

        {/* Project selector */}
        <div className="relative">
          <button
            onClick={() => setShowProjects(v => !v)}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${isDark ? "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]" : "bg-gray-100 border-gray-200 hover:bg-gray-200"}`}
          >
            <FolderOpen className="h-3.5 w-3.5 text-violet-400" />
            <span className="max-w-[140px] truncate">{currentProject?.name || "Open Project"}</span>
            {unsaved && <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />}
          </button>

          {showProjects && (
            <div className={`absolute left-0 top-full mt-1 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden ${isDark ? "bg-[#1a1a2e] border-white/10" : "bg-white border-gray-200"}`}>
              <div className="p-2">
                <button
                  onClick={() => { setShowNewProject(true); setShowProjects(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-violet-400 hover:bg-violet-500/10 transition-colors"
                >
                  <Plus className="h-4 w-4" /> New Project
                </button>
              </div>
              <div className="border-t border-white/[0.06] max-h-56 overflow-y-auto">
                {projects.length === 0 && <div className={`px-4 py-3 text-xs ${muted}`}>No projects yet</div>}
                {projects.map(p => (
                  <div key={p.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${isDark ? "hover:bg-white/[0.05]" : "hover:bg-gray-50"} ${currentProject?.id === p.id ? isDark ? "bg-violet-500/10" : "bg-violet-50" : ""}`}>
                    <span className="flex-1 text-sm truncate" onClick={() => openProject(p)}>{p.name}</span>
                    <span className={`text-[10px] ${muted}`}>{p.mainLanguage}</span>
                    {p.isPublished && <Globe className="h-3 w-3 text-green-400" />}
                    <button onClick={() => deleteProject(p.id)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <Button size="sm" variant="ghost" onClick={saveProject} disabled={isSaving || !currentProject} className={`h-8 gap-1.5 text-xs ${unsaved ? "text-orange-400" : muted}`}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>

        <Button size="sm" onClick={runCode} disabled={isRunning || !currentProject}
          className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-500 text-white">
          {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run
        </Button>

        <Button size="sm" onClick={() => setShowDeploy(true)} disabled={!currentProject}
          className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white">
          <Rocket className="h-3.5 w-3.5" />
          Deploy
        </Button>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Files */}
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
                  placeholder="filename.js" className={`h-7 text-xs ${isDark ? "bg-black/20 border-white/10" : ""}`} />
                <button onClick={addFile} className="text-violet-400 hover:text-violet-300 shrink-0">
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-1">
            {files.map(file => (
              <div key={file.name}
                className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs transition-colors ${activeFile === file.name ? isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-700" : isDark ? "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                onClick={() => setActiveFile(file.name)}
              >
                <FileCode className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{file.name}</span>
                {files.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeFile(file.name); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Right panel toggle */}
          <div className={`border-t ${border} p-2 space-y-1`}>
            <button onClick={() => setRightPanel("preview")} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${rightPanel === "preview" ? "bg-violet-500/20 text-violet-300" : `${muted} hover:text-violet-400`}`}>
              <Monitor className="h-3.5 w-3.5" /> Preview
            </button>
            <button onClick={() => setRightPanel("output")} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${rightPanel === "output" ? "bg-green-500/20 text-green-300" : `${muted} hover:text-green-400`}`}>
              <Terminal className="h-3.5 w-3.5" /> Output
            </button>
            <button onClick={() => setRightPanel("ai")} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${rightPanel === "ai" ? "bg-purple-500/20 text-purple-300" : `${muted} hover:text-purple-400`}`}>
              <Sparkles className="h-3.5 w-3.5" /> AI Chat
            </button>
          </div>
        </div>

        {/* Center: Editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* File tabs */}
          <div className={`flex items-center gap-0.5 px-2 py-1 border-b ${border} ${tabBg} overflow-x-auto shrink-0`}>
            {files.map(file => (
              <button key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs whitespace-nowrap transition-colors ${activeFile === file.name ? isDark ? "bg-[#1e1e3f] text-violet-300 border border-violet-500/30" : "bg-white text-violet-700 border border-violet-200 shadow-sm" : `${muted} hover:text-violet-400`}`}
              >
                <FileCode className="h-3 w-3 opacity-60" />
                {file.name}
              </button>
            ))}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            {currentProject ? (
              <Editor
                height="100%"
                language={getMonacoLang(activeFileData?.language || "javascript")}
                value={activeFileData?.content || ""}
                onChange={v => updateFileContent(v || "")}
                theme={isDark ? "vs-dark" : "light"}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  renderLineHighlight: "gutter",
                  bracketPairColorization: { enabled: true },
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  tabSize: 2,
                }}
              />
            ) : (
              <div className={`flex flex-col items-center justify-center h-full gap-4 ${muted}`}>
                <Code2 className="h-16 w-16 opacity-20" />
                <div className="text-center">
                  <p className="text-lg font-semibold opacity-40">No project open</p>
                  <p className="text-sm opacity-30 mt-1">Create or open a project to start coding</p>
                </div>
                <Button onClick={() => setShowNewProject(true)} className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                  <Plus className="h-4 w-4" /> New Project
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className={`w-96 shrink-0 flex flex-col border-l ${border} overflow-hidden`}>
          {/* Preview */}
          {rightPanel === "preview" && (
            <div className="flex flex-col h-full">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold">Live Preview</span>
                <div className="flex-1" />
                <button onClick={() => { setLivePreview(buildSrcdoc(files)); setPreviewKey(k => k + 1); }}
                  className="text-blue-400 hover:text-blue-300">
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
                  <iframe
                    key={previewKey}
                    srcDoc={livePreview}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-modals"
                    title="Live Preview"
                  />
                ) : (
                  <div className={`flex items-center justify-center h-full ${isDark ? "bg-[#0d0d1a]" : "bg-gray-50"}`}>
                    <div className="text-center">
                      <Monitor className={`h-10 w-10 mx-auto mb-2 ${muted} opacity-30`} />
                      <p className={`text-sm ${muted}`}>Preview is for HTML/CSS/JS projects</p>
                      <p className={`text-xs ${muted} opacity-60 mt-1`}>Use the Output panel to run your code</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Output */}
          {rightPanel === "output" && (
            <div className="flex flex-col h-full">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
                <Terminal className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-semibold">Output</span>
                <div className="flex-1" />
                <button onClick={runCode} disabled={isRunning} className="text-green-400 hover:text-green-300 disabled:opacity-50">
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { setOutput(""); setOutputErr(""); }} className={`${muted} hover:text-red-400`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-black/80">
                {isRunning && (
                  <div className="text-yellow-400 flex items-center gap-2 mb-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Running...
                  </div>
                )}
                {!output && !outputErr && !isRunning && (
                  <div className="text-gray-600 text-center mt-8">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Press Run to execute your code</p>
                  </div>
                )}
                {output && <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>}
                {outputErr && <pre className="text-red-400 whitespace-pre-wrap mt-2">{outputErr}</pre>}
              </div>
            </div>
          )}

          {/* AI Chat */}
          {rightPanel === "ai" && (
            <div className="flex flex-col h-full">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${border} ${surface} shrink-0`}>
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-semibold">Turbo Code AI</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-600"}`}>Gemini 3.1 Pro</span>
                <div className="flex-1" />
                <button onClick={() => setAiMessages([{ role: "assistant", content: "Chat cleared. How can I help?" }])} className={`${muted} hover:text-red-400`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${isDark ? "bg-[#0d0d1a]" : "bg-gray-50"}`}>
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : isDark ? "bg-[#1a1a2e] border border-white/[0.06] text-gray-200" : "bg-white border border-gray-200 text-gray-800"
                    }`}>
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
                    placeholder="Ask AI to write, fix, or explain code..."
                    className={`text-xs h-8 ${isDark ? "bg-black/20 border-white/10" : ""}`} />
                  <Button size="sm" onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()} className="h-8 w-8 p-0 bg-violet-600 hover:bg-violet-500 shrink-0">
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className={`flex gap-1 mt-1.5 flex-wrap`}>
                  {["Fix bugs", "Optimize this", "Explain code", "Add comments"].map(s => (
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

      {/* ── New Project Modal ── */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewProject(false)}>
          <div onClick={e => e.stopPropagation()} className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDark ? "bg-[#13131f] border-white/10" : "bg-white border-gray-200"}`}>
            <h2 className={`text-lg font-bold mb-4 ${text}`}>New Project</h2>
            <div className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${muted} mb-1.5 block`}>Project Name</label>
                <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createProject()}
                  placeholder="My Awesome App"
                  className={isDark ? "bg-black/20 border-white/10" : ""} autoFocus />
              </div>
              <div>
                <label className={`text-xs font-medium ${muted} mb-1.5 block`}>Language</label>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(lang => (
                    <button key={lang.id} onClick={() => setNewProjectLang(lang.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${newProjectLang === lang.id
                        ? isDark ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-violet-50 border-violet-300 text-violet-700"
                        : isDark ? "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:border-violet-500/30" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300"
                      }`}>
                      <span>{lang.icon}</span> {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowNewProject(false)} className="flex-1">Cancel</Button>
                <Button onClick={createProject} disabled={!newProjectName.trim()} className="flex-1 bg-violet-600 hover:bg-violet-500">Create Project</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Deploy Modal ── */}
      {showDeploy && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDeploy(false)}>
          <div onClick={e => e.stopPropagation()} className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${isDark ? "bg-[#13131f] border-white/10" : "bg-white border-gray-200"}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-violet-500/20">
                <Rocket className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${text}`}>Deploy Project</h2>
                <p className={`text-xs ${muted}`}>Publish your app and get a shareable link</p>
              </div>
            </div>

            {deployUrl ? (
              <div className={`rounded-xl border p-4 mb-4 ${isDark ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-green-400" />
                  <span className={`text-sm font-semibold ${isDark ? "text-green-300" : "text-green-700"}`}>Live at:</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`flex-1 text-xs px-2 py-1 rounded ${isDark ? "bg-black/30 text-green-300" : "bg-white text-green-700 border border-green-200"}`}>
                    {window.location.origin}{deployUrl}
                  </code>
                  <button onClick={copyDeployUrl} className="text-green-400 hover:text-green-300 shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ) : null}

            <div className="mb-4">
              <label className={`text-xs font-medium ${muted} mb-1.5 block`}>Custom Domain (optional)</label>
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                placeholder="myapp.com"
                className={isDark ? "bg-black/20 border-white/10" : ""} />
              {customDomain && (
                <div className={`mt-2 text-xs rounded-lg p-3 ${isDark ? "bg-blue-500/10 border border-blue-500/20 text-blue-300" : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
                  <p className="font-semibold mb-1">DNS Setup:</p>
                  <p>Add a CNAME record pointing <code className="font-mono">{customDomain}</code> to your TurboAnswer app domain. Then re-deploy to save your custom domain setting.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeploy(false)} className="flex-1">Cancel</Button>
              <Button onClick={deployProject} disabled={isDeploying} className="flex-1 bg-violet-600 hover:bg-violet-500 gap-2">
                {isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {deployUrl ? "Redeploy" : "Deploy Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
