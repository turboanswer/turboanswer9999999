import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, Swords, ArrowLeft, ThumbsUp, ChevronRight, MessageSquare, Trophy, Sparkles, Send, RotateCcw } from "lucide-react";
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

export default function DebateArena() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeDebateId, setActiveDebateId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [modelA, setModelA] = useState("gemini");
  const [modelB, setModelB] = useState("claude");
  const [rounds, setRounds] = useState(3);
  const [interjection, setInterjection] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: debates = [], isLoading } = useQuery<DebateSession[]>({
    queryKey: ['/api/debates'],
  });

  const { data: activeDebate, isLoading: debateLoading } = useQuery({
    queryKey: ['/api/debates', activeDebateId],
    enabled: !!activeDebateId,
    refetchInterval: false,
  });

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
      toast({ title: "Debate created! Start the first round." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const nextRoundMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/debates/${activeDebateId}/next-round`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/debates', activeDebateId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const interjectMutation = useMutation({
    mutationFn: async () => {
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
      toast({ title: "Vote recorded!" });
    },
  });

  if (activeDebateId && activeDebate) {
    const debate = activeDebate as any;
    const messages = debate.messages || [];
    const isActive = debate.status === 'active';
    const isFinished = debate.status === 'completed';
    const totalVotes = (debate.votesA || 0) + (debate.votesB || 0);

    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button onClick={() => { setActiveDebateId(null); queryClient.invalidateQueries({ queryKey: ['/api/debates'] }); }}
            className="flex items-center gap-2 text-sm text-[#888] hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Debates
          </button>

          <div className="rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Swords className="h-5 w-5 text-red-400" />
              <h1 className="text-xl font-bold">{debate.topic}</h1>
              {isFinished && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Completed</span>}
              {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Round {debate.currentRound}/{debate.rounds}</span>}
            </div>
            <div className="flex items-center gap-4 text-sm text-[#666]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[debate.modelA] }} />
                <span>{MODEL_LABELS[debate.modelA]} (FOR)</span>
              </div>
              <span>vs</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[debate.modelB] }} />
                <span>{MODEL_LABELS[debate.modelB]} (AGAINST)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {messages.map((msg: any, i: number) => {
              const isFor = msg.side.startsWith('for');
              const isInterject = msg.side.includes('interject');
              const color = isFor ? MODEL_COLORS[debate.modelA] : MODEL_COLORS[debate.modelB];
              const label = isFor ? MODEL_LABELS[debate.modelA] : MODEL_LABELS[debate.modelB];

              return (
                <div key={msg.id || i} className={`rounded-xl border p-5 ${isInterject ? 'bg-[#0f0f1a] border-[#2a2a3a]' : 'bg-[#111] border-[#222]'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                    <span className="text-xs text-[#555] uppercase tracking-wider">
                      {isInterject ? 'Response to Moderator' : `Round ${msg.round} · ${isFor ? 'FOR' : 'AGAINST'}`}
                    </span>
                  </div>
                  <div className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                </div>
              );
            })}
          </div>

          {(nextRoundMutation.isPending || interjectMutation.isPending) && (
            <div className="flex items-center justify-center gap-3 py-8 text-[#8ab4f8]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{nextRoundMutation.isPending ? 'AI models are debating...' : 'Processing your question...'}</span>
            </div>
          )}

          {isActive && !nextRoundMutation.isPending && !interjectMutation.isPending && (
            <div className="space-y-4">
              <button onClick={() => nextRoundMutation.mutate()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500/80 to-orange-500/80 text-white font-semibold text-sm hover:from-red-500 hover:to-orange-500 transition-all flex items-center justify-center gap-2">
                <Swords className="h-4 w-4" />
                {debate.currentRound === 0 ? 'Start Debate — Round 1' : `Next Round (${debate.currentRound + 1}/${debate.rounds})`}
              </button>

              {debate.currentRound > 0 && (
                <div className="flex gap-2">
                  <input value={interjection} onChange={e => setInterjection(e.target.value)}
                    placeholder="Ask both debaters a question..."
                    className="flex-1 px-4 py-3 rounded-xl bg-[#111] border border-[#333] text-sm text-white placeholder-[#555] outline-none focus:border-[#8ab4f8]"
                    onKeyDown={e => { if (e.key === 'Enter' && interjection.trim()) interjectMutation.mutate(); }}
                  />
                  <button onClick={() => interjectMutation.mutate()} disabled={!interjection.trim()}
                    className="px-4 py-3 rounded-xl bg-[#222] text-white hover:bg-[#333] transition-colors disabled:opacity-30">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {isFinished && (
            <div className="space-y-4">
              {debate.summary && (
                <div className="rounded-xl bg-[#0a0f1a] border border-[#1a2a3a] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-400">Debate Summary</span>
                  </div>
                  <div className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">{debate.summary}</div>
                </div>
              )}

              <div className="rounded-xl bg-[#111] border border-[#222] p-5">
                <h3 className="text-sm font-semibold mb-4 text-center">Cast Your Vote</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => voteMutation.mutate('a')} disabled={voteMutation.isPending}
                    className="py-3 rounded-xl border border-[#333] hover:border-blue-500/50 transition-all text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[debate.modelA] }} />
                      <span className="text-sm font-semibold">{MODEL_LABELS[debate.modelA]}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-[#666]" />
                      <span className="text-xs text-[#666]">{debate.votesA} votes{totalVotes > 0 ? ` (${Math.round((debate.votesA / totalVotes) * 100)}%)` : ''}</span>
                    </div>
                  </button>
                  <button onClick={() => voteMutation.mutate('b')} disabled={voteMutation.isPending}
                    className="py-3 rounded-xl border border-[#333] hover:border-orange-500/50 transition-all text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MODEL_COLORS[debate.modelB] }} />
                      <span className="text-sm font-semibold">{MODEL_LABELS[debate.modelB]}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-[#666]" />
                      <span className="text-xs text-[#666]">{debate.votesB} votes{totalVotes > 0 ? ` (${Math.round((debate.votesB / totalVotes) * 100)}%)` : ''}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => setLocation('/chat')} className="text-[#888] hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Swords className="h-6 w-6 text-red-400" />
              <h1 className="text-2xl font-bold">AI Debate Arena</h1>
            </div>
            <p className="text-sm text-[#666] ml-8">Watch AI models debate any topic — you moderate</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
            New Debate
          </button>
        </div>

        {showCreate && (
          <div className="rounded-2xl bg-[#111] border border-[#222] p-6 mb-6">
            <h3 className="font-semibold text-sm mb-4">Set Up a Debate</h3>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a debate topic (e.g., 'AI will replace most jobs within 10 years')"
              className="w-full px-4 py-3 rounded-xl bg-black border border-[#333] text-sm text-white placeholder-[#555] outline-none focus:border-[#8ab4f8] mb-3" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-[#888] mb-1.5 block">Arguing FOR</label>
                <select value={modelA} onChange={e => setModelA(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333] text-sm text-white outline-none focus:border-[#8ab4f8] appearance-none cursor-pointer">
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude</option>
                  <option value="openai">GPT-4o</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#888] mb-1.5 block">Arguing AGAINST</label>
                <select value={modelB} onChange={e => setModelB(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black border border-[#333] text-sm text-white outline-none focus:border-[#8ab4f8] appearance-none cursor-pointer">
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                  <option value="openai">GPT-4o</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-[#888] mb-1.5 block">Number of Rounds</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRounds(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${rounds === n ? 'bg-white text-black' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-[#888] hover:bg-white/5">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!topic.trim() || createMutation.isPending}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-30">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Debate"}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#8ab4f8]" /></div>
        ) : debates.length === 0 ? (
          <div className="text-center py-16">
            <Swords className="h-12 w-12 mx-auto mb-4 text-[#333]" />
            <p className="text-sm text-[#888] mb-1">No debates yet</p>
            <p className="text-xs text-[#555]">Create your first AI debate and watch models argue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {debates.map((d: any) => (
              <button key={d.id} onClick={() => setActiveDebateId(d.id)}
                className="w-full text-left rounded-xl bg-[#111] border border-[#222] hover:border-[#333] p-4 transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center shrink-0">
                  <Swords className="h-4 w-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate text-white">{d.topic}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#666]">
                    <span>{MODEL_LABELS[d.modelA]} vs {MODEL_LABELS[d.modelB]}</span>
                    <span>·</span>
                    <span>{d.status === 'completed' ? 'Finished' : `Round ${d.currentRound}/${d.rounds}`}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#444] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
