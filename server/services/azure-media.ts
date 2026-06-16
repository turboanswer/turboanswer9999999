// Azure-billed image generation and text-to-speech via Foundry deployments.
// Foundry endpoints use OpenAI-compatible /openai/v1/* shape with the
// deployment name passed as `model` in the body.

function azureBase(): { key: string; ep: string } | null {
  const key = process.env.AZURE_OPENAI_API_KEY;
  const ep = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, "");
  if (!key || !ep) return null;
  return { key, ep };
}

function isFoundry(ep: string): boolean {
  return ep.includes("services.ai.azure.com");
}

// Azure's in-house image model (Microsoft MAI image). GPT/DALL-E image models
// were removed — image generation runs on MAI here, with a free Pollinations
// fallback handled by the callers. Override the deployment name with
// AZURE_DEPLOYMENT_IMAGE if it's named differently on the Azure resource.
const IMAGE_DEPLOYMENT =
  process.env.AZURE_DEPLOYMENT_IMAGE || "MAI-Image";
const TTS_DEPLOYMENT =
  process.env.AZURE_DEPLOYMENT_TTS || "gpt-audio-2";

/**
 * Generate an image via Azure Foundry's MAI image deployment.
 * Returns a data URL ("data:image/png;base64,...") or null on failure.
 */
export async function azureGenerateImage(
  prompt: string,
  size: "1024x1024" | "1024x1536" | "1536x1024" = "1024x1024",
): Promise<string | null> {
  const cfg = azureBase();
  if (!cfg) return null;
  const url = isFoundry(cfg.ep)
    ? `${cfg.ep}/openai/v1/images/generations`
    : `${cfg.ep}/openai/deployments/${encodeURIComponent(IMAGE_DEPLOYMENT)}/images/generations?api-version=2024-10-21`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: IMAGE_DEPLOYMENT,
        prompt,
        n: 1,
        size,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(
        `[AzureImage] ${IMAGE_DEPLOYMENT} HTTP ${res.status}: ${txt.slice(0, 200)}`,
      );
      return null;
    }
    const data: any = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (b64) return `data:image/png;base64,${b64}`;
    const remote = data?.data?.[0]?.url;
    if (remote) return remote;
    return null;
  } catch (err: any) {
    console.warn(`[AzureImage] failed: ${err?.message || err}`);
    return null;
  }
}

/**
 * Convert text to speech via Azure Foundry's gpt-audio deployment.
 * Returns a data URL ("data:audio/mp3;base64,...") or null on failure.
 */
export async function azureSpeak(
  text: string,
  voice:
    | "alloy"
    | "echo"
    | "fable"
    | "onyx"
    | "nova"
    | "shimmer" = "nova",
): Promise<string | null> {
  const cfg = azureBase();
  if (!cfg) return null;
  const url = isFoundry(cfg.ep)
    ? `${cfg.ep}/openai/v1/audio/speech`
    : `${cfg.ep}/openai/deployments/${encodeURIComponent(TTS_DEPLOYMENT)}/audio/speech?api-version=2024-10-21`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: TTS_DEPLOYMENT,
        input: text,
        voice,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn(
        `[AzureTTS] ${TTS_DEPLOYMENT} HTTP ${res.status}: ${txt.slice(0, 200)}`,
      );
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:audio/mp3;base64,${buf.toString("base64")}`;
  } catch (err: any) {
    console.warn(`[AzureTTS] failed: ${err?.message || err}`);
    return null;
  }
}
