import Papa from 'papaparse';
import JSZip from 'jszip';
import { QRItem, QRContentType, ImportResult } from '../types';
import { DEFAULT_QR_STYLE, getQRDataUrl } from './qrUtils';

/**
 * Parses uploaded text or file content and returns structured QRItem list
 */
export async function parseImportFile(file: File): Promise<ImportResult> {
  const fileName = file.name.toLowerCase();
  const fileText = await file.text();

  if (fileName.endsWith('.json')) {
    return parseJsonContent(fileText);
  } else if (fileName.endsWith('.csv')) {
    return parseCsvContent(fileText);
  } else if (fileName.endsWith('.txt')) {
    return parseTxtContent(fileText);
  } else {
    // Attempt auto-detection: JSON first, then CSV, then TXT
    try {
      return parseJsonContent(fileText);
    } catch {
      try {
        return parseCsvContent(fileText);
      } catch {
        return parseTxtContent(fileText);
      }
    }
  }
}

/**
 * Parse JSON data
 */
export function parseJsonContent(jsonString: string): ImportResult {
  const errors: string[] = [];
  const items: QRItem[] = [];

  try {
    const parsed = JSON.parse(jsonString);
    const rawArray = Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || [parsed]);

    rawArray.forEach((raw: any, index: number) => {
      try {
        const title = raw.title || raw.name || raw.label || raw['Tiêu đề'] || `Mã QR #${index + 1}`;
        const content = raw.content || raw.url || raw.text || raw.data || raw.link || raw['Nội dung'] || '';

        if (!content || !String(content).trim()) {
          errors.push(`Dòng ${index + 1}: Bị bỏ qua vì nội dung rỗng.`);
          return;
        }

        const now = new Date().toISOString();
        const item: QRItem = {
          id: raw.id && typeof raw.id === 'string' ? raw.id : `qr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          title: String(title).trim(),
          content: String(content).trim(),
          type: detectContentType(String(content)),
          category: String(raw.category || raw.group || raw['Danh mục'] || 'Chung').trim(),
          notes: raw.notes || raw.description || raw['Ghi chú'] || '',
          createdAt: raw.createdAt || now,
          updatedAt: now,
          style: {
            ...DEFAULT_QR_STYLE,
            ...(raw.style || {}),
            fgColor: raw.fgColor || raw.style?.fgColor || DEFAULT_QR_STYLE.fgColor,
            bgColor: raw.bgColor || raw.style?.bgColor || DEFAULT_QR_STYLE.bgColor,
            frameText: raw.frameText || raw.style?.frameText || '',
          },
          tags: Array.isArray(raw.tags) ? raw.tags : (raw.tags ? String(raw.tags).split(',').map((t: string) => t.trim()) : []),
        };

        items.push(item);
      } catch (err: any) {
        errors.push(`Dòng ${index + 1}: Lỗi xử lý dữ liệu (${err.message}).`);
      }
    });
  } catch (err: any) {
    errors.push(`Cú pháp JSON không hợp lệ: ${err.message}`);
  }

  return {
    total: items.length + errors.length,
    successCount: items.length,
    failedCount: errors.length,
    errors,
    items,
  };
}

/**
 * Parse CSV data with PapaParse
 */
export function parseCsvContent(csvString: string): ImportResult {
  const errors: string[] = [];
  const items: QRItem[] = [];

  const parsed = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach((err) => errors.push(`Lỗi dòng ${err.row}: ${err.message}`));
  }

  const rows = parsed.data as Record<string, any>[];

  // If no headers matched or single column without header
  if (rows.length === 0 || !rows[0] || Object.keys(rows[0]).length === 0) {
    return parseTxtContent(csvString);
  }

  rows.forEach((row, index) => {
    // Match headers dynamically (English or Vietnamese)
    const titleKey = Object.keys(row).find((k) =>
      /^(title|name|label|tieu de|tiêu đề|tên|tên mã)/i.test(k.trim())
    );
    const contentKey = Object.keys(row).find((k) =>
      /^(content|url|link|text|data|noi dung|nội dung|đường dẫn|liên kết)/i.test(k.trim())
    );
    const categoryKey = Object.keys(row).find((k) =>
      /^(category|group|danh muc|danh mục|nhóm|loại)/i.test(k.trim())
    );
    const notesKey = Object.keys(row).find((k) =>
      /^(notes|note|description|ghi chu|ghi chú|mô tả)/i.test(k.trim())
    );
    const colorKey = Object.keys(row).find((k) =>
      /^(color|fgcolor|màu|màu mã)/i.test(k.trim())
    );
    const tagsKey = Object.keys(row).find((k) =>
      /^(tags|tag|thẻ|nhãn)/i.test(k.trim())
    );

    // Fallback if contentKey not explicitly found: take 2nd or 1st non-empty column
    const keys = Object.keys(row);
    const content = contentKey ? row[contentKey] : (keys[1] ? row[keys[1]] : row[keys[0]]);
    const title = titleKey ? row[titleKey] : (keys[0] && keys[0] !== contentKey ? row[keys[0]] : `Mã QR #${index + 1}`);

    if (!content || !String(content).trim()) {
      errors.push(`Dòng ${index + 2}: Bị bỏ qua do cột nội dung rỗng.`);
      return;
    }

    const now = new Date().toISOString();
    const item: QRItem = {
      id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title: String(title || `Mã QR #${index + 1}`).trim(),
      content: String(content).trim(),
      type: detectContentType(String(content)),
      category: categoryKey && row[categoryKey] ? String(row[categoryKey]).trim() : 'Chung',
      notes: notesKey && row[notesKey] ? String(row[notesKey]).trim() : '',
      createdAt: now,
      updatedAt: now,
      style: {
        ...DEFAULT_QR_STYLE,
        fgColor: colorKey && row[colorKey] ? String(row[colorKey]).trim() : DEFAULT_QR_STYLE.fgColor,
      },
      tags: tagsKey && row[tagsKey] ? String(row[tagsKey]).split(',').map((t) => t.trim()) : [],
    };

    items.push(item);
  });

  return {
    total: items.length + errors.length,
    successCount: items.length,
    failedCount: errors.length,
    errors,
    items,
  };
}

/**
 * Parse plain TXT data (1 item per line: "Content" or "Title | Content" or "Title, Content")
 */
export function parseTxtContent(txtString: string): ImportResult {
  const errors: string[] = [];
  const items: QRItem[] = [];
  const lines = txtString.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  lines.forEach((line, index) => {
    let title = `Mã QR #${index + 1}`;
    let content = line;
    let category = 'Chung';

    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        title = parts[0];
        content = parts[1];
        if (parts[2]) category = parts[2];
      }
    } else if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim());
      if (parts.length >= 2) {
        title = parts[0];
        content = parts[1];
        if (parts[2]) category = parts[2];
      }
    }

    if (!content) {
      errors.push(`Dòng ${index + 1}: Nội dung rỗng.`);
      return;
    }

    const now = new Date().toISOString();
    items.push({
      id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title,
      content,
      type: detectContentType(content),
      category,
      notes: '',
      createdAt: now,
      updatedAt: now,
      style: { ...DEFAULT_QR_STYLE },
      tags: [],
    });
  });

  return {
    total: items.length + errors.length,
    successCount: items.length,
    failedCount: errors.length,
    errors,
    items,
  };
}

