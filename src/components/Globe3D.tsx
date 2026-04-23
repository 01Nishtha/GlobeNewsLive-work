'use client';

import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
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

const EARTH_RADIUS = 2;
const ATMOSPHERE_ALTITUDE = 0.18;
const ATMOSPHERE_SCALE = 1 + ATMOSPHERE_ALTITUDE;
const GOLDEN_ORANGE = '#ffaa33';

const TEXTURE_URLS = {
  night: '//unpkg.com/three-globe@2.33.0/example/img/earth-night.jpg',
  topo: '//unpkg.com/three-globe@2.33.0/example/img/earth-topology.png',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Math helpers
// ═══════════════════════════════════════════════════════════════════════════════

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Texture Loader Hook
// ═══════════════════════════════════════════════════════════════════════════════

function useEarthTextures() {
  const [textures, setTextures] = useState<{
    map: THREE.Texture | null;
    bumpMap: THREE.Texture | null;
    loading: boolean;
    error: boolean;
  }>({ map: null, bumpMap: null, loading: true, error: false });

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      TEXTURE_URLS.night,
      (map) => {
        loader.load(
          TEXTURE_URLS.topo,
          (bumpMap) => {
            setTextures({ map, bumpMap, loading: false, error: false });
          },
          undefined,
          () => setTextures({ map, bumpMap: null, loading: false, error: false })
        );
      },
      undefined,
      () => setTextures({ map: null, bumpMap: null, loading: false, error: true })
    );
  }, []);

  return textures;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Atmosphere (Fresnel rim glow matching globe.gl)
// ═══════════════════════════════════════════════════════════════════════════════

function Atmosphere() {
  const vertexShader = `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    uniform vec3 atmosphereColor;
    uniform float c;
    uniform float p;

    void main() {
      float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
      vec3 glow = atmosphereColor * intensity;
      gl_FragColor = vec4(glow, intensity * 0.7);
    }
  `;

  const uniforms = useMemo(() => ({
    atmosphereColor: { value: new THREE.Color('#64f0c8') },
    c: { value: 0.55 },
    p: { value: 5.0 },
  }), []);

  return (
    <mesh scale={[ATMOSPHERE_SCALE, ATMOSPHERE_SCALE, ATMOSPHERE_SCALE]}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Graticules (lat/lon grid lines — matching globe.gl style)
// ═══════════════════════════════════════════════════════════════════════════════

function Graticules({ globeRotation }: { globeRotation: number }) {
  const lines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const r = EARTH_RADIUS + 0.002;

    // Longitude lines every 30°
    for (let lon = -180; lon <= 180; lon += 30) {
      const adjustedLon = lon - (globeRotation * 180 / Math.PI);
      for (let lat = -90; lat <= 90; lat += 2) {
        points.push(latLonToVector3(lat, adjustedLon, r));
      }
      points.push(new THREE.Vector3(NaN, NaN, NaN)); // break line
    }

    // Latitude lines every 15°
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lon = -180; lon <= 180; lon += 2) {
        const adjustedLon = lon - (globeRotation * 180 / Math.PI);
        points.push(latLonToVector3(lat, adjustedLon, r));
      }
      points.push(new THREE.Vector3(NaN, NaN, NaN)); // break line
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x1a3a2a,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    return new THREE.LineSegments(geo, mat);
  }, [globeRotation]);

  return <primitive object={lines} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Starfield (matching crucix: 2000 stars, muted green, slow drift)
// ═══════════════════════════════════════════════════════════════════════════════

