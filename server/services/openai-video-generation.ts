// Video generation via OpenAI Sora (sora-2).
// Docs: https://developers.openai.com/api/docs/guides/video-generation
// Async job flow: POST /v1/videos -> poll GET /v1/videos/{id} -> download GET /v1/videos/{id}/content
// Completed MP4 bytes are stored in the SAME in-memory videoFiles map used by the
// Luma service so the existing /api/video/file/:fileId route can stream either provider.

import { videoFiles } from './luma-video-generation';

const OPENAI_BASE = 'https://api.openai.com/v1';
const MODEL = 'sora-2';
const MODEL_LABEL = 'Matrix Video';

export interface SoraJobResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoFileId?: string;
  model?: string;
  hasAudio?: boolean;
  error?: string;
}

const jobs = new Map<string, { videoId: string; createdAt: number }>();

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

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Sora accepts portrait/landscape sizes. Map the studio's aspect ratio to a supported size.
function sizeForAspect(aspectRatio: string): string {
  return aspectRatio === '9:16' ? '720x1280' : '1280x720';
}

// Sora durations are strings: "4" | "8" | "12". Clamp the requested seconds to the nearest.
function secondsFor(durationSeconds: number): string {
  if (durationSeconds >= 12) return '12';
  if (durationSeconds >= 8) return '8';
  return '4';
}

export async function startSoraGeneration(params: {
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
}): Promise<{ jobId: string; model: string; hasAudio: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const form = new FormData();
  form.append('model', MODEL);
  form.append('prompt', params.prompt);
  form.append('size', sizeForAspect(params.aspectRatio));
  form.append('seconds', secondsFor(params.durationSeconds));

  const resp = await fetch(`${OPENAI_BASE}/videos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.warn(`[Sora] start failed (${resp.status}):`, text.slice(0, 300));
    throw new Error(`OpenAI video API error (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data: any = await resp.json();
  const videoId: string | undefined = data.id;
  if (!videoId) throw new Error('Sora: no video id in response');

  const jobId = 'sora_' + makeId();
  jobs.set(jobId, { videoId, createdAt: Date.now() });
  cleanOldJobs();
  console.log(`[Sora] Started job ${jobId} (video ${videoId})`);
  return { jobId, model: MODEL_LABEL, hasAudio: true };
}

export async function pollSoraStatus(jobId: string): Promise<SoraJobResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { status: 'failed', error: 'OPENAI_API_KEY not configured' };

  const job = jobs.get(jobId);
  if (!job) return { status: 'failed', error: 'Job not found or expired' };

  try {
    const resp = await fetch(`${OPENAI_BASE}/videos/${job.videoId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { status: 'failed', error: `Poll error: ${text.slice(0, 200)}`, model: MODEL_LABEL };
    }

    const data: any = await resp.json();
    const state: string = data.status; // queued | in_progress | completed | failed

    if (state === 'failed') {
      jobs.delete(jobId);
      return {
        status: 'failed',
        error: data.error?.message || 'Generation failed',
        model: MODEL_LABEL,
      };
    }

    if (state !== 'completed') {
      return { status: 'processing', model: MODEL_LABEL };
    }

    // Completed — download the MP4 bytes.
    console.log('[Sora] Downloading finished video content...');
    const contentResp = await fetch(`${OPENAI_BASE}/videos/${job.videoId}/content`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(60000),
    });

    if (!contentResp.ok) {
      const text = await contentResp.text();
      jobs.delete(jobId);
      return {
        status: 'failed',
        error: `Failed to download video (${contentResp.status}): ${text.slice(0, 160)}`,
        model: MODEL_LABEL,
      };
    }

    const buffer = Buffer.from(await contentResp.arrayBuffer());

    const videoFileId = makeId();
    videoFiles.set(videoFileId, { buffer, model: MODEL_LABEL, createdAt: Date.now() });
    cleanOldVideoFiles();

    jobs.delete(jobId);
    return {
      status: 'completed',
      videoFileId,
      model: MODEL_LABEL,
      hasAudio: true,
    };
  } catch (e: any) {
    return { status: 'failed', error: e.message, model: MODEL_LABEL };
  }
}
