import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, Swords, ArrowLeft, ThumbsUp, ChevronRight, Send, Trophy, Zap, Flame, Crown, Shield, Target } from "lucide-react";
import type { DebateSession } from "@shared/schema";

const MODEL_LABELS: Record<string, string> = {
  gemini: "Gemini",
  claude: "Claude",
  openai: "GPT-4o",
  deepseek: "DeepSeek",
};

const MODEL_COLORS: Record<string, string> = {
  gemini: "#4285F4",
  claude: "#D97706",
  openai: "#10B981",
  deepseek: "#8B5CF6",
};

const MODEL_EMOJIS: Record<string, string> = {
  gemini: "💎",
  claude: "🧠",
  openai: "⚡",
  deepseek: "🔮",
};

const FIGHT_INTROS = [
  "ROUND {n} — FIGHT!",
  "ROUND {n} — DING DING DING!",
  "ROUND {n} — LET'S GET IT ON!",
  "ROUND {n} — NO HOLDS BARRED!",
  "ROUND {n} — HERE WE GO AGAIN!",
];

const LOADING_QUIPS = [
  "loading up the verbal artillery...",
  "warming up the roast machine...",
  "sharpening the arguments...",
  "the fighters are preparing their burns...",
  "consulting the book of sick comebacks...",
  "calculating maximum savagery...",
  "both AIs are cracking their knuckles...",
  "the trash talk is being generated...",
];

function getRandomQuip() {
  return LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)];
}

function getRandomIntro(round: number) {
  const intro = FIGHT_INTROS[Math.floor(Math.random() * FIGHT_INTROS.length)];
  return intro.replace("{n}", String(round));
}