function StarField() {
  const meshRef = useRef<THREE.Points>(null);

  const starGeo = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.0005;
    }
  });

  return (
    <points ref={meshRef} geometry={starGeo}>
      <pointsMaterial
        color={0x88bbaa}
        size={0.08}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Earth (real night texture + bump map)
// ═══════════════════════════════════════════════════════════════════════════════

function Earth({
  autoRotate,
  rotationRef,
}: {
  autoRotate: boolean;
  rotationRef: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { map, bumpMap } = useEarthTextures();

  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.05;
      rotationRef.current = meshRef.current.rotation.y;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
      <meshStandardMaterial
        map={map || undefined}
        bumpMap={bumpMap || undefined}
        bumpScale={0.05}
        roughness={0.6}
        metalness={0.3}
        color={map ? undefined : 0x051520}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Colors
// ═══════════════════════════════════════════════════════════════════════════════

const FLIGHT_COLORS: Record<string, string> = {
  fighter: GOLDEN_ORANGE,
  bomber: GOLDEN_ORANGE,
  recon: GOLDEN_ORANGE,
  tanker: GOLDEN_ORANGE,
  transport: GOLDEN_ORANGE,
  drone: GOLDEN_ORANGE,
  surveillance: GOLDEN_ORANGE,
  military: GOLDEN_ORANGE,
  civilian: '#cc8855',
};

const ROUTE_COLORS: Record<string, string> = {
  military: GOLDEN_ORANGE,
  commercial: '#ffcc66',
  cargo: '#dd9944',
  surveillance: '#ff7733',
};

const SAT_COLORS: Record<string, string> = {
  leo: GOLDEN_ORANGE,
  meo: '#ffcc66',
  geo: '#ff7733',
  iss: '#ffdd88',
  spy: '#ff6622',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Flight Route Arc
// ═══════════════════════════════════════════════════════════════════════════════

function createArcCurve(
  startLat: number, startLon: number,
  endLat: number, endLon: number,
  radius: number, arcHeight: number
): THREE.QuadraticBezierCurve3 {
  const start = latLonToVector3(startLat, startLon, radius);
  const end = latLonToVector3(endLat, endLon, radius);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(mid.length() + arcHeight);
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function FlightRouteArc({
  route,
  globeRotation,
  color,
}: {
  route: FlightRoute;
  globeRotation: number;
  color: string;
}) {
  const lineObj = useMemo(() => {
    const adjustedOriginLon = route.originLon - (globeRotation * 180 / Math.PI);
    const adjustedDestLon = route.destLon - (globeRotation * 180 / Math.PI);

    const start = latLonToVector3(route.originLat, adjustedOriginLon, EARTH_RADIUS);
    const end = latLonToVector3(route.destLat, adjustedDestLon, EARTH_RADIUS);
    const distance = start.distanceTo(end);
    const arcHeight = Math.min(distance * 0.35, 0.8);

    const curve = createArcCurve(
      route.originLat, adjustedOriginLon,
      route.destLat, adjustedDestLon,
      EARTH_RADIUS, arcHeight
    );

    const points = curve.getPoints(64);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 });
    return new THREE.Line(geo, mat);
  }, [route, globeRotation, color]);

  return <primitive object={lineObj} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Animated Flight Dot
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedFlightDot({
  route,
  globeRotation,
  color,
  speed = 0.15,
}: {
  route: FlightRoute;
  globeRotation: number;
  color: string;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(route.progress);
  const curveRef = useRef<THREE.QuadraticBezierCurve3 | null>(null);

  useMemo(() => {
    const adjustedOriginLon = route.originLon - (globeRotation * 180 / Math.PI);
    const adjustedDestLon = route.destLon - (globeRotation * 180 / Math.PI);

    const start = latLonToVector3(route.originLat, adjustedOriginLon, EARTH_RADIUS);
    const end = latLonToVector3(route.destLat, adjustedDestLon, EARTH_RADIUS);
    const distance = start.distanceTo(end);
    const arcHeight = Math.min(distance * 0.35, 0.8);

    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(mid.length() + arcHeight);

    curveRef.current = new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [route, globeRotation]);

  useFrame((_, delta) => {
    if (!meshRef.current || !curveRef.current) return;
    progressRef.current += delta * speed;
    if (progressRef.current > 1) progressRef.current = 0;
    const pos = curveRef.current.getPoint(progressRef.current);
    meshRef.current.position.copy(pos);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.018, 8, 8]} />
      <meshBasicMaterial color={color} />
      <pointLight color={color} intensity={0.6} distance={0.25} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Flight Routes Layer
// ═══════════════════════════════════════════════════════════════════════════════

function FlightRoutesLayer({
  routes,
  globeRotation,
  showRoutes,
}: {
  routes: FlightRoute[];
  globeRotation: number;
  showRoutes: boolean;
}) {
  if (!showRoutes || routes.length === 0) return null;

  return (
    <group>
      {routes.map(route => (
        <FlightRouteArc
          key={`arc-${route.id}`}
          route={route}
          globeRotation={globeRotation}
          color={ROUTE_COLORS[route.type] || ROUTE_COLORS.commercial}
        />
      ))}
      {routes.map(route => (
        <AnimatedFlightDot
          key={`dot-${route.id}`}
          route={route}
          globeRotation={globeRotation}
          color={ROUTE_COLORS[route.type] || ROUTE_COLORS.commercial}
          speed={0.08 + Math.random() * 0.06}
        />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Flight Marker (Golden-Orange Dot)
// ═══════════════════════════════════════════════════════════════════════════════

function FlightMarker({
  aircraft,
  globeRotation,
  onSelect,
  isSelected,
}: {
  aircraft: Aircraft;
  globeRotation: number;
  onSelect: (a: Aircraft) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const altitudeOffset = Math.min((aircraft.altitude / 50000) * 0.12, 0.15);
  const radius = EARTH_RADIUS + 0.02 + altitudeOffset;

  const adjustedLon = aircraft.lon - (globeRotation * 180 / Math.PI);
  const position = latLonToVector3(aircraft.lat, adjustedLon, radius);
  const color = FLIGHT_COLORS[aircraft.type] || FLIGHT_COLORS.civilian;

  return (
    <group position={position}>
      <Html
        distanceFactor={10}
        style={{ transform: 'translate(-50%, -50%)', pointerEvents: 'auto', cursor: 'pointer' }}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => { e.stopPropagation(); onSelect(aircraft); }}
          style={{
            width: isSelected ? '10px' : '6px',
            height: isSelected ? '10px' : '6px',
            borderRadius: '50%',
            background: isSelected ? '#ffffff' : color,
            boxShadow: `0 0 ${isSelected ? '10px' : '6px'} ${isSelected ? '4px' : '2px'} ${color}`,
            transition: 'all 0.15s ease',
            transform: hovered ? 'scale(1.5)' : 'scale(1)',
          }}
        />
      </Html>

      {hovered && !isSelected && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/90 border border-border-default rounded px-2 py-1 shadow-lg whitespace-nowrap">
            <span className="font-mono text-[10px]" style={{ color }}>{aircraft.callsign}</span>
            <span className="text-[9px] text-gray-400 ml-2">{aircraft.altitude.toLocaleString()}ft</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Satellite Marker (Golden-Orange Dot)
// ═══════════════════════════════════════════════════════════════════════════════

function SatelliteMarker({
  satellite,
  globeRotation,
  onSelect,
  isSelected,
}: {
  satellite: Satellite;
  globeRotation: number;
  onSelect: (s: Satellite) => void;
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const altitudeOffset = Math.min((satellite.altitude / 40000) * 0.25, 0.3);
  const radius = EARTH_RADIUS + 0.03 + altitudeOffset;

  const adjustedLon = satellite.lon - (globeRotation * 180 / Math.PI);
  const position = latLonToVector3(satellite.lat, adjustedLon, radius);
  const color = SAT_COLORS[satellite.type] || SAT_COLORS.leo;

  return (
    <group position={position}>
      <Html
        distanceFactor={10}
        style={{ transform: 'translate(-50%, -50%)', pointerEvents: 'auto', cursor: 'pointer' }}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => { e.stopPropagation(); onSelect(satellite); }}
          style={{
            width: isSelected ? '8px' : '5px',
            height: isSelected ? '8px' : '5px',
            borderRadius: '50%',
            background: isSelected ? '#ffffff' : color,
            boxShadow: `0 0 ${isSelected ? '10px' : '6px'} ${isSelected ? '4px' : '2px'} ${color}`,
            transition: 'all 0.15s ease',
            transform: hovered ? 'scale(1.5)' : 'scale(1)',
          }}
        />
      </Html>

      {hovered && !isSelected && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/90 border border-border-default rounded px-2 py-1 shadow-lg whitespace-nowrap">
            <span className="font-mono text-[10px]" style={{ color }}>{satellite.name}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Side Panel
// ═══════════════════════════════════════════════════════════════════════════════

function SidePanel({
  aircraft,
  satellite,
  route,
  onClose,
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
    <div className="absolute right-0 top-0 h-full w-[300px] bg-[#0a0a0f]/98 border-l border-border-default shadow-2xl z-50 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-panel/50 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 8px 2px ${color}` }} />
          <span className="font-mono text-[11px] font-bold tracking-wider text-white">
            {isRoute ? 'FLIGHT ROUTE' : isFlight ? 'FLIGHT TRACK' : 'SATELLITE TRACK'}
          </span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-text-dim hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h2 className="font-mono text-[20px] font-bold" style={{ color }}>
            {isRoute ? route!.callsign : isFlight ? aircraft!.callsign : satellite!.name}
          </h2>
          <p className="text-[10px] text-text-muted mt-0.5">
            {isRoute ? `${route!.origin} → ${route!.destination}` : isFlight ? aircraft!.category : satellite!.purpose}
          </p>
        </div>

        {isRoute && route && (
          <>
            <div className="flex items-center gap-2 text-[10px] text-text-dim">
              <Plane size={12} style={{ color }} />
              <span>{route.origin}</span>
              <span className="text-text-muted">→</span>
              <span>{route.destination}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard icon={<Gauge size={14} />} label="ALTITUDE" value={`${route.altitude.toLocaleString()} ft`} color={color} />
              <MetricCard icon={<TrendingUp size={14} />} label="SPEED" value={`${route.speed} kts`} color={color} />
              <MetricCard icon={<Navigation size={14} />} label="TYPE" value={route.type.toUpperCase()} color={color} />
              <MetricCard icon={<Activity size={14} />} label="STATUS" value={route.active ? 'ACTIVE' : 'INACTIVE'} color={color} />
            </div>
            <div className="text-[9px] text-text-dim font-mono space-y-1">
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
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <InfoRow label={isFlight ? "Country" : "Operator"} value={data.country} />
              {isFlight && aircraft!.squawk && (
                <InfoRow label="Squawk" value={aircraft!.squawk} alert={['7700', '7600', '7500'].includes(aircraft!.squawk)} />
              )}
              {!isFlight && !isRoute && satellite && (
                <InfoRow label="NORAD ID" value={satellite!.id} />
              )}
            </div>
            <div className="pt-2 border-t border-border-subtle">
              <div className="flex items-center gap-2 text-[9px] text-text-dim font-mono">
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
    <div className="bg-white/5 rounded p-2.5 border border-border-subtle">
      <div className="flex items-center gap-1.5 text-text-dim mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[8px] font-mono tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-[12px] font-bold text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[9px] text-text-dim">{label}</span>
      <span className={`font-mono text-[10px] ${alert ? 'text-red-400 font-bold' : 'text-white'}`}>
        {value}{alert && ' ⚠️'}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scene
// ═══════════════════════════════════════════════════════════════════════════════

function Scene({
  autoRotate,
  flights,
  satellites,
  routes,
  showFlights,
  showSatellites,
  showRoutes,
  onSelectAircraft,
  onSelectSatellite,
  onSelectRoute,
  selectedAircraft,
  selectedSatellite,
  selectedRoute,
}: {
  autoRotate: boolean;
  flights: Aircraft[];
  satellites: Satellite[];
  routes: FlightRoute[];
  showFlights: boolean;
  showSatellites: boolean;
  showRoutes: boolean;
  onSelectAircraft: (a: Aircraft) => void;
  onSelectSatellite: (s: Satellite) => void;
  onSelectRoute: (r: FlightRoute) => void;
  selectedAircraft: Aircraft | null;
  selectedSatellite: Satellite | null;
  selectedRoute: FlightRoute | null;
}) {
  const rotationRef = useRef(0);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 5, 10]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-10, -5, -10]} intensity={0.2} color="#64f0c8" />

      {/* Starry background */}
      <StarField />

      {/* Earth + Atmosphere + Graticules */}
      <Earth autoRotate={autoRotate} rotationRef={rotationRef} />
      <Atmosphere />
      <Graticules globeRotation={rotationRef.current} />

      {/* Flight Routes */}
      <FlightRoutesLayer
        routes={routes}
        globeRotation={rotationRef.current}
        showRoutes={showRoutes}
      />

      {showFlights && flights.map(a => (
        <FlightMarker
          key={a.id}
          aircraft={a}
          globeRotation={rotationRef.current}
          onSelect={onSelectAircraft}
          isSelected={selectedAircraft?.id === a.id}
        />
      ))}

      {showSatellites && satellites.map(s => (
        <SatelliteMarker
          key={s.id}
          satellite={s}
          globeRotation={rotationRef.current}
          onSelect={onSelectSatellite}
          isSelected={selectedSatellite?.id === s.id}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={2.5}
        maxDistance={6}
        autoRotate={false}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Globe3D({ autoRotate = true }: Globe3DProps) {
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [hasError, setHasError] = useState(false);
  const [showFlights, setShowFlights] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<Satellite | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FlightRoute | null>(null);

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

  const isWebGLAvailable = typeof window !== 'undefined' && (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  if (hasError || !isWebGLAvailable) {
    return (
      <div className="glass-panel h-full flex flex-col items-center justify-center p-8">
        <div className="text-4xl mb-4">🌍</div>
        <div className="text-[12px] text-white font-bold mb-2">3D Globe Unavailable</div>
        <div className="text-[10px] text-gray-400 text-center">
          {!isWebGLAvailable ? 'WebGL is not supported in your browser' : 'An error occurred loading the 3D view'}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel h-full flex flex-col relative overflow-hidden bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-panel/50">
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
          <button onClick={() => setShowRoutes(!showRoutes)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showRoutes ? 'bg-blue-500/20 text-blue-400' : 'bg-elevated text-text-dim'}`}>
            <Route size={10} /> ROUTES
          </button>
          <button onClick={() => setShowFlights(!showFlights)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showFlights ? 'bg-cyan-500/20 text-cyan-400' : 'bg-elevated text-text-dim'}`}>
            <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #22d3ee' }} /> FLIGHTS
          </button>
          <button onClick={() => setShowSatellites(!showSatellites)} className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 transition-colors ${showSatellites ? 'bg-orange-500/20 text-orange-400' : 'bg-elevated text-text-dim'}`}>
            <div className="w-2 h-2 rounded-full bg-orange-400" style={{ boxShadow: '0 0 4px #fb923c' }} /> SATS
          </button>
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <button onClick={() => setIsRotating(!isRotating)} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${isRotating ? 'bg-cyan-500/20 text-cyan-400' : 'bg-elevated text-text-dim'}`} title={isRotating ? 'Pause rotation' : 'Start rotation'}>
            {isRotating ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0 relative">
        <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} onError={() => setHasError(true)} style={{ background: '#000000' }}>
          <Scene
            autoRotate={isRotating}
            flights={flights}
            satellites={satellites}
            routes={routes}
            showFlights={showFlights}
            showSatellites={showSatellites}
            showRoutes={showRoutes}
            onSelectAircraft={handleSelectAircraft}
            onSelectSatellite={handleSelectSatellite}
            onSelectRoute={handleSelectRoute}
            selectedAircraft={selectedAircraft}
            selectedSatellite={selectedSatellite}
            selectedRoute={selectedRoute}
          />
        </Canvas>

        {(selectedAircraft || selectedSatellite || selectedRoute) && (
          <SidePanel aircraft={selectedAircraft} satellite={selectedSatellite} route={selectedRoute} onClose={handleClosePanel} />
        )}
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border-subtle bg-panel/30">
        <div className="flex items-center justify-center gap-4 text-[9px] flex-wrap">
          <LegendDot color={GOLDEN_ORANGE} label="Flights" />
          <LegendDot color="#ffcc66" label="Routes" />
          <LegendDot color="#ff7733" label="Satellites" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px 2px ${color}88` }} />
      <span className="text-text-muted">{label}</span>
    </div>
  );
}
