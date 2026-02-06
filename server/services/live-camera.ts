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
    // Check for available AI services
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasGemini && !hasOpenAI && !hasAnthropic) {
      throw new Error("No AI API keys configured for visual analysis");
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

    let analysis: string;
    
    // Try Gemini first for best vision capabilities
    if (hasGemini) {
      analysis = await analyzeWithGemini(imageData, systemPrompt);
    } else if (hasOpenAI) {
      analysis = await analyzeWithOpenAI(imageData, systemPrompt);
    } else if (hasAnthropic) {
      analysis = await analyzeWithAnthropic(imageData, systemPrompt);
    } else {
      throw new Error("No suitable AI service available for vision analysis");
    }
    
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

// Gemini Vision Analysis
async function analyzeWithGemini(imageData: string, prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");
  
  try {
    // Remove data URL prefix
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300, // Concise responses for live feed
          topP: 0.8,
          topK: 40
        }
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('[Gemini Vision] Error:', data.error);
      throw new Error(`Gemini Vision Error: ${data.error.message}`);
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content received from Gemini Vision');
    }
    
    return content;
    
  } catch (error) {
    console.error('[Gemini Vision] Error:', error);
    throw error;
  }
}

// OpenAI Vision Analysis
async function analyzeWithOpenAI(imageData: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4 with vision
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.4
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('[OpenAI Vision] Error:', data.error);
      throw new Error(`OpenAI Vision Error: ${data.error.message}`);
    }
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from OpenAI Vision');
    }
    
    return content;
    
  } catch (error) {
    console.error('[OpenAI Vision] Error:', error);
    throw error;
  }
}

// Anthropic Vision Analysis (Claude 3)
async function analyzeWithAnthropic(imageData: string, prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key not configured");
  
  try {
    // Remove data URL prefix and get mime type
    const matches = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,(.*)$/);
    if (!matches) throw new Error('Invalid image data format');
    
    const mimeType = matches[1];
    const base64Image = matches[2];
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('[Anthropic Vision] Error:', data.error);
      throw new Error(`Anthropic Vision Error: ${data.error.message}`);
    }
    
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('No content received from Anthropic Vision');
    }
    
    return content;
    
  } catch (error) {
    console.error('[Anthropic Vision] Error:', error);
    throw error;
  }
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