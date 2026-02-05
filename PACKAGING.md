# Hướng Dẫn Đóng Gói (Packaging Guide)

Tài liệu này hướng dẫn cách đóng gói component `MultiQRScanner` thành một thư viện để tái sử dụng trong các dự án khác.

## 1. Cấu hình (Đã thực hiện sẵn)

Dự án đã được cấu hình sẵn các file sau:
1.  `vite.lib.config.ts`: Cấu hình Vite để build chế độ Library.
2.  `package.json`:
    *   Thêm script `build:lib`.
    *   Định nghĩa `main`, `module`, `types`, `exports`.
3.  `vite-plugin-dts`: Đã cài đặt để tạo file định nghĩa TypeScript (`.d.ts`).

## 2. Cách Build (Đóng gói)

Chạy lệnh sau trong terminal:

```bash
npm run build:lib
```

Sau khi chạy xong, thư mục `dist` sẽ được tạo ra chứa:
*   `multi-qr-scanner.js` (cho dự án dùng ESM/Vite/Webpack mới).
*   `multi-qr-scanner.umd.cjs` (cho dự án cũ dùng CommonJS).
*   Các file `.d.ts` (để hỗ trợ gợi ý code TypeScript).

## 3. Cách Tích Hợp Vào Dự Án Khác

### Cách 1: Copy thủ công (Nhanh nhất cho nội bộ)
1.  Copy thư mục `dist` sang dự án mới của bạn.
2.  Import component từ file js trong `dist`.

### Cách 2: Cài đặt từ Git (Khuyên dùng)
1.  Đẩy code dự án này lên một repo Git (ví dụ: GitHub/GitLab).
2.  Trong dự án mới, cài đặt bằng lệnh:
    ```bash
    npm install git+https://github.com/username/test-multi-qr.git
    ```
3.  Sử dụng:
    ```typescript
    import MultiQRScanner from 'test-multi-qr';

    function App() {
      return <MultiQRScanner />;
    }
    ```

### Cách 3: Publish lên NPM
1.  Đăng nhập NPM: `npm login`.
2.  Publish: `npm publish`.
3.  Trong dự án mới: `npm install test-multi-qr`.

## 4. Lưu ý về Dependencies

## 5. Xử lý Lỗi Thường Gặp (Troubleshooting)

### Lỗi 403 Forbidden (2FA)
Nếu gặp lỗi `Two-factor authentication... is required`:
1.  Kiểm tra email hoặc ứng dụng Authenticator để lấy mã OTP mới.
2.  Chạy lệnh publish kèm cờ `--otp`:
    ```bash
    npm publish --otp=123456
    ```
    *(Thay `123456` bằng mã của bạn)*

### Lỗi EPRIVATE
Nếu gặp `This package has been marked as private`:
-   Mở `package.json`, tìm dòng `"private": true` và sửa thành `"private": false` hoặc xóa nó đi.

### Lỗi E403 Cannot publish over previously published versions
Nếu gặp lỗi `You cannot publish over the previously published versions: x.x.x`:
1.  Mở `package.json`.
2.  Tăng số phiên bản ở dòng `"version"`. Ví dụ từ `0.0.1` lên `0.0.2`.
3.  Lưu lại và thử publish lại.

### Lỗi Node.js Version
Nếu gặp lỗi `Vite requires Node.js version 20.19+`:
1.  Cài đặt hoặc chuyển sang Node.js version 20 trở lên (khuyên dùng `nvm`).
    ```bash
    nvm install 20
    nvm use 20
    ```

