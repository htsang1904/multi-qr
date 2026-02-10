# 🚀 Hướng Dẫn Sử Dụng Multi QR Scanner Pro

Dự án này là một thư viện quét mã QR hiệu năng cao cho React, được tối ưu cho các kịch bản thực tế (điểm danh sự kiện, kho bãi) nơi cần quét nhiều mã cùng lúc với tốc độ cực nhanh và độ trễ bằng không.

---

## 🏗️ Kiến Trúc "Zero-Lag" (Mới trong v1.0.5)
Phiên bản mới nhất đã giải quyết triệt để các vấn đề phổ biến của camera trên trình duyệt:
- **WASM Reliability**: Tự động nạp bộ giải mã từ CDN nếu nạp local bị lỗi, giúp quét mã ổn định trên iOS/Safari.
- **Zero-Leak Cleanup**: Camera được tắt hoàn toàn ngay khi unmount, không kẹt tiến trình.
- **Canvas-based HUD**: Vẽ khung bao QR bằng Canvas 2D giúp UI đạt 60 FPS mượt mà.

---

## 📦 Cài Đặt

```bash
npm install multi-qr-scanner-poc
```

---

## 🚀 Khởi Động Nhanh

Cách tích hợp đơn giản nhất vào dự án của bạn:

```tsx
import MultiQRScanner from 'multi-qr-scanner-poc';
import { useState } from 'react';

function AttendanceApp() {
  const [statuses, setStatuses] = useState(new Map());

  const handleCodesDetected = (codes) => {
    codes.forEach(code => {
      // Logic xử lý khi phát hiện mã
      console.log('Phát hiện mã:', code.rawValue);
    });
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <MultiQRScanner
        onCodesDetected={handleCodesDetected}
        codeStatuses={statuses} // Map trạng thái: 'success' | 'error' | 'processing'
        fps={15}                // Tốc độ quét (khuyên dùng 10-15 cho mobile)
        facingMode="environment" // Sử dụng camera sau
      />
    </div>
  );
}
```

---

## 🛠️ Các Thuộc Tính (Props) Quan Trọng

| Prop | Type | Default | Mô tả |
| :--- | :--- | :--- | :--- |
| `onCodesDetected` | `function` | **Bắt buộc** | Callback trả về mảng các mã QR tìm thấy trong khung hình. |
| `isEnabled` | `boolean` | `true` | Bật/Tắt camera và engine quét. |
| `codeStatuses` | `Map` | `new Map()` | Map dữ liệu mã -> trạng thái để đổi màu khung (Xanh/Đỏ/Vàng). |
| `fps` | `number` | `25` | Tốc độ quét mỗi giây. Giảm xuống để tiết kiệm pin. |
| `facingMode` | `string` | `'environment'` | `'user'` (trước) hoặc `'environment'` (sau). |
| `torch` | `boolean` | `false` | Bật/Tắt đèn Flash (nếu phần cứng hỗ trợ). |
| `scanRegion` | `object` | `undefined` | Giới hạn vùng quét (ví dụ: `{x:25, y:25, width:50, height:50}`). |
| `showCorners` | `boolean` | `true` | Hiển thị/Ẩn 4 góc khung HUD laser chuyên nghiệp. |

---

## 🎯 Lưu Ý Quan Trọng (Best Practices)

### 1. KHÔNG sử dụng `key={facingMode}`
Trong dự án của bạn, **không được** gán `key` thay đổi theo camera cho component Scanner. Thư viện đã tự xử lý việc chuyển camera ngầm. Nếu bạn dùng `key`, component sẽ bị gỡ bỏ và khởi tạo lại quá nhanh, gây kẹt luồng phần cứng.

### 2. Quản lý Điều hướng (Navigation)
Khi chuyển trang, bạn nên đảm bảo component được unmount hoặc đặt `isEnabled={false}`. Thư viện v1.0.4 đã có cơ chế tự động giải phóng tài nguyên rất an toàn.

### 3. Môi trường HTTPS
Để camera hoạt động trên trình duyệt điện thoại, trang web của bạn **bắt buộc** phải chạy trên giao thức **HTTPS** (trừ trường hợp dùng `localhost`).

---

## 📱 Hỗ Trợ Trình Duyệt
- **Android / Chrome / Edge**: Chạy native (cực nhanh).
- **iOS / Safari**: Tự động sử dụng Polyfill WASM (hiệu năng cao).

---

## 🤝 Hỗ Trợ
Phát triển bởi [htsang1904](https://github.com/htsang1904). Nếu gặp lỗi, vui lòng báo lại để cùng tối ưu!
