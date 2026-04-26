/**
 * GitHub Pull Request creation for Stack Trace Surgeon.
 *
 * Takes an AI-generated unified diff, applies it against the live file in the user's
 * repo, then creates a fresh branch + commit + PR via the GitHub REST API.
 */

const GH_API = 'https://api.github.com';

export type ParsedDiff = {
  filePath: string;
  removed: string[];
  added: string[];
  /** Best-effort hunk header (line numbers) for context */
  hunkHeader?: string;
};

/**
 * Parse the FIRST unified-diff block we find in the AI's "Suggested Fix" markdown.
 * Returns null if no usable diff is present.
 */
export function parseFirstDiff(text: string): ParsedDiff | null {
  if (!text) return null;
  const fenceMatches = Array.from(text.matchAll(/```(?:diff|patch)?\s*([\s\S]*?)```/g));
  const candidates: string[] = fenceMatches.map(m => m[1]);
  candidates.push(text);

  for (const block of candidates) {
    const fileLine = block.match(/^(?:\+\+\+\s+b\/|---\s+a\/)(\S+)/m);
    if (!fileLine) continue;
    const filePath = fileLine[1].trim();
    if (!filePath || filePath === 'dev/null') continue;

    const lines = block.split('\n');
    const removed: string[] = [];
    const added: string[] = [];
    let hunkHeader: string | undefined;
    for (const ln of lines) {
      if (ln.startsWith('@@')) { hunkHeader = ln; continue; }
      if (ln.startsWith('---') || ln.startsWith('+++')) continue;
      if (ln.startsWith('-') && !ln.startsWith('---')) removed.push(ln.slice(1));
      else if (ln.startsWith('+') && !ln.startsWith('+++')) added.push(ln.slice(1));
    }
    if (removed.length === 0 && added.length === 0) continue;
    return { filePath, removed, added, hunkHeader };
  }
  return null;
}

/**
 * Apply a parsed diff to source content. Strategy:
 *  - Try exact match of the joined `removed` block in the source. Replace with joined `added`.
 *  - If exact match fails, try a leading-whitespace-tolerant match.
 *  - If still no match and `removed` is empty (pure addition), append at end.
 *  - Returns null on failure so the caller can surface a clear error.
 */
export function applyDiff(source: string, diff: ParsedDiff): string | null {
  if (diff.removed.length === 0 && diff.added.length === 0) return null;
  const removedBlock = diff.removed.join('\n');
  const addedBlock = diff.added.join('\n');

  // Pure-addition fix.
  if (diff.removed.length === 0) {
    return source.endsWith('\n') ? source + addedBlock + '\n' : source + '\n' + addedBlock + '\n';
  }

  // Exact match.
  if (source.includes(removedBlock)) {
    return source.replace(removedBlock, addedBlock);
  }

  // Try trimming each line and matching ignoring leading whitespace.
  const sourceLines = source.split('\n');
  const removedTrimmed = diff.removed.map(l => l.trim());
  for (let i = 0; i <= sourceLines.length - removedTrimmed.length; i++) {
    let ok = true;
    for (let j = 0; j < removedTrimmed.length; j++) {
      if (sourceLines[i + j].trim() !== removedTrimmed[j]) { ok = false; break; }
    }
    if (ok) {
      // Preserve indentation from the source's first matched line.
      const indentMatch = sourceLines[i].match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      const newBlock = diff.added.map(l => indent + l.replace(/^\s*/, ''));
      sourceLines.splice(i, removedTrimmed.length, ...newBlock);
      return sourceLines.join('\n');
    }
  }

  return null;
}

async function ghFetch(token: string, path: string, init: RequestInit = {}): Promise<any> {
  const url = path.startsWith('http') ? path : `${GH_API}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'TurboAnswer-StackTraceSurgeon',
    ...((init.headers as Record<string, string>) || {}),
  };
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* non-JSON */ }
  if (!res.ok) {
    const msg = (body && body.message) ? body.message : `GitHub API ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export type CreatePrResult = { url: string; number: number; branch: string };

export async function createFixPullRequest(opts: {
  owner: string;
  repo: string;
  filePath: string;
  newContent: string;
  baseBranch?: string; // optional override; otherwise uses repo default
  commitMessage: string;
  prTitle: string;
  prBody: string;
  token: string;
}): Promise<CreatePrResult> {
  const { owner, repo, filePath, newContent, commitMessage, prTitle, prBody, token } = opts;

  // 1. Resolve default branch if base wasn't supplied.
  const repoInfo = await ghFetch(token, `/repos/${owner}/${repo}`);
  const baseBranch = opts.baseBranch || repoInfo.default_branch || 'main';

  // 2. Get base branch commit SHA.
  const baseRef = await ghFetch(token, `/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`);
  const baseSha: string = baseRef.object.sha;

  // 3. Create new branch.
  const branchSlug = `surgeon/fix-${Date.now().toString(36)}`;
  await ghFetch(token, `/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branchSlug}`, sha: baseSha }),
  });

  // 4. Get existing file SHA on base branch (required to update).
  let fileSha: string | undefined;
  try {
    const existing = await ghFetch(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}?ref=${encodeURIComponent(baseBranch)}`);
    if (existing && existing.sha) fileSha = existing.sha;
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  // 5. PUT contents on the new branch.
  const contentB64 = Buffer.from(newContent, 'utf8').toString('base64');
  await ghFetch(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: commitMessage,
      content: contentB64,
      branch: branchSlug,
      ...(fileSha ? { sha: fileSha } : {}),
    }),
  });

  // 6. Open the PR.
  const pr = await ghFetch(token, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: prTitle,
      head: branchSlug,
      base: baseBranch,
      body: prBody,
      maintainer_can_modify: true,
    }),
  });

  return { url: pr.html_url, number: pr.number, branch: branchSlug };
}

/**
 * Fetch a file from GitHub via the Contents API (works for both public and private repos
 * when a token is provided, with proper Bearer auth that supports fine-grained PATs).
 * Returns null on 404 / decode failure.
 */
export async function fetchFileViaContentsApi(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'TurboAnswer-StackTraceSurgeon',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { headers, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const json: any = await res.json();
    if (!json || json.type !== 'file' || !json.content) return null;
    const decoded = Buffer.from(json.content, 'base64').toString('utf8');
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Fallback: when we can't find a file by path, search the repo by basename and grab the first hit.
 * Requires a token (GitHub code search refuses anonymous). Returns the matching path or null.
 */
export async function searchFileByBasename(
  owner: string,
  repo: string,
  basename: string,
  token: string,
): Promise<string | null> {
  try {
    const q = `filename:${basename} repo:${owner}/${repo}`;
    const url = `${GH_API}/search/code?q=${encodeURIComponent(q)}&per_page=1`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'TurboAnswer-StackTraceSurgeon',
      },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    if (!json.items || json.items.length === 0) return null;
    return json.items[0].path || null;
  } catch {
    return null;
  }
}
