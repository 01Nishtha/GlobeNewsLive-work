"use client";

import { useEffect, useState, useRef } from "react";
import { Signal } from "@/types";

interface LiveNewsTickerProps {
  signals: Signal[];
  className?: string;
}

export default function LiveNewsTicker({ signals, className = "" }: LiveNewsTickerProps) {
  const [news, setNews] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Build news items from signals
      const items = signals
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
        return `${emoji} ${s.title}`;
      });

    // Add some static intel items if not enough signals
    const staticItems = [
      "🌍 Global situation monitoring active",
      "📡 ADS-B & AIS streams connected",
      "🛰️ Satellite imagery feeds online",
      "🔗 OSINT channels aggregating",
    ];

    setNews([...items, ...staticItems]);
  }, [signals]);

  useEffect(() => {
    // Auto-scroll animation
    const el = scrollRef.current;
    if (!el) return;

    let scrollPos = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      scrollPos += scrollSpeed;
      if (scrollPos >= el.scrollWidth / 2) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      requestAnimationFrame(animate);
    };

    const anim = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(anim);
  }, [news]);

  if (news.length === 0) return null;

  // Duplicate news for seamless scrolling
  const allNews = [...news, ...news];

  return (
    <div
      className={`w-full bg-[#0a0a0f] border-t border-white/10 overflow-hidden ${className}`}
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-8 whitespace-nowrap py-1.5 overflow-x-hidden"
      >
        {allNews.map((item, i) => (
          <span key={i} className="text-[10px] font-mono text-white/60 flex-shrink-0">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
