import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-600/95 text-white text-[12px] font-semibold shadow-lg backdrop-blur-xs animate-fade-in">
      <span className="w-2 h-2 rounded-full bg-amber-200 animate-pulse" />
      <span>Offline Mode — Viewing cached reports & notifications</span>
    </div>
  );
};
