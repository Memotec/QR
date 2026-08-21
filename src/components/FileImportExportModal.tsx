import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Download,
  HelpCircle
} from 'lucide-react';
import { QRItem, ImportResult } from '../types';
import { 
  parseImportFile, 
  parseCsvContent, 
  parseJsonContent, 
  parseTxtContent,
  downloadSampleCsvTemplate,
  downloadSampleJsonTemplate,
  downloadSampleTxtTemplate 
} from '../utils/fileUtils';

interface FileImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedItems: QRItem[]) => void;
}

export const FileImportExportModal: React.FC<FileImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [rawPastedText, setRawPastedText] = useState('');
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json' | 'txt'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const result = await parseImportFile(file);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({
        total: 0,
        successCount: 0,
        failedCount: 1,
        errors: [`Lỗi đọc file: ${err.message}`],
        items: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleProcessPastedText = () => {
    if (!rawPastedText.trim()) return;
    setIsProcessing(true);
    try {
      let result: ImportResult;
      if (pasteFormat === 'json') result = parseJsonContent(rawPastedText);
      else if (pasteFormat === 'csv') result = parseCsvContent(rawPastedText);
      else result = parseTxtContent(rawPastedText);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({
        total: 0,
        successCount: 0,
        failedCount: 1,
        errors: [err.message],
        items: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (importResult && importResult.items.length > 0) {
      onImportSuccess(importResult.items);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Nhập Dữ Liệu Từ File
              </h3>
              <p className="text-xs text-slate-500">
                Hỗ trợ định dạng CSV (Excel), JSON, TXT hoặc dán trực tiếp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Tabs: File Upload vs Direct Paste */}
          <div className="flex border-b border-slate-200 space-x-4">
            <button
              onClick={() => { setActiveTab('upload'); setImportResult(null); }}
              className={`pb-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Tải Lên File (CSV, JSON, TXT)
            </button>
            <button
              onClick={() => { setActiveTab('paste'); setImportResult(null); }}
              className={`pb-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
                activeTab === 'paste'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Dán Dữ Liệu Trực Tiếp
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Kéo thả file vào đây hoặc <span className="text-indigo-600 underline">duyệt chọn từ máy</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Định dạng hỗ trợ: .csv, .json, .txt (Dung lượng tối đa 10MB)
                </p>
              </div>

              {/* Sample file download prompt */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-600 font-medium flex items-center">
                  <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Chưa có file mẫu chuẩn?
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={downloadSampleCsvTemplate}
                    className="text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    Tải Mẫu CSV (Excel)
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={downloadSampleJsonTemplate}
                    className="text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    Tải Mẫu JSON
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={downloadSampleTxtTemplate}
                    className="text-indigo-600 hover:underline font-bold cursor-pointer"
                  >
                    Tải Mẫu TXT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Paste Tab */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Chọn định dạng văn bản bạn dán:
                </label>
                <div className="flex items-center space-x-2">
                  {(['csv', 'json', 'txt'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setPasteFormat(fmt)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase cursor-pointer ${
                        pasteFormat === fmt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={6}
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                placeholder={
                  pasteFormat === 'csv'
                    ? "Tiêu đề,Nội dung,Danh mục\nWebsite Công Ty,https://example.com,Website\nWifi Tầng 1,WIFI:T:WPA;S:MyWifi;P:123456;;,Wifi"
                    : pasteFormat === 'txt'
                    ? "Website Công Ty | https://example.com | Website\nHotline | tel:0988123456 | Liên hệ"
                    : '[{"title": "Mã 1", "content": "https://example.com"}]'
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                onClick={handleProcessPastedText}
                disabled={!rawPastedText.trim() || isProcessing}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Đang phân tích...' : 'Phân Tích Dữ Liệu'}
              </button>
            </div>
          )}

          {/* Import Result & Preview */}
          {importResult && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    {importResult.successCount}
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Phát hiện hợp lệ: {importResult.successCount} mã QR
                  </span>
                </div>
                {importResult.failedCount > 0 && (
                  <span className="text-xs text-rose-600 font-medium">
                    {importResult.failedCount} dòng bị lỗi
                  </span>
                )}
              </div>

              {/* Error messages if any */}
              {importResult.errors.length > 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 max-h-24 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview table of items found */}
              {importResult.items.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Tiêu đề</th>
                        <th className="p-2">Nội dung</th>
                        <th className="p-2">Danh mục</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResult.items.slice(0, 50).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900 truncate max-w-[150px]">
                            {item.title}
                          </td>
                          <td className="p-2 font-mono text-slate-600 truncate max-w-[200px]">
                            {item.content}
                          </td>
                          <td className="p-2 text-slate-500">{item.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!importResult || importResult.items.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
          >
            Nhập {importResult ? importResult.items.length : 0} Mã QR Vào Hệ Thống
          </button>
        </div>
      </div>
    </div>
  );
};
