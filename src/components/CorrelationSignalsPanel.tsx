'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Zap, TrendingUp, Activity, Globe, Target, AlertTriangle, Brain, ChevronDown, ChevronUp } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface CorrelationSignal {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  timestamp: string;
  panelId?: string;
  metadata?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  velocity_spike: <Activity size={12} />,
  keyword_spike: <Target size={12} />,
  military_surge: <AlertTriangle size={12} />,
  convergence: <Zap size={12} />,
  geo_convergence: <Globe size={12} />,
  explained_market_move: <TrendingUp size={12} />,
  prediction_leads_news: <Brain size={12} />,
  sector_cascade: <TrendingUp size={12} />,
  cyber_alert: <AlertTriangle size={12} />,
  infrastructure_risk: <AlertTriangle size={12} />,
};

const TYPE_COLORS: Record<string, string> = {
  velocity_spike: 'text-cyan-400',
  keyword_spike: 'text-purple-400',
  military_surge: 'text-red-400',
  convergence: 'text-amber-400',
  geo_convergence: 'text-emerald-400',
  explained_market_move: 'text-green-400',
  prediction_leads_news: 'text-pink-400',
  sector_cascade: 'text-blue-400',
  cyber_alert: 'text-orange-400',
  infrastructure_risk: 'text-yellow-400',
};

function confidenceBadge(conf: number) {
  if (conf >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (conf >= 65) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
}

export default function CorrelationSignalsPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [minConfidence, setMinConfidence] = useState(50);

  const { data, isLoading, error } = useSWR<{
    signals: CorrelationSignal[];
    generatedAt: string;
  }>('/api/correlation-signals', fetcher, { refreshInterval: 30000 });

  const signals = (data?.signals || []).filter(s => s.confidence >= minConfidence);

  return (
    <div className="glass-panel flex flex-col h-full">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-panel/50 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="font-mono text-[11px] font-bold tracking-wider text-pink-400">AI CORRELATIONS</span>
          {signals.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-mono animate-pulse">
              {signals.length} DETECTED
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={14} className="text-text-dim" /> : <ChevronDown size={14} className="text-text-dim" />}
      </button>

      {isExpanded && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Confidence filter */}
          <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
            <span className="text-[9px] font-mono text-text-dim">MIN CONFIDENCE</span>
            <div className="flex gap-1">
              {[50, 65, 80].map(conf => (
                <button
                  key={conf}
                  onClick={() => setMinConfidence(conf)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all ${
                    minConfidence === conf
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                      : 'bg-white/5 text-text-dim hover:bg-white/10'
                  }`}
                >
                  {conf}%
                </button>
              ))}
            </div>
          </div>

          {/* Signals list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-2xl">🧠</div>
                <div className="text-[9px] text-text-muted mt-2">Analyzing cross-signal correlations...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-[10px] text-red-400">Analysis unavailable</div>
            ) : signals.length === 0 ? (
              <div className="text-center py-8 text-[10px] text-text-muted">No correlations above {minConfidence}% confidence</div>
            ) : (
              signals.map(signal => {
                const icon = TYPE_ICONS[signal.type] || <Zap size={12} />;
                const color = TYPE_COLORS[signal.type] || 'text-pink-400';
                return (
                  <div
                    key={signal.id}
                    className="p-2 rounded border bg-elevated/50 border-white/5 hover:border-pink-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={color}>{icon}</span>
                        <span className="font-mono text-[10px] text-white truncate">{signal.title}</span>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${confidenceBadge(signal.confidence)}`}>
                        {signal.confidence}%
                      </span>
                    </div>
                    <div className="text-[9px] text-text-dim mb-1 pl-5">{signal.description}</div>
                    {signal.panelId && (
                      <div className="pl-5 flex items-center gap-1 text-[8px] font-mono text-pink-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>→</span> {signal.panelId}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-border-subtle text-[8px] text-text-dim font-mono text-center">
            Real-time cross-signal correlation engine • Update: 30s
          </div>
        </div>
      )}
    </div>
  );
}
