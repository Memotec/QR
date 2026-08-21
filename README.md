# QR Content Manager

Ứng dụng Web quản lý và tạo mã QR thông minh, lưu trữ dữ liệu an toàn trên trình duyệt (LocalStorage), hỗ trợ in tem nhãn chuẩn khổ giấy A4, trích xuất hình ảnh PNG độ phân giải cao và sao lưu/khôi phục dữ liệu qua định dạng JSON.

---

## 1. Cấu Trúc Mã Nguồn

```text
qr-content-manager/
│
├── index.html           # Giao diện chính của ứng dụng
├── style.css            # Tệp định dạng CSS (Dashboard hiện đại, A4 Print layout)
├── app.js               # Logic điều khiển, xử lý QR, LocalStorage, CRUD & In ấn
├── README.md            # Tài liệu hướng dẫn sử dụng & nâng cấp
│
├── data/
│   └── qr_data.json     # Dữ liệu mẫu khởi tạo chuẩn định dạng JSON
│
└── assets/
    └── favicon.ico      # Icon ứng dụng
```

---

## 2. Hướng Dẫn Cài Đặt & Sử Dụng

### Bước 1: Tải mã nguồn & Chuẩn bị
1. Tải toàn bộ thư mục mã nguồn `qr-content-manager` về máy tính.
2. Giải nén vào một thư mục bất kỳ (ví dụ: `D:\QR-Manager\`).

### Bước 2: Khởi chạy ứng dụng
- Nhấp đúp chuột trực tiếp vào tệp `index.html` hoặc nhấp chuột phải chọn **Open with -> Google Chrome** hoặc **Microsoft Edge**.
- Ứng dụng hoạt động hoàn toàn ở phía client (Client-side), không yêu cầu cài đặt phần mềm bổ sung hay kết nối internet (ngoại trừ CDN thư viện QRCode và Google Fonts).

### Bước 3: Thao tác nhập & tạo mã QR
1. **Mã / ID**: Hệ thống tự động sinh ID tiếp theo (ví dụ `QR-0004`). Bạn cũng có thể nhập ID thủ công hoặc bấm nút **⚡ Auto**.
2. **Tiêu đề**: Nhập tên gợi nhớ của thiết bị, địa điểm hoặc phân loại (ví dụ: *Thiết bị VHF Park Air*).
3. **Nội dung**: Nhập đường link, chuỗi cấu hình mạng, thông số kỹ thuật... Mã QR bên cột phải sẽ tự động hiển thị và cập nhật theo thời gian thực (Real-time).
4. **Ghi chú**: Nhập ghi chú phụ trợ (ví dụ vị trí đặt thiết bị).
5. Bấm **💾 Lưu** để lưu vào cơ sở dữ liệu.

### Bước 4: Tải ảnh PNG & In tem nhãn
- **Tải ảnh PNG**: Bấm nút **⬇ Tải PNG** dưới khung xem trước. Tên tệp ảnh sẽ tự động được làm sạch và đặt theo định dạng `<ID>_<Tiêu_Đề>.png`.
- **In mã đơn lẻ**: Bấm **🖨 In QR** trên khung xem trước để mở hộp thoại in khổ A4 chuẩn hóa.
- **In hàng loạt**: Tìm kiếm/lọc danh sách rồi bấm **🖨 IN TẤT CẢ** ở đầu bảng dữ liệu để in toàn bộ các trang A4 tương ứng.

---

## 3. Quản Lý Dữ Liệu & Cơ Chế Sao Lưu (Backup / Restore)

### Lưu ý quan trọng về LocalStorage:
* Dữ liệu của ứng dụng được lưu trữ trong **LocalStorage của trình duyệt** với khóa `qr_content_manager_v1`.
* Dữ liệu này tồn tại bền vững khi tắt/mở lại trình duyệt hoặc F5 trang web.
* Tuy nhiên, LocalStorage chỉ tồn tại **trên máy tính và trình duyệt hiện tại**. Nếu bạn xóa lịch sử duyệt web (Clear Site Data) hoặc chuyển sang máy tính khác, dữ liệu sẽ không tự động đồng bộ.
* **Do đó, tính năng Export/Import JSON chính là giải pháp sao lưu và luân chuyển dữ liệu an toàn nhất.**

### Sao lưu dữ liệu (Export JSON):
1. Bấm nút **📤 EXPORT JSON** trên thanh công cụ góc trên bên phải.
2. Trình duyệt sẽ tải về tệp có tên `qr_data_YYYY-MM-DD.json` chứa toàn bộ cơ sở dữ liệu của bạn.
3. Hãy lưu trữ tệp này vào USB, Google Drive hoặc ổ cứng để sao lưu định kỳ.

### Khôi phục dữ liệu (Import JSON):
1. Bấm nút **📥 IMPORT JSON** trên thanh công cụ.
2. Chọn tệp `.json` đã sao lưu trước đó (hoặc tệp `data/qr_data.json`).
3. Hệ thống sẽ tự động kiểm tra tính hợp lệ của dữ liệu, hiển thị hộp thoại xác nhận và nạp dữ liệu an toàn vào hệ thống.

---

## 4. Tính Năng An Toàn & Bảo Mật

* **Phòng chống tấn công XSS**: Toàn bộ dữ liệu hiển thị trên bảng và khu vực in ấn đều được xử lý qua hàm `escapeHtml()`, loại bỏ nguy cơ chèn mã độc HTML/JavaScript.
* **Chuẩn hóa tên tệp tải về**: Hàm `sanitizeFilename()` tự động loại bỏ dấu tiếng Việt và ký tự đặc biệt, giúp tệp ảnh PNG không bị lỗi font khi lưu trên Windows/Linux/macOS.
* **Kiểm tra trùng lặp ID**: Ngăn ngừa tình trạng ghi đè nhầm bản ghi khi người dùng nhập ID thủ công.

---

## 5. Định Hướng Kiến Trúc Nâng Cấp (Version 2: Flask + SQLite)

Để mở rộng ứng dụng thành một hệ thống **Quản lý mã QR tập trung chạy trong mạng nội bộ (LAN)** phục vụ nhiều nhân viên truy cập cùng lúc, kiến trúc đề xuất cho Version 2 như sau:

### Sơ đồ kiến trúc Version 2:
```text
┌───────────────────────────────────────────────────────────┐
│           Trình duyệt Client trong mạng LAN               │
│        (Máy tính, Điện thoại quét QR, Tablet...)          │
└─────────────────────────────▲─────────────────────────────┘
                              │ HTTP Requests (RESTful API)
┌─────────────────────────────▼─────────────────────────────┐
│              Máy chủ ứng dụng (Python Flask)              │
│       - Phục vụ Static Files (HTML/CSS/JS)                │
│       - Cung cấp API CRUD: /api/items, /api/export...     │
│       - Render template in ấn server-side nếu cần         │
└─────────────────────────────▲─────────────────────────────┘
                              │ SQL / ORM (SQLAlchemy)
┌─────────────────────────────▼─────────────────────────────┐
│                 Cơ sở dữ liệu SQLite                      │
│                  (qr_database.db)                         │
└───────────────────────────────────────────────────────────┘
```

### Cách thức hoạt động trong mạng LAN:
1. **Backend**: Sử dụng Python Flask (`app.py`) tích hợp cơ sở dữ liệu SQLite nhẹ nhàng, không cần cài đặt SQL Server phức tạp.
2. **IP Binding**: Cấu hình `app.run(host='0.0.0.0', port=5000)`. Khi đó mọi thiết bị kết nối chung mạng Wifi/LAN đều có thể truy cập qua địa chỉ IP máy chủ (ví dụ: `http://192.168.1.100:5000`).
3. **Đồng bộ hóa tức thời**: Khi bất kỳ nhân viên nào thêm/sửa/xóa mã QR, dữ liệu được ghi vào tệp cơ sở dữ liệu `qr_database.db` tập trung.
4. **Nâng cấp tiếp theo (Version 3 & 4)**:
   - **Version 3**: Bổ sung xác thực người dùng (Login/Session), phân quyền (Admin có quyền xóa/sửa, User chỉ được xem/in).
   - **Version 4**: Đóng gói Docker Container và triển khai lên máy chủ Cloud (GCP/AWS) với cơ sở dữ liệu PostgreSQL.
