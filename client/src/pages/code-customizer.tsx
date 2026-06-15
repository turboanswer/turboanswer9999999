import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Wand2, Github, Loader2, AlertCircle, CheckCircle2, Sparkles, Copy, GitPullRequest, ExternalLink, Zap, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

type CustomizeResult = {
  id?: number;
  rootCause: string;
  suggestedFix: string;
  filesUsed: { path: string }[];
  warnings: string[];
};

export default function CodeCustomizer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: subscriptionData } = useQuery<{ tier: string; status: string }>({ queryKey: ["/api/subscription-status"] });
  const userTier = (subscriptionData?.tier || (user as any)?.tier || 'free') as string;
  const isResearchOrAbove =
    userTier === 'research' || userTier === 'enterprise' ||
    (user as any)?.isEmployee === true || (user as any)?.isOwner === true;

  const { data: ghStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['/api/stack-trace-surgeon/github-status'],
    enabled: isResearchOrAbove,
  });
  const ghIntegrated = !!ghStatus?.connected;

  const [repoUrl, setRepoUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [instructions, setInstructions] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [prLoading, setPrLoading] = useState(false);

  const bg = isDark ? '#0a0a0a' : '#f8fafc';
  const cardBg = isDark ? '#111114' : '#ffffff';
  const border = isDark ? '#1f1f24' : '#e2e8f0';
  const text = isDark ? '#e5e7eb' : '#0f172a';
  const subtext = isDark ? '#9ca3af' : '#64748b';
  const codeBg = isDark ? '#0a0a0a' : '#f1f5f9';

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
            nodes.push(<p key={`p-${i}-${j}`} className="leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: text }}>{para}</p>);
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

  const runCustomize = async () => {
    setError(null); setResult(null); setPrUrl(null);
    if (!repoUrl.trim() || !filePath.trim() || !instructions.trim()) {
      toast({ title: "Missing input", description: "Paste a repo URL, file path, and a description of the change.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/code-customizer/customize', {
        repoUrl, filePath, instructions, githubToken: githubToken || undefined,
      });
      const data = await res.json();
      if (!res.ok) setError([data?.message, data?.detail].filter(Boolean).join(' — ') || 'Customization failed.');
      else setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const openPullRequest = async () => {
    if (!result?.id) return;
    setPrLoading(true);
    try {
      const res = await apiRequest('POST', '/api/stack-trace-surgeon/open-pr', {
        diagnosisId: result.id,
        githubToken: githubToken || undefined,
      });
      const data = await res.json();
      if (!res.ok) toast({ title: 'Could not open PR', description: data?.message || 'Unknown error', variant: 'destructive' });
      else { setPrUrl(data.prUrl); toast({ title: 'Pull request opened', description: `PR #${data.prNumber} on branch ${data.branch}` }); }
    } catch (e: any) {
      toast({ title: 'PR failed', description: e?.message || '', variant: 'destructive' });
    } finally {
      setPrLoading(false);
    }
  };

  if (!isResearchOrAbove) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: bg, color: text }}>
        <Card className="max-w-md p-8 text-center" style={{ background: cardBg, borderColor: border }}>
          <Sparkles className="h-10 w-10 mx-auto mb-4" style={{ color: '#a855f7' }} />
          <h2 className="text-xl font-bold mb-2">Research-tier feature</h2>
          <p className="text-sm mb-6" style={{ color: subtext }}>
            Code Customizer is unlocked on Research and Enterprise plans. Paste any file path from your repo, describe what you want changed, and ship it as a PR.
          </p>
          <Link href="/pricing"><Button className="w-full">Upgrade to Research</Button></Link>
          <Link href="/chat"><Button variant="ghost" className="w-full mt-2">Back to chat</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: bg, color: text }}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/chat" className="inline-flex items-center gap-2 text-sm" style={{ color: subtext }} data-testid="link-back">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Link href="/stack-trace-surgeon" className="inline-flex items-center gap-2 text-sm" style={{ color: subtext }} data-testid="link-surgeon">
            Stack Trace Surgeon →
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(34,211,238,0.18))' }}>
            <Wand2 className="h-7 w-7" style={{ color: '#a855f7' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2">Code Customizer</h1>
          <p className="text-sm max-w-xl mx-auto" style={{ color: subtext }}>
            Point at any file in your repo, describe what you want changed in plain English, get a clean diff, and ship it as a pull request.
          </p>
        </div>

        <Card className="p-6 mb-6" style={{ background: cardBg, borderColor: border }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: subtext }}>GitHub repo URL</label>
              <Input
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                style={{ background: codeBg, borderColor: border, color: text }}
                data-testid="input-repo-url"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: subtext }}>File path inside the repo</label>
              <Input
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                placeholder="src/components/Button.tsx"
                style={{ background: codeBg, borderColor: border, color: text, fontFamily: 'ui-monospace,monospace' }}
                data-testid="input-file-path"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: subtext }}>What do you want changed?</label>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Add a loading spinner that shows while the button is disabled. Use the Loader2 icon from lucide-react."
                rows={5}
                style={{ background: codeBg, borderColor: border, color: text }}
                data-testid="input-instructions"
              />
            </div>
            {!ghIntegrated && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: subtext }}>
                  <Github className="inline h-3.5 w-3.5 mr-1" /> GitHub token (only needed for private repos or if integration isn't connected)
                </label>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  style={{ background: codeBg, borderColor: border, color: text, fontFamily: 'ui-monospace,monospace' }}
                  data-testid="input-github-token"
                />
              </div>
            )}
            <Button
              onClick={runCustomize}
              disabled={loading}
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: 'white' }}
              data-testid="button-customize"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Customizing with Claude Sonnet 4.5…</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> Customize this file</>
              )}
            </Button>
          </div>
        </Card>

        {error && (
          <Card className="p-4 mb-6 border-l-4" style={{ background: 'rgba(239,68,68,0.05)', borderLeftColor: '#ef4444', borderColor: border }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <p className="text-sm" style={{ color: text }}>{error}</p>
            </div>
          </Card>
        )}

        {result && (
          <Card className="p-6" style={{ background: cardBg, borderColor: border }}>
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: subtext }}>Summary</h3>
              <p className="leading-relaxed whitespace-pre-wrap" style={{ color: text }}>{result.rootCause}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: subtext }}>Proposed change</h3>
              {renderMarkdown(result.suggestedFix)}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t" style={{ borderColor: border }}>
              {prUrl && (
                <div className="flex flex-col gap-2">
                  <a href={prUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold self-start"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                    data-testid="link-pr-opened">
                    <CheckCircle2 className="h-4 w-4" /> PR opened — view on GitHub <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <PrChecksBadge prUrl={prUrl} githubToken={githubToken} isDark={isDark} border={border} subtext={subtext} text={text} />
                </div>
              )}
              {!prUrl && (
                <div className="flex flex-wrap gap-2">
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
                      <><GitPullRequest className="h-4 w-4 mr-2" /> Open pull request on GitHub</>
                    )}
                  </Button>
                </div>
              )}
              <p className="text-[11px]" style={{ color: subtext }}>
                The PR is opened on a new branch (<code>customizer/…</code>) against your default branch. Review and merge on GitHub.
              </p>
            </div>
          </Card>
        )}

        <div className="mt-10 pt-6 border-t text-center text-[11px]" style={{ borderColor: border, color: subtext }}>
          Code Customizer by TurboAnswer · Powered by Claude Sonnet 4.5 · Reads only the file you point at · Tokens never stored
        </div>
      </div>
    </div>
  );
}

