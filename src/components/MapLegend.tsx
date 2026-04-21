"use client";

interface LegendItem {
  id: string;
  label: string;
  color: string;
  shape: "circle" | "square" | "diamond" | "triangle";
  icon?: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  { id: "high-alert", label: "High Alert", color: "#ff2244", shape: "circle", icon: "🚨" },
  { id: "elevated", label: "Elevated", color: "#ff6633", shape: "circle", icon: "⚠️" },
  { id: "monitoring", label: "Monitoring", color: "#ffaa00", shape: "circle", icon: "👁️" },
  { id: "conflict", label: "Conflict Zone", color: "#ff2244", shape: "square", icon: "⚔️" },
  { id: "base", label: "Base", color: "#00ccff", shape: "diamond", icon: "🏛️" },
  { id: "nuclear", label: "Nuclear", color: "#ff44ff", shape: "triangle", icon: "☢️" },
];

interface MapLegendProps {
  className?: string;
  compact?: boolean;
}

function LegendShape({ item }: { item: LegendItem }) {
  const baseClasses = "w-3 h-3 flex-shrink-0";
  
  switch (item.shape) {
    case "circle":
      return (
        <div
          className={`${baseClasses} rounded-full`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "square":
      return (
        <div
          className={`${baseClasses} rounded-sm`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "diamond":
      return (
        <div
          className={`w-2.5 h-2.5 flex-shrink-0 rotate-45`}
          style={{ backgroundColor: item.color }}
        />
      );
    case "triangle":
      return (
        <div
          className="w-0 h-0 flex-shrink-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: `10px solid ${item.color}`,
          }}
        />
      );
    default:
      return null;
  }
}

export default function MapLegend({ className = "", compact = false }: MapLegendProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 flex-wrap ${className}`}>
        {LEGEND_ITEMS.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <LegendShape item={item} />
            <span className="text-[9px] font-mono text-white/50">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-[#0f0f1a]/90 backdrop-blur-sm border border-white/10 rounded-lg p-3 ${className}`}>
      <div className="text-[10px] font-mono text-white/40 mb-2 tracking-wider">LEGEND</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {item.icon ? (
              <span className="text-xs">{item.icon}</span>
            ) : (
              <LegendShape item={item} />
            )}
            <span className="text-[10px] font-mono text-white/60">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { LEGEND_ITEMS };
export type { LegendItem };
