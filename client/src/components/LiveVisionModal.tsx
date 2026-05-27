import { useEffect, useRef, useState } from "react";
import { X, Eye, Mic, MicOff, Volume2, VolumeX, Loader2 } from "lucide-react";

interface LiveVisionModalProps {
  isDark: boolean;
  onClose: () => void;
}

const FRAME_INTERVAL_MS = 7000;
const MAX_FRAMES_PER_SESSION = 60;

export default function LiveVisionModal({ isDark, onClose }: LiveVisionModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const pendingQuestionRef = useRef<string>("");
  const frameCountRef = useRef(0);
  const lastAnalysisRef = useRef<string>("");
  const inFlightRef = useRef(false);
  const ttsEnabledRef = useRef(true);

  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [latestSpoken, setLatestSpoken] = useState("");
  const [userHeard, setUserHeard] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [ttsOn, setTtsOn] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [framesUsed, setFramesUsed] = useState(0);
  const [usingFrontCamera, setUsingFrontCamera] = useState(false);

  const pickCalmVoice = (): SpeechSynthesisVoice | null => {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices?.length) return null;
      const preferredNames = [
        "Google UK English Female",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Samantha",
        "Karen",
        "Victoria",
        "Serena",
        "Allison",
        "Ava",
        "Google US English",
      ];
      for (const name of preferredNames) {
        const v = voices.find((x) => x.name === name);
        if (v) return v;
      }
      const enFemale = voices.find(
        (v) => v.lang.startsWith("en") && /female|samantha|karen|victoria|aria|jenny|ava|serena|allison/i.test(v.name)
      );
      if (enFemale) return enFemale;
      return voices.find((v) => v.lang.startsWith("en")) || voices[0];
    } catch {
      return null;
    }
  };

  const speak = (text: string) => {
    if (!ttsEnabledRef.current) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickCalmVoice();
      if (v) u.voice = v;
      u.rate = 0.92;
      u.pitch = 1.05;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch {}
  };

  useEffect(() => {
    try {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    } catch {}
  }, []);

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const targetW = Math.min(640, w);
    const targetH = Math.round((h / w) * targetW);
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, targetW, targetH);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const analyzeNow = async (question?: string) => {
    if (inFlightRef.current) return;
    if (frameCountRef.current >= MAX_FRAMES_PER_SESSION) {
      speak("Frame limit reached for this session. Tap close and start again to continue.");
      stopInterval();
      return;
    }
    const img = captureFrame();
    if (!img) return;
    inFlightRef.current = true;
    setAnalyzing(true);
    frameCountRef.current += 1;
    setFramesUsed(frameCountRef.current);
    try {
      const res = await fetch("/api/analyze-live-camera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageData: img,
          question: question || pendingQuestionRef.current || "Briefly describe what you see right now. Focus on anything new or important.",
          language: "en",
          context: lastAnalysisRef.current ? `Previously said: ${lastAnalysisRef.current.slice(0, 200)}` : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text: string = (data?.analysis || "").trim();
      if (text) {
        lastAnalysisRef.current = text;
        setLatestSpoken(text);
        speak(text);
        pendingQuestionRef.current = "";
      }
    } catch (err: any) {
      console.warn("[LiveVision] analyze failed:", err?.message);
    } finally {
      inFlightRef.current = false;
      setAnalyzing(false);
    }
  };

  const startInterval = () => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      analyzeNow();
    }, FRAME_INTERVAL_MS);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startMic = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const r = new SR();
      r.continuous = true;
      r.interimResults = false;
      r.lang = "en-US";
      r.onresult = (e: any) => {
        const last = e.results[e.results.length - 1];
        if (last?.isFinal) {
          const heard = String(last[0]?.transcript || "").trim();
          if (heard) {
            setUserHeard(heard);
            pendingQuestionRef.current = heard;
            analyzeNow(heard);
          }
        }
      };
      r.onerror = () => {};
      r.onend = () => {
        if (micOn) {
          try { r.start(); } catch {}
        }
      };
      r.start();
      recognitionRef.current = r;
    } catch {}
  };

  const stopMic = () => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
  };

  const startCamera = async (front: boolean) => {
    setStatus("starting");
    setErrorMsg("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: front ? "user" : { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("ready");
      speak("Live vision started. I'm watching now.");
      startInterval();
      if (micOn) startMic();
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || String(err);
      setErrorMsg(msg.includes("Permission") || msg.includes("denied") ? "Camera access denied. Allow camera in browser settings." : msg);
    }
  };

  useEffect(() => {
    startCamera(false);
    return () => {
      stopInterval();
      stopMic();
      try { window.speechSynthesis.cancel(); } catch {}
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFlipCamera = async () => {
    const next = !usingFrontCamera;
    setUsingFrontCamera(next);
    await startCamera(next);
  };

  const handleToggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (next) startMic(); else stopMic();
  };

  const handleToggleTts = () => {
    const next = !ttsOn;
    setTtsOn(next);
    ttsEnabledRef.current = next;
    if (!next) try { window.speechSynthesis.cancel(); } catch {}
  };

  const handleClose = () => {
    stopInterval();
    stopMic();
    try { window.speechSynthesis.cancel(); } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" data-testid="live-vision-modal">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="flex items-center gap-2 text-white">
          <Eye className="h-5 w-5" />
          <div>
            <div className="font-bold">Live Vision</div>
            <div className="text-xs opacity-80">
              {status === "starting" && "Starting camera…"}
              {status === "ready" && (analyzing ? "Looking…" : `Watching · ${framesUsed}/${MAX_FRAMES_PER_SESSION} scans`)}
              {status === "error" && "Error"}
            </div>
          </div>
        </div>
        <button onClick={handleClose} className="text-white p-2 hover:bg-white/20 rounded-full" data-testid="button-close-vision">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-red-500/90 text-white p-4 rounded-lg max-w-sm text-center">
              <div className="font-bold mb-2">Camera unavailable</div>
              <div className="text-sm">{errorMsg}</div>
            </div>
          </div>
        )}

        {analyzing && status === "ready" && (
          <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
          </div>
        )}

        {userHeard && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md bg-blue-600/85 text-white px-3 py-2 rounded-lg text-sm shadow">
            <span className="opacity-70">You said: </span>{userHeard}
          </div>
        )}

        {latestSpoken && (
          <div className="absolute bottom-24 left-3 right-3 sm:max-w-2xl sm:mx-auto bg-black/80 text-white px-4 py-3 rounded-lg text-sm leading-relaxed shadow-lg">
            <div className="text-xs text-purple-300 mb-1 font-bold">TURBO VISION</div>
            {latestSpoken}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 p-4 bg-black/80">
        <button
          onClick={handleToggleMic}
          className={`h-12 w-12 rounded-full flex items-center justify-center ${micOn ? "bg-purple-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
          title={micOn ? "Mute mic" : "Unmute mic"}
          data-testid="button-vision-mic"
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        <button
          onClick={handleToggleTts}
          className={`h-12 w-12 rounded-full flex items-center justify-center ${ttsOn ? "bg-purple-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
          title={ttsOn ? "Mute voice" : "Unmute voice"}
          data-testid="button-vision-tts"
        >
          {ttsOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
        <button
          onClick={() => analyzeNow("What do you see right now? Be specific.")}
          disabled={status !== "ready" || analyzing}
          className="h-12 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold disabled:opacity-50"
          data-testid="button-vision-describe"
        >
          What do you see?
        </button>
        <button
          onClick={handleFlipCamera}
          className="h-12 px-4 rounded-full bg-zinc-700 text-white text-sm"
          title="Flip camera"
          data-testid="button-vision-flip"
        >
          Flip
        </button>
      </div>
    </div>
  );
}
