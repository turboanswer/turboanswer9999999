import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, Monitor, Volume2, VolumeX, Eye, Loader2, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onAnalyze: (imageData: string) => void;
  isAnalyzing: boolean;
  language: string;
  onContinuousMode: (enabled: boolean) => void;
  continuousMode: boolean;
}

type SourceMode = 'camera' | 'screen';

export default function CameraCapture({ 
  onCapture, 
  onAnalyze, 
  isAnalyzing: externalAnalyzing, 
  language,
  onContinuousMode,
  continuousMode
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>('camera');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  const [blueDetected, setBlueDetected] = useState(false);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (pendingStream && videoRef.current) {
      videoRef.current.srcObject = pendingStream;
      videoRef.current.play().catch(err => console.error('Video play error:', err));
      setPendingStream(null);
    }
  }, [pendingStream, isActive]);

  useEffect(() => {
    return () => {
      stopStream();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (isActive && continuousMode) {
      startContinuousAnalysis();
    } else {
      stopContinuousAnalysis();
    }
  }, [continuousMode, isActive]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    stopContinuousAnalysis();
    setIsActive(false);
  };

  const startCamera = async () => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setSourceMode('camera');
      setError(null);
      setIsActive(true);
      setPendingStream(stream);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera access.');
    }
  };

  const startScreenShare = async () => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } } as any,
        audio: false
      });
      stream.getVideoTracks()[0].onended = () => {
        stopStream();
      };
      streamRef.current = stream;
      setSourceMode('screen');
      setError(null);
      setIsActive(true);
      setPendingStream(stream);
      toast({ title: "Screen Sharing Active", description: "Mark items in blue to get instant AI analysis and voice answers." });
    } catch (err) {
      console.error('Screen share error:', err);
      setError('Screen sharing was cancelled or denied.');
    }
  };

  const detectBlueHighlight = useCallback((canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let bluePixels = 0;
    const totalPixels = data.length / 4;
    const sampleStep = 8;
    for (let i = 0; i < data.length; i += 4 * sampleStep) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (b > 150 && b > r * 1.5 && b > g * 1.3) {
        bluePixels++;
      }
    }
    const blueRatio = bluePixels / (totalPixels / sampleStep);
    return blueRatio > 0.005;
  }, []);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const langMap: Record<string, string> = { en: 'en', es: 'es', fr: 'fr', de: 'de', it: 'it', pt: 'pt', ja: 'ja', ko: 'ko', zh: 'zh' };
    const langCode = langMap[language] || 'en';
    const preferredVoice = voices.find(v => v.lang.startsWith(langCode) && v.name.toLowerCase().includes('natural'))
      || voices.find(v => v.lang.startsWith(langCode) && v.name.toLowerCase().includes('google'))
      || voices.find(v => v.lang.startsWith(langCode));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const analyzeFrame = useCallback(async (extraPrompt?: string) => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      const hasBlue = detectBlueHighlight(canvas);
      setBlueDetected(hasBlue);

      const imageData = canvas.toDataURL('image/jpeg', 0.7);

      let query = extraPrompt || "What do you see?";
      if (hasBlue) {
        query = "Focus on the content highlighted or marked in BLUE. Read and analyze that specific content. Give the answer directly in 1-2 short sentences.";
      }

      const response = await apiRequest("POST", "/api/analyze-image", {
        imageData,
        query,
        simple: true
      });
      const result = await response.json();
      const analysis = result.description || result.analysis || '';
      
      if (analysis) {
        setLastAnalysis(analysis);
        onAnalyze(imageData);
        if (autoVoice && (hasBlue || extraPrompt)) {
          speakText(analysis);
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, detectBlueHighlight, autoVoice, speakText, onAnalyze]);

  const startContinuousAnalysis = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (isActive && !isAnalyzing) {
        analyzeFrame();
      }
    }, 2500);
  };

  const stopContinuousAnalysis = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    onCapture(imageData);
    analyzeFrame("Describe what you see clearly in 1-2 simple sentences.");
  };

  if (error && !isActive) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-red-900/20 rounded-xl border border-red-800">
        <Camera className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-red-400 text-center text-sm mb-3">{error}</p>
        <div className="flex gap-2">
          <Button onClick={startCamera} size="sm" className="bg-green-600 hover:bg-green-700">
            <Camera className="w-4 h-4 mr-1" /> Camera
          </Button>
          <Button onClick={startScreenShare} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Monitor className="w-4 h-4 mr-1" /> Screen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      {!isActive ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">AI Vision</h3>
          </div>
          <p className="text-zinc-400 text-sm text-center max-w-sm">
            Use your camera or share your screen. Mark anything in blue for instant AI answers read aloud.
          </p>
          <div className="flex gap-3">
            <Button onClick={startCamera} size="lg" className="bg-green-600 hover:bg-green-700 px-6">
              <Camera className="w-5 h-5 mr-2" /> Camera
            </Button>
            <Button onClick={startScreenShare} size="lg" className="bg-blue-600 hover:bg-blue-700 px-6">
              <MonitorPlay className="w-5 h-5 mr-2" /> Share Screen
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full rounded-xl overflow-hidden border-2 border-zinc-700 bg-black" style={{ minHeight: '400px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              style={{ minHeight: '400px', maxHeight: '70vh' }}
            />

            {sourceMode === 'screen' && (
              <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Monitor className="w-3 h-3" /> Screen Share
              </div>
            )}

            {blueDetected && (
              <div className="absolute top-3 right-3 bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                BLUE DETECTED
              </div>
            )}

            {isAnalyzing && (
              <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
              </div>
            )}

            {continuousMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold">
                LIVE
              </div>
            )}
          </div>

          {lastAnalysis && (
            <div className="bg-zinc-800/80 rounded-xl p-3 border border-zinc-700">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-200 leading-relaxed flex-1">{lastAnalysis}</p>
                <button
                  onClick={() => speakText(lastAnalysis)}
                  className="flex-shrink-0 p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                  title="Read aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={captureAndAnalyze} disabled={isAnalyzing} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Eye className="w-4 h-4 mr-1" /> Analyze Now
            </Button>

            <Button onClick={() => onContinuousMode(!continuousMode)} size="sm"
              className={continuousMode ? "bg-red-600 hover:bg-red-700" : "bg-zinc-700 hover:bg-zinc-600"}>
              {continuousMode ? "Stop Live" : "Go Live"}
            </Button>

            {sourceMode === 'camera' ? (
              <Button onClick={startScreenShare} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <MonitorPlay className="w-4 h-4 mr-1" /> Screen
              </Button>
            ) : (
              <Button onClick={startCamera} size="sm" className="bg-green-600 hover:bg-green-700">
                <Camera className="w-4 h-4 mr-1" /> Camera
              </Button>
            )}

            <Button onClick={() => setAutoVoice(!autoVoice)} size="sm"
              className={autoVoice ? "bg-amber-600 hover:bg-amber-700" : "bg-zinc-700 hover:bg-zinc-600"}>
              {autoVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            {isSpeaking && (
              <Button onClick={stopSpeaking} size="sm" variant="destructive">
                <VolumeX className="w-4 h-4 mr-1" /> Stop
              </Button>
            )}

            <Button onClick={stopStream} size="sm" variant="destructive">
              <X className="w-4 h-4 mr-1" /> Close
            </Button>
          </div>

          <p className="text-[11px] text-zinc-500 text-center">
            {sourceMode === 'screen' 
              ? "Highlight text in blue on your screen for instant AI analysis with voice readout"
              : "Point camera at anything. Blue-marked items get auto-analyzed and read aloud"
            }
          </p>
        </>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
