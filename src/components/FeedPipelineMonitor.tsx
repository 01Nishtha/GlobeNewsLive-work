'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Activity, Cpu, Database, Radio, Wifi, Server, AlertTriangle, CheckCircle } from 'lucide-react';

interface PipelineNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'error' | 'idle';
  throughput: number;
  queueSize: number;
  latencyMs: number;
  x: number;
  y: number;
}

interface PipelineConnection {
  from: string;
  to: string;
  color: string;
  animated: boolean;
}

const NODES: PipelineNode[] = [
  { id: 'rss-sources', label: 'RSS/API Sources', icon: <Radio size={14} />, status: 'healthy', throughput: 1240, queueSize: 3, latencyMs: 45, x: 60, y: 40 },
  { id: 'web-scraper', label: 'Web Scraper', icon: <Wifi size={14} />, status: 'healthy', throughput: 1180, queueSize: 0, latencyMs: 120, x: 200, y: 40 },
  { id: 'parser', label: 'Feed Parser', icon: <Cpu size={14} />, status: 'healthy', throughput: 1150, queueSize: 12, latencyMs: 85, x: 340, y: 40 },
  { id: 'classifier', label: 'AI Classifier', icon: <Activity size={14} />, status: 'warning', throughput: 980, queueSize: 45, latencyMs: 340, x: 480, y: 40 },
  { id: 'enricher', label: 'Geo Enricher', icon: <Database size={14} />, status: 'healthy', throughput: 960, queueSize: 8, latencyMs: 95, x: 340, y: 140 },
  { id: 'deduplicator', label: 'Deduplicator', icon: <Server size={14} />, status: 'healthy', throughput: 940, queueSize: 2, latencyMs: 60, x: 480, y: 140 },
  { id: 'signal-feed', label: 'Signal Feed', icon: <Radio size={14} />, status: 'healthy', throughput: 940, queueSize: 0, latencyMs: 15, x: 620, y: 90 },
  { id: 'archive', label: 'Archive Store', icon: <Database size={14} />, status: 'idle', throughput: 0, queueSize: 0, latencyMs: 0, x: 620, y: 180 },
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState(NODES);
  const [pulseOffset, setPulseOffset] = useState(0);

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

  // Canvas drawing for connections
  const drawConnections = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    CONNECTIONS.forEach((conn, idx) => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return;

      const startX = fromNode.x + 60;
      const startY = fromNode.y + 20;
      const endX = toNode.x;
      const endY = toNode.y + 20;

      // Draw line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const cp1x = startX + (endX - startX) * 0.5;
      const cp1y = startY;
      const cp2x = startX + (endX - startX) * 0.5;
      const cp2y = endY;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.strokeStyle = conn.color + '40';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animated particles
      if (conn.animated) {
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
          const t = ((pulseOffset * 0.02 + i * 0.33 + idx * 0.1) % 1);
          const invT = 1 - t;
          // Bezier point calculation
          const x = invT * invT * invT * startX + 3 * invT * invT * t * cp1x + 3 * invT * t * t * cp2x + t * t * t * endX;
          const y = invT * invT * invT * startY + 3 * invT * invT * t * cp1y + 3 * invT * t * t * cp2y + t * t * t * endY;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = conn.color;
          ctx.globalAlpha = 0.6 + Math.sin(t * Math.PI) * 0.4;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Arrow at end
      ctx.beginPath();
      ctx.moveTo(endX - 6, endY - 4);
      ctx.lineTo(endX, endY);
      ctx.lineTo(endX - 6, endY + 4);
      ctx.strokeStyle = conn.color + '60';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [nodes, pulseOffset]);

  useEffect(() => {
    drawConnections();
    animRef.current = requestAnimationFrame(() => drawConnections());
    return () => cancelAnimationFrame(animRef.current);
  }, [drawConnections]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
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
          {nodes.some(n => n.status === 'error') && (
            <AlertTriangle size={10} className="text-red-400" />
          )}
        </div>
      </div>

      {/* Pipeline Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 220 }}>
        <canvas
          ref={canvasRef}
          width={720}
          height={260}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        />
        {nodes.map(node => (
          <button
            key={node.id}
            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
            className={`absolute rounded-lg border px-2 py-1.5 transition-all hover:scale-105 ${getStatusBg(node.status)} ${selectedNode === node.id ? 'ring-1 ring-white/30' : ''}`}
            style={{ left: node.x, top: node.y, width: 120 }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ color: getStatusColor(node.status) }}>{node.icon}</span>
              <span className="text-[9px] font-mono text-white/80 truncate">{node.label}</span>
            </div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: getStatusColor(node.status) }}>
              {(node.throughput).toFixed(0)} items/min
            </div>
          </button>
        ))}
      </div>

      {/* Selected Node Detail */}
      {selectedNodeData && (
        <div className="border-t border-white/10 px-3 py-2 bg-white/5">
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
      <div className="px-3 py-2 border-t border-white/10 grid grid-cols-4 gap-2">
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
