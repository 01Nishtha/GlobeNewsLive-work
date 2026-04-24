'use client';

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import useSWR from 'swr';
import {
  Plus, Minus, Globe, Plane, Flame, Crosshair,
  Radio, Anchor, Activity, Satellite, Zap,
  ChevronDown, Map as MapIcon,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Globe3DProps {
  autoRotate?: boolean;
}

interface MarkerData {
  id: string;
  lat: number;
  lon: number;
  type: MarkerType;
  label?: string;
  detail?: string;
}

type MarkerType =
  | 'aircraft' | 'conflict' | 'nuclear' | 'chokepoint'
  | 'fire' | 'earthquake' | 'cyber' | 'satellite'
  | 'ship' | 'outage' | 'weather';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const EARTH_RADIUS = 2;
const ATMOSPHERE_SCALE = 1.18;

const MARKER_COLORS: Record<MarkerType, string> = {
  aircraft: '#00d4ff',
  conflict: '#ff4444',
  nuclear: '#ffaa00',
  chokepoint: '#aa66ff',
  fire: '#ff4400',
  earthquake: '#ff66ff',
  cyber: '#00ffff',
  satellite: '#ffffff',
  ship: '#00ff88',
  outage: '#ff8800',
  weather: '#00ccff',
};

const MARKER_ICONS: Record<MarkerType, string> = {
  aircraft: '✈️', conflict: '⚔️', nuclear: '☢️', chokepoint: '⚓',
  fire: '🔥', earthquake: '🌍', cyber: '💻', satellite: '🛰️',
  ship: '🚢', outage: '📡', weather: '🌪️',
};

const TEXTURE_URLS = {
  night: '//unpkg.com/three-globe@2.33.0/example/img/earth-night.jpg',
  topo: '//unpkg.com/three-globe@2.33.0/example/img/earth-topology.png',
};

const REGIONS = [
  { id: 'world', name: 'WORLD', rotation: 0 },
  { id: 'americas', name: 'AMERICAS', rotation: -1.8 },
  { id: 'europe', name: 'EUROPE', rotation: -0.3 },
  { id: 'middleeast', name: 'MIDDLE EAST', rotation: -0.8 },
  { id: 'asiapacific', name: 'ASIA PACIFIC', rotation: -2.2 },
  { id: 'africa', name: 'AFRICA', rotation: -0.6 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Math helpers
// ═══════════════════════════════════════════════════════════════════════════════

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Texture Loader
// ═══════════════════════════════════════════════════════════════════════════════

function useEarthTextures() {
  const [textures, setTextures] = useState<{
    map: THREE.Texture | null;
    bumpMap: THREE.Texture | null;
    loading: boolean;
  }>({ map: null, bumpMap: null, loading: true });

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      TEXTURE_URLS.night,
      (map) => {
        loader.load(
          TEXTURE_URLS.topo,
          (bumpMap) => setTextures({ map, bumpMap, loading: false }),
          undefined,
          () => setTextures({ map, bumpMap: null, loading: false })
        );
      },
      undefined,
      () => setTextures({ map: null, bumpMap: null, loading: false })
    );
  }, []);

  return textures;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Atmosphere (Fresnel rim glow)
// ═══════════════════════════════════════════════════════════════════════════════

function Atmosphere() {
  const uniforms = useMemo(() => ({
    atmosphereColor: { value: new THREE.Color('#64f0c8') },
    c: { value: 0.52 },
    p: { value: 5.5 },
  }), []);

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
      gl_FragColor = vec4(atmosphereColor * intensity, intensity * 0.8);
    }
  `;

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
// Graticules (lat/lon grid)
// ═══════════════════════════════════════════════════════════════════════════════

function Graticules({ rotationY }: { rotationY: number }) {
  const lines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const r = EARTH_RADIUS + 0.003;

    for (let lon = -180; lon <= 180; lon += 30) {
      const adjLon = lon - (rotationY * 180 / Math.PI);
      for (let lat = -90; lat <= 90; lat += 3) {
        points.push(latLonToVector3(lat, adjLon, r));
      }
      points.push(new THREE.Vector3(NaN, NaN, NaN));
    }

    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lon = -180; lon <= 180; lon += 3) {
        const adjLon = lon - (rotationY * 180 / Math.PI);
        points.push(latLonToVector3(lat, adjLon, r));
      }
      points.push(new THREE.Vector3(NaN, NaN, NaN));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x1a4a4a,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    return new THREE.LineSegments(geo, mat);
  }, [rotationY]);

  return <primitive object={lines} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Starfield
// ═══════════════════════════════════════════════════════════════════════════════

function StarField() {
  const meshRef = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const count = 2500;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 60 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.0003;
    }
  });

  return (
    <points ref={meshRef} geometry={geo}>
      <pointsMaterial color={0x88bbaa} size={0.06} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Earth
// ═══════════════════════════════════════════════════════════════════════════════

function Earth({ autoRotate, rotationRef }: { autoRotate: boolean; rotationRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { map, bumpMap } = useEarthTextures();

  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.04;
      rotationRef.current = meshRef.current.rotation.y;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
      <meshStandardMaterial
        map={map || undefined}
        bumpMap={bumpMap || undefined}
        bumpScale={0.04}
        roughness={0.7}
        metalness={0.2}
        color={map ? 0x0a2a3a : 0x051520}
        emissive={map ? 0x041820 : 0x020810}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Data Marker (small colored dot)
// ═══════════════════════════════════════════════════════════════════════════════

function DataMarker({
  marker,
  globeRotation,
}: {
  marker: MarkerData;
  globeRotation: number;
}) {
  const [hovered, setHovered] = useState(false);
  const color = MARKER_COLORS[marker.type];
  const adjLon = marker.lon - (globeRotation * 180 / Math.PI);
  const pos = latLonToVector3(marker.lat, adjLon, EARTH_RADIUS + 0.015);

  // visibility check — only show if on front hemisphere
  const camDir = new THREE.Vector3(0, 0, 1);
  const dot = pos.clone().normalize().dot(camDir);
  if (dot < 0.15) return null;

  return (
    <group position={pos}>
      <Html
        distanceFactor={10}
        style={{ transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: hovered ? '8px' : '5px',
            height: hovered ? '8px' : '5px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${hovered ? '10px' : '6px'} ${hovered ? '4px' : '2px'} ${color}`,
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
        />
      </Html>
      {hovered && marker.label && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/90 border border-white/10 rounded px-2 py-1 shadow-lg whitespace-nowrap">
            <span className="font-mono text-[10px]" style={{ color }}>
              {MARKER_ICONS[marker.type]} {marker.label}
            </span>
            {marker.detail && (
              <span className="text-[9px] text-gray-400 ml-2">{marker.detail}</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Data Layers
// ═══════════════════════════════════════════════════════════════════════════════

function useMarkers() {
  const { data: flightData } = useSWR<{ flights: any[] }>('/api/flights?region=global&military=false', fetcher, {
    refreshInterval: 10000,
  });
  const { data: conflictData } = useSWR<{ conflicts: any[] }>('/api/conflicts', fetcher, { refreshInterval: 300000 });
  const { data: earthquakeData } = useSWR<{ earthquakes: any[] }>('/api/earthquakes', fetcher, { refreshInterval: 120000 });
  const { data: fireData } = useSWR<{ fires: any[] }>('/api/fires', fetcher, { refreshInterval: 300000 });
  const { data: shipData } = useSWR<{ ships: any[] }>('/api/ships', fetcher, { refreshInterval: 60000 });

  const markers = useMemo<MarkerData[]>(() => {
    const list: MarkerData[] = [];

    // Aircraft (sample subset for performance)
    const flights = flightData?.flights || [];
    flights.slice(0, 80).forEach((f: any, i: number) => {
      if (f.lat && f.lon) {
        list.push({
          id: `flight-${i}`,
          lat: f.lat,
          lon: f.lon,
          type: 'aircraft',
          label: f.callsign || 'Unknown',
          detail: `${f.altitude?.toLocaleString() || '?'}ft`,
        });
      }
    });

    // Conflicts
    const conflicts = conflictData?.conflicts || [];
    conflicts.forEach((c: any, i: number) => {
      if (c.latitude && c.longitude) {
        list.push({
          id: `conflict-${i}`,
          lat: c.latitude,
          lon: c.longitude,
          type: 'conflict',
          label: c.country || 'Conflict Zone',
          detail: c.event_type,
        });
      }
    });

    // Earthquakes
    const quakes = earthquakeData?.earthquakes || [];
    quakes.slice(0, 20).forEach((q: any, i: number) => {
      if (q.lat && q.lon) {
        list.push({
          id: `quake-${i}`,
          lat: q.lat,
          lon: q.lon,
          type: 'earthquake',
          label: `M${q.magnitude}`,
          detail: q.place,
        });
      }
    });

    // Fires
    const fires = fireData?.fires || [];
    fires.slice(0, 30).forEach((f: any, i: number) => {
      if (f.latitude && f.longitude) {
        list.push({
          id: `fire-${i}`,
          lat: f.latitude,
          lon: f.longitude,
          type: 'fire',
          label: 'Fire',
          detail: `${(f.bright_ti4 || f.frp || '?')} MW`,
        });
      }
    });

    // Ships
    const ships = shipData?.ships || [];
    ships.slice(0, 40).forEach((s: any, i: number) => {
      if (s.lat && s.lon) {
        list.push({
          id: `ship-${i}`,
          lat: s.lat,
          lon: s.lon,
          type: 'ship',
          label: s.name || s.callsign || 'Vessel',
          detail: s.type,
        });
      }
    });

    return list;
  }, [flightData, conflictData, earthquakeData, fireData, shipData]);

  return markers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scene
// ═══════════════════════════════════════════════════════════════════════════════

function Scene({ autoRotate, isFlat }: { autoRotate: boolean; isFlat: boolean }) {
  const rotationRef = useRef(0);
  const markers = useMarkers();

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.4} color="#aaddff" />
      <pointLight position={[-5, -3, -5]} intensity={0.1} color="#4488aa" />

      <StarField />
      <Atmosphere />
      <Earth autoRotate={autoRotate} rotationRef={rotationRef} />
      <Graticules rotationY={rotationRef.current} />

      {markers.map(m => (
        <DataMarker key={m.id} marker={m} globeRotation={rotationRef.current} />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={isFlat ? 4 : 2.8}
        maxDistance={isFlat ? 6 : 8}
        autoRotate={false}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI Overlay
// ═══════════════════════════════════════════════════════════════════════════════

const LEGEND_ITEMS: { type: MarkerType; label: string }[] = [
  { type: 'aircraft', label: 'Air Traffic' },
  { type: 'conflict', label: 'Conflict' },
  { type: 'fire', label: 'Thermal/Fire' },
  { type: 'ship', label: 'Maritime' },
  { type: 'earthquake', label: 'Quake' },
  { type: 'nuclear', label: 'Nuclear' },
  { type: 'chokepoint', label: 'Chokepoint' },
  { type: 'cyber', label: 'Cyber' },
  { type: 'satellite', label: 'Space' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Globe3D({ autoRotate = true }: Globe3DProps) {
  const [isFlat, setIsFlat] = useState(false);
  const [activeRegion, setActiveRegion] = useState('world');
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className="relative w-full h-full bg-[#000000] overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: isFlat ? [0, 5, 0.1] : [0, 0, 5],
          fov: isFlat ? 20 : 45,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000000' }}
      >
        <Scene autoRotate={autoRotate && activeRegion === 'world'} isFlat={isFlat} />
      </Canvas>

      {/* Region Tabs */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
        {REGIONS.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveRegion(r.id)}
            className={`px-2.5 py-1 rounded text-[9px] font-mono transition-all ${
              activeRegion === r.id
                ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                : 'bg-black/50 text-white/40 border border-white/5 hover:text-white hover:bg-white/5'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Zoom & Mode Controls */}
      <div className="absolute top-16 left-3 flex flex-col gap-1 z-10">
        <button
          className="w-7 h-7 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
          title="Zoom In"
        >
          <Plus size={14} />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
          title="Zoom Out"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => setIsFlat(!isFlat)}
          className={`w-7 h-7 flex items-center justify-center rounded border transition-all ${
            isFlat
              ? 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30'
              : 'bg-black/60 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title={isFlat ? 'Globe Mode' : 'Flat Mode'}
        >
          {isFlat ? <Globe size={14} /> : <MapIcon size={14} />}
        </button>
      </div>

      {/* Interaction Hint */}
      <div className="absolute top-3 right-3 text-[9px] font-mono text-white/20 z-10 select-none">
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-black/70 border border-white/10 rounded-lg px-3 py-2">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="flex items-center gap-1 mb-1.5 text-[9px] font-mono text-white/40 hover:text-white/70 transition-colors"
            >
              <ChevronDown size={10} />
              DATA LAYERS
            </button>
            <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[280px]">
              {LEGEND_ITEMS.map(item => (
                <div key={item.type} className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: MARKER_COLORS[item.type],
                      boxShadow: `0 0 4px 1px ${MARKER_COLORS[item.type]}`,
                    }}
                  />
                  <span className="text-[9px] font-mono text-white/50">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute bottom-3 left-3 z-10 px-2 py-1 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-white/40 hover:text-white/70 transition-colors"
        >
          Show Layers
        </button>
      )}
    </div>
  );
}
