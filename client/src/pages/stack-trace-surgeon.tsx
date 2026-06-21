import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Github, Loader2, AlertCircle, CheckCircle2, FileCode, Sparkles, Copy,
  History, Trash2, GitPullRequest, ExternalLink, Zap, ShieldAlert, XCircle, Clock,
  Crosshair, GitCommit, Activity, Terminal, Radio, RefreshCw, Download, Gauge,
  ListTree, ScrollText, Siren, Lock, Cpu, Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Alternative = { cause: string; confidence: number };
type Culprit = { sha: string; author: string; date: string; message: string; url: string } | null;

type Diagnosis = {
  id?: number;
  rootCause: string;
  suggestedFix: string;
  filesUsed: { path: string; line?: number }[];
  framesParsed: number;
  warnings: string[];
  confidence?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  alternatives?: Alternative[];
  incidentSummary?: string;
  postmortem?: string;
  culprit?: Culprit;
};

type Account = {
  ownerLike: boolean;
  paid: boolean;
  tier: string;
  credits: number;
  creditGranted?: boolean;
  trialUsed: number;
  trialLimit: number;
  creditPeriod?: string | null;
  perUseFeeCents?: number;
  monthlyCreditCents?: number;
  lastUseCostCents?: number;
  ingestToken?: string;
};

type HistoryItem = {
  id: number;
  title: string;
  repoUrl: string;
  framesParsed: number;
  prUrl: string | null;
  createdAt: string;
};

type SignalItem = {
  id: number;
  title: string;
  repoUrl: string;
  rootCause: string;
  severity: string | null;
  confidence: number | null;
  status: string;
  source: string;
  createdAt: string;
};

const SAMPLE_TRACE = `TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (src/components/UserList.tsx:24:18)
    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:14985:18)
    at mountIndeterminateComponent (node_modules/react-dom/cjs/react-dom.development.js:17811:13)`;

// ── Fixed "classified terminal" palette (page is always dark, by design) ─────
const C = {
  bg: '#05070a',
  panel: '#0b0f15',
  panel2: '#080c11',
  border: '#16202c',
  borderBright: '#23364a',
  text: '#cbd8e6',
  subtext: '#5c7388',
  codeBg: '#070b10',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  cyan: '#22d3ee',
  violet: '#a855f7',
};
const BRAND_GRADIENT = 'linear-gradient(90deg, #4285f4 0%, #a855f7 55%, #ec4899 100%)';

const money = (cents: number) => `$${(Math.max(0, cents) / 100).toFixed(2)}`;

const sevColor = (s?: string | null) =>
  s === 'critical' ? C.red : s === 'high' ? '#fb923c' : s === 'medium' ? C.amber : C.subtext;

const confColor = (n: number) => (n >= 80 ? C.green : n >= 50 ? C.amber : C.red);

