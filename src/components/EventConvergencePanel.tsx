'use client';

import { useState, useEffect } from 'react';
import { Target, ArrowUpRight, ArrowDownRight, Minus, MapPin, Zap, Shield, TrendingUp, CloudRain, Radio, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvergenceSignal {
  id: string;
  type: 'military' | 'economic' | 'disaster' | 'cyber' | 'diplomatic' | 'market';
  label: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  region: string;
}

interface ConvergenceEvent {
  id: string;
  title: string;
  score: number; // 0-100
  trend: 'escalating' | 'stable' | 'de-escalating';
  signals: ConvergenceSignal[];
  assessment: string;
  location?: { lat: number; lon: number; label: string };
  affectedRegions: string[];
  firstDetected: string;
  lastUpdated: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EVENTS: ConvergenceEvent[] = [
  {
    id: 'conv-1',
    title: 'Strait of Hormuz Crisis Cluster',
    score: 87,
    trend: 'escalating',
    signals: [
      { id: 's1', type: 'military', label: 'IRGC naval exercises announced', severity: 'high', timestamp: '2h ago', region: 'Persian Gulf' },
      { id: 's2', type: 'economic', label: 'Oil futures spike +4.2%', severity: 'high', timestamp: '3h ago', region: 'Global' },
      { id: 's3', type: 'diplomatic', label: 'US sanctions on Iranian shipping firms', severity: 'critical', timestamp: '5h ago', region: 'Iran' },
      { id: 's4', type: 'market', label: 'Tanker rates (TD3C) up 18%', severity: 'medium', timestamp: '4h ago', region: 'Persian Gulf' },
      { id: 's5', type: 'cyber', label: 'Port authority systems probed', severity: 'medium', timestamp: '6h ago', region: 'UAE' },
      { id: 's6', type: 'military', label: 'US Carrier Group repositioning', severity: 'high', timestamp: '1h ago', region: 'Gulf of Oman' },
    ],
    assessment: 'Six signal streams converging on Strait of Hormuz. Military + economic + diplomatic escalation forming a feedback loop. Oil market sensitivity elevated. Historical correlation: similar patterns preceded 2019 tanker attacks (72% confidence).',
    location: { lat: 26.5, lon: 56.5, label: 'Strait of Hormuz' },
    affectedRegions: ['Iran', 'UAE', 'Saudi Arabia', 'Global Oil Markets'],
    firstDetected: '6h ago',
    lastUpdated: '12m ago',
  },
  {
    id: 'conv-2',
    title: 'Taiwan Semiconductor Supply Risk',
    score: 64,
    trend: 'stable',
    signals: [
      { id: 's7', type: 'military', label: 'PLA air incursions: 12 aircraft', severity: 'medium', timestamp: '8h ago', region: 'Taiwan ADIZ' },
      { id: 's8', type: 'economic', label: 'TSMC export license review', severity: 'high', timestamp: '12h ago', region: 'Taiwan' },
      { id: 's9', type: 'market', label: 'NVDA down 2.1% on supply fears', severity: 'medium', timestamp: '4h ago', region: 'NASDAQ' },
      { id: 's10', type: 'diplomatic', label: 'US-Taiwan trade talks stalled', severity: 'medium', timestamp: '1d ago', region: 'Washington' },
    ],
    assessment: 'Four-stream convergence around Taiwan semiconductor supply chain. Military posture elevated but within historical norms. Economic signals more concerning: TSMC license review could disrupt global chip supply. Trend stable but watch for diplomatic breakthrough.',
    location: { lat: 23.7, lon: 121.0, label: 'Taiwan' },
    affectedRegions: ['Taiwan', 'China', 'US', 'South Korea', 'Japan'],
    firstDetected: '1d ago',
    lastUpdated: '45m ago',
  },
  {
    id: 'conv-3',
    title: 'European Energy Grid Stress',
    score: 52,
    trend: 'de-escalating',
    signals: [
      { id: 's11', type: 'disaster', label: 'Norwegian hydro reservoir low', severity: 'medium', timestamp: '2d ago', region: 'Nordics' },
      { id: 's12', type: 'economic', label: 'NatGas TTF +12% this week', severity: 'high', timestamp: '1d ago', region: 'EU' },
      { id: 's13', type: 'market', label: 'EUR/USD breaks 1.08', severity: 'medium', timestamp: '6h ago', region: 'FX' },
      { id: 's14', type: 'diplomatic', label: 'EU emergency energy summit called', severity: 'medium', timestamp: '8h ago', region: 'Brussels' },
    ],
    assessment: 'Energy convergence showing signs of resolution. Emergency summit produced interim agreements. Hydro levels expected to recover with forecast rain. NatGas prices may stabilize if Norwegian supply resumes.',
    affectedRegions: ['Germany', 'France', 'Norway', 'Netherlands'],
    firstDetected: '2d ago',
    lastUpdated: '1h ago',
  },
  {
    id: 'conv-4',
    title: 'Red Sea Shipping Disruption',
    score: 71,
    trend: 'escalating',
    signals: [
      { id: 's15', type: 'military', label: 'Houthi missile attack on Maersk vessel', severity: 'critical', timestamp: '4h ago', region: 'Red Sea' },
      { id: 's16', type: 'economic', label: 'Suez Canal transit down 45%', severity: 'high', timestamp: '1d ago', region: 'Egypt' },
      { id: 's17', type: 'market', label: 'Container rates (FBX) up 220%', severity: 'high', timestamp: '12h ago', region: 'Global' },
      { id: 's18', type: 'cyber', label: 'Port of Djibouti logistics systems disrupted', severity: 'medium', timestamp: '8h ago', region: 'Djibouti' },
      { id: 's19', type: 'diplomatic', label: 'EU Operation Aspides expanded', severity: 'medium', timestamp: '6h ago', region: 'Brussels' },
    ],
    assessment: 'Five-stream escalation in Red Sea. Military attacks directly impacting shipping economics. Container rates at 18-month highs. Cyber disruptions compounding physical security risks. EU naval response may stabilize situation but timeline uncertain.',
    location: { lat: 20.0, lon: 38.5, label: 'Red Sea' },
    affectedRegions: ['Yemen', 'Egypt', 'Saudi Arabia', 'Global Trade'],
    firstDetected: '3d ago',
    lastUpdated: '20m ago',
  },
  {
    id: 'conv-5',
    title: 'Ukraine Black Sea Grain Corridor',
    score: 43,
    trend: 'stable',
    signals: [
      { id: 's20', type: 'military', label: 'Russian naval drill near Snake Island', severity: 'medium', timestamp: '1d ago', region: 'Black Sea' },
      { id: 's21', type: 'economic', label: 'Wheat futures (CBOT) +3.5%', severity: 'low', timestamp: '6h ago', region: 'Chicago' },
      { id: 's22', type: 'diplomatic', label: 'UN grain deal extension talks', severity: 'medium', timestamp: '2d ago', region: 'Istanbul' },
    ],
    assessment: 'Low-intensity convergence around Black Sea grain routes. Military activity routine. Wheat prices responding to speculative positioning ahead of UN talks. No immediate disruption expected.',
    affectedRegions: ['Ukraine', 'Russia', 'Turkey', 'Global Food Markets'],
    firstDetected: '2d ago',
    lastUpdated: '2h ago',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_COLORS = {
  critical: { bg: 'bg-red-500/15 border-red-500/30 text-red-400', bar: 'bg-red-400', text: 'text-red-400' },
  high: { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400', bar: 'bg-amber-400', text: 'text-amber-400' },
  medium: { bg: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400', bar: 'bg-yellow-400', text: 'text-yellow-400' },
  low: { bg: 'bg-white/5 border-white/10 text-white/50', bar: 'bg-white/30', text: 'text-white/50' },
};

function getScoreStyle(score: number) {
  if (score >= 70) return SCORE_COLORS.critical;
  if (score >= 50) return SCORE_COLORS.high;
  if (score >= 30) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
}

function getTrendIcon(trend: string) {
  if (trend === 'escalating') return <ArrowUpRight size={12} className="text-red-400" />;
  if (trend === 'de-escalating') return <ArrowDownRight size={12} className="text-emerald-400" />;
  return <Minus size={12} className="text-white/40" />;
}

function getTrendLabel(trend: string) {
  if (trend === 'escalating') return 'ESCALATING';
  if (trend === 'de-escalating') return 'DE-ESCALATING';
  return 'STABLE';
}

function getSignalIcon(type: string) {
  switch (type) {
    case 'military': return <Shield size={9} className="text-red-400" />;
    case 'economic': return <TrendingUp size={9} className="text-blue-400" />;
    case 'disaster': return <CloudRain size={9} className="text-cyan-400" />;
    case 'cyber': return <Zap size={9} className="text-purple-400" />;
    case 'diplomatic': return <Radio size={9} className="text-amber-400" />;
    case 'market': return <Target size={9} className="text-emerald-400" />;
    default: return <Target size={9} />;
  }
}

function getSeverityDot(sev: string) {
  if (sev === 'critical') return 'bg-red-400';
  if (sev === 'high') return 'bg-amber-400';
  if (sev === 'medium') return 'bg-yellow-400';
  return 'bg-white/30';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventConvergencePanel() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [expandedId, setExpandedId] = useState<string | null>('conv-1');
  const [filter, setFilter] = useState<'all' | 'escalating' | 'stable' | 'de-escalating'>('all');

  // Simulate live score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => prev.map(e => {
        if (Math.random() > 0.7) {
          const delta = Math.floor((Math.random() - 0.5) * 6);
          const newScore = Math.max(10, Math.min(100, e.score + delta));
          let newTrend = e.trend;
          if (delta > 2) newTrend = 'escalating';
          else if (delta < -2) newTrend = 'de-escalating';
          return { ...e, score: newScore, trend: newTrend, lastUpdated: 'Just now' };
        }
        return e;
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = events.filter(e => filter === 'all' || e.trend === filter);
  const avgScore = Math.round(events.reduce((s, e) => s + e.score, 0) / events.length);
  const escalatingCount = events.filter(e => e.trend === 'escalating').length;
  const criticalCount = events.filter(e => e.score >= 70).length;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">EVENT CONVERGENCE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/30">{events.length} clusters</span>
          {criticalCount > 0 && (
            <span className="text-[9px] font-mono text-red-400 flex items-center gap-1">
              <AlertTriangle size={9} /> {criticalCount} critical
            </span>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="px-3 py-1.5 border-b border-white/10 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] font-mono text-white">{avgScore}</div>
          <div className="text-[7px] text-white/30 font-mono">AVG SCORE</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-red-400">{escalatingCount}</div>
          <div className="text-[7px] text-white/30 font-mono">ESCALATING</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-amber-400">{criticalCount}</div>
          <div className="text-[7px] text-white/30 font-mono">CRITICAL</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-white/50">{events.reduce((s, e) => s + e.signals.length, 0)}</div>
          <div className="text-[7px] text-white/30 font-mono">SIGNALS</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-2 py-1.5 border-b border-white/10 flex gap-1">
        {(['all', 'escalating', 'stable', 'de-escalating'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
              filter === f
                ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                : 'bg-white/5 text-white/30 border-transparent hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'ALL' : f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map(event => {
          const style = getScoreStyle(event.score);
          const isExpanded = expandedId === event.id;
          return (
            <div
              key={event.id}
              className={`rounded-lg border overflow-hidden transition-all ${style.bg}`}
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
                className="w-full px-2.5 py-2 flex items-center gap-2 text-left"
              >
                {/* Score Badge */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${style.bg}`}>
                  <span className={`text-[11px] font-bold ${style.text}`}>{event.score}</span>
                </div>

                {/* Title & Meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono font-bold text-white truncate">{event.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] text-white/40 font-mono">{event.signals.length} signals</span>
                    <span className="text-[8px] text-white/20">|</span>
                    <span className="text-[8px] text-white/40 font-mono">{event.lastUpdated}</span>
                  </div>
                </div>

                {/* Trend */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getTrendIcon(event.trend)}
                  <span className={`text-[8px] font-mono ${
                    event.trend === 'escalating' ? 'text-red-400' :
                    event.trend === 'de-escalating' ? 'text-emerald-400' : 'text-white/40'
                  }`}>
                    {getTrendLabel(event.trend)}
                  </span>
                </div>

                {/* Expand Icon */}
                {isExpanded ? <ChevronUp size={12} className="text-white/30" /> : <ChevronDown size={12} className="text-white/30" />}
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5 border-t border-white/5">
                  {/* Signal List */}
                  <div className="mt-2 space-y-1">
                    {event.signals.map(s => (
                      <div key={s.id} className="flex items-center gap-2 py-1 px-1.5 rounded bg-white/[0.03]">
                        <span className={`w-1.5 h-1.5 rounded-full ${getSeverityDot(s.severity)}`} />
                        {getSignalIcon(s.type)}
                        <span className="text-[9px] font-mono text-white/70 flex-1 truncate">{s.label}</span>
                        <span className="text-[8px] text-white/30 font-mono">{s.region}</span>
                        <span className="text-[8px] text-white/20 font-mono">{s.timestamp}</span>
                      </div>
                    ))}
                  </div>

                  {/* Assessment */}
                  <div className="mt-2 p-2 rounded bg-blue-500/[0.06] border-l-2 border-blue-500/30">
                    <div className="text-[8px] text-blue-400/60 font-mono mb-1">AI ASSESSMENT</div>
                    <div className="text-[9px] text-white/60 leading-relaxed">{event.assessment}</div>
                  </div>

                  {/* Location & Regions */}
                  <div className="mt-2 flex items-center justify-between">
                    {event.location && (
                      <div className="flex items-center gap-1 text-[8px] text-white/30 font-mono">
                        <MapPin size={8} /> {event.location.label}
                      </div>
                    )}
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {event.affectedRegions.map(r => (
                        <span key={r} className="text-[7px] font-mono px-1 py-0.5 rounded bg-white/5 text-white/40 border border-white/5">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-2 flex items-center justify-between text-[8px] text-white/20 font-mono">
                    <span>First detected: {event.firstDetected}</span>
                    <span>Updated: {event.lastUpdated}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
