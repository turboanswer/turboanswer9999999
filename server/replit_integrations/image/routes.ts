import type { Express, Request, Response } from "express";
import { azureSpeak } from "../../services/azure-media";
import { generateImages, type ImageSize } from "../../services/image-generation";
import { searchRealPhoto } from "../../services/image-search";

const VALID_SIZES: ImageSize[] = ["1024x1024", "1024x1536", "1536x1024"];

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024", count = 3, quality } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const normalizedSize: ImageSize = VALID_SIZES.includes(size)
        ? size
        : "1024x1024";
      const imageCount = Math.min(Math.max(1, Number(count) || 3), 6);
      const startTime = Date.now();

      // OpenAI DALL·E 3 (primary) → Azure (if configured) → Pollinations.
      const { dataUrls, provider } = await generateImages(prompt, {
        size: normalizedSize,
        count: imageCount,
        quality: quality === "hd" || quality === "high" ? "hd" : "standard",
      });

      const elapsed = Date.now() - startTime;
      console.log(
        `[Image] Generated ${dataUrls.length}/${imageCount} via ${provider} in ${elapsed}ms`,
      );

      if (dataUrls.length === 0) {
        return res.status(500).json({ error: "All image generation providers failed. Please try again." });
      }

      // Only expose b64_json for PNG data URLs (so the client renders the
      // correct MIME); JPEG/remote URLs are served via `url`.
      const images = dataUrls.map((u) => ({
        b64_json: /^data:image\/png;base64,/.test(u)
          ? u.replace(/^data:image\/png;base64,/, "")
          : "",
        url: u,
      }));

      res.json({
        images,
        generationTime: elapsed,
        count: images.length,
        provider,
      });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error?.message || "Failed to generate image" });
    }
  });

  // Real-photo lookup ("what does X look like") — distinct from AI generation.
  app.post("/api/image-search", async (req: Request, res: Response) => {
    try {
      const { query } = req.body || {};
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query is required" });
      }
      const hit = await searchRealPhoto(query);
      if (!hit) {
        return res.status(404).json({ error: "No real photo found" });
      }
      res.json({ image: hit });
    } catch (error: any) {
      console.error("Image search error:", error);
      res.status(500).json({ error: error?.message || "Image search failed" });
    }
  });

  // Text-to-speech via Azure gpt-audio (used for pronunciation + speech mode).
  app.post("/api/tts", async (req: Request, res: Response) => {
    try {
      const { text, voice = "nova" } = req.body || {};
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }
      const trimmed = text.slice(0, 4000);
      const dataUrl = await azureSpeak(trimmed, voice);
      if (!dataUrl) return res.status(503).json({ error: "TTS unavailable" });
      res.json({ audioDataUrl: dataUrl });
    } catch (err: any) {
      console.error("TTS error:", err);
      res.status(500).json({ error: err?.message || "TTS failed" });
    }
  });
}
