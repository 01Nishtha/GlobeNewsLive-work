'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import {
  X, Navigation, Gauge, TrendingUp, Globe, Clock,
  Orbit, Activity, Plane, Route,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Aircraft {
  id: string;
  callsign: string;
  country: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  verticalRate: number;
  squawk: string | null;
  type: 'military' | 'surveillance' | 'tanker' | 'transport' | 'fighter' | 'drone' | 'civilian';
  category: string;
  isMilitary: boolean;
}

interface Satellite {
  id: string;
  name: string;
  type: 'leo' | 'meo' | 'geo' | 'iss' | 'spy';
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  inclination: number;
  period: number;
  country: string;
  purpose: string;
}

interface FlightRoute {
  id: string;
  callsign: string;
  origin: string;
  originLat: number;
  originLon: number;
  destination: string;
  destLat: number;
  destLon: number;
  type: 'military' | 'commercial' | 'cargo' | 'surveillance';
  altitude: number;
  speed: number;
  active: boolean;
  progress: number;
}

interface Globe3DProps {
  autoRotate?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const GLOBE_IMAGE = 'https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/globe.jpeg';
const ROTATION_PERIOD_S = 30;
const GOLDEN_ORANGE = '#ffaa33';

const FLIGHT_COLORS: Record<string, string> = {
  fighter: GOLDEN_ORANGE, bomber: GOLDEN_ORANGE, recon: GOLDEN_ORANGE,
  tanker: GOLDEN_ORANGE, transport: GOLDEN_ORANGE, drone: GOLDEN_ORANGE,
  surveillance: GOLDEN_ORANGE, military: GOLDEN_ORANGE, civilian: '#cc8855',
};

const ROUTE_COLORS: Record<string, string> = {
  military: GOLDEN_ORANGE, commercial: '#ffcc66', cargo: '#dd9944', surveillance: '#ff7733',
};

const SAT_COLORS: Record<string, string> = {
  leo: GOLDEN_ORANGE, meo: '#ffcc66', geo: '#ff7733', iss: '#ffdd88', spy: '#ff6622',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Projection: lat/lon → 2D globe coordinates (orthographic)
// ═══════════════════════════════════════════════════════════════════════════════

function project(
  lat: number, lon: number, rotationDeg: number, cx: number, cy: number, r: number
) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = ((lon - rotationDeg) * Math.PI) / 180;
  const cosLon = Math.cos(lonRad);
  const sinLon = Math.sin(lonRad);
  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);

  const x = cx + r * cosLat * sinLon;
  const y = cy - r * sinLat;
  const visible = cosLon > 0.05; // slight threshold to avoid edge clipping
  const scale = Math.max(0.3, cosLon); // foreshortening
  const depth = cosLon; // 1 = front center, 0 = edge

