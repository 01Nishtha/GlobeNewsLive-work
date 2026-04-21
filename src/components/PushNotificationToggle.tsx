'use client';

import { Bell, BellOff } from 'lucide-react';

interface Props {
  enabled: boolean;
  onToggle: () => void;
  supported: boolean;
}

export default function PushNotificationToggle({ enabled, onToggle, supported }: Props) {
  if (!supported) return null;

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono transition-colors ${
        enabled ? 'bg-accent-green/20 text-accent-green' : 'bg-elevated text-text-dim'
      }`}
      title={enabled ? 'Push notifications enabled' : 'Enable push notifications'}
    >
      {enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
      <span className="hidden sm:inline">PUSH</span>
    </button>
  );
}
