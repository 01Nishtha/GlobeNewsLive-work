'use client';

import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import useSWR from 'swr';
import {
  Plus, Minus, Globe, Map as MapIcon,
  Plane, Flame, Crosshair, Anchor, Radio, Zap, Satellite,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════════

interface Globe3DProps {
  autoRotate?: boolean;
  className?: string;
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

// ════════════════════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════════════════════

const EARTH_RADIUS = 2;
const CLOUD_RADIUS = 2.015;
const ATMOSPHERE_SCALE = 1.04;

const TEXTURE_URLS = {
  map: 'https://unpkg.com/three-globe@2.24.13/example/img/earth-blue-marble.jpg',
  bump: 'https://unpkg.com/three-globe@2.24.13/example/img/earth-topology.png',
  specular: 'https://unpkg.com/three-globe@2.24.13/example/img/earth-water.png',
  clouds: 'https://unpkg.com/three-globe@2.24.13/example/img/earth-clouds.png',
};

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

const REGIONS = [
  { id: 'world', name: 'WORLD', lat: 20, lon: 0 },
  { id: 'americas', name: 'AMERICAS', lat: 15, lon: -90 },
  { id: 'europe', name: 'EUROPE', lat: 50, lon: 15 },
  { id: 'middleeast', name: 'MIDDLE EAST', lat: 30, lon: 45 },
  { id: 'asiapacific', name: 'ASIA PACIFIC', lat: 25, lon: 110 },
  { id: 'africa', name: 'AFRICA', lat: 5, lon: 20 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Math helpers
// ════════════════════════════════════════════════════════════════════════════════

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function latLonToRotation(lat: number, lon: number): { x: number; y: number } {
  return {
    x: (lat * Math.PI) / 180,
    y: (-lon * Math.PI) / 180,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// Earth Sphere with realistic textures
// ════════════════════════════════════════════════════════════════════════════════

function EarthSurface() {
  const [map, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    TEXTURE_URLS.map,
    TEXTURE_URLS.bump,
    TEXTURE_URLS.specular,
  ]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: map || undefined,
      bumpMap: bumpMap || undefined,
      bumpScale: 0.04,
      roughnessMap: specularMap || undefined,
      roughness: 0.8,
      metalness: 0.05,
      color: 0xaaaaaa,
    });
    return mat;
  }, [map, bumpMap, specularMap]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Cloud Layer
// ════════════════════════════════════════════════════════════════════════════════

function CloudLayer({ autoRotate }: { autoRotate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudMap = useLoader(THREE.TextureLoader, TEXTURE_URLS.clouds);

  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <mesh ref={meshRef} scale={[CLOUD_RADIUS / EARTH_RADIUS, CLOUD_RADIUS / EARTH_RADIUS, CLOUD_RADIUS / EARTH_RADIUS]}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={cloudMap || undefined}
        transparent
        opacity={0.35}
        depthWrite={false}
        side={THREE.DoubleSide}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Atmosphere — subtle natural blue-white rim glow
// ════════════════════════════════════════════════════════════════════════════════

function Atmosphere() {
  const uniforms = useMemo(() => ({
    atmColor: { value: new THREE.Color('#4488cc') },
    c: { value: 0.6 },
    p: { value: 4.5 },
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
    uniform vec3 atmColor;
    uniform float c;
    uniform float p;
    void main() {
      float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
      gl_FragColor = vec4(atmColor * intensity, intensity * 0.35);
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

// ════════════════════════════════════════════════════════════════════════════════
// Graticules (faint grid)
// ═══════════════════════════════════════════════════════════════════════════════

function Graticules({ rotationY }: { rotationY: number }) {
  const lines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const r = EARTH_RADIUS + 0.002;

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
      color: 0x2a5a6a,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    return new THREE.LineSegments(geo, mat);
  }, [rotationY]);

  return <primitive object={lines} />;
}

// ════════════════════════════════════════════════════════════════════════════════
// Data Marker
// ════════════════════════════════════════════════════════════════════════════════

function DataMarker({ marker, globeRotation }: { marker: MarkerData; globeRotation: number }) {
  const [hovered, setHovered] = useState(false);
  const color = MARKER_COLORS[marker.type];
  const adjLon = marker.lon - (globeRotation * 180 / Math.PI);
  const pos = latLonToVector3(marker.lat, adjLon, EARTH_RADIUS + 0.012);

  const camDir = new THREE.Vector3(0, 0, 1);
  const visible = pos.clone().normalize().dot(camDir) > 0.1;
  if (!visible) return null;

  return (
    <group position={pos}>
      <Html distanceFactor={10} style={{ transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: hovered ? '9px' : '5px',
            height: hovered ? '9px' : '5px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${hovered ? '10px 3px' : '6px 2px'} ${color}`,
            transition: 'all 0.15s ease',
            cursor: 'pointer',
          }}
        />
      </Html>
      {hovered && marker.label && (
        <Html distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="bg-black/90 border border-white/10 rounded px-2 py-1 shadow-lg whitespace-nowrap">
            <span className="font-mono text-[10px]" style={{ color }}>{marker.label}</span>
            {marker.detail && <span className="text-[9px] text-gray-400 ml-2">{marker.detail}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Data fetching
// ════════════════════════════════════════════════════════════════════════════════

function useMarkers() {
  const { data: flightData } = useSWR<{ flights: any[] }>('/api/flights?region=global&military=false', fetcher, { refreshInterval: 10000 });
  const { data: conflictData } = useSWR<{ conflicts: any[] }>('/api/conflicts', fetcher, { refreshInterval: 300000 });
  const { data: earthquakeData } = useSWR<{ earthquakes: any[] }>('/api/earthquakes', fetcher, { refreshInterval: 120000 });
  const { data: fireData } = useSWR<{ fires: any[] }>('/api/fires', fetcher, { refreshInterval: 300000 });
  const { data: shipData } = useSWR<{ ships: any[] }>('/api/ships', fetcher, { refreshInterval: 60000 });

  return useMemo<MarkerData[]>(() => {
    const list: MarkerData[] = [];
    (flightData?.flights || []).slice(0, 80).forEach((f: any, i: number) => {
      if (f.lat && f.lon) list.push({ id: `f-${i}`, lat: f.lat, lon: f.lon, type: 'aircraft', label: f.callsign || 'Unknown', detail: `${f.altitude?.toLocaleString() || '?'}ft` });
    });
    (conflictData?.conflicts || []).forEach((c: any, i: number) => {
      if (c.latitude && c.longitude) list.push({ id: `c-${i}`, lat: c.latitude, lon: c.longitude, type: 'conflict', label: c.country || 'Conflict', detail: c.event_type });
    });
    (earthquakeData?.earthquakes || []).slice(0, 20).forEach((q: any, i: number) => {
      if (q.lat && q.lon) list.push({ id: `q-${i}`, lat: q.lat, lon: q.lon, type: 'earthquake', label: `M${q.magnitude}`, detail: q.place });
    });
    (fireData?.fires || []).slice(0, 30).forEach((f: any, i: number) => {
      if (f.latitude && f.longitude) list.push({ id: `fire-${i}`, lat: f.latitude, lon: f.longitude, type: 'fire', label: 'Fire', detail: `${f.bright_ti4 || f.frp || '?'} MW` });
    });
    (shipData?.ships || []).slice(0, 40).forEach((s: any, i: number) => {
      if (s.lat && s.lon) list.push({ id: `s-${i}`, lat: s.lat, lon: s.lon, type: 'ship', label: s.name || s.callsign || 'Vessel', detail: s.type });
    });
    return list;
  }, [flightData, conflictData, earthquakeData, fireData, shipData]);
}

// ════════════════════════════════════════════════════════════════════════════════
// Scene
// ════════════════════════════════════════════════════════════════════════════════

function Scene({ autoRotate, onRotationChange }: { autoRotate: boolean; onRotationChange?: (y: number) => void }) {
  const earthRef = useRef<THREE.Group>(null);
  const rotationRef = useRef(0);
  const markers = useMarkers();

  useFrame((_, delta) => {
    if (earthRef.current && autoRotate) {
      earthRef.current.rotation.y += delta * 0.04;
      rotationRef.current = earthRef.current.rotation.y;
      onRotationChange?.(rotationRef.current);
    }
  });

  return (
    <>
      {/* Lighting — realistic sun + fill */}
      <ambientLight intensity={0.12} color="#446688" />
      <hemisphereLight args={['#e0f0ff', '#081018', 0.3]} />
      <directionalLight
        position={[8, 4, 5]}
        intensity={1.8}
        color="#fff8f0"
        castShadow={false}
      />
      <directionalLight
        position={[-4, -2, -3]}
        intensity={0.2}
        color="#4466aa"
      />

      <Stars radius={200} depth={60} count={3000} factor={6} saturation={0} fade speed={0.5} />

      <group ref={earthRef}>
        <EarthSurface />
        <CloudLayer autoRotate={autoRotate} />
        <Atmosphere />
        <Graticules rotationY={rotationRef.current} />
        {markers.map(m => (
          <DataMarker key={m.id} marker={m} globeRotation={rotationRef.current} />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2.6}
        maxDistance={9}
        autoRotate={false}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Loading fallback
// ════════════════════════════════════════════════════════════════════════════════

function GlobeFallback() {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-3" />
        <div className="text-white/40 text-xs font-mono">Loading Globe...</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════════

export default function Globe3D({ autoRotate = true, className }: Globe3DProps) {
  const [activeRegion, setActiveRegion] = useState('world');
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className || ''}`}>
      <Suspense fallback={<GlobeFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#000000' }}
        >
          <Scene autoRotate={autoRotate && activeRegion === 'world'} />
        </Canvas>
      </Suspense>

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

      {/* Zoom Controls */}
      <div className="absolute top-16 left-3 flex flex-col gap-1 z-10">
        <button className="w-7 h-7 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Zoom In">
          <Plus size={14} />
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all" title="Zoom Out">
          <Minus size={14} />
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
            <button onClick={() => setShowLegend(false)} className="flex items-center gap-1 mb-1.5 text-[9px] font-mono text-white/40 hover:text-white/70 transition-colors">
              <span className="text-[8px]">▼</span> DATA LAYERS
            </button>
            <div className="grid grid-cols-3 gap-x-3 gap-y-1">
              {Object.entries(MARKER_COLORS).slice(0, 9).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px 1px ${color}` }} />
                  <span className="text-[9px] font-mono text-white/50 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!showLegend && (
        <button onClick={() => setShowLegend(true)} className="absolute bottom-3 left-3 z-10 px-2 py-1 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-white/40 hover:text-white/70 transition-colors">
          Layers
        </button>
      )}
    </div>
  );
}
