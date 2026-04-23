"use client";

import { Maximize2, Map, Box, Pin } from "lucide-react";

interface MapControlsProps {
  is3D?: boolean;
  onToggle3D?: () => void;
  onFullscreen: () => void;
  onPinToTop?: () => void;
  isPinned?: boolean;
  className?: string;
}

export default function MapControls({
  is3D,
  onToggle3D,
  onFullscreen,
  onPinToTop,
  isPinned = false,
  className = "",
}: MapControlsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {onToggle3D && (
        <button
          onClick={() => onToggle3D()}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono transition-all ${
            is3D
              ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
              : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"
          }`}
          title={is3D ? "Switch to 2D" : "Switch to 3D"}
        >
          {is3D ? <Box size={12} /> : <Map size={12} />}
          <span>{is3D ? "3D" : "2D"}</span>
        </button>
      )}

      <button
        onClick={onFullscreen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono bg-white/5 text-white/60 border border-transparent hover:bg-white/10 transition-all"
        title="Fullscreen"
      >
        <Maximize2 size={12} />
        <span className="hidden sm:inline">Fullscreen</span>
      </button>

      {onPinToTop && (
        <button
          onClick={onPinToTop}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono transition-all ${
            isPinned
              ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
              : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"
          }`}
          title={isPinned ? "Unpin map" : "Pin map to top"}
        >
          <Pin size={12} className={isPinned ? "rotate-45" : ""} />
          <span className="hidden sm:inline">{isPinned ? "Pinned" : "Pin"}</span>
        </button>
      )}
    </div>
  );
}
