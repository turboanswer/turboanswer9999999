interface TurboLogoProps {
  size?: number;
  className?: string;
}

export function TurboLogo({ size = 64, className = "" }: TurboLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        className="drop-shadow-lg"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle 
          cx="100" 
          cy="100" 
          r="95" 
          fill="url(#bgGradient)" 
          stroke="url(#logoGradient)" 
          strokeWidth="2"
        />
        
        {/* Main lightning bolt symbol */}
        <path 
          d="M120 60L80 100h20l-12 40 32-40h-20z" 
          fill="url(#logoGradient)" 
          stroke="white" 
          strokeWidth="1.5"
        />
        
        {/* Orbiting dots representing AI processing */}
        <circle cx="70" cy="70" r="3" fill="url(#logoGradient)" opacity="0.8">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 100 100;360 100 100"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="130" cy="70" r="3" fill="url(#logoGradient)" opacity="0.6">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="120 100 100;480 100 100"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="130" cy="130" r="3" fill="url(#logoGradient)" opacity="0.8">
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="240 100 100;600 100 100"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Text elements */}
        <text 
          x="100" 
          y="155" 
          textAnchor="middle" 
          className="fill-white text-xs font-bold tracking-wider"
          style={{ fontSize: '14px' }}
        >
          TURBO
        </text>
        <text 
          x="100" 
          y="170" 
          textAnchor="middle" 
          className="fill-purple-300 text-xs"
          style={{ fontSize: '10px' }}
        >
          ANSWER
        </text>
      </svg>
    </div>
  );
}