/**
 * Detects the QR content type automatically
 */
export function detectContentType(content: string): QRContentType {
  const trimmed = content.trim();
  if (/^https?:\/\//i.test(trimmed) || /^(www\.)[a-z0-9]/i.test(trimmed)) {
    return 'url';
  }
  if (/^WIFI:/i.test(trimmed)) {
    return 'wifi';
  }
  if (/^mailto:/i.test(trimmed) || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) {
    return 'email';
  }
  if (/^tel:/i.test(trimmed) || /^(\+84|0)[1-9][0-9]{8}$/.test(trimmed.replace(/\s+/g, ''))) {
    return 'phone';
  }
  if (/^smsto:/i.test(trimmed)) {
    return 'sms';
  }
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    return 'vcard';
  }
  if (trimmed.includes('vietqr') || /^BANK:/i.test(trimmed)) {
    return 'banking';
  }
  return 'text';
}

/**
 * Export items to CSV with UTF-8 BOM for full Vietnamese character compatibility in Excel
 */
export function exportToCsv(items: QRItem[], fileName = 'danh-sach-ma-qr.csv'): void {
  const exportData = items.map((item, idx) => ({
    'STT': idx + 1,
    'Tiêu đề': item.title,
    'Nội dung / Link': item.content,
    'Loại': item.type,
    'Danh mục': item.category,
    'Ghi chú': item.notes || '',
    'Màu sắc': item.style?.fgColor || '#000000',
    'Thẻ': (item.tags || []).join(', '),
    'Ngày tạo': new Date(item.createdAt).toLocaleString('vi-VN'),
  }));

  const csv = Papa.unparse(exportData);
  // Add UTF-8 BOM so Excel on Windows recognizes Vietnamese accents automatically
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, fileName);
}

/**
 * Export items to JSON
 */
