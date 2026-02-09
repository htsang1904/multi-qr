# 🚀 Multi QR Scanner Pro

[![NPM Version](https://img.shields.io/npm/v/multi-qr-scanner-poc?style=flat-square&color=3366cc)](https://www.npmjs.com/package/multi-qr-scanner-poc)
[![NPM Downloads](https://img.shields.io/npm/dm/multi-qr-scanner-poc?style=flat-square&color=50abf1)](https://www.npmjs.com/package/multi-qr-scanner-poc)
[![License](https://img.shields.io/npm/l/multi-qr-scanner-poc?style=flat-square)](https://github.com/htsang1904/multi-qr/blob/main/LICENSE)
[![Types](https://img.shields.io/npm/types/multi-qr-scanner-poc?style=flat-square)](https://www.npmjs.com/package/multi-qr-scanner-poc)

A high-performance, **industrial-grade** React library for simultaneous multi-barcode detection. Built on top of the native **Barcode Detection API** with intelligent WASM polyfills, it offers a **headless architecture** that gives you 100% control over your UI.

---

## 🔥 Key Strengths

*   **⚡ Zero-Lag Engine**: Canvas-based HUD rendering eliminates DOM overhead for 60FPS fluid tracking.
*   **📡 HD Distance Scanning**: Restored 720p resolution for superior long-range QR detection.
*   **🔄 Stabilized Lifecycle**: Bulletproof hook logic prevents engine restarts during React re-renders.
*   **🎯 Multi-Target Precision**: Track 15+ QR codes in a single frame without jitter.
*   **🏗️ Headless Architecture**: Use our core logic via `useMultiQRScanner` and build whatever UI you imagine.
*   **🕯️ Hardware-First**: Programmatic control over **Torch (Flash)** and real-time hardware status detection.
*   **📏 Region of Interest (ROI)**: Restrict scanning to specific viewport zones to boost performance and filter unwanted codes.
*   **🍎 Universal Compatibility**: Seamless fallback to `@undecaf/barcode-detector-polyfill` for iOS and Safari.

---

## 📦 Installation

```bash
npm install multi-qr-scanner-poc
```

---

## 🚀 Quick Start (Component Mode)

The fastest way to get a scan-ready interface with built-in status overlays.

```tsx
import MultiQRScanner from 'multi-qr-scanner-poc';

function App() {
  const handleDetected = (codes) => {
    codes.forEach(code => console.log('Found:', code.rawValue));
  };

  return (
    <div style={{ height: '500px' }}>
      <MultiQRScanner
        onCodesDetected={handleDetected}
        scanInterval={200}
        showCorners={true}
        title="SCANNING ACTIVE"
      />
    </div>
  );
}
```

---

## 🛠️ Advanced Usage (Headless Hook)

This is the recommended way for professional applications. You get the data, you build the UI.

```tsx
import { useMultiQRScanner } from 'multi-qr-scanner-poc';

function ProfessionalScanner() {
  const { 
    videoRef, 
    activeCodes, 
    isTorchAvailable, 
    toggleTorch 
  } = useMultiQRScanner({
    scanInterval: 150,
    facingMode: 'environment'
  });

  return (
    <div className="relative overflow-hidden rounded-xl">
      <video ref={videoRef} className="w-full h-full object-cover" />
      
      {/* Absolute Overlay Layer */}
      {activeCodes.map((code) => (
        <div 
          key={code.rawValue}
          className="absolute border-2 border-green-500 rounded p-1 text-white text-[10px]"
          style={{
            left: `${(code.boundingBox.x / 1280) * 100}%`,
            top: `${(code.boundingBox.y / 720) * 100}%`
          }}
        >
          {code.rawValue.substring(0, 8)}...
        </div>
      ))}
      
      {isTorchAvailable && (
        <button onClick={toggleTorch} className="absolute bottom-4 right-4 bg-white p-2">
          Toggle Flash
        </button>
      )}
    </div>
  );
}
```

---

## 📖 API Reference

### `MultiQRScanner` Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `onCodesDetected` | `(codes: DetectedBarcode[]) => void` | **Required** | Real-time discovery callback. |
| `scanInterval` | `number` | `600` | MS between detection cycles. Lower = Faster discovery. |
| `facingMode` | `'user' \| 'environment'` | `'environment'` | Control front or rear camera. |
| `torch` | `boolean` | `false` | Turn on/off device flash (if available). |
| `scanRegion` | `{x, y, btnWidth, height}` | `undefined` | Define a % based Region of Interest (0-100). |
| `codeStatuses` | `Map<string, ScanStatus>` | `new Map()` | Map of values to status (`'processing' \| 'success' \| 'error'`). |
| `renderDetectedCode` | `(code: DetectedBarcode) => ReactNode` | `undefined` | Custom label renderer for DOM-based overlays. |
| `showCorners` | `boolean` | `true` | Show/hide the high-fidelity laser scanning frame. |
| `fps` | `number` | `25` | Frames per second for the detection engine (1-30). |

### `ScanStatus` Types
- `processing`: Yellow border. Useful for "Checking database..." states.
- `success`: Green border. For confirmed scans.
- `error`: Red border. For invalid codes.

---

## ⚡ Performance Optimization (FPS Control)

The library provides a native `fps` prop to prevent device lag. Adjust this based on your target device's power.

- **Fastest (20 - 30 FPS)**: Ultra-fluid, best for industrial multi-scan (High CPU).
- **Stable (10 - 15 FPS)**: Recommended for most consumer-facing apps.
- **Eco (1 - 5 FPS)**: Best for battery saving or static scanning.

```tsx
<MultiQRScanner 
  fps={10} // Optimal balance
/>
```

---

## 📱 Hardware & Browser Support

- **Android / Chrome / Edge / Electron**: Native hardware acceleration (near-instant).
- **iOS / iPadOS / MacOS Safari**: Automated WASM polyfill (High performance).
- **Security requirement**: Camera access requires an **HTTPS** context (except `localhost`).

---

## 🤝 Contributing

We welcome professional contributions. Please feel free to open issues or submit pull requests.

## 📜 License

MIT © [htsang1904](https://github.com/htsang1904)
