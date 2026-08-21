import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Upload, 
  Printer, 
  Edit3, 
  Copy, 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  Archive, 
  CheckSquare, 
  Square, 
  Sparkles, 
  ExternalLink, 
  Layers, 
  MoreVertical, 
  Eye,
  Plus,
  RefreshCw,
  Check,
  Tag,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  PrinterCheck
} from 'lucide-react';
import { QRItem, PrintStatus } from '../types';
import { renderQRToCanvas, getQRDataUrl, downloadDataUrl } from '../utils/qrUtils';
import { 
  exportToCsv, 
  exportToJson, 
  exportToTxt, 
  exportToZip,
  downloadSampleCsvTemplate,
  downloadSampleJsonTemplate,
  downloadSampleTxtTemplate 
} from '../utils/fileUtils';

interface FileManagerProps {
  items: QRItem[];
  onDeleteItem: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onEditItem: (item: QRItem) => void;
  onDuplicateItem: (item: QRItem) => void;
  onPrintSingle: (item: QRItem) => void;
  onBatchPrint: (selectedItems: QRItem[]) => void;
  onOpenImportModal: () => void;
  onNewQR: () => void;
  onUpdatePrintStatus?: (id: string, status: PrintStatus, note?: string) => void;
  onBatchUpdatePrintStatus?: (ids: string[], status: PrintStatus) => void;
}

// Mini thumbnail component that draws the QR code cleanly
const QRThumbnail: React.FC<{ item: QRItem }> = ({ item }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderQRToCanvas(canvasRef.current, item.content, item.style, 120);
    }
  }, [item]);

  return (
    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 shadow-2xs">
      <canvas ref={canvasRef} className="w-full h-full object-contain rounded" />
    </div>
  );
};

