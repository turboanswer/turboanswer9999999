// Shared client-side image compression used by both the desktop chat (chat.tsx)
// and the native/mobile UI (MobileChatUI.tsx). Keeping ONE implementation
// prevents the native app from storing huge uncompressed photos in the WebView
// (which caused out-of-memory crashes on phones).

export function isLikelyImage(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(heic|heif|jpe?g|png|gif|webp|bmp)$/i.test(file.name)
  );
}

function encodeBitmap(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  maxDim: number,
  quality: number,
): string {
  const ratio = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * ratio));
  const h = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  draw(ctx, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!dataUrl || dataUrl === "data:,") throw new Error("Encode failed");
  return dataUrl;
}

// Resize down to `maxDim` on the longest edge and re-encode as JPEG so the
// resulting data URL stays small (a full-res phone photo can be 10+ MB; this
// brings it to a few hundred KB). Returns a `data:image/jpeg;base64,...` URL.
//
// Prefers `createImageBitmap` with resize options because it decodes the photo
// DIRECTLY to the target size — it never holds the full-resolution bitmap in
// memory. The old `new Image()` path decoded the entire multi-megapixel photo
// first, which is what crashed low-memory phones in the native WebView.
export async function compressImageToDataUrl(
  file: File,
  maxDim = 1568,
  quality = 0.85,
): Promise<string> {
  // Fast, low-memory path (modern WebViews / browsers).
  if (typeof createImageBitmap === "function") {
    try {
      const probe = await createImageBitmap(file);
      const ratio = Math.min(1, maxDim / Math.max(probe.width, probe.height));
      const targetW = Math.max(1, Math.round(probe.width * ratio));
      const targetH = Math.max(1, Math.round(probe.height * ratio));
      probe.close?.();
      // Re-decode straight to the downscaled size to keep peak memory tiny.
      const bitmap = await createImageBitmap(file, {
        resizeWidth: targetW,
        resizeHeight: targetH,
        resizeQuality: "high",
      } as ImageBitmapOptions);
      try {
        return encodeBitmap(
          bitmap.width,
          bitmap.height,
          (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
          Math.max(targetW, targetH),
          quality,
        );
      } finally {
        bitmap.close?.();
      }
    } catch {
      // Fall through to the legacy path (e.g. HEIC or resize unsupported).
    }
  }

  // Legacy fallback using an <img> element.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        resolve(
          encodeBitmap(
            img.width,
            img.height,
            (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
            maxDim,
            quality,
          ),
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed (possibly HEIC/unsupported format)"));
    };
    img.src = url;
  });
}
