"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";

interface Region {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lon: number;
  zoom: number;
}

const REGIONS: Region[] = [
  { id: "global", name: "Global", emoji: "🌍", lat: 20, lon: 0, zoom: 1 },
  { id: "americas", name: "Americas", emoji: "🌎", lat: 15, lon: -80, zoom: 3 },
  { id: "mena", name: "MENA", emoji: "🏜️", lat: 28, lon: 35, zoom: 4 },
  { id: "europe", name: "Europe", emoji: "🏰", lat: 50, lon: 15, zoom: 4 },
  { id: "asia", name: "Asia", emoji: "🏯", lat: 35, lon: 100, zoom: 3 },
  { id: "latam", name: "Latin America", emoji: "💃", lat: -15, lon: -60, zoom: 3 },
  { id: "africa", name: "Africa", emoji: "🦁", lat: 5, lon: 20, zoom: 3 },
  { id: "oceania", name: "Oceania", emoji: "🦘", lat: -25, lon: 135, zoom: 4 },
];

interface RegionSelectorProps {
  selected: string;
  onChange: (regionId: string, region: Region) => void;
  className?: string;
}

export default function RegionSelector({
  selected,
  onChange,
  className = "",
}: RegionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedRegion = REGIONS.find((r) => r.id === selected) || REGIONS[0];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded transition-all"
      >
        <Globe size={12} className="text-white/50" />
        <span className="text-[10px] font-mono text-white/80">
          {selectedRegion.emoji} {selectedRegion.name}
        </span>
        <ChevronDown
          size={10}
          className={`text-white/40 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-[#0f0f1a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          {REGIONS.map((region) => (
            <button
              key={region.id}
              onClick={() => {
                onChange(region.id, region);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
                selected === region.id
                  ? "bg-[#00ff88]/10 text-[#00ff88]"
                  : "text-white/70"
              }`}
            >
              <span className="text-sm">{region.emoji}</span>
              <span className="text-[11px] font-mono">{region.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { REGIONS };
export type { Region };
