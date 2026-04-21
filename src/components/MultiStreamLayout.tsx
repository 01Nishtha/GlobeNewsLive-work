'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Maximize2, Minimize2, Volume2, VolumeX, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

const STREAMS = [
  {
    id: 'mideast',
    name: 'MIDDLE EAST',
    region: 'Iran • Israel • Gaza',
    icon: '🔥',
    color: '#ff2244',
    embedId: 'bNyUyrR0PHo', // Al Jazeera English - very reliable
    directUrl: 'https://www.youtube.com/watch?v=bNyUyrR0PHo',
  },
  {
    id: 'ukraine',
    name: 'UKRAINE / EUROPE',
    region: 'Eastern Front',
    icon: '🇺🇦',
    color: '#0057b7',
    embedId: '9Auq9mYxFEE', // Sky News - reliable
    directUrl: 'https://www.youtube.com/watch?v=9Auq9mYxFEE',
  },
  {
    id: 'asia',
    name: 'ASIA-PACIFIC',
    region: 'Taiwan • Korea • Japan',
    icon: '🌏',
    color: '#00aaff',
    embedId: 'f0lYkdA-Gtw', // NHK World Japan
    directUrl: 'https://www.youtube.com/watch?v=f0lYkdA-Gtw',
  },
  {
    id: 'global',
    name: 'GLOBAL',
    region: 'World News',
    icon: '🌍',
    color: '#00ff88',
    embedId: 'xTCpZ-7-_70', // BBC News - generally reliable
    directUrl: 'https://www.youtube.com/watch?v=xTCpZ-7-_70',
  }
];

interface Props {
  onClose: () => void;
}

export default function MultiStreamLayout({ onClose }: Props) {
  const [muted, setMuted] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({});
  const [showFallback, setShowFallback] = useState<Record<string, boolean>>({});

  const visibleStreams = expandedId 
    ? STREAMS.filter(s => s.id === expandedId)
    : STREAMS;

  const refreshStream = useCallback((id: string) => {
    setReloadKeys(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setShowFallback(prev => ({ ...prev, [id]: false }));
  }, []);

  useEffect(() => {
    // Show fallback hint after 10s for each stream
    const timers: NodeJS.Timeout[] = [];
    visibleStreams.forEach(stream => {
      const timer = setTimeout(() => {
        setShowFallback(prev => ({ ...prev, [stream.id]: true }));
      }, 10000);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [visibleStreams, expandedId]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-elevated border-b border-border-default">
        <div className="flex items-center gap-3">
          <span className="text-accent-red font-mono text-sm font-bold tracking-wider">📺 MULTI-STREAM</span>
          <span className="text-[10px] text-text-muted">{STREAMS.length} Live Feeds</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuted(!muted)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${muted ? 'text-text-dim' : 'text-accent-green'}`}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{muted ? 'MUTED' : 'AUDIO'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-red/20 text-accent-red hover:bg-accent-red/30 text-[10px] font-mono"
          >
            <X className="w-3.5 h-3.5" />
            CLOSE
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={`flex-1 p-2 gap-2 grid ${expandedId ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {visibleStreams.map(stream => (
          <div 
            key={`${stream.id}-${reloadKeys[stream.id] || 0}`} 
            className="relative bg-black rounded-lg overflow-hidden border border-white/10 flex flex-col"
          >
            {/* Stream Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/90 to-transparent px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{stream.icon}</span>
                <div>
                  <div className="text-[11px] font-bold text-white">{stream.name}</div>
                  <div className="text-[9px] text-gray-400">{stream.region}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: stream.color }} />
                <span className="text-[9px] text-white font-mono">LIVE</span>
                <a
                  href={stream.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-white/20 rounded text-white"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setExpandedId(expandedId === stream.id ? null : stream.id)}
                  className="p-1 hover:bg-white/20 rounded ml-1"
                  title={expandedId === stream.id ? 'Minimize' : 'Maximize'}
                >
                  {expandedId === stream.id ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>

            {/* Fallback Overlay */}
            {showFallback[stream.id] && (
              <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center text-center p-4">
                <AlertTriangle className="w-8 h-8 text-accent-orange mb-2" />
                <div className="text-white text-sm font-bold mb-1">Stream not loading?</div>
                <div className="text-text-muted text-[11px] mb-3 max-w-xs">
                  This feed may be unavailable in your region or temporarily offline.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshStream(stream.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-green/20 text-accent-green hover:bg-accent-green/30 text-[10px] font-mono"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                  <a
                    href={stream.directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 text-[10px] font-mono"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open on YouTube
                  </a>
                </div>
              </div>
            )}

            {/* Video Embed */}
            <div className="flex-1 min-h-0">
              <iframe
                src={`https://www.youtube.com/embed/${stream.embedId}?autoplay=1&mute=${muted ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&controls=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={stream.name}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom hint */}
      {!expandedId && (
        <div className="px-4 py-1 bg-elevated border-t border-border-default text-center flex items-center justify-center gap-3">
          <span className="text-[9px] text-text-muted">
            If a stream shows &quot;unavailable&quot;, click <ExternalLink className="w-3 h-3 inline" /> to watch on YouTube
          </span>
          <button
            onClick={() => STREAMS.forEach(s => refreshStream(s.id))}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[9px] text-text-dim"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh all
          </button>
        </div>
      )}
    </div>
  );
}
