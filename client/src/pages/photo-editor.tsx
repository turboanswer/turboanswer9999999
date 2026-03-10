import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Wand2, Upload, Download, Sparkles, ImageIcon,
  Loader2, Lock, X, ZoomIn, RefreshCw, Camera, Pencil, Crown
} from "lucide-react";

const ASPECT_RATIOS = [
  { label: "Square", value: "1:1", icon: "⬛" },
  { label: "Portrait", value: "9:16", icon: "▬" },
  { label: "Landscape", value: "16:9", icon: "▭" },
  { label: "3:4", value: "3:4", icon: "▮" },
];

const STYLE_PRESETS = [
  "Photorealistic, 4K, professional photo",
  "Cinematic, dramatic lighting, movie still",
  "Digital art, vibrant, trending on ArtStation",
  "Oil painting, classical style, museum quality",
  "Anime style, detailed, vibrant",
  "3D render, Octane, ray tracing",
  "Watercolor, soft colors, artistic",
  "Minimalist, clean, modern",
];

const EDIT_EXAMPLES = [
  "Remove the person on the left",
  "Change the background to a beach at sunset",
  "Add fairy lights around the scene",
  "Make it look like it's raining",
  "Remove all people from the photo",
  "Change the sky to a dramatic stormy sky",
  "Add a mountain range in the background",
  "Make everything black and white except the subject",
];

