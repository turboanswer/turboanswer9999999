import type { ReactNode } from "react";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

const WEB_URL = "https://turboanswer.it.com";

const isNativeMobile = !!(window as any).Capacitor?.isNativePlatform?.();

export function isAndroidNative() {
  return isNativeMobile;
}

export function WebOnlyGate({
  children,
  featureName,
}: {
  children: ReactNode;
  featureName?: string;
}) {
  if (!isNativeMobile) return <>{children}</>;

  const openBrowser = () => {
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.Browser?.open) {
      cap.Plugins.Browser.open({ url: WEB_URL });
    } else {
      window.open(WEB_URL, "_system");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
      style={{ background: "#040818", color: "#e8f1ff" }}
      data-testid="web-only-gate"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center max-w-sm">
        <div
          className="relative mb-6"
          style={{
            filter: "drop-shadow(0 0 40px rgba(0,212,255,0.45))",
          }}
        >
          <img
            src={turboLogo}
            alt="TurboAnswer"
            className="w-20 h-20 rounded-2xl object-cover"
          />
        </div>

        <div
          className="text-[11px] uppercase tracking-[0.22em] mb-3 font-mono"
          style={{ color: "#00d4ff" }}
        >
          ─── web-only feature ───
        </div>

        <h1
          className="text-2xl sm:text-3xl font-semibold text-white mb-3"
          style={{ letterSpacing: "-0.02em" }}
        >
          {featureName ?? "This feature"} runs on the web.
        </h1>

        <p
          className="text-sm mb-8 leading-relaxed"
          style={{ color: "#6b8aa8" }}
        >
          Our AI features need the full GPU-powered web experience. Open{" "}
          <span style={{ color: "#e8f1ff" }}>turboanswer.it.com</span> in your
          browser to chat with Turbo, generate images, or write code.
        </p>

        <button
          onClick={openBrowser}
          data-testid="button-open-web"
          className="px-6 py-3.5 rounded-lg font-semibold text-sm w-full sm:w-auto"
          style={{
            background: "linear-gradient(135deg, #00d4ff, #0066ff)",
            color: "#021024",
            boxShadow: "0 0 30px rgba(0,212,255,0.45)",
          }}
        >
          Open turboanswer.it.com →
        </button>

        <div className="mt-10 grid grid-cols-1 gap-2 w-full text-xs font-mono">
          <div
            className="px-3 py-2 rounded text-left"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(120,170,255,0.10)",
              color: "#6b8aa8",
            }}
          >
            <span style={{ color: "#00ffaa" }}>✓</span>{" "}
            Subscriptions, billing &amp; account manageable here
          </div>
          <div
            className="px-3 py-2 rounded text-left"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(120,170,255,0.10)",
              color: "#6b8aa8",
            }}
          >
            <span style={{ color: "#00d4ff" }}>●</span>{" "}
            Native AI features coming in v2.0
          </div>
        </div>
      </div>
    </div>
  );
}
