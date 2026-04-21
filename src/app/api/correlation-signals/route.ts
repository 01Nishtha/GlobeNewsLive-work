import { NextResponse } from "next/server";

interface CorrelationSignal {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  timestamp: string;
  panelId?: string;
  metadata?: Record<string, unknown>;
}

interface Signal {
  id: string;
  title: string;
  severity: string;
  category: string;
  source: string;
  timeAgo: string;
  timestamp: Date;
  lat?: number;
  lon?: number;
}

interface MarketData {
  name: string;
  symbol: string;
  value: string;
  change: string;
  changePercent: string;
  direction: 'up' | 'down';
}

interface PredictionMarket {
  id: string;
  question: string;
  probability: number;
  change24h: number;
  source: string;
  category: string;
}

// --- Utility: Generate ID ---
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Utility: Fetch helper ---
async function fetchInternal(path: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3400';
    const res = await fetch(`${base}${path}`, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// --- Detectors ---

function detectVelocitySpike(signals: Signal[]): CorrelationSignal | null {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const recent = signals.filter(s => new Date(s.timestamp).getTime() > oneHourAgo);
  const prevHour = signals.filter(s => {
    const t = new Date(s.timestamp).getTime();
    return t > oneHourAgo - 3600000 && t <= oneHourAgo;
  });
  
  if (recent.length >= 5 && recent.length > prevHour.length * 1.5) {
    const criticalCount = recent.filter(s => s.severity === 'CRITICAL').length;
    return {
      id: genId('velocity'),
      type: 'velocity_spike',
      title: `News velocity spike: ${recent.length} signals in last hour`,
      description: criticalCount > 0 
        ? `${criticalCount} critical alerts detected. Activity accelerating.` 
        : 'Activity accelerating across multiple sources.',
      confidence: Math.min(95, 60 + recent.length * 3 + criticalCount * 5),
      timestamp: new Date().toISOString(),
      panelId: 'signal-feed',
      metadata: { recentCount: recent.length, criticalCount },
    };
  }
  return null;
}

function detectKeywordSpike(signals: Signal[]): CorrelationSignal | null {
  const keywords = ['iran', 'israel', 'gaza', 'lebanon', 'nuclear', 'strike', 'attack', 'missile', 'drone', 'hezbollah', 'hamas', 'houthi'];
  const counts: Record<string, number> = {};
  
  for (const s of signals) {
    const text = `${s.title} ${s.category}`.toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw)) {
        counts[kw] = (counts[kw] || 0) + 1;
      }
    }
  }
  
  const topKw = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (topKw && topKw[1] >= 4) {
    return {
      id: genId('keyword'),
      type: 'keyword_spike',
      title: `Keyword surge: "${topKw[0].toUpperCase()}" mentioned ${topKw[1]} times`,
      description: 'Term frequency elevated across news sources.',
      confidence: Math.min(95, 50 + topKw[1] * 5),
      timestamp: new Date().toISOString(),
      panelId: 'signal-feed',
      metadata: { keyword: topKw[0], count: topKw[1] },
    };
  }
  return null;
}

function detectMilitarySurge(signals: Signal[]): CorrelationSignal | null {
  const military = signals.filter(s => s.category === 'military' || s.category === 'conflict');
  const recent = military.filter(s => {
    const t = new Date(s.timestamp).getTime();
    return t > Date.now() - 7200000; // 2 hours
  });
  
  if (recent.length >= 3) {
    const critical = recent.filter(s => s.severity === 'CRITICAL').length;
    return {
      id: genId('military'),
      type: 'military_surge',
      title: `Military activity surge: ${recent.length} events`,
      description: critical > 0 
        ? `${critical} critical military alerts in last 2 hours.` 
        : 'Elevated military posture detected across monitoring feeds.',
      confidence: Math.min(95, 55 + recent.length * 6 + critical * 8),
      timestamp: new Date().toISOString(),
      panelId: 'military-tracker',
      metadata: { eventCount: recent.length, criticalCount: critical },
    };
  }
  return null;
}

function detectConvergence(signals: Signal[]): CorrelationSignal | null {
  // Check for same topic from different sources
  const recent = signals.filter(s => new Date(s.timestamp).getTime() > Date.now() - 3600000);
  if (recent.length < 4) return null;
  
  const titles = recent.map(s => s.title.toLowerCase());
  const sources = new Set(recent.map(s => s.source));
  
  // Look for shared significant words
  const significantWords = ['strike', 'attack', 'retaliation', 'escalation', 'ceasefire', 'invasion', 'bombing', 'drone', 'missile'];
  for (const word of significantWords) {
    const matching = recent.filter(s => s.title.toLowerCase().includes(word));
    const matchingSources = new Set(matching.map(s => s.source));
    if (matching.length >= 3 && matchingSources.size >= 2) {
      return {
        id: genId('convergence'),
        type: 'convergence',
        title: `Source convergence on "${word.toUpperCase()}"`,
        description: `${matching.length} reports from ${matchingSources.size} distinct sources confirming event.`,
        confidence: Math.min(95, 50 + matching.length * 8 + matchingSources.size * 5),
        timestamp: new Date().toISOString(),
        panelId: 'event-convergence',
        metadata: { keyword: word, sourceCount: matchingSources.size, reportCount: matching.length },
      };
    }
  }
  return null;
}