function EnterpriseLock() {
  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="h-10 w-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">Research Plan Required</h2>
        <p className="text-gray-400 mb-6">Photo Editor is available on the Research plan ($30/month) and Enterprise plan ($100/month).</p>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-2">
          {["AI text-to-image generation","AI photo editing — remove/add anything","Place yourself anywhere in the world","Unlimited generations","Available on Research & Enterprise"].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="h-2.5 w-2.5 text-amber-400" />
              </div>
              {f}
            </div>
          ))}
        </div>
        <Link href="/pricing">
          <Button className="w-full h-12 font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black">
            Upgrade to Research — $30/mo
          </Button>
        </Link>
        <Link href="/chat">
          <Button variant="ghost" className="w-full mt-2 text-gray-500 hover:text-gray-300">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Chat
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PhotoEditor() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"generate" | "edit" | "placeme">("generate");

  const [genPrompt, setGenPrompt] = useState("");
  const [genAspect, setGenAspect] = useState("1:1");
  const [genResult, setGenResult] = useState<{ imageData: string; mimeType: string } | null>(null);

  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editResult, setEditResult] = useState<{ imageData: string; mimeType: string } | null>(null);

  const [placeFile, setPlaceFile] = useState<File | null>(null);
  const [placePreview, setPlacePreviev] = useState<string | null>(null);
  const [placeScene, setPlaceScene] = useState("");
  const [placeResult, setPlaceResult] = useState<{ imageData: string; mimeType: string } | null>(null);

  const genFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const placeFileRef = useRef<HTMLInputElement>(null);


  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/photo-editor/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: genPrompt, aspectRatio: genAspect }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      return data;
    },
    onSuccess: (data) => setGenResult(data),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editFile) throw new Error('No image uploaded');
      const b64 = await fileToBase64(editFile);
      const res = await fetch('/api/photo-editor/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instruction: editInstruction, imageData: b64, mimeType: editFile.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');
      return data;
    },
    onSuccess: (data) => setEditResult(data),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const placeMutation = useMutation({
    mutationFn: async () => {
      if (!placeFile) throw new Error('No photo uploaded');
      const b64 = await fileToBase64(placeFile);
      const instruction = `Take the person from this photo and realistically place them in the following scene: ${placeScene}. Make it look completely natural and photorealistic, as if they were actually there. Match the lighting, perspective and shadows.`;
      const res = await fetch('/api/photo-editor/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instruction, imageData: b64, mimeType: placeFile.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      return data;
    },
    onSuccess: (data) => setPlaceResult(data),
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback((file: File, type: 'edit' | 'placeme') => {
    const url = URL.createObjectURL(file);
    if (type === 'edit') { setEditFile(file); setEditPreview(url); setEditResult(null); }
    else { setPlaceFile(file); setPlacePreviev(url); setPlaceResult(null); }
  }, []);

  const downloadImage = (data: string, mime: string) => {
    const link = document.createElement('a');
    link.href = `data:${mime};base64,${data}`;
    link.download = `turbo-image-${Date.now()}.png`;
    link.click();
  };


  const TABS = [
    { id: 'generate', label: 'Generate', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'edit', label: 'Edit Photo', icon: <Pencil className="h-4 w-4" /> },
    { id: 'placeme', label: 'Place Me', icon: <Camera className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-4 py-3 flex items-center gap-4">
        <Link href="/chat">
          <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4285F4, #EA4335)' }}>
            <ImageIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-none">Photo Editor</h1>
            <p className="text-xs text-gray-500 mt-0.5">Powered by GPT Image · Gemini AI</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
          <Sparkles className="h-3 w-3" /> Free for All
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06] flex px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">

        {/* ── GENERATE TAB ── */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Describe your image</label>
                <Textarea
                  value={genPrompt}
                  onChange={e => setGenPrompt(e.target.value)}
                  placeholder="A futuristic city at golden hour with flying cars and neon lights..."
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 resize-none h-28 focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Style presets</label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_PRESETS.map(p => (
                    <button key={p} onClick={() => setGenPrompt(prev => prev ? `${prev}, ${p}` : p)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors">
                      {p.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Aspect ratio</label>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map(r => (
                    <button key={r.value} onClick={() => setGenAspect(r.value)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        genAspect === r.value
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-white/[0.03] border-white/10 text-gray-500 hover:text-gray-300'
                      }`}>
                      <div className="text-lg">{r.icon}</div>
                      <div className="text-xs mt-0.5">{r.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!genPrompt.trim() || generateMutation.isPending}
                className="w-full h-12 font-bold text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500"
              >
                {generateMutation.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating image...</> : <><Wand2 className="h-5 w-5 mr-2" />Generate Image</>}
              </Button>
            </div>

            <div className="flex items-center justify-center">
              {genResult ? (
                <div className="w-full">
                  <img
                    src={`data:${genResult.mimeType};base64,${genResult.imageData}`}
                    alt="Generated"
                    className="w-full rounded-2xl shadow-2xl"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => downloadImage(genResult.imageData, genResult.mimeType)}
                      variant="outline" className="flex-1 border-white/10 text-gray-300 hover:bg-white/5">
                      <Download className="h-4 w-4 mr-2" />Download
                    </Button>
                    <Button onClick={() => setGenResult(null)} variant="outline"
                      className="border-white/10 text-gray-500 hover:bg-white/5">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-gray-600">
                  <Wand2 className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Your generated image will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EDIT TAB ── */}
        {activeTab === 'edit' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Upload photo to edit</label>
                <input ref={editFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'edit')} />
                {editPreview ? (
                  <div className="relative">
                    <img src={editPreview} alt="Original" className="w-full rounded-xl max-h-48 object-cover" />
                    <button onClick={() => { setEditFile(null); setEditPreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => editFileRef.current?.click()}
                    className="w-full h-40 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-500/40 hover:text-gray-300 transition-colors">
                    <Upload className="h-8 w-8" />
                    <span className="text-sm">Click to upload image</span>
                    <span className="text-xs">JPG, PNG, WEBP supported</span>
                  </button>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">What should I do to it?</label>
                <Textarea
                  value={editInstruction}
                  onChange={e => setEditInstruction(e.target.value)}
                  placeholder="Remove the person on the left, change the background to a tropical beach..."
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 resize-none h-24 focus:border-blue-500/50"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {EDIT_EXAMPLES.slice(0,4).map(ex => (
                    <button key={ex} onClick={() => setEditInstruction(ex)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-gray-500 hover:text-gray-200 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => editMutation.mutate()}
                disabled={!editFile || !editInstruction.trim() || editMutation.isPending}
                className="w-full h-12 font-bold text-base bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500"
              >
                {editMutation.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Editing photo...</> : <><Pencil className="h-5 w-5 mr-2" />Edit Photo</>}
              </Button>
            </div>

            <div className="flex items-center justify-center">
              {editResult ? (
                <div className="w-full">
                  <img
                    src={`data:${editResult.mimeType};base64,${editResult.imageData}`}
                    alt="Edited"
                    className="w-full rounded-2xl shadow-2xl"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => downloadImage(editResult.imageData, editResult.mimeType)}
                      variant="outline" className="flex-1 border-white/10 text-gray-300 hover:bg-white/5">
                      <Download className="h-4 w-4 mr-2" />Download
                    </Button>
                    <Button onClick={() => setEditResult(null)} variant="outline"
                      className="border-white/10 text-gray-500 hover:bg-white/5">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-gray-600">
                  <Pencil className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Edited image appears here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PLACE ME TAB ── */}
        {activeTab === 'placeme' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-300 mb-1 flex items-center gap-2">
                  <Camera className="h-4 w-4" /> How to use Place Me
                </h3>
                <p className="text-xs text-blue-300/70 leading-relaxed">Upload a clear photo of yourself, then describe where you want to appear. Gemini AI will place you there realistically.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Upload your photo</label>
                <input ref={placeFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'placeme')} />
                {placePreview ? (
                  <div className="relative">
                    <img src={placePreview} alt="Your photo" className="w-full rounded-xl max-h-48 object-cover" />
                    <button onClick={() => { setPlaceFile(null); setPlacePreviev(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => placeFileRef.current?.click()}
                    className="w-full h-40 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-500/40 hover:text-gray-300 transition-colors">
                    <Camera className="h-8 w-8" />
                    <span className="text-sm">Upload your photo</span>
                    <span className="text-xs">A clear photo works best</span>
                  </button>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">Where do you want to go?</label>
                <Textarea
                  value={placeScene}
                  onChange={e => setPlaceScene(e.target.value)}
                  placeholder="Standing on top of Mount Everest at sunrise, with dramatic clouds below..."
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-gray-600 resize-none h-24 focus:border-blue-500/50"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Eiffel Tower at night","Times Square NYC","Tropical beach sunset","Space station window","Amazon rainforest","Mars surface"].map(ex => (
                    <button key={ex} onClick={() => setPlaceScene(ex)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-gray-500 hover:text-gray-200 transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => placeMutation.mutate()}
                disabled={!placeFile || !placeScene.trim() || placeMutation.isPending}
                className="w-full h-12 font-bold text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              >
                {placeMutation.isPending ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Placing you there...</> : <><ZoomIn className="h-5 w-5 mr-2" />Place Me There</>}
              </Button>
            </div>

            <div className="flex items-center justify-center">
              {placeResult ? (
                <div className="w-full">
                  <img
                    src={`data:${placeResult.mimeType};base64,${placeResult.imageData}`}
                    alt="Placed"
                    className="w-full rounded-2xl shadow-2xl"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => downloadImage(placeResult.imageData, placeResult.mimeType)}
                      variant="outline" className="flex-1 border-white/10 text-gray-300 hover:bg-white/5">
                      <Download className="h-4 w-4 mr-2" />Download
                    </Button>
                    <Button onClick={() => setPlaceResult(null)} variant="outline"
                      className="border-white/10 text-gray-500 hover:bg-white/5">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-gray-600">
                  <Camera className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Your placed photo appears here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
