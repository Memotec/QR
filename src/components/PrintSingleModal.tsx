import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Layout, Sparkles, Sliders, Check } from 'lucide-react';
import { QRItem } from '../types';
import { renderQRToCanvas } from '../utils/qrUtils';

interface PrintSingleModalProps {
  item: QRItem | null;
  isOpen: boolean;
  onClose: () => void;
}

type PrintLayoutType = 'standee' | 'badge' | 'sticker' | 'minimal';

export const PrintSingleModal: React.FC<PrintSingleModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const [layoutType, setLayoutType] = useState<PrintLayoutType>('standee');
  const [customHeader, setCustomHeader] = useState('');
  const [customSubtext, setCustomSubtext] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (item) {
      setCustomHeader(item.title);
      setCustomSubtext(item.notes || item.content);
    }
  }, [item]);

  useEffect(() => {
    if (item && canvasRef.current) {
      renderQRToCanvas(canvasRef.current, item.content, item.style, 350);
    }
  }, [item, layoutType]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                In Mã QR Đơn Lẻ
              </h3>
              <p className="text-xs text-slate-500">
                Xem trước mẫu in standee đặt bàn, thẻ đeo hoặc tem dán
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer ring-2 ring-indigo-200"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>In Ngay (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Customizer Left (no-print) + Paper Preview Right */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-100/50">
          
          {/* Controls */}
          <div className="no-print md:col-span-5 space-y-4">
            
            {/* Format choice */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5 shadow-2xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn Mẫu Thiết Kế In:
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'standee', label: 'Standee Để Bàn', desc: 'Quầy thu ngân, Cafe, Bàn tiệc' },
                  { id: 'badge', label: 'Thẻ Đeo / Badge', desc: 'Thẻ nhân viên, Sự kiện' },
                  { id: 'sticker', label: 'Tem Nhãn Decal', desc: 'Dán sản phẩm, Hộp hàng' },
                  { id: 'minimal', label: 'Tối Giản', desc: 'Chỉ mã QR và tiêu đề' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLayoutType(t.id as PrintLayoutType)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      layoutType === t.id
                        ? 'bg-indigo-50/70 border-indigo-600 ring-1 ring-indigo-500 text-indigo-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Header & Subtext override */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nội Dung In Thêm:
              </label>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tiêu đề chính
                </label>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nội dung phụ / Lời kêu gọi
                </label>
                <input
                  type="text"
                  value={customSubtext}
                  onChange={(e) => setCustomSubtext(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Printable Layout Canvas Preview */}
          <div className="md:col-span-7 flex items-center justify-center">
            <div
              className="printable-area bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-sm w-full flex flex-col items-center text-center justify-between min-h-[420px]"
              id="single-printable-card"
            >
              {/* Standee Layout */}
              {layoutType === 'standee' && (
                <div className="w-full flex flex-col items-center justify-between h-full space-y-4">
                  <div className="border-b-2 border-slate-900 pb-2 w-full">
                    <div className="text-xs font-extrabold tracking-widest text-indigo-600 uppercase">
                      {item.category || 'QUÉT MÃ TRUY CẬP'}
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                      {customHeader || item.title}
                    </h2>
                  </div>

                  <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-sm my-2">
                    <canvas ref={canvasRef} className="w-48 h-auto object-contain rounded-lg" />
                  </div>

                  <div className="w-full pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">
                      {customSubtext || 'Sử dụng camera điện thoại hoặc Zalo để quét'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      {item.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Badge Card Layout */}
              {layoutType === 'badge' && (
                <div className="w-full flex flex-col items-center justify-between h-full space-y-3">
                  <div className="w-10 h-2 rounded-full bg-slate-300 mx-auto mb-1"></div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">{customHeader || item.title}</h2>
                    <span className="inline-block px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-300 rounded-xl my-2">
                    <canvas ref={canvasRef} className="w-44 h-auto object-contain rounded-lg" />
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    {customSubtext || item.content}
                  </div>
                </div>
              )}

              {/* Sticker Decal Layout */}
              {layoutType === 'sticker' && (
                <div className="w-full flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-400 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {customHeader || item.title}
                  </div>
                  <canvas ref={canvasRef} className="w-40 h-auto object-contain" />
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                    {customSubtext || item.content}
                  </div>
                </div>
              )}

              {/* Minimal Layout */}
              {layoutType === 'minimal' && (
                <div className="w-full flex flex-col items-center justify-center space-y-3">
                  <canvas ref={canvasRef} className="w-52 h-auto object-contain" />
                  <h3 className="text-sm font-bold text-slate-900">{customHeader || item.title}</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
