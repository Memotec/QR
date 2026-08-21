import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Settings2, 
  Scissors, 
  Grid, 
  FileText, 
  Sparkles,
  Plus,
  Minus,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  CheckCircle2,
  AlertCircle,
  Hash
} from 'lucide-react';
import { QRItem, PrintSheetConfig, DecalPreset } from '../types';
import { renderQRToCanvas } from '../utils/qrUtils';

interface BatchPrintModalProps {
  items: QRItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCopies?: (id: string, copies: number) => void;
  onConfirmPrinted?: (printedIds: string[]) => void;
}

// Preset definitions for standard decal sheets
interface PresetSpec {
  id: DecalPreset;
  name: string;
  desc: string;
  columns: number;
  rowsPerPage: number;
  labelWidthMm: number;
  labelHeightMm: number;
  qrSizeMm: number;
  gapXMm: number;
  gapYMm: number;
  pageMarginTopMm: number;
  pageMarginSideMm: number;
  fontSizePt: number;
  defaultLayout: 'standard' | 'badge' | 'minimal' | 'compact';
}

const DECAL_PRESETS: PresetSpec[] = [
  {
    id: 'grid24',
    name: 'Decal 24 Tem (Chuẩn A4)',
    desc: '64 x 33.8 mm (3 cột x 8 hàng = 24 tem/trang)',
    columns: 3,
    rowsPerPage: 8,
    labelWidthMm: 64,
    labelHeightMm: 33.8,
    qrSizeMm: 24,
    gapXMm: 2.5,
    gapYMm: 1.5,
    pageMarginTopMm: 8,
    pageMarginSideMm: 6,
    fontSizePt: 8,
    defaultLayout: 'standard',
  },
  {
    id: 'tomy145',
    name: 'Decal Tomy 145 (65 Tem Mini)',
    desc: '38 x 21.2 mm (5 cột x 13 hàng = 65 tem/trang)',
    columns: 5,
    rowsPerPage: 13,
    labelWidthMm: 38,
    labelHeightMm: 21,
    qrSizeMm: 16,
    gapXMm: 2,
    gapYMm: 1,
    pageMarginTopMm: 7,
    pageMarginSideMm: 5,
    fontSizePt: 6.5,
    defaultLayout: 'compact',
  },
  {
    id: 'tomy135',
    name: 'Decal Tomy 135 (21 Tem)',
    desc: '66 x 38 mm (3 cột x 7 hàng = 21 tem/trang)',
    columns: 3,
    rowsPerPage: 7,
    labelWidthMm: 66,
    labelHeightMm: 38,
    qrSizeMm: 28,
    gapXMm: 3,
    gapYMm: 2,
    pageMarginTopMm: 10,
    pageMarginSideMm: 8,
    fontSizePt: 8.5,
    defaultLayout: 'standard',
  },
  {
    id: 'tomy138',
    name: 'Decal Tomy 138 (14 Tem Lớn)',
    desc: '99 x 38 mm (2 cột x 7 hàng = 14 tem/trang)',
    columns: 2,
    rowsPerPage: 7,
    labelWidthMm: 99,
    labelHeightMm: 38,
    qrSizeMm: 30,
    gapXMm: 4,
    gapYMm: 2,
    pageMarginTopMm: 10,
    pageMarginSideMm: 8,
    fontSizePt: 9,
    defaultLayout: 'standard',
  },
  {
    id: 'square40',
    name: 'Tem Vuông 40x40 mm (24 Tem)',
    desc: '40 x 40 mm (4 cột x 6 hàng = 24 tem/trang)',
    columns: 4,
    rowsPerPage: 6,
    labelWidthMm: 44,
    labelHeightMm: 44,
    qrSizeMm: 30,
    gapXMm: 3,
    gapYMm: 3,
    pageMarginTopMm: 8,
    pageMarginSideMm: 8,
    fontSizePt: 7.5,
    defaultLayout: 'minimal',
  },
  {
    id: 'badge',
    name: 'Thẻ Đeo / Namecard (8 Thẻ)',
    desc: '85 x 54 mm (2 cột x 4 hàng = 8 thẻ/trang)',
    columns: 2,
    rowsPerPage: 4,
    labelWidthMm: 90,
    labelHeightMm: 60,
    qrSizeMm: 38,
    gapXMm: 6,
    gapYMm: 6,
    pageMarginTopMm: 12,
    pageMarginSideMm: 10,
    fontSizePt: 10,
    defaultLayout: 'badge',
  },
  {
    id: 'standee',
    name: 'Standee Bàn Mini (4 Bảng)',
    desc: '95 x 135 mm (2 cột x 2 hàng = 4 bảng/trang)',
    columns: 2,
    rowsPerPage: 2,
    labelWidthMm: 95,
    labelHeightMm: 135,
    qrSizeMm: 65,
    gapXMm: 8,
    gapYMm: 8,
    pageMarginTopMm: 12,
    pageMarginSideMm: 10,
    fontSizePt: 12,
    defaultLayout: 'standard',
  },
  {
    id: 'custom',
    name: 'Tùy Chỉnh Tự Do (Custom mm)',
    desc: 'Tùy chỉnh số cột, số hàng và kích thước theo nhu cầu',
    columns: 3,
    rowsPerPage: 8,
    labelWidthMm: 60,
    labelHeightMm: 32,
    qrSizeMm: 24,
    gapXMm: 3,
    gapYMm: 2,
    pageMarginTopMm: 8,
    pageMarginSideMm: 6,
    fontSizePt: 8,
    defaultLayout: 'standard',
  },
];

