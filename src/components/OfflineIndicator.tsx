'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-accent-orange/90 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <WifiOff className="w-4 h-4" />
      <span className="text-[11px] font-medium">You&apos;re offline. Cached data available.</span>
    </div>
  );
}
