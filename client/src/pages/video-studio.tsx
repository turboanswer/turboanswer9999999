import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Video, Download, Loader2, Sparkles, ArrowLeft,
  Play, Wand2, Clock, Zap, Film, Monitor, Smartphone, Lock, Check, Volume2, VolumeX
} from "lucide-react";

const ASPECT_OPTIONS = [
  { label: "Landscape", value: "16:9", icon: <Monitor className="h-3.5 w-3.5" />, desc: "Best for web & desktop" },
  { label: "Portrait", value: "9:16", icon: <Smartphone className="h-3.5 w-3.5" />, desc: "Best for mobile & shorts" },
];

const DURATION_OPTIONS = [
  { label: "5 seconds", value: 5, icon: <Zap className="h-3.5 w-3.5" /> },
  { label: "8 seconds", value: 8, icon: <Clock className="h-3.5 w-3.5" /> },
];

const PROMPT_IDEAS = [
  "A cinematic aerial shot of a neon-lit city at night with rain reflections",
  "A majestic eagle soaring over mountain peaks with clouds below",
  "Ocean waves crashing against rocky cliffs at golden hour",
  "A timelapse of flowers blooming in a sunlit meadow",
  "A futuristic spaceship flying through a colorful nebula",
  "A serene Japanese garden with falling cherry blossom petals",
  "A wolf howling at the moon on a snowy hilltop",
  "A cozy fireplace in a cabin during a winter snowstorm",
];

const STYLE_PRESETS = [
  { label: "Cinematic", prompt: "cinematic, dramatic lighting, shallow depth of field, film grain" },
  { label: "Nature", prompt: "nature documentary style, vibrant colors, golden hour, 4K quality" },
  { label: "Sci-Fi", prompt: "futuristic, sci-fi aesthetic, epic scale, glowing effects" },
  { label: "Fantasy", prompt: "epic fantasy, magical atmosphere, dramatic lighting, ethereal" },
  { label: "Minimal", prompt: "clean minimal aesthetic, soft lighting, calm and peaceful" },
  { label: "Action", prompt: "high energy, dynamic motion, action-packed, fast movement" },
];

interface HistoryItem {
  id: number;
  prompt: string;
  videoFileId: string;   // server-side file ID — stream via /api/video/file/:id
  aspectRatio: string;
  duration: number;
  model: string;
  hasAudio: boolean;
  timestamp: Date;
}

let histCounter = 0;

