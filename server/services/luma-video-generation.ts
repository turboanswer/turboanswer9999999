// Video generation via Replicate (using Luma Ray-2 model)
// Docs: https://replicate.com/luma/ray
// Replicate gives us one API key for many video models — currently using Luma Ray-2.

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const MODEL_OWNER = 'luma';
const MODEL_NAME = 'ray';
const MODEL_LABEL = 'Luma Ray-2';

export interface LumaJobResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoFileId?: string;
  videoDataUrl?: string;
  model?: string;
  hasAudio?: boolean;
  error?: string;
}

const jobs = new Map<string, { predictionId: string; createdAt: number }>();
export const videoFiles = new Map<string, { buffer: Buffer; model: string; createdAt: number }>();

function cleanOldVideoFiles() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, file] of videoFiles.entries()) {
    if (file.createdAt < cutoff) videoFiles.delete(id);
  }
}

function cleanOldJobs() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}

function makeJobId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function startLumaGeneration(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  durationSeconds: 5 | 8;
}): Promise<{ jobId: string; model: string }> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) throw new Error('REPLICATE_API_TOKEN not configured');

  // Replicate's Luma Ray model accepts these inputs
  const input = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
    duration: params.durationSeconds <= 5 ? 5 : 9,
    loop: false,
  };

  const resp = await fetch(`${REPLICATE_BASE}/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'respond-async',
    },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.warn(`[Replicate] start failed (${resp.status}):`, text.slice(0, 300));
    throw new Error(`Replicate API error (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data: any = await resp.json();
  const predictionId: string | undefined = data.id;
  if (!predictionId) throw new Error('Replicate: no prediction id in response');

  const jobId = makeJobId();
  jobs.set(jobId, { predictionId, createdAt: Date.now() });
  cleanOldJobs();
  console.log(`[Replicate] Started job ${jobId} (prediction ${predictionId})`);
  return { jobId, model: MODEL_LABEL };
}

export async function pollLumaStatus(jobId: string): Promise<LumaJobResult> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) return { status: 'failed', error: 'REPLICATE_API_TOKEN not configured' };

  const job = jobs.get(jobId);
  if (!job) return { status: 'failed', error: 'Job not found or expired' };

  try {
    const resp = await fetch(`${REPLICATE_BASE}/predictions/${job.predictionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { status: 'failed', error: `Poll error: ${text.slice(0, 200)}`, model: MODEL_LABEL };
    }

    const data: any = await resp.json();
    const state: string = data.status; // starting | processing | succeeded | failed | canceled

    if (state === 'failed' || state === 'canceled') {
      jobs.delete(jobId);
      return {
        status: 'failed',
        error: data.error || 'Generation failed',
        model: MODEL_LABEL,
      };
    }

    if (state !== 'succeeded') {
      return { status: 'processing', model: MODEL_LABEL };
    }

    // output is either a URL string or an array of URLs
    let videoUrl: string | undefined;
    if (typeof data.output === 'string') videoUrl = data.output;
    else if (Array.isArray(data.output) && data.output.length > 0) videoUrl = data.output[0];

    if (!videoUrl) {
      jobs.delete(jobId);
      return { status: 'failed', error: 'No video URL in response', model: MODEL_LABEL };
    }

    console.log('[Replicate] Fetching video bytes from CDN...');
    const videoResp = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    if (!videoResp.ok) {
      jobs.delete(jobId);
      return {
        status: 'failed',
        error: `Failed to fetch video bytes: ${videoResp.status}`,
        model: MODEL_LABEL,
      };
    }
    const buffer = Buffer.from(await videoResp.arrayBuffer());

    const videoFileId = makeJobId();
    videoFiles.set(videoFileId, { buffer, model: MODEL_LABEL, createdAt: Date.now() });
    cleanOldVideoFiles();

    jobs.delete(jobId);
    return {
      status: 'completed',
      videoFileId,
      model: MODEL_LABEL,
      hasAudio: false,
    };
  } catch (e: any) {
    return { status: 'failed', error: e.message, model: MODEL_LABEL };
  }
}
