# Yêu cầu hỗ trợ lựa chọn camera cho `multi-qr-scanner-poc`

## Mục tiêu

Nâng cấp package `multi-qr-scanner-poc` để ứng dụng có thể lựa chọn chính xác camera theo `deviceId`, phục vụ các thiết bị có nhiều nguồn video như camera tích hợp, webcam USB và camera ngoại vi.

Thư viện chỉ cần nhận và sử dụng `deviceId`. Việc liệt kê thiết bị và hiển thị giao diện chọn camera do ứng dụng sử dụng package đảm nhiệm.

## API mới

### `MultiQRScannerProps`

Bổ sung các props:

```ts
export interface MultiQRScannerProps {
  // Các props hiện có...

  /** ID của camera cần sử dụng. Ưu tiên hơn facingMode khi được truyền vào. */
  deviceId?: string

  /** Được gọi sau khi camera đã mở thành công. */
  onCameraReady?: (stream: MediaStream) => void

  /** Được gọi khi không thể mở hoặc sử dụng camera. */
  onCameraError?: (error: Error | DOMException) => void
}
```

### `UseMultiQRScannerOptions`

Bổ sung các option tương ứng cho hook `useMultiQRScanner`:

```ts
export interface UseMultiQRScannerOptions {
  // Các options hiện có...

  deviceId?: string
  onCameraReady?: (stream: MediaStream) => void
  onCameraError?: (error: Error | DOMException) => void
}
```

## Media constraints

Khi có `deviceId`, thư viện phải mở đúng camera được chọn:

```ts
const videoConstraints: MediaTrackConstraints = deviceId
  ? {
      deviceId: { exact: deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    }
  : {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    }

const stream = await navigator.mediaDevices.getUserMedia({
  video: videoConstraints,
})
```

Quy tắc ưu tiên:

1. Nếu có `deviceId`, sử dụng `deviceId` và bỏ qua `facingMode` khi tạo constraint.
2. Nếu không có `deviceId`, giữ nguyên hành vi chọn camera bằng `facingMode`.
3. Không thay đổi độ phân giải mặc định hiện tại.

## Quản lý vòng đời camera

Effect quản lý camera phải phụ thuộc tối thiểu vào:

```ts
[isEnabled, deviceId, facingMode]
```

### Khi `isEnabled === false`

- Không gọi `navigator.mediaDevices.getUserMedia()`.
- Dừng toàn bộ track của stream hiện tại.
- Gán `video.srcObject = null`.
- Reset `activeStream`.
- Reset trạng thái torch.

### Khi `isEnabled` chuyển thành `true`

- Mở camera theo `deviceId` hoặc `facingMode`.
- Gắn stream vào video.
- Gọi `video.play()`.
- Gọi `onCameraReady(stream)` sau khi stream được khởi tạo thành công.

### Khi `deviceId` hoặc `facingMode` thay đổi

- Dừng toàn bộ track của camera cũ trước khi mở camera mới.
- Không để hai camera hoạt động đồng thời.
- Không khởi tạo lại Barcode Detector hoặc WASM engine nếu không cần thiết.
- Không tạo thêm vòng `requestAnimationFrame` ngoài vòng scan hiện tại.

### Khi component unmount

- Dừng toàn bộ media track.
- Xóa `srcObject` của video.
- Hủy vòng `requestAnimationFrame`.
- Không để lại listener hoặc MediaStream chạy ngầm.

## Xử lý lỗi

Khi `getUserMedia()` thất bại, thư viện phải:

1. Lưu thông tin lỗi vào state `error` hiện có.
2. Gọi `onCameraError(error)` nếu callback được truyền vào.
3. Dừng và xóa stream cũ nếu còn tồn tại.
4. Không tự động lặp vô hạn việc xin mở camera.

Các trường hợp cần hỗ trợ:

- `NotAllowedError`: người dùng hoặc hệ điều hành từ chối quyền camera.
- `NotFoundError`: không tìm thấy camera hoặc `deviceId` không còn tồn tại.
- `NotReadableError`: camera đang được ứng dụng khác sử dụng hoặc hệ điều hành không thể mở thiết bị.
- `OverconstrainedError`: camera không đáp ứng constraint được yêu cầu.
- Trình duyệt/Electron không hỗ trợ `navigator.mediaDevices.getUserMedia`.

## Backward compatibility

Thay đổi phải giữ tương thích với code đang sử dụng package:

```tsx
<MultiQRScanner
  facingMode='environment'
  isEnabled
  onCodesDetected={handleCodesDetected}
/>
```

Không được làm thay đổi hành vi của các tính năng hiện có:

- Quét nhiều QR đồng thời.
- `onCodesDetected`.
- Barcode Detector và WASM fallback.
- `codeStatuses`.
- `scanRegion`.
- Torch.
- `fps` và `scanInterval`.
- React 18 và React 19.

## Ví dụ sử dụng từ ứng dụng

Ứng dụng consumer tự liệt kê camera:

```ts
const getCameraDevices = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(device => device.kind === 'videoinput')
}
```

Ứng dụng theo dõi việc cắm hoặc rút camera:

```ts
useEffect(() => {
  const handleDeviceChange = () => {
    void refreshCameraDevices()
  }

  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }
}, [])
```

Ứng dụng truyền camera được chọn vào scanner:

```tsx
<MultiQRScanner
  isEnabled={isEnabled}
  deviceId={selectedCameraId || undefined}
  facingMode='environment'
  onCodesDetected={handleCodesDetected}
  onCameraReady={stream => {
    console.info('Camera ready', stream)
  }}
  onCameraError={error => {
    console.error('Camera error', error)
  }}
/>
```

## Tiêu chí nghiệm thu

- Camera không được mở khi `isEnabled=false`.
- Camera mặc định vẫn hoạt động khi không truyền `deviceId`.
- Truyền một `deviceId` hợp lệ phải mở đúng camera tương ứng.
- Đổi `deviceId` phải dừng camera cũ và mở camera mới.
- Rút webcam đang sử dụng phải trả về lỗi qua `onCameraError` hoặc trạng thái `error`.
- Sau khi chọn camera khác còn tồn tại, scanner có thể hoạt động trở lại.
- Unmount component phải tắt đèn báo camera và giải phóng MediaStream.
- Không làm giảm khả năng phát hiện nhiều QR đồng thời.
- TypeScript declaration và package build phải thành công.

## Tài liệu và phiên bản package

Cần cập nhật:

- TypeScript types của component và hook.
- README/API Reference.
- Ví dụ lựa chọn webcam bằng `enumerateDevices()`.
- Test cho việc bật/tắt scanner và thay đổi `deviceId` nếu project có test setup.
- Changelog.

Đây là tính năng tương thích ngược, nên tăng **minor version** của package, ví dụ từ `1.0.9` lên `1.1.0`.

Khi bàn giao cần cung cấp:

- Danh sách file đã sửa.
- API contract mới.
- Kết quả typecheck/build/test.
- Phiên bản package đã publish để consumer cập nhật.
