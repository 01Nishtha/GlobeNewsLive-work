'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Satellite, AlertCircle, CheckCircle2, RotateCw, Eye, Filter } from 'lucide-react';

interface ObservationTask {
  id: string;
  name: string;
  type: 'satellite-pass' | 'scheduled-check' | 'data-sync' | 'alert-scan';
  status: 'upcoming' | 'in-progress' | 'completed' | 'failed';
  scheduledTime: Date;
  durationMin: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  region?: string;
  description: string;
  progress?: number;
}

const MOCK_TASKS: ObservationTask[] = [
  { id: '1', name: 'GDELT Global Scan', type: 'data-sync', status: 'in-progress', scheduledTime: new Date(Date.now() + 2 * 60000), durationMin: 5, priority: 'high', description: 'Full GDELT event database synchronization', progress: 67 },
  { id: '2', name: 'Iran Airspace Monitor', type: 'satellite-pass', status: 'upcoming', scheduledTime: new Date(Date.now() + 15 * 60000), durationMin: 12, priority: 'critical', region: 'Middle East', description: 'Monitor military aircraft movements over Iranian airspace' },
  { id: '3', name: 'RSS Feed Aggregation', type: 'data-sync', status: 'completed', scheduledTime: new Date(Date.now() - 5 * 60000), durationMin: 3, priority: 'normal', description: 'Aggregate 54+ news sources into signal feed', progress: 100 },
  { id: '4', name: 'Cyber Threat Sweep', type: 'alert-scan', status: 'upcoming', scheduledTime: new Date(Date.now() + 30 * 60000), durationMin: 8, priority: 'high', description: 'Scan dark web and CERT advisories for new threats' },
  { id: '5', name: 'Black Sea Ship Tracking', type: 'satellite-pass', status: 'in-progress', scheduledTime: new Date(Date.now() - 2 * 60000), durationMin: 20, priority: 'normal', region: 'Europe', description: 'AIS tracking of naval vessels in Black Sea', progress: 45 },
  { id: '6', name: 'US Market Open Watch', type: 'scheduled-check', status: 'upcoming', scheduledTime: new Date(Date.now() + 120 * 60000), durationMin: 60, priority: 'high', region: 'North America', description: 'Monitor pre-market indicators and futures' },
  { id: '7', name: 'Earthquake Monitor', type: 'alert-scan', status: 'completed', scheduledTime: new Date(Date.now() - 15 * 60000), durationMin: 2, priority: 'normal', description: 'USGS seismic data check', progress: 100 },
  { id: '8', name: 'Taiwan Strait Overflight', type: 'satellite-pass', status: 'failed', scheduledTime: new Date(Date.now() - 30 * 60000), durationMin: 10, priority: 'critical', region: 'Asia-Pacific', description: 'PLAF overflight detection - sensor offline' },
];

function formatTimeLeft(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return 'Now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'in-progress': return <RotateCw size={12} className="text-accent-blue animate-spin" />;
    case 'completed': return <CheckCircle2 size={12} className="text-accent-green" />;
    case 'failed': return <AlertCircle size={12} className="text-accent-red" />;
    default: return <Clock size={12} className="text-amber-400" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-white/10 text-white/50 border-white/10';
  }
}

export default function EventObservations() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'in-progress' | 'completed'>('all');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);
  const upcomingCount = tasks.filter(t => t.status === 'upcoming').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={12} className="text-accent-green" />
          <span className="font-mono text-[10px] font-bold text-accent-green tracking-wider">OBSERVATIONS</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-white/30">{upcomingCount} upcoming</span>
          {failedCount > 0 && <span className="text-[9px] font-mono text-red-400">{failedCount} failed</span>}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-2 py-1.5 border-b border-white/10 flex gap-1">
        {(['all', 'upcoming', 'in-progress', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
              filter === f
                ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
                : 'bg-white/5 text-white/30 border-transparent hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'ALL' : f.toUpperCase().replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="px-3 py-1.5 border-b border-white/10 grid grid-cols-4 gap-1">
        <div className="text-center">
          <div className="text-[10px] font-mono text-amber-400">{upcomingCount}</div>
          <div className="text-[7px] text-white/30 font-mono">UPCOMING</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-blue">{inProgressCount}</div>
          <div className="text-[7px] text-white/30 font-mono">ACTIVE</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-accent-green">{completedCount}</div>
          <div className="text-[7px] text-white/30 font-mono">DONE</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-mono text-white/50">{tasks.length}</div>
          <div className="text-[7px] text-white/30 font-mono">TOTAL</div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map(task => (
          <div
            key={task.id}
            className={`rounded-lg border px-2.5 py-2 transition-all hover:bg-white/5 ${
              task.status === 'failed' ? 'border-red-500/20 bg-red-500/5' :
              task.status === 'in-progress' ? 'border-blue-500/20 bg-blue-500/5' :
              task.status === 'completed' ? 'border-green-500/10 bg-green-500/5' :
              'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {getStatusIcon(task.status)}
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-white truncate">{task.name}</div>
                  <div className="text-[8px] text-white/40 font-mono truncate">{task.description}</div>
                </div>
              </div>
              <span className={`text-[7px] font-mono px-1 py-0.5 rounded border flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-white/30 font-mono flex items-center gap-0.5">
                  <Calendar size={8} /> {formatTimeLeft(task.scheduledTime)}
                </span>
                {task.region && (
                  <span className="text-[8px] text-white/30 font-mono">{task.region}</span>
                )}
                <span className="text-[8px] text-white/30 font-mono">{task.durationMin}min</span>
              </div>
              {task.progress !== undefined && task.status === 'in-progress' && (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue rounded-full transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-accent-blue">{task.progress}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
