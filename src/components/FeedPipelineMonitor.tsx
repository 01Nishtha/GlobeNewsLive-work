'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Cpu, Database, Radio, Wifi, Server, AlertTriangle } from 'lucide-react';

interface PipelineNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'error' | 'idle';
  throughput: number;
  queueSize: number;
  latencyMs: number;
  col: number;
  row: number;
}

interface PipelineConnection {
  from: string;
  to: string;
  color: string;
  animated: boolean;
}

const NODES: PipelineNode[] = [
  { id: 'rss-sources', label: 'RSS/API Sources', icon: <Radio size={12} />, status: 'healthy', throughput: 1240, queueSize: 3, latencyMs: 45, col: 0, row: 0 },
  { id: 'web-scraper', label: 'Web Scraper', icon: <Wifi size={12} />, status: 'healthy', throughput: 1180, queueSize: 0, latencyMs: 120, col: 1, row: 0 },
  { id: 'parser', label: 'Feed Parser', icon: <Cpu size={12} />, status: 'healthy', throughput: 1150, queueSize: 12, latencyMs: 85, col: 2, row: 0 },
  { id: 'classifier', label: 'AI Classifier', icon: <Activity size={12} />, status: 'warning', throughput: 980, queueSize: 45, latencyMs: 340, col: 3, row: 0 },
  { id: 'enricher', label: 'Geo Enricher', icon: <Database size={12} />, status: 'healthy', throughput: 960, queueSize: 8, latencyMs: 95, col: 2, row: 1 },
  { id: 'deduplicator', label: 'Deduplicator', icon: <Server size={12} />, status: 'healthy', throughput: 940, queueSize: 2, latencyMs: 60, col: 3, row: 1 },
  { id: 'signal-feed', label: 'Signal Feed', icon: <Radio size={12} />, status: 'healthy', throughput: 940, queueSize: 0, latencyMs: 15, col: 4, row: 0 },
  { id: 'archive', label: 'Archive Store', icon: <Database size={12} />, status: 'idle', throughput: 0, queueSize: 0, latencyMs: 0, col: 4, row: 1 },
];

const CONNECTIONS: PipelineConnection[] = [
  { from: 'rss-sources', to: 'parser', color: '#00ff88', animated: true },
  { from: 'web-scraper', to: 'parser', color: '#00ff88', animated: true },
  { from: 'parser', to: 'classifier', color: '#00ff88', animated: true },
  { from: 'parser', to: 'enricher', color: '#00aaff', animated: true },
  { from: 'enricher', to: 'deduplicator', color: '#00aaff', animated: true },
  { from: 'classifier', to: 'signal-feed', color: '#00ff88', animated: true },
  { from: 'deduplicator', to: 'signal-feed', color: '#00aaff', animated: true },
  { from: 'signal-feed', to: 'archive', color: '#ffaa00', animated: false },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy': return '#00ff88';
    case 'warning': return '#ffaa00';
    case 'error': return '#ff4444';
    default: return '#666';
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'warning': return 'bg-amber-500/10 border-amber-500/30';
    case 'error': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-white/5 border-white/10';
  }
}

