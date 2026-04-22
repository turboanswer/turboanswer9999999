// Luma Dream Machine video generation
// Docs: https://docs.lumalabs.ai/docs/api

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';
const LUMA_MODEL = 'ray-2';

export interface LumaJobResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoFileId?: string;
  videoDataUrl?: string;
  model?: string;
  hasAudio?: boolean;
  error?: string;
}

const jobs = new Map<string, { generationId: string; createdAt: number }>();
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
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new Error('LUMA_API_KEY not configured');

  // Luma supports "5s" and "9s" durations
  const duration = params.durationSeconds <= 5 ? '5s' : '9s';

  const body = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
    model: LUMA_MODEL,
    resolution: '720p',
    duration,
    loop: false,
  };

  const resp = await fetch(`${LUMA_BASE}/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.warn(`[Luma] start failed (${resp.status}):`, text.slice(0, 300));
    throw new Error(`Luma API error (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data: any = await resp.json();
  const generationId: string | undefined = data.id;
  if (!generationId) throw new Error('Luma: no generation id in response');

  const jobId = makeJobId();
  jobs.set(jobId, { generationId, createdAt: Date.now() });
  cleanOldJobs();
  console.log(`[Luma] Started job ${jobId} (generation ${generationId})`);
  return { jobId, model: `Luma ${LUMA_MODEL}` };
}

export async function pollLumaStatus(jobId: string): Promise<LumaJobResult> {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) return { status: 'failed', error: 'LUMA_API_KEY not configured' };

  const job = jobs.get(jobId);
  if (!job) return { status: 'failed', error: 'Job not found or expired' };

  try {
    const resp = await fetch(`${LUMA_BASE}/generations/${job.generationId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { status: 'failed', error: `Poll error: ${text.slice(0, 200)}`, model: `Luma ${LUMA_MODEL}` };
    }

    const data: any = await resp.json();
    const state: string = data.state;

    if (state === 'failed') {
      jobs.delete(jobId);
      return {
        status: 'failed',
        error: data.failure_reason || 'Generation failed',
        model: `Luma ${LUMA_MODEL}`,
      };
    }

    if (state !== 'completed') {
      // queued | dreaming | processing
      return { status: 'processing', model: `Luma ${LUMA_MODEL}` };
    }

    const videoUrl: string | undefined = data.assets?.video;
    if (!videoUrl) {
      jobs.delete(jobId);
      return { status: 'failed', error: 'No video URL in response', model: `Luma ${LUMA_MODEL}` };
    }

    console.log('[Luma] Fetching video bytes from CDN...');
    const videoResp = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    if (!videoResp.ok) {
      jobs.delete(jobId);
      return {
        status: 'failed',
        error: `Failed to fetch video bytes: ${videoResp.status}`,
        model: `Luma ${LUMA_MODEL}`,
      };
    }
    const buffer = Buffer.from(await videoResp.arrayBuffer());

    const videoFileId = makeJobId();
    videoFiles.set(videoFileId, { buffer, model: `Luma ${LUMA_MODEL}`, createdAt: Date.now() });
    cleanOldVideoFiles();

    jobs.delete(jobId);
    return {
      status: 'completed',
      videoFileId,
      model: `Luma ${LUMA_MODEL}`,
      hasAudio: false,
    };
  } catch (e: any) {
    return { status: 'failed', error: e.message, model: `Luma ${LUMA_MODEL}` };
  }
}
