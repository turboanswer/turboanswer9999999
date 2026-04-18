import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Send, ArrowLeft, Sparkles, Crown, X } from "lucide-react";
import TurboLogo from "@/components/TurboLogo";

const TRIAL_LIMIT = 5;
const SOFT_PROMPT_AT = 4;
const STORAGE_KEY = "turbo_trial_count";

function getTrialCount(): number {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10); } catch { return 0; }
}

function incrementTrialCount(): number {
  const next = getTrialCount() + 1;
  localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}

interface TrialMessage {
  role: "user" | "assistant";
  content: string;
}

export default function TrialChat() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<TrialMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [trialCount, setTrialCount] = useState(getTrialCount);
  const [showSignupWall, setShowSignupWall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const remaining = TRIAL_LIMIT - trialCount;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (trialCount >= TRIAL_LIMIT) {
      setShowSignupWall(true);
    }
  }, [trialCount]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    if (trialCount >= TRIAL_LIMIT) {
      setShowSignupWall(true);
      return;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/trial/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setShowSignupWall(true);
          setIsTyping(false);
          return;
        }
        throw new Error(data.message || "Something went wrong");
      }

      const newCount = incrementTrialCount();
      setTrialCount(newCount);
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "What is quantum computing?",
    "Write a short poem about the ocean",
    "Explain machine learning simply",
    "What are the planets in our solar system?",
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white relative">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg active:bg-white/10">
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <TurboLogo size={28} animated={false} />
        <div className="flex-1">
          <span className="text-sm font-semibold">TurboAnswer</span>
          <span className="text-xs text-gray-500 ml-2">Trial</span>
        </div>
        {trialCount >= SOFT_PROMPT_AT && (
          <button
            onClick={() => setLocation("/register")}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-white active:opacity-80"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
          >
            Sign up
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-6 p-4 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2), transparent)" }}>
              <TurboLogo size={56} animated={true} />
            </div>
            <h2 className="text-xl font-bold mb-2 bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #a78bfa, #06b6d4)", WebkitBackgroundClip: "text" }}
            >
              Welcome to TurboAnswer
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Ask anything. Get a clear answer.
            </p>
            <div className="w-full space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-white/10 text-sm text-gray-300 active:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white rounded-br-md"
                  : "bg-gray-800/80 text-gray-100 rounded-bl-md border border-white/5"
              }`}
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="mb-4 flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gray-800/80 border border-white/5">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 border-t border-white/10 bg-black/90 backdrop-blur-md px-4 py-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {trialCount >= TRIAL_LIMIT ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-400 mb-2">Trial questions used up</p>
            <Link href="/register">
              <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm active:bg-purple-700">
                <Crown size={16} /> Create Free Account
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500/50"
              style={{ maxHeight: 100 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-3 rounded-xl bg-purple-600 text-white disabled:opacity-40 active:bg-purple-700 transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      {showSignupWall && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSignupWall(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border-t border-white/10 px-6 pt-8 pb-10 text-center"
            style={{
              background: "linear-gradient(180deg, #1e1b4b 0%, #0f0a2e 100%)",
              paddingBottom: "max(40px, env(safe-area-inset-bottom))",
              animation: "slideUp 0.4s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSignupWall(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-500 active:bg-white/10"
            >
              <X size={20} />
            </button>

            <div className="flex justify-center mb-5">
              <div className="p-3 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))" }}>
                <Crown size={36} className="text-amber-400" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">You're Out of Trial Questions</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Create a free account to keep chatting with TurboAnswer. It's quick, free, and gives you daily questions plus all the features.
            </p>

            <div className="space-y-3">
              <Link href="/register">
                <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-bold text-base"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                >
                  <Sparkles size={18} /> Sign Up Free
                </span>
              </Link>
              <Link href="/login">
                <span className="flex items-center justify-center w-full py-3 rounded-xl text-gray-300 font-medium text-sm border border-white/10 active:bg-white/5">
                  Already have an account? Sign in
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
