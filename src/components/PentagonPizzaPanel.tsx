'use client';

import { useState, useEffect } from 'react';
import { Pizza, AlertTriangle, Activity, Clock } from 'lucide-react';

interface PizzaIndicator {
  status: 'normal' | 'elevated' | 'critical';
  ordersPerHour: number;
  avgOrdersBaseline: number;
  lastUpdated: string;
  anomalyScore: number; // 0-100
  notes: string[];
}

function generateMockData(): PizzaIndicator {
  const hour = new Date().getHours();
  // Pentagon pizza places get busy late at night during crises
  const isLateNight = hour >= 22 || hour <= 4;
  const baseline = isLateNight ? 8 : 25;
  
  // Randomly spike (simulating the "pizza indicator")
  const spikeRoll = Math.random();
  let status: 'normal' | 'elevated' | 'critical' = 'normal';
  let orders = baseline + Math.floor(Math.random() * 5);
  let anomaly = Math.floor(Math.random() * 15);
  let notes: string[] = [];
  
  if (spikeRoll > 0.92) {
    status = 'critical';
    orders = baseline * 3 + Math.floor(Math.random() * 20);
    anomaly = 75 + Math.floor(Math.random() * 25);
    notes = [
      'Unusual late-night order volume detected',
      'Multiple large group orders (>20 pizzas)',
      'Delivery addresses clustering near Pentagon/South Parking',
    ];
  } else if (spikeRoll > 0.78) {
    status = 'elevated';
    orders = Math.floor(baseline * 1.8) + Math.floor(Math.random() * 10);
    anomaly = 45 + Math.floor(Math.random() * 25);
    notes = [
      'Above-baseline order rate sustained for 45+ min',
      'Increased combo/meal orders (working dinner pattern)',
    ];
  } else {
    notes = ['Order volume within normal parameters', 'No anomalous patterns detected'];
  }
  
  return {
    status,
    ordersPerHour: orders,
    avgOrdersBaseline: baseline,
    lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    anomalyScore: anomaly,
    notes,
  };
}

export default function PentagonPizzaPanel() {
  const [data, setData] = useState<PizzaIndicator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(generateMockData());
    setLoading(false);
    const interval = setInterval(() => {
      setData(generateMockData());
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[10px] text-white/30 font-mono animate-pulse">Loading pizza intel...</div>
      </div>
    );
  }

  const statusConfig = {
    normal: {
      color: '#00ff88',
      bg: 'rgba(0,255,136,0.08)',
      border: 'rgba(0,255,136,0.2)',
      label: 'NORMAL',
      iconColor: '#00ff88',
    },
    elevated: {
      color: '#ffaa00',
      bg: 'rgba(255,170,0,0.08)',
      border: 'rgba(255,170,0,0.25)',
      label: 'ELEVATED',
      iconColor: '#ffaa00',
    },
    critical: {
      color: '#ff2244',
      bg: 'rgba(255,34,68,0.1)',
      border: 'rgba(255,34,68,0.3)',
      label: 'CRITICAL',
      iconColor: '#ff2244',
    },
  };

  const cfg = statusConfig[data.status];
  const ratio = data.avgOrdersBaseline > 0 ? data.ordersPerHour / data.avgOrdersBaseline : 1;

  return (
    <div className="h-full flex flex-col p-3 space-y-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pizza size={14} style={{ color: cfg.iconColor }} />
          <span className="text-[10px] font-mono font-bold tracking-wider text-white/70">PENTAGON PIZZA INDEX</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={10} style={{ color: cfg.color }} className={data.status !== 'normal' ? 'animate-pulse' : ''} />
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Main metric */}
      <div
        className="rounded-lg p-3 space-y-2"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] text-white/40 font-mono mb-0.5">ORDERS / HR</div>
            <div className="text-2xl font-mono font-bold" style={{ color: cfg.color }}>
              {data.ordersPerHour}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-white/40 font-mono mb-0.5">BASELINE</div>
            <div className="text-sm font-mono text-white/60">{data.avgOrdersBaseline}</div>
          </div>
        </div>

        {/* Ratio bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-white/30">vs baseline</span>
            <span style={{ color: cfg.color }}>{ratio.toFixed(1)}x</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, (ratio / 3) * 100)}%`,
                background: `linear-gradient(90deg, ${cfg.color}60, ${cfg.color})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Anomaly score */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={10} className="text-white/30" />
          <span className="text-[9px] text-white/40 font-mono">ANOMALY SCORE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${data.anomalyScore}%`,
                background: data.anomalyScore > 70 ? '#ff2244' : data.anomalyScore > 40 ? '#ffaa00' : '#00ff88',
              }}
            />
          </div>
          <span
            className="text-[9px] font-mono font-bold"
            style={{
              color: data.anomalyScore > 70 ? '#ff2244' : data.anomalyScore > 40 ? '#ffaa00' : '#00ff88',
            }}
          >
            {data.anomalyScore}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        {data.notes.map((note, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[9px] text-white/50">
            <span className="mt-0.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
            <span>{note}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[8px] text-white/25 font-mono">
          <Clock size={8} />
          <span>Updated {data.lastUpdated}</span>
        </div>
        <span className="text-[8px] text-white/20 font-mono">Arlington, VA</span>
      </div>
    </div>
  );
}
