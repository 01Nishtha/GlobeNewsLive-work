"use client";

import { Sword, Shield, Radiation, Ban, Brain, Anchor } from "lucide-react";

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: "military", label: "Military Activity", icon: <Sword size={12} />, color: "#ff6633" },
  { id: "cyber", label: "Cyber Threats", icon: <Shield size={12} />, color: "#00ffff" },
  { id: "nuclear", label: "Nuclear", icon: <Radiation size={12} />, color: "#ff4444" },
  { id: "sanctions", label: "Sanctions", icon: <Ban size={12} />, color: "#ffaa00" },
  { id: "intelligence", label: "Intelligence", icon: <Brain size={12} />, color: "#00ff88" },
  { id: "maritime", label: "Maritime Security", icon: <Anchor size={12} />, color: "#00ccff" },
];

interface CategoryFilterBarProps {
  selected: string[];
  onToggle: (categoryId: string) => void;
  className?: string;
}

export default function CategoryFilterBar({
  selected,
  onToggle,
  className = "",
}: CategoryFilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {CATEGORIES.map((cat) => {
        const isSelected = selected.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all border ${
              isSelected
                ? "text-white border-white/30"
                : "bg-white/5 text-white/50 border-transparent hover:bg-white/10 hover:text-white/80"
            }`}
            style={{
              backgroundColor: isSelected ? `${cat.color}20` : undefined,
              borderColor: isSelected ? `${cat.color}60` : undefined,
              color: isSelected ? cat.color : undefined,
            }}
          >
            <span style={{ color: isSelected ? cat.color : "currentColor" }}>
              {cat.icon}
            </span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { CATEGORIES };
export type { Category };
