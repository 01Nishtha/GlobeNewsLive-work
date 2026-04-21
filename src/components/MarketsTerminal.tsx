'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Activity, Calendar, Search, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Minus, Clock, Zap, Target, Layers } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  high52: number;
  low52: number;
  sparkline: number[];
  sector: string;
  marketCap?: string;
  pe?: number | null;
  beta?: number | null;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface EarningsEvent {
  date: string;
  symbol: string;
  name: string;
  epsEstimate: number | null;
  revenueEstimate: string | null;
  time: 'bmo' | 'amc' | 'tns';
}

interface SectorHeatmap {
  name: string;
  change: number;
  weight: number;
  topMover: { symbol: string; change: number };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_TICKERS: MarketTicker[] = [
  { symbol: 'XAUUSD', name: 'Gold', price: 2341.50, change: 12.30, changePercent: 0.53, volume: '124K', high52: 2431.00, low52: 1980.00, sparkline: [2280, 2295, 2310, 2305, 2320, 2335, 2329, 2341], sector: 'Commodity', pe: null, beta: 0.02 },
  { symbol: 'CL=F', name: 'WTI Crude', price: 78.42, change: -1.23, changePercent: -1.54, volume: '892K', high52: 87.50, low52: 68.20, sparkline: [80.5, 81.2, 80.8, 79.5, 79.0, 78.8, 79.65, 78.42], sector: 'Energy', pe: null, beta: 1.2 },
  { symbol: '^GSPC', name: 'S&P 500', price: 5123.45, change: 18.20, changePercent: 0.36, volume: '2.1B', high52: 5264.00, low52: 4100.00, sparkline: [5080, 5095, 5105, 5100, 5115, 5105, 5110, 5123], sector: 'Index', pe: 23.4, beta: 1.0 },
  { symbol: '^IXIC', name: 'NASDAQ', price: 16245.30, change: 89.50, changePercent: 0.55, volume: '4.8B', high52: 16500.00, low52: 12500.00, sparkline: [16080, 16120, 16180, 16150, 16200, 16180, 16155, 16245], sector: 'Index', pe: 31.2, beta: 1.15 },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 68420.00, change: 1240.00, changePercent: 1.85, volume: '34B', high52: 73800.00, low52: 42000.00, sparkline: [66200, 66800, 67200, 67000, 67800, 67400, 67180, 68420], sector: 'Crypto', pe: null, beta: 2.1 },
  { symbol: 'ETH-USD', name: 'Ethereum', price: 3450.20, change: 45.30, changePercent: 1.33, volume: '18B', high52: 4000.00, low52: 2200.00, sparkline: [3380, 3400, 3420, 3410, 3430, 3420, 3405, 3450], sector: 'Crypto', pe: null, beta: 1.8 },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 178.50, change: -4.20, changePercent: -2.30, volume: '98M', high52: 299.00, low52: 140.00, sparkline: [185, 183, 182, 184, 181, 180, 182.7, 178.5], sector: 'Auto', pe: 42.5, beta: 2.05 },
  { symbol: 'NVDA', name: 'NVIDIA', price: 892.30, change: 23.40, changePercent: 2.69, volume: '45M', high52: 974.00, low52: 390.00, sparkline: [860, 865, 870, 868, 875, 880, 868.9, 892.3], sector: 'Tech', pe: 72.3, beta: 1.95 },
  { symbol: 'LMT', name: 'Lockheed Martin', price: 445.20, change: 6.80, changePercent: 1.55, volume: '2.1M', high52: 480.00, low52: 380.00, sparkline: [435, 438, 436, 440, 439, 442, 438.4, 445.2], sector: 'Defense', pe: 16.8, beta: 0.78 },
  { symbol: 'RTX', name: 'RTX Corp', price: 98.40, change: 1.20, changePercent: 1.24, volume: '5.8M', high52: 105.00, low52: 78.00, sparkline: [96, 97, 96.5, 97.5, 97, 97.2, 97.2, 98.4], sector: 'Defense', pe: 18.2, beta: 0.85 },
  { symbol: 'USO', name: 'US Oil Fund', price: 76.30, change: -1.10, changePercent: -1.42, volume: '12M', high52: 85.00, low52: 62.00, sparkline: [78, 78.5, 78.2, 77.5, 77, 77.2, 77.4, 76.3], sector: 'ETF', pe: null, beta: 1.1 },
  { symbol: 'GLD', name: 'SPDR Gold', price: 218.50, change: 1.20, changePercent: 0.55, volume: '8.4M', high52: 225.00, low52: 175.00, sparkline: [215, 216, 216.5, 216, 217, 217.3, 217.3, 218.5], sector: 'ETF', pe: null, beta: 0.05 },
];

