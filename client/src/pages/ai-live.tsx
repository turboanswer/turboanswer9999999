import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, Zap } from "lucide-react";

type Status = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const COLORS = {
  blue:   "#4285F4",
  red:    "#EA4335",
  yellow: "#FBBC05",
  green:  "#34A853",
  purple: "#8B5CF6",
  cyan:   "#22D3EE",
};

function LiveOrb({ status }: { status: Status }) {
  const colors = {
    idle:      [COLORS.blue, COLORS.purple, COLORS.cyan],
    listening: [COLORS.green, COLORS.cyan, COLORS.blue],
    thinking:  [COLORS.yellow, COLORS.red, COLORS.purple],
    speaking:  [COLORS.red, COLORS.yellow, COLORS.green],
  }[status];

  const label = {
    idle:      "Tap mic to start",
    listening: "Listening…",
    thinking:  "Thinking…",
    speaking:  "Speaking…",
  }[status];

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Outer ring pulses */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  240 - (i - 1) * 30,
            height: 240 - (i - 1) * 30,
            border: `2px solid ${colors[i % colors.length]}`,
            opacity: status === "idle" ? 0.15 : 0.25,
            animation: `ping-slow-${i} ${1.2 + i * 0.5}s ease-in-out infinite`,
            animationPlayState: status === "idle" ? "paused" : "running",
            transform: "translate(-50%, -50%)",
            left: "50%",
            top: "50%",
          }}
        />
      ))}

      {/* Main orb */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 130,
          height: 130,
          background: `radial-gradient(circle at 35% 35%, ${colors[0]}, ${colors[1]} 60%, ${colors[2]})`,
          boxShadow: `0 0 60px ${colors[0]}55, 0 0 100px ${colors[1]}33`,
          animation: status === "listening"
            ? "orb-breathe 0.8s ease-in-out infinite alternate"
            : status === "thinking"
            ? "orb-spin 1.5s linear infinite"
            : status === "speaking"
            ? "orb-pulse 0.6s ease-in-out infinite alternate"
            : "orb-idle 3s ease-in-out infinite alternate",
          filter: "blur(0px)",
          transition: "background 0.8s ease",
        }}
      >
        <Zap className="w-10 h-10 text-white drop-shadow-lg" />
      </div>

      {/* Status label */}
      <p
        className="absolute text-sm font-semibold tracking-wide"
        style={{
          bottom: -8,
          color: colors[0],
          textShadow: `0 0 20px ${colors[0]}`,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </p>

      <style>{`
        @keyframes orb-idle {
          from { transform: scale(1) rotate(0deg); box-shadow: 0 0 60px ${colors[0]}55; }
          to   { transform: scale(1.04) rotate(5deg); box-shadow: 0 0 80px ${colors[1]}55; }
        }
        @keyframes orb-breathe {
          from { transform: scale(1);    }
          to   { transform: scale(1.15); }
        }
        @keyframes orb-spin {
          from { transform: rotate(0deg) scale(1.05); }
          to   { transform: rotate(360deg) scale(1.05); }
        }
        @keyframes orb-pulse {
          from { transform: scale(1.05); opacity: 0.9; }
          to   { transform: scale(1.2);  opacity: 1; }
        }
        @keyframes ping-slow-1 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);   opacity: 0.25; }
          50%       { transform: translate(-50%, -50%) scale(1.08); opacity: 0.08; }
        }
        @keyframes ping-slow-2 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.2; }
          50%       { transform: translate(-50%, -50%) scale(1.12); opacity: 0.06; }
        }
        @keyframes ping-slow-3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.15; }
          50%       { transform: translate(-50%, -50%) scale(1.16); opacity: 0.04; }
        }
      `}</style>
    </div>
  );
}

function Bubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === "user";
  const bubbleColors: Record<number, string> = {
    0: "linear-gradient(135deg, #4285F4, #22D3EE)",
    1: "linear-gradient(135deg, #8B5CF6, #EC4899)",
    2: "linear-gradient(135deg, #34A853, #22D3EE)",
    3: "linear-gradient(135deg, #FBBC05, #F97316)",
  };
  const colorKey = (index % 4) as keyof typeof bubbleColors;

  return (
    <div
      className={`flex w-full mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 mr-2 mt-1"
          style={{ background: bubbleColors[colorKey] }}
        />
      )}
      <div
        className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg"
        style={
          isUser
            ? { background: "rgba(66,133,244,0.2)", border: "1px solid rgba(66,133,244,0.4)", color: "#e2e8f0" }
            : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#f1f5f9" }
        }
      >
        {msg.text}
      </div>
    </div>
  );
}

export default function AILive() {
  const [status, setStatus]       = useState<Status>("idle");
  const [messages, setMessages]   = useState<Message[]>([]);
  const [muted, setMuted]         = useState(false);
  const [active, setActive]       = useState(false);
  const [error, setError]         = useState("");
  const historyRef                = useRef<{ role: string; content: string }[]>([]);
  const recognitionRef            = useRef<any>(null);
  const synthRef                  = useRef<SpeechSynthesis | null>(null);
  const idRef                     = useRef(0);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const activeRef                 = useRef(false);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      stopListening();
      synthRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((role: "user" | "assistant", text: string) => {
    const id = ++idRef.current;
    setMessages(prev => [...prev, { id, role, text }]);
    historyRef.current = [...historyRef.current, { role, content: text }];
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (muted || !synthRef.current) {
      onEnd?.();
      return;
    }
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google US English") ||
      v.name.includes("Samantha") ||
      (v.lang === "en-US" && !v.name.toLowerCase().includes("zira"))
    );
    if (preferred) utter.voice = preferred;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    synthRef.current.speak(utter);
  }, [muted]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatus("thinking");
    addMessage("user", text);

    try {
      const res = await fetch("/api/ai-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history: historyRef.current.slice(-10) }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, I didn't catch that.";
      addMessage("assistant", reply);
      setStatus("speaking");
      speak(reply, () => {
        if (activeRef.current) {
          setStatus("listening");
          startListening();
        } else {
          setStatus("idle");
        }
      });
    } catch {
      setError("Connection issue. Tap the mic to try again.");
      setStatus("idle");
    }
  }, [addMessage, speak]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice not supported on this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    rec.onstart = () => setStatus("listening");
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) sendMessage(transcript.trim());
    };
    rec.onerror = (e: any) => {
      if (e.error === "aborted" || e.error === "no-speech") {
        if (activeRef.current) {
          setStatus("listening");
          startListening();
        } else {
          setStatus("idle");
        }
      } else {
        setError("Mic error: " + e.error);
        setStatus("idle");
        setActive(false);
      }
    };
    rec.onend = () => {
      if (activeRef.current && status === "listening") {
        setTimeout(startListening, 200);
      }
    };
    try { rec.start(); } catch {}
  }, [sendMessage]);

  const toggleSession = useCallback(() => {
    if (active) {
      setActive(false);
      activeRef.current = false;
      stopListening();
      synthRef.current?.cancel();
      setStatus("idle");
    } else {
      setError("");
      setActive(true);
      activeRef.current = true;
      setStatus("listening");
      startListening();
    }
  }, [active, stopListening, startListening]);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      if (!m) synthRef.current?.cancel();
      return !m;
    });
  }, []);

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #050814 0%, #0a0a1e 40%, #080814 70%, #050814 100%)",
      }}
    >
      {/* Floating background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #4285F4, transparent)", top: "-100px", left: "-100px" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #34A853, transparent)", bottom: "-80px", right: "-80px" }} />
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #FBBC05, transparent)", top: "40%", left: "60%" }} />
        <div className="absolute w-[350px] h-[350px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #EA4335, transparent)", top: "20%", right: "20%" }} />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <Link href="/chat">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: status === "idle" ? "#6b7280" : "#34A853",
              boxShadow: status !== "idle" ? "0 0 8px #34A853" : "none",
              animation: status !== "idle" ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-sm font-semibold text-white">AI Live</span>
          <span className="text-[10px] text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-full">Gemini 2.0 Flash</span>
        </div>

        <button
          onClick={toggleMute}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </header>

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-8">
            <p className="text-gray-500 text-sm max-w-[240px]">
              Start a live voice conversation with Turbo AI
            </p>
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {["What's the weather like?", "Tell me a fun fact", "Help me brainstorm"].map(hint => (
                <button
                  key={hint}
                  onClick={() => sendMessage(hint)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/25 transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="max-w-lg mx-auto">
          {messages.map((msg, i) => (
            <Bubble key={msg.id} msg={msg} index={i} />
          ))}
          {status === "thinking" && (
            <div className="flex items-center gap-2 mb-3 justify-start">
              <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: "linear-gradient(135deg, #FBBC05, #F97316)" }} />
              <div className="bg-white/[0.07] border border-white/10 rounded-2xl px-4 py-2.5 flex gap-1.5 items-center">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="relative z-20 mx-4 mb-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      {/* Orb + Mic button */}
      <div className="relative z-20 flex flex-col items-center pb-8 pt-2 gap-8">
        <LiveOrb status={status} />

        {/* Mic toggle button */}
        <button
          onClick={toggleSession}
          className="relative rounded-full transition-all duration-300 active:scale-95"
          style={{
            width: 72,
            height: 72,
            background: active
              ? "linear-gradient(135deg, #EA4335, #FBBC05)"
              : "linear-gradient(135deg, #4285F4, #34A853)",
            boxShadow: active
              ? "0 0 30px rgba(234,67,53,0.5), 0 8px 32px rgba(0,0,0,0.4)"
              : "0 0 30px rgba(66,133,244,0.4), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {active
            ? <MicOff className="w-7 h-7 text-white mx-auto" />
            : <Mic    className="w-7 h-7 text-white mx-auto" />
          }
          {active && status === "listening" && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid rgba(234,67,53,0.6)",
                animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
          )}
        </button>

        <p className="text-[11px] text-gray-600 text-center px-6">
          {active
            ? "Tap to stop — speech continues even when you switch tabs"
            : "Tap to start live voice conversation"}
        </p>
      </div>
    </div>
  );
}
