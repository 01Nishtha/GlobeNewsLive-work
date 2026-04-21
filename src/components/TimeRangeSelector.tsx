"use client";

interface TimeRange {
  id: string;
  label: string;
  hours: number | null;
}

const TIME_RANGES: TimeRange[] = [
  { id: "1h", label: "1h", hours: 1 },
  { id: "6h", label: "6h", hours: 6 },
  { id: "24h", label: "24h", hours: 24 },
  { id: "48h", label: "48h", hours: 48 },
  { id: "7d", label: "7d", hours: 168 },
  { id: "all", label: "All", hours: null },
];

interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
  className?: string;
}

export default function TimeRangeSelector({
  selected,
  onChange,
  className = "",
}: TimeRangeSelectorProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {TIME_RANGES.map((range) => (
        <button
          key={range.id}
          onClick={() => onChange(range.id)}
          className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
            selected === range.id
              ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
              : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white/80"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export { TIME_RANGES };
export type { TimeRange };
