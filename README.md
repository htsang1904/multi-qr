# 🚀 Multi QR Scanner Pro

[![NPM Version](https://img.shields.io/npm/v/multi-qr-scanner-poc?style=flat-square&color=3366cc)](https://www.npmjs.com/package/multi-qr-scanner-poc)
[![NPM Downloads](https://img.shields.io/npm/dm/multi-qr-scanner-poc?style=flat-square&color=50abf1)](https://www.npmjs.com/package/multi-qr-scanner-poc)
[![License](https://img.shields.io/npm/l/multi-qr-scanner-poc?style=flat-square)](https://github.com/htsang1904/multi-qr/blob/main/LICENSE)
[![Types](https://img.shields.io/npm/types/multi-qr-scanner-poc?style=flat-square)](https://www.npmjs.com/package/multi-qr-scanner-poc)

A high-performance, **industrial-grade** React library for simultaneous multi-barcode detection. Built on top of the native **Barcode Detection API** with intelligent WASM polyfills, it offers a **headless architecture** that gives you 100% control over your UI.

> **New in v1.0.6**: Fixed React compatibility - now supports both React 18.x and 19.x. Enhanced WASM/Polyfill loading with CDN fallback.

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

**Requirements:**
- React 18.x or 19.x
- Modern browser with camera support
- HTTPS context (required for camera access, except `localhost`)

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
      setCodeStatuses(prev => new Map(prev).set(code.rawValue, 'processing'));
    });
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MultiQRScanner
        onCodesDetected={handleDetected}
        codeStatuses={codeStatuses}
        fps={15}
        isEnabled={true}
        facingMode="environment"
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
    fps: 15,
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

## 🚨 Troubleshooting: "Không quét được mã" (Detection Not Working)

### ✅ Step 1: Verify Installation
```bash
npm list multi-qr-scanner-poc
```
**Expected:** `multi-qr-scanner-poc@1.0.6` or higher.

**If outdated:**
```bash
npm install multi-qr-scanner-poc@latest
rm -rf node_modules/.vite  # Clear Vite cache
```

---

### ✅ Step 2: Check Camera Initialization

Add this debug callback to verify camera is working:

```tsx
<MultiQRScanner
  onCodesDetected={handleDetected}
  onTorchAvailable={(available) => {
    console.log('🎥 Camera initialized:', available);
  }}
  // ... other props
/>
```

**Expected Console Output:**
```
🎥 Camera initialized: true  (or false if no torch)
```

**If you DON'T see this log:**
- Camera permission was denied
- Another app/tab is using the camera
- Browser doesn't support `getUserMedia`

---

### ✅ Step 3: Verify Video Element is Visible

Add this to your `onCodesDetected`:

```tsx
const handleDetected = (codes) => {
  const video = document.querySelector('video');
  console.log('📹 Video state:', {
    width: video?.videoWidth,
    height: video?.videoHeight,
    readyState: video?.readyState
  });
  console.log('🔍 Codes detected:', codes.length);
};
```

**Expected Output:**
```
📹 Video state: { width: 1280, height: 720, readyState: 4 }
```

**If `width: 0` or `height: 0`:**
- CSS is hiding the video element
- Video stream hasn't loaded yet
- Check your `containerStyle` and `style` props

---

### ✅ Step 4: Check for WASM Loading Errors

Open **DevTools → Console**, look for errors containing:
- `zbar.wasm`
- `BarcodeDetector`
- `Failed to load`

**If you see WASM 404 errors:**

Add this to your `vite.config.ts`:

```ts
export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@undecaf/barcode-detector-polyfill', '@undecaf/zbar-wasm']
  }
});
```

---

### ✅ Step 5: Common Mistakes to Avoid

#### ❌ DON'T use `key={facingMode}`
```tsx
// ❌ WRONG - This forces unmount/remount
<MultiQRScanner key={facingMode} facingMode={facingMode} />

// ✅ CORRECT - Library handles camera switching internally
<MultiQRScanner facingMode={facingMode} />
```

#### ❌ DON'T call `getUserMedia` before mounting Scanner
```tsx
// ❌ WRONG - Conflicts with Scanner's camera access
useEffect(() => {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => stream.getTracks().forEach(t => t.stop()));
}, []);

// ✅ CORRECT - Let Scanner handle camera
useEffect(() => {
  // Just mount the Scanner component
}, []);
```

#### ❌ DON'T set `isEnabled={false}` on mount
```tsx
// ❌ WRONG - Scanner won't start
const [enabled, setEnabled] = useState(false);

// ✅ CORRECT - Start enabled
const [enabled, setEnabled] = useState(true);
```

---

### ✅ Step 6: Test with Minimal Example

Create a new file `TestScanner.tsx`:

```tsx
import MultiQRScanner from 'multi-qr-scanner-poc';

export default function TestScanner() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MultiQRScanner
        onCodesDetected={(codes) => {
          console.log('✅ DETECTED:', codes.map(c => c.rawValue));
        }}
        fps={15}
      />
    </div>
  );
}
```

**If this works but your main app doesn't:**
- There's a conflict with your app's CSS/layout
- Another component is interfering with camera access
- Check your routing/navigation logic

---

## 🎯 Best Practices & Performance

### 1. FPS Control
*   **Fastest (20 - 30 FPS)**: Best for industrial multi-scan usage (High CPU).
*   **Stable (10 - 15 FPS)**: ⭐ **Recommended** for most consumer-facing apps.
*   **Eco (1 - 5 FPS)**: Best for battery saving.

### 2. Handle Navigation Properly
When navigating away from the scanner page, ensure you set `isEnabled={false}` or simply unmount the component. The library (v1.0.6+) will automatically release the camera hardware.

```tsx
const handleBackButton = () => {
  setIsEnabled(false);  // Stop camera
  navigate(-1);         // Then navigate
};
```

### 3. Manage Detection State
Prevent duplicate API calls by tracking processed codes:

```tsx
const processedRef = useRef(new Set());

const handleDetected = (codes) => {
  codes.forEach(code => {
    if (!processedRef.current.has(code.rawValue)) {
      processedRef.current.add(code.rawValue);
      // Call your API here
      checkInUser(code.rawValue);
    }
  });
};
```

---

## 📱 Browser Support & Security

- **Requirements**: Camera access requires an **HTTPS** context (except `localhost`).
- **Engines**: 
  - **Native**: Chromium-based browsers (Chrome, Edge, Android Browser).
  - **Polyfill**: Safari, iOS, Firefox (Auto-detected and used).

---

## 🐛 Still Not Working?

If you've tried all steps above and still can't detect QR codes:

1. **Check React version**: Run `npm list react` - must be 18.x or 19.x
2. **Try a different browser**: Test in Chrome desktop first
3. **Check camera permissions**: System Settings → Privacy → Camera
4. **Open an issue**: [GitHub Issues](https://github.com/htsang1904/multi-qr/issues) with:
   - Browser name and version
   - React version
   - Console errors (screenshot)
   - Video element dimensions (from Step 3)

---

## 🤝 Contributing & Support

Created by [htsang1904](https://github.com/htsang1904).
Found a bug? Open an issue on [GitHub](https://github.com/htsang1904/multi-qr/issues).

## 📜 License

MIT © 2024
