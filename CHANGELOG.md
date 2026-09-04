# Changelog

## 1.1.2

- Remove temporary runtime diagnostic logs from detector, WASM, camera, and scan-loop initialization.
- Keep concise error logging for actual scanner failures.

## 1.1.1

- Emit the ZBar WASM file as an external library asset so it can load reliably on Safari and iOS.
- Keep emitted library assets relative for consumers hosted from sub-paths or CDNs.

## 1.1.0

- Add exact camera selection through `deviceId` for the component and hook.
- Add `onCameraReady` and `onCameraError` lifecycle callbacks.
- Stop and release the active stream when disabled, switched, disconnected, or unmounted.
- Preserve `facingMode` as the fallback when no `deviceId` is supplied.
