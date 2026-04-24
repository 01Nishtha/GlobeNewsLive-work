"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Signal } from "@/types";
import { Radio, Clock, ExternalLink, AlertTriangle } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface NewsItem {
  id: string;
  title: string;
  source: string;
  link?: string;
  timestamp?: string;
  category?: string;
  urgency?: "breaking" | "urgent" | "normal";
  description?: string;
}

interface LiveNewsTickerProps {
  signals?: Signal[];
  className?: string;
  speed?: number;
  pauseOnHover?: boolean;
}

export default function LiveNewsTicker({
  signals = [],
  className = "",
  speed = 50,
  pauseOnHover = true,
}: LiveNewsTickerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<NewsItem | null>(null);
  const [duplicatedItems, setDuplicatedItems] = useState<NewsItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch from API as fallback / supplement
  const { data: apiData } = useSWR<{
    items: NewsItem[];
    timestamp: number;
  }>("/api/news-ticker", fetcher, { refreshInterval: 30000 });

  // Build items from signals if provided, otherwise use API
  const items = useMemo(() => {
    if (signals.length > 0) {
      const signalNews: NewsItem[] = signals
        .filter((s) => s.severity === "CRITICAL" || s.severity === "HIGH")
        .slice(0, 20)
        .map((s) => {
          const emoji =
            s.category === "military" || s.category === "conflict"
              ? "⚔️"
              : s.category === "cyber" || s.category === "infrastructure"
              ? "🛡️"
              : s.category === "economy"
              ? "💰"
              : s.category === "diplomacy" || s.category === "politics"
              ? "🤝"
              : s.category === "disaster"
              ? "🌪️"
              : s.category === "terrorism"
              ? "💣"
              : s.category === "protest"
              ? "📢"
              : "📡";
          return {
            id: s.id,
            title: `${emoji} ${s.title}`,
            source: s.source || "INTEL",
            urgency: s.severity === "CRITICAL" ? "breaking" : "urgent",
            description: s.summary || `High severity ${s.category} event detected. Monitor situation closely.`,
            category: s.category,
          };
        });
      return signalNews;
    }
    return apiData?.items || [];
  }, [signals, apiData]);

  useEffect(() => {
    if (items.length > 0) {
      setDuplicatedItems([...items, ...items]);
    }
  }, [items]);

  const handleMouseEnter = (item: NewsItem) => {
    if (pauseOnHover) {
      setIsPaused(true);
      setHoveredItem(item);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
      setHoveredItem(null);
    }
  };

  if (items.length === 0) {
    return (
      <div
        className={`w-full bg-[#0a0a0f]/95 border-t border-border-subtle overflow-hidden ${className}`}
      >
        <div className="py-2 px-4 text-[10px] text-text-dim font-mono flex items-center gap-2">
          <Radio size={12} className="text-text-dim" />
          No news items available
        </div>
      </div>
    );
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case "breaking": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "urgent": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      default: return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    }
  };

  const getUrgencyLabel = (urgency?: string) => {
    switch (urgency) {
      case "breaking": return "BREAKING";
      case "urgent": return "URGENT";
      default: return "UPDATE";
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Compact Description Tooltip */}
      {isPaused && hoveredItem && (
        <div className="absolute left-4 right-4 bottom-full z-50 mb-1 pointer-events-none">
          <div className="inline-flex items-start gap-2 bg-[#0f1218]/95 border border-border-subtle rounded px-2.5 py-1.5 shadow-lg max-w-full">
            <span className={`flex-shrink-0 mt-0.5 text-[8px] px-1 py-0.5 rounded font-mono font-bold border ${getUrgencyColor(hoveredItem.urgency)}`}>
              {getUrgencyLabel(hoveredItem.urgency)}
            </span>
            <p className="text-[10px] text-text-dim leading-snug truncate">
              {hoveredItem.description || hoveredItem.title}
            </p>
          </div>
        </div>
      )}

      {/* Ticker */}
      <div
        className={`w-full bg-[#0a0a0f]/95 border-t border-border-subtle overflow-hidden ${className}`}
        onMouseLeave={handleMouseLeave}
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
                animationPlayState: isPaused ? "paused" : "running",
              }}
            >
              {duplicatedItems.map((item, index) => (
                <a
                  key={`${item.id}-${index}`}
                  href={item.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2 group cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    if (!item.link) e.preventDefault();
                  }}
                  onMouseEnter={() => handleMouseEnter(item)}
                >
                  {/* Urgency indicator */}
                  {item.urgency === "breaking" && (
                    <AlertTriangle size={10} className="text-red-400 flex-shrink-0" />
                  )}

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
