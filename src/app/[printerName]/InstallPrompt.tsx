'use client';

import { useEffect, useRef, useState } from 'react';

interface InstallPromptProps {
  printerName: string;
  firstPrintiSent: boolean;
}

export default function InstallPrompt({ printerName, firstPrintiSent }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      if (!/android/i.test(navigator.userAgent)) return;
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      deferredPromptRef.current = null;
    }
    setShowPrompt(false);
  };

  if (!showPrompt || !firstPrintiSent) return null;

  return (
    <div id="pwa-installable">
      <div id="first-printi-sent">
        <div id="install-box">
          <p>
            Do you want to install <span style={{ fontStyle: 'italic' }}>{printerName}</span> to your phone to easily send photos to your printi friends from other apps?
          </p>
          <button onClick={handleInstallClick}>Yes!</button>
        </div>
      </div>
    </div>
  );
}
