import { fastAnswer } from "./reasoning-engine.js";

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

async function tryFetchRaw(owner: string, repo: string, branch: string, path: string, token?: string): Promise<string | null> {
  const headers: Record<string, string> = { 'User-Agent': 'TurboAnswer-StackTraceSurgeon' };
  if (token) headers['Authorization'] = `token ${token}`;
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
  const branchesToTry = Array.from(new Set([ref.branch, ref.branch === 'main' ? 'master' : 'main']));
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
  return [
    'You are Stack Trace Surgeon, a senior debugging engineer.',
    'You receive a runtime error / stack trace and the actual source files referenced by that trace.',
    'Diagnose the ROOT CAUSE precisely (not the symptom), then give a concrete fix.',
    '',
    'Output STRICT format with these markdown sections, in this exact order:',
    '## Root Cause',
    '(2–4 sentences in plain English. Name the file + line, explain WHY it fails, not just WHAT.)',
    '',
    '## Suggested Fix',
    '(Specific change: file path + a fenced code block with BEFORE → AFTER, or a unified diff. Keep minimal.)',
    '',
    '## Why This Works',
    '(1–2 sentences explaining how the fix removes the root cause and what to watch out for.)',
    '',
    '## Tests / Verification',
    '(1–3 short steps the engineer can run to verify the fix locally.)',
    '',
    'Rules: Do not invent files or APIs. If the provided files do not contain the bug, say so honestly and suggest where to look next. Be concise.',
    '',
    '=== STACK TRACE ===',
    stackTrace.slice(0, 8000),
    '',
    '=== SOURCE FILES ===',
    fileBlocks || '(no source files were fetched — diagnose from the trace alone and say so)',
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
  const raw = await fastAnswer(prompt, undefined, tier);
  const { rootCause, suggestedFix } = splitDiagnosis(raw);

  return {
    rootCause,
    suggestedFix,
    filesUsed: files.map(f => ({ path: f.path, line: f.line })),
    framesParsed: frames.length,
    warnings,
  };
}
