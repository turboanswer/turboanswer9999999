import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ImageIcon, Download, Loader2, Sparkles, Zap, ArrowLeft,
  ChevronLeft, ChevronRight, X, Clock, Wand2, RefreshCw
} from "lucide-react";

interface GeneratedImage {
  url?: string;
  b64_json?: string;
  dataUrl: string;
}

interface HistoryItem {
  id: number;
  prompt: string;
  images: GeneratedImage[];
  timestamp: Date;
  settings: { size: string; quality: string; count: number };
}

const SIZE_OPTIONS = [
  { label: "Square", value: "1024x1024", icon: "⬛" },
  { label: "Portrait", value: "1024x1536", icon: "▬" },
  { label: "Landscape", value: "1536x1024", icon: "▭" },
  { label: "Auto", value: "auto", icon: "✦" },
];

const QUALITY_OPTIONS = [
  { label: "Fast", value: "low", desc: "Quickest" },
  { label: "Balanced", value: "medium", desc: "Recommended" },
  { label: "HD", value: "high", desc: "Best quality" },
];

const COUNT_OPTIONS = [1, 2, 3, 4, 5];

const STYLE_PRESETS = [
  { label: "Photorealistic", prompt: "photorealistic, highly detailed, 4K quality, professional photography" },
  { label: "Digital Art", prompt: "digital art, vibrant colors, detailed illustration, trending on artstation" },
  { label: "Oil Painting", prompt: "oil painting, classical art style, rich textures, museum quality" },
  { label: "Anime", prompt: "anime style, detailed, vibrant, professional animation" },
  { label: "Cinematic", prompt: "cinematic, dramatic lighting, movie still, epic composition, 8K" },
  { label: "Watercolor", prompt: "watercolor painting, soft colors, artistic brush strokes, delicate" },
  { label: "3D Render", prompt: "3D render, octane render, subsurface scattering, ray tracing, ultra realistic" },
  { label: "Sketch", prompt: "pencil sketch, hand-drawn, detailed linework, artistic" },
];

const PROMPT_IDEAS = [
  "A futuristic city skyline at golden hour with flying vehicles",
  "A majestic dragon perched on a crystal mountain peak",
  "An underwater palace with bioluminescent sea creatures",
  "A cozy cabin in an enchanted autumn forest",
  "A robot astronaut gazing at an alien planet",
  "A magical library with books that float and glow",
  "A neon-lit cyberpunk street market at night",
  "A serene Japanese garden with cherry blossoms",
];

let historyCounter = 0;

