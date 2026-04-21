'use client';

import { useEffect, useState } from 'react';
import { CloudRain, AlertTriangle, Flame, Wind, Loader2 } from 'lucide-react';

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

const severityConfig = {
  extreme: { color: 'bg-red-600', icon: Flame, label: 'EXTREME' },
  severe: { color: 'bg-orange-500', icon: AlertTriangle, label: 'SEVERE' },
  moderate: { color: 'bg-yellow-500', icon: Wind, label: 'MODERATE' },
  minor: { color: 'bg-blue-500', icon: CloudRain, label: 'MINOR' },
};

export function WeatherAlerts() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/weather-alerts');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAlerts(data.alerts);
      } catch (e) {
        setError('Failed to load weather alerts');
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {alerts.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No active alerts</div>
      ) : (
        alerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          
          return (
            <div
              key={alert.id}
              className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 hover:bg-gray-800/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`${config.color} p-2 rounded-lg shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.color} text-white`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-gray-400 mb-1">{alert.region}</p>
                  <p className="text-xs text-gray-300 line-clamp-2">
                    {alert.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
