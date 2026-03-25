type EdenLogoMarkProps = {
  size?: number;
  className?: string;
};

export function EdenLogoMark({ size = 40, className = "" }: EdenLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Eden logo"
    >
      <defs>
        <filter id="eden-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="eden-node-top" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#5dd4d6" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </radialGradient>
        <radialGradient id="eden-node-secondary" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#3ec8ca" />
          <stop offset="100%" stopColor="#0e7b7d" />
        </radialGradient>
      </defs>

      {/* Outer triangle connections — faint */}
      <line x1="20" y1="8" x2="8.5" y2="30" stroke="#2dd4bf" strokeWidth="0.8" strokeOpacity="0.22" strokeLinecap="round" />
      <line x1="20" y1="8" x2="31.5" y2="30" stroke="#2dd4bf" strokeWidth="0.8" strokeOpacity="0.22" strokeLinecap="round" />
      <line x1="8.5" y1="30" x2="31.5" y2="30" stroke="#2dd4bf" strokeWidth="0.8" strokeOpacity="0.16" strokeLinecap="round" />

      {/* Inner hub connections — medium */}
      <line x1="20" y1="8" x2="20" y2="22" stroke="#2dd4bf" strokeWidth="1.2" strokeOpacity="0.55" strokeLinecap="round" />
      <line x1="20" y1="22" x2="8.5" y2="30" stroke="#2dd4bf" strokeWidth="1.2" strokeOpacity="0.45" strokeLinecap="round" />
      <line x1="20" y1="22" x2="31.5" y2="30" stroke="#2dd4bf" strokeWidth="1.2" strokeOpacity="0.45" strokeLinecap="round" />

      {/* Hub center dot */}
      <circle cx="20" cy="22" r="2" fill="#2dd4bf" fillOpacity="0.65" />

      {/* Bottom-left node (consumer) */}
      <circle cx="8.5" cy="30" r="2.8" fill="url(#eden-node-secondary)" fillOpacity="0.85" />

      {/* Bottom-right node (contributor) */}
      <circle cx="31.5" cy="30" r="2.8" fill="url(#eden-node-secondary)" fillOpacity="0.85" />

      {/* Top node (builder) — primary, glowing */}
      <circle cx="20" cy="8" r="4" fill="url(#eden-node-top)" filter="url(#eden-glow)" />
      <circle cx="20" cy="8" r="2.2" fill="white" fillOpacity="0.28" />
    </svg>
  );
}
