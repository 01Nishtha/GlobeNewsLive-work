import { NextResponse } from "next/server";

interface Satellite {
  id: string;
  name: string;
  type: "leo" | "meo" | "geo" | "iss" | "spy";
  lat: number;
  lon: number;
  altitude: number; // km
  velocity: number; // km/s
  inclination: number;
  period: number; // minutes
  country: string;
  purpose: string;
}

// Known satellite orbital parameters (simplified)
const SATELLITE_DEFS = [
  // ISS
  { name: "ISS", type: "iss" as const, altitude: 408, inclination: 51.6, period: 92.7, country: "International", purpose: "Space Station" },
  // Starlink LEO constellation (sample)
  { name: "STARLINK-1007", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1008", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1010", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1011", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1012", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1013", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1014", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1015", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1016", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1017", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1019", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  { name: "STARLINK-1020", type: "leo" as const, altitude: 550, inclination: 53.0, period: 95.0, country: "USA", purpose: "Communications" },
  // GPS constellation
  { name: "GPS-IIR-1", type: "meo" as const, altitude: 20200, inclination: 55.0, period: 718.0, country: "USA", purpose: "Navigation" },
  { name: "GPS-IIR-2", type: "meo" as const, altitude: 20200, inclination: 55.0, period: 718.0, country: "USA", purpose: "Navigation" },
  { name: "GPS-IIR-3", type: "meo" as const, altitude: 20200, inclination: 55.0, period: 718.0, country: "USA", purpose: "Navigation" },
  { name: "GPS-IIR-4", type: "meo" as const, altitude: 20200, inclination: 55.0, period: 718.0, country: "USA", purpose: "Navigation" },
  { name: "GPS-IIF-1", type: "meo" as const, altitude: 20200, inclination: 55.0, period: 718.0, country: "USA", purpose: "Navigation" },
  { name: "GPS-IIF-2", type: "meo" as const, altitude: 20200, inclination: 55.0, period: 718.0, country: "USA", purpose: "Navigation" },
  // GLONASS
  { name: "GLONASS-M1", type: "meo" as const, altitude: 19100, inclination: 64.8, period: 676.0, country: "Russia", purpose: "Navigation" },
  { name: "GLONASS-M2", type: "meo" as const, altitude: 19100, inclination: 64.8, period: 676.0, country: "Russia", purpose: "Navigation" },
  // Galileo
  { name: "GALILEO-FOC1", type: "meo" as const, altitude: 23222, inclination: 56.0, period: 845.0, country: "EU", purpose: "Navigation" },
  { name: "GALILEO-FOC2", type: "meo" as const, altitude: 23222, inclination: 56.0, period: 845.0, country: "EU", purpose: "Navigation" },
  // BeiDou
  { name: "BEIDOU-3M1", type: "meo" as const, altitude: 21500, inclination: 55.0, period: 773.0, country: "China", purpose: "Navigation" },
  { name: "BEIDOU-3M2", type: "meo" as const, altitude: 21500, inclination: 55.0, period: 773.0, country: "China", purpose: "Navigation" },
  // Geostationary
  { name: "GOES-16", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "USA", purpose: "Weather" },
  { name: "GOES-18", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "USA", purpose: "Weather" },
  { name: "EUTELSAT-9B", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "EU", purpose: "Communications" },
  { name: "INTELSAT-19", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "USA", purpose: "Communications" },
  { name: "TDRS-11", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "USA", purpose: "Data Relay" },
  { name: "FENGYUN-4B", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "China", purpose: "Weather" },
  { name: "HIMAWARI-9", type: "geo" as const, altitude: 35786, inclination: 0.0, period: 1436.0, country: "Japan", purpose: "Weather" },
  // Spy/SIGINT
  { name: "USA-224", type: "spy" as const, altitude: 260, inclination: 57.0, period: 90.0, country: "USA", purpose: "Reconnaissance" },
  { name: "USA-245", type: "spy" as const, altitude: 280, inclination: 97.9, period: 90.0, country: "USA", purpose: "Reconnaissance" },
  { name: "LACROSSE-5", type: "spy" as const, altitude: 680, inclination: 57.0, period: 98.0, country: "USA", purpose: "Radar Imaging" },
  { name: "ONIX-1", type: "spy" as const, altitude: 500, inclination: 65.0, period: 95.0, country: "Russia", purpose: "SIGINT" },
  { name: "YAOGAN-30", type: "spy" as const, altitude: 600, inclination: 35.0, period: 97.0, country: "China", purpose: "ELINT" },
  // Other LEO
  { name: "HUBBLE", type: "leo" as const, altitude: 540, inclination: 28.5, period: 95.0, country: "USA", purpose: "Astronomy" },
  { name: "TERRA", type: "leo" as const, altitude: 705, inclination: 98.2, period: 99.0, country: "USA", purpose: "Earth Observation" },
  { name: "AQUA", type: "leo" as const, altitude: 705, inclination: 98.2, period: 99.0, country: "USA", purpose: "Earth Observation" },
  { name: "SENTINEL-2A", type: "leo" as const, altitude: 786, inclination: 98.6, period: 101.0, country: "EU", purpose: "Earth Observation" },
  { name: "SENTINEL-2B", type: "leo" as const, altitude: 786, inclination: 98.6, period: 101.0, country: "EU", purpose: "Earth Observation" },
  { name: "LANDSAT-8", type: "leo" as const, altitude: 705, inclination: 98.2, period: 99.0, country: "USA", purpose: "Earth Observation" },
  { name: "WORLDVIEW-3", type: "leo" as const, altitude: 617, inclination: 97.9, period: 97.0, country: "USA", purpose: "Imaging" },
  { name: "PLANET-SKYSTAT-1", type: "leo" as const, altitude: 450, inclination: 98.0, period: 93.0, country: "USA", purpose: "Imaging" },
];

// Calculate satellite position based on orbital parameters and time
function computeSatellitePosition(
  def: typeof SATELLITE_DEFS[0],
  index: number,
  time: number
): { lat: number; lon: number } {
  const periodMs = def.period * 60 * 1000;
  const phase = ((time + index * 12345) % periodMs) / periodMs; // 0-1 orbital phase
  const meanAnomaly = phase * 2 * Math.PI;

  // Simplified orbital position calculation
  // For inclined orbits, the satellite oscillates in latitude
  const lat = def.inclination * Math.sin(meanAnomaly);

  // Longitude advances with time, different for each satellite
  let lon = ((time / 1000) * (360 / def.period / 60) + index * (360 / SATELLITE_DEFS.length)) % 360;
  if (lon > 180) lon -= 360;

  // For geostationary satellites, they stay at fixed longitude
  if (def.type === "geo") {
    const geoPositions = [75, 105, 137, 10, 171, 140, 145];
    lon = geoPositions[index % geoPositions.length];
    return { lat: 0, lon };
  }

  return { lat, lon };
}

export async function GET() {
  const now = Date.now();

  const satellites: Satellite[] = SATELLITE_DEFS.map((def, idx) => {
    const pos = computeSatellitePosition(def, idx, now);
    const orbitalVelocity = Math.sqrt(398600.4418 / (6371 + def.altitude)); // km/s

    return {
      id: `sat-${idx}`,
      name: def.name,
      type: def.type,
      lat: pos.lat,
      lon: pos.lon,
      altitude: def.altitude,
      velocity: Math.round(orbitalVelocity * 100) / 100,
      inclination: def.inclination,
      period: def.period,
      country: def.country,
      purpose: def.purpose,
    };
  });

  return NextResponse.json({
    satellites,
    timestamp: now,
    counts: {
      leo: satellites.filter(s => s.type === "leo").length,
      meo: satellites.filter(s => s.type === "meo").length,
      geo: satellites.filter(s => s.type === "geo").length,
      iss: satellites.filter(s => s.type === "iss").length,
      spy: satellites.filter(s => s.type === "spy").length,
    },
  });
}
