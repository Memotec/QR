# Hướng Dẫn Chạy Ứng Dụng QR Bằng Python

Dự án này cung cấp 2 giải pháp hoàn chỉnh bằng Python để bạn chạy trên máy tính localhost của mình:

---

## Cách 1: Chạy Web App Trực Quan (Giao Diện Web Đầy Đủ Bằng Flask)

Ứng dụng **`app.py`** tích hợp đầy đủ tính năng:
- Tạo mã QR từ văn bản, URL, Wifi, Số điện thoại, Email.
- Lưu trữ và quản lý danh sách mã QR trên file (`data_qr.json` hoặc `data_qr.csv`).
- In ấn tem nhãn trực tiếp trên trình duyệt (`Ctrl + P`).
- Tải ảnh mã QR dạng file đơn hoặc gói toàn bộ thành file **ZIP**.
- Nhập/Xuất file **CSV (Excel)** và **JSON**.

### Bước 1: Cài đặt thư viện Python
Mở Terminal hoặc Command Prompt và chạy:
```bash
pip install flask qrcode[pil] pandas
```

### Bước 2: Khởi chạy Server
```bash
python app.py
```

### Bước 3: Sử dụng
Mở trình duyệt truy cập: **`http://localhost:5000`**

---

## Cách 2: Chạy Server Tĩnh Nhanh Cho Bản Web Hiện Tại
Nếu bạn đã tải mã nguồn Vite/React về và chạy `npm run build`, bạn có thể dùng Python để khởi chạy server cực nhanh:
```bash
# Di chuyển vào thư mục dist
cd dist

# Chạy server với Python tích hợp sẵn
python -m http.server 3000
```
Sau đó truy cập: **`http://localhost:3000`**
