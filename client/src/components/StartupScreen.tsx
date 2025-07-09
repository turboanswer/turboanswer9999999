import { useEffect, useState } from "react";
import { TurboLogo } from "./TurboLogo";

interface StartupScreenProps {
  onComplete: () => void;
}

export function StartupScreen({ onComplete }: StartupScreenProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("Initializing Turbo Answer...");

  useEffect(() => {
    const loadingSteps = [
      { progress: 20, text: "Loading AI models..." },
      { progress: 40, text: "Connecting to services..." },
      { progress: 60, text: "Preparing voice commands..." },
      { progress: 80, text: "Optimizing performance..." },
      { progress: 100, text: "Ready to assist!" }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < loadingSteps.length) {
        const step = loadingSteps[currentStep];
        setLoadingProgress(step.progress);
        setLoadingText(step.text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-50"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Logo with animation */}
        <div className="mb-8 transform transition-all duration-1000 ease-out">
          <TurboLogo size={120} className="animate-pulse" />
        </div>

        {/* App title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">
            TURBO ANSWER
          </h1>
          <p className="text-purple-300 text-lg font-light">
            Advanced AI Assistant
          </p>
        </div>

        {/* Loading bar */}
        <div className="mb-6 w-80 mx-auto">
          <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>

        {/* Loading text */}
        <p className="text-gray-300 text-sm animate-pulse">
          {loadingText}
        </p>

        {/* Version info */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <p className="text-gray-500 text-xs">
            Version 2.0 • Multi-Model AI Platform
          </p>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-15px) translateX(3px); }
        }
      `}</style>
    </div>
  );
}