const MOCK_CANDLES: CandleData[] = [
  { time: '09:30', open: 2305, high: 2315, low: 2300, close: 2310, volume: 45000 },
  { time: '10:00', open: 2310, high: 2325, low: 2308, close: 2322, volume: 52000 },
  { time: '10:30', open: 2322, high: 2330, low: 2318, close: 2325, volume: 48000 },
  { time: '11:00', open: 2325, high: 2335, low: 2320, close: 2332, volume: 61000 },
  { time: '11:30', open: 2332, high: 2340, low: 2328, close: 2335, volume: 55000 },
  { time: '12:00', open: 2335, high: 2345, low: 2332, close: 2341, volume: 42000 },
  { time: '12:30', open: 2341, high: 2348, low: 2338, close: 2345, volume: 38000 },
  { time: '13:00', open: 2345, high: 2350, low: 2340, close: 2348, volume: 46000 },
  { time: '13:30', open: 2348, high: 2355, low: 2345, close: 2352, volume: 51000 },
  { time: '14:00', open: 2352, high: 2360, low: 2350, close: 2358, volume: 58000 },
  { time: '14:30', open: 2358, high: 2365, low: 2355, close: 2362, volume: 62000 },
  { time: '15:00', open: 2362, high: 2370, low: 2360, close: 2368, volume: 55000 },
  { time: '15:30', open: 2368, high: 2375, low: 2365, close: 2372, volume: 49000 },
  { time: '16:00', open: 2372, high: 2380, low: 2370, close: 2378, volume: 71000 },
];

const MOCK_EARNINGS: EarningsEvent[] = [
  { date: '2026-04-17', symbol: 'JPM', name: 'JPMorgan Chase', epsEstimate: 4.45, revenueEstimate: '$42.1B', time: 'bmo' },
  { date: '2026-04-17', symbol: 'WFC', name: 'Wells Fargo', epsEstimate: 1.22, revenueEstimate: '$20.3B', time: 'bmo' },
  { date: '2026-04-17', symbol: 'NFLX', name: 'Netflix', epsEstimate: 5.12, revenueEstimate: '$9.8B', time: 'amc' },
  { date: '2026-04-18', symbol: 'GS', name: 'Goldman Sachs', epsEstimate: 9.85, revenueEstimate: '$14.2B', time: 'bmo' },
  { date: '2026-04-18', symbol: 'TSLA', name: 'Tesla', epsEstimate: 0.72, revenueEstimate: '$23.1B', time: 'amc' },
  { date: '2026-04-21', symbol: 'NVDA', name: 'NVIDIA', epsEstimate: 5.65, revenueEstimate: '$28.4B', time: 'amc' },
  { date: '2026-04-21', symbol: 'MSFT', name: 'Microsoft', epsEstimate: 3.22, revenueEstimate: '$65.2B', time: 'amc' },
  { date: '2026-04-22', symbol: 'GOOGL', name: 'Alphabet', epsEstimate: 1.89, revenueEstimate: '$84.5B', time: 'amc' },
];

