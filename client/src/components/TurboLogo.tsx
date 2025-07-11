import turboLogo from "../assets/turboanswer-logo.png";

interface TurboLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export default function TurboLogo({ size = 60, className = "", animated = true }: TurboLogoProps) {
  return (
    <div className={`relative ${className}`}>
      <img 
        src={turboLogo}
        alt="TURBOANSWER AI Robot" 
        className={`object-contain ${animated ? 'animate-pulse hover:animate-bounce' : ''} transition-all duration-300`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
    </div>
  );
}