export default function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [duration, setDuration] = useState<5 | 8>(5);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollModel, setPollModel] = useState<string>("");
  const [currentVideo, setCurrentVideo] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const { data: subscriptionData, isLoading: subLoading } = useQuery<{ tier: string }>({
    queryKey: ["/api/subscription-status"],
  });

  const isResearch = ['research', 'enterprise'].includes(subscriptionData?.tier || '');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(v => v + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const pollStatus = async (id: string) => {
    try {
      const resp = await fetch(`/api/video/status/${id}`, { credentials: 'include' });
      const text = await resp.text();
      let data: any = {};
      if (text) {
        try { data = JSON.parse(text); } catch {
          // Server returned non-JSON (likely transient gateway error) — retry shortly
          pollTimerRef.current = setTimeout(() => pollStatus(id), 6000);
          return;
        }
      }

      if (data.status === 'completed' && data.videoFileId) {
        stopTimer();
        setIsGenerating(false);
        setJobId(null);
        const item: HistoryItem = {
          id: ++histCounter,
          prompt,
          videoFileId: data.videoFileId,
          aspectRatio,
          duration,
          model: data.model || pollModel,
          hasAudio: !!data.hasAudio,
          timestamp: new Date(),
        };
        setCurrentVideo(item);
        setHistory(prev => [item, ...prev.slice(0, 9)]);
        toast({ title: "Video ready!", description: `Generated with ${data.model || 'Luma'}` });
      } else if (data.status === 'failed') {
        stopTimer();
        setIsGenerating(false);
        setJobId(null);
        toast({ title: "Generation failed", description: data.error || "Unknown error", variant: "destructive" });
      } else {
        // Still processing — poll again in 4s
        pollTimerRef.current = setTimeout(() => pollStatus(id), 4000);
      }
    } catch {
      pollTimerRef.current = setTimeout(() => pollStatus(id), 6000);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentVideo(null);
    startTimer();

    try {
      const resp = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, durationSeconds: duration }),
      });

      const text = await resp.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          stopTimer();
          setIsGenerating(false);
          const snippet = text.slice(0, 140).replace(/<[^>]+>/g, '').trim();
          toast({
            title: `Server error (${resp.status})`,
            description: snippet || `The server returned an unexpected response. Please try again in a moment.`,
            variant: "destructive",
          });
          return;
        }
      }

      if (!resp.ok) {
        stopTimer();
        setIsGenerating(false);
        toast({
          title: "Error",
          description: data.error || data.message || `Request failed (${resp.status}). Please try again.`,
          variant: "destructive",
        });
        return;
      }

      if (!data.jobId) {
        stopTimer();
        setIsGenerating(false);
        toast({
          title: "Error",
          description: "Server did not return a job ID. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setJobId(data.jobId);
      setPollModel(data.model);
      pollTimerRef.current = setTimeout(() => pollStatus(data.jobId), 4000);
    } catch (e: any) {
      stopTimer();
      setIsGenerating(false);
      toast({ title: "Error", description: e.message || "Network error — please check your connection and try again.", variant: "destructive" });
    }
  };

  const handlePreset = (preset: typeof STYLE_PRESETS[0]) => {
    setSelectedPreset(preset.label);
    const base = prompt.replace(/,\s*(cinematic|nature documentary|futuristic|epic fantasy|clean minimal|high energy)[^,]*/gi, '').trim();
    setPrompt(base ? `${base}, ${preset.prompt}` : preset.prompt);
  };

  const handleIdea = (idea: string) => setPrompt(idea);

  const videoUrl = (item: HistoryItem) => `/api/video/file/${item.videoFileId}`;

  const downloadVideo = async (item: HistoryItem) => {
    try {
      const resp = await fetch(videoUrl(item), { credentials: 'include' });
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `turbo-video-${item.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message || "Could not save video", variant: "destructive" });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#030014] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 border-b ${isDark ? 'bg-[#030014]/90 backdrop-blur-xl border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className={`h-8 px-2 gap-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <Film className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">Video Studio</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
              Luma Dream Machine
            </span>
          </div>
        </div>
      </div>

      {/* Loading state while subscription is being fetched */}
      {subLoading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
        </div>
      )}

      {/* Upgrade gate — shown for non-Research/Enterprise users */}
      {!subLoading && !isResearch && (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className={`rounded-3xl border-2 p-10 ${isDark ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-slate-950/60' : 'border-indigo-300 bg-gradient-to-b from-indigo-50 to-white shadow-2xl shadow-indigo-100'}`}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Video Studio is a<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Research Plan</span> Feature
            </h2>
            <p className={`text-sm mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              AI video generation with Luma Dream Machine is exclusive to Research and Enterprise subscribers. Upgrade to unlock the Video Studio and generate stunning AI videos from text prompts.
            </p>

            <div className="space-y-3 mb-8 text-left">
              {[
                "Generate videos up to 9 seconds with Luma Dream Machine",
                "Landscape (16:9) & portrait (9:16) aspect ratios",
                "Style presets: cinematic, nature, sci-fi, fantasy & more",
                "Download generated videos as MP4",
                "Plus all Research plan features — Matrix AI on every message",
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? 'bg-indigo-500/25' : 'bg-indigo-100'}`}>
                    <Check className="h-3 w-3 text-indigo-400" />
                  </div>
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{f}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Link href="/subscribe">
                <Button className="w-full h-12 rounded-xl font-bold text-base bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:from-indigo-500 hover:via-violet-500 hover:to-cyan-500 shadow-xl shadow-indigo-500/30">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Research — $30/mo
                </Button>
              </Link>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>7-day free trial · Cancel anytime · No charge during trial</p>
              <Link href="/chat">
                <Button variant="ghost" size="sm" className={`w-full h-9 rounded-xl text-xs ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                  Back to Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main studio — only shown for Research/Enterprise users */}
      {!subLoading && isResearch && <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">

        {/* Left: controls */}
        <div className="space-y-4">
          {/* Prompt */}
          <div className={`rounded-2xl p-5 border ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prompt</label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              className={`rounded-xl text-sm resize-none min-h-[100px] ${isDark ? 'bg-white/[0.04] border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300'}`}
              rows={4}
            />

            {/* Style presets */}
            <div className="mt-3">
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Style</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      selectedPreset === p.label
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : isDark ? 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-white hover:border-violet-500/40' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-violet-50 hover:border-violet-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt ideas */}
            <div className="mt-3">
              <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Ideas</p>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {PROMPT_IDEAS.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => handleIdea(idea)}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? 'border-white/[0.05] bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.05]' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-violet-50 hover:text-violet-700'}`}
                  >
                    <Wand2 className="h-2.5 w-2.5 inline mr-1.5 opacity-60" />{idea}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className={`rounded-2xl p-5 border ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="mb-4">
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Aspect Ratio</p>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAspectRatio(opt.value as any)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-xs font-medium transition-all ${
                      aspectRatio === opt.value
                        ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                        : isDark ? 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-violet-500/40' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                    <span className={`text-[10px] opacity-70`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Duration</p>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value as any)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      duration === opt.value
                        ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                        : isDark ? 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-violet-500/40' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${isDark ? 'bg-violet-500/10 border-violet-500/30' : 'bg-violet-50 border-violet-300'}`}>
            <Sparkles className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <div className={`text-xs font-semibold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>Powered by Luma Dream Machine</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Cinematic AI video. Be vivid in your prompt — describe motion, lighting, mood, and camera angle.
              </div>
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full h-12 rounded-xl font-bold text-base bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500 shadow-xl shadow-violet-500/25 disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating… {formatTime(elapsed)}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>


          {isGenerating && (
            <div className={`rounded-xl p-3 border text-xs ${isDark ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                <span className="font-semibold">{pollModel || 'Luma'} is generating your video…</span>
              </div>
              <p className="opacity-70">Video generation takes 30–120 seconds. You can wait here or come back.</p>
            </div>
          )}
        </div>

        {/* Right: preview + history */}
        <div className="space-y-4">
          {/* Main preview */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04]">
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview</span>
              {currentVideo && (
                <Button
                  onClick={() => downloadVideo(currentVideo)}
                  size="sm"
                  className="h-8 px-3 gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download MP4
                </Button>
              )}
            </div>

            <div className={`flex items-center justify-center ${aspectRatio === '9:16' ? 'min-h-[480px]' : 'min-h-[320px]'} p-6`}>
              {currentVideo ? (
                <div className="w-full">
                  <video
                    src={videoUrl(currentVideo)}
                    controls
                    autoPlay
                    loop
                    className={`rounded-xl shadow-2xl max-h-[460px] max-w-full ${aspectRatio === '9:16' ? 'w-auto mx-auto' : 'w-full'}`}
                    style={{ aspectRatio: currentVideo.aspectRatio }}
                  />
                  <div className="flex items-center gap-2 mt-2 justify-center flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                      {currentVideo.model}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${currentVideo.hasAudio ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700' : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                      {currentVideo.hasAudio ? <><Volume2 className="h-3 w-3" /> With Audio</> : <><VolumeX className="h-3 w-3" /> Silent</>}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                      {currentVideo.duration}s · {currentVideo.aspectRatio}
                    </span>
                  </div>
                </div>
              ) : isGenerating ? (
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 opacity-20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 flex items-center justify-center">
                      <Film className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Generating your video…</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatTime(elapsed)} elapsed</p>
                  <div className="mt-3 w-48 mx-auto h-1 rounded-full overflow-hidden bg-white/10">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 animate-pulse" style={{ width: `${Math.min(99, (elapsed / 90) * 100)}%`, transition: 'width 1s linear' }} />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                    <Video className={`h-9 w-9 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                  </div>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your video will appear here</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Enter a prompt and click Generate</p>
                </div>
              )}
            </div>

            {currentVideo && (
              <div className={`px-5 py-3 border-t ${isDark ? 'border-white/[0.04]' : 'border-gray-100'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold mr-2 ${isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                    {currentVideo.model}
                  </span>
                  {currentVideo.prompt}
                </p>
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className={`rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="px-5 py-4 border-b border-white/[0.04]">
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Clock className="h-4 w-4 inline mr-1.5 opacity-60" />History
                </span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentVideo(item)}
                    className={`relative group rounded-xl overflow-hidden border transition-all hover:scale-[1.02] ${
                      currentVideo?.id === item.id
                        ? isDark ? 'border-violet-500 ring-1 ring-violet-500/40' : 'border-violet-400 ring-1 ring-violet-400/40'
                        : isDark ? 'border-white/10 hover:border-violet-500/30' : 'border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    <video
                      src={videoUrl(item)}
                      muted
                      loop
                      className="w-full h-20 object-cover"
                      style={{ aspectRatio: item.aspectRatio }}
                      onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={e => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                    <div className={`px-2 py-1.5 ${isDark ? 'bg-black/40' : 'bg-white/80'}`}>
                      <p className={`text-[10px] truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
}