function detectGeoConvergence(signals: Signal[]): CorrelationSignal | null {
  const withCoords = signals.filter(s => s.lat && s.lon);
  if (withCoords.length < 3) return null;
  
  // Group by proximity (within ~200km roughly = 2 degrees)
  const clusters: { lat: number; lon: number; count: number; signals: Signal[] }[] = [];
  
  for (const s of withCoords) {
    let found = false;
    for (const c of clusters) {
      const dist = Math.sqrt(Math.pow(s.lat! - c.lat, 2) + Math.pow(s.lon! - c.lon, 2));
      if (dist < 3) {
        c.count++;
        c.signals.push(s);
        c.lat = (c.lat * (c.count - 1) + s.lat!) / c.count;
        c.lon = (c.lon * (c.count - 1) + s.lon!) / c.count;
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({ lat: s.lat!, lon: s.lon!, count: 1, signals: [s] });
    }
  }
  
  const bigCluster = clusters.filter(c => c.count >= 3).sort((a, b) => b.count - a.count)[0];
  if (bigCluster) {
    const sevCount = bigCluster.signals.filter(s => s.severity === 'CRITICAL' || s.severity === 'HIGH').length;
    return {
      id: genId('geo'),
      type: 'geo_convergence',
      title: `Geographic cluster: ${bigCluster.count} events in region`,
      description: `${sevCount} high-severity events clustered geographically. Potential hotspot.`,
      confidence: Math.min(95, 55 + bigCluster.count * 8 + sevCount * 5),
      timestamp: new Date().toISOString(),
      panelId: 'world-map',
      metadata: { clusterSize: bigCluster.count, severityCount: sevCount },
    };
  }
  return null;
}

function detectMarketNewsDivergence(signals: Signal[], markets: MarketData[]): CorrelationSignal | null {
  const criticalSignals = signals.filter(s => s.severity === 'CRITICAL');
  if (!criticalSignals.length || !markets.length) return null;
  
  // Check if markets moved significantly while critical news happened
  const oil = markets.find(m => m.symbol.includes('OIL') || m.symbol.includes('CL=') || m.name.toLowerCase().includes('oil'));
  const gold = markets.find(m => m.symbol.includes('XAU') || m.symbol.includes('GC=') || m.name.toLowerCase().includes('gold'));
  
  const movers: string[] = [];
  if (oil && parseFloat(oil.changePercent) > 2) movers.push(`Oil +${oil.changePercent}%`);
  if (gold && parseFloat(gold.changePercent) > 1) movers.push(`Gold +${gold.changePercent}%`);
  
  const vix = markets.find(m => m.symbol.includes('VIX'));
  if (vix && parseFloat(vix.changePercent) > 5) movers.push(`VIX +${vix.changePercent}%`);
  
  if (movers.length > 0) {
    return {
      id: genId('market'),
      type: 'explained_market_move',
      title: `Markets reacting: ${movers.join(', ')}`,
      description: 'Price action correlates with breaking geopolitical developments.',
      confidence: Math.min(92, 65 + movers.length * 10),
      timestamp: new Date().toISOString(),
      panelId: 'markets-terminal',
      metadata: { movers },
    };
  }
  return null;
}

function detectPredictionLeadsNews(predictions: PredictionMarket[], signals: Signal[]): CorrelationSignal | null {
  if (!predictions?.length || !signals?.length) return null;
  
  const recentPredictions = predictions.filter(p => Math.abs(p.change24h) > 5);
  if (!recentPredictions.length) return null;
  
  // Check if prediction moved BEFORE or independently of news
  const topMover = recentPredictions.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];
  
  return {
    id: genId('prediction'),
    type: 'prediction_leads_news',
    title: `Prediction market signal: "${topMover.question.slice(0, 50)}..."`,
    description: `Probability shifted ${topMover.change24h > 0 ? '+' : ''}${topMover.change24h}% — markets may be pricing in non-public information.`,
    confidence: Math.min(90, 55 + Math.abs(topMover.change24h) * 2),
    timestamp: new Date().toISOString(),
    panelId: 'multi-predictions',
    metadata: { probability: topMover.probability, change: topMover.change24h },
  };
}

