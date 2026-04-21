'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface CorrelationSignal {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  timestamp: string;
  panelId?: string; // widget to navigate to
  metadata?: Record<string, unknown>;
}

const TYPE_COLORS: Record<string, string> = {
  velocity_spike: '#ff2244',
  keyword_spike: '#ffaa00',
  prediction_leads_news: '#ffaa00',
  silent_divergence: '#00ff88',
  convergence: '#00ccff',
  triangulation: '#ffaa00',
  flow_drop: '#00ccff',
  flow_price_divergence: '#00ff88',
  geo_convergence: '#00ccff',
  explained_market_move: '#00ff88',
  sector_cascade: '#ffaa00',
  military_surge: '#ff2244',
  cyber_alert: '#ff6633',
  infrastructure_risk: '#ff6633',
  supply_chain_shock: '#ff2244',
  diplomatic_shift: '#00ccff',
};

const TYPE_ICONS: Record<string, string> = {
  velocity_spike: '🔥',
  keyword_spike: '📊',
  prediction_leads_news: '🔮',
  silent_divergence: '🔇',
  convergence: '◉',
  triangulation: '△',
  flow_drop: '🛢️',
  flow_price_divergence: '📈',
  geo_convergence: '🌐',
  explained_market_move: '✓',
  sector_cascade: '📊',
  military_surge: '🛩️',
  cyber_alert: '💻',
  infrastructure_risk: '🏭',
  supply_chain_shock: '🚢',
  diplomatic_shift: '🤝',
};

const TYPE_LABELS: Record<string, string> = {
  velocity_spike: 'VELOCITY SPIKE',
  keyword_spike: 'KEYWORD SURGE',
  prediction_leads_news: 'PREDICTION LEADS',
  silent_divergence: 'SILENT DIVERGENCE',
  convergence: 'CONVERGENCE',
  triangulation: 'TRIANGULATION',
  flow_drop: 'FLOW DROP',
  flow_price_divergence: 'FLOW/PRICE MISMATCH',
  geo_convergence: 'GEO CONVERGENCE',
  explained_market_move: 'EXPLAINED MOVE',
  sector_cascade: 'SECTOR CASCADE',
  military_surge: 'MILITARY SURGE',
  cyber_alert: 'CYBER ALERT',
  infrastructure_risk: 'INFRASTRUCTURE RISK',
  supply_chain_shock: 'SUPPLY CHAIN SHOCK',
  diplomatic_shift: 'DIPLOMATIC SHIFT',
};

const DISMISS_MS = 12000;
const REFRESH_MS = 30000;

export default function SignalBanner() {
  const [signals, setSignals] = useState<CorrelationSignal[]>([]);
  const [currentSignal, setCurrentSignal] = useState<CorrelationSignal | null>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const [dismissed, setDismissed] = useState(false);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setVisible(false);
    setTimeout(() => setCurrentSignal(null), 300);
  }, [clearTimers]);

  const showSignal = useCallback((signal: CorrelationSignal) => {
    clearTimers();
    setCurrentSignal(signal);
    setVisible(true);
    setProgress(100);
    setDismissed(false);

    // Progress bar animation
    const step = 100 / (DISMISS_MS / 50);
    progressRef.current = setInterval(() => {
      setProgress((p) => {
        if (p <= step) {
          if (progressRef.current) clearInterval(progressRef.current);
          return 0;
        }
        return p - step;
      });
    }, 50);

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      dismiss();
    }, DISMISS_MS);
  }, [clearTimers, dismiss]);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/correlation-signals');
      if (!res.ok) return;
      const data = await res.json();
      const incoming: CorrelationSignal[] = data.signals || [];
      if (!incoming.length) return;

      setSignals(incoming);

      // Filter to fresh signals not yet shown
      const fresh = incoming.filter((s: CorrelationSignal) => !shownIdsRef.current.has(s.id));
      if (!fresh.length) return;

      // Mark as shown
      fresh.forEach((s: CorrelationSignal) => shownIdsRef.current.add(s.id));
      // Trim shown set to prevent memory bloat
      if (shownIdsRef.current.size > 200) {
        const arr = Array.from(shownIdsRef.current);
        shownIdsRef.current = new Set(arr.slice(arr.length - 100));
      }

      // Pick highest confidence fresh signal
      const top = fresh.sort((a: CorrelationSignal, b: CorrelationSignal) => b.confidence - a.confidence)[0];
      if (top) {
        showSignal(top);
      }
    } catch {
      // Silently fail
    }
  }, [showSignal]);

  useEffect(() => {
    fetchSignals();
    intervalRef.current = setInterval(fetchSignals, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimers();
    };
  }, [fetchSignals, clearTimers]);

  const handleNavigate = useCallback(() => {
    if (currentSignal?.panelId) {
      // Try to scroll to the panel in the dashboard
      const el = document.getElementById(`widget-${currentSignal.panelId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('animate-glow-pulse');
        setTimeout(() => el.classList.remove('animate-glow-pulse'), 2000);
      }
    }
    dismiss();
  }, [currentSignal, dismiss]);

  if (!currentSignal || dismissed) return null;

  const color = TYPE_COLORS[currentSignal.type] || '#00ff88';
  const icon = TYPE_ICONS[currentSignal.type] || '📡';
  const label = TYPE_LABELS[currentSignal.type] || currentSignal.type.toUpperCase().replace(/_/g, ' ');

  return (
    <div
      className={`signal-banner-container w-full z-[100] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div
        className="relative flex items-center gap-3 px-4 py-2 overflow-hidden"
        style={{
          background: `linear-gradient(90deg, ${color}12 0%, ${color}06 50%, transparent 100%)`,
          borderBottom: `1px solid ${color}30`,
        }}
      >
        {/* Animated background pulse */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 10% 50%, ${color}20 0%, transparent 50%)`,
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />

        {/* Icon */}
        <span className="relative text-base flex-shrink-0" style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}>
          {icon}
        </span>

        {/* Pulsing dot */}
        <span
          className="relative flex-shrink-0 w-2 h-2 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />

        {/* Content */}
        <div className="relative flex-1 min-w-0 flex items-center gap-2">
          <span
            className="text-[10px] font-mono font-bold tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded"
            style={{
              color,
              background: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            {label}
          </span>
          <span className="text-[11px] text-white/90 font-medium truncate">
            {currentSignal.title}
          </span>
          <span className="text-[10px] text-white/40 hidden sm:inline truncate">
            {currentSignal.description}
          </span>
        </div>

        {/* Confidence badge */}
        <span
          className="relative hidden md:flex text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
          style={{
            color: currentSignal.confidence >= 80 ? color : 'rgba(255,255,255,0.4)',
            background: `${color}10`,
            border: `1px solid ${color}20`,
          }}
        >
          {currentSignal.confidence}% CONF
        </span>

        {/* Navigate button */}
        {currentSignal.panelId && (
          <button
            onClick={handleNavigate}
            className="relative flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded transition-all hover:brightness-125"
            style={{
              color,
              background: `${color}15`,
              border: `1px solid ${color}40`,
            }}
          >
            View →
          </button>
        )}

        {/* Close button */}
        <button
          onClick={dismiss}
          className="relative flex-shrink-0 text-white/30 hover:text-white/70 transition-colors text-sm leading-none px-1"
          aria-label="Dismiss"
        >
          ×
        </button>

        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] transition-all"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
          }}
        />
      </div>
    </div>
  );
}
