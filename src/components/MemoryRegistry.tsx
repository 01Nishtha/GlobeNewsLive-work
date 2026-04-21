'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Database,
  Search,
  GitMerge,
  Moon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Zap,
  FileText,
  HardDrive,
  TrendingUp,
  Shield,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type MemoryCategory = 'conflict' | 'military' | 'diplomacy' | 'economy' | 'cyber' | 'infrastructure';

interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryCategory;
  confidence: number; // 0-1
  source: 'signal' | 'ai-insight' | 'user-note' | 'markdown';
  timestamp: Date;
  tokens: number;
  deduped: boolean;
  mergedInto?: string;
}

interface RecallOp {
  id: string;
  query: string;
  sources: ('sqlite' | 'markdown')[];
  resultsCount: number;
  tokensInjected: number;
  latencyMs: number;
  timestamp: Date;
}

interface DedupeEvent {
  id: string;
  memoryA: string;
  memoryB: string;
  similarity: number;
  action: 'merged' | 'queued' | 'blocked';
  timestamp: Date;
}

interface MaintenanceTask {
  name: string;
  status: 'running' | 'completed' | 'scheduled' | 'failed';
  lastRun: Date;
  nextRun: Date;
  durationMs?: number;
}

// ─── Mock Data Generators ─────────────────────────────────────────────────────

const CATEGORIES: MemoryCategory[] = ['conflict', 'military', 'diplomacy', 'economy', 'cyber', 'infrastructure'];

const MOCK_MEMORY_SEEDS = [
  'Russian naval activity increased in Black Sea',
  'Taiwan Strait air defense zone incursions up 40%',
  'Iranian proxy group staging near Golan Heights',
  'Critical infrastructure attack on German power grid',
  'USD/CNY break above 7.3 triggers algo selling',
  'NATO Article 4 consultation requested by Poland',
  'Satellite imagery shows new missile silo construction',
  'Cyber intrusion detected at major Asian port authority',
  'Diplomatic cables suggest backchannel talks in Geneva',
  'Oil futures spike on Strait of Hormuz closure risk',
  'Refugee flow across Sudan-Chad border accelerating',
  '5G network anomalies detected in Baltic region',
];

function generateMockMemories(count: number): MemoryEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = MOCK_MEMORY_SEEDS[i % MOCK_MEMORY_SEEDS.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    return {
      id: `mem-${1000 + i}`,
      content: `${seed} ${i > MOCK_MEMORY_SEEDS.length ? `(update ${Math.floor(i / MOCK_MEMORY_SEEDS.length)})` : ''}`,
      category,
      confidence: 0.6 + Math.random() * 0.38,
      source: ['signal', 'ai-insight', 'user-note', 'markdown'][i % 4] as MemoryEntry['source'],
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
      tokens: 20 + Math.floor(Math.random() * 80),
      deduped: Math.random() > 0.7,
    };
  });
}

const MOCK_RECALLS: RecallOp[] = [
  { id: 'r1', query: 'Black Sea naval movements', sources: ['sqlite', 'markdown'], resultsCount: 4, tokensInjected: 340, latencyMs: 12, timestamp: new Date(Date.now() - 120000) },
  { id: 'r2', query: 'Taiwan defense posture', sources: ['sqlite'], resultsCount: 7, tokensInjected: 520, latencyMs: 8, timestamp: new Date(Date.now() - 300000) },
  { id: 'r3', query: 'Hormuz shipping risk', sources: ['sqlite', 'markdown'], resultsCount: 3, tokensInjected: 280, latencyMs: 15, timestamp: new Date(Date.now() - 600000) },
  { id: 'r4', query: 'NATO readiness levels', sources: ['markdown'], resultsCount: 2, tokensInjected: 190, latencyMs: 22, timestamp: new Date(Date.now() - 900000) },
];

const MOCK_DEDUPES: DedupeEvent[] = [
  { id: 'd1', memoryA: 'mem-1001', memoryB: 'mem-1013', similarity: 0.96, action: 'merged', timestamp: new Date(Date.now() - 180000) },
  { id: 'd2', memoryA: 'mem-1005', memoryB: 'mem-1022', similarity: 0.89, action: 'queued', timestamp: new Date(Date.now() - 360000) },
  { id: 'd3', memoryA: 'mem-1008', memoryB: 'mem-1019', similarity: 0.94, action: 'merged', timestamp: new Date(Date.now() - 540000) },
  { id: 'd4', memoryA: 'mem-1011', memoryB: 'mem-1025', similarity: 0.82, action: 'blocked', timestamp: new Date(Date.now() - 720000) },
  { id: 'd5', memoryA: 'mem-1003', memoryB: 'mem-1015', similarity: 0.91, action: 'queued', timestamp: new Date(Date.now() - 900000) },
];

