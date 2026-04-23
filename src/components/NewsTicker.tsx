'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { ExternalLink, Radio } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface NewsItem {
  id: string;
  title: string;
  source: string;
  link?: string;
  timestamp?: string;
  category?: string;
  urgency?: 'breaking' | 'urgent' | 'normal';
}

interface NewsTickerProps {
  speed?: number; // seconds for one full cycle
  pauseOnHover?: boolean;
  maxItems?: number;
}

export default function NewsTicker({ speed = 50, pauseOnHover = true, maxItems = 30 }: NewsTickerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [duplicatedItems, setDuplicatedItems] = useState<NewsItem[]>([]);

  const { data: newsData } = useSWR<{
    items: NewsItem[];
    timestamp: number;
  }>(
    '/api/news-ticker',
    fetcher,
    { refreshInterval: 30000 }
  );

  const items = useMemo(() => {
    const raw = newsData?.items || [];
    return raw.slice(0, maxItems);
  }, [newsData, maxItems]);

  useEffect(() => {
    // Double the items for seamless infinite scroll
    if (items.length > 0) {
      setDuplicatedItems([...items, ...items]);
    }
  }, [items]);

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'breaking': return 'bg-red-500 text-red-400';
      case 'urgent': return 'bg-orange-500 text-orange-400';
      default: return 'bg-cyan-500 text-cyan-400';
    }
  };

  if (items.length === 0) {
    return (
      <div className="w-full bg-[#0a0a0f]/95 border-t border-border-subtle overflow-hidden">
        <div className="py-2 px-4 text-[10px] text-text-dim font-mono flex items-center gap-2">
          <Radio size={12} className="text-text-dim" />
          No news items available
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-[#0a0a0f]/95 border-t border-border-subtle overflow-hidden"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div className="flex items-center">
        {/* LIVE Label */}
        <div className="flex-shrink-0 px-3 py-2 bg-red-500/10 border-r border-border-subtle">
          <span className="text-[10px] font-mono font-bold text-red-400 tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        </div>
        
        {/* Ticker Track */}
        <div className="flex-1 overflow-hidden relative">
          <div
            className="flex items-center gap-6 whitespace-nowrap"
            style={{
              animation: `ticker-scroll ${speed}s linear infinite`,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {duplicatedItems.map((item, index) => (
              <a
                key={`${item.id}-${index}`}
                href={item.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 group cursor-pointer hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  if (!item.link) e.preventDefault();
                }}
              >
                {/* Source badge */}
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-mono text-accent-green border border-border-subtle">
                  {item.source}
                </span>
                
                {/* Title */}
                <span className="text-[11px] text-text-dim group-hover:text-white transition-colors">
                  {item.title}
                </span>
                
                {/* Timestamp if available */}
                {item.timestamp && (
                  <span className="text-[9px] text-text-dim opacity-50">
                    {item.timestamp}
                  </span>
                )}
                
                {/* Separator */}
                <span className="text-text-dim opacity-30 mx-1">●</span>
              </a>
            ))}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
