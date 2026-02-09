import { useRef, useState } from 'react';
import './App.css';
import MultiQRScanner from './components/MultiQRScanner';
import type { DetectedBarcode, ScanStatus } from './components/MultiQRScanner';

// Define state interface for the app logic
interface ScanState {
  status: ScanStatus;
  lastScanned: number;
}

function App() {
  // Store the state of ALL scanned codes
  const scanStates = useRef<Map<string, ScanState>>(new Map());
  // State to trigger UI updates (since Map ref doesn't trigger re-render)
  const [uiScanStates, setUiScanStates] = useState<Map<string, ScanState>>(new Map());

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isScanning, setIsScanning] = useState(true);
  const [torch, setTorch] = useState(false);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [useROI, setUseROI] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ fps: 0, latency: 0 });
  const [activeCodes, setActiveCodes] = useState<DetectedBarcode[]>([]);

  // High performance callback
  const handleCodesDetected = (barcodes: DetectedBarcode[]) => {
    setActiveCodes(barcodes);
    if (!isScanning) return;

    const start = performance.now();
    let hasUpdates = false;

    barcodes.forEach(barcode => {
      const value = barcode.rawValue;
      if (!scanStates.current.has(value)) {
        scanStates.current.set(value, { status: 'processing', lastScanned: Date.now() });
        hasUpdates = true;

        // Simulate ultra-fast industrial verify
        setTimeout(() => {
          scanStates.current.set(value, { status: 'success', lastScanned: Date.now() });
          setUiScanStates(new Map(scanStates.current));
        }, 800);
      }
    });

    if (hasUpdates) setUiScanStates(new Map(scanStates.current));

    // Update metrics
    setMetrics({
      fps: Math.round(1000 / (performance.now() - start + 16)), // Estimate
      latency: Math.round(performance.now() - start)
    });
  };

  const getCodeStatuses = () => {
    const statusMap = new Map<string, ScanStatus>();
    uiScanStates.forEach((value, key) => statusMap.set(key, value.status));
    return statusMap;
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-badge">STUDIO</span>
          <h1>SCANNER ENGINE <span style={{ opacity: 0.4 }}>v4.0.0</span></h1>
        </div>
        <div className="engine-status">
          <div className="status-indicator">
            <div className={`dot ${isScanning ? 'active' : ''}`} />
            <span>{isScanning ? 'ENGINE RUNNING' : 'ENGINE STANDBY'}</span>
          </div>
          <div className="status-indicator" style={{ borderLeft: '1px solid var(--studio-border)', paddingLeft: '16px' }}>
            <span style={{ color: '#aaa' }}>REGION:</span>
            <span style={{ color: useROI ? 'var(--studio-accent)' : '#666' }}>{useROI ? 'LOCKED' : 'WIDE'}</span>
          </div>
        </div>
      </header>

      <main className="main-viewport">
        <div className="scanner-container">
          <MultiQRScanner
            onCodesDetected={handleCodesDetected}
            codeStatuses={getCodeStatuses()}
            scanInterval={150} // Industrial speed
            isEnabled={isScanning}
            showCorners={!useROI}
            facingMode={facingMode}
            torch={torch}
            onTorchAvailable={setIsTorchAvailable}
            scanRegion={useROI ? { x: 25, y: 25, width: 50, height: 50 } : undefined}
            title={useROI ? "PRECISION LOCK ACTIVE" : "WIDE SPECTRUM SCAN"}
            overlayColor={useROI ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.3)"}
          >
            {/* Interactive Live Badges */}
            {activeCodes.map((code, index) => {
              const status = scanStates.current.get(code.rawValue)?.status || 'pending';
              const isSelected = selectedCode === code.rawValue;
              return (
                <div
                  key={`${code.rawValue}-${index}`}
                  className={`live-badge ${status} ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${(code.boundingBox.x + code.boundingBox.width / 2) / 1280 * 100}%`,
                    top: `${(code.boundingBox.y) / 720 * 100}%`
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCode(code.rawValue);
                  }}
                >
                  <div className="badge-wrapper">
                    <span style={{ fontSize: '8px', opacity: 0.5 }}>#</span>
                    <span>{code.rawValue.substring(0, 8)}</span>
                    {status === 'success' && <span style={{ color: 'var(--studio-success)' }}>●</span>}
                  </div>
                </div>
              );
            })}

            {/* ROI Visual Assistance */}
            {useROI && (
              <div className="roi-target" style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%' }}>
                <div className="roi-label">Precision Target Area</div>
              </div>
            )}
          </MultiQRScanner>
        </div>
      </main>

      <aside className="studio-sidebar">
        <section className="sidebar-section">
          <h3>Hardware Diagnostics</h3>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">DETECTION FPS</div>
              <div className="stat-value" style={{ color: metrics.fps > 20 ? 'var(--studio-success)' : 'inherit' }}>
                {isScanning ? metrics.fps : '--'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">LATENCY</div>
              <div className="stat-value">
                {isScanning ? `${metrics.latency}ms` : '--'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">TORCH HW</div>
              <div className="stat-value" style={{ color: isTorchAvailable ? 'var(--studio-success)' : 'var(--studio-error)' }}>
                {isTorchAvailable ? 'AVAIL' : 'N/A'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">ACTIVE CODES</div>
              <div className="stat-value">{activeCodes.length}</div>
            </div>
          </div>
        </section>

        <section className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ padding: '1.25rem 1.25rem 0' }}>
            <h3>Code Catalog ({uiScanStates.size})</h3>
          </div>
          <div className="catalog-list">
            {uiScanStates.size === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--studio-text-muted)', fontSize: '11px' }}>
                NO DATA SESSIONS INITIALIZED
              </div>
            )}
            {Array.from(uiScanStates.entries()).reverse().map(([value, state]) => (
              <div
                key={value}
                className={`catalog-item ${selectedCode === value ? 'active' : ''}`}
                onClick={() => setSelectedCode(value)}
              >
                <div className="catalog-icon">
                  {state.status === 'success' ? '✓' : '⋯'}
                </div>
                <div className="catalog-info">
                  <span className="catalog-id">{value}</span>
                  <div className="catalog-meta">
                    {state.status.toUpperCase()} • {new Date(state.lastScanned).toLocaleTimeString([], { hour12: false })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sidebar-section" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <button
            className="btn-action"
            style={{ width: '100%', padding: '10px' }}
            onClick={() => {
              scanStates.current.clear();
              setUiScanStates(new Map());
              setSelectedCode(null);
            }}
          >
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
          <button
            className={`btn-studio ${facingMode === 'environment' ? 'active' : ''}`}
            onClick={() => setFacingMode('environment')}
          > REAR </button>
          <button
            className={`btn-studio ${facingMode === 'user' ? 'active' : ''}`}
            onClick={() => setFacingMode('user')}
          > FRONT </button>
        </div>

        <button
          disabled={!isTorchAvailable}
          className={`btn-studio ${torch ? 'active' : ''}`}
          style={{ borderRadius: '8px', border: '1px solid var(--studio-border)' }}
          onClick={() => setTorch(!torch)}
        >
          TORCH {torch ? 'ON' : 'OFF'}
        </button>

        <button
          className={`btn-studio ${useROI ? 'active' : ''}`}
          style={{ borderRadius: '8px', border: '1px solid var(--studio-border)' }}
          onClick={() => setUseROI(!useROI)}
        >
          DETECTION ROI: {useROI ? 'LOCKED' : 'WIDE'}
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: '10px', color: 'var(--studio-text-muted)', fontFamily: 'var(--font-mono)' }}>
          COORD_MODE: RELATIVE_VIEWPORT
        </div>
      </footer>
    </div>
  );
}

export default App;
