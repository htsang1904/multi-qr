# Changelog

## 1.1.0

- Add exact camera selection through `deviceId` for the component and hook.
- Add `onCameraReady` and `onCameraError` lifecycle callbacks.
- Stop and release the active stream when disabled, switched, disconnected, or unmounted.
- Preserve `facingMode` as the fallback when no `deviceId` is supplied.
