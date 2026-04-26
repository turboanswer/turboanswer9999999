import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Stethoscope, Github, Loader2, AlertCircle, CheckCircle2, FileCode, Sparkles, Copy, Lock, FlaskConical, History, Trash2, GitPullRequest, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

type Diagnosis = {
  id?: number;
  rootCause: string;
  suggestedFix: string;
  filesUsed: { path: string; line?: number }[];
  framesParsed: number;
  warnings: string[];
};

type HistoryItem = {
  id: number;
  title: string;
  repoUrl: string;
  framesParsed: number;
  prUrl: string | null;
  createdAt: string;
};

const SAMPLE_TRACE = `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:24:18)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)
    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:17811:13)`;

export default function StackTraceSurgeon() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({ queryKey: ["/api/subscription-status"] });
  const userTier = (subscriptionData?.tier || (user as any)?.tier || 'free') as string;
  const isResearchOrAbove =
    userTier === 'research' ||
    userTier === 'enterprise' ||
    (user as any)?.isEmployee === true ||
    (user as any)?.isOwner === true;

  const [stackTrace, setStackTrace] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prLoading, setPrLoading] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ['/api/stack-trace-surgeon/history'],
    enabled: isResearchOrAbove,
  });

  const bg = isDark ? '#0a0a0a' : '#f8fafc';
  const cardBg = isDark ? '#111114' : '#ffffff';
  const border = isDark ? '#1f1f24' : '#e2e8f0';
  const text = isDark ? '#e5e7eb' : '#0f172a';
  const subtext = isDark ? '#9ca3af' : '#64748b';
  const codeBg = isDark ? '#0a0a0a' : '#f1f5f9';

  // Light Markdown renderer: splits text into prose paragraphs and fenced
  // code blocks (```lang\n…\n```). Inside code blocks we colorize +/- lines
  // green/red so unified diffs read naturally. No external dep.
  const renderMarkdown = (raw: string) => {
    if (!raw) return null;
    const parts = raw.split(/```(\w*)\n?([\s\S]*?)```/g);
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        const prose = parts[i];
        if (prose && prose.trim()) {
          prose.split(/\n\n+/).forEach((para, j) => {
            if (!para.trim()) return;
            // bold + inline code basic rendering via dangerouslySetInnerHTML-free pieces
            const formatted = para
              .replace(/\*\*(.+?)\*\*/g, '\u0001$1\u0001')
              .replace(/`([^`]+)`/g, '\u0002$1\u0002');
            const pieces = formatted.split(/([\u0001\u0002])/);
            let bold = false; let code = false;
            const inline: React.ReactNode[] = [];
            pieces.forEach((p, k) => {
              if (p === '\u0001') { bold = !bold; return; }
              if (p === '\u0002') { code = !code; return; }
              if (!p) return;
              if (code) inline.push(<code key={k} className="px-1.5 py-0.5 rounded text-[12px]" style={{ background: codeBg, fontFamily: 'ui-monospace,monospace' }}>{p}</code>);
              else if (bold) inline.push(<strong key={k}>{p}</strong>);
              else inline.push(<span key={k}>{p}</span>);
            });
            nodes.push(<p key={`p-${i}-${j}`} className="leading-relaxed mb-3 whitespace-pre-wrap">{inline}</p>);
          });
        }
      } else if (i % 3 === 2) {
        const lang = parts[i - 1] || '';
        const code = parts[i];
        const isDiff = /^diff$/i.test(lang) || /^[-+@]/m.test(code);
        nodes.push(
          <div key={`code-${i}`} className="relative rounded-lg overflow-hidden mb-3 border" style={{ borderColor: border, background: codeBg }}>
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: subtext, borderBottom: `1px solid ${border}` }}>
              <span>{lang || (isDiff ? 'diff' : 'code')}</span>
              <button
                onClick={() => { navigator.clipboard?.writeText(code); toast({ title: 'Copied' }); }}
                className="inline-flex items-center gap-1 hover:opacity-70"
                data-testid={`button-copy-code-${i}`}
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <pre className="p-3 text-[12px] overflow-x-auto" style={{ fontFamily: 'ui-monospace,monospace', color: text }}>
              {isDiff ? code.split('\n').map((ln, k) => (
                <div key={k} style={{
                  color: ln.startsWith('+') && !ln.startsWith('+++') ? '#10b981'
                       : ln.startsWith('-') && !ln.startsWith('---') ? '#ef4444'
                       : ln.startsWith('@') ? '#a855f7'
                       : text,
                }}>{ln || ' '}</div>
              )) : code}
            </pre>
          </div>
        );
      }
    }
    return nodes;
  };

  const runDiagnosis = async () => {
    setError(null);
    setResult(null);
    setPrUrl(null);
    if (!stackTrace.trim() || !repoUrl.trim()) {
      toast({ title: "Missing input", description: "Paste both a stack trace and a GitHub repo URL.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/stack-trace-surgeon/diagnose', {
        stackTrace,
        repoUrl,
        githubToken: githubToken || undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || 'Diagnosis failed.');
      } else {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/history'] });
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async (id: number) => {
    try {
      const res = await fetch(`/api/stack-trace-surgeon/history/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const row = await res.json();
      setStackTrace(row.stackTrace);
      setRepoUrl(row.repoUrl);
      setResult({
        id: row.id,
        rootCause: row.rootCause,
        suggestedFix: row.suggestedFix,
        filesUsed: row.filesUsed || [],
        framesParsed: row.framesParsed,
        warnings: row.warnings || [],
      });
      setPrUrl(row.prUrl || null);
      setShowHistory(false);
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message || '', variant: 'destructive' });
    }
  };

  const deleteHistoryItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest('DELETE', `/api/stack-trace-surgeon/history/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/history'] });
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const openPullRequest = async () => {
    if (!result?.id) {
      toast({ title: 'Save the diagnosis first', description: 'Re-run the diagnosis so we can save it before opening a PR.', variant: 'destructive' });
      return;
    }
    if (!githubToken.trim()) {
      setShowToken(true);
      toast({ title: 'GitHub token required', description: 'Add a token with repo write access to open a PR.', variant: 'destructive' });
      return;
    }
    setPrLoading(true);
    try {
      const res = await apiRequest('POST', '/api/stack-trace-surgeon/open-pr', {
        diagnosisId: result.id,
        githubToken,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Could not open PR', description: data?.message || 'Unknown error', variant: 'destructive' });
      } else {
        setPrUrl(data.prUrl);
        toast({ title: '🎉 Pull request opened!', description: `PR #${data.prNumber} on branch ${data.branch}` });
        queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/history'] });
      }
    } catch (e: any) {
      toast({ title: 'PR failed', description: e?.message || '', variant: 'destructive' });
    } finally {
      setPrLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-sm cursor-pointer hover:opacity-80" style={{ color: subtext }} data-testid="link-back">
              <ArrowLeft size={16} /> Back
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isResearchOrAbove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(s => !s)}
                className="text-xs"
                style={{ borderColor: border, background: 'transparent', color: text }}
                data-testid="button-toggle-history"
              >
                <History className="h-3 w-3 mr-1.5" />
                History {history.length > 0 ? `(${history.length})` : ''}
              </Button>
            )}
            <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold border" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.3)' }}>
              <Sparkles className="h-3 w-3" /> Beta
            </div>
          </div>
        </div>

        {showHistory && isResearchOrAbove && (
          <Card className="p-4 mb-5" style={{ background: cardBg, borderColor: border }} data-testid="history-panel">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><History className="h-4 w-4" /> Saved diagnoses</h3>
            {history.length === 0 ? (
              <div className="text-xs py-4 text-center" style={{ color: subtext }}>
                No diagnoses yet. Run one and it'll appear here automatically.
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <li
                    key={h.id}
                    onClick={() => loadFromHistory(h.id)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: isDark ? '#0a0a0a' : '#f8fafc', border: `1px solid ${border}` }}
                    data-testid={`history-item-${h.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate" style={{ color: text }}>{h.title}</div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: subtext }}>
                        <span className="truncate">{h.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                        <span>·</span>
                        <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                        {h.prUrl && <><span>·</span><span style={{ color: '#10b981' }}>PR opened</span></>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(h.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10"
                      style={{ color: '#ef4444' }}
                      data-testid={`button-delete-history-${h.id}`}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}>
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 mb-2 text-[11px] px-2.5 py-1 rounded-full font-semibold border" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.3)' }}>
            <FlaskConical className="h-3 w-3" /> Research Tier Exclusive
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Stack Trace Surgeon</h1>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: subtext }}>
            Paste a runtime error and your GitHub repo. We pull only the files mentioned in the trace, hand them to TurboAnswer, and return the root cause + the exact fix — usually in under 10 seconds.
          </p>
        </div>

        {!isResearchOrAbove ? (
          <Card className="p-8 mb-5 text-center" style={{ background: cardBg, borderColor: border }} data-testid="paywall-card">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'rgba(168,85,247,0.1)' }}>
              <Lock className="h-6 w-6" style={{ color: '#a855f7' }} />
            </div>
            <h2 className="text-xl font-bold mb-2">Research Tier Required</h2>
            <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: subtext }}>
              Stack Trace Surgeon is part of TurboAnswer Research — built for engineers who debug production issues every day. Upgrade to unlock unlimited repo-aware diagnoses.
            </p>
            <div className="text-3xl font-bold mb-1">$30<span className="text-sm font-normal" style={{ color: subtext }}>/mo</span></div>
            <div className="text-xs mb-5" style={{ color: subtext }}>Cancel anytime · Includes Matrix AI, Deep Think, source-cited research, and Stack Trace Surgeon</div>
            <Link href="/pricing">
              <Button
                size="lg"
                className="px-8 font-semibold"
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: 'white' }}
                data-testid="button-upgrade"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Research
              </Button>
            </Link>
          </Card>
        ) : (
        <>
        <Card className="p-5 sm:p-6 mb-5" style={{ background: cardBg, borderColor: border }}>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: subtext }}>
            1. Paste your error / stack trace
          </label>
          <Textarea
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            placeholder={SAMPLE_TRACE}
            className="font-mono text-xs min-h-[180px]"
            style={{ background: isDark ? '#0a0a0a' : '#f8fafc', borderColor: border, color: text }}
            data-testid="input-stack-trace"
          />
          <button
            onClick={() => setStackTrace(SAMPLE_TRACE)}
            className="mt-2 text-[11px] underline hover:no-underline"
            style={{ color: subtext }}
            data-testid="button-load-sample"
          >
            Load sample trace
          </button>
        </Card>

        <Card className="p-5 sm:p-6 mb-5" style={{ background: cardBg, borderColor: border }}>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: subtext }}>
            2. GitHub repo
          </label>
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 flex-shrink-0" style={{ color: subtext }} />
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo  or  owner/repo  or  owner/repo@branch"
              style={{ background: isDark ? '#0a0a0a' : '#f8fafc', borderColor: border, color: text }}
              data-testid="input-repo-url"
            />
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowToken(s => !s)}
              className="text-[11px] underline hover:no-underline"
              style={{ color: subtext }}
              data-testid="button-toggle-token"
            >
              {showToken ? 'Hide' : 'Private repo? Add GitHub token (optional)'}
            </button>
            {showToken && (
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_… (only sent for this request, never stored)"
                className="mt-2"
                style={{ background: isDark ? '#0a0a0a' : '#f8fafc', borderColor: border, color: text }}
                data-testid="input-github-token"
              />
            )}
          </div>
        </Card>

        <div className="flex justify-center mb-6">
          <Button
            onClick={runDiagnosis}
            disabled={loading}
            size="lg"
            className="px-8 font-semibold"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: 'white' }}
            data-testid="button-diagnose"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Diagnosing…</>
            ) : (
              <><Stethoscope className="h-4 w-4 mr-2" /> Diagnose</>
            )}
          </Button>
        </div>

        {error && (
          <Card className="p-4 mb-5 border-red-500/40" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.4)' }} data-testid="error-banner">
            <div className="flex items-start gap-2 text-sm" style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          </Card>
        )}

        {result && (
          <div className="space-y-5" data-testid="result-panel">
            <Card className="p-5" style={{ background: cardBg, borderColor: border }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Root Cause
                </h2>
                <div className="text-[11px]" style={{ color: subtext }}>
                  {result.framesParsed} frame{result.framesParsed === 1 ? '' : 's'} parsed · {result.filesUsed.length} file{result.filesUsed.length === 1 ? '' : 's'} fetched
                </div>
              </div>
              <div className="text-sm" data-testid="text-root-cause">
                {renderMarkdown(result.rootCause)}
              </div>
            </Card>

            <Card className="p-5" style={{ background: cardBg, borderColor: border }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" /> Suggested Fix
              </h2>
              <div className="text-sm" data-testid="text-suggested-fix">
                {renderMarkdown(result.suggestedFix)}
              </div>

              {result.id && (
                <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3" style={{ borderColor: border }}>
                  {prUrl ? (
                    <a
                      href={prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                      data-testid="link-pr-opened"
                    >
                      <CheckCircle2 className="h-4 w-4" /> PR opened — view on GitHub <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <Button
                      onClick={openPullRequest}
                      disabled={prLoading}
                      size="sm"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
                      data-testid="button-open-pr"
                    >
                      {prLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening PR…</>
                      ) : (
                        <><GitPullRequest className="h-4 w-4 mr-2" /> Open Pull Request with this fix</>
                      )}
                    </Button>
                  )}
                  <span className="text-[11px]" style={{ color: subtext }}>
                    Requires a GitHub token with repo write access. Creates a new branch, applies the diff, opens a PR for review.
                  </span>
                </div>
              )}
            </Card>

            {result.filesUsed.length > 0 && (
              <Card className="p-5" style={{ background: cardBg, borderColor: border }}>
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: subtext }}>
                  <FileCode className="h-4 w-4" /> Files inspected from your repo
                </h2>
                <ul className="text-xs font-mono space-y-1" style={{ color: subtext }}>
                  {result.filesUsed.map((f, i) => (
                    <li key={i} data-testid={`file-${i}`}>{f.path}{f.line ? `:${f.line}` : ''}</li>
                  ))}
                </ul>
              </Card>
            )}

            {result.warnings.length > 0 && (
              <Card className="p-3" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' }}>
                <div className="text-xs flex items-start gap-2" style={{ color: '#f59e0b' }}>
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div>
                    {result.warnings.includes('no_files_fetched') && 'No source files could be fetched (private repo without token, wrong branch, or trace file paths did not match repo layout). Diagnosis is from the trace alone.'}
                    {result.warnings.includes('no_frames_parsed') && 'No file paths were detected in the trace. Diagnosis is from the error message alone.'}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
        </>
        )}

        <div className="mt-10 pt-6 border-t text-center text-[11px]" style={{ borderColor: border, color: subtext }}>
          Stack Trace Surgeon by TurboAnswer · Reads only the files in your trace · Tokens never stored
        </div>
      </div>
    </div>
  );
}
