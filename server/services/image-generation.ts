// Centralized image generation. Provider order:
//   1. OpenAI DALL·E 3 (high quality, primary) — uses OPENAI_API_KEY.
//   2. Azure Foundry MAI image — ONLY when AZURE_DEPLOYMENT_IMAGE is explicitly
//      set. The old hardcoded "MAI-Image" deployment does not exist on the
//      resource (404s), so by default we no longer waste a round-trip on it.
//   3. Pollinations.ai flux (free, keyless) — last-resort fallback.
//
// Used by both /api/generate-image (Image Studio) and the chat-stream image
// backstop so provider behavior stays consistent in one place.

import OpenAI from "openai";
import { azureGenerateImage } from "./azure-media";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageQuality = "standard" | "hd";

export interface GenerateImagesResult {
  dataUrls: string[];
  provider: "openai" | "azure" | "pollinations" | "none";
}

function openaiKey(): string | null {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    null
  );
}

// DALL·E 3 only accepts 1024x1024, 1024x1792, 1792x1024.
function dalleSize(size: ImageSize): "1024x1024" | "1024x1792" | "1792x1024" {
  if (size === "1024x1536") return "1024x1792";
  if (size === "1536x1024") return "1792x1024";
  return "1024x1024";
}

export function parseSize(size: string): { width: number; height: number } {
  if (size === "1024x1536") return { width: 1024, height: 1536 };
  if (size === "1536x1024") return { width: 1536, height: 1024 };
  return { width: 1024, height: 1024 };
}

// Run up to `total` async tasks with a bounded concurrency to avoid
// rate-limit/timeout spikes when generating several images at once.
async function runPooled<T>(
  total: number,
  concurrency: number,
  fn: (i: number) => Promise<T>,
): Promise<T[]> {
  const out: T[] = new Array(total);
  let next = 0;
  async function worker() {
    while (next < total) {
      const i = next++;
      out[i] = await fn(i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), total) }, () =>
      worker(),
    ),
  );
  return out;
}

async function openaiGenerateOne(
  client: OpenAI,
  prompt: string,
  size: ImageSize,
  quality: ImageQuality,
): Promise<string | null> {
  try {
    const r = await client.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: dalleSize(size),
      quality,
      response_format: "b64_json",
    });
    const b64 = (r as any)?.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
    const url = (r as any)?.data?.[0]?.url;
    return typeof url === "string" ? url : null;
  } catch (err: any) {
    console.warn(`[OpenAIImage] dall-e-3 failed: ${err?.message || err}`);
    return null;
  }
}

async function pollinationsOne(
  prompt: string,
  width: number,
  height: number,
  seed: number,
): Promise<string | null> {
  try {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&enhance=true&seed=${seed}&model=flux`;
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) {
      console.error(`[Image] Pollinations returned ${res.status}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "image/jpeg";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch (err: any) {
    console.error("[Image] Pollinations failed:", err?.message || err);
    return null;
  }
}

export async function generateImages(
  prompt: string,
  opts: { size?: ImageSize; count?: number; quality?: ImageQuality } = {},
): Promise<GenerateImagesResult> {
  const size = opts.size ?? "1024x1024";
  const count = Math.min(Math.max(1, Number(opts.count) || 1), 6);
  const quality = opts.quality ?? "standard";

  // 1. OpenAI DALL·E 3 (primary, high quality)
  const key = openaiKey();
  if (key) {
    try {
      const client = new OpenAI({ apiKey: key });
      const results = await runPooled(count, 3, () =>
        openaiGenerateOne(client, prompt, size, quality),
      );
      const ok = results.filter((r): r is string => !!r);
      if (ok.length) return { dataUrls: ok, provider: "openai" };
    } catch (err: any) {
      console.warn(`[Image] OpenAI provider error: ${err?.message || err}`);
    }
  }

  // 2. Azure MAI image (only if a deployment name is explicitly configured)
  if (process.env.AZURE_DEPLOYMENT_IMAGE) {
    const azSize: ImageSize =
      size === "1024x1536" || size === "1536x1024" ? size : "1024x1024";
    const results = await Promise.all(
      Array.from({ length: count }, () => azureGenerateImage(prompt, azSize)),
    );
    const ok = results.filter((r): r is string => !!r);
    if (ok.length) return { dataUrls: ok, provider: "azure" };
  }

  // 3. Pollinations fallback (free, keyless)
  const { width, height } = parseSize(size);
  const baseSeed = Math.floor(Math.random() * 1_000_000);
  const results = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      pollinationsOne(prompt, width, height, baseSeed + i),
    ),
  );
  const ok = results.filter((r): r is string => !!r);
  if (ok.length) return { dataUrls: ok, provider: "pollinations" };

  return { dataUrls: [], provider: "none" };
}
