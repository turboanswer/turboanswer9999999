/**
 * Live Camera AI Analysis Service
 * Provides real-time visual analysis with multi-language support
 */

interface LiveCameraAnalysisRequest {
  imageData: string;
  question: string;
  language: string;
  context?: string;
}

interface LiveCameraAnalysisResponse {
  analysis: string;
  confidence: number;
  timestamp: number;
}

// Enhanced live camera analysis with multi-language support
export async function analyzeLiveCamera(request: LiveCameraAnalysisRequest): Promise<LiveCameraAnalysisResponse> {
  const { imageData, question, language, context } = request;
  
  try {
    // Claude-only: the live-camera engine uses Claude vision exclusively.
    const hasClaude = !!(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);
    if (!hasClaude) {
      throw new Error("AI_ENGINE_UNAVAILABLE: Claude vision is not configured for live camera analysis.");
    }
    
    // Language-specific instructions
    const languageInstructions = {
      en: "Analyze this live camera feed and respond in English.",
      es: "Analiza esta transmisión de cámara en vivo y responde en español.",
      fr: "Analysez ce flux de caméra en direct et répondez en français.",
      de: "Analysieren Sie diesen Live-Kamera-Feed und antworten Sie auf Deutsch.",
      it: "Analizza questo feed della telecamera dal vivo e rispondi in italiano.",
      pt: "Analise este feed de câmera ao vivo e responda em português.",
      ja: "このライブカメラフィードを分析し、日本語で回答してください。",
      ko: "이 라이브 카메라 피드를 분석하고 한국어로 응답하세요.",
      zh: "分析这个实时摄像头画面并用中文回答。"
    };
    
    const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;
    
    // Build analysis prompt
    const systemPrompt = `You are Turbo Vision, an advanced AI assistant with real-time visual analysis capabilities. ${langInstruction}

LIVE ANALYSIS GUIDELINES:
- Provide immediate, accurate descriptions of what you see
- Focus on the most important and interesting elements
- Be conversational and engaging
- Answer specific questions about the visual content
- Consider the previous context if provided
- Keep responses concise but informative (2-4 sentences)
- Respond in ${language.toUpperCase()} language

${context ? `PREVIOUS CONTEXT: ${context}` : ''}

USER QUESTION: ${question}

Analyze the live camera feed and provide a helpful response.`;

    // Claude only — no fallback to any other provider.
    const analysis = await analyzeWithClaude(imageData, systemPrompt);

    return {
      analysis,
      confidence: 0.9,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('[Live Camera] Analysis error:', error);
    throw error;
  }
}

// Claude Vision Analysis — the only vision provider for live camera.
async function analyzeWithClaude(imageData: string, prompt: string): Promise<string> {
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const base = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!apiKey) throw new Error("AI_ENGINE_UNAVAILABLE: Anthropic API key not configured");

  // Remove data URL prefix and get mime type
  const matches = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)$/);
  if (!matches) throw new Error('Invalid image data format');

  const mimeType = matches[1];
  const base64Image = matches[2];

  const models = ['claude-sonnet-4-5-20250929', 'claude-3-5-haiku-20241022'];
  for (const model of models) {
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          temperature: 0.4,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mimeType, data: base64Image }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[Claude Vision] ${model} error ${response.status}: ${errText.slice(0, 200)}`);
        if (response.status === 401 || response.status === 403) break;
        continue;
      }

      const data: any = await response.json();
      const content = data?.content?.find((b: any) => b.type === 'text')?.text || data?.content?.[0]?.text;
      if (content && String(content).trim()) return String(content);
    } catch (error) {
      console.error(`[Claude Vision] ${model} threw:`, error);
    }
  }

  // Fail loud — no fallback to any other provider.
  throw new Error('AI_ENGINE_UNAVAILABLE: Claude vision is unavailable for live camera analysis.');
}

// Real-time object detection and tracking
export async function detectObjects(imageData: string): Promise<any[]> {
  // Simplified object detection using AI vision
  try {
    const analysis = await analyzeLiveCamera({
      imageData,
      question: "List all objects and people you can see in this image. Be specific about their positions and actions.",
      language: "en"
    });
    
    // Parse objects from the analysis
    // This is a simplified implementation - in production you might use dedicated object detection APIs
    return [{
      type: 'analysis',
      description: analysis.analysis,
      confidence: analysis.confidence,
      timestamp: analysis.timestamp
    }];
    
  } catch (error) {
    console.error('[Object Detection] Error:', error);
    return [];
  }
}

// Scene understanding and context building
export async function buildSceneContext(recentAnalyses: string[]): Promise<string> {
  if (recentAnalyses.length === 0) return '';
  
  // Build context from recent analyses
  const context = recentAnalyses.slice(-3).join(' ');
  
  return `Recent scene context: ${context}`;
}