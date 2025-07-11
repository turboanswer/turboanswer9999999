import { useEffect, useState } from "react";
// Logo integrated directly in component

interface StartupScreenProps {
  onComplete: () => void;
}

export function StartupScreen({ onComplete }: StartupScreenProps) {
  useEffect(() => {
    // Instant startup - no delay or animations
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
      
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <div className="relative">
            <img 
              src="/src/assets/turboanswer-logo.png" 
              alt="TURBOANSWER AI Robot" 
              className="w-32 h-32 object-contain animate-pulse hover:animate-bounce transition-all duration-300 mx-auto"
            />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-ping"></div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2 tracking-wide">
            TURBOANSWER
          </h1>
          <p className="text-cyan-400 text-lg font-medium">
            NEVER STOP INNOVATING
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <p className="text-gray-500 text-xs">
            Version 2.0 • Multi-Model AI Platform
          </p>
        </div>
      </div>
    </div>
  );
}