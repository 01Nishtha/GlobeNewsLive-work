'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Wifi, WifiOff, Database, Rss } from 'lucide-react';

interface FeedSource {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'websocket' | 'scraper';
  status: 'syncing' | 'synced' | 'error' | 'idle';
  lastSync: Date;
  nextSync: Date;
  intervalSec: number;
  itemsFetched: number;
  healthScore: number; // 0-100
  errorCount: number;
  latencyMs: number;
}

const MOCK_SOURCES: FeedSource[] = [
  { id: '1', name: 'Reuters World', type: 'rss', status: 'synced', lastSync: new Date(Date.now() - 120 * 1000), nextSync: new Date(Date.now() + 180 * 1000), intervalSec: 300, itemsFetched: 1240, healthScore: 98, errorCount: 0, latencyMs: 45 },
  { id: '2', name: 'BBC Breaking', type: 'rss', status: 'syncing', lastSync: new Date(Date.now() - 60 * 1000), nextSync: new Date(Date.now() + 240 * 1000), intervalSec: 300, itemsFetched: 892, healthScore: 95, errorCount: 1, latencyMs: 67 },
  { id: '3', name: 'GDELT API', type: 'api', status: 'synced', lastSync: new Date(Date.now() - 300 * 1000), nextSync: new Date(Date.now() + 300 * 1000), intervalSec: 600, itemsFetched: 5600, healthScore: 92, errorCount: 2, latencyMs: 340 },
  { id: '4', name: 'USGS Earthquakes', type: 'api', status: 'synced', lastSync: new Date(Date.now() - 180 * 1000), nextSync: new Date(Date.now() + 300 * 1000), intervalSec: 300, itemsFetched: 45, healthScore: 100, errorCount: 0, latencyMs: 120 },
  { id: '5', name: 'Twitter/X OSINT', type: 'scraper', status: 'error', lastSync: new Date(Date.now() - 600 * 1000), nextSync: new Date(Date.now() + 60 * 1000), intervalSec: 120, itemsFetched: 3400, healthScore: 45, errorCount: 12, latencyMs: 2000 },
  { id: '6', name: 'FlightRadar24', type: 'api', status: 'syncing', lastSync: new Date(Date.now() - 30 * 1000), nextSync: new Date(Date.now() + 30 * 1000), intervalSec: 60, itemsFetched: 12400, healthScore: 88, errorCount: 3, latencyMs: 89 },
  { id: '7', name: 'Marine Traffic', type: 'api', status: 'synced', lastSync: new Date(Date.now() - 90 * 1000), nextSync: new Date(Date.now() + 210 * 1000), intervalSec: 300, itemsFetched: 5600, healthScore: 90, errorCount: 1, latencyMs: 156 },
  { id: '8', name: 'Kalshi Markets', type: 'websocket', status: 'synced', lastSync: new Date(Date.now() - 5 * 1000), nextSync: new Date(Date.now() + 5 * 1000), intervalSec: 10, itemsFetched: 8900, healthScore: 99, errorCount: 0, latencyMs: 23 },
  { id: '9', name: 'Dark Web Intel', type: 'scraper', status: 'idle', lastSync: new Date(Date.now() - 3600 * 1000), nextSync: new Date(Date.now() + 7200 * 1000), intervalSec: 3600, itemsFetched: 12, healthScore: 70, errorCount: 5, latencyMs: 4500 },
  { id: '10', name: 'Satellite Imagery', type: 'api', status: 'synced', lastSync: new Date(Date.now() - 600 * 1000), nextSync: new Date(Date.now() + 1800 * 1000), intervalSec: 1800, itemsFetched: 89, healthScore: 85, errorCount: 2, latencyMs: 890 },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'syncing': return <RefreshCw size={12} className="text-accent-blue animate-spin" />;
    case 'synced': return <CheckCircle2 size={12} className="text-accent-green" />;
    case 'error': return <AlertCircle size={12} className="text-accent-red" />;
    default: return <Clock size={12} className="text-white/30" />;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'rss': return <Rss size={10} className="text-orange-400" />;
    case 'api': return <Database size={10} className="text-blue-400" />;
    case 'websocket': return <Wifi size={10} className="text-green-400" />;
    case 'scraper': return <WifiOff size={10} className="text-purple-400" />;
    default: return <Database size={10} />;
  }
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function FeedSyncStatus() {
  const [sources, setSources] = useState(MOCK_SOURCES);
  const [now, setNow] = useState(new Date());
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      // Randomly update some sources
      setSources(prev => prev.map(s => {
        if (Math.random() > 0.9) {
          const statuses: FeedSource['status'][] = ['syncing', 'synced', 'error', 'idle'];
          const newStatus = Math.random() > 0.8 ? statuses[Math.floor(Math.random() * statuses.length)] : s.status;
          return {
            ...s,
            status: newStatus,
            lastSync: newStatus === 'synced' ? new Date() : s.lastSync,
            itemsFetched: newStatus === 'synced' ? s.itemsFetched + Math.floor(Math.random() * 10) : s.itemsFetched,
            latencyMs: Math.max(10, s.latencyMs + (Math.random() - 0.5) * 20),
          };
        }
        return s;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const syncedCount = sources.filter(s => s.status === 'synced').length;
  const syncingCount = sources.filter(s => s.status === 'syncing').length;
  const errorCount = sources.filter(s => s.status === 'error').length;
  const totalItems = sources.reduce((s, src) => s + src.itemsFetched, 0);
  const avgHealth = Math.round(sources.reduce((s, src) => s + src.healthScore, 0) / sources.length);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">FEED SYNC</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/30">{sources.length} sources</span>
          {errorCount > 0 && <span className="text-[9px] font-mono text-red-400">{errorCount} errors</span>}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-3 py-2 border-b border-white/10 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-green">{syncedCount}</div>
          <div className="text-[7px] text-white/30 font-mono">SYNCED</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-blue">{syncingCount}</div>
          <div className="text-[7px] text-white/30 font-mono">SYNCING</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-white">{(totalItems / 1000).toFixed(1)}k</div>
          <div className="text-[7px] text-white/30 font-mono">ITEMS</div>
        </div>
        <div className="text-center">
          <div className={`text-[10px] font-mono ${avgHealth > 80 ? 'text-accent-green' : avgHealth > 50 ? 'text-amber-400' : 'text-red-400'}`}>{avgHealth}%</div>
          <div className="text-[7px] text-white/30 font-mono">HEALTH</div>
        </div>
      </div>

      {/* Source List */}
      <div className="flex-1 overflow-y-auto">
        {sources.map(source => (
          <div key={source.id} className="border-b border-white/5">
            <button
              onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
              {getStatusIcon(source.status)}
              <span className="text-[10px] font-mono text-white truncate flex-1 text-left">{source.name}</span>
              <span className="flex items-center gap-1">
                {getTypeIcon(source.type)}
              </span>
              <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${source.healthScore > 80 ? 'bg-accent-green' : source.healthScore > 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${source.healthScore}%` }}
                />
              </div>
            </button>

            {expandedSource === source.id && (
              <div className="px-3 py-2 bg-white/5 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[7px] text-white/30 font-mono">LAST SYNC</div>
                  <div className="text-[9px] font-mono text-white/60">{formatTimeAgo(source.lastSync)}</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/30 font-mono">NEXT SYNC</div>
                  <div className="text-[9px] font-mono text-white/60">{formatTimeAgo(new Date(source.nextSync.getTime() - 2 * Date.now() + Date.now()))}</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/30 font-mono">INTERVAL</div>
                  <div className="text-[9px] font-mono text-white/60">{source.intervalSec}s</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/30 font-mono">LATENCY</div>
                  <div className="text-[9px] font-mono text-white/60">{source.latencyMs.toFixed(0)}ms</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/30 font-mono">ITEMS FETCHED</div>
                  <div className="text-[9px] font-mono text-white/60">{source.itemsFetched.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/30 font-mono">ERRORS</div>
                  <div className={`text-[9px] font-mono ${source.errorCount > 0 ? 'text-red-400' : 'text-white/60'}`}>{source.errorCount}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
