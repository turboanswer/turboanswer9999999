import type { Express, Request, Response } from "express";
import { openai } from "./client";

async function generateWithPollinations(prompt: string, width: number, height: number, seed: number): Promise<string | null> {
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

function parseSize(size: string): { width: number; height: number } {
  if (size === "1024x1536") return { width: 1024, height: 1536 };
  if (size === "1536x1024") return { width: 1536, height: 1024 };
  return { width: 1024, height: 1024 };
}

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024", quality = "low", count = 4 } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const imageCount = Math.min(Math.max(1, Number(count) || 4), 10);
      const { width, height } = parseSize(size);
      const startTime = Date.now();

      // Primary: Pollinations.ai (free, no key, Flux model)
      const baseSeed = Math.floor(Math.random() * 1_000_000);
      const pollResults = await Promise.all(
        Array.from({ length: imageCount }, (_, i) =>
          generateWithPollinations(prompt, width, height, baseSeed + i)
        )
      );

      let images = pollResults
        .filter((r): r is string => r !== null)
        .map(b64 => ({ b64_json: b64.replace(/^data:image\/[^;]+;base64,/, ""), url: b64 }));

      // Fallback: OpenAI gpt-image-1 (only if Pollinations entirely failed and OpenAI has credits)
      if (images.length === 0) {
        console.log("[Image] Pollinations failed, falling back to OpenAI");
        try {
          const openaiResults = await Promise.all(
            Array.from({ length: imageCount }, () =>
              openai.images.generate({
                model: "gpt-image-1",
                prompt,
                n: 1,
                size: size as "1024x1024" | "1024x1536" | "1536x1024" | "auto",
                quality: quality as "low" | "medium" | "high",
              }).catch(err => {
                console.error("[Image] OpenAI fallback failed:", err.message);
                return null;
              })
            )
          );
          images = openaiResults
            .filter(r => r !== null)
            .map(r => ({ url: r!.data?.[0]?.url || "", b64_json: r!.data?.[0]?.b64_json || "" }));
        } catch (err: any) {
          console.error("[Image] OpenAI fallback threw:", err?.message);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Image] Generated ${images.length}/${imageCount} images in ${elapsed}ms (${width}x${height})`);

      if (images.length === 0) {
        return res.status(500).json({ error: "All image generation providers failed. Please try again." });
      }

      res.json({
        images,
        generationTime: elapsed,
        count: images.length,
      });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error?.message || "Failed to generate image" });
    }
  });
}
