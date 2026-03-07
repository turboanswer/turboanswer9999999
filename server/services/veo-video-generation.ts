// Veo video generation via Google Generative AI REST API
// Veo 3.1 always generates audio automatically — no separate audio parameter needed.
// Audio is described in the prompt text itself.

const VEO_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Try 3.1 standard first, then fast variant — both generate audio automatically
const VEO_MODELS = ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'];

export interface VeoJobResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoFileId?: string;   // use /api/video/file/:id to stream
  videoDataUrl?: string;  // kept for compatibility but prefer fileId
  model?: string;
  error?: string;
}

// In-memory job store (TTL 30 minutes)
const jobs = new Map<string, { operationName: string; model: string; hasAudio: boolean; createdAt: number }>();

// Completed video file store — maps fileId → base64 buffer (TTL 2 hours)
export const videoFiles = new Map<string, { buffer: Buffer; model: string; createdAt: number }>();

function cleanOldVideoFiles() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, file] of videoFiles.entries()) {
    if (file.createdAt < cutoff) videoFiles.delete(id);
  }
}

function makeJobId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function startVeoGeneration(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  durationSeconds: 5 | 8;
}): Promise<{ jobId: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  let lastError: string = 'All Veo models failed';

  for (const model of VEO_MODELS) {
    try {
      const url = `${VEO_BASE}/models/${model}:predictLongRunning?key=${apiKey}`;
      // Veo 3.1 REST API — audio is automatic, described via prompt text
      const body = {
        instances: [{ prompt: params.prompt }],
        parameters: {
          aspectRatio: params.aspectRatio,
          durationSeconds: params.durationSeconds,
          sampleCount: 1,
        },
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!resp.ok) {
        const text = await resp.text();
        lastError = `${model}: HTTP ${resp.status} — ${text.slice(0, 300)}`;
        console.warn(`[Veo] ${model} failed (${resp.status}):`, text.slice(0, 300));
        continue;
      }

      const data: any = await resp.json();
      const operationName: string = data.name;
      if (!operationName) {
        lastError = `${model}: no operation name in response`;
        continue;
      }

      const jobId = makeJobId();
      jobs.set(jobId, { operationName, model, hasAudio: true, createdAt: Date.now() });
      cleanOldJobs();
      console.log(`[Veo] Started job ${jobId} with ${model}`);
      return { jobId, model };
    } catch (e: any) {
      lastError = `${model}: ${e.message}`;
      console.warn(`[Veo] ${model} exception:`, e.message);
    }
  }

  throw new Error(lastError);
}

export async function pollVeoStatus(jobId: string): Promise<VeoJobResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { status: 'failed', error: 'GEMINI_API_KEY not configured' };

  const job = jobs.get(jobId);
  if (!job) return { status: 'failed', error: 'Job not found or expired' };

  try {
    const url = `${VEO_BASE}/${job.operationName}?key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!resp.ok) {
      const text = await resp.text();
      return { status: 'failed', error: `Poll error: ${text.slice(0, 200)}` };
    }

    const data: any = await resp.json();

    if (!data.done) {
      return { status: 'processing', model: job.model };
    }

    if (data.error) {
      jobs.delete(jobId);
      return { status: 'failed', error: data.error.message || 'Generation failed', model: job.model };
    }

    // Extract video from response — Veo returns base64 in bytesBase64Encoded or a URI
    const samples =
      data.response?.generateVideoResponse?.generatedSamples ||
      data.response?.generatedSamples ||
      [];

    console.log('[Veo] Response keys:', JSON.stringify(Object.keys(data.response || {})));
    console.log('[Veo] Sample count:', samples.length);
    if (samples.length > 0) {
      console.log('[Veo] Sample video keys:', JSON.stringify(Object.keys(samples[0]?.video || {})));
    }

    if (!samples.length) {
      jobs.delete(jobId);
      return { status: 'failed', error: 'No video samples in response', model: job.model };
    }

    const videoObj = samples[0]?.video || {};

    // Priority: bytesBase64Encoded > uri (fetch if HTTPS) > fail
    let videoDataUrl: string | null = null;

    if (videoObj.bytesBase64Encoded) {
      // Direct base64 MP4 data from the API
      videoDataUrl = `data:video/mp4;base64,${videoObj.bytesBase64Encoded}`;
    } else if (videoObj.uri) {
      const uri: string = videoObj.uri;
      if (uri.startsWith('data:')) {
        videoDataUrl = uri;
      } else if (uri.startsWith('https://')) {
        // Fetch the video bytes from the HTTPS URI
        console.log('[Veo] Fetching video from HTTPS URI...');
        const apiKey = process.env.GEMINI_API_KEY!;
        const videoResp = await fetch(`${uri}${uri.includes('?') ? '&' : '?'}key=${apiKey}`, {
          signal: AbortSignal.timeout(60000),
        });
        if (!videoResp.ok) {
          jobs.delete(jobId);
          return { status: 'failed', error: `Failed to fetch video bytes: ${videoResp.status}`, model: job.model };
        }
        const buffer = await videoResp.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        videoDataUrl = `data:video/mp4;base64,${base64}`;
      } else {
        jobs.delete(jobId);
        return { status: 'failed', error: `Unsupported video URI format: ${uri.slice(0, 60)}`, model: job.model };
      }
    }

    if (!videoDataUrl) {
      jobs.delete(jobId);
      return { status: 'failed', error: 'No video data found in response', model: job.model };
    }

    // Store video buffer server-side — return a file ID so the frontend can stream it
    const base64Data = videoDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const videoFileId = makeJobId();
    videoFiles.set(videoFileId, { buffer, model: job.model, createdAt: Date.now() });
    cleanOldVideoFiles();

    jobs.delete(jobId);
    return { status: 'completed', videoFileId, model: job.model, hasAudio: job.hasAudio };
  } catch (e: any) {
    return { status: 'failed', error: e.message, model: job.model };
  }
}

function cleanOldJobs() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}
