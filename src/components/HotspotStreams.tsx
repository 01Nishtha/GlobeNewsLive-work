'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tv, Maximize2, Minimize2, Volume2, VolumeX, ExternalLink, RefreshCw } from 'lucide-react';

// Fresh IDs scraped directly from each channel's /live page — 24/7 news streams
const HOTSPOT_STREAMS = [
  {
    id: 'mideast',
    name: 'MIDDLE EAST',
    region: 'Iran • Israel • Gaza',
    icon: '🔥',
    color: '#ff2244',
    channels: [
      { name: 'Al Jazeera EN', embedId: 'gCNeDWCI0vo', directUrl: 'https://www.youtube.com/@aljazeeraenglish/streams' },
      { name: 'Al Jazeera AR', embedId: 'N8xxOD0nT1Y', directUrl: 'https://www.youtube.com/@aljazeera/streams' },
    ]
  },
  {
    id: 'ukraine',
    name: 'UKRAINE / EAST EUROPE',
    region: 'Russia • Baltics',
    icon: '🇺🇦',
    color: '#0057b7',
    channels: [
      { name: 'DW News', embedId: 'LuKwFajn37U', directUrl: 'https://www.youtube.com/@dwnews/streams' },
      { name: 'TRT World', embedId: '1VUhRQpz_9o', directUrl: 'https://www.youtube.com/@trtworld/streams' },
    ]
  },
  {
    id: 'asia',
    name: 'ASIA-PACIFIC',
    region: 'Taiwan • Korea • Japan',
    icon: '🌏',
    color: '#00aaff',
    channels: [
      { name: 'NHK World', embedId: 'f0lYkdA-Gtw', directUrl: 'https://www.youtube.com/@nhkworld/streams' },
      { name: 'CNA', embedId: 'XWq5kBlakcQ', directUrl: 'https://www.youtube.com/@CNA/streams' },
    ]
  },
  {
    id: 'europe',
    name: 'EUROPE / GLOBAL',
    region: 'France • UK • EU',
    icon: '🇪🇺',
    color: '#00ff88',
    channels: [
      { name: 'France 24', embedId: 'Ap-UM1O9RBU', directUrl: 'https://www.youtube.com/@France24_en/streams' },
      { name: 'CBC News', embedId: '5vfaDsMhCF4', directUrl: 'https://www.youtube.com/@CBCNews/streams' },
    ]
  }
];

interface StreamProps {
  hotspot: typeof HOTSPOT_STREAMS[0];
  channelIndex: number;
  isMuted: boolean;
  isExpanded: boolean;
  onExpand: () => void;
}

function StreamPlayer({ hotspot, channelIndex, isMuted, isExpanded, onExpand }: StreamProps) {
  const channel = hotspot.channels[channelIndex] || hotspot.channels[0];
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const embedUrl = `https://www.youtube.com/embed/${channel.embedId}?autoplay=1&mute=${isMuted ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&controls=1&enablejsapi=1`;

  // Timeout fallback: if iframe hasn't loaded in 12s, assume it's broken
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    loadTimerRef.current = setTimeout(() => {
      if (!isLoaded) {
        setHasError(true);
      }
    }, 12000);
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.embedId, retryKey]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
    setRetryKey(k => k + 1);
  }, []);

  return (
    <div className={`relative bg-black rounded overflow-hidden ${isExpanded ? 'col-span-2 row-span-2' : ''}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{hotspot.icon}</span>
            <div>
              <div className="text-[9px] font-bold text-white">{hotspot.name}</div>
              <div className="text-[8px] text-gray-400">{channel.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: hotspot.color }}
            />
            <span className="text-[8px] text-white">LIVE</span>
          </div>
        </div>
      </div>

      {/* Video or Error */}
      {hasError ? (
        <div className="aspect-video flex items-center justify-center bg-[#0a0a0f]">
          <div className="text-center px-4">
            <div className="text-lg mb-2">📡</div>
            <div className="text-[10px] text-gray-400 mb-1">Stream unavailable</div>
            <div className="text-[9px] text-gray-500 mb-3">{channel.name} may be offline</div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
              <a
                href={channel.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Open
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-video relative">
          {!isLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-[1]">
              <RefreshCw className="w-5 h-5 text-white/50 animate-spin mb-2" />
              <span className="text-[9px] text-white/40">Loading {channel.name}...</span>
            </div>
          )}
          <iframe
            key={`${hotspot.id}-${channelIndex}-${retryKey}`}
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => {
              setIsLoaded(true);
              setHasError(false);
              if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
            }}
            onError={() => {
              setHasError(true);
              if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
            }}
          />
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <span className="text-[8px] text-gray-400">{hotspot.region}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRetry}
              className="p-1 hover:bg-white/20 rounded"
              title="Reload stream"
            >
              <RefreshCw className="w-3 h-3 text-white" />
            </button>
            <a
              href={channel.directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-white/20 rounded"
            >
              <ExternalLink className="w-3 h-3 text-white" />
            </a>
            <button onClick={onExpand} className="p-1 hover:bg-white/20 rounded">
              {isExpanded ? <Minimize2 className="w-3 h-3 text-white" /> : <Maximize2 className="w-3 h-3 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HotspotStreams() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [expandedStream, setExpandedStream] = useState<string | null>(null);
  const [channelIndices, setChannelIndices] = useState<Record<string, number>>({
    mideast: 0,
    ukraine: 0,
    asia: 0,
    europe: 0
  });

  const cycleChannel = (hotspotId: string) => {
    setChannelIndices(prev => ({
      ...prev,
      [hotspotId]: (prev[hotspotId] + 1) % 2
    }));
  };

  return (
    <div className="glass-panel overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        className="w-full px-3 py-2 border-b border-border-subtle bg-gradient-to-r from-red-500/10 to-transparent flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-accent-red" />
          <span className="font-mono text-[11px] font-bold tracking-wider text-white">HOTSPOT STREAMS</span>
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red">
            <span className="w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse" />
            4 LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className={`p-1 rounded ${isMuted ? 'text-gray-500' : 'text-white bg-white/10'}`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-2">
          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-1">
            {HOTSPOT_STREAMS.map(hotspot => (
              <StreamPlayer
                key={hotspot.id}
                hotspot={hotspot}
                channelIndex={channelIndices[hotspot.id]}
                isMuted={isMuted}
                isExpanded={expandedStream === hotspot.id}
                onExpand={() => setExpandedStream(expandedStream === hotspot.id ? null : hotspot.id)}
              />
            ))}
          </div>

          {/* Channel switcher */}
          <div className="grid grid-cols-4 gap-1 mt-2">
            {HOTSPOT_STREAMS.map(hotspot => (
              <button
                key={hotspot.id}
                onClick={() => cycleChannel(hotspot.id)}
                className="text-[8px] text-center py-1 px-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                {hotspot.icon} {hotspot.channels[channelIndices[hotspot.id]].name}
              </button>
            ))}
          </div>

          {/* Quick links */}
          <div className="flex items-center justify-center gap-3 mt-2 text-[8px]">
            <a href="https://www.youtube.com/@aljazeeraenglish/streams" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">AJE</a>
            <a href="https://www.youtube.com/@dwnews/streams" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">DW</a>
            <a href="https://www.youtube.com/@nhkworld/streams" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">NHK</a>
            <a href="https://www.youtube.com/@France24_en/streams" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">F24</a>
          </div>
        </div>
      )}
    </div>
  );
}
