import { useRef, useState, useMemo, memo, useCallback } from 'react';
import './App.css';
import MultiQRScanner from './components/MultiQRScanner';
import type { DetectedBarcode, ScanStatus } from './components/MultiQRScanner';

// --- Sub-components (Memoized for Performance) ---

const MetricCard = memo(({ label, value, color }: { label: string, value: string | number, color?: string }) => (
  <div className="stat-box">
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={{ color }}>{value}</div>
  </div>
));

const CodeCatalog = memo(({ states, selectedId, onSelect }: {
  states: Map<string, ScanState>,
  selectedId: string | null,
  onSelect: (id: string) => void
}) => {
  const items = useMemo(() => Array.from(states.entries()).reverse(), [states]);

  if (items.length === 0) {
    return <div className="catalog-empty">NO DATA SESSIONS INITIALIZED</div>;
  }

  return (
    <div className="catalog-list">
      {items.map(([value, state]) => (
        <div
          key={value}
          className={`catalog-item ${selectedId === value ? 'active' : ''}`}
          onClick={() => onSelect(value)}
        >
          <div className="catalog-icon">{state.status === 'success' ? '✓' : '⋯'}</div>
          <div className="catalog-info">
            <span className="catalog-id">{value}</span>
            <div className="catalog-meta">
              {state.status.toUpperCase()} • {new Date(state.lastScanned).toLocaleTimeString([], { hour12: false })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

const PerformanceControl = memo(({ fps, setFps }: { fps: number, setFps: (v: number) => void }) => (
  <div className="sidebar-slider-box">
    <div className="slider-label">
      <span>MAX SCAN FPS</span>
      <span style={{ color: fps > 15 ? 'var(--studio-warning)' : 'inherit' }}>{fps} FPS</span>
    </div>
    <input
      type="range" min="1" max="25" step="1" value={fps}
      className="studio-slider"
      style={{ accentColor: fps > 15 ? 'var(--studio-warning)' : 'var(--studio-accent)' }}
      onChange={(e) => setFps(parseInt(e.target.value))}
    />
    <div className="slider-hints">
      <span>STABLE</span>
      <span>FLUID</span>
      <span>MAX</span>
    </div>
  </div>
));

// --- Main App Logic ---

interface ScanState {
  status: ScanStatus;
  lastScanned: number;
}

function App() {
  const scanStatesRef = useRef<Map<string, ScanState>>(new Map());
  const [uiScanStates, setUiScanStates] = useState<Map<string, ScanState>>(new Map());

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isScanning, setIsScanning] = useState(true);
  const [torch, setTorch] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [useROI, setUseROI] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ fps: 0, latency: 0 });
  const [activeCodes, setActiveCodes] = useState<DetectedBarcode[]>([]);
  const [fps, setFps] = useState(25);
  const [showCorners, setShowCorners] = useState(true);

  // Ultra-throttled states for UI
  const lastActiveCodesStr = useRef("");
  const lastMetricsUpdate = useRef(0);

  const handleCodesDetected = useCallback((barcodes: DetectedBarcode[]) => {
    // Only update activeCodes state if the content changed to avoid useless re-renders
    const codesStr = barcodes.map(b => b.rawValue).sort().join(",");
    if (codesStr !== lastActiveCodesStr.current) {
      lastActiveCodesStr.current = codesStr;
      setActiveCodes(barcodes);
    }

    if (!isScanning) return;

    const start = performance.now();
    let hasNewCodes = false;

    barcodes.forEach(barcode => {
      const value = barcode.rawValue;
      if (!scanStatesRef.current.has(value)) {
        scanStatesRef.current.set(value, { status: 'processing', lastScanned: Date.now() });
        hasNewCodes = true;

        setTimeout(() => {
          scanStatesRef.current.set(value, { status: 'success', lastScanned: Date.now() });
          setUiScanStates(new Map(scanStatesRef.current));
        }, 800);
      }
    });

    if (hasNewCodes) setUiScanStates(new Map(scanStatesRef.current));

    const now = performance.now();
    // Metrics every 1.5s is enough for monitoring without hurting performance
    if (now - lastMetricsUpdate.current > 1500) {
      lastMetricsUpdate.current = now;
      setMetrics({
        fps: Math.round(1000 / (now - start + 16)),
        latency: Math.round(now - start)
      });
    }
  }, [isScanning]);

  const statusMap = useMemo(() => {
    const map = new Map<string, ScanStatus>();
    uiScanStates.forEach((v, k) => map.set(k, v.status));
    return map;
  }, [uiScanStates]);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-badge">STUDIO</span>
          <h1>SCANNER ENGINE <span style={{ opacity: 0.4 }}>v4.2.0</span></h1>
        </div>
        <div className="engine-status">
          <div className="status-indicator">
            <div className={`dot ${isScanning ? 'active' : ''}`} />
            <span>{isScanning ? 'ENGINE RUNNING' : 'ENGINE STANDBY'}</span>
          </div>
        </div>
      </header>

      <main className="main-viewport">
        <div className="scanner-container">
          <MultiQRScanner
            onCodesDetected={handleCodesDetected}
            codeStatuses={statusMap}
            fps={fps}
            isEnabled={isScanning}
            showCorners={showCorners}
            facingMode={facingMode}
            torch={torch}
            onTorchAvailable={setIsTorchAvailable}
            scanRegion={useROI ? { x: 25, y: 25, width: 50, height: 50 } : undefined}
            title={useROI ? "PRECISION LOCK ACTIVE" : "WIDE SPECTRUM SCAN"}
          >
            {/* HUD badges are now rendered directly on Canvas by MultiQRScanner for 60FPS performance */}
          </MultiQRScanner>
        </div>
      </main>

      <aside className="studio-sidebar">
        <section className="sidebar-section">
          <h3>Hardware Diagnostics</h3>
          <div className="stats-grid">
            <MetricCard label="ENGINE FPS" value={isScanning ? metrics.fps : '--'} color={metrics.fps > 15 ? 'var(--studio-success)' : ''} />
            <MetricCard label="LATENCY" value={isScanning ? `${metrics.latency}ms` : '--'} />
            <MetricCard label="TORCH HW" value={isTorchAvailable ? 'AVAIL' : 'N/A'} color={isTorchAvailable ? 'var(--studio-success)' : 'var(--studio-error)'} />
            <MetricCard label="ACTIVE" value={activeCodes.length} />
          </div>
          <PerformanceControl fps={fps} setFps={setFps} />
        </section>

        <section className="sidebar-section catalog-section">
          <h3>Code Catalog ({uiScanStates.size})</h3>
          <CodeCatalog states={uiScanStates} selectedId={selectedCode} onSelect={setSelectedCode} />
        </section>

        <section className="sidebar-section reset-section">
          <button className="btn-action full-width" onClick={() => { scanStatesRef.current.clear(); setUiScanStates(new Map()); setSelectedCode(null); }}>
            RESET SCAN STUDIO
          </button>
        </section>
      </aside>

      <footer className="bottom-toolbar">
        <div className="btn-group">
          <button className={`btn-studio ${isScanning ? 'active' : ''}`} onClick={() => setIsScanning(true)}>INIT</button>
          <button className={`btn-studio ${!isScanning ? 'active' : ''}`} onClick={() => setIsScanning(false)}>HALT</button>
        </div>
        <div className="btn-group">
          <button className={`btn-studio ${facingMode === 'environment' ? 'active' : ''}`} onClick={() => setFacingMode('environment')}>REAR</button>
          <button className={`btn-studio ${facingMode === 'user' ? 'active' : ''}`} onClick={() => setFacingMode('user')}>FRONT</button>
        </div>
        <button disabled={!isTorchAvailable} className={`btn-studio ${torch ? 'active' : ''} border-btn`} onClick={() => setTorch(!torch)}>
          TORCH {torch ? 'ON' : 'OFF'}
        </button>
        <button className={`btn-studio ${useROI ? 'active' : ''} border-btn`} onClick={() => setUseROI(!useROI)}>
          ROI: {useROI ? 'LOCKED' : 'WIDE'}
        </button>
        <button className={`btn-studio ${showCorners ? 'active' : ''} border-btn`} onClick={() => setShowCorners(!showCorners)}>
          CORNERS: {showCorners ? 'ON' : 'OFF'}
        </button>
      </footer>
    </div>
  );
}

export default App;
