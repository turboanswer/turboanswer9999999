const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export const SUPPORTED_FILE_TYPES: Record<string, string> = {
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/csv': 'csv',
  'application/json': 'json',
  'text/markdown': 'md',
  'text/html': 'html',
  'text/xml': 'xml',
  'application/xml': 'xml',
  'application/rtf': 'rtf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const TEXT_MIME_TYPES = new Set([
  'text/plain', 'text/csv', 'application/json', 'text/markdown',
  'text/html', 'text/xml', 'application/xml', 'application/rtf'
]);

const GEMINI_INLINE_TYPES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
]);

export async function extractTextFromFile(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
  if (TEXT_MIME_TYPES.has(mimeType)) {
    return fileBuffer.toString('utf-8');
  }
  return `__BINARY_FILE__`;
}

export async function analyzeDocument(
  fileContent: string,
  filename: string,
  analysisType: string = 'general',
  conversationHistory: Array<{role: string, content: string}> = [],
  fileBuffer?: Buffer,
  mimeType?: string,
  tier?: string
): Promise<string> {

  let analysisPrompt = '';
  switch (analysisType) {
    case 'summary':
      analysisPrompt = `Provide a clear, detailed summary of this document "${filename}". Focus on key points, main ideas, and important details.`;
      break;
    case 'questions':
      analysisPrompt = `Analyze this document "${filename}" and generate 5-10 important questions that could be answered based on its content.`;
      break;
    case 'insights':
      analysisPrompt = `Analyze this document "${filename}" and provide key insights, patterns, trends, or important findings. Be thorough.`;
      break;
    case 'extract':
      analysisPrompt = `Extract all important information from this document "${filename}". Organize it clearly with headings and bullet points.`;
      break;
    default:
      analysisPrompt = `Analyze this document "${filename}" thoroughly. Provide a comprehensive overview of its content, key points, structure, and any important details.`;
  }

  const isBinary = fileContent === '__BINARY_FILE__' && fileBuffer && mimeType;

  // PDFs: prefer Claude native document reading (stronger reasoning over the
  // document). This runs BEFORE the Gemini key check so a missing Gemini key
  // doesn't block the Claude path; Gemini is only the fallback.
  if (isBinary && mimeType === 'application/pdf') {
    try {
      return await analyzeWithClaudeInline(analysisPrompt, fileBuffer!, mimeType!, conversationHistory, tier);
    } catch (e: any) {
      console.log(`[DocAnalysis] Claude PDF path failed (${e?.message || e}); falling back to Gemini.`);
    }
  }

  // Everything else (and the PDF fallback) uses Gemini, which needs its key.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Document analysis is not configured. Please try again later.");
  }

  if (isBinary && GEMINI_INLINE_TYPES.has(mimeType!)) {
    return await analyzeWithGeminiInline(analysisPrompt, fileBuffer!, mimeType!, apiKey, conversationHistory);
  }

  const truncatedContent = fileContent.length > 30000
    ? fileContent.substring(0, 30000) + '\n\n[Content truncated - showing first 30,000 characters]'
    : fileContent;

  const fullPrompt = `${analysisPrompt}\n\nDocument Content:\n${truncatedContent}`;

  return await callGeminiForDoc(fullPrompt, apiKey);
}

async function analyzeWithGeminiInline(
  prompt: string,
  fileBuffer: Buffer,
  mimeType: string,
  apiKey: string,
  conversationHistory: Array<{role: string, content: string}> = []
): Promise<string> {
  const base64Data = fileBuffer.toString('base64');

  const contextParts = conversationHistory.length > 0
    ? `\n\nRecent conversation context:\n${conversationHistory.slice(-2).map(m => `${m.role}: ${m.content.slice(0, 300)}`).join('\n')}\n\n`
    : '';

  const requestBody = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        },
        {
          text: `${contextParts}${prompt}\n\nIMPORTANT: Read and analyze the ACTUAL content of this uploaded file. Extract real text, data, and information from it. Do NOT say you cannot read it.`
        }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
    }
  };

  const models = ['gemini-2.0-flash', 'gemini-2.5-flash'];

  for (const model of models) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );
      clearTimeout(timeout);

      if (response.status === 429 || response.status === 503) {
        console.log(`[DocAnalysis] ${model} unavailable (${response.status}), trying next...`);
        continue;
      }

      const data = await response.json();
      if (data.error) {
        console.error(`[DocAnalysis] ${model} error:`, data.error.message);
        continue;
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      console.log(`[DocAnalysis] ${model} inline analysis completed in ${Date.now() - start}ms`);
      return content;
    } catch (error: any) {
      console.log(`[DocAnalysis] ${model} failed: ${error.message}`);
      continue;
    }
  }

  throw new Error('Document analysis temporarily unavailable. Please try again.');
}