export default function DebateArena() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeDebateId, setActiveDebateId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [modelA, setModelA] = useState("gemini");
  const [modelB, setModelB] = useState("claude");
  const [rounds, setRounds] = useState(3);
  const [interjection, setInterjection] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loadingQuip, setLoadingQuip] = useState(getRandomQuip());
  const [visibleMsgCount, setVisibleMsgCount] = useState(0);
  const [showRoundBanner, setShowRoundBanner] = useState<string | null>(null);
  const [prevMsgCount, setPrevMsgCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: debates = [], isLoading } = useQuery<DebateSession[]>({
    queryKey: ['/api/debates'],
  });

  const { data: activeDebate, isLoading: debateLoading } = useQuery({
    queryKey: ['/api/debates', activeDebateId],
    enabled: !!activeDebateId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (!data) return false;
      return data.status === 'active' ? 2000 : false;
    },
  });

  const debate = activeDebate as any;
  const messages = debate?.messages || [];

  useEffect(() => {
    if (messages.length > prevMsgCount && prevMsgCount > 0) {
      const newMsgs = messages.slice(prevMsgCount);
      const newRounds = [...new Set(newMsgs.map((m: any) => m.round))];
      if (newRounds.length > 0) {
        const roundNum = newRounds[0] as number;
        const intro = getRandomIntro(roundNum);
        setShowRoundBanner(intro);
        setTimeout(() => setShowRoundBanner(null), 2500);
      }

      let delay = 0;
      for (let i = prevMsgCount; i < messages.length; i++) {
        const idx = i;
        setTimeout(() => {
          setVisibleMsgCount(idx + 1);
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, delay);
        delay += 800;
      }
    } else if (prevMsgCount === 0 && messages.length > 0) {
      setVisibleMsgCount(messages.length);
    }
    setPrevMsgCount(messages.length);
  }, [messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMsgCount]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/debates', { topic, modelA, modelB, rounds });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/debates'] });
      setActiveDebateId(data.id);
      setTopic("");
      setShowCreate(false);
      setVisibleMsgCount(0);
      setPrevMsgCount(0);
      toast({ title: "Arena is ready! Hit FIGHT to start the battle." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const nextRoundMutation = useMutation({
    mutationFn: async () => {
      setLoadingQuip(getRandomQuip());
      const res = await apiRequest('POST', `/api/debates/${activeDebateId}/next-round`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/debates', activeDebateId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const interjectMutation = useMutation({
    mutationFn: async () => {
      setLoadingQuip(getRandomQuip());
      const res = await apiRequest('POST', `/api/debates/${activeDebateId}/interject`, { question: interjection });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/debates', activeDebateId] });
      setInterjection("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const voteMutation = useMutation({
    mutationFn: async (side: string) => {
      const res = await apiRequest('POST', `/api/debates/${activeDebateId}/vote`, { side });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/debates', activeDebateId] });
      toast({ title: "Vote locked in!" });
    },
  });

  if (activeDebateId && debate) {
    const isActive = debate.status === 'active';
    const isFinished = debate.status === 'completed';
    const totalVotes = (debate.votesA || 0) + (debate.votesB || 0);
    const isFighting = nextRoundMutation.isPending || interjectMutation.isPending;
    const visibleMessages = messages.slice(0, visibleMsgCount);

    return (
      <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-[#1a1a1a]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => { setActiveDebateId(null); setVisibleMsgCount(0); setPrevMsgCount(0); queryClient.invalidateQueries({ queryKey: ['/api/debates'] }); }}
              className="flex items-center gap-2 text-sm text-[#666] hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Exit Arena
            </button>
            <div className="flex items-center gap-3">
              {isActive && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">LIVE</span>
                </div>
              )}
              {isFinished && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">FINISHED</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-20 pb-40">
          <div className="text-center mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent rounded-3xl" />
            <div className="relative py-8">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-3xl mb-2 mx-auto border border-blue-500/20">
                    {MODEL_EMOJIS[debate.modelA]}
                  </div>
                  <span className="text-sm font-bold" style={{ color: MODEL_COLORS[debate.modelA] }}>{MODEL_LABELS[debate.modelA]}</span>
                  <div className="text-[10px] text-[#555] uppercase tracking-widest mt-0.5">Fighter A</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-4xl font-black text-red-500 mb-1 tracking-tighter" style={{ textShadow: '0 0 30px rgba(239,68,68,0.3)' }}>VS</div>
                  <div className="text-[10px] text-[#444] uppercase tracking-widest">
                    Round {debate.currentRound}/{debate.rounds}
                  </div>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/10 flex items-center justify-center text-3xl mb-2 mx-auto border border-orange-500/20">
                    {MODEL_EMOJIS[debate.modelB]}
                  </div>
                  <span className="text-sm font-bold" style={{ color: MODEL_COLORS[debate.modelB] }}>{MODEL_LABELS[debate.modelB]}</span>
                  <div className="text-[10px] text-[#555] uppercase tracking-widest mt-0.5">Fighter B</div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-white/90 max-w-md mx-auto leading-snug">"{debate.topic}"</h2>
            </div>
          </div>

          {showRoundBanner && (
            <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
              <div className="text-5xl font-black text-red-500 animate-bounce" style={{ textShadow: '0 0 60px rgba(239,68,68,0.5), 0 0 120px rgba(239,68,68,0.2)' }}>
                {showRoundBanner}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {visibleMessages.map((msg: any, i: number) => {
              const isFor = msg.side.startsWith('for');
              const isInterject = msg.side.includes('interject');
              const color = isFor ? MODEL_COLORS[debate.modelA] : MODEL_COLORS[debate.modelB];
              const label = isFor ? MODEL_LABELS[debate.modelA] : MODEL_LABELS[debate.modelB];
              const emoji = isFor ? MODEL_EMOJIS[debate.modelA] : MODEL_EMOJIS[debate.modelB];
              const isNew = i >= prevMsgCount - 2;

              const roundMsgs = visibleMessages.filter((m: any) => m.round === msg.round && !m.side.includes('interject'));
              const isFirstInRound = roundMsgs[0]?.id === msg.id;

              return (
                <div key={msg.id || i}>
                  {isFirstInRound && !isInterject && msg.round > 0 && (
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                        <Flame className="h-3 w-3 text-red-400" />
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Round {msg.round}</span>
                        <Flame className="h-3 w-3 text-red-400" />
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                    </div>
                  )}

                  {isInterject && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                        <Target className="h-3 w-3 text-yellow-400" />
                        <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Crowd Question</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                    </div>
                  )}

                  <div className={`flex ${isFor ? 'justify-start' : 'justify-end'} ${isNew ? 'animate-fade-in' : ''}`}>
                    <div className={`max-w-[75%] ${isInterject ? 'max-w-[70%]' : ''}`}>
                      <div className={`rounded-2xl p-4 relative ${isFor
                        ? 'bg-gradient-to-br from-[#0a1628] to-[#0a1020] border border-blue-500/15 rounded-bl-sm'
                        : 'bg-gradient-to-br from-[#1a0f08] to-[#1a0a05] border border-orange-500/15 rounded-br-sm'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">{emoji}</span>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                          {!isInterject && (
                            <span className="text-[10px] text-[#444] uppercase tracking-wider ml-1">
                              {isFor ? '• FOR' : '• AGAINST'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isFighting && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center animate-pulse">
                  <Swords className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <span className="text-xs text-[#666] italic">{loadingQuip}</span>
            </div>
          )}

          {isFinished && debate.summary && (
            <div className="mt-8 rounded-2xl bg-gradient-to-br from-[#1a1500] to-[#0f0d00] border border-yellow-500/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Fight Summary</h3>
                  <p className="text-[10px] text-[#555]">The judges have spoken</p>
                </div>
              </div>
              <div className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{debate.summary}</div>
            </div>
          )}

          {isFinished && (
            <div className="mt-6 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6">
              <h3 className="text-sm font-bold text-center mb-5 uppercase tracking-wider text-[#888]">Who won this fight?</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => voteMutation.mutate('a')} disabled={voteMutation.isPending}
                  className="group py-5 rounded-2xl border border-[#222] hover:border-blue-500/40 transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-center">
                    <div className="text-3xl mb-2">{MODEL_EMOJIS[debate.modelA]}</div>
                    <div className="text-sm font-bold" style={{ color: MODEL_COLORS[debate.modelA] }}>{MODEL_LABELS[debate.modelA]}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <ThumbsUp className="h-3 w-3 text-[#555]" />
                      <span className="text-xs text-[#555]">{debate.votesA || 0}{totalVotes > 0 ? ` (${Math.round(((debate.votesA || 0) / totalVotes) * 100)}%)` : ''}</span>
                    </div>
                  </div>
                </button>
                <button onClick={() => voteMutation.mutate('b')} disabled={voteMutation.isPending}
                  className="group py-5 rounded-2xl border border-[#222] hover:border-orange-500/40 transition-all relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-center">
                    <div className="text-3xl mb-2">{MODEL_EMOJIS[debate.modelB]}</div>
                    <div className="text-sm font-bold" style={{ color: MODEL_COLORS[debate.modelB] }}>{MODEL_LABELS[debate.modelB]}</div>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <ThumbsUp className="h-3 w-3 text-[#555]" />
                      <span className="text-xs text-[#555]">{debate.votesB || 0}{totalVotes > 0 ? ` (${Math.round(((debate.votesB || 0) / totalVotes) * 100)}%)` : ''}</span>
                    </div>
                  </div>
                </button>
              </div>
              {totalVotes > 0 && (
                <div className="mt-4 h-2 rounded-full bg-[#1a1a1a] overflow-hidden flex">
                  <div className="h-full rounded-l-full transition-all duration-500" style={{ width: `${((debate.votesA || 0) / totalVotes) * 100}%`, backgroundColor: MODEL_COLORS[debate.modelA] }} />
                  <div className="h-full rounded-r-full transition-all duration-500" style={{ width: `${((debate.votesB || 0) / totalVotes) * 100}%`, backgroundColor: MODEL_COLORS[debate.modelB] }} />
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {isActive && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-xl border-t border-[#1a1a1a]">
            <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
              {!isFighting && (
                <button onClick={() => nextRoundMutation.mutate()} disabled={isFighting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-sm uppercase tracking-wider hover:from-red-500 hover:to-orange-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 active:scale-[0.98]">
                  <Swords className="h-5 w-5" />
                  {debate.currentRound === 0
                    ? "FIGHT! Start Round 1"
                    : debate.currentRound >= debate.rounds
                      ? "All Rounds Complete"
                      : `NEXT ROUND (${debate.currentRound + 1}/${debate.rounds})`
                  }
                  <Zap className="h-5 w-5" />
                </button>
              )}

              {debate.currentRound > 0 && !isFighting && (
                <div className="flex gap-2">
                  <input value={interjection} onChange={e => setInterjection(e.target.value)}
                    placeholder="Throw a question into the ring..."
                    className="flex-1 px-4 py-3 rounded-xl bg-[#111] border border-[#333] text-sm text-white placeholder-[#555] outline-none focus:border-yellow-500/50 transition-colors"
                    onKeyDown={e => { if (e.key === 'Enter' && interjection.trim()) interjectMutation.mutate(); }}
                  />
                  <button onClick={() => interjectMutation.mutate()} disabled={!interjection.trim() || isFighting}
                    className="px-4 py-3 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-30 border border-yellow-500/20">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setLocation('/chat')} className="text-[#666] hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                <Swords className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-wide">AI Battle Arena</h1>
                <p className="text-xs text-[#555]">Watch AIs fight it out — live, savage, and unfiltered</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-bold uppercase tracking-wider hover:from-red-500 hover:to-orange-400 transition-all shadow-lg shadow-red-500/20">
            New Fight
          </button>
        </div>

        {showCreate && (
          <div className="rounded-2xl bg-[#0a0a0a] border border-red-500/10 p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
            <h3 className="font-black text-sm uppercase tracking-wider mb-5 text-red-400">Set Up The Fight</h3>

            <div className="mb-4">
              <label className="text-xs text-[#666] mb-1.5 block uppercase tracking-wider">What are they fighting about?</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., 'Pineapple belongs on pizza' or 'Tabs vs Spaces'"
                className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-[#222] text-sm text-white placeholder-[#444] outline-none focus:border-red-500/50 transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-[#666] mb-1.5 block uppercase tracking-wider">Fighter A (FOR)</label>
                <select value={modelA} onChange={e => setModelA(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-[#222] text-sm text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer">
                  {Object.entries(MODEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{MODEL_EMOJIS[k]} {v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#666] mb-1.5 block uppercase tracking-wider">Fighter B (AGAINST)</label>
                <select value={modelB} onChange={e => setModelB(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#111] border border-[#222] text-sm text-white outline-none focus:border-orange-500/50 appearance-none cursor-pointer">
                  {Object.entries(MODEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{MODEL_EMOJIS[k]} {v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs text-[#666] mb-2 block uppercase tracking-wider">Rounds</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRounds(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${rounds === n
                      ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/20'
                      : 'bg-[#111] text-[#555] hover:text-white border border-[#222]'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 rounded-xl text-sm text-[#666] hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!topic.trim() || createMutation.isPending || modelA === modelB}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-sm uppercase tracking-wider hover:from-red-500 hover:to-orange-400 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Swords className="h-4 w-4" /> Enter The Arena</>}
              </button>
            </div>
            {modelA === modelB && <p className="text-xs text-red-400 mt-2">Pick two different fighters!</p>}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-red-400" /></div>
        ) : debates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <Swords className="h-10 w-10 text-red-500/30" />
            </div>
            <p className="text-sm text-[#666] mb-1 font-bold">No fights yet</p>
            <p className="text-xs text-[#444]">Create your first AI battle and watch them go at it</p>
          </div>
        ) : (
          <div className="space-y-2">
            {debates.map((d: any) => {
              const dTotalVotes = (d.votesA || 0) + (d.votesB || 0);
              return (
                <button key={d.id} onClick={() => { setActiveDebateId(d.id); setVisibleMsgCount(0); setPrevMsgCount(0); }}
                  className="w-full text-left rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] p-4 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center -space-x-2">
                      <div className="w-9 h-9 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center text-lg z-10">{MODEL_EMOJIS[d.modelA]}</div>
                      <div className="w-9 h-9 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center text-lg">{MODEL_EMOJIS[d.modelB]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate text-white group-hover:text-red-400 transition-colors">{d.topic}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#555]">
                        <span>{MODEL_LABELS[d.modelA]} vs {MODEL_LABELS[d.modelB]}</span>
                        <span>·</span>
                        {d.status === 'completed' ? (
                          <span className="text-yellow-400 font-bold flex items-center gap-1"><Crown className="h-3 w-3" /> Finished</span>
                        ) : d.currentRound === 0 ? (
                          <span className="text-red-400">Not started</span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1"><Flame className="h-3 w-3" /> Round {d.currentRound}/{d.rounds}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#333] group-hover:text-red-400 transition-colors shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
