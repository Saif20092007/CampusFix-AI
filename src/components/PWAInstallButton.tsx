import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="h-8 px-2.5 rounded-lg bg-primary text-on-primary text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-xs cursor-pointer"
        title="Install CampusFix AI App"
      >
        <span className="material-symbols-outlined text-[16px]">install_mobile</span>
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="h-8 px-2.5 rounded-lg bg-surface-container text-on-surface text-[12px] font-medium flex items-center gap-1.5 border border-outline/20 hover:bg-surface-container-high transition-colors cursor-pointer"
          title="Install on iPhone / iPad"
        >
          <span className="material-symbols-outlined text-[16px]">install_mobile</span>
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest border border-surface-container p-5 shadow-2xl text-on-surface space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold">Install CampusFix AI</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed">
                To install this app on your iPhone or iPad:
              </p>
              <div className="space-y-2 text-[13px] bg-surface-container p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">ios_share</span>
                  <span>1. Tap the <strong>Share</strong> button in Safari toolbar.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">add_box</span>
                  <span>2. Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-10 rounded-xl bg-primary text-on-primary font-medium text-[13px] mt-2"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
