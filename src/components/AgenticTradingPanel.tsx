'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  GitBranch,
  Globe,
  DollarSign,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Cpu,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = 'running' | 'paused' | 'stopped';
type StrategyType = 'market_making' | 'arbitrage' | 'grid' | 'momentum' | 'mean_reversion';

interface TradingAgent {
  id: string;
  name: string;
  exchange: string;
  exchangeType: 'cex' | 'dex';
  strategy: StrategyType;
  status: AgentStatus;
  pair: string;
  pnl24h: number;
  pnlTotal: number;
  uptimeHours: number;
  trades24h: number;
  winRate: number;
  apy: number;
}

interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  exchanges: string[];
  backtestReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  tradesPerDay: number;
  activeAgents: number;
}

interface Trade {
  id: string;
  agentId: string;
  agentName: string;
  pair: string;
  exchange: string;
  side: 'buy' | 'sell';
  size: string;
  price: number;
  pnl: number | null;
  timestamp: Date;
  strategy: StrategyType;
}

interface ArbitrageOp {
  id: string;
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  profitPotential: string;
  latencyMs: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<StrategyType, string> = {
  market_making: 'Market Making',
  arbitrage: 'Arbitrage',
  grid: 'Grid Trading',
  momentum: 'Momentum',
  mean_reversion: 'Mean Reversion',
};

const STRATEGY_ICONS: Record<StrategyType, string> = {
  market_making: '📊',
  arbitrage: '⚡',
  grid: '🔲',
  momentum: '🚀',
  mean_reversion: '📈',
};

const MOCK_AGENTS: TradingAgent[] = [
  { id: 'a1', name: 'Condor-Alpha', exchange: 'Binance', exchangeType: 'cex', strategy: 'arbitrage', status: 'running', pair: 'BTC/USDT', pnl24h: 1240.50, pnlTotal: 15200.00, uptimeHours: 168, trades24h: 45, winRate: 0.68, apy: 34.2 },
  { id: 'a2', name: 'Condor-Beta', exchange: 'Hyperliquid', exchangeType: 'dex', strategy: 'market_making', status: 'running', pair: 'ETH/USDC', pnl24h: 890.20, pnlTotal: 8400.00, uptimeHours: 120, trades24h: 120, winRate: 0.72, apy: 28.5 },
  { id: 'a3', name: 'Condor-Gamma', exchange: 'dYdX', exchangeType: 'dex', strategy: 'grid', status: 'running', pair: 'SOL/USDC', pnl24h: -120.40, pnlTotal: 3200.00, uptimeHours: 96, trades24h: 34, winRate: 0.58, apy: 18.3 },
  { id: 'a4', name: 'Condor-Delta', exchange: 'Bybit', exchangeType: 'cex', strategy: 'momentum', status: 'paused', pair: 'XAU/USD', pnl24h: 0, pnlTotal: 2100.00, uptimeHours: 72, trades24h: 0, winRate: 0.61, apy: 22.1 },
  { id: 'a5', name: 'Condor-Epsilon', exchange: 'OKX', exchangeType: 'cex', strategy: 'mean_reversion', status: 'running', pair: 'BTC/ETH', pnl24h: 340.80, pnlTotal: 5600.00, uptimeHours: 48, trades24h: 18, winRate: 0.65, apy: 26.7 },
  { id: 'a6', name: 'Condor-Zeta', exchange: 'Uniswap v3', exchangeType: 'dex', strategy: 'arbitrage', status: 'running', pair: 'ETH/USDT', pnl24h: 560.10, pnlTotal: 7800.00, uptimeHours: 200, trades24h: 62, winRate: 0.71, apy: 31.4 },
  { id: 'a7', name: 'Condor-Eta', exchange: 'Kraken', exchangeType: 'cex', strategy: 'grid', status: 'stopped', pair: 'AVAX/USDT', pnl24h: 0, pnlTotal: -400.00, uptimeHours: 24, trades24h: 0, winRate: 0.45, apy: -8.2 },
  { id: 'a8', name: 'Condor-Theta', exchange: 'GMX', exchangeType: 'dex', strategy: 'market_making', status: 'running', pair: 'ARB/USDC', pnl24h: 210.30, pnlTotal: 1900.00, uptimeHours: 80, trades24h: 88, winRate: 0.69, apy: 24.8 },
];

const MOCK_STRATEGIES: Strategy[] = [
  { id: 's1', name: 'Cross-Exchange Arb', type: 'arbitrage', description: 'Exploits price discrepancies across CEX/DEX venues', exchanges: ['Binance', 'Hyperliquid', 'dYdX', 'Uniswap v3'], backtestReturn: 42.5, sharpeRatio: 2.1, maxDrawdown: 8.3, winRate: 0.68, tradesPerDay: 55, activeAgents: 3 },
  { id: 's2', name: 'Hummingbot MM', type: 'market_making', description: 'Provides liquidity with dynamic spread adjustment', exchanges: ['Hyperliquid', 'GMX', 'Bybit'], backtestReturn: 28.3, sharpeRatio: 1.8, maxDrawdown: 5.1, winRate: 0.72, tradesPerDay: 120, activeAgents: 2 },
  { id: 's3', name: 'Volatility Grid', type: 'grid', description: 'Captures oscillations in ranging markets', exchanges: ['Binance', 'OKX', 'Kraken'], backtestReturn: 19.7, sharpeRatio: 1.4, maxDrawdown: 12.5, winRate: 0.58, tradesPerDay: 35, activeAgents: 2 },
  { id: 's4', name: 'Trend Follower', type: 'momentum', description: 'Rides directional moves with trailing stops', exchanges: ['Bybit', 'Binance'], backtestReturn: 35.2, sharpeRatio: 1.6, maxDrawdown: 15.2, winRate: 0.61, tradesPerDay: 18, activeAgents: 1 },
  { id: 's5', name: 'Bounce Hunter', type: 'mean_reversion', description: 'Identifies overbought/oversold conditions', exchanges: ['OKX', 'Kraken', 'dYdX'], backtestReturn: 24.1, sharpeRatio: 1.5, maxDrawdown: 9.8, winRate: 0.65, tradesPerDay: 22, activeAgents: 1 },
];

const MOCK_TRADES: Trade[] = [
  { id: 't1', agentId: 'a1', agentName: 'Condor-Alpha', pair: 'BTC/USDT', exchange: 'Binance', side: 'buy', size: '0.15', price: 68420.00, pnl: null, timestamp: new Date(Date.now() - 120000), strategy: 'arbitrage' },
  { id: 't2', agentId: 'a1', agentName: 'Condor-Alpha', pair: 'BTC/USDT', exchange: 'Hyperliquid', side: 'sell', size: '0.15', price: 68495.00, pnl: 11.25, timestamp: new Date(Date.now() - 115000), strategy: 'arbitrage' },
  { id: 't3', agentId: 'a2', agentName: 'Condor-Beta', pair: 'ETH/USDC', exchange: 'Hyperliquid', side: 'buy', size: '2.5', price: 3450.20, pnl: null, timestamp: new Date(Date.now() - 300000), strategy: 'market_making' },
  { id: 't4', agentId: 'a2', agentName: 'Condor-Beta', pair: 'ETH/USDC', exchange: 'Hyperliquid', side: 'sell', size: '2.5', price: 3452.80, pnl: 6.50, timestamp: new Date(Date.now() - 240000), strategy: 'market_making' },
  { id: 't5', agentId: 'a5', agentName: 'Condor-Epsilon', pair: 'BTC/ETH', exchange: 'OKX', side: 'sell', size: '0.08', price: 19.82, pnl: 12.40, timestamp: new Date(Date.now() - 600000), strategy: 'mean_reversion' },
  { id: 't6', agentId: 'a6', agentName: 'Condor-Zeta', pair: 'ETH/USDT', exchange: 'Uniswap v3', side: 'buy', size: '1.2', price: 3448.50, pnl: null, timestamp: new Date(Date.now() - 900000), strategy: 'arbitrage' },
  { id: 't7', agentId: 'a6', agentName: 'Condor-Zeta', pair: 'ETH/USDT', exchange: 'Binance', side: 'sell', size: '1.2', price: 3451.20, pnl: 3.24, timestamp: new Date(Date.now() - 895000), strategy: 'arbitrage' },
  { id: 't8', agentId: 'a3', agentName: 'Condor-Gamma', pair: 'SOL/USDC', exchange: 'dYdX', side: 'buy', size: '50', price: 142.30, pnl: -25.00, timestamp: new Date(Date.now() - 1800000), strategy: 'grid' },
];

const MOCK_ARBITRAGE: ArbitrageOp[] = [
  { id: 'arb1', pair: 'BTC/USDT', buyExchange: 'Binance', sellExchange: 'Hyperliquid', buyPrice: 68420.00, sellPrice: 68495.00, spreadPercent: 0.11, profitPotential: '$11.25', latencyMs: 340 },
  { id: 'arb2', pair: 'ETH/USDC', buyExchange: 'Uniswap v3', sellExchange: 'Bybit', buyPrice: 3448.50, sellPrice: 3452.10, spreadPercent: 0.10, profitPotential: '$4.32', latencyMs: 520 },
  { id: 'arb3', pair: 'SOL/USDC', buyExchange: 'Kraken', sellExchange: 'dYdX', buyPrice: 142.10, sellPrice: 142.85, spreadPercent: 0.53, profitPotential: '$18.50', latencyMs: 890 },
  { id: 'arb4', pair: 'ARB/USDC', buyExchange: 'GMX', sellExchange: 'Binance', buyPrice: 0.8230, sellPrice: 0.8295, spreadPercent: 0.79, profitPotential: '$7.90', latencyMs: 410 },
  { id: 'arb5', pair: 'XAU/USD', buyExchange: 'Kraken', sellExchange: 'OKX', buyPrice: 2341.20, sellPrice: 2342.80, spreadPercent: 0.07, profitPotential: '$1.60', latencyMs: 620 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function statusColor(s: AgentStatus): string {
  switch (s) {
    case 'running': return 'text-accent-green';
    case 'paused': return 'text-accent-gold';
    case 'stopped': return 'text-accent-red';
  }
}

function statusBg(s: AgentStatus): string {
  switch (s) {
    case 'running': return 'bg-accent-green/15';
    case 'paused': return 'bg-accent-gold/15';
    case 'stopped': return 'bg-accent-red/15';
  }
}

function statusBorder(s: AgentStatus): string {
  switch (s) {
    case 'running': return 'border-accent-green/30';
    case 'paused': return 'border-accent-gold/30';
    case 'stopped': return 'border-accent-red/30';
  }
}

function pnlColor(n: number): string {
  return n > 0 ? 'text-accent-green' : n < 0 ? 'text-accent-red' : 'text-white/40';
}

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'agents' | 'strategies' | 'trades' | 'arbitrage';

export default function AgenticTradingPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [agents, setAgents] = useState<TradingAgent[]>(MOCK_AGENTS);
  const [trades, setTrades] = useState<Trade[]>(MOCK_TRADES);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      // Randomly update agent PnL
      setAgents(prev => prev.map(a => {
        if (a.status === 'running' && Math.random() > 0.6) {
          const pnlChange = (Math.random() - 0.4) * 50;
          return {
            ...a,
            pnl24h: a.pnl24h + pnlChange,
            pnlTotal: a.pnlTotal + pnlChange,
            trades24h: a.trades24h + (Math.random() > 0.7 ? 1 : 0),
          };
        }
        return a;
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const runningCount = agents.filter(a => a.status === 'running').length;
  const totalPnl = agents.reduce((s, a) => s + a.pnl24h, 0);
  const avgWinRate = agents.filter(a => a.status !== 'stopped').reduce((s, a) => s + a.winRate, 0) / agents.filter(a => a.status !== 'stopped').length;
  const totalTrades = agents.reduce((s, a) => s + a.trades24h, 0);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">AGENTIC TRADING</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-white/30">
            <Cpu size={9} className="inline mr-1" />
            AI-Powered
          </span>
          <span className="text-[9px] font-mono text-white/30">
            <Globe size={9} className="inline mr-1" />
            40+ Venues
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-3 py-2 border-b border-white/10 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-green">{runningCount}/{agents.length}</div>
          <div className="text-[7px] text-white/30 font-mono">AGENTS</div>
        </div>
        <div className="text-center">
          <div className={`text-[10px] font-mono ${pnlColor(totalPnl)}`}>{totalPnl > 0 ? '+' : ''}{totalPnl.toFixed(0)}</div>
          <div className="text-[7px] text-white/30 font-mono">24H P&L</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-blue">{(avgWinRate * 100).toFixed(0)}%</div>
          <div className="text-[7px] text-white/30 font-mono">WIN RATE</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-white">{totalTrades}</div>
          <div className="text-[7px] text-white/30 font-mono">TRADES</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {([
          { key: 'agents', label: 'AGENTS', icon: Bot },
          { key: 'strategies', label: 'STRATEGIES', icon: GitBranch },
          { key: 'trades', label: 'TRADES', icon: Activity },
          { key: 'arbitrage', label: 'ARBITRAGE', icon: Zap },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-[9px] font-mono tracking-wider transition-all ${
              activeTab === tab.key
                ? 'bg-white/5 text-accent-green border-b-2 border-accent-green'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            <tab.icon size={10} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* ── AGENTS TAB ── */}
        {activeTab === 'agents' && (
          <div className="h-full overflow-y-auto">
            {agents.map(agent => (
              <div key={agent.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <button
                  onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                  className="w-full px-3 py-2 flex items-center gap-2"
                >
                  <span className={`text-lg flex-shrink-0`}>{STRATEGY_ICONS[agent.strategy]}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-white">{agent.name}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${statusBg(agent.status)} ${statusColor(agent.status)} ${statusBorder(agent.status)}`}>
                        {agent.status.toUpperCase()}
                      </span>
                      <span className="text-[8px] font-mono text-white/20 ml-auto">{agent.uptimeHours}h uptime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-white/40">{agent.exchange}</span>
                      <span className="text-[8px] font-mono text-white/20">{agent.exchangeType.toUpperCase()}</span>
                      <span className="text-[9px] font-mono text-white/30">{agent.pair}</span>
                      <span className={`text-[9px] font-mono ml-auto ${pnlColor(agent.pnl24h)}`}>
                        {agent.pnl24h > 0 ? '+' : ''}{agent.pnl24h.toFixed(0)} 24h
                      </span>
                    </div>
                  </div>
                </button>

                {expandedAgent === agent.id && (
                  <div className="px-3 pb-2 pl-10 grid grid-cols-4 gap-2">
                    <div>
                      <div className="text-[7px] text-white/30 font-mono">TOTAL P&L</div>
                      <div className={`text-[9px] font-mono ${pnlColor(agent.pnlTotal)}`}>{agent.pnlTotal > 0 ? '+' : ''}{agent.pnlTotal.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-white/30 font-mono">WIN RATE</div>
                      <div className="text-[9px] font-mono text-white/60">{(agent.winRate * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-white/30 font-mono">TRADES 24H</div>
                      <div className="text-[9px] font-mono text-white/60">{agent.trades24h}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-white/30 font-mono">APY</div>
                      <div className={`text-[9px] font-mono ${pnlColor(agent.apy)}`}>{agent.apy > 0 ? '+' : ''}{agent.apy.toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STRATEGIES TAB ── */}
        {activeTab === 'strategies' && (
          <div className="h-full overflow-y-auto p-2 space-y-2">
            {MOCK_STRATEGIES.map(strat => (
              <div key={strat.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{STRATEGY_ICONS[strat.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-white truncate">{strat.name}</div>
                    <div className="text-[8px] text-white/30 font-mono truncate">{strat.description}</div>
                  </div>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                    {strat.activeAgents} agent{strat.activeAgents !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-1.5">
                  <div className="text-center">
                    <div className="text-[9px] font-mono text-accent-green">+{strat.backtestReturn}%</div>
                    <div className="text-[7px] text-white/30 font-mono">RETURN</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-mono text-accent-blue">{strat.sharpeRatio}</div>
                    <div className="text-[7px] text-white/30 font-mono">SHARPE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-mono text-accent-red">-{strat.maxDrawdown}%</div>
                    <div className="text-[7px] text-white/30 font-mono">DRAWDOWN</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-mono text-white/60">{(strat.winRate * 100).toFixed(0)}%</div>
                    <div className="text-[7px] text-white/30 font-mono">WIN RATE</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {strat.exchanges.map(ex => (
                    <span key={ex} className="text-[7px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10">{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TRADES TAB ── */}
        {activeTab === 'trades' && (
          <div className="h-full overflow-y-auto">
            {trades.map(trade => (
              <div key={trade.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  {trade.side === 'buy' ? (
                    <ArrowUpRight size={10} className="text-accent-green" />
                  ) : (
                    <ArrowDownRight size={10} className="text-accent-red" />
                  )}
                  <span className="text-[10px] font-mono text-white">{trade.pair}</span>
                  <span className={`text-[8px] font-mono px-1 rounded ${trade.side === 'buy' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
                    {trade.side.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono text-white/40">{trade.exchange}</span>
                  <span className="text-[8px] font-mono text-white/20 ml-auto">{formatTimeAgo(trade.timestamp)}</span>
                </div>
                <div className="flex items-center gap-3 pl-5">
                  <div>
                    <span className="text-[7px] text-white/30 font-mono">SIZE </span>
                    <span className="text-[9px] font-mono text-white/60">{trade.size}</span>
                  </div>
                  <div>
                    <span className="text-[7px] text-white/30 font-mono">PRICE </span>
                    <span className="text-[9px] font-mono text-white/60">{trade.price.toLocaleString()}</span>
                  </div>
                  {trade.pnl !== null && (
                    <div>
                      <span className="text-[7px] text-white/30 font-mono">P&L </span>
                      <span className={`text-[9px] font-mono ${pnlColor(trade.pnl)}`}>{trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}</span>
                    </div>
                  )}
                  <span className="text-[7px] font-mono px-1 py-0.5 rounded bg-white/5 text-white/30 ml-auto">{trade.agentName}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ARBITRAGE TAB ── */}
        {activeTab === 'arbitrage' && (
          <div className="h-full overflow-y-auto">
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Zap size={10} className="text-accent-gold" />
                <span className="text-[9px] font-mono text-white/50">CROSS-EXCHANGE SPREADS</span>
              </div>
            </div>
            {MOCK_ARBITRAGE.map(arb => (
              <div key={arb.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono text-white">{arb.pair}</span>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                    {arb.spreadPercent.toFixed(2)}%
                  </span>
                  <span className="text-[8px] font-mono text-white/20 ml-auto">{arb.latencyMs}ms latency</span>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] font-mono text-accent-green">{arb.buyExchange}</span>
                      <span className="text-[8px] font-mono text-white/30">{arb.buyPrice.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[8px] font-mono text-accent-red">{arb.sellExchange}</span>
                      <span className="text-[8px] font-mono text-white/30">{arb.sellPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right pl-2">
                    <div className="text-[9px] font-mono text-accent-green">+{arb.profitPotential}</div>
                    <div className="text-[7px] text-white/30 font-mono">EST. PROFIT</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