export default function StackTraceSurgeon() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isDark = true;

  const [stackTrace, setStackTrace] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walled, setWalled] = useState<{ code: string; message: string } | null>(null);
  const [prLoading, setPrLoading] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [appliedCommit, setAppliedCommit] = useState<{ url: string; sha: string; branch: string; filePath: string } | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [clock, setClock] = useState<string>(() => new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toUTCString().slice(17, 25)), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: account } = useQuery<Account>({ queryKey: ['/api/stack-trace-surgeon/account'] });
  const { data: history = [] } = useQuery<HistoryItem[]>({ queryKey: ['/api/stack-trace-surgeon/history'] });
  const { data: signals = [] } = useQuery<SignalItem[]>({
    queryKey: ['/api/stack-trace-surgeon/signals'],
    refetchInterval: 20000,
  });
  const { data: ghStatus } = useQuery<{ connected: boolean; source: string }>({
    queryKey: ['/api/stack-trace-surgeon/github-status'],
  });
  const ghIntegrated = !!ghStatus?.connected;
  const isOwnerLike = !!account?.ownerLike;
  const canDirectApply = isOwnerLike || githubToken.trim().length > 0;

  // Out-of-access (purely for UI hinting; the server is the real gate).
  const outOfAccess = (() => {
    if (!account) return false;
    if (account.ownerLike) return false;
    if (account.paid) return account.credits < (account.perUseFeeCents ?? 20);
    return account.trialUsed >= account.trialLimit;
  })();

  const ingestUrl = account?.ingestToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/stack-trace-surgeon/ingest/${account.ingestToken}`
    : '';

  const border = C.border, subtext = C.subtext, text = C.text, codeBg = C.codeBg, cardBg = C.panel;

  // ── Light Markdown renderer (prose + fenced diffs) ─────────────────────────
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
              else if (bold) inline.push(<strong key={k} style={{ color: C.text }}>{p}</strong>);
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
                  color: ln.startsWith('+') && !ln.startsWith('+++') ? C.green
                       : ln.startsWith('-') && !ln.startsWith('---') ? C.red
                       : ln.startsWith('@') ? C.violet
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

  const refreshAccount = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/account'] });
  };

  const runDiagnosis = async () => {
    setError(null);
    setResult(null);
    setWalled(null);
    setPrUrl(null);
    setAppliedCommit(null);
    setShowApplyConfirm(false);
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
        if (res.status === 402) {
          setWalled({ code: data?.code || 'UPGRADE_REQUIRED', message: data?.message || 'Access required.' });
        } else {
          setError(data?.message || 'Diagnosis failed.');
        }
      } else {
        setResult(data);
        if (data.account) queryClient.setQueryData(['/api/stack-trace-surgeon/account'], (prev: Account | undefined) => ({ ...(prev || {} as Account), ...data.account }));
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
      setRepoUrl(row.repoUrl || '');
      setResult({
        id: row.id,
        rootCause: row.rootCause,
        suggestedFix: row.suggestedFix,
        filesUsed: row.filesUsed || [],
        framesParsed: row.framesParsed,
        warnings: row.warnings || [],
        confidence: row.confidence ?? undefined,
        severity: row.severity ?? undefined,
        alternatives: row.alternatives || [],
        incidentSummary: row.incidentSummary || '',
        postmortem: row.postmortem || '',
        culprit: row.culprit ?? null,
      });
      setPrUrl(row.prUrl || null);
      setAppliedCommit(null);
      setShowApplyConfirm(false);
      setShowHistory(false);
      setError(null);
      setWalled(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e?.message || '', variant: 'destructive' });
    }
  };

  // Load a signal's trace into the terminal so the user can run a full diagnosis.
  const loadSignalIntoTerminal = async (id: number) => {
    try {
      const res = await fetch(`/api/stack-trace-surgeon/history/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const row = await res.json();
      setStackTrace(row.stackTrace || '');
      setRepoUrl(row.repoUrl || '');
      setResult(null);
      setError(null);
      setWalled(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast({ title: 'Signal loaded', description: 'Add a repo URL if needed, then initiate diagnosis.' });
    } catch (e: any) {
      toast({ title: 'Failed to load signal', description: e?.message || '', variant: 'destructive' });
    }
  };

  const deleteHistoryItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest('DELETE', `/api/stack-trace-surgeon/history/${id}`);
      queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/signals'] });
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
    if (!githubToken.trim() && !ghIntegrated) {
      setShowToken(true);
      toast({ title: 'GitHub token required', description: 'Add a token with repo write access to open a PR.', variant: 'destructive' });
      return;
    }
    setPrLoading(true);
    try {
      const res = await apiRequest('POST', '/api/stack-trace-surgeon/open-pr', {
        diagnosisId: result.id,
        githubToken: githubToken || undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) setWalled({ code: data?.code || 'UPGRADE_REQUIRED', message: data?.message || 'Access required.' });
        toast({ title: 'Could not open PR', description: data?.message || 'Unknown error', variant: 'destructive' });
      } else {
        setPrUrl(data.prUrl);
        toast({ title: 'Pull request opened', description: `PR #${data.prNumber} on branch ${data.branch}` });
        if (typeof data.credits === 'number') queryClient.setQueryData(['/api/stack-trace-surgeon/account'], (prev: Account | undefined) => prev ? { ...prev, credits: data.credits } : prev);
        queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/history'] });
      }
    } catch (e: any) {
      toast({ title: 'PR failed', description: e?.message || '', variant: 'destructive' });
    } finally {
      setPrLoading(false);
    }
  };

  const applyDirectly = async () => {
    if (!result?.id) {
      toast({ title: 'Save the diagnosis first', description: 'Re-run the diagnosis so we can save it before applying.', variant: 'destructive' });
      return;
    }
    if (!githubToken.trim() && !ghIntegrated) {
      setShowToken(true);
      toast({ title: 'GitHub not connected', description: 'Connect GitHub via Replit integrations or paste a token with repo write access.', variant: 'destructive' });
      return;
    }
    setApplyLoading(true);
    setShowApplyConfirm(false);
    try {
      const res = await apiRequest('POST', '/api/stack-trace-surgeon/apply-fix', {
        diagnosisId: result.id,
        githubToken: githubToken || undefined,
        confirmedDirect: true,
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) setWalled({ code: data?.code || 'UPGRADE_REQUIRED', message: data?.message || 'Access required.' });
        toast({ title: 'Could not apply fix', description: data?.message || 'Unknown error', variant: 'destructive' });
      } else {
        setAppliedCommit({ url: data.commitUrl, sha: data.commitSha, branch: data.branch, filePath: data.filePath });
        toast({ title: 'Fix committed to repo', description: `Commit ${String(data.commitSha).slice(0, 7)} on ${data.branch}` });
        if (typeof data.credits === 'number') queryClient.setQueryData(['/api/stack-trace-surgeon/account'], (prev: Account | undefined) => prev ? { ...prev, credits: data.credits } : prev);
        queryClient.invalidateQueries({ queryKey: ['/api/stack-trace-surgeon/history'] });
      }
    } catch (e: any) {
      toast({ title: 'Apply failed', description: e?.message || '', variant: 'destructive' });
    } finally {
      setApplyLoading(false);
    }
  };

  const rotateIngestToken = async () => {
    try {
      const res = await apiRequest('POST', '/api/stack-trace-surgeon/ingest-token/rotate', {});
      const data = await res.json();
      if (res.ok && data.ingestToken) {
        queryClient.setQueryData(['/api/stack-trace-surgeon/account'], (prev: Account | undefined) => prev ? { ...prev, ingestToken: data.ingestToken } : prev);
        toast({ title: 'Endpoint rotated', description: 'The old webhook URL no longer works.' });
      }
    } catch {
      toast({ title: 'Rotate failed', variant: 'destructive' });
    }
  };

  const downloadPostmortem = () => {
    if (!result?.postmortem) return;
    const blob = new Blob([result.postmortem], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `postmortem-${result.id || 'incident'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = (t: string, label = 'Copied') => { navigator.clipboard?.writeText(t); toast({ title: label }); };

  // ── Access readout values ──────────────────────────────────────────────────
  const accessMode = account?.ownerLike ? 'unlimited' : account?.paid ? 'metered' : 'trial';
  const trialRemaining = account ? Math.max(0, account.trialLimit - account.trialUsed) : 0;
  const monthlyCreditCents = account?.monthlyCreditCents ?? 10000;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
      {/* scanline overlay */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5,
          background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0) 4px)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-5" style={{ zIndex: 1 }}>
        {/* ── TOP STATUS BAR ── */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-xs cursor-pointer hover:opacity-80" style={{ color: C.subtext }} data-testid="link-back">
              <ArrowLeft size={14} /> EXIT
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]" style={{ color: C.subtext }}>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: C.green }} /> SECURE LINK
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <Radio className="h-3 w-3" /> {signals.length} SIGNAL{signals.length === 1 ? '' : 'S'}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums" style={{ color: C.cyan }}>
              <Clock className="h-3 w-3" /> {clock} UTC
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => setShowHistory(s => !s)}
              className="text-[10px] h-7"
              style={{ borderColor: C.border, background: 'transparent', color: C.text }}
              data-testid="button-toggle-history"
            >
              <History className="h-3 w-3 mr-1" /> LOG {history.length > 0 ? `(${history.length})` : ''}
            </Button>
          </div>
        </div>

        {/* ── HERO / TITLE ── */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] mb-1.5" style={{ color: C.red }}>
              <ShieldAlert className="h-3 w-3" /> CLASSIFIED · LEVEL 5 CLEARANCE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <Crosshair className="h-7 w-7" style={{ color: C.cyan }} />
              <span style={{ background: BRAND_GRADIENT, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                STACK TRACE SURGEON
              </span>
            </h1>
            <p className="text-[11px] mt-1.5 max-w-xl" style={{ color: C.subtext }}>
              Covert debug terminal — pinpoint root cause, find what broke it, ship the fix. Reads only the files in your trace. Tokens never stored.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-sm font-bold border" style={{ color: C.violet, background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.3)' }}>
            <Sparkles className="h-3 w-3" /> CLANDESTINE BUILD
          </div>
        </div>

        {/* ── ACCESS / CLEARANCE READOUT ── */}
        <AccessReadout
          account={account}
          accessMode={accessMode}
          trialRemaining={trialRemaining}
          monthlyCreditCents={monthlyCreditCents}
        />

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* INPUT TERMINAL */}
          <div className="lg:col-span-2 space-y-3">
            <Panel title="INPUT TERMINAL" icon={<Terminal className="h-3.5 w-3.5" style={{ color: C.green }} />}>
              <label className="block text-[10px] tracking-widest mb-1.5" style={{ color: C.subtext }}>STACK TRACE / ERROR LOG</label>
              <Textarea
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="Paste the full stack trace or error output…"
                className="font-mono text-[12px] min-h-[180px] resize-y"
                style={{ background: C.codeBg, borderColor: C.border, color: C.text }}
                data-testid="input-stack-trace"
              />
              <button
                onClick={() => setStackTrace(SAMPLE_TRACE)}
                className="text-[10px] mt-1.5 hover:underline"
                style={{ color: C.cyan }}
                data-testid="button-load-sample"
              >
                ↳ load sample trace
              </button>

              <label className="block text-[10px] tracking-widest mb-1.5 mt-4" style={{ color: C.subtext }}>TARGET REPOSITORY</label>
              <div className="flex items-center gap-2 rounded-md px-2.5" style={{ background: C.codeBg, border: `1px solid ${C.border}` }}>
                <Github className="h-4 w-4 flex-shrink-0" style={{ color: C.subtext }} />
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="font-mono text-[12px] border-0 bg-transparent focus-visible:ring-0 px-0"
                  style={{ color: C.text }}
                  data-testid="input-repo-url"
                />
              </div>

              {/* GitHub token (collapsible) */}
              <button
                onClick={() => setShowToken(s => !s)}
                className="text-[10px] mt-2 inline-flex items-center gap-1 hover:underline"
                style={{ color: C.subtext }}
                data-testid="button-toggle-token"
              >
                <Lock className="h-3 w-3" /> {showToken ? 'hide' : 'add'} GitHub token (for private repos / shipping fixes)
              </button>
              {showToken && (
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_… (never stored)"
                  className="font-mono text-[12px] mt-2"
                  style={{ background: C.codeBg, borderColor: C.border, color: C.text }}
                  data-testid="input-github-token"
                />
              )}

              {/* INITIATE */}
              <div className="mt-4">
                {walled ? (
                  <UpgradeWall walled={walled} paid={!!account?.paid} monthlyCreditCents={monthlyCreditCents} />
                ) : (
                  <Button
                    onClick={runDiagnosis}
                    disabled={loading}
                    className="w-full h-11 text-sm font-bold tracking-wider"
                    style={{ background: BRAND_GRADIENT, color: '#fff', opacity: loading ? 0.7 : 1 }}
                    data-testid="button-diagnose"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> ANALYZING TRACE…</>
                    ) : (
                      <><Crosshair className="h-4 w-4 mr-2" /> INITIATE DIAGNOSIS</>
                    )}
                  </Button>
                )}
                {!walled && !account?.ownerLike && account?.paid && (
                  <div className="text-[10px] mt-1.5 text-center" style={{ color: C.subtext }}>
                    Metered at cost + {money(account.perUseFeeCents ?? 20)}/use · balance {money(account.credits)}
                  </div>
                )}
                {!walled && !account?.ownerLike && !account?.paid && (
                  <div className="text-[10px] mt-1.5 text-center" style={{ color: C.subtext }}>
                    {trialRemaining} of {account?.trialLimit ?? 2} free diagnoses remaining
                  </div>
                )}
              </div>
            </Panel>

            {error && (
              <div className="rounded-md p-3 text-[12px] flex items-start gap-2 border" style={{ background: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.35)', color: C.red }} data-testid="error-banner">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> <div>{error}</div>
              </div>
            )}
          </div>

          {/* SIGNALS + WEBHOOK */}
          <div className="space-y-3">
            <Panel title="INCOMING SIGNALS" icon={<Activity className="h-3.5 w-3.5" style={{ color: C.amber }} />} right={
              <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.1)', color: C.green }}>
                <span className="h-1 w-1 rounded-full animate-pulse" style={{ background: C.green }} /> LIVE
              </span>
            }>
              {signals.length === 0 ? (
                <div className="text-[11px] py-3 text-center" style={{ color: C.subtext }}>
                  No auto-caught errors yet. Wire up the webhook below so production errors stream in automatically — no copy-paste.
                </div>
              ) : (
                <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {signals.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-md px-2.5 py-2 cursor-pointer hover:opacity-90"
                      style={{ background: C.codeBg, border: `1px solid ${C.border}` }}
                      onClick={() => loadSignalIntoTerminal(s.id)}
                      data-testid={`signal-${s.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase" style={{ color: sevColor(s.severity), background: 'rgba(255,255,255,0.04)', border: `1px solid ${sevColor(s.severity)}40` }}>
                          {s.severity || 'new'}
                        </span>
                        <span className="text-[9px]" style={{ color: C.subtext }}>{new Date(s.createdAt).toLocaleTimeString()}</span>
                        {s.status === 'new' && <span className="text-[9px]" style={{ color: C.amber }}>· untriaged</span>}
                      </div>
                      <div className="text-[11px] font-medium truncate" style={{ color: C.text }}>{s.title}</div>
                      {s.rootCause && <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: C.subtext }}>{s.rootCause}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="ERROR INGEST WIRE" icon={<Radio className="h-3.5 w-3.5" style={{ color: C.cyan }} />}>
              <p className="text-[10px] mb-2" style={{ color: C.subtext }}>
                Point Sentry, a log drain, or any webhook at this private endpoint. Errors arrive auto-triaged with severity.
              </p>
              <div className="rounded-md px-2 py-2 break-all text-[10px] font-mono" style={{ background: C.codeBg, border: `1px solid ${C.border}`, color: C.cyan }} data-testid="text-ingest-url">
                {ingestUrl || 'loading…'}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm" variant="outline"
                  onClick={() => copyText(ingestUrl, 'Webhook URL copied')}
                  disabled={!ingestUrl}
                  className="text-[10px] h-7 flex-1"
                  style={{ borderColor: C.border, background: 'transparent', color: C.text }}
                  data-testid="button-copy-ingest"
                >
                  <Copy className="h-3 w-3 mr-1" /> COPY URL
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={rotateIngestToken}
                  className="text-[10px] h-7"
                  style={{ borderColor: C.border, background: 'transparent', color: C.amber }}
                  data-testid="button-rotate-ingest"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> ROTATE
                </Button>
              </div>
              <div className="text-[9px] mt-2" style={{ color: C.subtext }}>
                POST JSON: <code style={{ color: C.text }}>{`{ "stackTrace": "...", "title": "..." }`}</code> — Sentry payloads are auto-parsed.
              </div>
            </Panel>
          </div>
        </div>

        {/* ── HISTORY DRAWER ── */}
        {showHistory && (
          <Panel title="MISSION LOG · SAVED DIAGNOSES" icon={<History className="h-3.5 w-3.5" />} className="mt-4">
            {history.length === 0 ? (
              <div className="text-[11px] py-3 text-center" style={{ color: C.subtext }}>No diagnoses yet. Run one and it'll appear here automatically.</div>
            ) : (
              <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <li
                    key={h.id}
                    onClick={() => loadFromHistory(h.id)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:opacity-90"
                    style={{ background: C.codeBg, border: `1px solid ${C.border}` }}
                    data-testid={`history-item-${h.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-mono truncate" style={{ color: C.text }}>{h.title}</div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: C.subtext }}>
                        <span className="truncate">{h.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '') || '—'}</span>
                        <span>·</span>
                        <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                        {h.prUrl && (<><span>·</span><span style={{ color: C.green }}>{h.prUrl.includes('/commit/') ? 'Committed' : 'PR opened'}</span></>)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(h.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:opacity-100"
                      style={{ color: C.red }}
                      data-testid={`history-delete-${h.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {/* ── DOSSIER (RESULTS) ── */}
        {result && (
          <div className="space-y-4 mt-5" data-testid="result-panel">
            {/* Threat assessment header */}
            <Panel title="THREAT ASSESSMENT" icon={<Gauge className="h-3.5 w-3.5" style={{ color: confColor(result.confidence ?? 70) }} />}
              right={
                <span className="text-[10px]" style={{ color: C.subtext }}>
                  {result.framesParsed} frame{result.framesParsed === 1 ? '' : 's'} · {result.filesUsed.length} file{result.filesUsed.length === 1 ? '' : 's'}
                  {result.warnings?.includes('deep_repo_expanded') && <span style={{ color: C.cyan }}> · deep-repo</span>}
                </span>
              }>
              <div className="flex flex-wrap items-center gap-4">
                {result.severity && (
                  <div className="flex items-center gap-2">
                    <Siren className="h-4 w-4" style={{ color: sevColor(result.severity) }} />
                    <span className="text-[11px] tracking-widest" style={{ color: C.subtext }}>SEVERITY</span>
                    <span className="text-sm font-bold uppercase" style={{ color: sevColor(result.severity) }}>{result.severity}</span>
                  </div>
                )}
                {typeof result.confidence === 'number' && (
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: C.subtext }}>
                      <span className="tracking-widest">CONFIDENCE</span>
                      <span className="font-bold tabular-nums" style={{ color: confColor(result.confidence) }}>{result.confidence}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: C.codeBg, border: `1px solid ${C.border}` }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${result.confidence}%`, background: confColor(result.confidence) }} />
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Root cause */}
            <Panel title="ROOT CAUSE" icon={<CheckCircle2 className="h-3.5 w-3.5" style={{ color: C.green }} />}>
              <div className="text-[13px]" style={{ color: C.text }} data-testid="text-root-cause">{renderMarkdown(result.rootCause)}</div>
            </Panel>

            {/* Ranked alternatives */}
            {result.alternatives && result.alternatives.length > 0 && (
              <Panel title="RANKED ALTERNATIVES" icon={<ListTree className="h-3.5 w-3.5" style={{ color: C.violet }} />}>
                <ul className="space-y-2">
                  {result.alternatives.map((alt, i) => (
                    <li key={i} className="flex items-start gap-3" data-testid={`alternative-${i}`}>
                      <div className="w-12 flex-shrink-0 text-right text-[12px] font-bold tabular-nums pt-0.5" style={{ color: confColor(alt.confidence) }}>{alt.confidence}%</div>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: C.codeBg }}>
                          <div className="h-full rounded-full" style={{ width: `${alt.confidence}%`, background: confColor(alt.confidence) }} />
                        </div>
                        <div className="text-[12px]" style={{ color: C.text }}>{alt.cause}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {/* Culprit — find what broke it */}
            {result.culprit && (
              <Panel title="FIND WHAT BROKE IT · PRIME SUSPECT" icon={<Fingerprint className="h-3.5 w-3.5" style={{ color: C.red }} />}>
                <div className="rounded-md p-3" style={{ background: C.codeBg, border: `1px solid ${C.border}` }} data-testid="culprit-panel">
                  <div className="flex items-center gap-2 mb-1.5">
                    <GitCommit className="h-4 w-4" style={{ color: C.amber }} />
                    <code className="text-[12px]" style={{ color: C.amber }}>{result.culprit.sha.slice(0, 10)}</code>
                    <span className="text-[11px]" style={{ color: C.subtext }}>by</span>
                    <span className="text-[12px] font-semibold" style={{ color: C.text }}>{result.culprit.author}</span>
                    {result.culprit.date && <span className="text-[10px]" style={{ color: C.subtext }}>· {new Date(result.culprit.date).toLocaleDateString()}</span>}
                  </div>
                  <div className="text-[12px] mb-2" style={{ color: C.text }}>{result.culprit.message}</div>
                  <a href={result.culprit.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] hover:underline" style={{ color: C.cyan }} data-testid="culprit-link">
                    inspect commit on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-[10px] mt-2" style={{ color: C.subtext }}>Most recent change to the failing file — the likeliest regression source.</div>
                </div>
              </Panel>
            )}

            {/* Suggested fix + actions */}
            <Panel title="SUGGESTED FIX" icon={<Zap className="h-3.5 w-3.5" style={{ color: C.cyan }} />}>
              <div className="text-[13px]" style={{ color: C.text }} data-testid="text-suggested-fix">{renderMarkdown(result.suggestedFix)}</div>

              {result.id && (
                <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: C.subtext }}>
                    <Github className="h-3 w-3" />
                    {ghIntegrated ? <span style={{ color: C.green }}>GitHub connected — ready to deploy fix</span> : <span>No GitHub integration — paste a token above to enable repo writes</span>}
                  </div>

                  {appliedCommit && (
                    <a href={appliedCommit.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-semibold" style={{ background: 'rgba(34,211,238,0.1)', color: C.cyan, border: '1px solid rgba(34,211,238,0.3)' }} data-testid="link-commit-applied">
                      <CheckCircle2 className="h-4 w-4" /> Fix committed to <code className="font-mono">{appliedCommit.branch}</code> · {appliedCommit.sha.slice(0, 7)} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}

                  {prUrl && !appliedCommit && (
                    <div className="flex flex-col gap-2">
                      <a href={prUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-semibold self-start" style={{ background: 'rgba(52,211,153,0.1)', color: C.green, border: '1px solid rgba(52,211,153,0.3)' }} data-testid="link-pr-opened">
                        <CheckCircle2 className="h-4 w-4" /> PR opened — view on GitHub <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <PrChecksBadge prUrl={prUrl} githubToken={githubToken} isDark={isDark} border={border} subtext={subtext} text={text} />
                    </div>
                  )}

                  {!appliedCommit && (
                    <div className="flex flex-wrap items-center gap-2">
                      {canDirectApply ? (
                        <Button onClick={() => setShowApplyConfirm(true)} disabled={applyLoading || prLoading} size="sm" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }} data-testid="button-apply-direct">
                          {applyLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deploying…</> : <><Zap className="h-4 w-4 mr-2" /> Apply directly to repo</>}
                        </Button>
                      ) : (
                        <div className="text-[10px] px-3 py-2 rounded border" style={{ borderColor: C.border, color: C.subtext, background: C.codeBg }}>
                          Direct-apply needs your own GitHub token (paste above) — only the owner can commit via the integration token.
                        </div>
                      )}
                      {!prUrl && (
                        <Button onClick={openPullRequest} disabled={prLoading || applyLoading} size="sm" variant="outline" style={{ borderColor: C.border, background: 'transparent', color: C.text }} data-testid="button-open-pr">
                          {prLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening PR…</> : <><GitPullRequest className="h-4 w-4 mr-2" /> Open PR for review</>}
                        </Button>
                      )}
                    </div>
                  )}

                  {!account?.ownerLike && account?.paid && (
                    <p className="text-[10px]" style={{ color: C.subtext }}>Shipping a fix (PR or apply) costs {money(account.perUseFeeCents ?? 20)} · balance {money(account.credits)}.</p>
                  )}

                  {showApplyConfirm && (
                    <div className="rounded-md p-4 border" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.4)' }}>
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: C.amber }} />
                        <div className="flex-1">
                          <h4 className="text-[13px] font-semibold mb-1" style={{ color: C.amber }}>Commit directly to default branch?</h4>
                          <p className="text-[11px] mb-3" style={{ color: C.subtext }}>This pushes one commit straight to main (or your default branch) without a PR. No automatic rollback — you'd <code>git revert</code> manually.</p>
                          <div className="flex gap-2">
                            <Button onClick={applyDirectly} size="sm" style={{ background: C.amber, color: '#1a1205' }} data-testid="button-apply-confirm">Yes, commit now</Button>
                            <Button onClick={() => setShowApplyConfirm(false)} size="sm" variant="outline" style={{ borderColor: C.border, background: 'transparent', color: C.text }} data-testid="button-apply-cancel">Cancel</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* Incident brief */}
            {result.incidentSummary && (
              <Panel title="INCIDENT BRIEF · ON-CALL" icon={<Siren className="h-3.5 w-3.5" style={{ color: C.red }} />}>
                <div className="text-[13px]" style={{ color: C.text }} data-testid="text-incident-brief">{renderMarkdown(result.incidentSummary)}</div>
              </Panel>
            )}

            {/* Postmortem */}
            {result.postmortem && (
              <Panel title="BLAMELESS POSTMORTEM" icon={<ScrollText className="h-3.5 w-3.5" style={{ color: C.violet }} />}
                right={
                  <Button size="sm" variant="outline" onClick={downloadPostmortem} className="text-[10px] h-7" style={{ borderColor: C.border, background: 'transparent', color: C.text }} data-testid="button-download-postmortem">
                    <Download className="h-3 w-3 mr-1" /> .md
                  </Button>
                }>
                <div className="text-[13px]" style={{ color: C.text }} data-testid="text-postmortem">{renderMarkdown(result.postmortem)}</div>
              </Panel>
            )}

            {/* Files inspected */}
            {result.filesUsed.length > 0 && (
              <Panel title="FILES INSPECTED" icon={<FileCode className="h-3.5 w-3.5" style={{ color: C.subtext }} />}>
                <ul className="text-[11px] font-mono space-y-1" style={{ color: C.subtext }}>
                  {result.filesUsed.map((f, i) => (<li key={i} data-testid={`file-${i}`}>{f.path}{f.line ? `:${f.line}` : ''}</li>))}
                </ul>
              </Panel>
            )}

            {/* Warnings */}
            {result.warnings.filter(w => w !== 'deep_repo_expanded').length > 0 && (
              <div className="rounded-md p-3 text-[11px] flex items-start gap-2 border" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)', color: C.amber }}>
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div>
                  {result.warnings.includes('no_files_fetched') && 'No source files could be fetched (private repo without token, wrong branch, or trace paths didn\'t match repo layout). Diagnosis is from the trace alone. '}
                  {result.warnings.includes('no_frames_parsed') && 'No file paths were detected in the trace. Diagnosis is from the error message alone.'}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 pt-5 text-center text-[10px]" style={{ borderTop: `1px solid ${C.border}`, color: C.subtext }}>
          STACK TRACE SURGEON · TURBOANSWER CLASSIFIED DIVISION · Reads only the files in your trace · Tokens never stored
        </div>
      </div>
    </div>
  );
}

// ─── PANEL WRAPPER ────────────────────────────────────────────────────────────
function Panel({ title, icon, right, children, className }: { title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg overflow-hidden ${className || ''}`} style={{ background: C.panel, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: `1px solid ${C.border}`, background: C.panel2 }}>
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest" style={{ color: C.text }}>
          {icon} {title}
        </div>
        {right}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

// ─── ACCESS / CLEARANCE READOUT ───────────────────────────────────────────────
function AccessReadout({ account, accessMode, trialRemaining, monthlyCreditCents }: { account?: Account; accessMode: string; trialRemaining: number; monthlyCreditCents: number }) {
  if (!account) {
    return <div className="rounded-lg px-4 py-3 text-[11px]" style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.subtext }}>Establishing secure connection…</div>;
  }
  const baseStyle = { background: C.panel, border: `1px solid ${C.border}` } as React.CSSProperties;

  if (accessMode === 'unlimited') {
    return (
      <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={{ ...baseStyle, borderColor: 'rgba(52,211,153,0.3)' }} data-testid="access-readout">
        <Cpu className="h-5 w-5" style={{ color: C.green }} />
        <div>
          <div className="text-[11px] font-bold tracking-widest" style={{ color: C.green }}>UNLIMITED CLEARANCE</div>
          <div className="text-[10px]" style={{ color: C.subtext }}>Owner / staff access — no metering, no limits.</div>
        </div>
      </div>
    );
  }

  if (accessMode === 'metered') {
    const pct = Math.min(100, (account.credits / monthlyCreditCents) * 100);
    return (
      <div className="rounded-lg px-4 py-3" style={baseStyle} data-testid="access-readout">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-bold tracking-widest" style={{ color: C.cyan }}>MONTHLY ALLOWANCE</div>
          <div className="text-[13px] font-bold tabular-nums" style={{ color: C.cyan }}>{money(account.credits)}</div>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: C.codeBg, border: `1px solid ${C.border}` }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: BRAND_GRADIENT }} />
        </div>
        <div className="text-[10px]" style={{ color: C.subtext }}>
          {money(monthlyCreditCents)}/mo included · metered at actual cost + {money(account.perUseFeeCents ?? 20)}/use · resets next billing period
        </div>
      </div>
    );
  }

  // trial
  const exhausted = trialRemaining <= 0;
  return (
    <div className="rounded-lg px-4 py-3" style={{ ...baseStyle, borderColor: exhausted ? 'rgba(248,113,113,0.35)' : C.border }} data-testid="access-readout">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-bold tracking-widest" style={{ color: exhausted ? C.red : C.amber }}>FIELD TRIAL ACCESS</div>
        <div className="text-[11px] tabular-nums" style={{ color: exhausted ? C.red : C.text }}>{trialRemaining}/{account.trialLimit} REMAINING</div>
      </div>
      <div className="flex gap-1 mb-1.5">
        {Array.from({ length: account.trialLimit }).map((_, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < (account.trialLimit - account.trialUsed) ? C.amber : C.codeBg, border: `1px solid ${C.border}` }} />
        ))}
      </div>
      <div className="text-[10px]" style={{ color: C.subtext }}>
        {exhausted
          ? `Trial complete. Stack Trace Surgeon is included with Enterprise — ${money(monthlyCreditCents)}/month of debugging built in.`
          : `${account.trialLimit} free diagnoses, then upgrade to Enterprise for ${money(monthlyCreditCents)}/month of metered access.`}
      </div>
    </div>
  );
}

// ─── UPGRADE WALL ─────────────────────────────────────────────────────────────
function UpgradeWall({ walled, paid, monthlyCreditCents }: { walled: { code: string; message: string }; paid: boolean; monthlyCreditCents: number }) {
  const outOfCredits = walled.code === 'OUT_OF_CREDITS';
  return (
    <div className="rounded-lg p-4 text-center" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.35)' }} data-testid="upgrade-wall">
      <Lock className="h-6 w-6 mx-auto mb-2" style={{ color: C.violet }} />
      <div className="text-[13px] font-bold mb-1" style={{ color: C.text }}>
        {outOfCredits ? 'OPERATIONS CREDIT DEPLETED' : 'CLEARANCE REQUIRED'}
      </div>
      <p className="text-[11px] mb-3" style={{ color: C.subtext }}>{walled.message}</p>
      <Link href="/subscribe">
        <Button className="w-full h-10 text-[12px] font-bold tracking-wider" style={{ background: BRAND_GRADIENT, color: '#fff' }} data-testid="button-upgrade">
          {outOfCredits ? 'ALLOWANCE RESETS NEXT MONTH' : `UNLOCK · ${money(monthlyCreditCents)}/MO INCLUDED`}
        </Button>
      </Link>
    </div>
  );
}

// ─── CI STATUS BADGE ──────────────────────────────────────────────────────────
type PrCheckRun = { name: string; conclusion: string | null; status: string; url: string | null };
type PrCheckResp = {
  state: 'pending' | 'success' | 'failure' | 'no_checks';
  total: number; passed: number; failed: number; pending: number;
  runs: PrCheckRun[]; headSha: string | null;
};

function PrChecksBadge({
  prUrl, githubToken, isDark, border, subtext, text,
}: { prUrl: string; githubToken: string; isDark: boolean; border: string; subtext: string; text: string }) {
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
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `HTTP ${res.status}`);
      }
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

  if (isLoading && !data) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] self-start" style={{ background: C.codeBg, border: `1px solid ${border}`, color: subtext }}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking CI status…
      </div>
    );
  }
  if (error) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] self-start" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
        <AlertCircle className="h-3.5 w-3.5" /> Can't read CI status — open the PR to check
      </div>
    );
  }
  if (!data) return null;

  const palette = {
    pending:   { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)', color: '#f59e0b', Icon: Clock,        label: `CI running… ${data.passed}/${data.total} passed` },
    success:   { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.35)', color: '#10b981', Icon: CheckCircle2, label: `CI passed — all ${data.total} checks green · safe to merge` },
    failure:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.35)',  color: '#ef4444', Icon: XCircle,      label: `CI failed — ${data.failed}/${data.total} checks broke · review before merging` },
    no_checks: { bg: C.codeBg, border, color: subtext, Icon: AlertCircle, label: 'No CI configured on this repo — review the diff manually before merging' },
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
        <div className="rounded-md text-[11px] overflow-hidden" style={{ background: C.codeBg, border: `1px solid ${border}` }}>
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
