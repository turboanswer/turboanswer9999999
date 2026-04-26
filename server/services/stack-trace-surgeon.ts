import { fastAnswer } from "./reasoning-engine.js";

// Stack Trace Surgeon uses Claude Sonnet 4.5 directly via OpenRouter — Anthropic's
// best coding model, ideal for diagnosing stack traces and producing valid diffs.
// Falls back to Gemini Pro (via fastAnswer) if OpenRouter / Sonnet is unavailable.
const SURGEON_MODEL = 'anthropic/claude-sonnet-4.5';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callSonnetForSurgeon(prompt: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 50000);
  try {
    const res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://turboanswer.it.com',
        'X-Title': 'TurboAnswer Stack Trace Surgeon',
      },
      body: JSON.stringify({
        model: SURGEON_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.2,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.warn(`[StackTraceSurgeon] Sonnet 4.5 HTTP ${res.status}: ${txt.slice(0, 200)}`);
      return null;
    }
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    clearTimeout(t);
    console.warn(`[StackTraceSurgeon] Sonnet 4.5 failed: ${err?.message || err}`);
    return null;
  }
}

export type StackFrame = { file: string; line?: number; raw: string };
export type RepoRef = { owner: string; repo: string; branch: string };

const TRACE_PATTERNS: { re: RegExp; fileGroup: number; lineGroup?: number }[] = [
  { re: /at\s+[^\s(]+\s+\(([^):\s]+):(\d+)(?::\d+)?\)/g, fileGroup: 1, lineGroup: 2 },
  { re: /at\s+([^\s(]+):(\d+)(?::\d+)?/g, fileGroup: 1, lineGroup: 2 },
  { re: /File\s+"([^"]+)",\s+line\s+(\d+)/g, fileGroup: 1, lineGroup: 2 },
  { re: /([\w./\\-]+\.(?:py|rb|go|java|kt|kts|scala|cs|cpp|cc|c|h|hpp|rs|php|swift|m|mm|ts|tsx|js|jsx|mjs|cjs|vue|svelte|sql|sh)):(\d+)/g, fileGroup: 1, lineGroup: 2 },
  { re: /from\s+([\w./\\-]+\.\w+):(\d+)/g, fileGroup: 1, lineGroup: 2 },
];

