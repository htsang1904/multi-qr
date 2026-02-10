# 🚀 Multi QR Scanner Pro

[![NPM Version](https://img.shields.io/npm/v/multi-qr-scanner-poc?style=flat-square&color=3366cc)](https://www.npmjs.com/package/multi-qr-scanner-poc)
[![NPM Downloads](https://img.shields.io/npm/dm/multi-qr-scanner-poc?style=flat-square&color=50abf1)](https://www.npmjs.com/package/multi-qr-scanner-poc)
[![License](https://img.shields.io/npm/l/multi-qr-scanner-poc?style=flat-square)](https://github.com/htsang1904/multi-qr/blob/main/LICENSE)
[![Types](https://img.shields.io/npm/types/multi-qr-scanner-poc?style=flat-square)](https://www.npmjs.com/package/multi-qr-scanner-poc)

A high-performance, **industrial-grade** React library for simultaneous multi-barcode detection. Built on top of the native **Barcode Detection API** with intelligent WASM polyfills, it offers a **headless architecture** that gives you 100% control over your UI.

> **New in v1.0.5**: Enhanced WASM/Polyfill loading logic. Added auto-fallback to CDN for decoding assets to ensure reliability across different project environments. Improved detection loop stability.

---

## 🔥 Key Strengths

*   **⚡ Zero-Lag Engine**: Canvas-based HUD rendering eliminates DOM overhead for 60FPS fluid tracking.
*   **🔋 Zero-Leak Cleanup**: Reliable stream termination using Ref-based tracking and `isCancelled` guard flags.
*   **📡 HD Distance Scanning**: Restored 720p resolution for superior long-range QR detection.
*   **🔄 Stabilized Lifecycle**: Bulletproof hook logic prevents engine restarts during React re-renders.
*   **🎯 Multi-Target Precision**: Track 10+ QR codes in a single frame without jitter.
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

The fastest way to get a scan-ready interface with built-in status overlays and laser-grid UI.

```tsx
import MultiQRScanner from 'multi-qr-scanner-poc';
import { useState } from 'react';

function App() {
  const [codeStatuses, setCodeStatuses] = useState(new Map());

  const handleDetected = (codes) => {
    codes.forEach(code => {
      console.log('Found:', code.rawValue);
      // Optional: Set status to 'processing' while calling your API
      // setCodeStatuses(prev => new Map(prev).set(code.rawValue, 'processing'));
    });
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MultiQRScanner
        onCodesDetected={handleDetected}
        codeStatuses={codeStatuses} // Optional: Tracks 'success'/'error' colors
        fps={15}                    // Optional: Control CPU usage
        isEnabled={true}            // Optional: Toggle engine on/off
        facingMode="environment"    // Optional: 'user' or 'environment'
      />
    </div>
  );
}
```

---

## 🛠️ Advanced Usage (Headless Hook)

Use our core engine logic via `useMultiQRScanner` and build your own custom UI. No overlays, just raw data.

```tsx
import { useMultiQRScanner } from 'multi-qr-scanner-poc';

function CustomScanner() {
  const { 
    videoRef, 
    isTorchAvailable, 
    isTorchOn,
    toggleTorch,
    error 
  } = useMultiQRScanner({
    isEnabled: true,
    scanInterval: 150,
    facingMode: 'environment',
    onCodesDetected: (codes) => {
      console.log("Detected codes:", codes);
    }
  });

  if (error) return <div>Error: {error}</div>;

  return (
    <div className="scanner-root">
      <video ref={videoRef} autoPlay playsInline muted />
      
      {isTorchAvailable && (
        <button onClick={toggleTorch}>
          {isTorchOn ? "Turn Off Flash" : "Turn On Flash"}
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
| `onCodesDetected` | `(codes: DetectedBarcode[]) => void` | **Required** | Discovery callback. Returns array of detected objects. |
| `isEnabled` | `boolean` | `true` | Turn the detection engine/camera on or off. |
| `codeStatuses` | `Map<string, ScanStatus>` | `new Map()` | Map barcode values to `'processing' \| 'success' \| 'error'`. |
| `fps` | `number` | `25` | Frames per second for the scanner (1-30). Lower = Less battery. |
| `facingMode` | `'user' \| 'environment'` | `'environment'` | Camera selection. |
| `torch` | `boolean` | `false` | Imperative control for the flashlight. |
| `onTorchAvailable` | `(avail: boolean) => void` | `undefined` | Callback when device hardware reports torch capability. |
| `scanRegion` | `{x, y, width, height}` | `undefined` | % based Region of Interest (ROI). Filter codes outside this zone. |
| `title` | `string` | `"ĐƯA MÃ QR..."` | Floating title in the scanner UI. |
| `showCorners` | `boolean` | `true` | Show/hide the industrial HUD 4-corner markers. |
| `statusColors` | `Partial<Record<ScanStatus, string>>`| `{}` | Customize success/error/processing colors. |

### `DetectedBarcode` Object
```typescript
{
    boundingBox: DOMRectReadOnly; // Relative to video stream pixels
    cornerPoints: { x: number, y: number }[]; // 4 points of the barcode
    format: string; // e.g., 'qr_code'
    rawValue: string; // The encoded text
}
```

---

## 🎯 Best Practices & Performance

### 1. Avoid `key={facingMode}`
The library handles camera switching internally. Adding a `key` prop that changes with camera mode will force a hard unmount/remount, which can cause race conditions in hardware access on some mobile browsers.

### 2. FPS Control
*   **Fastest (20 - 30 FPS)**: Best for industrial multi-scan usage (High CPU).
*   **Stable (10 - 15 FPS)**: Recommended for most consumer-facing apps.
*   **Eco (1 - 5 FPS)**: Best for battery saving.

### 3. Handle Navigation
When navigating away from the scanner page, ensure you set `isEnabled={false}` or simply unmount the component. The library (v1.0.4+) will automatically release the camera hardware.

---

## 📱 Browser Support & Security

- **Requirements**: Camera access requires an **HTTPS** context (except `localhost`).
- **Engines**: 
  - **Native**: Chromium-based browsers (Chrome, Edge, Android Browse).
  - **Polyfill**: Safari, iOS, Firefox (Auto-detected and used).

---

## 🤝 Contributing & Support

Created by [htsang1904](https://github.com/htsang1904).
Found a bug? Open an issue on [GitHub](https://github.com/htsang1904/multi-qr/issues).

## 📜 License

MIT © 2024
