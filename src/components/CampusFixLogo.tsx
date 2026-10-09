import React from 'react';

interface CampusFixLogoProps {
  size?: number;
  className?: string;
  withText?: boolean;
  subtitle?: string;
}

export const CampusFixLogo: React.FC<CampusFixLogoProps> = ({
  size = 36,
  className = '',
  withText = false,
  subtitle,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform active:scale-95"
        aria-label="CampusFix AI Logo"
      >
        <defs>
          <linearGradient id="cfShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          <linearGradient id="cfGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          <linearGradient id="cfSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>

          <filter id="cfShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e3a8a" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Shield Container */}
        <rect x="6" y="6" width="108" height="108" rx="26" fill="url(#cfShieldGrad)" filter="url(#cfShadow)" />
        <rect x="7" y="7" width="106" height="106" rx="25" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" />

        {/* College Portico / Pediment in White */}
        <path d="M60 22 L88 36 H32 Z" fill="#ffffff" fillOpacity="0.95" />
        <rect x="30" y="38" width="60" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.95" />

        {/* Campus Pillars */}
        <rect x="34" y="44" width="6" height="28" rx="2" fill="#ffffff" fillOpacity="0.85" />
        <rect x="48" y="44" width="6" height="28" rx="2" fill="#ffffff" fillOpacity="0.85" />
        <rect x="66" y="44" width="6" height="28" rx="2" fill="#ffffff" fillOpacity="0.85" />
        <rect x="80" y="44" width="6" height="28" rx="2" fill="#ffffff" fillOpacity="0.85" />

        {/* Base Pedestal */}
        <rect x="28" y="74" width="64" height="4" rx="2" fill="#ffffff" fillOpacity="0.95" />

        {/* Dynamic Fix Lightning Bolt in Gold */}
        <path
          d="M66 40 L45 68 H59 L52 98 L78 62 H63 L72 40 Z"
          fill="url(#cfGoldGrad)"
          stroke="#1e3a8a"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* AI Spark Star */}
        <path d="M84 20 Q84 26 90 26 Q84 26 84 32 Q84 26 78 26 Q84 26 84 20 Z" fill="url(#cfSparkGrad)" />
        <circle cx="28" cy="28" r="2.5" fill="#67e8f9" />
      </svg>

      {/* Optional typography lockup */}
      {withText && (
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-[17px] text-on-surface tracking-tight leading-tight flex items-center gap-1">
            CampusFix <span className="text-primary font-black text-[13px] bg-primary/10 px-1.5 py-0.5 rounded-md">AI</span>
          </span>
          {subtitle && (
            <span className="text-[11px] text-on-surface-variant truncate font-medium">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
