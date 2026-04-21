import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface WeatherAlert {
  id: string;
  severity: 'extreme' | 'severe' | 'moderate' | 'minor';
  title: string;
  description: string;
  region: string;
  lat: number;
  lng: number;
  timestamp: string;
  expires: string;
}

// Mock data - replace with real API call
const mockAlerts: WeatherAlert[] = [
  {
    id: 'wx-001',
    severity: 'severe',
    title: 'Hurricane Warning',
    description: 'Category 3 hurricane approaching coast. Evacuation recommended.',
    region: 'Florida Coast',
    lat: 27.0,
    lng: -80.0,
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: 'wx-002',
    severity: 'extreme',
    title: 'Flash Flood Emergency',
    description: 'Life-threatening flooding in low-lying areas.',
    region: 'Houston Metro',
    lat: 29.76,
    lng: -95.37,
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + 43200000).toISOString(),
  },
  {
    id: 'wx-003',
    severity: 'moderate',
    title: 'Heat Advisory',
    description: 'Extreme heat with temperatures exceeding 105°F.',
    region: 'Phoenix AZ',
    lat: 33.45,
    lng: -112.07,
    timestamp: new Date().toISOString(),
    expires: new Date(Date.now() + 21600000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  
  let alerts = mockAlerts;
  
  if (severity) {
    alerts = alerts.filter(a => a.severity === severity);
  }
  
  return NextResponse.json({
    alerts,
    count: alerts.length,
    updated: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
