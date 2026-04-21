'use client';

import { useState, useEffect } from 'react';
import { Binary, Copy, RefreshCw, ChevronDown, FileJson, FileText } from 'lucide-react';

interface DataPacket {
  id: string;
  timestamp: string;
  source: string;
  payload: string;
  size: number;
  protocol: 'JSON' | 'XML' | 'RSS' | 'RAW';
}

const MOCK_PACKETS: DataPacket[] = [
  {
    id: 'pkt-001',
    timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
    source: 'api/signals',
    payload: JSON.stringify({ signals: [{ id: 's1', title: 'Military convoy spotted near border', severity: 'HIGH', category: 'military', timestamp: Date.now() }] }),
    size: 342,
    protocol: 'JSON',
  },
  {
    id: 'pkt-002',
    timestamp: new Date(Date.now() - 60 * 1000).toISOString(),
    source: 'rss/reuters',
    payload: '<item><title>Iran uranium enrichment reaches 60%</title><pubDate>' + new Date().toUTCString() + '</pubDate></item>',
    size: 128,
    protocol: 'XML',
  },
  {
    id: 'pkt-003',
    timestamp: new Date(Date.now() - 90 * 1000).toISOString(),
    source: 'api/markets',
    payload: JSON.stringify({ markets: [{ symbol: 'XAUUSD', price: 2341.50, change: 12.30, changePercent: 0.53 }] }),
    size: 215,
    protocol: 'JSON',
  },
  {
    id: 'pkt-004',
    timestamp: new Date(Date.now() - 120 * 1000).toISOString(),
    source: 'api/earthquakes',
    payload: JSON.stringify({ earthquakes: [{ magnitude: 5.2, location: 'Near Tehran, Iran', depth: 12, time: Date.now() - 300000 }] }),
    size: 198,
    protocol: 'JSON',
  },
];

function stringToHex(str: string): string {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

function stringToAscii(str: string): string {
  return Array.from(str)
    .map(c => {
      const code = c.charCodeAt(0);
      return code >= 32 && code < 127 ? c : '.';
    })
    .join('');
}

function formatHexDump(str: string): { offset: string; hex: string; ascii: string }[] {
  const bytes = Array.from(str).map(c => c.charCodeAt(0));
  const lines: { offset: string; hex: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const ascii = chunk.map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    lines.push({ offset: i.toString(16).padStart(4, '0').toUpperCase(), hex: hex.padEnd(48, ' '), ascii });
  }
  return lines;
}

export default function RawDataInspector() {
  const [selectedPacket, setSelectedPacket] = useState<DataPacket | null>(MOCK_PACKETS[0]);
  const [viewMode, setViewMode] = useState<'hex' | 'json' | 'raw'>('hex');
  const [packets, setPackets] = useState(MOCK_PACKETS);
  const [autoScroll, setAutoScroll] = useState(true);

  // Simulate incoming packets
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newPacket: DataPacket = {
          id: `pkt-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          timestamp: new Date().toISOString(),
          source: ['api/signals', 'rss/reuters', 'api/markets', 'api/weather'][Math.floor(Math.random() * 4)],
          payload: JSON.stringify({ random: Math.random(), timestamp: Date.now() }),
          size: Math.floor(Math.random() * 500) + 50,
          protocol: 'JSON',
        };
        setPackets(prev => [newPacket, ...prev].slice(0, 20));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const hexDump = selectedPacket ? formatHexDump(selectedPacket.payload) : [];

  const copyToClipboard = () => {
    if (!selectedPacket) return;
    navigator.clipboard.writeText(selectedPacket.payload);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Binary size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">RAW INSPECTOR</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${autoScroll ? 'bg-accent-green/15 text-accent-green border-accent-green/30' : 'bg-white/5 text-white/30 border-white/10'}`}
          >
            AUTO
          </button>
          <span className="text-[9px] font-mono text-white/30">{packets.length} packets</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Packet List */}
        <div className="w-36 border-r border-white/10 flex flex-col">
          <div className="px-2 py-1.5 border-b border-white/10">
            <span className="text-[8px] text-white/30 font-mono">PACKET STREAM</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {packets.map(pkt => (
              <button
                key={pkt.id}
                onClick={() => setSelectedPacket(pkt)}
                className={`w-full text-left px-2 py-1.5 border-b border-white/5 transition-all ${
                  selectedPacket?.id === pkt.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className={`text-[7px] font-mono px-1 rounded ${
                    pkt.protocol === 'JSON' ? 'bg-blue-500/20 text-blue-400' :
                    pkt.protocol === 'XML' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {pkt.protocol}
                  </span>
                  <span className="text-[8px] font-mono text-white/50 truncate">{pkt.source}</span>
                </div>
                <div className="text-[8px] font-mono text-white/30">{pkt.size}B</div>
              </button>
            ))}
          </div>
        </div>

        {/* Inspector */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('hex')}
                className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${viewMode === 'hex' ? 'bg-accent-green/15 text-accent-green border-accent-green/30' : 'bg-white/5 text-white/30 border-transparent hover:bg-white/10'}`}
              >
                HEX
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${viewMode === 'json' ? 'bg-accent-green/15 text-accent-green border-accent-green/30' : 'bg-white/5 text-white/30 border-transparent hover:bg-white/10'}`}
              >
                JSON
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${viewMode === 'raw' ? 'bg-accent-green/15 text-accent-green border-accent-green/30' : 'bg-white/5 text-white/30 border-transparent hover:bg-white/10'}`}
              >
                RAW
              </button>
            </div>
            <div className="flex items-center gap-1">
              {selectedPacket && (
                <>
                  <span className="text-[8px] font-mono text-white/30">{selectedPacket.id}</span>
                  <button onClick={copyToClipboard} className="p-0.5 text-white/30 hover:text-white/60 transition-colors">
                    <Copy size={10} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-2 font-mono text-[10px]">
            {!selectedPacket ? (
              <div className="text-white/20 text-center mt-8">Select a packet to inspect</div>
            ) : viewMode === 'hex' ? (
              <div className="space-y-0">
                {/* Header row */}
                <div className="flex text-[8px] text-white/20 mb-1 sticky top-0 bg-[#0a0a0f]">
                  <span className="w-12">OFFSET</span>
                  <span className="flex-1">00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
                  <span className="w-20 text-right">ASCII</span>
                </div>
                {hexDump.map((line, i) => (
                  <div key={i} className="flex hover:bg-white/5">
                    <span className="w-12 text-white/20">{line.offset}</span>
                    <span className="flex-1 text-accent-blue/70">{line.hex}</span>
                    <span className="w-20 text-right text-white/40">{line.ascii}</span>
                  </div>
                ))}
              </div>
            ) : viewMode === 'json' ? (
              <pre className="text-accent-green/80 whitespace-pre-wrap break-all">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedPacket.payload), null, 2);
                  } catch {
                    return selectedPacket.payload;
                  }
                })()}
              </pre>
            ) : (
              <pre className="text-white/60 whitespace-pre-wrap break-all">{selectedPacket.payload}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
