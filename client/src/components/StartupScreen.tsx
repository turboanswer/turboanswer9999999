import { useEffect, useState } from "react";
import { TurboLogo } from "./TurboLogo";

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
          <TurboLogo size={120} />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">
            TURBO ANSWER
          </h1>
          <p className="text-purple-300 text-lg font-light">
            Advanced AI Assistant
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