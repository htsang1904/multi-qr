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

  // Real-world API simulation
  const checkInUser = async (codeValue: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock logic: Fail if code contains 'fail', otherwise success
        const isSuccess = !codeValue.includes('fail');
        resolve(isSuccess);
      }, 2000); // Simulate network delay
    });
  };

  const handleCodesDetected = (barcodes: DetectedBarcode[]) => {
    const currentTime = Date.now();
    let hasUpdates = false;

    // Filter statuses to pass to the scanner for coloring
    // We only care about statuses relevant to the currently detected codes visual feedback
    // But actually, we pass the whole map is fine, or just the relevant ones.

    // Process each detected code
    barcodes.forEach(barcode => {
      const value = barcode.rawValue;
      const currentState = scanStates.current.get(value);

      // Business Logic:
      // 1. If never seen, process it.
      // 2. If error, retry after 5 seconds.
      // 3. If success or processing, ignore.

      let shouldProcess = false;

      if (!currentState) {
        shouldProcess = true;
      } else if (currentState.status === 'error' && currentTime - currentState.lastScanned > 5000) {
        shouldProcess = true; // Retry
      }

      if (shouldProcess) {
        // Mark as processing
        scanStates.current.set(value, { status: 'processing', lastScanned: currentTime });
        hasUpdates = true;

        // Call API
        checkInUser(value).then(success => {
          scanStates.current.set(value, {
            status: success ? 'success' : 'error',
            lastScanned: Date.now()
          });
          // Update UI when API returns
          setUiScanStates(new Map(scanStates.current));
        });
      }
    });

    if (hasUpdates) {
      setUiScanStates(new Map(scanStates.current));
    }
  };

  // Convert complex state to simple Map<string, status> for the component
  const getCodeStatuses = () => {
    const statusMap = new Map<string, ScanStatus>();
    uiScanStates.forEach((value, key) => {
      statusMap.set(key, value.status);
    });
    return statusMap;
  };

  return (
    <div className="App">
      <h1>Hội Nghi Check-in Demo</h1>

      <div className="scanner-container">
        <MultiQRScanner
          onCodesDetected={handleCodesDetected}
          codeStatuses={getCodeStatuses()}
          scanInterval={500} // Fast scanning
        />

        <div className="legend">
          <p>
            <span style={{ color: '#FFFF00', marginRight: '10px' }}>● Processing</span>
            <span style={{ color: '#00FF00', marginRight: '10px' }}>● Success</span>
            <span style={{ color: '#FF0000' }}>● Error</span>
          </p>
        </div>

        <div className="history-log">
          <h3>History Log ({uiScanStates.size})</h3>
          <ul style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left' }}>
            {Array.from(uiScanStates.entries()).reverse().map(([value, state]) => (
              <li key={value} style={{
                color: state.status === 'success' ? '#4caf50' : state.status === 'error' ? '#f44336' : '#ffeb3b',
                marginBottom: '4px'
              }}>
                [{state.status.toUpperCase()}] <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