export function parseStackTrace(text: string): StackFrame[] {
  if (!text) return [];
  const seen = new Set<string>();
  const frames: StackFrame[] = [];
  for (const { re, fileGroup, lineGroup } of TRACE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const file = m[fileGroup]?.trim();
      if (!file) continue;
      const line = lineGroup ? Number(m[lineGroup]) : undefined;
      const key = `${file}:${line ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      frames.push({ file, line, raw: m[0] });
      if (frames.length >= MAX_FRAMES) return frames;
    }
  }
  return frames;
}

export function parseRepoUrl(url: string): RepoRef | null {
  if (!url) return null;
  const cleaned = url.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  // /tree/<branch> branches may legitimately contain `/` (e.g. feature/foo).
  // We greedily capture everything after /tree/ as the branch name.
  let m = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\/tree\/(.+))?$/i);
  if (!m) {
    m = cleaned.match(/^([^/\s]+)\/([^/\s@]+?)(?:@(.+))?$/);
    if (m) return { owner: m[1], repo: m[2], branch: m[3] || 'main' };
    return null;
  }
  return { owner: m[1], repo: m[2], branch: m[3] || 'main' };
}

const FILE_EXT_RE = /\.(py|rb|go|java|kt|scala|cs|cpp|cc|c|h|hpp|rs|php|swift|m|mm|ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/i;
const REPO_FILE_LIMIT = 8;
const FILE_BYTE_LIMIT = 60_000;
const MAX_FRAMES = 20;
const MAX_FETCH_ATTEMPTS = 40;

function normalizeRepoPath(file: string, repo: string): string[] {
  const candidates = new Set<string>();
  let p = file.replace(/\\/g, '/').replace(/^\.\//, '');
  if (p.startsWith('file://')) p = p.slice(7);
  if (/^[a-zA-Z]:\//.test(p)) p = p.slice(3);
  if (p.startsWith('/')) p = p.slice(1);
  candidates.add(p);
  const repoIdx = p.indexOf(`${repo}/`);
  if (repoIdx >= 0) candidates.add(p.slice(repoIdx + repo.length + 1));
  const segments = p.split('/');
  for (let i = 1; i < segments.length; i++) candidates.add(segments.slice(i).join('/'));
  return Array.from(candidates).filter(c => c && FILE_EXT_RE.test(c));
}

import { fetchFileViaContentsApi, searchFileByBasename } from './github-pr.js';

async function tryFetchRaw(owner: string, repo: string, branch: string, path: string, token?: string): Promise<string | null> {
  // 1. Authenticated: prefer the Contents API (works for private repos AND fine-grained PATs).
  if (token) {
    const viaApi = await fetchFileViaContentsApi(owner, repo, path, branch, token);
    if (viaApi !== null) {
      return viaApi.length > FILE_BYTE_LIMIT
        ? viaApi.slice(0, FILE_BYTE_LIMIT) + '\n…[truncated by Stack Trace Surgeon]'
        : viaApi;
    }
  }
  // 2. Anonymous (or token failed): use raw.githubusercontent.com (no auth, public repos only).
  const headers: Record<string, string> = { 'User-Agent': 'TurboAnswer-StackTraceSurgeon' };
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { headers, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > FILE_BYTE_LIMIT ? text.slice(0, FILE_BYTE_LIMIT) + '\n…[truncated by Stack Trace Surgeon]' : text;
  } catch {
    return null;
  }
}

export async function fetchRepoFiles(
  ref: RepoRef,
  frames: StackFrame[],
  token?: string,
): Promise<{ path: string; content: string; line?: number }[]> {
  const results: { path: string; content: string; line?: number }[] = [];
  const tried = new Set<string>();
  const branchesToTry = Array.from(new Set([ref.branch, ref.branch === 'main' ? 'master' : 'main', 'develop', 'dev', 'trunk']));
  let attempts = 0;

  for (const frame of frames) {
    if (results.length >= REPO_FILE_LIMIT) break;
    if (attempts >= MAX_FETCH_ATTEMPTS) break;
    const candidates = normalizeRepoPath(frame.file, ref.repo);
    let fetched: { path: string; content: string } | null = null;
    for (const cand of candidates) {
      for (const br of branchesToTry) {
        if (attempts >= MAX_FETCH_ATTEMPTS) break;
        const key = `${br}::${cand}`;
        if (tried.has(key)) continue;
        tried.add(key);
        attempts += 1;
        const content = await tryFetchRaw(ref.owner, ref.repo, br, cand, token);
        if (content) { fetched = { path: cand, content }; break; }
      }
      if (fetched) break;
    }

    // Fallback: if we have a token and STILL didn't find the file, search the repo by basename.
    if (!fetched && token && attempts < MAX_FETCH_ATTEMPTS) {
      const basename = candidates[0]?.split('/').pop();
      if (basename && /\.[A-Za-z0-9]+$/.test(basename)) {
        const found = await searchFileByBasename(ref.owner, ref.repo, basename, token);
        if (found) {
          for (const br of branchesToTry) {
            if (attempts >= MAX_FETCH_ATTEMPTS) break;
            const key = `${br}::search::${found}`;
            if (tried.has(key)) continue;
            tried.add(key);
            attempts += 1;
            const content = await tryFetchRaw(ref.owner, ref.repo, br, found, token);
            if (content) { fetched = { path: found, content }; break; }
          }
        }
      }
    }

    if (fetched) results.push({ ...fetched, line: frame.line });
  }
  return results;
}

export type Diagnosis = {
  rootCause: string;
  suggestedFix: string;
  filesUsed: { path: string; line?: number }[];
  framesParsed: number;
  warnings: string[];
};

function buildPrompt(stackTrace: string, files: { path: string; content: string; line?: number }[]): string {
  const fileBlocks = files.map(f => {
    const head = f.line ? `### FILE: ${f.path} (error around line ${f.line})` : `### FILE: ${f.path}`;
    return `${head}\n\`\`\`\n${f.content}\n\`\`\``;
  }).join('\n\n');
  const haveFiles = fileBlocks.length > 0;
  return [
    'You are Stack Trace Surgeon, a senior debugging engineer with 20 years of production experience.',
    'You receive a runtime error / stack trace and (sometimes) the actual source files referenced by that trace.',
    'Your job: diagnose the ROOT CAUSE precisely (not the symptom), then give a CONCRETE, ACTIONABLE fix.',
    '',
    '════════════════════════════════════════',
    'ABSOLUTE RULES — READ TWICE:',
    '════════════════════════════════════════',
    '1. You MUST fill in EVERY section below. Empty sections, "(cannot provide)", "source files not provided",',
    '   "without the source file I cannot…", or any refusal phrase is FORBIDDEN. The user is paying $30/mo',
    '   for an answer — give them one.',
    '2. If source files are missing, that is FINE — you have decades of pattern-matching experience.',
    '   Infer the most likely buggy code from the error message + traceback context (function names, line numbers,',
    '   library conventions). Write the BEFORE block as your best reconstruction of what the code probably says,',
    '   and the AFTER block as the fix. Label it clearly as a reconstruction if uncertain, but ALWAYS provide it.',
    '3. The error message itself almost always tells you the bug. TypeError, ZeroDivisionError, NullPointerException,',
    '   KeyError, AttributeError, etc. — each has a small set of known causes. Pick the most likely one and commit.',
    '4. Never say "look elsewhere" or "I need more info". Make the best call you can with what you have.',
    '',
    '════════════════════════════════════════',
    'OUTPUT FORMAT (markdown, exact section names, in this order):',
    '════════════════════════════════════════',
    '',
    '## Root Cause',
    '(2–4 sentences in plain English. Name the file + line from the trace, then explain WHY it fails — the',
    'underlying mistake — not just WHAT the error message says. Be specific.)',
    '',
    '## Suggested Fix',
    '(Required: file path + a fenced code block. Use unified diff format `--- a/path` / `+++ b/path` with',
    '`-` for removed lines and `+` for added lines. Keep the change minimal — usually 1–5 lines. If you do not',
    'have the exact source, write your best reconstruction of the buggy line based on the trace and library',
    'conventions, and patch THAT.)',
    '',
    '## Why This Works',
    '(1–2 sentences. Connect the fix back to the root cause. Mention any edge case the engineer should',
    'still watch for.)',
    '',
    '## Tests / Verification',
    '(1–3 short, concrete steps. e.g. "Run `python app.py` again — the TypeError should be gone." or',
    '"Add a unit test that passes timeout=10.0 and expects no exception.")',
    '',
    '════════════════════════════════════════',
    haveFiles
      ? `INPUT: stack trace + ${(fileBlocks.match(/^=== /gm) || []).length} fetched source file(s).`
      : 'INPUT: stack trace ONLY. Source files were not fetched (private repo, wrong path, or rate-limited). Diagnose anyway — your reconstruction will still help.',
    '════════════════════════════════════════',
    '',
    '=== STACK TRACE ===',
    stackTrace.slice(0, 8000),
    '',
    '=== SOURCE FILES ===',
    fileBlocks || '(none fetched — work from the stack trace and your debugging experience)',
  ].join('\n');
}

