import turboLogo from "../assets/turboanswer-logo.png";

interface TurboLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export default function TurboLogo({ size = 60, className = "" }: TurboLogoProps) {
  return (
    <div className={`relative ${className}`}>
      <img 
        src={turboLogo}
        alt="TURBOANSWER AI Robot" 
        className="object-contain transition-all duration-300"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
}