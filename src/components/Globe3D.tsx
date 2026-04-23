'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import useSWR from 'swr';
import { ACTIVE_CONFLICTS, STRATEGIC_CHOKEPOINTS, MILITARY_BASES } from '@/lib/feeds';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Signal {
  id: string;
  title: string;
  severity: string;
  lat?: number;
  lon?: number;
}

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

interface Globe3DProps {
  signals?: Signal[];
  autoRotate?: boolean;
}

// Convert lat/lon to 3D position
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// Aircraft type colors
const AIRCRAFT_COLORS: Record<string, string> = {
  surveillance: '#a855f7', // purple
  drone: '#facc15',        // yellow
  tanker: '#3b82f6',       // blue
  fighter: '#ef4444',      // red
  transport: '#06b6d4',    // cyan
  military: '#f97316',     // orange
  civilian: '#6b7280',     // gray
};

// Earth mesh
function Earth({ autoRotate }: { autoRotate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#0a1628"
        roughness={0.8}
        metalness={0.2}
      />
      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.01, 32, 32]} />
        <meshBasicMaterial
          color="#1a3a5a"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
    </mesh>
  );
}

// Conflict marker
function ConflictMarker({ lat, lon, name, intensity, type }: {
  lat: number;
  lon: number;
  name: string;
  intensity: string;
  type: string;
}) {
  const position = latLonToVector3(lat, lon, 2.05);
  const color = intensity === 'high' ? '#ff2244' : '#ff6633';
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Pulsing ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.05, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {/* Core dot */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Label on hover */}
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-void/95 px-2 py-1 rounded text-[10px] whitespace-nowrap border border-accent-red/50">
            <div className="text-accent-red font-bold">{name}</div>
            <div className="text-text-muted text-[8px]">{type}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Chokepoint marker
function ChokepointMarker({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const position = latLonToVector3(lat, lon, 2.03);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-void/95 px-2 py-1 rounded text-[10px] whitespace-nowrap border border-accent-gold/50">
            <div className="text-accent-gold font-bold">⚓ {name}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Military base marker
function BaseMarker({ lat, lon, name, op }: { lat: number; lon: number; name: string; op: string }) {
  const position = latLonToVector3(lat, lon, 2.02);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.02, 0.02, 0.02]} />
        <meshBasicMaterial color="#00ccff" />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-void/95 px-2 py-1 rounded text-[10px] whitespace-nowrap border border-accent-blue/50">
            <div className="text-accent-blue font-bold">🎖️ {name}</div>
            <div className="text-text-muted text-[8px]">{op}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Signal pin
function SignalPin({ lat, lon, severity, title }: { lat: number; lon: number; severity: string; title: string }) {
  const position = latLonToVector3(lat, lon, 2.08);
  const color = severity === 'CRITICAL' ? '#ff2244' : severity === 'HIGH' ? '#ff6633' : '#ffaa00';
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <coneGeometry args={[0.02, 0.06, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-void/95 px-2 py-1 rounded text-[10px] max-w-[200px] border border-border-default">
            <div style={{ color }} className="font-bold text-[8px]">{severity}</div>
            <div className="text-white text-[9px]">{title.substring(0, 60)}...</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Flight marker on globe
function FlightMarker({ aircraft }: { aircraft: Aircraft }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Altitude offset: higher aircraft are further from globe surface
  const altitudeOffset = Math.min((aircraft.altitude / 50000) * 0.3, 0.35);
  const radius = 2.02 + altitudeOffset;
  const position = latLonToVector3(aircraft.lat, aircraft.lon, radius);

  const color = AIRCRAFT_COLORS[aircraft.type] || AIRCRAFT_COLORS.civilian;

  // Heading indicator: compute a point slightly ahead of the aircraft
  const headingRad = (aircraft.heading * Math.PI) / 180;
  const headingLat = aircraft.lat + Math.cos(headingRad) * 0.5;
  const headingLon = aircraft.lon + Math.sin(headingRad) * 0.5;
  const headingPos = latLonToVector3(headingLat, headingLon, radius);
  const direction = new THREE.Vector3().subVectors(headingPos, position).normalize().multiplyScalar(0.06);

  // Orient the aircraft to face its heading
  const up = position.clone().normalize();
  const forward = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  const correctedForward = new THREE.Vector3().crossVectors(right, up).normalize();

  const quaternion = new THREE.Quaternion();
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeBasis(right, up, correctedForward);
  quaternion.setFromRotationMatrix(rotationMatrix);

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Aircraft body — small cone pointing forward */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.015, 0.04, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Wings — flat box */}
      <mesh position={[0, 0.005, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.035, 0.003, 0.003]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>

      {/* Heading trail line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, direction.x, direction.y, direction.z]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </line>

      {/* Pulsing ring for military/surveillance */}
      {(aircraft.type === 'surveillance' || aircraft.type === 'fighter' || aircraft.type === 'drone') && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.025, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="bg-void/95 px-2.5 py-2 rounded border border-border-default min-w-[180px]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-mono text-[10px] font-bold text-white">{aircraft.callsign || 'UNKNOWN'}</span>
              {aircraft.isMilitary && <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1 rounded">MIL</span>}
            </div>
            <div className="text-[9px] text-text-muted mb-1">{aircraft.category}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px]">
              <div><span className="text-text-dim">Alt:</span> <span className="text-white">{aircraft.altitude.toLocaleString()}ft</span></div>
              <div><span className="text-text-dim">Spd:</span> <span className="text-white">{aircraft.speed}kts</span></div>
              <div><span className="text-text-dim">Hdg:</span> <span className="text-white">{aircraft.heading}°</span></div>
              <div><span className="text-text-dim">V/S:</span> <span className={aircraft.verticalRate > 0 ? 'text-green-400' : aircraft.verticalRate < 0 ? 'text-red-400' : 'text-white'}>{aircraft.verticalRate > 0 ? '+' : ''}{aircraft.verticalRate}fpm</span></div>
              <div className="col-span-2"><span className="text-text-dim">Country:</span> <span className="text-white">{aircraft.country}</span></div>
            </div>
            {aircraft.squawk && (
              <div className="mt-1 text-[8px] font-mono">
                <span className="text-text-dim">Squawk:</span>{' '}
                <span className={aircraft.squawk === '7700' || aircraft.squawk === '7600' || aircraft.squawk === '7500' ? 'text-red-400 font-bold' : 'text-white'}>
                  {aircraft.squawk}
                </span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// Scene
function Scene({ signals, autoRotate, showFlights, flights }: {
  signals: Signal[];
  autoRotate: boolean;
  showFlights: boolean;
  flights: Aircraft[];
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4a6a8a" />

      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />

      <Earth autoRotate={autoRotate} />

      {/* Conflict markers */}
      {ACTIVE_CONFLICTS.map(c => (
        <ConflictMarker
          key={c.name}
          lat={c.lat}
          lon={c.lon}
          name={c.name}
          intensity={c.intensity}
          type={c.type}
        />
      ))}

      {/* Chokepoint markers */}
      {STRATEGIC_CHOKEPOINTS.map(cp => (
        <ChokepointMarker key={cp.name} lat={cp.lat} lon={cp.lon} name={cp.name} />
      ))}

      {/* Military base markers */}
      {MILITARY_BASES.slice(0, 10).map(b => (
        <BaseMarker key={b.name} lat={b.lat} lon={b.lon} name={b.name} op={b.op} />
      ))}

      {/* Signal pins */}
      {signals.filter(s => s.lat && s.lon).slice(0, 20).map(s => (
        <SignalPin key={s.id} lat={s.lat!} lon={s.lon!} severity={s.severity} title={s.title} />
      ))}

      {/* Flight markers */}
      {showFlights && flights.map(a => (
        <FlightMarker key={a.id} aircraft={a} />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export default function Globe3D({ signals = [], autoRotate = true }: Globe3DProps) {
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [hasError, setHasError] = useState(false);
  const [showFlights, setShowFlights] = useState(true);
  const [flightsFilter, setFlightsFilter] = useState<'all' | 'military'>('all');

  // Fetch flight data
  const { data: flightData } = useSWR<{
    flights: Aircraft[];
    aircraft: Aircraft[];
    timestamp: number;
    total: number;
    military: number;
    simulated?: boolean;
  }>(
    showFlights ? `/api/flights?region=global&military=${flightsFilter === 'military'}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const flights = useMemo(() => {
    const raw = flightData?.flights || flightData?.aircraft || [];
    // Limit to avoid performance issues — show max 150 aircraft
    return raw.slice(0, 150);
  }, [flightData]);

  // Check WebGL support
  const isWebGLAvailable = typeof window !== 'undefined' && (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  })();

  if (hasError || !isWebGLAvailable) {
    return (
      <div className="glass-panel h-full flex flex-col items-center justify-center p-8">
        <div className="text-4xl mb-4">🌍</div>
        <div className="text-[12px] text-white font-bold mb-2">3D Globe Unavailable</div>
        <div className="text-[10px] text-gray-400 text-center">
          {!isWebGLAvailable
            ? 'WebGL is not supported in your browser'
            : 'An error occurred loading the 3D view'}
        </div>
        <div className="text-[9px] text-gray-500 mt-2">Use the tactical map view instead</div>
      </div>
    );
  }

  return (
    <div className="glass-panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-panel/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌍</span>
          <span className="font-mono text-[11px] font-bold tracking-wider text-accent-green">
            3D GLOBE VIEW
          </span>
          {showFlights && flightData && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono">
              {flightData.military || 0} MIL
            </span>
          )}
          {showFlights && flightData?.simulated && (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-mono">
              SIM
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Flights toggle */}
          <button
            onClick={() => setShowFlights(!showFlights)}
            className={`px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1 ${
              showFlights ? 'bg-cyan-500/20 text-cyan-400' : 'bg-elevated text-text-dim'
            }`}
            title="Toggle flight markers"
          >
            ✈️ {showFlights ? 'ON' : 'OFF'}
          </button>
          {showFlights && (
            <button
              onClick={() => setFlightsFilter(flightsFilter === 'all' ? 'military' : 'all')}
              className={`px-2 py-1 rounded text-[9px] font-mono ${
                flightsFilter === 'military' ? 'bg-orange-500/20 text-orange-400' : 'bg-elevated text-text-dim'
              }`}
            >
              {flightsFilter === 'military' ? '🎖️ MIL' : '🌐 ALL'}
            </button>
          )}
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`px-2 py-1 rounded text-[9px] font-mono ${
              isRotating ? 'bg-accent-green/20 text-accent-green' : 'bg-elevated text-text-dim'
            }`}
          >
            {isRotating ? '⏸ PAUSE' : '▶ ROTATE'}
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-[400px]">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          onCreated={() => {}}
          onError={() => setHasError(true)}
          fallback={<div className="h-full flex items-center justify-center text-gray-400">Loading 3D...</div>}
        >
          <Scene signals={signals} autoRotate={isRotating} showFlights={showFlights} flights={flights} />
        </Canvas>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-border-subtle bg-panel/30">
        <div className="flex items-center justify-center gap-3 text-[9px] flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent-red" />
            <span className="text-text-muted">Conflicts</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent-gold" />
            <span className="text-text-muted">Chokepoints</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-accent-blue" />
            <span className="text-text-muted">Bases</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rotate-45 bg-accent-orange" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
            <span className="text-text-muted">Signals</span>
          </div>
          {showFlights && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-text-muted">ISR</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-text-muted">Fighter</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-text-muted">Tanker</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-text-muted">Transport</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-text-muted">Drone</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
