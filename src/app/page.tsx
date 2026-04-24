'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Header, { useTheme } from '@/components/Header';
import SignalFeed from '@/components/SignalFeed';
import WorldMap from '@/components/WorldMap';
import MarketTicker from '@/components/MarketTicker';
import PredictionPanel from '@/components/PredictionPanel';
import TrackingPanel from '@/components/TrackingPanel';
import TradingChart from '@/components/TradingChart';
import MobileNav from '@/components/MobileNav';
import StatsBar from '@/components/StatsBar';
import SituationBrief from '@/components/SituationBrief';
import DefconIndicator from '@/components/DefconIndicator';
import TwitterFeed from '@/components/TwitterFeed';
import MilitaryTracker from '@/components/MilitaryTracker';
import LiveVideoPanel from '@/components/LiveVideoPanel';
import LiveWebcams from '@/components/LiveWebcams';
import CountryRiskPanel from '@/components/CountryRiskPanel';
import AIInsights from '@/components/AIInsights';
import AttackTimeline from '@/components/AttackTimeline';
import MultiPredictions from '@/components/MultiPredictions';
import NewsChannels from '@/components/NewsChannels';
import FlightRadar from '@/components/FlightRadar';
import SearchBar from '@/components/SearchBar';
import CyberFeed from '@/components/CyberFeed';
import HotspotStreams from '@/components/HotspotStreams';
import MapStreams from '@/components/MapStreams';
import RiskDashboard from '@/components/RiskDashboard';
import SentimentMeter from '@/components/SentimentMeter';
import { useLanguage } from '@/components/LanguageSelector';
import CommandPalette from '@/components/CommandPalette';
import BreakingNewsBanner from '@/components/BreakingNewsBanner';
import TVMode from '@/components/TVMode';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import PushNotificationToggle from '@/components/PushNotificationToggle';
import MultiStreamLayout from '@/components/MultiStreamLayout';
import OfflineIndicator from '@/components/OfflineIndicator';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import SignalBanner from '@/components/SignalBanner';
import GlobalSituationBar from '@/components/GlobalSituationBar';
import TimeRangeSelector from '@/components/TimeRangeSelector';
import RegionSelector, { REGIONS } from '@/components/RegionSelector';
import CategoryFilterBar from '@/components/CategoryFilterBar';
import MapControls from '@/components/MapControls';
import MapLegend from '@/components/MapLegend';
import LiveNewsTicker from '@/components/LiveNewsTicker';
import EnhancedLayerPanel from '@/components/EnhancedLayerPanel';
import { Globe, Map as MapIcon } from 'lucide-react';
import { Signal, MarketData, PredictionMarket, ThreatLevel } from '@/types';
import { getThreatLevelFromSignals } from '@/lib/classify';
import { ACTIVE_CONFLICTS } from '@/lib/feeds';

// Dynamic imports for heavy components
const WarRoom = dynamic(() => import('@/components/WarRoom'), { 
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center bg-void"><div className="text-accent-green animate-pulse font-mono">Loading War Room...</div></div>
});

const CustomDashboard = dynamic(() => import('@/components/CustomDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-void">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-3" />
        <div className="text-accent-green text-xs font-mono animate-pulse">Loading Dashboard...</div>
      </div>
    </div>
  )
});

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  
  return data;
};

function playAlertSound() {
  if (typeof window !== 'undefined' && 'AudioContext' in window) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }
}

