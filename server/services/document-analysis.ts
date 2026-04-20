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
  mimeType?: string
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const isBinary = fileContent === '__BINARY_FILE__' && fileBuffer && mimeType;

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
