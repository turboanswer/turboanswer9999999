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

// Resize down to `maxDim` on the longest edge and re-encode as JPEG so the
// resulting data URL stays small (a full-res phone photo can be 10+ MB; this
// brings it to a few hundred KB). Returns a `data:image/jpeg;base64,...` URL.
export function compressImageToDataUrl(
  file: File,
  maxDim = 1568,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (!dataUrl || dataUrl === "data:,") return reject(new Error("Encode failed"));
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed (possibly HEIC/unsupported format)"));
    };
    img.src = url;
  });
}
