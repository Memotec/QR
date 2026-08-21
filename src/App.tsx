import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QRGenerator } from './components/QRGenerator';
import { FileManager } from './components/FileManager';
import { BatchPrintModal } from './components/BatchPrintModal';
import { PrintSingleModal } from './components/PrintSingleModal';
import { FileImportExportModal } from './components/FileImportExportModal';
import { ItemEditModal } from './components/ItemEditModal';
import { QRItem, PrintStatus } from './types';
import { INITIAL_SAMPLE_ITEMS } from './data/sampleData';
import { 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  HelpCircle, 
  Sparkles,
  Printer,
  FileSpreadsheet,
  QrCode
} from 'lucide-react';

const STORAGE_KEY = 'qr_manager_app_data_v2';

export default function App() {
  const [items, setItems] = useState<QRItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_ITEMS;
  });

  const [activeTab, setActiveTab] = useState<'generator' | 'files' | 'batch-print'>('generator');
  
  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [singlePrintItem, setSinglePrintItem] = useState<QRItem | null>(null);
  const [editingItem, setEditingItem] = useState<QRItem | null>(null);
  const [editModalItem, setEditModalItem] = useState<QRItem | null>(null);
  
  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to save to local storage', err);
    }
  }, [items]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Add or Update from Generator
  const handleSaveItem = (newItemData: Omit<QRItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    if (editingItem) {
      // Update existing
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id
            ? { ...it, ...newItemData, updatedAt: now }
            : it
        )
      );
      setEditingItem(null);
      showToast(`Đã cập nhật mã QR "${newItemData.title}"!`);
    } else {
      // Create new
      const newItem: QRItem = {
        ...newItemData,
        id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      setItems((prev) => [newItem, ...prev]);
      showToast(`Đã lưu "${newItem.title}" vào danh sách!`);
    }
  };

  // Delete single item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Đã xóa mã QR!');
  };

  // Delete multiple items
  const handleDeleteMultiple = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    showToast(`Đã xóa ${ids.length} mã QR!`);
  };

  // Duplicate item
  const handleDuplicateItem = (item: QRItem) => {
    const duplicated: QRItem = {
      ...item,
      id: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${item.title} (Bản sao)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [duplicated, ...prev]);
    showToast(`Đã nhân bản "${item.title}"!`);
  };

  // Edit item in generator
  const handleEditItemInGenerator = (item: QRItem) => {
    setEditingItem(item);
    setActiveTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update item from EditModal
  const handleSaveModalItem = (updated: QRItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    showToast(`Đã cập nhật "${updated.title}"!`);
  };

  // Import items callback
  const handleImportSuccess = (imported: QRItem[]) => {
    setItems((prev) => [...imported, ...prev]);
    setActiveTab('files');
    showToast(`Đã nhập thành công ${imported.length} mã QR từ file!`);
  };

  // Update print copies
  const handleUpdateCopies = (id: string, copies: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, printCopies: copies } : i))
    );
  };

  // Update single print status
  const handleUpdatePrintStatus = (id: string, status: PrintStatus, note?: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const count = status === 'printed' ? (i.printCount || 0) + 1 : i.printCount;
        return {
          ...i,
          printStatus: status,
          printCount: count,
          lastPrintedAt: status === 'printed' ? new Date().toISOString() : i.lastPrintedAt,
          printBatchNote: note !== undefined ? note : i.printBatchNote,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showToast(status === 'printed' ? 'Đã đánh dấu ĐÃ IN!' : status === 'needs_reprint' ? 'Đã đánh dấu CẦN IN LẠI!' : 'Đã chuyển về CHƯA IN!');
  };

  // Batch update print status
  const handleBatchUpdatePrintStatus = (ids: string[], status: PrintStatus) => {
    setItems((prev) =>
      prev.map((i) => {
        if (!ids.includes(i.id)) return i;
        const count = status === 'printed' ? (i.printCount || 0) + 1 : i.printCount;
        return {
          ...i,
          printStatus: status,
          printCount: count,
          lastPrintedAt: status === 'printed' ? new Date().toISOString() : i.lastPrintedAt,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showToast(`Đã cập nhật trạng thái in cho ${ids.length} mã QR!`);
  };

  // Callback when printing occurs from BatchPrintModal
  const handleConfirmBatchPrinted = (printedIds: string[]) => {
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((i) => {
        if (!printedIds.includes(i.id)) return i;
        return {
          ...i,
          printStatus: 'printed',
          printCount: (i.printCount || 0) + 1,
          lastPrintedAt: nowIso,
          updatedAt: nowIso,
        };
      })
    );
    showToast(`Đã ghi nhận in thành công ${printedIds.length} mã QR vào lịch sử!`);
  };

  // Reset demo data
  const handleResetDemoData = () => {
    if (confirm('Bạn có muốn tải lại 5 mục dữ liệu mẫu ban đầu?')) {
      setItems(INITIAL_SAMPLE_ITEMS);
      showToast('Đã khôi phục dữ liệu mẫu!');
    }
  };

  // Clear all items
  const handleClearAllData = () => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ mã QR trong danh sách. Bạn có chắc chắn không?')) {
      setItems([]);
      showToast('Đã xóa toàn bộ danh sách mã QR!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalItems={items.length}
        onOpenImportExport={() => setIsImportModalOpen(true)}
        onNewQR={() => {
          setEditingItem(null);
          setActiveTab('generator');
        }}
      />

      {/* Main App Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        
        {/* Tab 1: QR Generator & Single Print */}
        {activeTab === 'generator' && (
          <QRGenerator
            onSaveItem={handleSaveItem}
            onPrintSingle={(item) => setSinglePrintItem(item)}
            editingItem={editingItem}
            onCancelEdit={() => setEditingItem(null)}
          />
        )}

        {/* Tab 2: File Manager & Table Listing */}
        {activeTab === 'files' && (
          <FileManager
            items={items}
            onDeleteItem={handleDeleteItem}
            onDeleteMultiple={handleDeleteMultiple}
            onEditItem={(item) => setEditModalItem(item)}
            onDuplicateItem={handleDuplicateItem}
            onPrintSingle={(item) => setSinglePrintItem(item)}
            onBatchPrint={(selectedList) => {
              setIsBatchPrintModalOpen(true);
            }}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onNewQR={() => {
              setEditingItem(null);
              setActiveTab('generator');
            }}
            onUpdatePrintStatus={handleUpdatePrintStatus}
            onBatchUpdatePrintStatus={handleBatchUpdatePrintStatus}
          />
        )}

        {/* Tab 3: Direct Batch Print Sticker Sheet View */}
        {activeTab === 'batch-print' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center">
                  <Printer className="w-5 h-5 mr-2 text-indigo-600" />
                  In Bảng Tem Nhãn Dán Hàng Loạt (A4 Decal)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mẫu tem tiêu chuẩn Tomy 145, 135, 138, Decal 24 tem, khổ A4, tùy biến kích thước mm, phân trang tự động.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsBatchPrintModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm cursor-pointer"
                >
                  Mở Trình Xem In Toàn Màn Hình
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
                <p className="text-sm font-bold text-slate-700">Chưa có mã QR nào trong danh sách</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Hãy tạo mã mới hoặc nhập từ file trước khi in.</p>
                <button
                  onClick={() => setActiveTab('generator')}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl"
                >
                  Tạo Mã QR Ngay
                </button>
              </div>
            ) : (
              <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
                <BatchPrintModal
                  items={items}
                  isOpen={true}
                  onClose={() => setActiveTab('files')}
                  onUpdateCopies={handleUpdateCopies}
                  onConfirmPrinted={handleConfirmBatchPrinted}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info & Maintenance (no-print) */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Trình Tạo & Quản Lý Mã QR</span>
            <span>•</span>
            <span>Quản lý dữ liệu file CSV, JSON, TXT, ZIP</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleResetDemoData}
              className="text-slate-600 hover:text-indigo-600 font-medium flex items-center cursor-pointer"
              title="Tải lại 5 mã QR mẫu ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Khôi phục dữ liệu mẫu
            </button>

            <span>•</span>

            <button
              onClick={handleClearAllData}
              className="text-rose-600 hover:text-rose-800 font-medium flex items-center cursor-pointer"
              title="Xóa tất cả các mục"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Xóa sạch danh sách
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FileImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <PrintSingleModal
        item={singlePrintItem}
        isOpen={!!singlePrintItem}
        onClose={() => setSinglePrintItem(null)}
      />

      {activeTab !== 'batch-print' && isBatchPrintModalOpen && (
        <BatchPrintModal
          items={items}
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          onUpdateCopies={handleUpdateCopies}
          onConfirmPrinted={handleConfirmBatchPrinted}
        />
      )}

      <ItemEditModal
        item={editModalItem}
        isOpen={!!editModalItem}
        onClose={() => setEditModalItem(null)}
        onSave={handleSaveModalItem}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
