const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface DiagnosisResult {
  problem: string;
  severity: number;
  category: string;
  possibleCauses: string[];
  immediateActions: string[];
  isEmergency: boolean;
  needsProfessional: boolean;
  fullAnalysis: string;
}

export async function diagnoseImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<DiagnosisResult> {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const prompt = `You are an expert diagnostic AI. Analyze this image of a real-world problem (plumbing, electrical, appliance, structural, automotive, etc.) and provide a structured diagnostic report.

Return your response as valid JSON with exactly this structure:
{
  "problem": "Brief description of the identified problem",
  "severity": <number 1-5 where 1=minor, 2=moderate, 3=significant, 4=serious, 5=critical>,
  "category": "<one of: plumbing, electrical, appliance, structural, automotive, hvac, roofing, landscaping, pest, general>",
  "possibleCauses": ["cause 1", "cause 2", "cause 3"],
  "immediateActions": ["action 1", "action 2", "action 3"],
  "isEmergency": <true if severity >= 4 or poses immediate safety risk>,
  "needsProfessional": <true if professional help is recommended>,
  "fullAnalysis": "Detailed paragraph explaining the diagnosis, what you see, potential risks, and recommended course of action"
}

Be thorough and practical. If the image doesn't show a clear problem, still provide your best assessment of what you see and any maintenance recommendations.`;

  const requestBody = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        },
        { text: prompt }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4000,
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
        console.log(`[SmartDiagnosis] ${model} unavailable (${response.status}), trying next...`);
        continue;
      }

      const data = await response.json();
      if (data.error) {
        console.error(`[SmartDiagnosis] ${model} error:`, data.error.message);
        continue;
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      console.log(`[SmartDiagnosis] ${model} completed in ${Date.now() - start}ms`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse diagnosis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        problem: parsed.problem || 'Unable to identify specific problem',
        severity: Math.min(5, Math.max(1, Number(parsed.severity) || 3)),
        category: parsed.category || 'general',
        possibleCauses: Array.isArray(parsed.possibleCauses) ? parsed.possibleCauses : [],
        immediateActions: Array.isArray(parsed.immediateActions) ? parsed.immediateActions : [],
        isEmergency: Boolean(parsed.isEmergency),
        needsProfessional: Boolean(parsed.needsProfessional),
        fullAnalysis: parsed.fullAnalysis || content,
      };
    } catch (error: any) {
      if (error.message === 'Failed to parse diagnosis response') throw error;
      console.log(`[SmartDiagnosis] ${model} failed: ${error.message}`);
      continue;
    }
  }

  throw new Error('Smart diagnosis temporarily unavailable. Please try again.');
}
