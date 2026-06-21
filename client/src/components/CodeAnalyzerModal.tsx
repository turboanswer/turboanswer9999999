import { useState } from "react";
import { X, Code2, Loader2, Copy, Check } from "lucide-react";

interface CodeAnalyzerModalProps {
  isDark: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: "Find bugs", value: "Find every bug, edge case, race condition, and security issue in this code. Explain WHY each is a problem and give the exact fix as a code diff." },
  { label: "Explain it", value: "Walk through this code line by line. What does each part do? What's the overall architecture? What patterns are used?" },
  { label: "Optimize", value: "Find every performance issue. Show me before/after diffs with Big-O analysis. Look for unnecessary allocations, N+1 queries, blocking I/O, redundant work." },
  { label: "Security audit", value: "Full security audit. Look for injection, XSS, CSRF, auth bypass, secrets in code, unsafe deserialization, prototype pollution, path traversal, SSRF, race conditions in auth flows. Rate each finding critical/high/medium/low." },
  { label: "Refactor", value: "Refactor this code to be cleaner, more idiomatic, and easier to test. Explain each change. Output as a diff." },
];

export default function CodeAnalyzerModal({ isDark, onClose }: CodeAnalyzerModalProps) {
  const [code, setCode] = useState("");
  const [question, setQuestion] = useState(PRESETS[0].value);
  const [language, setLanguage] = useState("auto-detect");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!code.trim()) {
      setError("Paste some code first.");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      const res = await fetch("/api/code-analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, question, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setAnalysis(data.analysis || "(no response)");
    } catch (e: any) {
      setError(e?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const copyAnalysis = async () => {
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" data-testid="code-analyzer-modal">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="flex items-center gap-2 text-white">
          <Code2 className="h-5 w-5" />
          <div>
            <div className="font-bold">Code Surgeon — GPT-5.1 Codex</div>
            <div className="text-xs opacity-80">Deep code analysis, line-by-line</div>
          </div>
        </div>
        <button onClick={onClose} className="text-white p-2 hover:bg-white/20 rounded-full" data-testid="button-close-code">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={`flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2">
            <label className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>LANGUAGE</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`text-xs px-2 py-1 rounded border ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-800'}`}
              data-testid="select-code-lang"
            >
              {['auto-detect', 'typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'swift', 'kotlin', 'ruby', 'php', 'sql', 'bash', 'html', 'css'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here…"
            spellCheck={false}
            className={`flex-1 w-full p-3 font-mono text-xs rounded-lg border resize-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`}
            data-testid="textarea-code-input"
          />
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setQuestion(p.value)}
                className={`text-xs px-2 py-1 rounded ${question === p.value ? 'bg-emerald-600 text-white' : (isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300')}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className={`w-full p-2 text-sm rounded-lg border resize-none ${isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-300 text-zinc-900'}`}
            data-testid="textarea-code-question"
          />
          <button
            onClick={run}
            disabled={loading || !code.trim()}
            className="h-11 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="button-run-code-analysis"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : 'Analyze Code'}
          </button>
        </div>

        <div className={`flex flex-col min-h-0 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-300'}`}>
            <div className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>ANALYSIS</div>
            {analysis && (
              <button onClick={copyAnalysis} className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            )}
          </div>
          <div className={`flex-1 overflow-auto p-3 text-sm whitespace-pre-wrap font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`} data-testid="code-analysis-output">
            {error && <div className="text-red-500">⚠️ {error}</div>}
            {!error && !analysis && !loading && (
              <div className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                Paste code on the left, pick a preset, and tap "Analyze Code."{"\n\n"}Runs on GPT-5.1 Codex with up to 2,000 tokens of deep analysis.
              </div>
            )}
            {loading && !analysis && (
              <div className="flex items-center gap-2 text-emerald-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading every line…
              </div>
            )}
            {analysis}
          </div>
        </div>
      </div>
    </div>
  );
}
