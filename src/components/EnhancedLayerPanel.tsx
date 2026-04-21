"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search, Layers, ChevronDown } from "lucide-react";

interface LayerCategory {
  id: string;
  name: string;
  icon: string;
  layers: LayerItem[];
}

interface LayerItem {
  id: string;
  name: string;
  emoji: string;
  description?: string;
}

const LAYER_CATEGORIES: LayerCategory[] = [
  {
    id: "security",
    name: "Security & Conflict",
    icon: "🛡️",
    layers: [
      { id: "conflicts", name: "Conflict Zones", emoji: "⚔️", description: "Active conflict areas" },
      { id: "military", name: "Military Bases", emoji: "🏛️", description: "US & allied bases" },
      { id: "flights", name: "Military Activity", emoji: "✈️", description: "Live aircraft tracking" },
      { id: "iran", name: "Iran Targets", emoji: "🎯", description: "Iran-related targets" },
      { id: "nuclear", name: "Nuclear Sites", emoji: "☢️", description: "Nuclear facilities" },
      { id: "cyber", name: "Cyber Threats", emoji: "💻", description: "Cyberattack indicators" },
      { id: "gps-jamming", name: "GPS Jamming", emoji: "📡", description: "GPS interference zones" },
    ],
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    icon: "🏗️",
    layers: [
      { id: "cables", name: "Undersea Cables", emoji: "🔌", description: "Submarine cable routes" },
      { id: "pipelines", name: "Pipelines", emoji: "🛢️", description: "Oil & gas pipelines" },
      { id: "chokepoints", name: "Chokepoints", emoji: "⚓", description: "Strategic waterways" },
      { id: "spaceports", name: "Spaceports", emoji: "🚀", description: "Launch facilities" },
      { id: "ai-centers", name: "AI Data Centers", emoji: "🖥️", description: "Major AI compute sites" },
      { id: "outages", name: "Internet Disruptions", emoji: "🌐", description: "Network outages" },
    ],
  },
  {
    id: "environmental",
    name: "Environmental",
    icon: "🌍",
    layers: [
      { id: "earthquakes", name: "Earthquakes", emoji: "🌍", description: "Seismic activity" },
      { id: "fires", name: "Fires", emoji: "🔥", description: "NASA FIRMS fire data" },
      { id: "weather", name: "Weather Alerts", emoji: "🌪️", description: "Severe weather" },
      { id: "displacement", name: "Displacement", emoji: "🏃", description: "Refugee/IDP flows" },
    ],
  },
  {
    id: "economic",
    name: "Economic",
    icon: "💰",
    layers: [
      { id: "routes", name: "Trade Routes", emoji: "🚢", description: "Shipping lanes & hubs" },
      { id: "clusters", name: "Economic Centers", emoji: "📍", description: "Trade clusters" },
    ],
  },
];

interface EnhancedLayerPanelProps {
  activeLayers: string[];
  onLayerToggle: (layer: string) => void;
  className?: string;
}

export default function EnhancedLayerPanel({
  activeLayers,
  onLayerToggle,
  className = "",
}: EnhancedLayerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["security", "infrastructure", "environmental", "economic"])
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const filteredCategories = LAYER_CATEGORIES.map((cat) => ({
    ...cat,
    layers: cat.layers.filter(
      (l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.emoji.includes(searchQuery) ||
        l.id.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.layers.length > 0);

  const activeCount = activeLayers.length;

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all text-[10px] font-mono ${
          isOpen
            ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
            : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
        }`}
      >
        <Layers size={12} />
        <span>Layers</span>
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-[#00ff88]/20 text-[#00ff88] rounded text-[9px]">
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-[#0f0f1a] border border-white/10 rounded-lg shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-[#0f0f1a] border-b border-white/10 px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-white/60 tracking-wider">
                MAP LAYERS
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X size={12} className="text-white/40" />
              </button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                placeholder="Search layers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#00ff88]/40"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="p-2 space-y-1">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="border border-white/5 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-[11px] font-mono text-white/80">
                      {cat.name}
                    </span>
                  </div>
                  <ChevronDown
                    size={12}
                    className={`text-white/30 transition-transform ${
                      expandedCategories.has(cat.id) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Layers */}
                {expandedCategories.has(cat.id) && (
                  <div className="px-2 pb-2 space-y-0.5">
                    {cat.layers.map((layer) => {
                      const isActive = activeLayers.includes(layer.id);
                      return (
                        <button
                          key={layer.id}
                          onClick={() => onLayerToggle(layer.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-all ${
                            isActive
                              ? "bg-[#00ff88]/10 border border-[#00ff88]/30"
                              : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span className="text-sm">{layer.emoji}</span>
                          <div className="text-left flex-1 min-w-0">
                            <div
                              className={`text-[10px] font-mono truncate ${
                                isActive ? "text-[#00ff88]" : "text-white/60"
                              }`}
                            >
                              {layer.name}
                            </div>
                            {layer.description && (
                              <div className="text-[9px] text-white/30 truncate">
                                {layer.description}
                              </div>
                            )}
                          </div>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isActive
                                ? "bg-[#00ff88]/30 border-[#00ff88]"
                                : "border-white/20"
                            }`}
                          >
                            {isActive && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 10 10"
                                fill="none"
                              >
                                <path
                                  d="M2 5L4 7L8 3"
                                  stroke="#00ff88"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { LAYER_CATEGORIES };