// Single sticker cell component in print grid
const PrintStickerCell: React.FC<{
  item: QRItem;
  config: PrintSheetConfig;
  index: number;
}> = ({ item, config, index }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Calculate pixel size for high-DPI canvas
      const canvasPx = Math.max(120, config.qrSizeMm * 4.5);
      renderQRToCanvas(canvasRef.current, item.content, item.style, canvasPx);
    }
  }, [item, config.qrSizeMm, config.layoutStyle]);

  return (
    <div
      className={`avoid-break relative flex flex-col items-center justify-between bg-white text-center transition-all overflow-hidden ${
        config.showBorder ? 'border border-slate-300 rounded-sm' : ''
      } ${config.showCutLines ? 'border border-dashed border-slate-400' : ''}`}
      style={{
        width: `${config.labelWidthMm}mm`,
        height: `${config.labelHeightMm}mm`,
        padding: '1.5mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Optional Index Stamp */}
      {config.showIndexNumber && (
        <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400 select-none">
          #{index + 1}
        </span>
      )}

      {/* Top Title */}
      {config.showTitle && (
        <div
          className="font-bold text-slate-900 leading-tight w-full truncate px-0.5"
          style={{ fontSize: `${config.fontSizePt}pt` }}
          title={item.title}
        >
          {item.title}
        </div>
      )}

      {/* QR Canvas */}
      <div className="flex items-center justify-center my-auto">
        <canvas
          ref={canvasRef}
          className="h-auto object-contain block"
          style={{
            width: `${config.qrSizeMm}mm`,
            height: `${config.qrSizeMm}mm`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>

      {/* Footer Subtext or Category */}
      {(config.showContent || config.showCategory) && (
        <div className="w-full space-y-0.2 px-0.5 overflow-hidden">
          {config.showCategory && (
            <span
              className="inline-block px-1 py-0 rounded font-semibold bg-slate-100 text-slate-800 leading-none"
              style={{ fontSize: `${Math.max(5.5, config.fontSizePt - 2.5)}pt` }}
            >
              {item.category}
            </span>
          )}
          {config.showContent && (
            <div
              className="text-slate-600 font-mono truncate w-full leading-tight"
              style={{ fontSize: `${Math.max(5.5, config.fontSizePt - 2.5)}pt` }}
              title={item.content}
            >
              {item.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BatchPrintModal: React.FC<BatchPrintModalProps> = ({
  items,
  isOpen,
  onClose,
  onUpdateCopies,
  onConfirmPrinted,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<DecalPreset>('grid24');
  
  const [sheetConfig, setSheetConfig] = useState<PrintSheetConfig>({
    paperSize: 'a4',
    presetType: 'grid24',
    columns: 3,
    rowsPerPage: 8,
    qrSizeMm: 24,
    labelWidthMm: 64,
    labelHeightMm: 33.8,
    gapXMm: 2.5,
    gapYMm: 1.5,
    pageMarginTopMm: 8,
    pageMarginSideMm: 6,
    showTitle: true,
    showContent: true,
    showCategory: false,
    showIndexNumber: false,
    showBorder: true,
    showCutLines: false,
    fontSizePt: 8,
    layoutStyle: 'standard',
  });

  const [itemCopies, setItemCopies] = useState<Record<string, number>>({});
  const [activeTabSetting, setActiveTabSetting] = useState<'preset' | 'size' | 'display' | 'copies'>('preset');

  // Initialize copies from items
  useEffect(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = item.printCopies !== undefined ? item.printCopies : 1;
    });
    setItemCopies(initial);
  }, [items]);

  // Handle preset change
  const handleApplyPreset = (presetId: DecalPreset) => {
    setSelectedPreset(presetId);
    const spec = DECAL_PRESETS.find((p) => p.id === presetId);
    if (spec) {
      setSheetConfig((prev) => ({
        ...prev,
        presetType: presetId,
        columns: spec.columns,
        rowsPerPage: spec.rowsPerPage,
        labelWidthMm: spec.labelWidthMm,
        labelHeightMm: spec.labelHeightMm,
        qrSizeMm: spec.qrSizeMm,
        gapXMm: spec.gapXMm,
        gapYMm: spec.gapYMm,
        pageMarginTopMm: spec.pageMarginTopMm,
        pageMarginSideMm: spec.pageMarginSideMm,
        fontSizePt: spec.fontSizePt,
        layoutStyle: spec.defaultLayout,
      }));
    }
  };

  if (!isOpen) return null;

  // Flatten items according to requested copies
  const flattenedPrintList: { item: QRItem; originalIndex: number }[] = [];
  items.forEach((item, idx) => {
    const copies = itemCopies[item.id] !== undefined ? itemCopies[item.id] : 1;
    for (let c = 0; c < copies; c++) {
      flattenedPrintList.push({ item, originalIndex: idx });
    }
  });

  // Calculate items per page & paginate
  const itemsPerPage = Math.max(1, sheetConfig.columns * sheetConfig.rowsPerPage);
  const totalPages = Math.ceil(flattenedPrintList.length / itemsPerPage) || 1;

  // Split into A4 page chunks
  const pages: { item: QRItem; originalIndex: number }[][] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(flattenedPrintList.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
  }

  const handlePrint = () => {
    // Collect all printed item IDs that had > 0 copies
    const printedIds = Object.keys(itemCopies).filter((id) => (itemCopies[id] || 0) > 0);
    if (onConfirmPrinted && printedIds.length > 0) {
      onConfirmPrinted(printedIds);
    }
    window.print();
  };

  const handleCopyChange = (id: string, delta: number) => {
    setItemCopies((prev) => {
      const current = prev[id] !== undefined ? prev[id] : 1;
      const updated = Math.max(0, current + delta);
      if (onUpdateCopies) onUpdateCopies(id, updated);
      return { ...prev, [id]: updated };
    });
  };

  const handleSetAllCopies = (qty: number) => {
    const next: Record<string, number> = {};
    items.forEach((item) => {
      next[item.id] = qty;
      if (onUpdateCopies) onUpdateCopies(item.id, qty);
    });
    setItemCopies(next);
  };

  const handleSelectOnlyUnprinted = () => {
    const next: Record<string, number> = {};
    items.forEach((item) => {
      // If never printed or needs reprint, set to 1, otherwise 0
      const shouldPrint = !item.printStatus || item.printStatus === 'never_printed' || item.printStatus === 'needs_reprint';
      next[item.id] = shouldPrint ? (item.printCopies || 1) : 0;
      if (onUpdateCopies) onUpdateCopies(item.id, next[item.id]);
    });
    setItemCopies(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-7xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Top Modal Header */}
        <div className="no-print px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  In Hàng Loạt Trên Trang A4 (A4 Sheet Batch Print)
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-full">
                  Khổ A4 (210 x 297 mm)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tổng cộng <strong>{flattenedPrintList.length}</strong> tem nhãn • Chia đều trên <strong>{totalPages}</strong> trang A4
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={flattenedPrintList.length === 0}
              className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-sm transition-all cursor-pointer ring-2 ring-indigo-200"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              <span>In Ngay ({flattenedPrintList.length} Tem)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body: Config Tabs on Left (no-print) + Real A4 Preview on Right */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/70">
          
          {/* Controls Column (no-print) */}
          <div className="no-print lg:col-span-5 xl:col-span-4 space-y-4">
            
            {/* Tab switchers */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 grid grid-cols-4 gap-1 shadow-2xs">
              {[
                { id: 'preset', label: 'Mẫu Decal' },
                { id: 'size', label: 'Cỡ & Lưới' },
                { id: 'display', label: 'Hiển Thị' },
                { id: 'copies', label: `Số Lượng (${flattenedPrintList.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabSetting(tab.id as any)}
                  className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                    activeTabSetting === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: PRESET SELECTION */}
            {activeTabSetting === 'preset' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                    <Grid className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Chọn Mẫu Decal / Bố Cục A4
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {DECAL_PRESETS.length} mẫu có sẵn
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {DECAL_PRESETS.map((p) => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleApplyPreset(p.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-600 ring-1 ring-indigo-500'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-slate-900">{p.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                          </div>
                          <p className="text-[11px] text-slate-500">{p.desc}</p>
                          <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-600 pt-1">
                            <span>Mã QR: {p.qrSizeMm}mm</span>
                            <span>•</span>
                            <span>{p.columns} Cột x {p.rowsPerPage} Hàng</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SIZE & GRID CUSTOMIZATION */}
            {activeTabSetting === 'size' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <Sliders className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Tùy Biến Kích Thước & Khổ Giấy
                </h4>

                {/* QR Size Slider */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Kích thước mã QR:</span>
                    <span className="text-indigo-600 font-mono font-bold">{sheetConfig.qrSizeMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="80"
                    step="1"
                    value={sheetConfig.qrSizeMm}
                    onChange={(e) => {
                      setSelectedPreset('custom');
                      setSheetConfig({ ...sheetConfig, qrSizeMm: Number(e.target.value) });
                    }}
                    className="w-full cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>12mm (Tem nhỏ)</span>
                    <span>30mm (Vừa)</span>
                    <span>80mm (Standee)</span>
                  </div>
                </div>

                {/* Grid columns & rows */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số cột tem / hàng:
                    </label>
                    <select
                      value={sheetConfig.columns}
                      onChange={(e) => {
                        setSelectedPreset('custom');
                        setSheetConfig({ ...sheetConfig, columns: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6].map((c) => (
                        <option key={c} value={c}>{c} Cột</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số hàng / trang A4:
                    </label>
                    <select
                      value={sheetConfig.rowsPerPage}
                      onChange={(e) => {
                        setSelectedPreset('custom');
                        setSheetConfig({ ...sheetConfig, rowsPerPage: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16].map((r) => (
                        <option key={r} value={r}>{r} Hàng</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Label Dimensions (Width x Height mm) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chiều rộng tem (mm):
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="190"
                      value={sheetConfig.labelWidthMm}
                      onChange={(e) => {
                        setSelectedPreset('custom');
                        setSheetConfig({ ...sheetConfig, labelWidthMm: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chiều cao tem (mm):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="280"
                      value={sheetConfig.labelHeightMm}
                      onChange={(e) => {
                        setSelectedPreset('custom');
                        setSheetConfig({ ...sheetConfig, labelHeightMm: Number(e.target.value) });
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Margins & Gaps */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Khoảng cách tem (Gap mm):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={sheetConfig.gapXMm}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, gapXMm: Number(e.target.value), gapYMm: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lề trang A4 (Margin mm):
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="25"
                      value={sheetConfig.pageMarginTopMm}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, pageMarginTopMm: Number(e.target.value), pageMarginSideMm: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DISPLAY TOGGLES & TYPOGRAPHY */}
            {activeTabSetting === 'display' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <FileText className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Nội Dung & Chi Tiết Hiển Thị
                </h4>

                <div className="space-y-2.5 text-xs">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <span className="text-slate-800 font-semibold">In Tiêu Đề Mã QR</span>
                    <input
                      type="checkbox"
                      checked={sheetConfig.showTitle}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, showTitle: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <span className="text-slate-800 font-semibold">In Nội Dung Link / URL</span>
                    <input
                      type="checkbox"
                      checked={sheetConfig.showContent}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, showContent: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <span className="text-slate-800 font-semibold">In Danh Mục (Category)</span>
                    <input
                      type="checkbox"
                      checked={sheetConfig.showCategory}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, showCategory: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <span className="text-slate-800 font-semibold flex items-center">
                      <Hash className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Đánh Số Thứ Tự Tem (#1, #2...)
                    </span>
                    <input
                      type="checkbox"
                      checked={sheetConfig.showIndexNumber}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, showIndexNumber: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <span className="text-slate-800 font-semibold">Viền Khung Tem (Border)</span>
                    <input
                      type="checkbox"
                      checked={sheetConfig.showBorder}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, showBorder: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <span className="text-slate-800 font-semibold flex items-center">
                      <Scissors className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Đường Viền Nét Đứt Cắt Kéo
                    </span>
                    <input
                      type="checkbox"
                      checked={sheetConfig.showCutLines}
                      onChange={(e) => setSheetConfig({ ...sheetConfig, showCutLines: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Font Size slider */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-700">Cỡ chữ văn bản tem:</span>
                    <span className="text-indigo-600 font-mono font-bold">{sheetConfig.fontSizePt} pt</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="14"
                    step="0.5"
                    value={sheetConfig.fontSizePt}
                    onChange={(e) => setSheetConfig({ ...sheetConfig, fontSizePt: Number(e.target.value) })}
                    className="w-full cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: QUANTITY & COPIES PER ITEM */}
            {activeTabSetting === 'copies' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Số Lượng In Từng Mục
                  </h4>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleSetAllCopies(1)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                    >
                      Tất cả = 1
                    </button>
                    <button
                      onClick={() => handleSetAllCopies(5)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                    >
                      Tất cả = 5
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1 pb-1">
                  <button
                    onClick={handleSelectOnlyUnprinted}
                    className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center justify-center cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Chỉ chọn mã CHƯA IN
                  </button>
                  <button
                    onClick={() => handleSetAllCopies(0)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Xóa hết (0)
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 text-xs">
                  {items.map((item) => {
                    const qty = itemCopies[item.id] !== undefined ? itemCopies[item.id] : 1;
                    const isPrinted = item.printStatus === 'printed';
                    const needsReprint = item.printStatus === 'needs_reprint';

                    return (
                      <div key={item.id} className="pt-2 flex items-center justify-between">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="font-semibold text-slate-800 truncate" title={item.title}>
                            {item.title}
                          </div>
                          <div className="flex items-center space-x-1.5 text-[10px]">
                            {isPrinted && (
                              <span className="text-emerald-700 bg-emerald-50 px-1 rounded font-bold">
                                Đã in ({item.printCount || 1} lần)
                              </span>
                            )}
                            {needsReprint && (
                              <span className="text-amber-700 bg-amber-50 px-1 rounded font-bold">
                                Cần in lại
                              </span>
                            )}
                            {!isPrinted && !needsReprint && (
                              <span className="text-slate-400 bg-slate-100 px-1 rounded font-bold">
                                Chưa in
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => handleCopyChange(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={qty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setItemCopies((prev) => ({ ...prev, [item.id]: val }));
                              if (onUpdateCopies) onUpdateCopies(item.id, val);
                            }}
                            className="w-10 text-center font-bold text-slate-900 font-mono bg-slate-50 border border-slate-200 rounded py-0.5 text-xs"
                          />
                          <button
                            onClick={() => handleCopyChange(item.id, 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* REAL A4 SHEET PREVIEW (Right Column & Print Target) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center overflow-x-auto">
            
            {/* Sheet status bar on screen */}
            <div className="no-print w-full flex items-center justify-between mb-3 px-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center">
                <Layers className="w-4 h-4 mr-1 text-indigo-600" />
                Mô Phỏng Thực Tế: {totalPages} Trang A4 Chuẩn
              </span>
              <span>
                {sheetConfig.columns} Cột × {sheetConfig.rowsPerPage} Hàng = {itemsPerPage} tem/trang
              </span>
            </div>

            {/* Printable Container holding separate A4 pages */}
            <div className="printable-area w-full flex flex-col items-center space-y-6">
              {pages.map((pageItems, pageIdx) => (
                <div
                  key={`page-${pageIdx}`}
                  className="a4-page-sheet bg-white shadow-xl rounded-sm border border-slate-300 relative text-black overflow-hidden flex flex-col justify-start"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    paddingTop: `${sheetConfig.pageMarginTopMm}mm`,
                    paddingBottom: `${sheetConfig.pageMarginTopMm}mm`,
                    paddingLeft: `${sheetConfig.pageMarginSideMm}mm`,
                    paddingRight: `${sheetConfig.pageMarginSideMm}mm`,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Page header marker on screen */}
                  <div className="no-print absolute top-1 right-2 text-[9px] text-slate-400 font-mono font-bold">
                    TRANG A4: {pageIdx + 1} / {totalPages}
                  </div>

                  {/* Grid of stickers on this A4 page */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${sheetConfig.columns}, minmax(0, 1fr))`,
                      columnGap: `${sheetConfig.gapXMm}mm`,
                      rowGap: `${sheetConfig.gapYMm}mm`,
                      justifyItems: 'center',
                      alignItems: 'start',
                    }}
                  >
                    {pageItems.map((entry, itemIdx) => {
                      const globalIndex = pageIdx * itemsPerPage + itemIdx;
                      return (
                        <PrintStickerCell
                          key={`sticker-${pageIdx}-${itemIdx}-${entry.item.id}`}
                          item={entry.item}
                          config={sheetConfig}
                          index={globalIndex}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {flattenedPrintList.length === 0 && (
              <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-slate-300 w-full">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800">Chưa có tem nào được chọn để in</h4>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Hãy tăng số lượng tem ở tab "Số Lượng" hoặc bấm "Tất cả = 1".
                </p>
                <button
                  onClick={() => handleSetAllCopies(1)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Đặt Tất Cả Số Lượng = 1
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
