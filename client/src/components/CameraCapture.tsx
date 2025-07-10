import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Maximize2, Minimize2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onAnalyze: (imageData: string) => void;
  isAnalyzing: boolean;
  language: string;
  onContinuousMode: (enabled: boolean) => void;
  continuousMode: boolean;
}

export default function CameraCapture({ 
  onCapture, 
  onAnalyze, 
  isAnalyzing, 
  language,
  onContinuousMode,
  continuousMode
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const messages = {
    en: {
      startCamera: 'Start Camera',
      stopCamera: 'Stop Camera',
      capture: 'Capture Photo',
      analyzing: 'Analyzing...',
      continuous: 'Continuous Analysis',
      fullscreen: 'Fullscreen',
      minimize: 'Minimize',
      cameraError: 'Camera access denied or not available',
      permissionError: 'Please allow camera access to use this feature'
    },
    es: {
      startCamera: 'Iniciar Cámara',
      stopCamera: 'Detener Cámara',
      capture: 'Capturar Foto',
      analyzing: 'Analizando...',
      continuous: 'Análisis Continuo',
      fullscreen: 'Pantalla Completa',
      minimize: 'Minimizar',
      cameraError: 'Acceso a la cámara denegado o no disponible',
      permissionError: 'Permita el acceso a la cámara para usar esta función'
    },
    fr: {
      startCamera: 'Démarrer Caméra',
      stopCamera: 'Arrêter Caméra',
      capture: 'Capturer Photo',
      analyzing: 'Analyse...',
      continuous: 'Analyse Continue',
      fullscreen: 'Plein Écran',
      minimize: 'Réduire',
      cameraError: 'Accès à la caméra refusé ou non disponible',
      permissionError: 'Veuillez autoriser l\'accès à la caméra pour utiliser cette fonctionnalité'
    }
  };

  const currentMessages = messages[language as keyof typeof messages] || messages.en;

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (continuousMode && isActive) {
      startContinuousAnalysis();
    } else {
      stopContinuousAnalysis();
    }
  }, [continuousMode, isActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera if available
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsActive(true);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      console.error('Camera access error:', err);
      setError(currentMessages.cameraError);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    stopContinuousAnalysis();
    setIsActive(false);
    setIsFullscreen(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    onCapture(imageData);
    onAnalyze(imageData);
  };

  const startContinuousAnalysis = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      if (isActive && !isAnalyzing) {
        captureForAnalysis();
      }
    }, 3000); // Analyze every 3 seconds
  };

  const stopContinuousAnalysis = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const captureForAnalysis = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    context.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.6);
    
    onAnalyze(imageData);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleContinuousMode = () => {
    onContinuousMode(!continuousMode);
  };

  if (!hasPermission && error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 rounded-lg border border-red-500">
        <Camera className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 text-center mb-4">{error}</p>
        <Button 
          onClick={startCamera}
          className="bg-red-600 hover:bg-red-700"
        >
          {currentMessages.startCamera}
        </Button>
      </div>
    );
  }

  return (
    <div className={`camera-capture ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'relative'}`}>
      <div className="flex flex-col space-y-4">
        {/* Camera Controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          {!isActive ? (
            <Button 
              onClick={startCamera}
              className="bg-green-600 hover:bg-green-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              {currentMessages.startCamera}
            </Button>
          ) : (
            <>
              <Button 
                onClick={stopCamera}
                variant="destructive"
              >
                <X className="w-4 h-4 mr-2" />
                {currentMessages.stopCamera}
              </Button>
              
              <Button 
                onClick={captureImage}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isAnalyzing}
              >
                <Camera className="w-4 h-4 mr-2" />
                {isAnalyzing ? currentMessages.analyzing : currentMessages.capture}
              </Button>
              
              <Button 
                onClick={toggleContinuousMode}
                variant={continuousMode ? "default" : "outline"}
                className={continuousMode ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                {currentMessages.continuous}
              </Button>
              
              <Button 
                onClick={toggleFullscreen}
                variant="outline"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>

        {/* Camera View */}
        {isActive && (
          <div className={`relative ${isFullscreen ? 'w-full h-full' : 'w-full max-w-2xl mx-auto'}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full rounded-lg border-2 border-gray-600 ${isFullscreen ? 'h-full object-cover' : 'h-auto'}`}
            />
            
            {/* Analysis Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="bg-white/90 px-4 py-2 rounded-lg text-black font-semibold">
                  {currentMessages.analyzing}
                </div>
              </div>
            )}
            
            {/* Continuous Mode Indicator */}
            {continuousMode && (
              <div className="absolute top-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                LIVE
              </div>
            )}
          </div>
        )}
        
        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}