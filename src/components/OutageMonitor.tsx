'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Wifi, WifiOff, Navigation, AlertTriangle, Globe, Radio } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface InternetOutage {
  id: string;
  country: string;
  countryCode: string;
  region?: string;
  severity: 'partial' | 'major' | 'total';
  startTime: string;
  affectedUsers: number;
  source: string;
  lat: number;
  lon: number;
  cause?: string;
}

interface GPSJamming {
  id: string;
  location: string;
  lat: number;
  lon: number;
  radius: number;
  severity: 'low' | 'moderate' | 'severe';
  affectedSystems: string[];
  firstDetected: string;
  source: string;
}

function severityColor(sev: string) {
  switch (sev) {
    case 'total': case 'severe': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'major': case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  }
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

export default function OutageMonitor() {
  const [tab, setTab] = useState<'internet' | 'gps'>('internet');

  const { data, isLoading } = useSWR<{
    outages: InternetOutage[];
    gpsJamming: GPSJamming[];
    sources: string[];
  }>('/api/outages', fetcher, { refreshInterval: 120000 });

  const outages = data?.outages || [];
  const jamming = data?.gpsJamming || [];

  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-subtle bg-panel/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <span className="font-mono text-[11px] font-bold tracking-wider text-purple-400">OUTAGE MONITOR</span>
          {(outages.length > 0 || jamming.length > 0) && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">
              {outages.length + jamming.length} ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setTab('internet')}
          className={`flex-1 px-3 py-2 text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 ${
            tab === 'internet'
              ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-400'
              : 'text-text-dim hover:text-white hover:bg-white/5'
          }`}
        >
          <WifiOff size={12} /> INTERNET ({outages.length})
        </button>
        <button
          onClick={() => setTab('gps')}
          className={`flex-1 px-3 py-2 text-[10px] font-mono transition-all flex items-center justify-center gap-1.5 ${
            tab === 'gps'
              ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-400'
              : 'text-text-dim hover:text-white hover:bg-white/5'
          }`}
        >
          <Navigation size={12} /> GPS JAMMING ({jamming.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-2xl">📡</div>
            <div className="text-[9px] text-text-muted mt-2">Scanning outage feeds...</div>
          </div>
        ) : tab === 'internet' ? (
          outages.length === 0 ? (
            <div className="text-center py-8 text-[10px] text-text-muted">No active internet outages</div>
          ) : (
            outages.map(o => (
              <div key={o.id} className="p-2 rounded border bg-elevated/50 border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-text-dim" />
                    <span className="font-mono text-[10px] text-white">{o.country}</span>
                    {o.region && <span className="text-[9px] text-text-dim">({o.region})</span>}
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono ${severityColor(o.severity)}`}>
                    {o.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-[9px] text-text-dim mb-1">
                  {o.cause || 'Cause unknown'}
                </div>
                <div className="flex items-center justify-between text-[8px] font-mono text-text-muted">
                  <span>👥 {(o.affectedUsers / 1000000).toFixed(1)}M affected</span>
                  <span>{timeAgo(o.startTime)}</span>
                </div>
                <div className="mt-1 text-[8px] text-purple-400/70 font-mono">
                  Source: {o.source}
                </div>
              </div>
            ))
          )
        ) : (
          jamming.length === 0 ? (
            <div className="text-center py-8 text-[10px] text-text-muted">No GPS jamming detected</div>
          ) : (
            jamming.map(g => (
              <div key={g.id} className="p-2 rounded border bg-elevated/50 border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Radio size={12} className="text-red-400 animate-pulse" />
                    <span className="font-mono text-[10px] text-white">{g.location}</span>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono ${severityColor(g.severity)}`}>
                    {g.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-text-dim mb-1">
                  <span>📍 {g.lat.toFixed(1)}°, {g.lon.toFixed(1)}°</span>
                  <span>⌀ {g.radius}km</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.affectedSystems.map(sys => (
                    <span key={sys} className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono border border-purple-500/20">
                      {sys}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-[8px] text-purple-400/70 font-mono">
                  Source: {g.source} • {timeAgo(g.firstDetected)}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border-subtle text-[8px] text-text-dim font-mono text-center">
        Sources: NetBlocks, Cloudflare, IODA, OPSGROUP • Update: 2m
      </div>
    </div>
  );
}