const SECTOR_HEATMAP: SectorHeatmap[] = [
  { name: 'Tech', change: 1.85, weight: 28.5, topMover: { symbol: 'NVDA', change: 2.69 } },
  { name: 'Energy', change: -1.54, weight: 4.2, topMover: { symbol: 'XOM', change: -1.2 } },
  { name: 'Defense', change: 1.42, weight: 3.8, topMover: { symbol: 'LMT', change: 1.55 } },
  { name: 'Finance', change: 0.65, weight: 13.2, topMover: { symbol: 'JPM', change: 0.82 } },
  { name: 'Healthcare', change: -0.32, weight: 12.8, topMover: { symbol: 'UNH', change: -0.45 } },
  { name: 'Consumer', change: 0.18, weight: 10.5, topMover: { symbol: 'AMZN', change: 0.55 } },
  { name: 'Materials', change: -0.85, weight: 2.4, topMover: { symbol: 'LIN', change: -0.92 } },
  { name: 'Utilities', change: 0.42, weight: 2.6, topMover: { symbol: 'NEE', change: 0.6 } },
  { name: 'Crypto', change: 1.55, weight: 1.2, topMover: { symbol: 'BTC', change: 1.85 } },
  { name: 'Commodity', change: 0.53, weight: 0.8, topMover: { symbol: 'GLD', change: 0.55 } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return n >= 1000 ? n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toFixed(2);
}

function getChangeColor(pct: number): string {
  if (pct > 0) return 'text-accent-green';
  if (pct < 0) return 'text-accent-red';
  return 'text-white/50';
}

function getChangeBg(pct: number): string {
  if (pct > 0) return 'bg-emerald-500/10 border-emerald-500/20';
  if (pct < 0) return 'bg-red-500/10 border-red-500/20';
  return 'bg-white/5 border-white/10';
}

function Sparkline({ data, width = 60, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const color = data[data.length - 1] >= data[0] ? '#00ff88' : '#ff4444';
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CandlestickChart({ data, width = 400, height = 160 }: { data: CandleData[]; width?: number; height?: number }) {
  const candleWidth = Math.max(4, (width / data.length) * 0.6);
  const gap = width / data.length;
  const min = Math.min(...data.map(d => d.low));
  const max = Math.max(...data.map(d => d.high));
  const range = max - min || 1;

  return (
    <svg width={width} height={height} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={0} y1={height * t} x2={width} y2={height * t} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
      ))}
      {data.map((d, i) => {
        const x = i * gap + gap / 2;
        const isUp = d.close >= d.open;
        const color = isUp ? '#00ff88' : '#ff4444';
        const top = height - ((Math.max(d.open, d.close) - min) / range) * height;
        const bottom = height - ((Math.min(d.open, d.close) - min) / range) * height;
        const high = height - ((d.high - min) / range) * height;
        const low = height - ((d.low - min) / range) * height;
        return (
          <g key={i}>
            <line x1={x} y1={high} x2={x} y2={low} stroke={color} strokeWidth={1} />
            <rect x={x - candleWidth / 2} y={top} width={candleWidth} height={Math.max(1, bottom - top)} fill={isUp ? 'transparent' : color} stroke={color} strokeWidth={1} rx={1} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

type TerminalTab = 'screener' | 'chart' | 'heatmap' | 'earnings';

export default function MarketsTerminal() {
  const [activeTab, setActiveTab] = useState<TerminalTab>('screener');
  const [tickers, setTickers] = useState(MOCK_TICKERS);
  const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof MarketTicker>('changePercent');;
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [candles, setCandles] = useState(MOCK_CANDLES);

  // Live simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev => prev.map(t => {
        const jitter = (Math.random() - 0.48) * t.price * 0.002;
        const newPrice = Math.max(0.01, t.price + jitter);
        const newChange = t.change + jitter;
        const newPct = (newChange / (newPrice - newChange)) * 100;
        const newSpark = [...t.sparkline.slice(1), newPrice];
        return { ...t, price: newPrice, change: newChange, changePercent: newPct, sparkline: newSpark };
      }));
      // Simulate new candle
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const newClose = last.close + (Math.random() - 0.48) * 5;
        const newOpen = last.close;
        const newHigh = Math.max(newOpen, newClose) + Math.random() * 3;
        const newLow = Math.min(newOpen, newClose) - Math.random() * 3;
        const newCandle: CandleData = {
          time: new Date(Date.now()).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
          open: newOpen, high: newHigh, low: newLow, close: newClose,
          volume: Math.floor(Math.random() * 50000 + 30000),
        };
        return [...prev.slice(1), newCandle];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tickers.filter(t =>
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const handleSort = (key: keyof MarketTicker) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const selectedTicker = tickers.find(t => t.symbol === selectedSymbol);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] font-mono">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={12} className="text-accent-green" />
          <span className="text-[10px] font-bold text-accent-green tracking-wider">MARKETS TERMINAL</span>
        </div>
        <div className="flex items-center gap-1">
          {(['screener', 'chart', 'heatmap', 'earnings'] as TerminalTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 rounded text-[8px] border transition-all ${
                activeTab === tab
                  ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                  : 'bg-white/5 text-white/30 border-transparent hover:bg-white/10'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Screener Tab */}
      {activeTab === 'screener' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
            <Search size={10} className="text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter tickers..."
              className="flex-1 bg-transparent text-[10px] text-white placeholder-white/20 outline-none"
            />
            <span className="text-[8px] text-white/20">{sorted.length}/{tickers.length}</span>
          </div>
          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[9px]">
              <thead className="sticky top-0 bg-[#0a0a0f] z-10">
                <tr className="text-white/30 border-b border-white/10">
                  <th className="text-left px-2 py-1 cursor-pointer hover:text-white/60" onClick={() => handleSort('symbol')}>SYMBOL {sortKey === 'symbol' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  <th className="text-left px-2 py-1">NAME</th>
                  <th className="text-right px-2 py-1 cursor-pointer hover:text-white/60" onClick={() => handleSort('price')}>PRICE {sortKey === 'price' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  <th className="text-right px-2 py-1 cursor-pointer hover:text-white/60" onClick={() => handleSort('changePercent')}>CHG% {sortKey === 'changePercent' && (sortDir === 'asc' ? '▲' : '▼')}</th>
                  <th className="text-right px-2 py-1">VOL</th>
                  <th className="text-center px-2 py-1">SPARK</th>
                  <th className="text-left px-2 py-1">SECTOR</th>
                  <th className="text-right px-2 py-1">P/E</th>
                  <th className="text-right px-2 py-1">BETA</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => (
                  <tr
                    key={t.symbol}
                    onClick={() => { setSelectedSymbol(t.symbol); setActiveTab('chart'); }}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${selectedSymbol === t.symbol ? 'bg-white/10' : ''}`}
                  >
                    <td className="px-2 py-1.5 text-white font-bold">{t.symbol}</td>
                    <td className="px-2 py-1.5 text-white/60 truncate max-w-[80px]">{t.name}</td>
                    <td className="px-2 py-1.5 text-right text-white">{formatPrice(t.price)}</td>
                    <td className={`px-2 py-1.5 text-right ${getChangeColor(t.changePercent)}`}>
                      {t.changePercent > 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
                    </td>
                    <td className="px-2 py-1.5 text-right text-white/40">{t.volume}</td>
                    <td className="px-2 py-1.5 text-center"><Sparkline data={t.sparkline} /></td>
                    <td className="px-2 py-1.5 text-white/40">{t.sector}</td>
                    <td className="px-2 py-1.5 text-right text-white/40">{t.pe ?? '-'}</td>
                    <td className="px-2 py-1.5 text-right text-white/40">{t.beta ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart Tab */}
      {activeTab === 'chart' && selectedTicker && (
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] font-bold text-white">{selectedTicker.symbol} — {selectedTicker.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[14px] text-white">{formatPrice(selectedTicker.price)}</span>
                <span className={`text-[10px] ${getChangeColor(selectedTicker.changePercent)}`}>
                  {selectedTicker.changePercent > 0 ? '+' : ''}{selectedTicker.changePercent.toFixed(2)}%
                </span>
                <span className="text-[8px] text-white/30">Vol: {selectedTicker.volume}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">1D</span>
              <span className="text-[8px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">1W</span>
              <span className="text-[8px] text-accent-green px-1.5 py-0.5 rounded bg-accent-green/10 border border-accent-green/20">1M</span>
              <span className="text-[8px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">1Y</span>
            </div>
          </div>
          <div className="flex-1 bg-white/[0.02] rounded border border-white/5 p-2">
            <CandlestickChart data={candles} />
          </div>
          {/* Technicals */}
          <div className="grid grid-cols-4 gap-1 mt-2">
            <div className="bg-white/[0.02] rounded border border-white/5 p-1.5 text-center">
              <div className="text-[7px] text-white/30">RSI(14)</div>
              <div className="text-[10px] text-amber-400">58.4</div>
            </div>
            <div className="bg-white/[0.02] rounded border border-white/5 p-1.5 text-center">
              <div className="text-[7px] text-white/30">SMA(20)</div>
              <div className="text-[10px] text-white/60">{formatPrice(selectedTicker.price * 0.98)}</div>
            </div>
            <div className="bg-white/[0.02] rounded border border-white/5 p-1.5 text-center">
              <div className="text-[7px] text-white/30">52W HIGH</div>
              <div className="text-[10px] text-accent-green">{formatPrice(selectedTicker.high52)}</div>
            </div>
            <div className="bg-white/[0.02] rounded border border-white/5 p-1.5 text-center">
              <div className="text-[7px] text-white/30">52W LOW</div>
              <div className="text-[10px] text-accent-red">{formatPrice(selectedTicker.low52)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Tab */}
      {activeTab === 'heatmap' && (
        <div className="flex-1 flex flex-col overflow-hidden p-2">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={10} className="text-accent-green" />
            <span className="text-[9px] text-white/50">SECTOR PERFORMANCE</span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            {SECTOR_HEATMAP.map(s => (
              <div
                key={s.name}
                className={`rounded border p-2 flex flex-col justify-between ${getChangeBg(s.change)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white">{s.name}</span>
                  <span className={`text-[10px] font-bold ${getChangeColor(s.change)}`}>
                    {s.change > 0 ? '+' : ''}{s.change.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[7px] text-white/30">Weight: {s.weight}%</span>
                  <span className="text-[7px] text-white/40">{s.topMover.symbol} {s.topMover.change > 0 ? '+' : ''}{s.topMover.change.toFixed(2)}%</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.change > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, Math.abs(s.change) * 20)}%`, opacity: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
            <Calendar size={10} className="text-accent-green" />
            <span className="text-[9px] text-white/50">UPCOMING EARNINGS</span>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1.5">
            {MOCK_EARNINGS.map((e, i) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-2 rounded border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${e.time === 'bmo' ? 'bg-amber-400' : e.time === 'amc' ? 'bg-blue-400' : 'bg-white/30'}`} />
                  <div>
                    <div className="text-[10px] font-bold text-white">{e.symbol}</div>
                    <div className="text-[8px] text-white/40">{e.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-white/60">{e.date}</div>
                  <div className="text-[8px] text-white/30">{e.time === 'bmo' ? 'Before Open' : e.time === 'amc' ? 'After Close' : 'Time Not Set'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-white/60">EPS: {e.epsEstimate?.toFixed(2) ?? 'N/A'}</div>
                  <div className="text-[8px] text-white/30">Rev: {e.revenueEstimate ?? 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
