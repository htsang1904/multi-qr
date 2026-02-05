# Multi QR Scanner POC

A high-performance React component capable of detecting and scanning **multiple QR codes simultaneously** in a single frame. Built with the native **Barcode Detection API** and optimized for performance using a state-driven approach.

This library is perfect for high-throughput scenarios like event check-ins, ticketing, or warehouse logistics where multiple codes need to be scanned efficiently.

![License](https://img.shields.io/npm/l/multi-qr-scanner-poc)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/YOUR_USERNAME/YOUR_REPO)
[![Demo](https://img.shields.io/badge/Live-Demo-blue?logo=vercel)](https://YOUR_DEMO_URL.vercel.app)


## Features

- 🚀 **Multi-Code Detection**: Detects and reads multiple QR codes in the same frame.
- ⚡ **High Performance**: Uses the native `BarcodeDetector` API (Chrome/Android) for maximum speed.
- 🍎 **Cross-Platform**: Includes a polyfill for iOS (Safari) and environments without native support.
- 🎨 **Visual Feedback**: Draws bounding boxes around detected codes with color-coded status indicators.
- 🧠 **Smart De-duplication**: Built-in logic to handle `pending`, `success`, and `error` states to prevent duplicate API calls for the same code.

## Installation

Install the package via npm:

```bash
npm install multi-qr-scanner-poc
```

## Usage

Import the component and use it in your React application.

```tsx
import React, { useState } from 'react';
import MultiQRScanner, { DetectedBarcode, ScanStatus } from 'multi-qr-scanner-poc';

function App() {
  // Map to track the status of each scanned QR code (e.g., 'processing', 'success')
  const [codeStatuses, setCodeStatuses] = useState<Map<string, ScanStatus>>(new Map());

  const handleScan = (codes: DetectedBarcode[]) => {
    // 'codes' is an array of all QR codes detected in the current frame
    codes.forEach((code) => {
      const value = code.rawValue;
      
      // Example logic: Only process new codes
      if (!codeStatuses.has(value)) {
        console.log('New QR Found:', value);
        
        // 1. Mark as processing
        updateStatus(value, 'processing');

        // 2. Simulate API Call
        setTimeout(() => {
           // 3. Mark as success/error based on result
           updateStatus(value, 'success');
        }, 2000);
      }
    });
  };

  const updateStatus = (id: string, status: ScanStatus) => {
    setCodeStatuses((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, status);
      return newMap;
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Multi QR Scanner</h1>
      <MultiQRScanner 
        onCodesDetected={handleScan} 
        codeStatuses={codeStatuses} 
        scanInterval={500} // Optional: Scan every 500ms
      />
    </div>
  );
}

export default App;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCodesDetected` | `(codes: DetectedBarcode[]) => void` | **Required** | Callback function triggered when QR codes are detected. Receives an array of detected objects. |
| `codeStatuses` | `Map<string, ScanStatus>` | `new Map()` | A map of QR code values to their current status (`'pending'`, `'processing'`, `'success'`, `'error'`). Used to color-code the bounding boxes. |
| `scanInterval` | `number` | `600` | The interval (in ms) between scan attempts. Higher values reduce CPU usage but lower responsiveness. |
| `className` | `string` | `undefined` | Optional CSS class name for the wrapper div. |
| `style` | `React.CSSProperties` | `undefined` | Optional inline styles for the wrapper div. |

### Types

#### `DetectedBarcode`
Standard [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/DetectedBarcode) interface:
- `rawValue`: string (The decoded text)
- `boundingBox`: DOMRectReadOnly (Position and size)
- `format`: string (Format, e.g., 'qr_code')
- `cornerPoints`: {x, y}[] (Coordinates of the 4 corners)

#### `ScanStatus`
- `'pending'`: Initial state (though usually `undefined` in the map means new).
- `'processing'`: Yellow bounding box.
- `'success'`: Green bounding box.
- `'error'`: Red bounding box.

## Browser Support

- **Android / Chrome / Edge**: Uses Native `BarcodeDetector` (Fastest).
- **iOS / Safari / Firefox**: Automatically falls back to `@undecaf/barcode-detector-polyfill` (WASM-based).

## License

MIT © [Your Name / Organization]