const MOCK_MAINTENANCE: MaintenanceTask[] = [
  { name: 'Snapshot Backup', status: 'completed', lastRun: new Date(Date.now() - 3600000 * 2), nextRun: new Date(Date.now() + 3600000 * 22), durationMs: 3400 },
  { name: 'Registry Compaction', status: 'completed', lastRun: new Date(Date.now() - 3600000 * 2), nextRun: new Date(Date.now() + 3600000 * 22), durationMs: 1200 },
  { name: 'SQLite Vacuum', status: 'completed', lastRun: new Date(Date.now() - 3600000 * 2), nextRun: new Date(Date.now() + 3600000 * 22), durationMs: 890 },
  { name: 'Quality Audit', status: 'scheduled', lastRun: new Date(Date.now() - 3600000 * 26), nextRun: new Date(Date.now() + 3600000 * 22), durationMs: 4500 },
  { name: 'Embedding Refresh', status: 'running', lastRun: new Date(Date.now() - 3600000 * 26), nextRun: new Date(Date.now() + 3600000 * 22), durationMs: undefined },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function confidenceColor(c: number): string {
  if (c >= 0.9) return 'text-accent-green';
  if (c >= 0.75) return 'text-accent-gold';
  if (c >= 0.6) return 'text-accent-orange';
  return 'text-accent-red';
}

function confidenceBg(c: number): string {
  if (c >= 0.9) return 'bg-accent-green/20';
  if (c >= 0.75) return 'bg-accent-gold/20';
  if (c >= 0.6) return 'bg-accent-orange/20';
  return 'bg-accent-red/20';
}

function similarityColor(s: number): string {
  if (s >= 0.92) return 'text-accent-green';
  if (s >= 0.85) return 'text-accent-gold';
  return 'text-white/40';
}

function categoryIcon(cat: MemoryCategory): string {
  switch (cat) {
    case 'conflict': return '⚔️';
    case 'military': return '🎖️';
    case 'diplomacy': return '🕊️';
    case 'economy': return '📈';
    case 'cyber': return '💻';
    case 'infrastructure': return '🏗️';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'capture' | 'recall' | 'dedupe' | 'nightly';

export default function MemoryRegistry() {
  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [memories, setMemories] = useState<MemoryEntry[]>(() => generateMockMemories(18));
  const [recalls] = useState<RecallOp[]>(MOCK_RECALLS);
  const [dedupes] = useState<DedupeEvent[]>(MOCK_DEDUPES);
  const [maintenance, setMaintenance] = useState<MaintenanceTask[]>(MOCK_MAINTENANCE);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate live capture
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const seed = MOCK_MEMORY_SEEDS[Math.floor(Math.random() * MOCK_MEMORY_SEEDS.length)];
        const newMem: MemoryEntry = {
          id: `mem-${Date.now()}`,
          content: `${seed} (live)`,
          category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
          confidence: 0.6 + Math.random() * 0.38,
          source: ['signal', 'ai-insight', 'user-note'][Math.floor(Math.random() * 3)] as MemoryEntry['source'],
          timestamp: new Date(),
          tokens: 20 + Math.floor(Math.random() * 80),
          deduped: false,
        };
        setMemories(prev => [newMem, ...prev].slice(0, 50));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Simulate maintenance task progress
  useEffect(() => {
    const interval = setInterval(() => {
      setMaintenance(prev => prev.map(m => {
        if (m.status === 'running' && Math.random() > 0.7) {
          return { ...m, status: 'completed', durationMs: 3000 + Math.floor(Math.random() * 2000) };
        }
        return m;
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredMemories = memories.filter(m =>
    searchQuery === '' || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalMemories = memories.length;
  const avgConfidence = memories.reduce((s, m) => s + m.confidence, 0) / memories.length;
  const totalTokens = memories.reduce((s, m) => s + m.tokens, 0);
  const dedupedCount = memories.filter(m => m.deduped).length;
  const mergedCount = dedupes.filter(d => d.action === 'merged').length;
  const queuedCount = dedupes.filter(d => d.action === 'queued').length;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">MEMORY REGISTRY</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-white/30">
            <Database size={9} className="inline mr-1" />
            SQLite
          </span>
          <span className="text-[9px] font-mono text-white/30">
            <Shield size={9} className="inline mr-1" />
            Local
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-3 py-2 border-b border-white/10 grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] font-mono text-white">{totalMemories}</div>
          <div className="text-[7px] text-white/30 font-mono">ENTRIES</div>
        </div>
        <div className="text-center">
          <div className={`text-[10px] font-mono ${confidenceColor(avgConfidence)}`}>{(avgConfidence * 100).toFixed(0)}%</div>
          <div className="text-[7px] text-white/30 font-mono">AVG CONF</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-blue">{(totalTokens / 1000).toFixed(1)}k</div>
          <div className="text-[7px] text-white/30 font-mono">TOKENS</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-green">{dedupedCount}</div>
          <div className="text-[7px] text-white/30 font-mono">DEDUPED</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {([
          { key: 'capture', label: 'CAPTURE', icon: Zap },
          { key: 'recall', label: 'RECALL', icon: Search },
          { key: 'dedupe', label: 'DEDUPE', icon: GitMerge },
          { key: 'nightly', label: 'NIGHTLY', icon: Moon },
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
        {/* ── CAPTURE TAB ── */}
        {activeTab === 'capture' && (
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="px-3 py-2 border-b border-white/5">
              <div className="relative">
                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search registry..."
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 pl-7 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-accent-green/50"
                />
              </div>
            </div>

            {/* Memory Feed */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {filteredMemories.map(mem => (
                <div
                  key={mem.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => setExpandedMemory(expandedMemory === mem.id ? null : mem.id)}
                    className="w-full px-3 py-2 flex items-start gap-2"
                  >
                    <span className="text-sm mt-0.5 flex-shrink-0">{categoryIcon(mem.category)}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${confidenceBg(mem.confidence)} ${confidenceColor(mem.confidence)}`}>
                          {(mem.confidence * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] font-mono text-white/30">{mem.id}</span>
                        {mem.deduped && (
                          <span className="text-[8px] font-mono text-accent-blue bg-accent-blue/10 px-1 rounded">DEDUPED</span>
                        )}
                        <span className="text-[8px] font-mono text-white/20 ml-auto">{formatTimeAgo(mem.timestamp)}</span>
                      </div>
                      <div className="text-[10px] font-mono text-white/80 truncate">{mem.content}</div>
                    </div>
                  </button>

                  {expandedMemory === mem.id && (
                    <div className="px-3 pb-2 pl-10 grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[7px] text-white/30 font-mono">SOURCE</div>
                        <div className="text-[9px] font-mono text-white/60 capitalize">{mem.source}</div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white/30 font-mono">TOKENS</div>
                        <div className="text-[9px] font-mono text-white/60">{mem.tokens}</div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white/30 font-mono">CATEGORY</div>
                        <div className="text-[9px] font-mono text-white/60 capitalize">{mem.category}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECALL TAB ── */}
        {activeTab === 'recall' && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-white/5">
              <div className="text-[9px] font-mono text-white/50 mb-1">HYBRID SEARCH</div>
              <div className="flex gap-1">
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">SQLite</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/20">Markdown</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-accent-gold/10 text-accent-gold border border-accent-gold/20">TopK</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">Token Budget</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {recalls.map(rec => (
                <div key={rec.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Search size={10} className="text-accent-green" />
                    <span className="text-[10px] font-mono text-white truncate flex-1">&quot;{rec.query}&quot;</span>
                    <span className="text-[8px] font-mono text-white/20">{formatTimeAgo(rec.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-3 pl-5">
                    <div className="flex items-center gap-1">
                      <Database size={8} className="text-white/20" />
                      <span className="text-[9px] font-mono text-white/40">{rec.resultsCount} results</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText size={8} className="text-white/20" />
                      <span className="text-[9px] font-mono text-accent-blue">{rec.tokensInjected}t</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={8} className="text-white/20" />
                      <span className="text-[9px] font-mono text-white/40">{rec.latencyMs}ms</span>
                    </div>
                    <div className="flex gap-0.5 ml-auto">
                      {rec.sources.map(s => (
                        <span key={s} className={`text-[7px] font-mono px-1 rounded ${s === 'sqlite' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-blue/10 text-accent-blue'}`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DEDUPE TAB ── */}
        {activeTab === 'dedupe' && (
          <div className="h-full flex flex-col">
            {/* Threshold Legend */}
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-3 text-[8px] font-mono">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent-green" />
                  <span className="text-white/40">&ge;0.92 auto-merge</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent-gold" />
                  <span className="text-white/40">0.85-0.92 queue</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <span className="text-white/40">&lt;0.85 distinct</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-3 py-2 border-b border-white/5 grid grid-cols-3 gap-2">
              <div className="text-center bg-accent-green/5 border border-accent-green/10 rounded py-1">
                <div className="text-[10px] font-mono text-accent-green">{mergedCount}</div>
                <div className="text-[7px] text-white/30 font-mono">MERGED</div>
              </div>
              <div className="text-center bg-accent-gold/5 border border-accent-gold/10 rounded py-1">
                <div className="text-[10px] font-mono text-accent-gold">{queuedCount}</div>
                <div className="text-[7px] text-white/30 font-mono">QUEUED</div>
              </div>
              <div className="text-center bg-white/5 border border-white/10 rounded py-1">
                <div className="text-[10px] font-mono text-white/60">{dedupes.filter(d => d.action === 'blocked').length}</div>
                <div className="text-[7px] text-white/30 font-mono">BLOCKED</div>
              </div>
            </div>

            {/* Dedupe Events */}
            <div className="flex-1 overflow-y-auto">
              {dedupes.map(d => (
                <div key={d.id} className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <GitMerge size={10} className={d.action === 'merged' ? 'text-accent-green' : d.action === 'queued' ? 'text-accent-gold' : 'text-white/20'} />
                    <span className="text-[9px] font-mono text-white/60">{d.memoryA}</span>
                    <span className="text-[8px] text-white/20">vs</span>
                    <span className="text-[9px] font-mono text-white/60">{d.memoryB}</span>
                    <span className="text-[8px] font-mono text-white/20 ml-auto">{formatTimeAgo(d.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-5">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.similarity >= 0.92 ? 'bg-accent-green' : d.similarity >= 0.85 ? 'bg-accent-gold' : 'bg-white/20'}`}
                        style={{ width: `${d.similarity * 100}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-mono ${similarityColor(d.similarity)}`}>{(d.similarity * 100).toFixed(0)}%</span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                      d.action === 'merged' ? 'bg-accent-green/10 text-accent-green' :
                      d.action === 'queued' ? 'bg-accent-gold/10 text-accent-gold' :
                      'bg-white/5 text-white/30'
                    }`}>
                      {d.action.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NIGHTLY TAB ── */}
        {activeTab === 'nightly' && (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Moon size={10} className="text-accent-blue" />
                <span className="text-[9px] font-mono text-white/50">CRON SCHEDULE: 02:00 UTC</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {maintenance.map(task => (
                <div key={task.name} className="px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    {task.status === 'completed' && <CheckCircle2 size={10} className="text-accent-green" />}
                    {task.status === 'running' && <Zap size={10} className="text-accent-blue animate-pulse" />}
                    {task.status === 'scheduled' && <Clock size={10} className="text-white/30" />}
                    {task.status === 'failed' && <AlertTriangle size={10} className="text-accent-red" />}
                    <span className="text-[10px] font-mono text-white">{task.name}</span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ml-auto ${
                      task.status === 'completed' ? 'bg-accent-green/10 text-accent-green' :
                      task.status === 'running' ? 'bg-accent-blue/10 text-accent-blue' :
                      task.status === 'scheduled' ? 'bg-white/5 text-white/30' :
                      'bg-accent-red/10 text-accent-red'
                    }`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-5">
                    <div>
                      <div className="text-[7px] text-white/30 font-mono">LAST RUN</div>
                      <div className="text-[9px] font-mono text-white/50">{formatTimeAgo(task.lastRun)} ago</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-white/30 font-mono">NEXT RUN</div>
                      <div className="text-[9px] font-mono text-white/50">in {formatTimeAgo(new Date(task.nextRun.getTime() - Date.now() + Date.now()))}</div>
                    </div>
                    {task.durationMs && (
                      <div>
                        <div className="text-[7px] text-white/30 font-mono">DURATION</div>
                        <div className="text-[9px] font-mono text-white/50">{(task.durationMs / 1000).toFixed(1)}s</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: storage info */}
            <div className="px-3 py-2 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <HardDrive size={9} className="text-white/20" />
                  <span className="text-[8px] font-mono text-white/30">registry.db</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[8px] font-mono text-white/30">{(totalTokens * 4 / 1024).toFixed(1)} KB</span>
                  <span className="text-[8px] font-mono text-accent-green">VACUUMED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
