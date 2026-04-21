"use client";

import { useState, useEffect } from "react";

interface GlobalSituationBarProps {
  className?: string;
}

export default function GlobalSituationBar({ className = "" }: GlobalSituationBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });

  return (
    <div
      className={`flex items-center justify-between px-4 py-1.5 bg-[#0a0a0f] border-b border-white/10 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/60 tracking-wider">
          GLOBAL SITUATION
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {formattedDate}
        </span>
        <span className="text-[10px] font-mono text-[#00ff88]">
          {formattedTime} UTC
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-mono text-white/30">
          MONITOR <span className="text-white/50">v2.8.0</span>
        </span>
      </div>
    </div>
  );
}
