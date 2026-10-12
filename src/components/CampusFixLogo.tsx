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
      {/* Official CampusFix AI Logo PNG Asset */}
      <img
        src="/campusfix-logo.png"
        alt="CampusFix AI Logo"
        width={size}
        height={size}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="shrink-0 object-cover rounded-xl shadow-xs transition-transform active:scale-95"
        draggable={false}
      />

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
