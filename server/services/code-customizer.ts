import { callDirect } from "./direct-router.js";
import { fastAnswer } from "./reasoning-engine.js";
import { fetchFileViaContentsApi, searchFileByBasename } from "./github-pr.js";
import { parseRepoUrl } from "./stack-trace-surgeon.js";

const CUSTOMIZER_MODEL = 'openai/gpt-4o';

async function callCustomizerModel(prompt: string): Promise<string | null> {
  return callDirect(CUSTOMIZER_MODEL, [{ role: 'user', content: prompt }], {
    maxTokens: 3500,
    temperature: 0.25,
    timeoutMs: 60000,
  });
}

function buildPrompt(filePath: string, fileContent: string, instructions: string): string {
  return [
    'You are Code Customizer, a senior engineer who edits real production source files.',
    'You receive ONE source file and a plain-English description of what the user wants changed.',
    'Your job: apply the requested change cleanly, then return a unified diff and an explanation.',
    '',
    '════════════════════════════════════════',
    'ABSOLUTE RULES:',
    '════════════════════════════════════════',
    '1. NEVER refuse. NEVER ask follow-up questions. Pick the most reasonable interpretation and ship.',
    '2. Make the SMALLEST change that satisfies the request. Do not rewrite the whole file.',
    '3. Preserve the existing code style (indentation, quotes, semicolons, naming conventions).',
    '4. The unified diff MUST apply cleanly to the file shown below — match indentation byte-for-byte.',
    '5. If the request is ambiguous or could break things, note that briefly in "Notes" — but STILL apply your best version of the change in the diff.',
    '',
    '════════════════════════════════════════',
    'OUTPUT FORMAT (markdown, exact section names, in this order):',
    '════════════════════════════════════════',
    '',
    '## Summary',
    '(2–4 sentences in plain English. What did you change and why does it satisfy the request?)',
    '',
    '## Suggested Fix',
    '(Required: a fenced ```diff code block with unified diff format `--- a/' + filePath + '` / `+++ b/' + filePath + '` headers, ',
    '`-` lines for removed code, `+` lines for added code, and `@@` hunk markers. Keep the diff minimal — only the lines that changed plus a few of context.)',
    '',
    '## Notes',
    '(1–3 short bullets covering: edge cases the user should test, any assumption you made, or a small follow-up the user might want next. Keep it tight.)',
    '',
    '════════════════════════════════════════',
    '=== USER REQUEST ===',
    instructions.slice(0, 4000),
    '',
    '=== FILE: ' + filePath + ' ===',
    '```',
    fileContent.slice(0, 12000),
    '```',
  ].join('\n');
}

function splitOutput(text: string): { summary: string; suggestedFix: string } {
  const summary = text.match(/##\s*Summary\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const fix = text.match(/##\s*Suggested Fix\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const notes = text.match(/##\s*Notes\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const out = notes ? `${fix}\n\n## Notes\n${notes}` : fix;
  return { summary: summary || 'Applied the requested change.', suggestedFix: out || text };
}

export type CustomizeResult = {
  summary: string;
  suggestedFix: string;
  filePath: string;
  warnings: string[];
};

export async function customizeFile(
  repoUrl: string,
  filePath: string,
  instructions: string,
  tier: string,
  token?: string,
): Promise<CustomizeResult> {
  const warnings: string[] = [];
  const ref = parseRepoUrl(repoUrl);
  if (!ref) {
    return {
      summary: 'Repo URL was not a valid github.com URL.',
      suggestedFix: 'Paste a URL like `https://github.com/owner/repo` or `owner/repo`.',
      filePath,
      warnings: ['repo_url_invalid'],
    };
  }

  // Fetch the file. Try the user-given path first; fall back to basename search.
  let resolvedPath = filePath;
  let content: string | null = null;
  for (const br of [ref.branch, ref.branch === 'main' ? 'master' : 'main']) {
    const c = await fetchFileViaContentsApi(ref.owner, ref.repo, filePath, br, token);
    if (c !== null) { content = c; break; }
  }
  if (content === null && token) {
    const basename = filePath.split('/').pop() || filePath;
    const found = await searchFileByBasename(ref.owner, ref.repo, basename, token);
    if (found) {
      resolvedPath = found;
      for (const br of [ref.branch, ref.branch === 'main' ? 'master' : 'main']) {
        const c = await fetchFileViaContentsApi(ref.owner, ref.repo, found, br, token);
        if (c !== null) { content = c; warnings.push('file_path_resolved_by_basename'); break; }
      }
    }
  }

  if (content === null) {
    return {
      summary: `Couldn't fetch ${filePath} from ${ref.owner}/${ref.repo}.`,
      suggestedFix: 'Double-check the file path matches what is in the repo, and that your GitHub token has read access if the repo is private.',
      filePath,
      warnings: ['file_not_fetched'],
    };
  }

  const prompt = buildPrompt(resolvedPath, content, instructions);
  let raw = await callCustomizerModel(prompt);
  if (!raw || raw.trim().length < 20) {
    raw = await fastAnswer(prompt, undefined, tier);
  }
  const { summary, suggestedFix } = splitOutput(raw || '');

  return { summary, suggestedFix, filePath: resolvedPath, warnings };
}