type PrCheckRun = { name: string; conclusion: string | null; status: string; url: string | null };
type PrCheckResp = {
  state: 'pending' | 'success' | 'failure' | 'no_checks';
  total: number; passed: number; failed: number; pending: number;
  runs: PrCheckRun[]; headSha: string | null;
};

function PrChecksBadge({ prUrl, githubToken, isDark, border, subtext, text }:
  { prUrl: string; githubToken: string; isDark: boolean; border: string; subtext: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data, error, isLoading } = useQuery<PrCheckResp>({
    queryKey: ['/api/stack-trace-surgeon/pr-checks', prUrl, githubToken],
    queryFn: async () => {
      const res = await fetch('/api/stack-trace-surgeon/pr-checks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, ...(githubToken ? { githubToken } : {}) }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.message || `HTTP ${res.status}`); }
      return res.json();
    },
    refetchInterval: (q) => {
      const s = (q.state.data as PrCheckResp | undefined)?.state;
      if (!s || s === 'pending') return 6000;
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  if (isLoading && !data) return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] self-start" style={{ background: isDark ? '#0a0a0a' : '#f8fafc', border: `1px solid ${border}`, color: subtext }}>
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking CI status…
    </div>
  );
  if (error) return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] self-start" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
      <AlertCircle className="h-3.5 w-3.5" /> Can't read CI status — open the PR to check
    </div>
  );
  if (!data) return null;

  const palette = {
    pending:   { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)', color: '#f59e0b', Icon: Clock,        label: `CI running… ${data.passed}/${data.total} passed` },
    success:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)', color: '#10b981', Icon: CheckCircle2, label: `✅ CI passed — all ${data.total} checks green · safe to merge` },
    failure:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  color: '#ef4444', Icon: XCircle,      label: `❌ CI failed — ${data.failed}/${data.total} checks broke · review before merging` },
    no_checks: { bg: isDark ? '#0a0a0a' : '#f8fafc', border, color: subtext, Icon: AlertCircle, label: 'No CI configured on this repo — review the diff manually before merging' },
  } as const;
  const p = palette[data.state];

  return (
    <div className="flex flex-col gap-2 self-start">
      <button
        onClick={() => data.runs.length > 0 && setExpanded(e => !e)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-opacity hover:opacity-80"
        style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.color, cursor: data.runs.length > 0 ? 'pointer' : 'default' }}
        data-testid="badge-pr-checks"
        type="button"
      >
        <p.Icon className="h-3.5 w-3.5" />
        <span>{p.label}</span>
        {data.runs.length > 0 && <span className="text-[10px] opacity-70">{expanded ? '▲' : '▼'}</span>}
      </button>
      {expanded && data.runs.length > 0 && (
        <div className="rounded-md text-[11px] overflow-hidden" style={{ background: isDark ? '#0a0a0a' : '#f8fafc', border: `1px solid ${border}` }}>
          {data.runs.slice(0, 20).map((r, i) => {
            const ok = r.status === 'completed' && (r.conclusion === 'success' || r.conclusion === 'neutral' || r.conclusion === 'skipped');
            const bad = r.status === 'completed' && r.conclusion && !ok;
            const Ico = ok ? CheckCircle2 : bad ? XCircle : Clock;
            const col = ok ? '#10b981' : bad ? '#ef4444' : '#f59e0b';
            const content = (
              <>
                <Ico className="h-3 w-3" style={{ color: col }} />
                <span className="flex-1 truncate" style={{ color: text }}>{r.name}</span>
                <span style={{ color: subtext }}>{r.status === 'completed' ? (r.conclusion || '—') : r.status}</span>
              </>
            );
            return r.url ? (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 hover:opacity-80" style={{ borderTop: i ? `1px solid ${border}` : 'none' }}>{content}</a>
            ) : (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop: i ? `1px solid ${border}` : 'none' }}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
