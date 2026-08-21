import React from 'react';
import { QrCode, FileSpreadsheet, Printer, PlusCircle, Upload, Download, Sparkles, FolderArchive } from 'lucide-react';

interface HeaderProps {
  activeTab: 'generator' | 'files' | 'batch-print';
  setActiveTab: (tab: 'generator' | 'files' | 'batch-print') => void;
  totalItems: number;
  onOpenImportExport: () => void;
  onNewQR: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalItems,
  onOpenImportExport,
  onNewQR,
}) => {
  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-100">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Trình Tạo & Quản Lý Mã QR
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sparkles className="w-3 h-3 mr-1" />
                  In Ấn & Quản Lý File
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Nhập nội dung, tùy biến in tem nhãn và xuất nhập dữ liệu file (CSV, JSON, TXT, ZIP)
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              onClick={onOpenImportExport}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-2xs"
              title="Nhập xuất file CSV, JSON, TXT, ZIP"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-slate-600" />
              <span>Quản lý File</span>
            </button>

            <button
              onClick={() => setActiveTab('batch-print')}
              className="inline-flex items-center px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer shadow-2xs"
              title="In bảng tem nhãn dán hàng loạt trên giấy A4"
            >
              <Printer className="w-4 h-4 mr-1.5 text-indigo-600" />
              <span>In Tem ({totalItems})</span>
            </button>

            <button
              onClick={onNewQR}
              className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Tạo Mã Mới</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-t border-slate-100 -mb-px space-x-6">
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'generator'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Tạo & In Mã QR</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'files'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Danh Sách & Quản Lý File ({totalItems})</span>
          </button>

          <button
            onClick={() => setActiveTab('batch-print')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'batch-print'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>In Bảng Tem Hàng Loạt (A4 Decal)</span>
          </button>
        </div>
      </div>
    </header>
  );
};
