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
  // Claude-only: the diagnosis engine uses Claude vision exclusively.
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  const base = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  if (!apiKey) {
    throw new Error("AI_ENGINE_UNAVAILABLE: Anthropic API key not configured");
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

Be thorough and practical. If the image doesn't show a clear problem, still provide your best assessment of what you see and any maintenance recommendations. Respond with ONLY the JSON object, no other text.`;

  const models = ['claude-sonnet-4-5-20250929', 'claude-3-5-haiku-20241022'];

  for (const model of models) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${base.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          temperature: 0.2,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
              { type: 'text', text: prompt },
            ],
          }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[SmartDiagnosis] ${model} error ${response.status}: ${errText.slice(0, 200)}`);
        if (response.status === 401 || response.status === 403) break;
        continue;
      }

      const data: any = await response.json();
      const content = data?.content?.find((b: any) => b.type === 'text')?.text || data?.content?.[0]?.text;
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

  // Fail loud — no fallback to any other provider.
  throw new Error('AI_ENGINE_UNAVAILABLE: Claude diagnosis is unavailable.');
}
