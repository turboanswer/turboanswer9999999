import type { Express, Request, Response } from "express";
import { openai } from "./client";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "512x512", quality = "low", count = 5 } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const imageCount = Math.min(Math.max(1, Number(count) || 5), 10);
      const startTime = Date.now();

      const requests = Array.from({ length: imageCount }, () =>
        openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: size as "1024x1024" | "512x512" | "256x256",
          quality: quality as "low" | "medium" | "high",
        }).catch(err => {
          console.error("[Image] Single request failed:", err.message);
          return null;
        })
      );

      const results = await Promise.all(requests);
      const elapsed = Date.now() - startTime;
      console.log(`[Image] Generated ${imageCount} images in ${elapsed}ms (size: ${size}, quality: ${quality})`);

      const images = results
        .filter(r => r !== null)
        .map(r => ({
          url: r!.data[0]?.url,
          b64_json: r!.data[0]?.b64_json,
        }));

      if (images.length === 0) {
        return res.status(500).json({ error: "All image generation attempts failed" });
      }

      res.json({
        images,
        generationTime: elapsed,
        count: images.length,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}

