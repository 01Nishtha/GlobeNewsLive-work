'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (installed || !deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs bg-elevated border border-accent-green/30 rounded-lg shadow-lg p-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold text-white mb-0.5">📥 Install GlobeNews Live</div>
          <div className="text-[10px] text-text-muted">
            Add to your home screen for offline access and faster alerts.
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/10 text-text-dim"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={handleInstall}
        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-accent-green/20 text-accent-green hover:bg-accent-green/30 text-[10px] font-mono transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    </div>
  );
}
