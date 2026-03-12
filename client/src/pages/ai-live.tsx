import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, X, Volume2, VolumeX, Mic } from "lucide-react";

type Status = "idle" | "listening" | "thinking" | "speaking";

interface Turn { id: number; role: "user" | "assistant"; text: string; }

// Pick the best natural male voice available
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const all = synth.getVoices();
  if (!all.length) return null;
  const want = [
    "Google UK English Male",
    "Microsoft Ryan Online (Natural) - English (United States)",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Microsoft Mark - English (United States)",
    "Microsoft David - English (United States)",
    "Alex", "Daniel", "Aaron",
  ];
  for (const w of want) {
    const v = all.find(v => v.name === w || v.name.startsWith(w));
    if (v) return v;
  }
  return (
    all.find(v => v.lang.startsWith("en") && /male|guy|david|mark|ryan|daniel|alex|aaron/i.test(v.name)) ||
    all.find(v => v.lang === "en-US") ||
    all.find(v => v.lang.startsWith("en")) ||
    null
  );
}

// ─── Orb visual ──────────────────────────────────────────────────────────────
function Orb({ status }: { status: Status }) {
  const s = {
    idle:      { c1:"#1a2744", c2:"#0d1a2e", glow:"#1a2744", scale:0.6, anim:"none" },
    listening: { c1:"#0d7a3e", c2:"#0d5c8c", glow:"#0d7a3e", scale:1.0, anim:"orb-listen 1.2s ease-in-out infinite alternate" },
    thinking:  { c1:"#c47a00", c2:"#9a3d00", glow:"#c47a00", scale:0.85, anim:"orb-think 0.9s linear infinite" },
    speaking:  { c1:"#2563eb", c2:"#7c3aed", glow:"#4f46e5", scale:1.1, anim:"orb-speak 0.7s ease-in-out infinite alternate" },
  }[status];

  return (
    <div style={{ width:200, height:200, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {/* Glow rings — only when active */}
      {status !== "idle" && [80,100,120].map((r,i) => (
        <div key={i} style={{
          position:"absolute",
          width: 130+r, height: 130+r,
          borderRadius:"50%",
          border:`1px solid ${s.c1}`,
          opacity: 0.15 - i*0.04,
          animation:`ring-spin ${4+i*2}s linear infinite`,
          animationDirection: i%2?"normal":"reverse",
        }} />
      ))}

      {/* Main orb */}
      <div style={{
        width:130, height:130,
        borderRadius: status==="listening" ? "48% 52% 44% 56% / 54% 46% 56% 44%"
                    : status==="speaking"  ? "42% 58% 52% 48% / 60% 40% 60% 40%"
                    : "50%",
        background:`radial-gradient(circle at 38% 36%, ${s.c1}, ${s.c2})`,
        boxShadow: status!=="idle"
          ? `0 0 48px ${s.glow}88, 0 0 90px ${s.glow}33`
          : `0 0 16px ${s.glow}33`,
        transform:`scale(${s.scale})`,
        transition:"border-radius .7s ease, transform .5s ease, background .8s ease, box-shadow .8s ease",
        animation: s.anim,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {/* Inner indicators */}
        {status === "listening" && (
          <div style={{display:"flex",gap:4,alignItems:"flex-end"}}>
            {[6,10,14,10,6].map((h,i) => (
              <div key={i} style={{
                width:3, height:h, borderRadius:2, background:"rgba(255,255,255,0.6)",
                animation:`bar-mic ${0.5+i*0.1}s ease-in-out ${i*0.1}s infinite alternate`,
              }} />
            ))}
          </div>
        )}
        {status === "thinking" && (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:7, height:7, borderRadius:"50%",
                background:"rgba(255,255,255,0.8)",
                animation:`dot-bounce 0.9s ease-in-out ${i*0.2}s infinite alternate`,
              }} />
            ))}
          </div>
        )}
        {status === "speaking" && (
          <div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
            {[5,9,13,17,13,9,5].map((h,i) => (
              <div key={i} style={{
                width:3, height:h, borderRadius:2, background:"rgba(255,255,255,0.7)",
                animation:`bar-wave ${0.4+i%3*0.15}s ease-in-out ${i*0.07}s infinite alternate`,
              }} />
            ))}
          </div>
        )}
        {status === "idle" && (
          <Mic style={{width:28,height:28,color:"rgba(255,255,255,0.2)"}} />
        )}
      </div>

      <style>{`
        @keyframes ring-spin { to { transform:rotate(360deg); } }
        @keyframes orb-listen { 0%{transform:scale(1) rotate(0deg)} 100%{transform:scale(1.08) rotate(4deg)} }
        @keyframes orb-think  { 0%{transform:scale(0.85) rotate(0deg)} 100%{transform:scale(0.85) rotate(360deg)} }
        @keyframes orb-speak  { 0%{transform:scale(1.08)} 100%{transform:scale(1.18)} }
        @keyframes bar-mic    { from{transform:scaleY(0.4);opacity:0.5} to{transform:scaleY(1.8);opacity:1} }
        @keyframes bar-wave   { from{transform:scaleY(0.5);opacity:0.6} to{transform:scaleY(2.2);opacity:1} }
        @keyframes dot-bounce { from{transform:translateY(0);opacity:0.5} to{transform:translateY(-8px);opacity:1} }
      `}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AILive() {
  const [status, setStatus]   = useState<Status>("idle");
  const [turns, setTurns]     = useState<Turn[]>([]);
  const [interim, setInterim] = useState("");
  const [muted, setMuted]     = useState(false);
  const [error, setError]     = useState("");

  // Everything important lives in refs to avoid stale-closure bugs
  const sidRef      = useRef(0);      // session id — bump to kill old callbacks
  const statusRef   = useRef<Status>("idle");
  const recRef      = useRef<any>(null);
  const isRecRef    = useRef(false);  // guard: only one rec at a time
  const histRef     = useRef<{role:string;content:string}[]>([]);
  const synthRef    = useRef(window.speechSynthesis);
  const voiceRef    = useRef<SpeechSynthesisVoice|null>(null);
  const mutedRef    = useRef(false);
  const tidRef      = useRef(0);

  mutedRef.current = muted;

  function go(s: Status) { statusRef.current = s; setStatus(s); }

  // Load voices (Chrome loads them async)
  useEffect(() => {
    const load = () => { voiceRef.current = pickVoice(synthRef.current); };
    load();
    synthRef.current.addEventListener("voiceschanged", load);
    return () => {
      sidRef.current += 1;
      synthRef.current.removeEventListener("voiceschanged", load);
      synthRef.current.cancel();
      stopRec();
    };
  }, []);

  function stopRec() {
    isRecRef.current = false;
    const r = recRef.current;
    recRef.current = null;
    try { r?.stop(); } catch {}   // graceful stop (not abort) — avoids extra onerror
  }

  // ── Core recognition loop ─────────────────────────────────────────────────
  function listen(mySid: number) {
    // Guard: bail if session changed or already recognizing
    if (mySid !== sidRef.current) return;
    if (isRecRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition needs Chrome or Edge browser.");
      go("idle"); sidRef.current += 1; return;
    }

    isRecRef.current = true;
    const rec = new SR();
    rec.lang            = "en-US";
    rec.continuous      = false;   // false = most reliable across browsers
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    recRef.current      = rec;

    rec.onstart = () => {
      if (mySid !== sidRef.current) { rec.stop(); return; }
      go("listening");
      setInterim("");
      setError("");
    };

    rec.onresult = (e: any) => {
      if (mySid !== sidRef.current) return;
      let inter = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else inter += t;
      }
      if (inter) setInterim(inter);
      if (final.trim()) {
        setInterim("");
        // stop first, then process — onend will see we're not in "listening" and won't restart
        stopRec();
        process(final.trim(), mySid);
      }
    };

    rec.onerror = (e: any) => {
      if (mySid !== sidRef.current) return;
      isRecRef.current = false;
      if (e.error === "no-speech") return;   // onend will restart
      if (e.error === "aborted")   return;   // we stopped it — onend handles rest
      if (e.error === "not-allowed") {
        setError("Microphone access denied. Please allow mic in browser settings.");
        go("idle"); sidRef.current += 1; return;
      }
      setError(`Mic error: ${e.error}`);
    };

    rec.onend = () => {
      isRecRef.current = false;
      if (mySid !== sidRef.current) return;
      // Auto-restart ONLY when we should still be listening
      if (statusRef.current === "listening") {
        setTimeout(() => listen(mySid), 100);
      }
    };

    try {
      rec.start();
    } catch {
      isRecRef.current = false;
      setTimeout(() => listen(mySid), 300);
    }
  }

  // ── Call AI ───────────────────────────────────────────────────────────────
  async function process(text: string, mySid: number) {
    if (mySid !== sidRef.current) return;
    go("thinking");

    const uTurn: Turn = { id: tidRef.current++, role: "user", text };
    setTurns(p => [...p, uTurn]);
    histRef.current = [...histRef.current, { role:"user", content:text }];

    try {
      const r = await fetch("/api/ai-live", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        credentials:"include",
        body: JSON.stringify({ message: text, history: histRef.current.slice(-10) }),
      });
      if (mySid !== sidRef.current) return;

      const d = await r.json();
      const reply = (d.reply ?? "I'm listening — what would you like to know?")
        .replace(/[*_#`>]/g, "").trim();

      const aTurn: Turn = { id: tidRef.current++, role:"assistant", text: reply };
      setTurns(p => [...p, aTurn]);
      histRef.current = [...histRef.current, { role:"assistant", content: reply }];

      if (mySid !== sidRef.current) return;
      go("speaking");
      say(reply, mySid);

    } catch {
      if (mySid !== sidRef.current) return;
      setError("Connection issue — resuming...");
      go("listening");
      listen(mySid);
    }
  }

  // ── Speak ─────────────────────────────────────────────────────────────────
  function say(text: string, mySid: number) {
    const done = () => {
      if (mySid !== sidRef.current) return;
      go("listening");
      listen(mySid);
    };

    if (mutedRef.current) { done(); return; }

    synthRef.current.cancel();
    const u       = new SpeechSynthesisUtterance(text);
    u.rate        = 0.97;
    u.pitch       = 0.92;
    u.lang        = "en-US";
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onend       = done;
    u.onerror     = done;
    setTimeout(() => {
      try { synthRef.current.speak(u); }
      catch { done(); }
    }, 80);
  }

  // ── Session control ────────────────────────────────────────────────────────
  function startSession() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Use Chrome or Edge for voice support."); return; }
    setError("");
    setTurns([]);
    histRef.current = [];
    const mySid = ++sidRef.current;
    go("listening");
    listen(mySid);
  }

  function endSession() {
    sidRef.current += 1;    // ← invalidates ALL pending callbacks instantly
    go("idle");
    setInterim("");
    stopRec();
    synthRef.current.cancel();
  }

  // ── Derived UI values ──────────────────────────────────────────────────────
  const active   = status !== "idle";
  const lastAI   = [...turns].reverse().find(t => t.role === "assistant");
  const lastUser = [...turns].reverse().find(t => t.role === "user");

  const labels: Record<Status,string> = {
    idle:"", listening:"Listening", thinking:"Thinking", speaking:"Speaking"
  };

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100dvh",
      background:"radial-gradient(ellipse at 50% 110%, #071428 0%, #050a14 45%, #020508 100%)",
      userSelect:"none", overflow:"hidden",
    }}>
      {/* Header */}
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",zIndex:30}}>
        <Link href="/chat">
          <button style={{display:"flex",alignItems:"center",gap:6,color:"rgba(255,255,255,0.35)",background:"none",border:"none",cursor:"pointer",fontSize:14}}>
            <ArrowLeft style={{width:16,height:16}} />
            Chat
          </button>
        </Link>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color:"rgba(255,255,255,0.45)",fontSize:14,fontWeight:500}}>Turbo Live</span>
          {active && (
            <span style={{
              display:"flex",alignItems:"center",gap:4,
              color:"#34d399",fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",
            }}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px #34d399",animation:"pulse 1.4s ease-in-out infinite"}} />
              Live
            </span>
          )}
        </div>

        <button
          onClick={() => setMuted(m => { if (!m) synthRef.current.cancel(); return !m; })}
          style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",padding:8}}
        >
          {muted ? <VolumeX style={{width:18,height:18}} /> : <Volume2 style={{width:18,height:18}} />}
        </button>
      </header>

      {/* Body */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"0 24px 40px",overflow:"hidden"}}>

        {/* Text */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",width:"100%",maxWidth:320,gap:16}}>
          {!active ? (
            <div>
              <p style={{color:"rgba(255,255,255,0.55)",fontSize:22,fontWeight:300,marginBottom:10,letterSpacing:"-0.3px"}}>
                AI Live
              </p>
              <p style={{color:"rgba(255,255,255,0.22)",fontSize:14,lineHeight:1.6}}>
                Hands-free voice conversation.<br />One tap to start — no tapping between turns.
              </p>
            </div>
          ) : (
            <div style={{width:"100%",minHeight:100}}>
              {/* Show AI reply when not currently listening/user-talking */}
              {lastAI && status !== "thinking" && !interim && (
                <p style={{color:"rgba(255,255,255,0.82)",fontSize:18,fontWeight:300,lineHeight:1.55,animation:"txt-up .35s ease"}}>
                  {lastAI.text}
                </p>
              )}
              {/* Show what user just said when thinking */}
              {lastUser && status === "thinking" && !interim && (
                <p style={{color:"rgba(255,255,255,0.35)",fontSize:14,lineHeight:1.5,animation:"txt-up .25s ease"}}>
                  "{lastUser.text}"
                </p>
              )}
              {/* Live interim transcript */}
              {interim && (
                <p style={{color:"rgba(255,255,255,0.5)",fontSize:16,fontStyle:"italic",lineHeight:1.5}}>
                  "{interim}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status label */}
        {active && (
          <p style={{color:"rgba(255,255,255,0.2)",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",fontWeight:600,marginBottom:20}}>
            {labels[status]}
          </p>
        )}

        {/* Orb */}
        <div style={{marginBottom:32}}>
          <Orb status={status} />
        </div>

        {/* Error */}
        {error && (
          <p style={{color:"rgba(251,191,36,0.75)",fontSize:12,textAlign:"center",maxWidth:260,lineHeight:1.5,marginBottom:12}}>
            {error}
          </p>
        )}

        {/* Action */}
        {!active ? (
          <button
            onClick={startSession}
            style={{
              width:"100%",maxWidth:220,padding:"16px 0",borderRadius:16,
              background:"linear-gradient(135deg, #1565C0, #1a9e4a)",
              color:"white",fontWeight:600,fontSize:15,border:"none",cursor:"pointer",
              boxShadow:"0 4px 32px rgba(21,101,192,0.4)",
              transition:"transform .15s",
            }}
            onMouseDown={e => (e.currentTarget.style.transform="scale(0.96)")}
            onMouseUp={e   => (e.currentTarget.style.transform="scale(1)")}
          >
            Start conversation
          </button>
        ) : (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <button
              onClick={endSession}
              style={{
                width:56,height:56,borderRadius:"50%",
                background:"rgba(220,38,38,0.12)",
                border:"1.5px solid rgba(220,38,38,0.35)",
                boxShadow:"0 0 24px rgba(220,38,38,0.12)",
                cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                transition:"transform .15s",
              }}
              onMouseDown={e => (e.currentTarget.style.transform="scale(0.9)")}
              onMouseUp={e   => (e.currentTarget.style.transform="scale(1)")}
            >
              <X style={{width:20,height:20,color:"#f87171"}} />
            </button>
            <p style={{color:"rgba(255,255,255,0.18)",fontSize:10}}>End session</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes txt-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
