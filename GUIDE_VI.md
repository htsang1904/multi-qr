# Hướng Dẫn Sử Dụng & Phát Triển (Vietnamese Guide)

## 1. Tổng Quan (Overview)
Dự án này là một Proof of Concept (PoC) nhằm kiểm tra tính khả thi của việc quét đồng thời nhiều mã QR cùng một lúc từ webcam.
**Bối cảnh:** Sử dụng cho việc check-in tại hội nghị hoặc lớp học, nơi có nhiều người cùng đưa mã QR ra trước camera cùng một lúc (3-5 người).

## 2. Cài Đặt (Installation)

### Dùng từ NPM (Khuyên dùng cho dự án mới)
Gói này đã được publish lên IDM, bạn có thể cài đặt ngay:

```bash
npm install multi-qr-scanner-poc
```

### Cách dùng (Usage)

```tsx
import MultiQRScanner from 'multi-qr-scanner-poc';

function App() {
  const handleScan = (codes) => {
    console.log('Mã vừa quét:', codes);
  };

  return (
    <div style={{ height: '500px' }}>
       <MultiQRScanner onCodesDetected={handleScan} />
    </div>
  );
}
```

## 3. Chạy Local (Cho Developer muốn sửa code)

```bash
# 1. Cài đặt thư viện
npm install

# 2. Chạy dự án (môi trường dev)
npm run dev
```

## 4. Công Nghệ Sử Dụng (Tech Stack)
-   **Frontend Framework**: React (với TypeScript) - được khởi tạo bằng Vite.
-   **QR Detection**:
    -   Sử dụng **Barcode Detection API** (Native Browser API) cho Android/Chrome.
    -   Sử dụng **Polyfill (@undecaf/barcode-detector-polyfill)** cho **iOS (Safari)** và **Electron**.
    -   *Lý do:* Đảm bảo tốc độ cao nhất trên thiết bị hỗ trợ native, và vẫn hoạt động tốt trên các thiết bị chưa hỗ trợ.

## 5. Chức Năng Chính (Features)
1.  **Quét Đa Điểm (Multi-Code Detection)**:
    -   Có thể nhận diện và đọc dữ liệu của nhiều mã QR trong cùng một khung hình video.
2.  **Quản Lý Trạng Thái (State Management & De-duplication)**:
    -   Giải quyết vấn đề "Spam API" khi camera quét liên tục (30-60 khung hình/giây).
    -   Mỗi mã QR sau khi quét sẽ có trạng thái riêng:
        -   **Mới (New)**: Chưa từng quét -> Bắt đầu xử lý.
        -   **Đang xử lý (Processing - Vàng)**: Đang gọi API kiểm tra. Bỏ qua các lần quét trùng lặp trong lúc này.
        -   **Thành công (Success - Xanh)**: Đã check-in thành công. Không gọi lại API nữa.
        -   **Lỗi (Error - Đỏ)**: Check-in thất bại. Hệ thống sẽ cho phép thử lại (retry) sau một khoảng thời gian (ví dụ: 5 giây).
3.  **Giao Diện Trực Quan (Visual Feedback)**:
    -   Vẽ khung bao (bounding box) quanh mã QR theo màu sắc trạng thái tương ứng.

## 6. Cơ Chế Hoạt Động (How it works)
1.  **Khởi tạo Camera**: Ứng dụng xin quyền truy cập webcam và hiển thị luồng video (ưu tiên camera sau/môi trường trên mobile).
2.  **Vòng lặp Phát hiện (Detection Loop)**:
    -   Sử dụng `BarcodeDetector.detect()` liên tục trên luồng video.
    -   Kết quả trả về là danh sách các mã QR có trong khung hình.
3.  **Xử lý Logic (Scanning Logic)**:
    -   Với mỗi mã tìm thấy, kiểm tra trong bộ nhớ đệm (`scanStates` map):
        -   Nếu mã **chưa có** hoặc **đã từng lỗi (cách đây 5s)** -> Đánh dấu là `Processing` và gọi hàm `checkInUser` (Mock API).
        -   Nếu mã đang `Processing` hoặc đã `Success` -> Bỏ qua, không làm gì cả.
4.  **Mock API**:
    -   Hàm `checkInUser` giả lập độ trễ mạng 2 giây.
    -   Nếu nội dung mã QR chứa từ "fail" -> trả về Lỗi, ngược lại -> Thành công.

## 7. Hướng Phát Triển & Mở Rộng (Future Scalability)

Nếu dự án phát triển lớn hơn, đây là các bước nâng cấp đề xuất:

1.  **Tối Ưu Hiệu Năng (Performance)**:
    -   Thay vì chạy logic xử lý ảnh trên luồng chính (Main Thread), hãy chuyển nó xuống **Web Worker**. Điều này giúp UI không bao giờ bị đơ, kể cả khi xử lý thuật toán nặng.
    -   Sử dụng **WASM** (WebAssembly) cho các thuật toán xử lý ảnh chuyên sâu (nếu BarcodeDetector chưa đủ).

2.  **Giao Tiếp Backend (Real-time Communication)**:
    -   Thay vì gọi API REST (`POST /check-in`), hãy chuyển sang dùng **WebSocket**.
    -   WebSocket giảm độ trễ kết nối, phù hợp cho việc check-in dòng người liên tục.

3.  **Tính Năng Mở Rộng**:
    -   Thêm nút bật/tắt đèn Flash (Torch).
    -   Hỗ trợ Zoom Camera (sử dụng `imageCapture.setOptions`).
    -   Chuyển đổi linh hoạt giữa Camera trước/sau.
    -   Hỗ trợ đọc thêm Barcode 1D (EAN-13, UPC) song song với QR Code.