function splitDiagnosis(text: string): { rootCause: string; suggestedFix: string } {
  const root = text.match(/##\s*Root Cause\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const fixSection = text.match(/##\s*Suggested Fix\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const why = text.match(/##\s*Why This Works\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const tests = text.match(/##\s*Tests \/ Verification\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const suggested = [
    fixSection,
    why ? `\n**Why this works:** ${why}` : '',
    tests ? `\n\n**Verify:**\n${tests}` : '',
  ].filter(Boolean).join('').trim();
  return {
    rootCause: root || text.slice(0, 600),
    suggestedFix: suggested || text,
  };
}

export async function diagnoseStackTrace(
  stackTrace: string,
  repoUrl: string,
  tier: string | undefined,
  token?: string,
): Promise<Diagnosis> {
  const warnings: string[] = [];
  const ref = parseRepoUrl(repoUrl);
  if (!ref) {
    return {
      rootCause: 'Invalid GitHub repo URL.',
      suggestedFix: 'Paste a URL like `https://github.com/owner/repo` or `owner/repo`.',
      filesUsed: [],
      framesParsed: 0,
      warnings: ['repo_url_invalid'],
    };
  }
  const frames = parseStackTrace(stackTrace);
  if (frames.length === 0) warnings.push('no_frames_parsed');
  const files = ref ? await fetchRepoFiles(ref, frames, token) : [];
  if (frames.length > 0 && files.length === 0) warnings.push('no_files_fetched');

  const prompt = buildPrompt(stackTrace, files);
  // Primary: Claude Sonnet 4.5 (Anthropic's best coding model — produces cleaner
  // diffs and more accurate root-cause analysis than Gemini Pro on code tasks).
  // Fallback: tier-routed Gemini Pro chain via fastAnswer (so we never go silent
  // if OpenRouter / Sonnet is unavailable).
  let raw = await callSonnetForSurgeon(prompt);
  if (!raw || raw.trim().length < 20) {
    raw = await fastAnswer(prompt, undefined, tier);
  }
  const { rootCause, suggestedFix } = splitDiagnosis(raw);

  return {
    rootCause,
    suggestedFix,
    filesUsed: files.map(f => ({ path: f.path, line: f.line })),
    framesParsed: frames.length,
    warnings,
  };
}