// Pick the Claude model by the user's tier so PDF cost matches the rest of the
// stack (free = Haiku, pro = Sonnet 4, research/enterprise/owner = Sonnet 4.5).
function claudeModelsForTier(tier?: string): string[] {
  const t = (tier || 'free').toLowerCase();
  if (t === 'pro') return ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'];
  if (['research', 'enterprise', 'owner'].includes(t)) return ['claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514'];
  return ['claude-3-5-haiku-20241022', 'claude-sonnet-4-20250514'];
}

async function analyzeWithClaudeInline(
  prompt: string,
  fileBuffer: Buffer,
  mimeType: string,
  conversationHistory: Array<{role: string, content: string}> = [],
  tier?: string
): Promise<string> {
  const key = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const base = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!key) throw new Error('Anthropic API key not configured');

  const base64Data = fileBuffer.toString('base64');
  const contextParts = conversationHistory.length > 0
    ? `Recent conversation context:\n${conversationHistory.slice(-2).map(m => `${m.role}: ${m.content.slice(0, 300)}`).join('\n')}\n\n`
    : '';
  const userText = `${contextParts}${prompt}\n\nRead and analyze the ACTUAL content of the attached PDF. Use real text, data, and figures from it. Answer in plain text — no markdown, no asterisks for bold or italic, no headings, no backticks.`;

  const models = claudeModelsForTier(tier);
  for (const model of models) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const res = await fetch(`${base.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64Data } },
              { type: 'text', text: userText },
            ],
          }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`[DocAnalysis] Claude ${model} error ${res.status}: ${errText.slice(0, 200)}`);
        if (res.status === 401 || res.status === 403) break;
        continue;
      }
      const data: any = await res.json();
      const text = data?.content?.find((b: any) => b.type === 'text')?.text || data?.content?.[0]?.text;
      if (text && String(text).trim()) {
        console.log(`[DocAnalysis] Claude ${model} PDF analysis completed in ${Date.now() - start}ms`);
        return String(text);
      }
    } catch (error: any) {
      console.log(`[DocAnalysis] Claude ${model} failed: ${error.message}`);
      continue;
    }
  }
  throw new Error('Claude PDF analysis unavailable.');
}

async function callGeminiForDoc(prompt: string, apiKey: string): Promise<string> {
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8000 }
  });

  const models = ['gemini-2.0-flash', 'gemini-2.5-flash'];

  for (const model of models) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        }
      );
      clearTimeout(timeout);

      if (response.status === 429 || response.status === 503) continue;

      const data = await response.json();
      if (data.error) continue;

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      console.log(`[DocAnalysis] ${model} text analysis completed in ${Date.now() - start}ms`);
      return content;
    } catch (error: any) {
      continue;
    }
  }

  throw new Error('Document analysis temporarily unavailable. Please try again.');
}

export function validateFile(fileSize: number, mimeType: string, isPremiumUser: boolean = false): { valid: boolean; error?: string } {
  // Premium users (Pro, Research, Enterprise, beta testers, referral-Pro grant) get 50MB.
  // Free users are capped at 20MB.
  const maxSize = (isPremiumUser ? 50 : 20) * 1024 * 1024;
  if (fileSize > maxSize) {
    const limitLabel = isPremiumUser ? '50MB' : '20MB';
    return { valid: false, error: `File size must be less than ${limitLabel}` };
  }

  if (!SUPPORTED_FILE_TYPES[mimeType]) {
    const supportedTypes = Object.values(SUPPORTED_FILE_TYPES).join(', ');
    return { valid: false, error: `Unsupported file type. Supported types: ${supportedTypes}` };
  }

  return { valid: true };
}

export function getAnalysisOptions() {
  return [
    { value: 'general', label: 'General Analysis', description: 'Complete document overview and key points' },
    { value: 'summary', label: 'Summary', description: 'Concise summary of main ideas' },
    { value: 'questions', label: 'Generate Questions', description: 'Create questions based on content' },
    { value: 'insights', label: 'Key Insights', description: 'Extract patterns and important findings' },
    { value: 'extract', label: 'Extract Information', description: 'Organize key information clearly' }
  ];
}
