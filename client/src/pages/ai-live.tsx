import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, X, Volume2, VolumeX } from "lucide-react";

type Status = "idle" | "standby" | "listening" | "thinking" | "speaking";

interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string;
}

// ─── Voice selection ────────────────────────────────────────────────────────
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  const priority = [
    "Google UK English Male",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Ryan Online (Natural) - English (United States)",
    "Microsoft Mark - English (United States)",
    "Microsoft David - English (United States)",
    "Alex", "Daniel", "Aaron", "Rishi",
    "Google US English",
  ];
  for (const p of priority) {
    const v = voices.find(v => v.name === p || v.name.startsWith(p));
    if (v) return v;
  }
  return (
    voices.find(v => v.lang.startsWith("en") && /male|guy|man|david|mark|ryan|daniel|alex|aaron/i.test(v.name)) ||
    voices.find(v => v.lang === "en-US") ||
    voices.find(v => v.lang.startsWith("en")) ||
    null
  );
}

// ─── Morphing orb component ─────────────────────────────────────────────────
const ORB_STATES: Record<Status, { colors: [string, string, string]; borderRadius: string; scale: number; speed: string }> = {
  idle:      { colors: ["#1a1a2e", "#16213e", "#0f3460"],           borderRadius: "50%",                                                             scale: 0.6, speed: "4s" },
  standby:   { colors: ["#1e3a5f", "#1a2e4a", "#0d2137"],           borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",                              scale: 0.75, speed: "5s" },
  listening: { colors: ["#34A853", "#1a73e8", "#00897b"],           borderRadius: "45% 55% 40% 60% / 55% 45% 65% 35%",                              scale: 1,    speed: "1.2s" },
  thinking:  { colors: ["#FBBC05", "#F9A825", "#FF8F00"],           borderRadius: "50% 50% 50% 50% / 50% 50% 50% 50%",                              scale: 0.9,  speed: "0.8s" },
  speaking:  { colors: ["#4285F4", "#9C27B0", "#EA4335"],           borderRadius: "38% 62% 46% 54% / 60% 44% 56% 40%",                              scale: 1.15, speed: "0.6s" },
};

function GeminiOrb({ status }: { status: Status }) {
  const cfg = ORB_STATES[status];
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let raf: number;
    let start = 0;
    function tick(ts: number) {
      if (!start) start = ts;
      setPhase(((ts - start) / 1000) % 360);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hue = (phase * 1.2) % 360;
  const isActive = status !== "idle" && status !== "standby";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {/* Glow rings */}
      {isActive && [1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  150 + i * 22,
            height: 150 + i * 22,
            background: `conic-gradient(from ${hue + i * 60}deg, ${cfg.colors[0]}44, ${cfg.colors[1]}22, ${cfg.colors[2]}44, transparent)`,
            borderRadius: "50%",
            opacity: 0.6 / i,
            animation: `spin-${i % 2 === 0 ? "cw" : "ccw"} ${3 + i}s linear infinite`,
          }}
        />
      ))}

      {/* Main blob */}
      <div
        style={{
          width:  150,
          height: 150,
          transform: `scale(${cfg.scale})`,
          borderRadius: cfg.borderRadius,
          background: `radial-gradient(circle at ${35 + Math.sin(phase * 0.05) * 10}% ${35 + Math.cos(phase * 0.05) * 10}%, ${cfg.colors[0]}, ${cfg.colors[1]} 50%, ${cfg.colors[2]})`,
          boxShadow: isActive
            ? `0 0 40px ${cfg.colors[0]}88, 0 0 80px ${cfg.colors[1]}44, inset 0 0 40px ${cfg.colors[2]}22`
            : `0 0 20px ${cfg.colors[0]}44`,
          transition: "border-radius 0.8s cubic-bezier(0.4,0,0.2,1), transform 0.6s ease, background 0.8s ease, box-shadow 0.8s ease",
          animation: isActive ? `morph-${status} ${cfg.speed} ease-in-out infinite alternate` : undefined,
          filter: isActive ? "blur(0px)" : "blur(1px)",
        }}
      />

      {/* Wave bars when speaking */}
      {status === "speaking" && (
        <div className="absolute flex items-center gap-1" style={{ bottom: 28 }}>
          {[4, 7, 10, 14, 10, 7, 4].map((h, i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: h,
                borderRadius: 4,
                background: cfg.colors[i % 3],
                animation: `wave-bar 0.${5 + (i % 4)}s ease-in-out ${i * 0.08}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      {/* Listening ripple dots */}
      {status === "listening" && (
        <div className="absolute flex items-center gap-1.5" style={{ bottom: 28 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cfg.colors[0],
                animation: `listen-dot 1.1s ease-in-out ${i * 0.18}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin-cw  { to { transform: rotate(360deg); } }
        @keyframes spin-ccw { to { transform: rotate(-360deg); } }
        @keyframes morph-listening {
          0%   { border-radius: 45% 55% 40% 60% / 55% 45% 65% 35%; }
          100% { border-radius: 62% 38% 58% 42% / 42% 58% 38% 62%; }
        }
        @keyframes morph-speaking {
          0%   { border-radius: 38% 62% 46% 54% / 60% 44% 56% 40%; }
          100% { border-radius: 54% 46% 62% 38% / 38% 62% 44% 56%; }
        }
        @keyframes morph-thinking {
          0%   { border-radius: 50%; transform: scale(0.9) rotate(0deg); }
          100% { border-radius: 50%; transform: scale(0.95) rotate(180deg); }
        }
        @keyframes morph-standby {
          0%   { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
          100% { border-radius: 45% 55% 40% 60% / 58% 42% 58% 42%; }
        }
        @keyframes wave-bar {
          from { transform: scaleY(0.5); opacity: 0.7; }
          to   { transform: scaleY(2);   opacity: 1; }
        }
        @keyframes listen-dot {
          from { transform: scale(0.6); opacity: 0.4; }
          to   { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function AILive() {
  const [status, setStatus]           = useState<Status>("idle");
  const [turns, setTurns]             = useState<Turn[]>([]);
  const [liveText, setLiveText]       = useState("");
  const [muted, setMuted]             = useState(false);
  const [error, setError]             = useState("");

  const statusRef     = useRef<Status>("idle");
  const historyRef    = useRef<{ role: string; content: string }[]>([]);
  const recRef        = useRef<any>(null);
  const synthRef      = useRef<SpeechSynthesis | null>(null);
  const voiceRef      = useRef<SpeechSynthesisVoice | null>(null);
  const idRef         = useRef(0);
  const processingRef = useRef(false);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const mutableId     = useRef(0);

  const setS = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Init voices
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const load = () => { voiceRef.current = pickVoice(window.speechSynthesis); };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
      stopRec();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  function stopRec() {
    try { recRef.current?.abort(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
  }

  const startListening = useCallback(() => {
    if (processingRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice not supported. Use Chrome or Edge."); return; }

    stopRec();
    const rec = new SR();
    rec.continuous       = false;
    rec.interimResults   = true;
    rec.lang             = "en-US";
    rec.maxAlternatives  = 1;
    recRef.current       = rec;

    rec.onstart = () => { setS("listening"); setLiveText(""); };

    rec.onresult = (e: any) => {
      let interim = "";
      let final   = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setLiveText(final || interim);
      if (final.trim()) {
        processingRef.current = true;
        rec.abort();
        sendToAI(final.trim());
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") {
        if (statusRef.current !== "idle" && !processingRef.current) {
          setTimeout(startListening, 200);
        }
      } else if (e.error === "not-allowed") {
        setError("Microphone access denied. Please allow mic permission.");
        setS("idle");
      }
    };

    rec.onend = () => {
      if (statusRef.current !== "idle" && statusRef.current !== "thinking" && statusRef.current !== "speaking" && !processingRef.current) {
        setTimeout(startListening, 150);
      }
    };

    try { rec.start(); } catch {}
  }, []);

  const sendToAI = useCallback(async (text: string) => {
    setLiveText("");
    setS("thinking");
    const tid = ++idRef.current;
    setTurns(prev => [...prev, { id: mutableId.current++, role: "user", text }]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];

    try {
      const res  = await fetch("/api/ai-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history: historyRef.current.slice(-10) }),
      });
      const data = await res.json();
      const reply = (data.reply ?? "Sorry, I didn't catch that.").replace(/\*+|#+|-{2,}|_+/g, "").trim();

      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
      setTurns(prev => [...prev, { id: mutableId.current++, role: "assistant", text: reply }]);

      setS("speaking");
      speakText(reply, () => {
        processingRef.current = false;
        if (statusRef.current !== "idle") {
          setS("listening");
          startListening();
        }
      });
    } catch {
      setError("Connection issue. Still listening…");
      processingRef.current = false;
      if (statusRef.current !== "idle") {
        setS("listening");
        startListening();
      }
    }
  }, [startListening]);

  const speakText = useCallback((text: string, onDone: () => void) => {
    const synth = synthRef.current;
    if (!synth) { onDone(); return; }
    synth.cancel();

    const utter      = new SpeechSynthesisUtterance(text);
    utter.rate       = 1.0;
    utter.pitch      = 0.95;
    utter.volume     = muted ? 0 : 1;
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.onend      = onDone;
    utter.onerror    = onDone;

    // iOS Safari needs a tiny delay
    setTimeout(() => { try { synth.speak(utter); } catch { onDone(); } }, 50);
  }, [muted]);

  const startSession = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Use Chrome or Edge for voice support."); return; }
    setError("");
    processingRef.current = false;
    setTurns([]);
    historyRef.current = [];
    setS("listening");
    startListening();
  }, [startListening]);

  const endSession = useCallback(() => {
    stopRec();
    synthRef.current?.cancel();
    processingRef.current = false;
    setS("idle");
    setLiveText("");
  }, []);

  const isActive  = status !== "idle";
  const lastAI    = [...turns].reverse().find(t => t.role === "assistant");
  const lastUser  = [...turns].reverse().find(t => t.role === "user");

  const statusLabel: Record<Status, string> = {
    idle:      "",
    standby:   "On standby",
    listening: "Listening…",
    thinking:  "Thinking…",
    speaking:  "Speaking…",
  };

  return (
    <div
      className="flex flex-col h-[100dvh] select-none overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 120%, #0a1628 0%, #050a14 50%, #020508 100%)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 relative z-30">
        <Link href="/chat">
          <button className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </Link>

        <div className="flex items-center gap-2">
          {isActive && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 6px #34D399", animation: "pulse 1.5s ease-in-out infinite" }}
              />
              <span className="text-xs text-white/50 font-medium">LIVE</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setMuted(m => !m)}
          className="p-2 rounded-xl text-white/30 hover:text-white/60 transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-between px-6 pb-6 relative z-10 overflow-hidden">

        {/* Conversation text — last exchange */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-6 text-center">
          {!isActive && (
            <div className="space-y-3">
              <h1 className="text-2xl font-light text-white/80 tracking-tight">Turbo Live</h1>
              <p className="text-sm text-white/30 leading-relaxed">
                Tap to start a live voice conversation.<br />Hands-free — no tapping between turns.
              </p>
            </div>
          )}

          {isActive && (
            <div className="w-full space-y-4">
              {/* AI last response */}
              {lastAI && status !== "listening" && status !== "thinking" && (
                <div
                  className="text-white/85 text-[17px] font-light leading-relaxed tracking-tight"
                  style={{ animation: "fadeUp 0.4s ease-out" }}
                >
                  {lastAI.text}
                </div>
              )}

              {/* User last input */}
              {lastUser && (status === "listening" || status === "thinking") && (
                <div className="text-white/35 text-sm leading-relaxed">
                  {lastUser.text}
                </div>
              )}

              {/* Live transcript */}
              {liveText && (
                <div
                  className="text-white/55 text-base italic leading-relaxed"
                  style={{ animation: "fadeIn 0.15s ease-out" }}
                >
                  "{liveText}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status label */}
        {isActive && (
          <div className="text-xs font-medium tracking-widest uppercase text-white/25 mb-4">
            {statusLabel[status]}
          </div>
        )}

        {/* Orb */}
        <div className="mb-8">
          <GeminiOrb status={status} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-xs text-red-400/80 text-center max-w-[240px]">
            {error}
          </div>
        )}

        {/* Action button */}
        {!isActive ? (
          <button
            onClick={startSession}
            className="w-full max-w-[240px] py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)",
              boxShadow: "0 4px 32px rgba(66,133,244,0.35)",
            }}
          >
            Start conversation
          </button>
        ) : (
          <button
            onClick={endSession}
            className="flex items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90"
            style={{
              background: "rgba(234,67,53,0.15)",
              border: "1.5px solid rgba(234,67,53,0.4)",
              boxShadow: "0 0 20px rgba(234,67,53,0.15)",
            }}
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        )}

        <div ref={bottomRef} />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
