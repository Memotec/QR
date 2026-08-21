"""
Ứng Dụng Tạo & Quản Lý Mã QR Bằng Python Flask
Chạy cục bộ trên máy tính (localhost:5000)
Hỗ trợ:
- Tạo & tùy chỉnh màu sắc, kích thước mã QR
- Quản lý trạng thái in ấn (Đã in, Chưa in, Cần in lại)
- In hàng loạt khổ A4 chuẩn với mẫu tem Decal (Tomy 145, 135, 24 tem...)
- Nhập / Xuất dữ liệu CSV (Excel UTF-8), JSON và Tải trọn bộ file ZIP ảnh
"""

import os
import io
import json
import zipfile
from datetime import datetime
from flask import Flask, render_template_string, request, jsonify, send_file, redirect, url_for
import qrcode
from PIL import Image

app = Flask(__name__)
DATA_FILE = "qr_database.json"

def load_data():
    if not os.path.exists(DATA_FILE):
        sample_data = [
            {
                "id": "qr-1",
                "title": "Trang Chủ Công Ty",
                "content": "https://google.com",
                "category": "Website",
                "fg_color": "#0f172a",
                "bg_color": "#ffffff",
                "print_status": "printed",
                "print_count": 2,
                "last_printed_at": datetime.now().strftime("%d/%m/%Y %H:%M"),
                "created_at": datetime.now().strftime("%d/%m/%Y %H:%M")
            },
            {
                "id": "qr-2",
                "title": "Wifi Văn Phòng Tầng 1",
                "content": "WIFI:S:Office_5G;T:WPA;P:Password123;;",
                "category": "Wifi",
                "fg_color": "#1e3a8a",
                "bg_color": "#ffffff",
                "print_status": "never_printed",
                "print_count": 0,
                "last_printed_at": None,
                "created_at": datetime.now().strftime("%d/%m/%Y %H:%M")
            },
            {
                "id": "qr-3",
                "title": "Hotline Hỗ Trợ 24/7",
                "content": "tel:0901234567",
                "category": "Điện thoại",
                "fg_color": "#047857",
                "bg_color": "#ffffff",
                "print_status": "needs_reprint",
                "print_count": 1,
                "last_printed_at": datetime.now().strftime("%d/%m/%Y %H:%M"),
                "created_at": datetime.now().strftime("%d/%m/%Y %H:%M")
            }
        ]
        save_data(sample_data)
        return sample_data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trình Tạo & Quản Lý Mã QR (Python Flask)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            @page { size: A4 portrait; margin: 6mm; }
            .no-print { display: none !important; }
            .printable-sheet { display: grid !important; }
            body { background: white !important; padding: 0 !important; color: black !important; }
            .a4-card { border: 1px solid #cbd5e1 !important; page-break-inside: avoid !important; }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans min-h-screen">
    
    <!-- Top Header -->
    <header class="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
                    QR
                </div>
                <div>
                    <h1 class="text-base font-extrabold text-slate-900">Quản Lý & In Mã QR Hàng Loạt A4 (Python)</h1>
                    <p class="text-xs text-slate-500">Chạy cục bộ trên máy tính localhost:5000</p>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <a href="/export/csv" class="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold">
                    Xuất CSV (Excel)
                </a>
                <a href="/export/zip" class="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-bold">
                    Tải File ZIP Ảnh
                </a>
                <button onclick="window.print()" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer">
                    In Trang A4 (Ctrl+P)
                </button>
            </div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        <!-- Form Tạo Mã Mới -->
        <div class="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 class="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>➕ Thêm / Tạo Mã QR Mới</span>
                <span class="text-xs font-normal text-slate-400">Dữ liệu tự động lưu vào qr_database.json</span>
            </h2>
            <form action="/add" method="POST" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Tiêu Đề / Tên QR</label>
                    <input type="text" name="title" required placeholder="Ví dụ: Menu Quán, Bàn 01, Sp A..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Nội Dung / Đường Dẫn (URL)</label>
                    <input type="text" name="content" required placeholder="https://... hoặc Wifi, SĐT..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Phân Loại</label>
                    <select name="category" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white">
                        <option value="Website">Website / Link</option>
                        <option value="Wifi">Wifi</option>
                        <option value="Điện thoại">Điện thoại</option>
                        <option value="Sản phẩm">Sản phẩm / Bàn tiệc</option>
                        <option value="Thanh toán">Thanh toán VietQR</option>
                        <option value="Tài sản">Tài sản / Linh kiện</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-600 mb-1">Màu Mã & Thao Tác</label>
                    <div class="flex items-center space-x-2">
                        <input type="color" name="fg_color" value="#0f172a" class="w-10 h-9 p-0.5 rounded border border-slate-200 cursor-pointer">
                        <button type="submit" class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm cursor-pointer">
                            Lưu & Tạo Mã
                        </button>
                    </div>
                </div>
            </form>
        </div>

        <!-- Bảng Thống Kê & Tùy Biến In A4 -->
        <div class="no-print bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center space-x-4 text-xs">
                <span class="font-bold text-slate-700">Tổng số: <strong>{{ items|length }}</strong> mã</span>
                <span>•</span>
                <span class="text-emerald-700 font-semibold">Đã in: {{ printed_count }}</span>
                <span>•</span>
                <span class="text-amber-700 font-semibold">Chưa in: {{ unprinted_count }}</span>
            </div>
            
            <div class="flex items-center space-x-3 text-xs">
                <label class="font-bold text-slate-700">Tùy biến cột in A4:</label>
                <select id="gridColsSelect" onchange="updateGridCols(this.value)" class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold">
                    <option value="grid-cols-2">2 Cột (Thẻ lớn / Standee mini)</option>
                    <option value="grid-cols-3" selected>3 Cột (Decal chuẩn 21-24 tem)</option>
                    <option value="grid-cols-4">4 Cột (Tem vuông 40x40mm)</option>
                    <option value="grid-cols-5">5 Cột (Tomy 145 - 65 tem)</option>
                </select>
            </div>
        </div>

        <!-- Bảng Danh Sách & Khu Vực In A4 -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div class="no-print flex items-center justify-between mb-4">
                <h2 class="text-base font-bold text-slate-900">
                    📋 Bố Cục Trang In A4 (Decal Grid Preview)
                </h2>
                <span class="text-xs text-slate-500">Bấm In (Ctrl+P) để in trực tiếp không bao gồm thanh công cụ</span>
            </div>

            <!-- Lưới In Tem Nhãn (Decal Sheet Grid) -->
            <div id="printSheet" class="printable-sheet grid grid-cols-3 gap-3">
                {% for item in items %}
                <div class="a4-card p-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl flex flex-col items-center text-center justify-between">
                    <div class="w-full">
                        <div class="flex items-center justify-between text-[9px] mb-1">
                            <span class="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 font-bold rounded">
                                {{ item.category }}
                            </span>
                            <span class="text-slate-400 font-mono">#{{ loop.index }}</span>
                        </div>
                        <h3 class="font-bold text-slate-900 text-xs truncate w-full" title="{{ item.title }}">{{ item.title }}</h3>
                    </div>

                    <div class="my-2 p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        <img src="/qr/{{ item.id }}.png" alt="{{ item.title }}" class="w-28 h-28 object-contain">
                    </div>

                    <p class="text-[10px] font-mono text-slate-600 truncate w-full mb-2" title="{{ item.content }}">{{ item.content }}</p>

                    <!-- Trạng thái in & thao tác -->
                    <div class="no-print flex flex-col w-full pt-2 border-t border-slate-200 space-y-2">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="{% if item.print_status == 'printed' %}text-emerald-700 font-bold{% elif item.print_status == 'needs_reprint' %}text-rose-700 font-bold{% else %}text-amber-700 font-bold{% endif %}">
                                {% if item.print_status == 'printed' %}Đã in ({{ item.print_count }}x){% elif item.print_status == 'needs_reprint' %}Cần in lại{% else %}Chưa in{% endif %}
                            </span>
                            <a href="/toggle-status/{{ item.id }}" class="text-[10px] text-indigo-600 hover:underline">Đổi trạng thái</a>
                        </div>

                        <div class="flex items-center space-x-1 justify-center">
                            <a href="/qr/{{ item.id }}.png" download="{{ item.title }}.png" class="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[10px] font-semibold">
                                Tải PNG
                            </a>
                            <a href="/delete/{{ item.id }}" onclick="return confirm('Xóa mã này?');" class="px-2 py-0.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-semibold">
                                Xóa
                            </a>
                        </div>
                    </div>
                </div>
                {% endfor %}
            </div>
            
            {% if not items %}
            <div class="text-center py-12 text-slate-400 text-sm font-semibold">
                Chưa có mã QR nào. Hãy thêm mã đầu tiên ở biểu mẫu phía trên!
            </div>
            {% endif %}
        </div>
    </main>

    <script>
        function updateGridCols(colsClass) {
            const sheet = document.getElementById('printSheet');
            sheet.className = 'printable-sheet grid ' + colsClass + ' gap-3';
        }
    </script>
</body>
</html>
"""

@app.route("/")
def index():
    items = load_data()
    printed_count = sum(1 for i in items if i.get("print_status") == "printed")
    unprinted_count = sum(1 for i in items if i.get("print_status") in ("never_printed", None))
    return render_template_string(
        HTML_TEMPLATE, 
        items=items, 
        printed_count=printed_count, 
        unprinted_count=unprinted_count
    )

@app.route("/add", methods=["POST"])
def add_item():
    items = load_data()
    new_item = {
        "id": f"qr-{int(datetime.now().timestamp())}",
        "title": request.form.get("title", "").strip(),
        "content": request.form.get("content", "").strip(),
        "category": request.form.get("category", "Website"),
        "fg_color": request.form.get("fg_color", "#0f172a"),
        "bg_color": "#ffffff",
        "print_status": "never_printed",
        "print_count": 0,
        "last_printed_at": None,
        "created_at": datetime.now().strftime("%d/%m/%Y %H:%M")
    }
    if new_item["title"] and new_item["content"]:
        items.insert(0, new_item)
        save_data(items)
    return redirect(url_for("index"))

@app.route("/toggle-status/<item_id>")
def toggle_status(item_id):
    items = load_data()
    for item in items:
        if item["id"] == item_id:
            curr = item.get("print_status", "never_printed")
            if curr == "never_printed":
                item["print_status"] = "printed"
                item["print_count"] = (item.get("print_count") or 0) + 1
                item["last_printed_at"] = datetime.now().strftime("%d/%m/%Y %H:%M")
            elif curr == "printed":
                item["print_status"] = "needs_reprint"
            else:
                item["print_status"] = "never_printed"
            break
    save_data(items)
    return redirect(url_for("index"))

@app.route("/delete/<item_id>")
def delete_item(item_id):
    items = load_data()
    items = [i for i in items if i["id"] != item_id]
    save_data(items)
    return redirect(url_for("index"))

@app.route("/qr/<item_id>.png")
def generate_qr_image(item_id):
    items = load_data()
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return "Not found", 404

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(item["content"])
    qr.make(fit=True)

    img = qr.make_image(fill_color=item.get("fg_color", "#0f172a"), back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

@app.route("/export/csv")
def export_csv():
    items = load_data()
    output = io.StringIO()
    # Ghi BOM UTF-8 để Excel hiển thị tiếng Việt chính xác
    output.write("\ufeff")
    output.write("ID,Tiêu Đề,Nội Dung,Danh Mục,Trạng Thái In,Số Lần In,Ngày Tạo\n")
    for item in items:
        status_text = "Đã In" if item.get("print_status") == "printed" else "Cần In Lại" if item.get("print_status") == "needs_reprint" else "Chưa In"
        output.write(f'"{item["id"]}","{item["title"]}","{item["content"]}","{item["category"]}","{status_text}","{item.get("print_count", 0)}","{item.get("created_at")}"\n')
    
    mem = io.BytesIO()
    mem.write(output.getvalue().encode("utf-8"))
    mem.seek(0)
    return send_file(mem, mimetype="text/csv", as_attachment=True, download_name="danh_sach_ma_qr.csv")

@app.route("/export/zip")
def export_zip():
    items = load_data()
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, "w", zipfile.ZIP_DEFLATED) as zf:
        for item in items:
            qr = qrcode.QRCode(
                version=None,
                error_correction=qrcode.constants.ERROR_CORRECT_H,
                box_size=10,
                border=2,
            )
            qr.add_data(item["content"])
            qr.make(fit=True)
            img = qr.make_image(fill_color=item.get("fg_color", "#0f172a"), back_color="white")
            
            img_buf = io.BytesIO()
            img.save(img_buf, format="PNG")
            safe_name = "".join([c for c in item["title"] if c.isalnum() or c in (" ", "_", "-")]).rstrip()
            zf.writestr(f"{safe_name}_{item['id']}.png", img_buf.getvalue())

    mem.seek(0)
    return send_file(mem, mimetype="application/zip", as_attachment=True, download_name="all_qr_codes.zip")

if __name__ == "__main__":
    print("==========================================================")
    print("Trình Tạo & Quản Lý Mã QR (Python Flask) đang chạy tại:")
    print(">>> http://localhost:5000")
    print("==========================================================")
    app.run(host="0.0.0.0", port=5000, debug=True)