function detectSectorCascade(markets: MarketData[]): CorrelationSignal | null {
  if (!markets?.length) return null;
  
  const downMarkets = markets.filter(m => m.direction === 'down' && Math.abs(parseFloat(m.changePercent)) > 1.5);
  const upMarkets = markets.filter(m => m.direction === 'up' && Math.abs(parseFloat(m.changePercent)) > 1.5);
  
  if (downMarkets.length >= 3) {
    return {
      id: genId('cascade'),
      type: 'sector_cascade',
      title: `Sector cascade: ${downMarkets.length} markets declining`,
      description: `Broad risk-off detected: ${downMarkets.slice(0, 3).map(m => m.name).join(', ')}...`,
      confidence: Math.min(92, 50 + downMarkets.length * 8),
      timestamp: new Date().toISOString(),
      panelId: 'market-ticker',
      metadata: { decliningCount: downMarkets.length, topDecliners: downMarkets.slice(0, 3).map(m => m.name) },
    };
  }
  
  if (upMarkets.length >= 3) {
    return {
      id: genId('cascade'),
      type: 'sector_cascade',
      title: `Sector cascade: ${upMarkets.length} markets rallying`,
      description: `Broad risk-on detected: ${upMarkets.slice(0, 3).map(m => m.name).join(', ')}...`,
      confidence: Math.min(88, 50 + upMarkets.length * 7),
      timestamp: new Date().toISOString(),
      panelId: 'market-ticker',
      metadata: { rallyingCount: upMarkets.length, topRalliers: upMarkets.slice(0, 3).map(m => m.name) },
    };
  }
  return null;
}

function detectCyberAlert(signals: Signal[]): CorrelationSignal | null {
  const cyber = signals.filter(s => s.category === 'cyber');
  const recent = cyber.filter(s => new Date(s.timestamp).getTime() > Date.now() - 3600000);
  
  if (recent.length >= 2) {
    const sev = recent.filter(s => s.severity === 'CRITICAL' || s.severity === 'HIGH').length;
    return {
      id: genId('cyber'),
      type: 'cyber_alert',
      title: `Cyber activity cluster: ${recent.length} incidents`,
      description: sev > 0 ? `${sev} high-severity cyber events detected.` : 'Multiple cyber incidents reported in short window.',
      confidence: Math.min(95, 60 + recent.length * 8 + sev * 5),
      timestamp: new Date().toISOString(),
      panelId: 'cyber-feed',
      metadata: { incidentCount: recent.length, highSeverity: sev },
    };
  }
  return null;
}

function detectInfrastructureRisk(signals: Signal[]): CorrelationSignal | null {
  const infra = signals.filter(s => s.category === 'infrastructure');
  const recent = infra.filter(s => new Date(s.timestamp).getTime() > Date.now() - 7200000);
  
  if (recent.length >= 2) {
    return {
      id: genId('infra'),
      type: 'infrastructure_risk',
      title: `Infrastructure risk: ${recent.length} events`,
      description: 'Multiple infrastructure-related incidents may indicate coordinated pressure.',
      confidence: Math.min(90, 55 + recent.length * 10),
      timestamp: new Date().toISOString(),
      panelId: 'cii-panel',
      metadata: { eventCount: recent.length },
    };
  }
  return null;
}

// --- Main handler ---
export async function GET() {
  try {
    // Fetch all relevant data in parallel
    const [signalsData, marketsData, predictionsData] = await Promise.all([
      fetchInternal('/api/signals'),
      fetchInternal('/api/markets'),
      fetchInternal('/api/predictions'),
    ]);

    const signals: Signal[] = signalsData?.signals || [];
    const markets: MarketData[] = marketsData?.markets || [];
    const predictions: PredictionMarket[] = predictionsData?.predictions || [];

    const detected: CorrelationSignal[] = [];

    // Run all detectors
    const results = [
      detectVelocitySpike(signals),
      detectKeywordSpike(signals),
      detectMilitarySurge(signals),
      detectConvergence(signals),
      detectGeoConvergence(signals),
      detectMarketNewsDivergence(signals, markets),
      detectPredictionLeadsNews(predictions, signals),
      detectSectorCascade(markets),
      detectCyberAlert(signals),
      detectInfrastructureRisk(signals),
    ];

    for (const r of results) {
      if (r && r.confidence >= 50) {
        detected.push(r);
      }
    }

    // Sort by confidence desc
    detected.sort((a, b) => b.confidence - a.confidence);

    // Limit to top 5
    const topSignals = detected.slice(0, 5);

    return NextResponse.json({ signals: topSignals, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[correlation-signals] Error:', error);
    return NextResponse.json({ signals: [], error: 'Failed to generate correlation signals' }, { status: 500 });
  }
}