export function exportToJson(items: QRItem[], fileName = 'du-lieu-ma-qr.json'): void {
  const jsonString = JSON.stringify(items, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  triggerBlobDownload(blob, fileName);
}

/**
 * Export items to TXT
 */
export function exportToTxt(items: QRItem[], fileName = 'danh-sach-ma-qr.txt'): void {
  const lines = items.map((item) => `${item.title} | ${item.content} | ${item.category}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  triggerBlobDownload(blob, fileName);
}

/**
 * Batch generate and package all QR codes into a downloadable ZIP archive
 */
export async function exportToZip(
  items: QRItem[],
  onProgress?: (current: number, total: number) => void,
  zipFileName = 'bo-anh-ma-qr.zip'
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('ma-qr') || zip;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (onProgress) onProgress(i + 1, items.length);

    try {
      const dataUrl = await getQRDataUrl(item.content, item.style, 1024);
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

      // Sanitize file name
      const safeTitle = (item.title || `qr-${i + 1}`)
        .replace(/[/\\?%*:|"<>]/g, '-')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const paddedIndex = String(i + 1).padStart(3, '0');
      folder.file(`${paddedIndex}_${safeTitle}.png`, base64Data, { base64: true });
    } catch (err) {
      console.error(`Error generating QR for item ${item.title}:`, err);
    }
  }

  // Include index CSV inside the ZIP
  const csvData = items.map((item, idx) => ({
    'STT': idx + 1,
    'Tên file': `${String(idx + 1).padStart(3, '0')}_${item.title.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_')}.png`,
    'Tiêu đề': item.title,
    'Nội dung': item.content,
    'Danh mục': item.category,
    'Ghi chú': item.notes || '',
  }));
  const csvString = Papa.unparse(csvData);
  zip.file('danh_muc_ma_qr.csv', '\uFEFF' + csvString);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(zipBlob, zipFileName);
}

/**
 * Helper to download template files for users
 */
export function downloadSampleCsvTemplate(): void {
  const sampleRows = [
    {
      'Tiêu đề': 'Trang chủ Website',
      'Nội dung': 'https://example.com',
      'Danh mục': 'Liên kết',
      'Ghi chú': 'Website chính thức công ty',
      'Thẻ': 'website, chính thức',
    },
    {
      'Tiêu đề': 'Wifi Văn Phòng Tầng 2',
      'Nội dung': 'WIFI:T:WPA;S:CongTy_VanPhong_T2;P:matkhau123456;;',
      'Danh mục': 'Wifi',
      'Ghi chú': 'Mã quét kết nối wifi cho khách và nhân viên',
      'Thẻ': 'wifi, nội bộ',
    },
    {
      'Tiêu đề': 'Hotline Chăm Sóc Khách Hàng',
      'Nội dung': 'tel:0987654321',
      'Danh mục': 'Liên hệ',
      'Ghi chú': 'Hỗ trợ 24/7',
      'Thẻ': 'hotline, cskh',
    },
    {
      'Tiêu đề': 'Tem Mã Hàng Hóa SP01',
      'Nội dung': 'https://example.com/products/SP01-MAY-IN-NHAN',
      'Danh mục': 'Sản phẩm',
      'Ghi chú': 'Tem bảo hành máy in mã vạch',
      'Thẻ': 'tem, sp01',
    },
  ];

  const csv = Papa.unparse(sampleRows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, 'mau_nhap_lieu_ma_qr.csv');
}

export function downloadSampleJsonTemplate(): void {
  const sample = [
    {
      title: 'Fanpage Facebook',
      content: 'https://facebook.com/mybrand',
      category: 'Mạng xã hội',
      notes: 'Trang fanpage cộng đồng',
      tags: ['facebook', 'social'],
      style: {
        fgColor: '#1877f2',
        bgColor: '#ffffff',
        frameText: 'THEO DÕI FANPAGE',
        framePosition: 'bottom',
      },
    },
    {
      title: 'Menu Quán Cà Phê',
      content: 'https://example.com/menu-online',
      category: 'Nhà hàng',
      notes: 'Thực đơn điện tử gọi món',
      tags: ['menu', 'cafe'],
      style: {
        fgColor: '#78350f',
        bgColor: '#fef3c7',
        frameText: 'QUÉT ĐỂ XEM MENU',
        framePosition: 'top',
      },
    },
  ];
  exportToJson(sample as any, 'mau_du_lieu_ma_qr.json');
}

export function downloadSampleTxtTemplate(): void {
  const txtContent = `Trang chủ Công ty | https://example.com | Liên kết
Wifi Tiếp Tân | WIFI:T:WPA;S:Coffee_Guest;P:88888888;; | Wifi
Zalo Hỗ Trợ | https://zalo.me/0987654321 | Liên hệ
Thanh toán đơn hàng #108 | https://img.vietqr.io/image/vcb-001100123456-compact2.png | Thanh toán`;

  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  triggerBlobDownload(blob, 'mau_nhap_nhanh.txt');
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
