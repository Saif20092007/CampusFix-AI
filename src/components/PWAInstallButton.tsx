import React, { useEffect, useState } from 'react';

// Shows an "Install" button only when the browser says the app can be installed (PWA).
// Renders nothing otherwise, so it is safe on every browser.
export const PWAInstallButton: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<any>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!installEvent) return null;

  const install = async () => {
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <button
      type="button"
      onClick={install}
      className="min-h-[36px] px-3 rounded-lg border border-outline-variant text-[13px] font-semibold text-primary hover:bg-surface-container-low"
    >
      Install app
    </button>
  );
};
