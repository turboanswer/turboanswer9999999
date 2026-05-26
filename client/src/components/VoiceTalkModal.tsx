import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  conversationId: number;
  isDark: boolean;
  onClose: () => void;
}

type Status = "connecting" | "live" | "ended" | "error" | "quota";

export function VoiceTalkModal({ conversationId, isDark, onClose }: Props) {
  const [status, setStatus] = useState<Status>("connecting");
  const [statusMessage, setStatusMessage] = useState<string>("Connecting…");
  const [remaining, setRemaining] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [aiSpeaking, setAiSpeaking] = useState<boolean>(false);
  const [liveCaption, setLiveCaption] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const playTimeRef = useRef<number>(0);
  const mutedRef = useRef<boolean>(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const cleanup = () => {
    try { processorRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    try { playCtxRef.current?.close(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { wsRef.current?.close(); } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;

        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${proto}//${window.location.host}/api/realtime?convId=${conversationId}`);
        wsRef.current = ws;
        ws.binaryType = "arraybuffer";

        ws.onopen = () => setStatusMessage("Listening…");

        ws.onmessage = async (ev) => {
          if (typeof ev.data === "string") {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.type === "ready") {
                setStatus("live");
                setRemaining(Number(msg.remainingSeconds) || 0);
                setStatusMessage("Live — say hi!");
                startMicCapture();
              } else if (msg.type === "quota_exceeded") {
                setStatus("quota");
                setStatusMessage(msg.message || "Daily voice limit reached.");
                cleanup();
              } else if (msg.type === "error") {
                setStatus("error");
                setStatusMessage(msg.error || "Voice failed.");
                cleanup();
              } else if (msg.type === "response.audio.delta" && msg.delta) {
                setAiSpeaking(true);
                playPcm16Base64(msg.delta);
              } else if (msg.type === "response.audio.done") {
                setAiSpeaking(false);
              } else if (msg.type === "response.audio_transcript.delta" && msg.delta) {
                setLiveCaption((c) => (c + msg.delta).slice(-200));
              } else if (msg.type === "response.audio_transcript.done") {
                setLiveCaption("");
              }
            } catch {}
          } else {
            // binary audio (some Azure variants send raw frames)
            playPcm16ArrayBuffer(ev.data);
            setAiSpeaking(true);
          }
        };

        ws.onclose = () => {
          if (status !== "quota" && status !== "error") setStatus("ended");
          setStatusMessage("Call ended.");
          cleanup();
        };
        ws.onerror = () => {
          setStatus("error");
          setStatusMessage("Connection problem.");
        };
      } catch (err: any) {
        setStatus("error");
        setStatusMessage(err?.message?.includes("Permission") ? "Microphone permission denied." : (err?.message || "Could not start voice."));
      }
    })();
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Countdown the daily quota.
  useEffect(() => {
    if (status !== "live" || remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [status, remaining]);

  const startMicCapture = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC({ sampleRate: 24000 });
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;
    // ScriptProcessor is deprecated but the simplest cross-browser PCM path.
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    processorRef.current = processor;
    processor.onaudioprocess = (e) => {
      if (mutedRef.current) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const b64 = base64FromArrayBuffer(pcm16.buffer);
      ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
    };
    source.connect(processor);
    processor.connect(ctx.destination);
  };

  const playPcm16Base64 = (b64: string) => {
    const bytes = base64ToArrayBuffer(b64);
    playPcm16ArrayBuffer(bytes);
  };

  const playPcm16ArrayBuffer = (buf: ArrayBuffer) => {
    if (!playCtxRef.current) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      playCtxRef.current = new AC({ sampleRate: 24000 });
      playTimeRef.current = playCtxRef.current!.currentTime;
    }
    const ctx = playCtxRef.current!;
    const pcm16 = new Int16Array(buf);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, playTimeRef.current);
    src.start(startAt);
    playTimeRef.current = startAt + audioBuffer.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <style>{`
        @keyframes voice-pulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.4); opacity: 0; } }
        @keyframes voice-glow { 0%,100% { box-shadow: 0 0 40px rgba(168,85,247,0.4); } 50% { box-shadow: 0 0 80px rgba(168,85,247,0.8); } }
      `}</style>
      <div className={`w-full max-w-md mx-4 rounded-3xl p-8 ${isDark ? "bg-zinc-900 border border-zinc-700" : "bg-white border border-gray-200 shadow-2xl"}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Talk to Turbo</h2>
            <p className={`text-sm ${isDark ? "text-zinc-400" : "text-gray-500"}`}>{statusMessage}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative">
            {(status === "live" && (aiSpeaking || !muted)) && (
              <>
                <div className="absolute inset-0 rounded-full bg-purple-500" style={{ animation: "voice-pulse 2s ease-out infinite" }} />
                <div className="absolute inset-0 rounded-full bg-purple-400" style={{ animation: "voice-pulse 2s ease-out 0.5s infinite" }} />
              </>
            )}
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center ${status === "live" ? "bg-gradient-to-br from-purple-500 to-pink-500" : isDark ? "bg-zinc-800" : "bg-gray-200"}`} style={{ animation: status === "live" ? "voice-glow 3s ease-in-out infinite" : undefined }}>
              {status === "connecting" ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              ) : status === "live" ? (
                aiSpeaking ? <Phone className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />
              ) : (
                <MicOff className="w-12 h-12 text-white opacity-50" />
              )}
            </div>
          </div>
        </div>

        {liveCaption && (
          <div className={`text-center text-sm mb-4 px-4 py-2 rounded-lg ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-gray-100 text-gray-700"}`}>
            "{liveCaption}"
          </div>
        )}

        {status === "live" && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button variant={muted ? "destructive" : "outline"} onClick={() => setMuted((m) => !m)} className="rounded-full">
              {muted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button variant="destructive" onClick={onClose} className="rounded-full">
              End Call
            </Button>
          </div>
        )}

        {status === "live" && (
          <p className={`text-center text-xs ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
            Time remaining today: <span className="font-mono">{fmt(remaining)}</span>
          </p>
        )}

        {(status === "quota" || status === "error" || status === "ended") && (
          <div className="text-center">
            <Button onClick={onClose} className="rounded-full">Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function base64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
