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

## 3. Tùy chỉnh Giao diện (Customization)

`MultiQRScanner` hỗ trợ nhiều thuộc tính (props) để bạn có thể tùy chỉnh giao diện theo ý muốn:

| Prop | Type | Default | Mô tả |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `"ĐƯA MÃ QR CODE..."` | Tiêu đề hiển thị phía trên khu vực quét. |
| `showFrame` | `boolean` | `true` | Hiển thị khung (4 góc) của khu vực quét. |
| `showScanLine` | `boolean` | `true` | Hiển thị đường quét chạy lên xuống. |
| `scanLineColor` | `string` | `"#FFFFFF"` | Màu sắc của đường quét. |
| `frameColor` | `string` | `"#FFFFFF"` | Màu sắc của khung quét. |
| `overlayColor` | `string` | `"rgba(0,0,0,0.5)"` | Màu của vùng làm mờ xung quanh vùng quét. |
| `containerStyle` | `CSSProperties` | `undefined` | Style CSS cho toàn bộ container. |
| `children` | `ReactNode` | `undefined` | Chèn thêm nội dung UI tùy chỉnh đè lên camera. |

Ví dụ sử dụng:
```tsx
<MultiQRScanner
  title="VUI LÒNG QUÉT MÃ TẠI ĐÂY"
  frameColor="#00ff00"
  scanLineColor="#00ff00"
  overlayColor="rgba(0, 0, 0, 0.8)"
/>
```

## 4. Cách Tích Hợp Vào Dự Án Khác

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
    import MultiQRScanner from 'multi-qr-scanner-poc';

    function App() {
      return <MultiQRScanner />;
    }
    ```

### Cách 3: Publish lên NPM

Project dùng Vite 7, vì vậy hãy dùng đúng phiên bản Node được khai báo trong `.nvmrc`:

```bash
nvm install
nvm use
node --version
```

Sau đó thực hiện lần lượt:

```bash
# 1. Cài đúng dependencies từ package-lock.json
npm ci

# 2. Chạy kiểm tra và build thư viện
npm run lint
npm run build:lib

# 3. Kiểm tra nội dung gói mà không publish
npm pack --dry-run

# 4. Đăng nhập và kiểm tra đúng tài khoản npm
npm login
npm whoami

# 5. Publish phiên bản hiện tại
npm publish --access public
```

Script `prepack` sẽ tự chạy lại lint và build trước khi đóng gói hoặc publish.

Sau khi publish, kiểm tra phiên bản trên registry và thử cài trong project khác:

```bash
npm view multi-qr-scanner-poc version
npm install multi-qr-scanner-poc@1.1.2
```

Với lần phát hành tiếp theo, tăng version trước khi commit:

```bash
npm version patch --no-git-tag-version
```

## 5. Xử lý Lỗi Thường Gặp (Troubleshooting)

### Lỗi 403 Forbidden (2FA)
Nếu gặp lỗi `Two-factor authentication... is required`:
1.  Kiểm tra ứng dụng Authenticator để lấy mã OTP mới.
2.  Chạy lệnh publish kèm cờ `--otp`:
    ```bash
    npm publish --access public --otp=123456
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
1.  Cài đặt hoặc chuyển sang phiên bản Node trong `.nvmrc` (khuyên dùng `nvm`).
    ```bash
    nvm install
    nvm use
    ```

### Lỗi quyền truy cập npm cache (`EACCES` hoặc `EPERM`)

Nếu npm báo thư mục `~/.npm` chứa file thuộc quyền `root`, sửa quyền một lần rồi chạy lại:

```bash
sudo chown -R "$(id -u)":"$(id -g)" "$HOME/.npm"
```

Nếu chỉ muốn kiểm tra gói mà chưa sửa cache, có thể dùng cache tạm:

```bash
npm_config_cache=/tmp/multi-qr-npm-cache npm pack --dry-run
```
