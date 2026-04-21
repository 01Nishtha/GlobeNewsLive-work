'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Waves, Maximize2, Minimize2, Settings } from 'lucide-react';

interface WaterfallConfig {
  speed: number;
  colorScheme: 'green' | 'amber' | 'multi';
  sensitivity: number;
}

// Generate synthetic spectrum data
function generateSpectrumLine(buckets: number, timeOffset: number, sensitivity: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < buckets; i++) {
    const freq = i / buckets;
    // Base noise
    let val = Math.random() * 0.15 * sensitivity;
    // Signal peaks at certain frequencies
    const peak1 = Math.exp(-Math.pow((freq - 0.15) * 15, 2)) * 0.8;
    const peak2 = Math.exp(-Math.pow((freq - 0.42) * 20, 2)) * 0.6;
    const peak3 = Math.exp(-Math.pow((freq - 0.68) * 12, 2)) * 0.9;
    const peak4 = Math.exp(-Math.pow((freq - 0.85) * 25, 2)) * 0.5;
    // Time-varying modulation
    const mod = Math.sin(timeOffset * 0.1 + freq * 10) * 0.1 + 0.9;
    val += (peak1 + peak2 + peak3 + peak4) * mod * sensitivity;
    // Occasional burst
    if (Math.random() > 0.97) val += Math.random() * 0.5 * sensitivity;
    data.push(Math.min(1, val));
  }
  return data;
}

function getColor(value: number, scheme: string): [number, number, number] {
  if (scheme === 'green') {
    return [0, Math.floor(value * 255), Math.floor(value * 100)];
  } else if (scheme === 'amber') {
    return [Math.floor(value * 255), Math.floor(value * 180), 0];
  } else {
    // Multi - blue to green to yellow to red
    if (value < 0.33) return [0, Math.floor(value * 3 * 255), Math.floor((1 - value * 3) * 255)];
    else if (value < 0.66) return [Math.floor((value - 0.33) * 3 * 255), 255, 0];
    else return [255, Math.floor((1 - (value - 0.66) * 3) * 255), 0];
  }
}

const BUCKETS = 128;
const HISTORY_LINES = 120;

export default function ActivityWaterfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<number[][]>([]);
  const timeRef = useRef(0);
  const animRef = useRef<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<WaterfallConfig>({
    speed: 2,
    colorScheme: 'green',
    sensitivity: 1.0,
  });
  const [peakFreq, setPeakFreq] = useState(0);
  const [avgPower, setAvgPower] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const lineHeight = h / HISTORY_LINES;

    // Generate new line
    timeRef.current += config.speed * 0.1;
    const newLine = generateSpectrumLine(BUCKETS, timeRef.current, config.sensitivity);
    historyRef.current.unshift(newLine);
    if (historyRef.current.length > HISTORY_LINES) {
      historyRef.current.pop();
    }

    // Calculate stats
    const maxVal = Math.max(...newLine);
    const maxIdx = newLine.indexOf(maxVal);
    setPeakFreq(Math.round((maxIdx / BUCKETS) * 2400 + 100));
    setAvgPower(Math.round((newLine.reduce((a, b) => a + b, 0) / newLine.length) * 100));

    // Clear and draw
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    const bucketWidth = w / BUCKETS;

    for (let row = 0; row < historyRef.current.length; row++) {
      const line = historyRef.current[row];
      const y = row * lineHeight;
      for (let col = 0; col < line.length; col++) {
        const val = line[col];
        if (val < 0.05) continue;
        const [r, g, b] = getColor(val, config.colorScheme);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(col * bucketWidth, y, bucketWidth + 0.5, lineHeight + 0.5);
      }
    }

    // Draw frequency labels
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '8px monospace';
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * w;
      ctx.fillRect(x, 0, 1, h);
      const freq = 100 + (i / 4) * 2400;
      ctx.fillText(`${freq}MHz`, x + 2, h - 4);
    }

    // Draw horizontal time markers
    for (let i = 0; i < HISTORY_LINES; i += 20) {
      const y = i * lineHeight;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, y, w, 1);
    }
  }, [config]);

  useEffect(() => {
    let frameCount = 0;
    const loop = () => {
      frameCount++;
      if (frameCount % 2 === 0) { // 30fps
        draw();
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isExpanded]);

  return (
    <div className={`flex flex-col bg-[#0a0a0f] ${isExpanded ? 'fixed inset-0 z-[100]' : 'h-full'}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">ACTIVITY WATERFALL</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-white/30">Peak: {peakFreq}MHz</span>
          <span className="text-[9px] font-mono text-white/30">PWR: {avgPower}%</span>
          <button onClick={() => setShowSettings(!showSettings)} className="p-0.5 text-white/30 hover:text-white/60">
            <Settings size={10} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 text-white/30 hover:text-white/60">
            {isExpanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
          </button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="px-3 py-2 border-b border-white/10 bg-white/5 grid grid-cols-3 gap-2">
          <div>
            <div className="text-[7px] text-white/30 font-mono mb-1">SPEED</div>
            <input
              type="range" min="1" max="10" value={config.speed}
              onChange={e => setConfig(c => ({ ...c, speed: Number(e.target.value) }))}
              className="w-full h-1 accent-accent-green"
            />
          </div>
          <div>
            <div className="text-[7px] text-white/30 font-mono mb-1">SENSITIVITY</div>
            <input
              type="range" min="0.5" max="3" step="0.1" value={config.sensitivity}
              onChange={e => setConfig(c => ({ ...c, sensitivity: Number(e.target.value) }))}
              className="w-full h-1 accent-accent-green"
            />
          </div>
          <div>
            <div className="text-[7px] text-white/30 font-mono mb-1">COLOR</div>
            <div className="flex gap-1">
              {(['green', 'amber', 'multi'] as const).map(scheme => (
                <button
                  key={scheme}
                  onClick={() => setConfig(c => ({ ...c, colorScheme: scheme }))}
                  className={`px-2 py-0.5 rounded text-[7px] font-mono border ${
                    config.colorScheme === scheme
                      ? 'bg-accent-green/20 text-accent-green border-accent-green/30'
                      : 'bg-white/5 text-white/30 border-white/10'
                  }`}
                >
                  {scheme.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* Overlay labels */}
        <div className="absolute top-1 left-1 text-[8px] font-mono text-white/20">FREQ →</div>
        <div className="absolute bottom-1 right-1 text-[8px] font-mono text-white/20">TIME ↓</div>
      </div>

      {/* Footer spectrum */}
      <div className="px-3 py-1 border-t border-white/10 flex items-center justify-between">
        <span className="text-[8px] font-mono text-white/20">100MHz</span>
        <div className="flex-1 mx-2 h-1 bg-gradient-to-r from-black via-accent-green to-white rounded-full opacity-30" />
        <span className="text-[8px] font-mono text-white/20">2500MHz</span>
      </div>
    </div>
  );
}
