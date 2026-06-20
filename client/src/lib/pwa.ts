// PWA bootstrap: service worker registration, background sync/periodic sync,
// Web Share Target + File Handler intake for screenshots/images.

const SHARED_MEDIA_CACHE = "turbo-shared-media";
export const SHARED_IMAGE_EVENT = "turbo:shared-image";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Web Share Target intake (screenshot POSTed to the SW, cached for pickup) ───
async function readSharedFromCache(): Promise<string | null> {
  try {
    if (!("caches" in window)) return null;
    const cache = await caches.open(SHARED_MEDIA_CACHE);
    const res = await cache.match("shared-image");
    if (!res) return null;
    const blob = await res.blob();
    await cache.delete("shared-image");
    if (!blob || !blob.size) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

// ── File Handler intake (OS "Open with" → launchQueue) ─────────────────────────
// A single persistent consumer registered once at startup. Files can arrive
// after the app mounts (cold start), so we buffer the result and also emit an
// event for late subscribers instead of racing against a fixed timeout.
let bufferedLaunchImage: string | null = null;
let launchSettled = false;
let resolveLaunch: ((v: string | null) => void) | null = null;
const launchPromise: Promise<string | null> = new Promise((res) => {
  resolveLaunch = res;
});

function emitSharedImage(dataUrl: string) {
  bufferedLaunchImage = dataUrl;
  if (!launchSettled) {
    launchSettled = true;
    resolveLaunch?.(dataUrl);
  }
  // Notify any already-mounted page (handles late file arrivals).
  try {
    window.dispatchEvent(new CustomEvent(SHARED_IMAGE_EVENT, { detail: dataUrl }));
  } catch {
    /* no-op */
  }
}

function setupLaunchConsumer() {
  try {
    const lq = (window as any).launchQueue;
    if (!lq || typeof lq.setConsumer !== "function") {
      if (!launchSettled) {
        launchSettled = true;
        resolveLaunch?.(null);
      }
      return;
    }
    lq.setConsumer(async (params: any) => {
      try {
        if (!params || !params.files || !params.files.length) return;
        for (const handle of params.files) {
          const file = await handle.getFile();
          if (file && file.type.startsWith("image/")) {
            emitSharedImage(await blobToDataUrl(file));
            return;
          }
        }
      } catch {
        /* ignore a bad launch payload */
      }
    });
  } catch {
    if (!launchSettled) {
      launchSettled = true;
      resolveLaunch?.(null);
    }
  }
}

// Called by the chat page on mount to retrieve an incoming screenshot, if any.
export async function consumeSharedImage(): Promise<string | null> {
  // 1) Web Share Target (cached by the service worker).
  const fromCache = await readSharedFromCache();
  if (fromCache) return fromCache;

  // 2) File handler result already buffered.
  if (bufferedLaunchImage) {
    const v = bufferedLaunchImage;
    bufferedLaunchImage = null;
    return v;
  }

  // 3) Wait briefly for a pending file-handler launch. The consumer stays
  //    registered, so anything that arrives later still fires SHARED_IMAGE_EVENT.
  const winner = await Promise.race([
    launchPromise,
    new Promise<null>((res) => setTimeout(() => res(null), 1200)),
  ]);
  if (winner) {
    bufferedLaunchImage = null;
    return winner;
  }
  return null;
}

async function registerBackgroundTasks(reg: ServiceWorkerRegistration) {
  // One-off background sync (retry-on-reconnect).
  try {
    if ("sync" in reg) {
      await (reg as any).sync.register("turbo-sync").catch(() => {});
    }
  } catch {
    /* best-effort */
  }
  // Periodic background sync (recurring lightweight task; Chromium/Edge only,
  // and only when the app is installed + permission granted).
  try {
    const periodic = (reg as any).periodicSync;
    if (periodic && "register" in periodic) {
      const status = await (navigator as any).permissions
        ?.query({ name: "periodic-background-sync" as PermissionName })
        .catch(() => null);
      if (!status || status.state === "granted") {
        await periodic
          .register("turbo-refresh", { minInterval: 12 * 60 * 60 * 1000 })
          .catch(() => {});
      }
    }
  } catch {
    /* best-effort */
  }
}

export function initPwa() {
  if (typeof window === "undefined") return;
  // Skip inside the Capacitor native shell — it has its own lifecycle.
  if ((window as any).Capacitor?.isNativePlatform?.()) return;

  // Register the file-handler consumer immediately so no launch is dropped.
  setupLaunchConsumer();

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await registerBackgroundTasks(reg);

      navigator.serviceWorker.addEventListener("message", (event) => {
        const type = event.data?.type;
        if (type === "BACKGROUND_SYNC" || type === "PERIODIC_REFRESH") {
          window.dispatchEvent(
            new CustomEvent("turbo:background-task", { detail: type })
          );
        }
      });
    } catch {
      /* SW registration is best-effort; app still works without it. */
    }
  });
}