  return { x, y, visible, scale, depth };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Globe CSS (injected via style tag)
// ═══════════════════════════════════════════════════════════════════════════════

const GlobeStyles = React.memo(function GlobeStyles() {
  return (
    <style>{`
      @keyframes earthRotate {
        0% { background-position: 0 0; }
        100% { background-position: 400px 0; }
      }
      @keyframes twinkling { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
      @keyframes twinkling-slow { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
      @keyframes twinkling-long { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
      @keyframes twinkling-fast { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
      @keyframes pulse-ring {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes data-beam {
        0% { stroke-dashoffset: 100; opacity: 0.6; }
        100% { stroke-dashoffset: 0; opacity: 0; }
      }
      @keyframes dot-travel {
        0% { offset-distance: 0%; }
        100% { offset-distance: 100%; }
      }
    `}</style>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Star decoration around the globe
// ═══════════════════════════════════════════════════════════════════════════════

function StarsAroundGlobe({ size }: { size: number }) {
  const stars = useMemo(() => [
    { l: -0.08, t: 0.12, s: 1.0, d: 3 },
    { l: -0.16, t: 0.35, s: 0.8, d: 2 },
    { l: 1.15, t: 0.55, s: 1.2, d: 4 },
    { l: 0.65, t: 1.05, s: 1.0, d: 3 },
    { l: 0.16, t: 0.98, s: 0.6, d: 1.5 },
    { l: 0.85, t: -0.08, s: 1.2, d: 4 },
    { l: 1.05, t: 0.35, s: 0.8, d: 2 },
    { l: 0.45, t: -0.12, s: 1.0, d: 3 },
    { l: -0.04, t: 0.55, s: 0.6, d: 1.5 },
    { l: 1.25, t: 0.75, s: 0.8, d: 2 },
  ], []);

  return (
    <>
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${s.l * 100}%`,
            top: `${s.t * 100}%`,
            animation: `twinkling${s.s === 0.6 ? '-fast' : s.s === 1.2 ? '-long' : s.s === 0.8 ? '-slow' : ''} ${s.d}s infinite`,
            opacity: 0.6,
          }}
        />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Flight Marker on 2D globe
// ═══════════════════════════════════════════════════════════════════════════════

function FlightMarker2D({
  aircraft, rotation, cx, cy, r, onSelect, isSelected,
}: {
  aircraft: Aircraft;
  rotation: number;
  cx: number; cy: number; r: number;
  onSelect: (a: Aircraft) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const p = project(aircraft.lat, aircraft.lon, rotation, cx, cy, r);
  const color = FLIGHT_COLORS[aircraft.type] || FLIGHT_COLORS.civilian;

  if (!p.visible) return null;

  const size = isSelected ? 10 : 5;
  const glow = isSelected ? 10 : 4;

  return (
    <div
      className="absolute flex items-center justify-center cursor-pointer"
      style={{
        left: p.x - size / 2,
        top: p.y - size / 2,
        width: size,
        height: size,
        zIndex: Math.floor(p.depth * 100) + 50,
        transition: 'transform 0.1s',
        transform: hovered ? 'scale(1.5)' : `scale(${p.scale})`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(aircraft); }}
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: isSelected ? '#fff' : color,
          boxShadow: `0 0 ${glow}px ${glow / 2}px ${color}`,
        }}
      />
      {/* Pulse ring */}
      <div
        className="absolute rounded-full border"
        style={{
          width: size * 2.5,
          height: size * 2.5,
          borderColor: color,
          animation: 'pulse-ring 2s infinite',
          opacity: 0.4,
        }}
      />
      {hovered && !isSelected && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-black/90 border border-white/10 rounded px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none z-[200]">
          <span className="font-mono text-[9px]" style={{ color }}>{aircraft.callsign}</span>
          <span className="text-[8px] text-gray-400 ml-1.5">{aircraft.altitude.toLocaleString()}ft</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Satellite Marker on 2D globe
// ═══════════════════════════════════════════════════════════════════════════════

function SatelliteMarker2D({
  satellite, rotation, cx, cy, r, onSelect, isSelected,
}: {
  satellite: Satellite;
  rotation: number;
  cx: number; cy: number; r: number;
  onSelect: (s: Satellite) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const altitudeScale = 1 + Math.min(satellite.altitude / 40000, 0.15);
  const p = project(satellite.lat, satellite.lon, rotation, cx, cy, r * altitudeScale);
  const color = SAT_COLORS[satellite.type] || SAT_COLORS.leo;

  if (!p.visible) return null;

  const size = isSelected ? 8 : 4;

  return (
    <div
      className="absolute flex items-center justify-center cursor-pointer"
      style={{
        left: p.x - size / 2,
        top: p.y - size / 2,
        width: size,
        height: size,
        zIndex: Math.floor(p.depth * 100) + 60,
        transform: hovered ? 'scale(1.5)' : `scale(${p.scale})`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(satellite); }}
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: isSelected ? '#fff' : color,
          boxShadow: `0 0 6px 2px ${color}`,
        }}
      />
      {hovered && !isSelected && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-black/90 border border-white/10 rounded px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none z-[200]">
          <span className="font-mono text-[9px]" style={{ color }}>{satellite.name}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Route Arc on 2D globe (SVG overlay)
// ═══════════════════════════════════════════════════════════════════════════════

function RouteArc2D({
  route, rotation, cx, cy, r,
}: {
  route: FlightRoute;
  rotation: number;
  cx: number; cy: number; r: number;
}) {
  const p1 = project(route.originLat, route.originLon, rotation, cx, cy, r);
  const p2 = project(route.destLat, route.destLon, rotation, cx, cy, r);
  const color = ROUTE_COLORS[route.type] || ROUTE_COLORS.commercial;

  if (!p1.visible && !p2.visible) return null;

  // Quadratic bezier with control point lifted above the chord
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const lift = Math.min(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.3, r * 0.4);
  // Lift perpendicular to chord, toward center if arc goes over front
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const cx_ = mx + perpX * lift;
  const cy_ = my + perpY * lift;

  const path = `M ${p1.x} ${p1.y} Q ${cx_} ${cy_} ${p2.x} ${p2.y}`;

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.35}
        style={{ pointerEvents: 'none' }}
      />
      {/* Animated dot along the arc */}
      <circle r={2.5} fill={color} opacity={0.9}>
        <animateMotion dur={`${8 + Math.random() * 6}s`} repeatCount="indefinite" path={path} />
      </circle>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Data Transmission Beams (animated lines from surface to "space")
// ═══════════════════════════════════════════════════════════════════════════════

function DataBeam({
  lat, lon, rotation, cx, cy, r, color,
}: {
  lat: number; lon: number; rotation: number;
  cx: number; cy: number; r: number; color: string;
}) {
  const p = project(lat, lon, rotation, cx, cy, r);
  if (!p.visible) return null;

  const angle = Math.atan2(p.y - cy, p.x - cx);
  const len = 12 + Math.random() * 8;
  const x2 = p.x + Math.cos(angle) * len;
  const y2 = p.y + Math.sin(angle) * len;

  return (
    <line
      x1={p.x} y1={p.y}
      x2={x2} y2={y2}
      stroke={color}
      strokeWidth={1}
      strokeDasharray="6 6"
      opacity={0.5}
    >
      <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.5s" repeatCount="indefinite" />
    </line>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Side Panel (reused from original)
// ═══════════════════════════════════════════════════════════════════════════════

function SidePanel({
  aircraft, satellite, route, onClose,
}: {
  aircraft?: Aircraft | null;
  satellite?: Satellite | null;
  route?: FlightRoute | null;
  onClose: () => void;
}) {
  if (!aircraft && !satellite && !route) return null;

  const isFlight = !!aircraft;
  const isRoute = !!route;
  const data = aircraft || satellite;
  const color = isFlight
    ? FLIGHT_COLORS[aircraft!.type] || FLIGHT_COLORS.civilian
    : isRoute
    ? ROUTE_COLORS[route!.type] || ROUTE_COLORS.commercial
    : SAT_COLORS[satellite!.type] || SAT_COLORS.leo;

  return (
    <div className="absolute right-0 top-0 h-full w-[280px] bg-[#0a0a0f]/98 border-l border-white/10 shadow-2xl z-50 overflow-y-auto backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px 2px ${color}` }} />
          <span className="font-mono text-[11px] font-bold tracking-wider text-white">
            {isRoute ? 'FLIGHT ROUTE' : isFlight ? 'FLIGHT TRACK' : 'SATELLITE TRACK'}
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h2 className="font-mono text-[18px] font-bold" style={{ color }}>
            {isRoute ? route!.callsign : isFlight ? aircraft!.callsign : satellite!.name}
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {isRoute ? `${route!.origin} → ${route!.destination}` : isFlight ? aircraft!.category : satellite!.purpose}
          </p>
        </div>

        {isRoute && route && (
          <>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <Plane size={12} style={{ color }} />
              <span>{route.origin}</span>
              <span className="text-gray-600">→</span>
              <span>{route.destination}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard icon={<Gauge size={14} />} label="ALTITUDE" value={`${route.altitude.toLocaleString()} ft`} color={color} />
              <MetricCard icon={<TrendingUp size={14} />} label="SPEED" value={`${route.speed} kts`} color={color} />
              <MetricCard icon={<Navigation size={14} />} label="TYPE" value={route.type.toUpperCase()} color={color} />
              <MetricCard icon={<Activity size={14} />} label="STATUS" value={route.active ? 'ACTIVE' : 'INACTIVE'} color={color} />
            </div>
            <div className="text-[9px] text-gray-500 font-mono space-y-1">
              <div>Origin: {route.originLat.toFixed(2)}°, {route.originLon.toFixed(2)}°</div>
              <div>Dest: {route.destLat.toFixed(2)}°, {route.destLon.toFixed(2)}°</div>
            </div>
          </>
        )}

        {isFlight && (
          <div className="grid grid-cols-2 gap-2">
            <MetricCard icon={<Navigation size={14} />} label="HEADING" value={`${aircraft!.heading}°`} color={color} />
            <MetricCard icon={<Gauge size={14} />} label="SPEED" value={`${aircraft!.speed} kts`} color={color} />
            <MetricCard icon={<TrendingUp size={14} />} label="ALTITUDE" value={`${aircraft!.altitude.toLocaleString()} ft`} color={color} />
            <MetricCard icon={<Activity size={14} />} label="VERTICAL RATE" value={`${aircraft!.verticalRate} fpm`} color={color} />
          </div>
        )}

        {satellite && (
          <div className="grid grid-cols-2 gap-2">
            <MetricCard icon={<Orbit size={14} />} label="ALTITUDE" value={`${satellite!.altitude.toLocaleString()} km`} color={color} />
            <MetricCard icon={<Gauge size={14} />} label="VELOCITY" value={`${satellite!.velocity} km/s`} color={color} />
            <MetricCard icon={<Navigation size={14} />} label="INCLINATION" value={`${satellite!.inclination}°`} color={color} />
            <MetricCard icon={<Clock size={14} />} label="PERIOD" value={`${satellite!.period} min`} color={color} />
          </div>
        )}

        {data && (
          <>
            <div className="space-y-2 pt-2 border-t border-white/10">
              <InfoRow label={isFlight ? "Country" : "Operator"} value={data.country} />
              {isFlight && aircraft!.squawk && (
                <InfoRow label="Squawk" value={aircraft!.squawk} alert={['7700', '7600', '7500'].includes(aircraft!.squawk)} />
              )}
              {!isFlight && !isRoute && satellite && (
                <InfoRow label="NORAD ID" value={satellite!.id} />
              )}
            </div>
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
                <Globe size={12} />
                <span>{data.lat.toFixed(4)}°, {data.lon.toFixed(4)}°</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded p-2.5 border border-white/10">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[8px] font-mono tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-[11px] font-bold text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[9px] text-gray-500">{label}</span>
      <span className={`font-mono text-[10px] ${alert ? 'text-red-400 font-bold' : 'text-white'}`}>
        {value}{alert && ' ⚠️'}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Globe3D({ autoRotate = true }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [showFlights, setShowFlights] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showBeams, setShowBeams] = useState(true);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FlightRoute | null>(null);

  // Globe size measurement
  const [globeSize, setGlobeSize] = useState(300);
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        setGlobeSize(Math.max(size, 200));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Rotation tracking (synced with CSS animation)
  const mountTimeRef = useRef(Date.now());
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isRotating) return;
    let raf: number;
    const tick = () => {
      const elapsed = (Date.now() - mountTimeRef.current) / 1000;
      setRotation((elapsed * (360 / ROTATION_PERIOD_S)) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRotating]);

  // Data fetching
  const { data: flightData } = useSWR<{
    flights: Aircraft[];
    aircraft: Aircraft[];
    timestamp: number;
    total: number;
    military: number;
    simulated?: boolean;
  }>(showFlights ? `/api/flights?region=global` : null, fetcher, { refreshInterval: 15000 });

  const { data: satelliteData } = useSWR<{
    satellites: Satellite[];
    timestamp: number;
    counts: Record<string, number>;
  }>(showSatellites ? '/api/satellites' : null, fetcher, { refreshInterval: 30000 });

  const { data: routeData } = useSWR<{
    routes: FlightRoute[];
    timestamp: number;
    total: number;
    byType: Record<string, number>;
  }>(showRoutes ? '/api/flight-routes?count=60' : null, fetcher, { refreshInterval: 30000 });

  const flights = useMemo(() => {
    const raw = flightData?.flights || flightData?.aircraft || [];
    return raw.slice(0, 150);
  }, [flightData]);

  const satellites = useMemo(() => {
    return satelliteData?.satellites || [];
  }, [satelliteData]);

  const routes = useMemo(() => {
    return routeData?.routes || [];
  }, [routeData]);

  const handleSelectAircraft = useCallback((a: Aircraft) => {
    setSelectedAircraft(a);
    setSelectedSatellite(null);
    setSelectedRoute(null);
  }, []);

  const handleSelectSatellite = useCallback((s: Satellite) => {
    setSelectedSatellite(s);
    setSelectedAircraft(null);
    setSelectedRoute(null);
  }, []);

  const handleSelectRoute = useCallback((r: FlightRoute) => {
    setSelectedRoute(r);
    setSelectedAircraft(null);
    setSelectedSatellite(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedAircraft(null);
    setSelectedSatellite(null);
    setSelectedRoute(null);
  }, []);

  // Projection constants
  const r = globeSize / 2;
  const cx = r;
  const cy = r;

  // Pick a few random points for data beams
  const beamPoints = useMemo(() => {
    const pts: { lat: number; lon: number; color: string }[] = [];
    flights.slice(0, 8).forEach(f => pts.push({ lat: f.lat, lon: f.lon, color: FLIGHT_COLORS[f.type] || FLIGHT_COLORS.civilian }));
    satellites.slice(0, 4).forEach(s => pts.push({ lat: s.lat, lon: s.lon, color: SAT_COLORS[s.type] || SAT_COLORS.leo }));
    return pts;
  }, [flights, satellites]);

  return (
    <div className="glass-panel h-full flex flex-col relative overflow-hidden bg-black">
      <GlobeStyles />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌍</span>
          <span className="font-mono text-[11px] font-bold tracking-wider text-cyan-400">
            ORBITAL TRACKER
          </span>
          {showFlights && flightData && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
              {flightData.military || 0}
            </span>
          )}
          {showSatellites && satelliteData && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">
              {satellites.length}
            </span>
          )}
          {showRoutes && routeData && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
              {routeData.total || 0}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowBeams(!showBeams)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showBeams ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'}`}>
            <Activity size={10} /> BEAMS
          </button>
          <button onClick={() => setShowRoutes(!showRoutes)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showRoutes ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
            <Route size={10} /> ROUTES
          </button>
          <button onClick={() => setShowFlights(!showFlights)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showFlights ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`}>
            <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #22d3ee' }} /> FLIGHTS
          </button>
          <button onClick={() => setShowSatellites(!showSatellites)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showSatellites ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-500'}`}>
            <div className="w-2 h-2 rounded-full bg-orange-400" style={{ boxShadow: '0 0 4px #fb923c' }} /> SATS
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setIsRotating(!isRotating)} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${isRotating ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`} title={isRotating ? 'Pause rotation' : 'Start rotation'}>
            {isRotating ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* Globe Container */}
      <div ref={containerRef} className="flex-1 relative flex items-center justify-center overflow-hidden" onClick={handleClosePanel}>
        {/* Stars around globe */}
        <StarsAroundGlobe size={globeSize} />

        {/* Globe */}
        <div
          className="relative rounded-full overflow-hidden shrink-0"
          style={{
            width: globeSize,
            height: globeSize,
            backgroundImage: `url('${GLOBE_IMAGE}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'left',
            animation: isRotating ? `earthRotate ${ROTATION_PERIOD_S}s linear infinite` : 'none',
            boxShadow: `
              0 0 ${globeSize * 0.08}px rgba(255,255,255,0.15),
              -${globeSize * 0.02}px 0 ${globeSize * 0.03}px #c3f4ff inset,
              ${globeSize * 0.06}px ${globeSize * 0.008}px ${globeSize * 0.1}px #000 inset,
              -${globeSize * 0.1}px -${globeSize * 0.008}px ${globeSize * 0.14}px #c3f4ff99 inset,
              ${globeSize * 0.5}px 0 ${globeSize * 0.18}px #00000066 inset,
              ${globeSize * 0.3}px 0 ${globeSize * 0.15}px #000000aa inset
            `,
          }}
        >
          {/* SVG overlay for routes & beams */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${globeSize} ${globeSize}`}
            style={{ pointerEvents: 'none', overflow: 'visible' }}
          >
            {showRoutes && routes.map(route => (
              <RouteArc2D
                key={`arc-${route.id}`}
                route={route}
                rotation={rotation}
                cx={cx}
                cy={cy}
                r={r}
              />
            ))}
            {showBeams && beamPoints.map((pt, i) => (
              <DataBeam
                key={`beam-${i}`}
                lat={pt.lat}
                lon={pt.lon}
                rotation={rotation}
                cx={cx}
                cy={cy}
                r={r}
                color={pt.color}
              />
            ))}
          </svg>

          {/* Flight markers */}
          {showFlights && flights.map(a => (
            <FlightMarker2D
              key={a.id}
              aircraft={a}
              rotation={rotation}
              cx={cx}
              cy={cy}
              r={r}
              onSelect={handleSelectAircraft}
              isSelected={selectedAircraft?.id === a.id}
            />
          ))}

          {/* Satellite markers */}
          {showSatellites && satellites.map(s => (
            <SatelliteMarker2D
              key={s.id}
              satellite={s}
              rotation={rotation}
              cx={cx}
              cy={cy}
              r={r}
              onSelect={handleSelectSatellite}
              isSelected={selectedSatellite?.id === s.id}
            />
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {(selectedAircraft || selectedSatellite || selectedRoute) && (
        <SidePanel
          aircraft={selectedAircraft}
          satellite={selectedSatellite}
          route={selectedRoute}
          onClose={handleClosePanel}
        />
      )}

      {/* Legend */}
      <div className="px-3 py-2 border-t border-white/10 bg-white/5 z-10">
        <div className="flex items-center justify-center gap-4 text-[9px] flex-wrap">
          <LegendDot color={GOLDEN_ORANGE} label="Flights" />
          <LegendDot color="#ffcc66" label="Routes" />
          <LegendDot color="#ff7733" label="Satellites" />
          <LegendDot color="#a855f7" label="Data Beams" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px 2px ${color}88` }} />
      <span className="text-gray-500">{label}</span>
    </div>
  );
}