export const FileManager: React.FC<FileManagerProps> = ({
  items,
  onDeleteItem,
  onDeleteMultiple,
  onEditItem,
  onDuplicateItem,
  onPrintSingle,
  onBatchPrint,
  onOpenImportModal,
  onNewQR,
  onUpdatePrintStatus,
  onBatchUpdatePrintStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [printStatusFilter, setPrintStatusFilter] = useState<'all' | 'never_printed' | 'printed' | 'needs_reprint'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'print_count'>('newest');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category.trim());
    });
    return Array.from(set);
  }, [items]);

  // Statistics for print management
  const stats = useMemo(() => {
    const total = items.length;
    const printed = items.filter((i) => i.printStatus === 'printed').length;
    const unprinted = items.filter((i) => !i.printStatus || i.printStatus === 'never_printed').length;
    const needsReprint = items.filter((i) => i.printStatus === 'needs_reprint').length;
    return { total, printed, unprinted, needsReprint };
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        
        let matchesPrintStatus = true;
        if (printStatusFilter === 'printed') matchesPrintStatus = item.printStatus === 'printed';
        else if (printStatusFilter === 'never_printed') matchesPrintStatus = !item.printStatus || item.printStatus === 'never_printed';
        else if (printStatusFilter === 'needs_reprint') matchesPrintStatus = item.printStatus === 'needs_reprint';

        const query = searchTerm.toLowerCase();
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          (item.notes && item.notes.toLowerCase().includes(query)) ||
          (item.printBatchNote && item.printBatchNote.toLowerCase().includes(query)) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)));

        return matchesCategory && matchesPrintStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'title') return a.title.localeCompare(b.title, 'vi');
        if (sortBy === 'print_count') return (b.printCount || 0) - (a.printCount || 0);
        return 0;
      });
  }, [items, selectedCategory, printStatusFilter, searchTerm, sortBy]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const selectedItemsList = useMemo(() => {
    return items.filter((i) => selectedIds.includes(i.id));
  }, [items, selectedIds]);

  // Batch action handlers
  const handleBatchDelete = () => {
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn?`)) {
      onDeleteMultiple(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBatchMarkStatus = (status: PrintStatus) => {
    if (onBatchUpdatePrintStatus && selectedIds.length > 0) {
      onBatchUpdatePrintStatus(selectedIds, status);
    }
  };

  const handleBatchExportZip = async (targetItems = items) => {
    if (targetItems.length === 0) return;
    setIsExportingZip(true);
    try {
      await exportToZip(targetItems, (current, total) => {
        setZipProgress({ current, total });
      });
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyContent = (item: QRItem) => {
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSinglePng = async (item: QRItem) => {
    const dataUrl = await getQRDataUrl(item.content, item.style, 1200);
    const safeTitle = (item.title || 'ma-qr').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    downloadDataUrl(dataUrl, `${safeTitle}.png`);
  };

  // Export Print Audit Report CSV
  const handleExportPrintReport = () => {
    const rows = [
      ['ID', 'Tiêu Đề', 'Nội Dung', 'Danh Mục', 'Trạng Thái In', 'Số Lần In', 'Ngày In Gần Nhất', 'Ghi Chú Đợt In'],
      ...items.map((i) => [
        i.id,
        `"${(i.title || '').replace(/"/g, '""')}"`,
        `"${(i.content || '').replace(/"/g, '""')}"`,
        `"${(i.category || '').replace(/"/g, '""')}"`,
        i.printStatus === 'printed' ? 'Đã In' : i.printStatus === 'needs_reprint' ? 'Cần In Lại' : 'Chưa In',
        (i.printCount || 0).toString(),
        i.lastPrintedAt ? new Date(i.lastPrintedAt).toLocaleString('vi-VN') : '—',
        `"${(i.printBatchNote || '').replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-in-an-qr_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top File Management & Actions Ribbon */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-indigo-600" />
                Quản Lý Dữ Liệu & Theo Dõi Tình Trạng In Ấn
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
                {items.length} Mã QR
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi lịch sử in ấn, lọc mã chưa in/cần in lại, nhập/xuất bảng tính Excel CSV, JSON, ZIP ảnh.
            </p>
          </div>

          {/* Import / Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              <span>Nhập Từ File</span>
            </button>

            <button
              onClick={() => exportToCsv(items)}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title="Xuất bảng tính Excel CSV (hỗ trợ tiếng Việt UTF-8)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>Xuất CSV (Excel)</span>
            </button>

            <button
              onClick={handleExportPrintReport}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title="Xuất báo cáo nhật ký in ấn chi tiết"
            >
              <PrinterCheck className="w-4 h-4 mr-1.5 text-blue-600" />
              <span>Báo Cáo In</span>
            </button>

            <button
              onClick={() => handleBatchExportZip(items)}
              disabled={isExportingZip || items.length === 0}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
              title="Tải toàn bộ mã QR dưới dạng ảnh PNG đóng gói trong file ZIP"
            >
              <Archive className="w-4 h-4 mr-1.5 text-indigo-600" />
              <span>{isExportingZip ? `Đang tạo ZIP (${zipProgress.current}/${zipProgress.total})...` : 'Tải File ZIP Ảnh'}</span>
            </button>

            <button
              onClick={onNewQR}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1 text-slate-600" />
              <span>Thêm Mới</span>
            </button>
          </div>
        </div>

        {/* Print Status Summary Quick Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div 
            onClick={() => setPrintStatusFilter('all')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              printStatusFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div>
              <div className="text-[11px] opacity-80">Tổng Số Mã QR</div>
              <div className="text-base font-extrabold">{stats.total}</div>
            </div>
            <Layers className="w-5 h-5 opacity-40" />
          </div>

          <div 
            onClick={() => setPrintStatusFilter('never_printed')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              printStatusFilter === 'never_printed' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70 text-amber-900'
            }`}
          >
            <div>
              <div className="text-[11px] opacity-80">Chưa In Lần Nào</div>
              <div className="text-base font-extrabold">{stats.unprinted}</div>
            </div>
            <Clock className="w-5 h-5 opacity-50 text-amber-600" />
          </div>

          <div 
            onClick={() => setPrintStatusFilter('printed')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              printStatusFilter === 'printed' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70 text-emerald-900'
            }`}
          >
            <div>
              <div className="text-[11px] opacity-80">Đã In Thành Công</div>
              <div className="text-base font-extrabold">{stats.printed}</div>
            </div>
            <CheckCircle2 className="w-5 h-5 opacity-50 text-emerald-600" />
          </div>

          <div 
            onClick={() => setPrintStatusFilter('needs_reprint')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              printStatusFilter === 'needs_reprint' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70 text-rose-900'
            }`}
          >
            <div>
              <div className="text-[11px] opacity-80">Cần In Lại / Sửa Đổi</div>
              <div className="text-base font-extrabold">{stats.needsReprint}</div>
            </div>
            <AlertTriangle className="w-5 h-5 opacity-50 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Filter, Search & Bulk Operations Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tiêu đề, liên kết, danh mục, ghi chú in..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Sort & View Toggle */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="title">Tên A → Z</option>
              <option value="print_count">Số lần in nhiều nhất</option>
            </select>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lưới
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bảng
              </button>
            </div>
          </div>
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold shrink-0 mr-1 flex items-center">
            <Filter className="w-3 h-3 mr-1" />
            Danh mục:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Selected Items Batch Operations Bar (Visible when 1+ selected) */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-indigo-900">
                Đã chọn {selectedIds.length} / {filteredItems.length} mục
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-indigo-600 hover:underline font-medium cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => onBatchPrint(selectedItemsList)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs cursor-pointer flex items-center"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                In Hàng Loạt A4 ({selectedIds.length})
              </button>

              <button
                onClick={() => handleBatchMarkStatus('printed')}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg cursor-pointer flex items-center"
                title="Đánh dấu các mục đã chọn là ĐÃ IN"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Đánh dấu Đã In
              </button>

              <button
                onClick={() => handleBatchMarkStatus('needs_reprint')}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-lg cursor-pointer flex items-center"
                title="Đánh dấu các mục đã chọn là CẦN IN LẠI"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Cần In Lại
              </button>

              <button
                onClick={() => handleBatchExportZip(selectedItemsList)}
                className="px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 font-semibold rounded-lg cursor-pointer flex items-center"
              >
                <Archive className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Tải ZIP ({selectedIds.length})
              </button>

              <button
                onClick={handleBatchDelete}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg cursor-pointer flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Xóa {selectedIds.length} mục
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Listing (Grid Mode or Table Mode) */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy mã QR nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Không có kết quả khớp với tìm kiếm hoặc bộ lọc trạng thái in hiện tại.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setPrintStatusFilter('all'); }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
            >
              Nhập từ file CSV/JSON
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isPrinted = item.printStatus === 'printed';
            const needsReprint = item.printStatus === 'needs_reprint';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border transition-all relative group flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Top Bar: Checkbox, Thumbnail, Title & Category */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item.id)}
                        className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                      <QRThumbnail item={item} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category || 'Chung'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {item.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Status Badge Ribbon */}
                  <div className="mb-3 flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center space-x-1.5">
                      {isPrinted && (
                        <span className="inline-flex items-center text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Đã in: {item.printCount || 1} lần
                        </span>
                      )}
                      {needsReprint && (
                        <span className="inline-flex items-center text-rose-700 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          Cần in lại
                        </span>
                      )}
                      {!isPrinted && !needsReprint && (
                        <span className="inline-flex items-center text-amber-700 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          Chưa in
                        </span>
                      )}
                    </div>

                    {/* Quick status switch dropdown */}
                    {onUpdatePrintStatus && (
                      <select
                        value={item.printStatus || 'never_printed'}
                        onChange={(e) => onUpdatePrintStatus(item.id, e.target.value as PrintStatus)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium cursor-pointer text-slate-700"
                      >
                        <option value="never_printed">Chưa in</option>
                        <option value="printed">Đã in</option>
                        <option value="needs_reprint">Cần in lại</option>
                      </select>
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3">
                    <p className="text-xs text-slate-600 font-mono break-all line-clamp-2" title={item.content}>
                      {item.content}
                    </p>
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-1">
                        {item.notes}
                      </p>
                    )}
                    {item.lastPrintedAt && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        In lần cuối: {new Date(item.lastPrintedAt).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopyContent(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Sao chép nội dung"
                    >
                      {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDownloadSinglePng(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Tải ảnh PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onPrintSingle(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="In standee / tem đơn lẻ này"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Xóa mã "${item.title}"?`)) onDeleteItem(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-16">Mã QR</th>
                  <th className="p-3.5">Tiêu đề & Phân loại</th>
                  <th className="p-3.5">Nội dung / Liên kết</th>
                  <th className="p-3.5">Tình Trạng In</th>
                  <th className="p-3.5">Lần In Cuối</th>
                  <th className="p-3.5 text-right w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isPrinted = item.printStatus === 'printed';
                  const needsReprint = item.printStatus === 'needs_reprint';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(item.id)}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5">
                        <QRThumbnail item={item} />
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">{item.type}</span>
                        </div>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-mono text-slate-600 truncate" title={item.content}>
                          {item.content}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {onUpdatePrintStatus ? (
                          <select
                            value={item.printStatus || 'never_printed'}
                            onChange={(e) => onUpdatePrintStatus(item.id, e.target.value as PrintStatus)}
                            className={`text-xs px-2 py-1 rounded-lg border font-bold cursor-pointer ${
                              isPrinted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : needsReprint
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            <option value="never_printed">Chưa In</option>
                            <option value="printed">Đã In ({item.printCount || 1})</option>
                            <option value="needs_reprint">Cần In Lại</option>
                          </select>
                        ) : (
                          <span className="font-bold">
                            {isPrinted ? `Đã in (${item.printCount})` : needsReprint ? 'Cần in lại' : 'Chưa in'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {item.lastPrintedAt ? new Date(item.lastPrintedAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onPrintSingle(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                            title="In đơn lẻ"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadSinglePng(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Tải ảnh PNG"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditItem(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa mã "${item.title}"?`)) onDeleteItem(item.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