export default function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("medium");
  const [count, setCount] = useState(3);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(prev => prev + 100), 100);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const buildFinalPrompt = () => {
    if (!selectedPreset) return prompt.trim();
    const preset = STYLE_PRESETS.find(p => p.label === selectedPreset);
    return preset ? `${prompt.trim()}, ${preset.prompt}` : prompt.trim();
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      startTimer();
      const finalPrompt = buildFinalPrompt();
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, size, quality, count }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate images");
      }
      return response.json();
    },
    onSuccess: (data) => {
      stopTimer();
      const images: GeneratedImage[] = (data.images || []).map((img: any) => ({
        url: img.url,
        b64_json: img.b64_json,
        dataUrl: img.b64_json ? `data:image/png;base64,${img.b64_json}` : img.url,
      }));
      setGeneratedImages(images);
      setSelectedIndex(0);
      const newItem: HistoryItem = {
        id: ++historyCounter,
        prompt: prompt.trim(),
        images,
        timestamp: new Date(),
        settings: { size, quality, count },
      };
      setHistory(prev => [newItem, ...prev].slice(0, 20));
      const serverTime = data.generationTime ? `${(data.generationTime / 1000).toFixed(1)}s` : `${(elapsed / 1000).toFixed(1)}s`;
      toast({ title: `${images.length} image${images.length !== 1 ? "s" : ""} created!`, description: `Generated in ${serverTime}` });
    },
    onError: (error: Error) => {
      stopTimer();
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const handleDownload = (index?: number) => {
    const idx = index ?? selectedIndex;
    const img = generatedImages[idx];
    if (!img) return;
    const link = document.createElement("a");
    link.href = img.dataUrl;
    link.download = `turbo-image-${Date.now()}-${idx + 1}.png`;
    link.click();
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((_, i) => setTimeout(() => handleDownload(i), i * 400));
  };

  const loadFromHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setSize(item.settings.size);
    setQuality(item.settings.quality);
    setCount(item.settings.count);
    setGeneratedImages(item.images);
    setSelectedIndex(0);
    setShowHistory(false);
  };

  const selectedImage = generatedImages[selectedIndex];
  const isGenerating = generateMutation.isPending;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-gray-800 bg-black/95 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
              <Wand2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-none">Image Studio</h1>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Powered by OpenAI</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
            showHistory ? "border-purple-500 bg-purple-900/40 text-purple-300" : "border-gray-700 text-gray-400 hover:border-gray-500"
          }`}
        >
          <Clock size={12} />
          History {history.length > 0 && `(${history.length})`}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-auto">
          <div className="w-full lg:w-[420px] lg:min-w-[420px] border-b lg:border-b-0 lg:border-r border-gray-800 p-4 flex flex-col gap-4 bg-gray-950">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Describe your image</label>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="A futuristic city at sunset with flying cars and neon lights..."
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-600 text-sm min-h-[100px] max-h-[180px] resize-none focus:border-purple-500"
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) generateMutation.mutate(); }}
              />
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_IDEAS.slice(0, 4).map(idea => (
                  <button
                    key={idea}
                    onClick={() => setPrompt(idea)}
                    className="text-[10px] px-2 py-1 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors text-left"
                  >
                    {idea.length > 35 ? idea.slice(0, 35) + "…" : idea}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Style preset</label>
              <div className="grid grid-cols-4 gap-1.5">
                {STYLE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setSelectedPreset(selectedPreset === preset.label ? null : preset.label)}
                    className={`text-[10px] px-2 py-1.5 rounded-lg border text-center transition-all ${
                      selectedPreset === preset.label
                        ? "border-purple-500 bg-purple-900/40 text-purple-300"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Aspect ratio</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSize(opt.value)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${
                      size === opt.value
                        ? "border-pink-500 bg-pink-900/30 text-pink-300"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Quality</label>
              <div className="grid grid-cols-3 gap-1.5">
                {QUALITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setQuality(opt.value)}
                    className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-lg border transition-all ${
                      quality === opt.value
                        ? "border-cyan-500 bg-cyan-900/30 text-cyan-300"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <span className="text-xs font-medium">{opt.label}</span>
                    <span className="text-[9px] text-current opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Number of images</label>
              <div className="flex gap-1.5">
                {COUNT_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                      count === n
                        ? "border-purple-500 bg-purple-900/40 text-purple-300"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!prompt.trim() || isGenerating}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold py-6 text-base shadow-lg shadow-purple-900/30 disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating {count} image{count !== 1 ? "s" : ""}... {(elapsed / 1000).toFixed(1)}s</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate {count} Image{count !== 1 ? "s" : ""}
                  <Zap size={14} className="text-yellow-300" />
                </div>
              )}
            </Button>
            <p className="text-[10px] text-gray-600 text-center">Tip: Press Ctrl+Enter to generate quickly</p>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4 min-h-[400px]">
            {showHistory && history.length > 0 && (
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Recent Generations</h3>
                  <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {history.map(item => (
                    <button
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <img
                        src={item.images[0]?.dataUrl}
                        alt="History thumbnail"
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-700"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{item.prompt}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {item.images.length} image{item.images.length !== 1 ? "s" : ""} · {item.settings.quality} · {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {generatedImages.length === 0 && !isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-600/20 border border-pink-500/30 flex items-center justify-center">
                  <ImageIcon size={40} className="text-pink-400 opacity-60" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Your images will appear here</h2>
                  <p className="text-sm text-gray-500 max-w-xs">Describe what you want to create on the left, then hit Generate</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 max-w-sm w-full">
                  {PROMPT_IDEAS.slice(4).map(idea => (
                    <button
                      key={idea}
                      onClick={() => setPrompt(idea)}
                      className="text-[11px] px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 hover:border-purple-600 hover:text-white text-left transition-colors"
                    >
                      {idea.length > 50 ? idea.slice(0, 50) + "…" : idea}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && generatedImages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 opacity-20 animate-pulse" />
                  <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 opacity-30 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={40} className="text-pink-400 animate-spin" style={{ animationDuration: "3s" }} />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">Creating {count} image{count !== 1 ? "s" : ""}...</p>
                  <p className="text-gray-400 text-sm mt-1">{(elapsed / 1000).toFixed(1)}s elapsed</p>
                  <p className="text-gray-600 text-xs mt-1">Higher quality takes longer</p>
                </div>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="flex-1 flex flex-col gap-4">
                <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900 flex-1 min-h-[300px]">
                  <img
                    src={selectedImage?.dataUrl}
                    alt={`Generated - variation ${selectedIndex + 1}`}
                    className="w-full h-full object-contain max-h-[60vh]"
                  />
                  {generatedImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedIndex(p => (p - 1 + generatedImages.length) % generatedImages.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 backdrop-blur-sm"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setSelectedIndex(p => (p + 1) % generatedImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 backdrop-blur-sm"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm">
                        {selectedIndex + 1} / {generatedImages.length}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => handleDownload()}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 backdrop-blur-sm"
                    title="Download this image"
                  >
                    <Download size={15} />
                  </button>
                </div>

                {generatedImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {generatedImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedIndex(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          i === selectedIndex ? "border-pink-500 scale-105" : "border-gray-700 hover:border-gray-500"
                        }`}
                      >
                        <img src={img.dataUrl} alt={`Variation ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleDownload()}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <Download size={14} className="mr-1.5" /> Download
                  </Button>
                  {generatedImages.length > 1 && (
                    <Button
                      onClick={handleDownloadAll}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      <Download size={14} className="mr-1.5" /> Download All
                    </Button>
                  )}
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                    className="border-purple-700 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30"
                  >
                    <RefreshCw size={14} className="mr-1.5" /> Regenerate
                  </Button>
                  <Button
                    onClick={() => { setGeneratedImages([]); setPrompt(""); setSelectedPreset(null); }}
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                  >
                    <X size={14} className="mr-1.5" /> New
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