type ViewMode = 'dashboard' | 'warroom';
type MobileView = 'feed' | 'map' | 'markets' | 'tracking';
type MapMode = '2d' | '3d';

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [mapMode, setMapMode] = useState<MapMode>('3d');
  const [activeLayers, setActiveLayers] = useState([
    'flights', 'routes', 'conflicts', 'military', 'chokepoints', 'earthquakes', 
    'nuclear', 'spaceports', 'iran', 'cables', 'pipelines', 
    'ai-centers', 'fires', 'gps-jamming', 'outages', 'cyber', 
    'weather', 'displacement', 'clusters'
  ]);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [region, setRegion] = useState('global');
  const [mapPinned, setMapPinned] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [prevCriticalCount, setPrevCriticalCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('feed');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  const [multiStreamOpen, setMultiStreamOpen] = useState(false);
  
  // Push notifications
  const { supported: pushSupported, permission: pushPermission, requestPermission: requestPushPermission, notifyCritical } = usePushNotifications();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  
  // Multi-language support
  const { language, changeLanguage, isRTL } = useLanguage();

  // Theme toggle
  const { isDark, toggle: toggleTheme, autoTheme, toggleAuto: toggleAutoTheme } = useTheme();

  useEffect(() => { setIsClient(true); }, []);

  // Push notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPushEnabled(pushPermission === 'granted');
    }
  }, [pushPermission]);

  // Command Palette shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fetch data
  const { data: signalsData, isLoading: signalsLoading, isValidating: signalsValidating } = useSWR<{ signals: Signal[] }>(
    '/api/signals', fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true, revalidateOnReconnect: true, keepPreviousData: true, dedupingInterval: 30000 }
  );

  const { data: marketsData, isLoading: marketsLoading, isValidating: marketsValidating } = useSWR<{ markets: MarketData[] }>(
    '/api/markets', fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  const { data: predictionsData, isLoading: predictionsLoading } = useSWR<{ predictions: PredictionMarket[] }>(
    '/api/predictions', fetcher,
    { refreshInterval: 60000 }
  );

  const { data: earthquakesData } = useSWR<{ earthquakes: any[] }>(
    '/api/earthquakes', fetcher,
    { refreshInterval: 120000 }
  );

  const { data: conflictsData } = useSWR<{ conflicts: any[] }>(
    '/api/conflicts', fetcher,
    { refreshInterval: 300000 } // 5 minutes
  );

  useEffect(() => {
    if (signalsData || marketsData || predictionsData) setLastUpdate(new Date());
  }, [signalsData, marketsData, predictionsData]);

  const signals = signalsData?.signals || [];
  const markets = marketsData?.markets || [];
  const predictions = predictionsData?.predictions || [];
  const earthquakes = earthquakesData?.earthquakes || [];
  const conflicts = conflictsData?.conflicts || [];

  // Filter signals by category
  const filteredSignals = categoryFilters.length > 0
    ? signals.filter(s => categoryFilters.some(cat => s.category?.toLowerCase().includes(cat.toLowerCase())))
    : signals;

  const threatLevel: ThreatLevel = getThreatLevelFromSignals(signals);
  const breakingNews = signals.find(s => s.severity === 'CRITICAL')?.title;

  const criticalCount = signals.filter(s => s.severity === 'CRITICAL').length;
  const highCount = signals.filter(s => s.severity === 'HIGH').length;
  const militaryCount = signals.filter(s => s.category === 'military').length;

  useEffect(() => {
    if (soundEnabled && criticalCount > prevCriticalCount && prevCriticalCount > 0) playAlertSound();
    setPrevCriticalCount(criticalCount);
  }, [criticalCount, soundEnabled, prevCriticalCount]);

  // Push notifications for critical events
  useEffect(() => {
    if (pushEnabled && criticalCount > 0) {
      const latestCritical = signals.find(s => s.severity === 'CRITICAL');
      notifyCritical(criticalCount, latestCritical?.title);
    }
  }, [criticalCount, pushEnabled, signals, notifyCritical]);

  const handleLayerToggle = useCallback((layer: string) => {
    setActiveLayers(prev => prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]);
  }, []);

  const handleCategoryToggle = useCallback((category: string) => {
    setCategoryFilters(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  }, []);

  const handleRegionChange = useCallback((regionId: string, regionData: typeof REGIONS[0]) => {
    setRegion(regionId);
  }, []);

  const handleMapFullscreen = useCallback(() => {
    const mapEl = document.getElementById('world-map-container');
    if (mapEl) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mapEl.requestFullscreen();
      }
    }
  }, []);

  const handleSignalClick = useCallback((signal: Signal) => {
    if (signal.sourceUrl) window.open(signal.sourceUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const handlePushToggle = useCallback(async () => {
    if (!pushEnabled) {
      const granted = await requestPushPermission();
      setPushEnabled(granted);
    } else {
      setPushEnabled(false);
    }
  }, [pushEnabled, requestPushPermission]);

  const speakBrief = useCallback(async () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setTtsSpeaking(false);
      return;
    }
    try {
      const res = await fetch("/api/brief");
      const data = await res.json();
      const brief = data?.brief;
      let text = "";
      if (brief && typeof brief === "object") {
        const parts: string[] = [];
        if (brief.headline) parts.push(brief.headline);
        if (brief.summary) parts.push(brief.summary);
        if (Array.isArray(brief.watchList) && brief.watchList.length) {
          parts.push("Watch list: " + brief.watchList.join(". "));
        }
        if (brief.marketImplications) parts.push("Market implications: " + brief.marketImplications);
        if (brief.nextHours) parts.push("Next hours: " + brief.nextHours);
        text = parts.join(". ");
      } else {
        text = data?.text || "";
      }
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setTtsSpeaking(true);
      utterance.onend = () => setTtsSpeaking(false);
      utterance.onerror = () => setTtsSpeaking(false);
      synth.speak(utterance);
    } catch {
      // ignore
    }
  }, []);

  // System time
  if (!isClient) {
    return (
      <div className="h-screen flex flex-col bg-void overflow-hidden">
        <header className="bg-elevated border-b border-border-default px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-green/30 to-accent-blue/20 flex items-center justify-center border border-accent-green/30">
              <span className="text-accent-green text-xl">🌐</span>
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold tracking-wider text-accent-green">GLOBENEWS <span className="px-1.5 py-0.5 bg-accent-red/20 text-[8px] rounded border border-accent-red/30 text-accent-red animate-pulse">LIVE</span></h1>
              <p className="text-[9px] text-text-muted">Real-time global intelligence</p>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center bg-void">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4" />
            <div className="text-accent-green text-sm font-mono animate-pulse">Initializing GlobeNews Live...</div>
            <div className="text-text-muted text-[10px] mt-2 font-mono">Loading 60+ intelligence sources</div>
          </div>
        </main>
      </div>
    );
  }

  // War Room View
  if (viewMode === 'warroom') {
    return (
      <div className="h-screen flex flex-col bg-void">
        {/* Mode Toggle */}
        <div className="bg-void border-b border-border-default px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('dashboard')}
              className="px-3 py-1 rounded text-[10px] font-mono text-text-dim hover:text-white"
            >
              📊 DASHBOARD
            </button>
            <button
              onClick={() => setViewMode('warroom')}
              className="px-3 py-1 rounded text-[10px] font-mono bg-accent-red/20 text-accent-red"
            >
              ⚔️ WAR ROOM
            </button>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono ${soundEnabled ? 'bg-accent-green/20 text-accent-green' : 'bg-elevated text-text-dim'}`}
          >
            {soundEnabled ? '🔔' : '🔕'} ALERTS
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <WarRoom signals={signals} conflicts={conflicts} />
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className={`h-screen flex flex-col bg-void overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        signals={signals.map(s => ({ title: s.title, country: undefined, severity: s.severity }))}
        onNavigate={(view) => { if (view === 'warroom') setViewMode('warroom'); else setViewMode('dashboard'); }}
        onToggleLayer={handleLayerToggle}
      />

      {/* TV Mode */}
      <TVMode isActive={tvMode} onExit={() => setTvMode(false)} />

      {/* Global Signal Banner */}
      <SignalBanner />

      {/* Breaking News Banner */}
      <BreakingNewsBanner signals={signals} />

      {/* Mode Toggle - Desktop */}
      <div className="hidden lg:flex bg-void border-b border-border-default px-4 py-1.5 items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('dashboard')}
            className="px-3 py-1 rounded text-[10px] font-mono bg-accent-green/20 text-accent-green"
          >
            📊 DASHBOARD
          </button>
          <button
            onClick={() => setViewMode('warroom')}
            className="px-3 py-1 rounded text-[10px] font-mono text-text-dim hover:text-white hover:bg-white/5"
          >
            ⚔️ WAR ROOM
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={() => setMapMode(mapMode === '2d' ? '3d' : '2d')}
            className="px-3 py-1 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            {mapMode === '2d' ? <Globe size={12} /> : <MapIcon size={12} />}
            {mapMode === '2d' ? '3D GLOBE' : '2D MAP'}
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={() => setTvMode(true)}
            className="px-3 py-1 rounded text-[10px] font-mono text-text-dim hover:text-white hover:bg-white/5"
          >
            📺 TV MODE
          </button>
          <button
            onClick={() => setMultiStreamOpen(true)}
            className="px-3 py-1 rounded text-[10px] font-mono text-text-dim hover:text-white hover:bg-white/5"
          >
            🎥 MULTI-STREAM
          </button>
        </div>
        <div className="flex items-center gap-3">
          <RegionSelector selected={region} onChange={handleRegionChange} />
          <TimeRangeSelector selected={timeFilter} onChange={setTimeFilter} />
          <EnhancedLayerPanel activeLayers={activeLayers} onLayerToggle={handleLayerToggle} />
          <MapControls
            onFullscreen={handleMapFullscreen}
            onPinToTop={() => setMapPinned(!mapPinned)}
            isPinned={mapPinned}
          />
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded text-[10px] font-mono text-text-dim hover:text-white border border-border-subtle hover:border-accent-green/30 transition-colors"
          >
            <span>⌘K</span>
            <span className="hidden xl:inline">Search</span>
          </button>
          <SearchBar signals={signals} />
          <span className="text-[9px] text-text-dim font-mono hidden xl:inline">{signals.length} signals</span>
          <PushNotificationToggle 
            enabled={pushEnabled} 
            onToggle={handlePushToggle} 
            supported={pushSupported} 
          />
          <button
            onClick={speakBrief}
            title="Read brief aloud"
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono ${ttsSpeaking ? 'bg-accent-orange/20 text-accent-orange animate-pulse' : 'bg-elevated text-text-dim hover:text-white'}`}
          >
            {ttsSpeaking ? '🔊 SPEAKING' : '🔊 READ BRIEF'}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono ${soundEnabled ? 'bg-accent-green/20 text-accent-green' : 'bg-elevated text-text-dim'}`}
          >
            {soundEnabled ? '🔔' : '🔕'} ALERTS
          </button>
        </div>
      </div>

      {/* Global Situation Bar */}
      <div className="hidden lg:block">
        <GlobalSituationBar />
      </div>

      <Header 
        threatLevel={threatLevel}
        breakingNews={breakingNews}
        lastUpdate={lastUpdate}
        signalCount={signals.length}
        criticalCount={criticalCount}
        language={language}
        onLanguageChange={changeLanguage}
        isDark={isDark}
        onThemeToggle={toggleTheme}
        autoTheme={autoTheme}
        onToggleAutoTheme={toggleAutoTheme}
      />

      {/* Category Filter Bar */}
      <div className="hidden lg:flex bg-[#0a0a0f] border-b border-white/5 px-4 py-2 items-center justify-between">
        <CategoryFilterBar
          selected={categoryFilters}
          onToggle={handleCategoryToggle}
        />
        <MapLegend compact />
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Multi-Stream Layout Overlay */}
      {multiStreamOpen && <MultiStreamLayout onClose={() => setMultiStreamOpen(false)} />}

      {/* Desktop Layout — Custom Dashboard with drag-and-drop */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <CustomDashboard
          signals={filteredSignals}
          markets={markets}
          earthquakes={earthquakes}
          conflicts={conflicts}
          signalsLoading={signalsLoading || signalsValidating}
          marketsLoading={marketsLoading || marketsValidating}
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
          onSignalClick={handleSignalClick}
          mapPinned={mapPinned}
          mapMode={mapMode}
        />
      </div>

      {/* Mobile Layout */}
      <main className="lg:hidden flex-1 overflow-hidden pb-16">
        {mobileView === 'feed' && <SignalFeed signals={signals} loading={signalsLoading || signalsValidating} onSignalClick={handleSignalClick} />}
        {mobileView === 'map' && <div id="world-map-container" className="h-full p-2"><WorldMap signals={signals} activeLayers={activeLayers} onLayerToggle={handleLayerToggle} earthquakes={earthquakes} /></div>}
        {mobileView === 'markets' && (
          <div className="h-full overflow-y-auto p-2 space-y-2">
            <SituationBrief />
            <TradingChart symbol="XAUUSD" height={250} />
            <MarketTicker markets={markets} loading={marketsLoading || marketsValidating} />
            <PredictionPanel predictions={predictions} loading={predictionsLoading} />
          </div>
        )}
        {mobileView === 'tracking' && (
          <div className="h-full overflow-y-auto p-2 space-y-2">
            <DefconIndicator />
            <MilitaryTracker />
            <TrackingPanel earthquakes={earthquakes} />
            <TwitterFeed />
            <div className="glass-panel">
              <div className="px-3 py-2 border-b border-border-subtle bg-panel/50">
                <span className="font-mono text-[11px] font-bold text-accent-red">🔥 HOTSPOTS</span>
              </div>
              <div className="p-2 space-y-1">
                {ACTIVE_CONFLICTS.map(c => (
                  <div key={c.name} className="flex items-center justify-between px-2 py-1.5 bg-elevated/50 rounded">
                    <span className="text-[10px] text-white">{c.name}</span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${c.intensity === 'high' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-orange/20 text-accent-orange'}`}>
                      {c.intensity.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <MobileNav activeView={mobileView} onViewChange={setMobileView} criticalCount={criticalCount} />

      <div className="hidden lg:block">
        <LiveNewsTicker signals={signals} />
        <StatsBar activeConflicts={ACTIVE_CONFLICTS.length} militaryAlerts={militaryCount} highSeverity={highCount} criticalSeverity={criticalCount} timeFilter={timeFilter} onTimeFilterChange={setTimeFilter} />
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
