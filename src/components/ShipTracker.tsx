'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Anchor, Navigation, AlertTriangle, Droplets, Package, Flame, Ship as ShipIcon, ChevronDown, ChevronUp } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Ship {
  mmsi: string;
  name: string;
  type: string;
  flag: string;
  lat: number;
  lon: number;
  speed: number;
  course: number;
  destination?: string;
  eta?: string;
  cargo?: string;
  status: 'underway' | 'anchored' | 'moored' | 'not-under-command';
  risk?: 'low' | 'medium' | 'high' | 'critical';
}

const REGIONS = [
  { id: 'hormuz', name: 'HORMUZ', risk: 'critical', oil: '17.4M bpd' },
  { id: 'redsea', name: 'RED SEA', risk: 'high', note: 'Houthi zone' },
  { id: 'suez', name: 'SUEZ', risk: 'medium', trade: '12%' },
  { id: 'taiwan', name: 'TAIWAN STRAIT', risk: 'high' },
  { id: 'malacca', name: 'MALACCA', risk: 'low', trade: '25%' },
  { id: 'persian', name: 'PERSIAN GULF', risk: 'high', oil: '24M bpd' },
];

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  tanker: { icon: <Droplets size={10} />, color: 'text-amber-400', label: 'Tanker' },
  lng: { icon: <Flame size={10} />, color: 'text-cyan-400', label: 'LNG' },
  container: { icon: <Package size={10} />, color: 'text-emerald-400', label: 'Container' },
  bulk: { icon: <ShipIcon size={10} />, color: 'text-gray-400', label: 'Bulk' },
  cargo: { icon: <ShipIcon size={10} />, color: 'text-gray-400', label: 'Cargo' },
  military: { icon: <AlertTriangle size={10} />, color: 'text-red-400', label: 'Military' },
};

function riskColor(risk?: string) {
  switch (risk) {
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'high': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  }
}

export default function ShipTracker() {
  const [region, setRegion] = useState('hormuz');
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data, isLoading } = useSWR<{
    region: { name: string; risk: string; dailyTankers?: number; dailyShips?: number; oilMbpd?: number; tradePct?: number };
    ships: Ship[];
    stats: { total: number; byType: Record<string, number>; byStatus: Record<string, number>; atRisk: number };
    timestamp: number;
  }>(`/api/ships?region=${region}${filterType ? `&type=${filterType}` : ''}`, fetcher, { refreshInterval: 60000 });

  const ships = data?.ships || [];
  const stats = data?.stats;
  const regionInfo = data?.region;

  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-panel/50 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🚢</span>
          <span className="font-mono text-[11px] font-bold tracking-wider text-cyan-400">SHIP TRACKER</span>
          {regionInfo && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${riskColor(regionInfo.risk)}`}>
              {regionInfo.risk.toUpperCase()}
            </span>
          )}
          {stats && stats.atRisk > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono animate-pulse">
              {stats.atRisk} AT RISK
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-text-dim" /> : <ChevronDown size={14} className="text-text-dim" />}
      </button>

      {isExpanded && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Region tabs */}
          <div className="flex flex-wrap gap-1 p-2 border-b border-border-subtle">
            {REGIONS.map(r => (
              <button
                key={r.id}
                onClick={() => { setRegion(r.id); setFilterType(null); }}
                className={`px-2 py-1 rounded text-[9px] font-mono transition-all ${
                  region === r.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-text-dim hover:text-white hover:bg-white/5'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Region stats bar */}
          {regionInfo && (
            <div className="px-3 py-2 border-b border-border-subtle flex flex-wrap gap-3 text-[9px] font-mono text-text-dim">
              {regionInfo.dailyTankers && <span>🛢️ {regionInfo.dailyTankers} tankers/day</span>}
              {regionInfo.dailyShips && <span>🚢 {regionInfo.dailyShips} ships/day</span>}
              {regionInfo.oilMbpd && <span>⛽ {regionInfo.oilMbpd}M bpd</span>}
              {regionInfo.tradePct && <span>📊 {regionInfo.tradePct}% global trade</span>}
            </div>
          )}

          {/* Type filter + stats */}
          {stats && (
            <div className="px-3 py-2 border-b border-border-subtle">
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.entries(stats.byType).filter(([,c]) => c > 0).map(([type, count]) => {
                  const meta = TYPE_META[type] || TYPE_META.bulk;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(filterType === type ? null : type)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono transition-all ${
                        filterType === type
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-white/5 text-text-dim hover:bg-white/10'
                      }`}
                    >
                      <span className={meta.color}>{meta.icon}</span>
                      <span className="uppercase">{type}</span>
                      <span className="text-white/50">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 text-[9px] font-mono">
                <span className="text-emerald-400">● {stats.byStatus.underway || 0} underway</span>
                <span className="text-amber-400">● {stats.byStatus.anchored || 0} anchored</span>
                <span className="text-red-400">● {stats.byStatus.incidents || 0} incidents</span>
              </div>
            </div>
          )}

          {/* Ship list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin text-2xl">🚢</div>
                <div className="text-[9px] text-text-muted mt-2">Scanning AIS...</div>
              </div>
            ) : ships.length === 0 ? (
              <div className="text-center py-8 text-[10px] text-text-muted">No vessels in region</div>
            ) : (
              ships.map(ship => {
                const meta = TYPE_META[ship.type] || TYPE_META.bulk;
                const isIncident = ship.status === 'not-under-command';
                return (
                  <div
                    key={ship.mmsi}
                    className={`px-2 py-1.5 rounded border transition-all ${
                      isIncident
                        ? 'bg-red-500/10 border-red-500/30'
                        : ship.risk === 'high' || ship.risk === 'critical'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-elevated/50 border-transparent hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={meta.color}>{meta.icon}</span>
                        <span className={`font-mono text-[10px] truncate ${isIncident ? 'text-red-400 font-bold' : 'text-white'}`}>
                          {ship.name}
                        </span>
                        {isIncident && <AlertTriangle size={10} className="text-red-400 flex-shrink-0" />}
                      </div>
                      <span className="text-[8px] text-text-dim font-mono flex-shrink-0 ml-2">
                        {ship.speed > 0 ? `${ship.speed.toFixed(1)}kts` : <Anchor size={10} />}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[8px] text-text-dim font-mono">
                      <span>{ship.flag}</span>
                      {ship.destination && <span>→ {ship.destination}</span>}
                      {ship.cargo && <span className="text-text-muted">({ship.cargo})</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-border-subtle text-[8px] text-text-dim font-mono text-center">
            AIS via simulated feeds • Update: 60s
          </div>
        </div>
      )}
    </div>
  );
}
