import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LiveCameraFeedProps {
  language: string;
  onAnalysisResult: (analysis: string) => void;
  voiceEnabled: boolean;
}

export default function LiveCameraFeed({ 
  language, 
  onAnalysisResult, 
  voiceEnabled 
}: LiveCameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [lastAnalysis, setLastAnalysis] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'es' ? 'es-ES' : 
                       language === 'fr' ? 'fr-FR' : 
                       language === 'de' ? 'de-DE' : 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript.trim()) {
          setCurrentQuestion(finalTranscript.trim());
          analyzeCurrentFrame(finalTranscript.trim());
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, [language]);

  // Start camera stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        // Start continuous analysis every 3 seconds
        intervalRef.current = setInterval(() => {
          if (!isAnalyzing) {
            analyzeCurrentFrame('What do you see?');
          }
        }, 3000);
        
        toast({
          title: "Camera Started",
          description: "Live AI analysis is now active. Ask questions about what you see!",
        });
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Access Failed",
        description: "Please allow camera access to use live vision features.",
        variant: "destructive",
      });
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setIsAnalyzing(false);
    setAnalysisCount(0);
    
    toast({
      title: "Camera Stopped",
      description: "Live AI analysis has been disabled.",
    });
  };

  // Capture current frame and analyze
  const analyzeCurrentFrame = async (question: string = 'What do you see?') => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send to AI for analysis
      const response = await apiRequest("POST", "/api/analyze-live-camera", {
        imageData,
        question,
        language,
        context: lastAnalysis ? `Previous observation: ${lastAnalysis}` : ''
      });
      
      const result = await response.json();
      
      if (result.analysis) {
        setLastAnalysis(result.analysis);
        setAnalysisCount(prev => prev + 1);
        onAnalysisResult(result.analysis);
        
        // Speak the analysis if voice is enabled
        if (voiceEnabled && result.analysis) {
          speakText(result.analysis);
        }
      }
      
    } catch (error) {
      console.error('Live analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Text-to-speech function
  const speakText = (text: string) => {
    if ('speechSynthesis' in window && voiceEnabled) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Set language-appropriate voice
      const voices = window.speechSynthesis.getVoices();
      const languageVoice = voices.find(voice => 
        voice.lang.includes(language === 'es' ? 'es' : 
                           language === 'fr' ? 'fr' : 
                           language === 'de' ? 'de' : 'en')
      );
      
      if (languageVoice) {
        utterance.voice = languageVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="flex flex-col space-y-4 bg-zinc-900 rounded-lg p-4 border border-zinc-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Live AI Vision</h3>
          {isStreaming && (
            <Badge variant="outline" className="bg-green-900 text-green-300 border-green-600">
              LIVE
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {analysisCount > 0 && (
            <Badge variant="outline" className="bg-blue-900 text-blue-300 border-blue-600">
              {analysisCount} analyses
            </Badge>
          )}
          
          {isAnalyzing && (
            <Badge variant="outline" className="bg-yellow-900 text-yellow-300 border-yellow-600">
              Analyzing...
            </Badge>
          )}
        </div>
      </div>

      {/* Video Display */}
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 bg-black rounded-lg object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 rounded-lg">
            <div className="text-center">
              <Camera className="w-12 h-12 text-zinc-500 mx-auto mb-2" />
              <p className="text-zinc-400">Click Start Camera to begin live AI vision</p>
            </div>
          </div>
        )}
        
        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Current Question Display */}
      {currentQuestion && (
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-600">
          <p className="text-sm text-zinc-300">
            <span className="font-medium text-purple-400">Question:</span> {currentQuestion}
          </p>
        </div>
      )}

      {/* Last Analysis Display */}
      {lastAnalysis && (
        <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-600 max-h-32 overflow-y-auto">
          <p className="text-sm text-zinc-300">
            <span className="font-medium text-blue-400">AI Vision:</span> {lastAnalysis}
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-3">
        {/* Camera Control */}
        <Button
          onClick={isStreaming ? stopCamera : startCamera}
          variant={isStreaming ? "destructive" : "default"}
          size="sm"
          className="flex items-center space-x-2"
        >
          {isStreaming ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span>{isStreaming ? 'Stop Camera' : 'Start Camera'}</span>
        </Button>

        {/* Voice Recognition Control */}
        {isStreaming && (
          <Button
            onClick={toggleListening}
            variant={isListening ? "destructive" : "outline"}
            size="sm"
            className="flex items-center space-x-2"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Stop Listening' : 'Ask Question'}</span>
          </Button>
        )}

        {/* Voice Output Control */}
        {isSpeaking && (
          <Button
            onClick={stopSpeaking}
            variant="destructive"
            size="sm"
            className="flex items-center space-x-2"
          >
            <VolumeX className="w-4 h-4" />
            <span>Stop Speaking</span>
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-zinc-500 text-center">
        {!isStreaming ? (
          "Start camera for live AI vision analysis"
        ) : !isListening ? (
          "Click 'Ask Question' and speak to interact with what you see"
        ) : (
          "🎤 Listening... Ask about what you see in the camera"
        )}
      </div>
    </div>
  );
}