export default function FeedPipelineMonitor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState(NODES);
  const [pulseOffset, setPulseOffset] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 600, height: 200 });

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // Simulate live data
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(n => ({
        ...n,
        throughput: n.status === 'idle' ? 0 : Math.max(0, n.throughput + (Math.random() - 0.5) * 40),
        queueSize: n.status === 'idle' ? 0 : Math.max(0, Math.floor(n.queueSize + (Math.random() - 0.4) * 4)),
        latencyMs: n.status === 'idle' ? 0 : Math.max(10, n.latencyMs + (Math.random() - 0.5) * 20),
      })));
      setPulseOffset(p => (p + 1) % 100);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Compute node positions based on container size
  const getNodePos = useCallback((node: PipelineNode) => {
    const cols = 5;
    const rows = 2;
    const padX = dimensions.width * 0.02;
    const padY = dimensions.height * 0.08;
    const cellW = (dimensions.width - padX * 2) / cols;
    const cellH = (dimensions.height - padY * 2) / rows;
    const x = padX + node.col * cellW + cellW * 0.5;
    const y = padY + node.row * cellH + cellH * 0.5;
    return { x, y, cellW, cellH };
  }, [dimensions]);

  // Canvas drawing for connections
  const drawConnections = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    CONNECTIONS.forEach((conn, idx) => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return;

      const fromPos = getNodePos(fromNode);
      const toPos = getNodePos(toNode);

      const startX = fromPos.x + fromPos.cellW * 0.35;
      const startY = fromPos.y;
      const endX = toPos.x - toPos.cellW * 0.35;
      const endY = toPos.y;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const cp1x = startX + (endX - startX) * 0.5;
      const cp1y = startY;
      const cp2x = startX + (endX - startX) * 0.5;
      const cp2y = endY;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = conn.color + '30';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Animated particles
      if (conn.animated) {
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
          const t = ((pulseOffset * 0.02 + i * 0.33 + idx * 0.1) % 1);
          const invT = 1 - t;
          const x = invT * invT * invT * startX + 3 * invT * invT * t * cp1x + 3 * invT * t * t * cp2x + t * t * t * endX;
          const y = invT * invT * invT * startY + 3 * invT * invT * t * cp1y + 3 * invT * t * t * cp2y + t * t * t * endY;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = conn.color;
          ctx.globalAlpha = 0.5 + Math.sin(t * Math.PI) * 0.4;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Arrow at end
      ctx.beginPath();
      ctx.moveTo(endX - 5, endY - 3);
      ctx.lineTo(endX, endY);
      ctx.lineTo(endX - 5, endY + 3);
      ctx.strokeStyle = conn.color + '50';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [nodes, pulseOffset, dimensions, getNodePos]);

  useEffect(() => {
    drawConnections();
    animRef.current = requestAnimationFrame(() => drawConnections());
    return () => cancelAnimationFrame(animRef.current);
  }, [drawConnections]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">FEED PIPELINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/30">
            {nodes.filter(n => n.status === 'healthy').length}/{nodes.length} healthy
          </span>
          {nodes.some(n => n.status === 'warning') && (
            <AlertTriangle size={10} className="text-amber-400" />
          )}
        </div>
      </div>

      {/* Pipeline Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ minHeight: 180 }}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        />
        {nodes.map(node => {
          const pos = getNodePos(node);
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              className={`absolute rounded-lg border px-1.5 py-1 transition-all hover:scale-105 ${getStatusBg(node.status)} ${selectedNode === node.id ? 'ring-1 ring-white/30' : ''}`}
              style={{
                left: pos.x - pos.cellW * 0.42,
                top: pos.y - 18,
                width: pos.cellW * 0.84,
              }}
            >
              <div className="flex items-center gap-1 justify-center">
                <span style={{ color: getStatusColor(node.status) }}>{node.icon}</span>
                <span className="text-[8px] font-mono text-white/80 truncate">{node.label}</span>
              </div>
              <div className="text-[7px] font-mono mt-0.5 text-center" style={{ color: getStatusColor(node.status) }}>
                {(node.throughput).toFixed(0)}/min
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Detail */}
      {selectedNodeData && (
        <div className="border-t border-white/10 px-3 py-2 bg-white/5 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-white">{selectedNodeData.label}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getStatusBg(selectedNodeData.status)}`} style={{ color: getStatusColor(selectedNodeData.status) }}>
              {selectedNodeData.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[8px] text-white/30 font-mono">THROUGHPUT</div>
              <div className="text-[10px] font-mono text-white">{selectedNodeData.throughput.toFixed(0)}/min</div>
            </div>
            <div>
              <div className="text-[8px] text-white/30 font-mono">QUEUE</div>
              <div className="text-[10px] font-mono text-white">{selectedNodeData.queueSize} items</div>
            </div>
            <div>
              <div className="text-[8px] text-white/30 font-mono">LATENCY</div>
              <div className="text-[10px] font-mono text-white">{selectedNodeData.latencyMs.toFixed(0)}ms</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="px-3 py-2 border-t border-white/10 grid grid-cols-4 gap-2 shrink-0">
        <div className="text-center">
          <div className="text-[8px] text-white/30 font-mono">TOTAL IN</div>
          <div className="text-[10px] font-mono text-accent-green">{(nodes[0].throughput + nodes[1].throughput).toFixed(0)}</div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-white/30 font-mono">PROCESSED</div>
          <div className="text-[10px] font-mono text-accent-blue">{nodes[6].throughput.toFixed(0)}</div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-white/30 font-mono">QUEUE TOTAL</div>
          <div className="text-[10px] font-mono text-amber-400">{nodes.reduce((s, n) => s + n.queueSize, 0)}</div>
        </div>
        <div className="text-center">
          <div className="text-[8px] text-white/30 font-mono">UPTIME</div>
          <div className="text-[10px] font-mono text-white">99.7%</div>
        </div>
      </div>
    </div>
  );
}
