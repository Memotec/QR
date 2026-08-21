import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  FileText, 
  Wifi, 
  Phone, 
  Mail, 
  MessageSquare, 
  UserCheck, 
  CreditCard, 
  Printer, 
  Download, 
  Copy, 
  Save, 
  Check, 
  Palette, 
  Sliders, 
  ShieldCheck, 
  Tag, 
  Sparkles,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { QRContentType, QRItem, QRStyleConfig, WifiData, VCardData, BankingData } from '../types';
import { 
  DEFAULT_QR_STYLE, 
  renderQRToCanvas, 
  getQRDataUrl, 
  downloadDataUrl, 
  copyQRImageToClipboard,
  formatWifiString,
  formatVCardString,
  formatVietQRQuickLink,
  generateQRSvg
} from '../utils/qrUtils';

interface QRGeneratorProps {
  onSaveItem: (item: Omit<QRItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onPrintSingle: (item: QRItem) => void;
  editingItem?: QRItem | null;
  onCancelEdit?: () => void;
}

const COLOR_PRESETS = [
  { name: 'Cổ điển Đen / Trắng', fg: '#0f172a', bg: '#ffffff', frame: '#0f172a' },
  { name: 'Xanh Navy Doanh nghiệp', fg: '#1e3a8a', bg: '#eff6ff', frame: '#1e3a8a' },
  { name: 'Xanh Lá Tươi Mát', fg: '#14532d', bg: '#f0fdf4', frame: '#15803d' },
  { name: 'Đỏ Nổi Bật', fg: '#991b1b', bg: '#fef2f2', frame: '#b91c1c' },
  { name: 'Tím Công Nghệ', fg: '#581c87', bg: '#faf5ff', frame: '#6b21a8' },
  { name: 'Hổ Phách / Cafe', fg: '#78350f', bg: '#fffbeb', frame: '#92400e' },
  { name: 'Xám Tối Giản', fg: '#334155', bg: '#f8fafc', frame: '#1e293b' },
];

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  onSaveItem,
  onPrintSingle,
  editingItem,
  onCancelEdit,
}) => {
  const [contentType, setContentType] = useState<QRContentType>('url');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Chung');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Form Fields
  const [urlInput, setUrlInput] = useState('https://example.com');
  const [textInput, setTextInput] = useState('');
  const [wifiData, setWifiData] = useState<WifiData>({ ssid: '', password: '', encryption: 'WPA' });
  const [phoneInput, setPhoneInput] = useState('');
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [smsData, setSmsData] = useState({ phone: '', message: '' });
  const [vcardData, setVcardData] = useState<VCardData>({ fullName: '', organization: '', title: '', phone: '', email: '', website: '' });
  const [bankingData, setBankingData] = useState<BankingData>({ bankId: 'vcb', accountNumber: '', accountName: '', amount: undefined, description: '' });

  // Style State
  const [style, setStyle] = useState<QRStyleConfig>(DEFAULT_QR_STYLE);
  const [activeAccordion, setActiveAccordion] = useState<'content' | 'style' | 'frame' | 'logo'>('content');

  // Preview & Status
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load editing item if provided
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setContentType(editingItem.type);
      setCategory(editingItem.category);
      setNotes(editingItem.notes || '');
      setTagsInput((editingItem.tags || []).join(', '));
      if (editingItem.style) {
        setStyle({ ...DEFAULT_QR_STYLE, ...editingItem.style });
      }

      // Populate content inputs
      if (editingItem.type === 'url') setUrlInput(editingItem.content);
      else if (editingItem.type === 'text') setTextInput(editingItem.content);
      else if (editingItem.type === 'phone') setPhoneInput(editingItem.content.replace(/^tel:/, ''));
    }
  }, [editingItem]);

  // Compute final raw content string based on active type
  const getComputedContent = (): string => {
    switch (contentType) {
      case 'url':
        return urlInput.trim() || 'https://example.com';
      case 'text':
        return textInput.trim() || 'Nội dung mẫu';
      case 'wifi':
        return formatWifiString(wifiData);
      case 'phone':
        return phoneInput.trim() ? `tel:${phoneInput.trim()}` : 'tel:0988123456';
      case 'email':
        const mailParams = new URLSearchParams();
        if (emailData.subject) mailParams.append('subject', emailData.subject);
        if (emailData.body) mailParams.append('body', emailData.body);
        const mailQuery = mailParams.toString() ? `?${mailParams.toString()}` : '';
        return `mailto:${emailData.to || 'contact@example.com'}${mailQuery}`;
      case 'sms':
        return `smsto:${smsData.phone}:${smsData.message}`;
      case 'vcard':
        return formatVCardString(vcardData);
      case 'banking':
        return formatVietQRQuickLink(bankingData);
      default:
        return 'https://example.com';
    }
  };

  const computedContent = getComputedContent();

  // Re-render QR canvas whenever content or style changes
  useEffect(() => {
    if (canvasRef.current) {
      renderQRToCanvas(canvasRef.current, computedContent, style, 400);
    }
  }, [computedContent, style]);

  const handleDownloadPng = async () => {
    const dataUrl = await getQRDataUrl(computedContent, style, 1200);
    const safeTitle = (title || 'ma-qr').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    downloadDataUrl(dataUrl, `${safeTitle}.png`);
  };

  const handleDownloadSvg = async () => {
    const svgStr = await generateQRSvg(computedContent, style);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeTitle = (title || 'ma-qr').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    downloadDataUrl(url, `${safeTitle}.svg`);
  };

  const handleCopyClipboard = async () => {
    const dataUrl = await getQRDataUrl(computedContent, style, 800);
    const success = await copyQRImageToClipboard(dataUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    const finalTitle = title.trim() || `Mã QR ${contentType.toUpperCase()}`;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSaveItem({
      title: finalTitle,
      content: computedContent,
      type: contentType,
      category: category.trim() || 'Chung',
      notes: notes.trim(),
      style,
      tags,
      printCopies: 1,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDirectPrint = () => {
    const tempItem: QRItem = {
      id: editingItem ? editingItem.id : 'temp-preview',
      title: title.trim() || 'Mã QR In Ấn',
      content: computedContent,
      type: contentType,
      category: category || 'Chung',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      style,
      printCopies: 1,
    };
    onPrintSingle(tempItem);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Form & Customizer (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Content Type Selector */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-2"></span>
              1. Chọn Loại Nội Dung QR
            </h2>
            {editingItem && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                Đang chỉnh sửa: {editingItem.title}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { type: 'url', label: 'Website / Link', icon: Globe },
              { type: 'text', label: 'Văn bản', icon: FileText },
              { type: 'wifi', label: 'Wifi', icon: Wifi },
              { type: 'phone', label: 'Số Điện Thoại', icon: Phone },
              { type: 'email', label: 'Email', icon: Mail },
              { type: 'sms', label: 'Tin Nhắn SMS', icon: MessageSquare },
              { type: 'vcard', label: 'Danh Thiếp (vCard)', icon: UserCheck },
              { type: 'banking', label: 'Chuyển Khoản Bank', icon: CreditCard },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = contentType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setContentType(item.type as QRContentType)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className="text-center">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Content Inputs */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            {contentType === 'url' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Đường dẫn Website / URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            )}

            {contentType === 'text' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nội dung văn bản <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Nhập thông điệp, hướng dẫn hoặc ghi chú..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            )}

            {contentType === 'wifi' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên mạng Wifi (SSID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={wifiData.ssid}
                    onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                    placeholder="VD: VanPhong_Tang1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mật khẩu Wifi
                    </label>
                    <input
                      type="text"
                      value={wifiData.password || ''}
                      onChange={(e) => setWifiData({ ...wifiData, password: e.target.value })}
                      placeholder="Mật khẩu (nếu có)"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Loại bảo mật
                    </label>
                    <select
                      value={wifiData.encryption}
                      onChange={(e) => setWifiData({ ...wifiData, encryption: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Không mật khẩu (Mạng mở)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {contentType === 'phone' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="VD: 0988123456 hoặc +84988123456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {contentType === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Địa chỉ Email nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                    placeholder="contact@company.vn"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tiêu đề thư
                    </label>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                      placeholder="Liên hệ tư vấn"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nội dung mẫu
                    </label>
                    <input
                      type="text"
                      value={emailData.body}
                      onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                      placeholder="Xin chào, tôi cần hỗ trợ..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {contentType === 'sms' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Số điện thoại nhận tin
                  </label>
                  <input
                    type="tel"
                    value={smsData.phone}
                    onChange={(e) => setSmsData({ ...smsData, phone: e.target.value })}
                    placeholder="0988123456"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nội dung tin nhắn SMS
                  </label>
                  <textarea
                    rows={2}
                    value={smsData.message}
                    onChange={(e) => setSmsData({ ...smsData, message: e.target.value })}
                    placeholder="Soan tin gui tong dai..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {contentType === 'vcard' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vcardData.fullName}
                      onChange={(e) => setVcardData({ ...vcardData, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Công ty / Tổ chức
                    </label>
                    <input
                      type="text"
                      value={vcardData.organization || ''}
                      onChange={(e) => setVcardData({ ...vcardData, organization: e.target.value })}
                      placeholder="Công ty TNHH ABC"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={vcardData.phone || ''}
                      onChange={(e) => setVcardData({ ...vcardData, phone: e.target.value })}
                      placeholder="0988123456"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={vcardData.email || ''}
                      onChange={(e) => setVcardData({ ...vcardData, email: e.target.value })}
                      placeholder="a.nguyen@company.vn"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {contentType === 'banking' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Ngân Hàng
                    </label>
                    <select
                      value={bankingData.bankId}
                      onChange={(e) => setBankingData({ ...bankingData, bankId: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="vcb">Vietcombank (VCB)</option>
                      <option value="tcb">Techcombank (TCB)</option>
                      <option value="mbb">MB Bank (Quân Đội)</option>
                      <option value="bidv">BIDV</option>
                      <option value="vpb">VPBank</option>
                      <option value="acb">ACB</option>
                      <option value="tpbank">TPBank</option>
                      <option value="vietinbank">VietinBank</option>
                      <option value="hdbank">HDBank</option>
                      <option value="sacombank">Sacombank</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Số Tài Khoản <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankingData.accountNumber}
                      onChange={(e) => setBankingData({ ...bankingData, accountNumber: e.target.value })}
                      placeholder="VD: 001100123456"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tên chủ tài khoản
                    </label>
                    <input
                      type="text"
                      value={bankingData.accountName || ''}
                      onChange={(e) => setBankingData({ ...bankingData, accountName: e.target.value.toUpperCase() })}
                      placeholder="NGUYEN VAN A"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Số tiền (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={bankingData.amount || ''}
                      onChange={(e) => setBankingData({ ...bankingData, amount: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="VD: 100000"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata info: Title, Category, Notes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-2"></span>
            2. Thông Tin Quản Lý & Phân Loại
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tiêu đề mã QR <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Menu Bàn 01, Wifi Khách Hàng, Tem Máy In..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Danh mục / Nhóm
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="VD: Website, Wifi, Sản phẩm, Sự kiện..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Thẻ (Tags, cách nhau dấu phẩy)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="decal, quang-cao, 2026..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ghi chú nội bộ
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vị trí dán, hạn sử dụng..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Customization Options: Colors, Frame, Center Icon, ECL */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 mr-2"></span>
              3. Tùy Chỉnh Màu Sắc, Khung & Icon
            </h2>
            <button
              onClick={() => setStyle(DEFAULT_QR_STYLE)}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium flex items-center cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Mặc định
            </button>
          </div>

          {/* Preset Palettes */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Bảng màu gợi ý:</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStyle({
                    ...style,
                    fgColor: preset.fg,
                    bgColor: preset.bg,
                    frameColor: preset.frame,
                  })}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: preset.fg }} />
                  <span className="text-slate-700">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Màu Mã QR</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={style.fgColor}
                  onChange={(e) => setStyle({ ...style, fgColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={style.fgColor}
                  onChange={(e) => setStyle({ ...style, fgColor: e.target.value })}
                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Màu Nền</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={style.bgColor}
                  onChange={(e) => setStyle({ ...style, bgColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={style.bgColor}
                  onChange={(e) => setStyle({ ...style, bgColor: e.target.value })}
                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mức Sửa Lỗi</label>
              <select
                value={style.ecl}
                onChange={(e) => setStyle({ ...style, ecl: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium"
              >
                <option value="L">L (7% phục hồi)</option>
                <option value="M">M (15% phục hồi - chuẩn)</option>
                <option value="Q">Q (25% phục hồi)</option>
                <option value="H">H (30% phục hồi - khuyên dùng in tem)</option>
              </select>
            </div>
          </div>

          {/* Frame / Banner Text */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center">
                <Tag className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Khung Viền & Nhãn Banner Chữ
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setStyle({ ...style, framePosition: 'none' })}
                  className={`px-2 py-1 text-xs rounded font-medium cursor-pointer ${
                    style.framePosition === 'none' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  Tắt
                </button>
                <button
                  type="button"
                  onClick={() => setStyle({ ...style, framePosition: 'bottom', frameText: style.frameText || 'QUÉT TÔI NGAY' })}
                  className={`px-2 py-1 text-xs rounded font-medium cursor-pointer ${
                    style.framePosition === 'bottom' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  Dưới đáy
                </button>
                <button
                  type="button"
                  onClick={() => setStyle({ ...style, framePosition: 'top', frameText: style.frameText || 'QUÉT MÃ ĐỂ XEM' })}
                  className={`px-2 py-1 text-xs rounded font-medium cursor-pointer ${
                    style.framePosition === 'top' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'
                  }`}
                >
                  Trên đỉnh
                </button>
              </div>
            </div>

            {style.framePosition && style.framePosition !== 'none' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={style.frameText || ''}
                    onChange={(e) => setStyle({ ...style, frameText: e.target.value })}
                    placeholder="VD: QUÉT TÔI, XEM MENU, KẾT NỐI WIFI..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={style.frameColor || style.fgColor}
                      onChange={(e) => setStyle({ ...style, frameColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-slate-500">Màu banner</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center Icon/Logo */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Biểu Tượng / Logo Ở Giữa
            </label>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => setStyle({ ...style, logoType: 'none' })}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium border cursor-pointer ${
                  style.logoType === 'none' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                Không có
              </button>

              {(['link', 'wifi', 'mail', 'phone', 'star', 'heart'] as const).map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setStyle({ ...style, logoType: 'icon', presetIcon: icon })}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium border capitalize cursor-pointer ${
                    style.logoType === 'icon' && style.presetIcon === icon
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Icon {icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Preview, Quick Print & Export Actions (5 cols) */}
      <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              Xem Trước Mã QR
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ECL: {style.ecl}
            </span>
          </div>

          {/* QR Canvas Box */}
          <div className="bg-slate-100/70 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-200/80 min-h-[340px]">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg transition-all"
                style={{ width: '260px', height: 'auto' }}
              />
            </div>

            <p className="text-xs font-semibold text-slate-700 mt-3 text-center truncate max-w-[280px]">
              {title || 'Mã QR Chưa Đặt Tên'}
            </p>
            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
              {computedContent}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-5 space-y-2.5">
            {/* Direct Print Button */}
            <button
              onClick={handleDirectPrint}
              className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer ring-2 ring-indigo-200"
            >
              <Printer className="w-5 h-5 mr-2" />
              <span>In Mã QR Này (In Thẻ / Tem Decal)</span>
            </button>

            {/* Save to Manager / File Button */}
            <button
              onClick={handleSave}
              className={`w-full flex items-center justify-center px-4 py-2.5 font-bold text-sm rounded-xl border transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                  <span>Đã Lưu Vào Danh Sách Quản Lý!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>{editingItem ? 'Cập Nhật Mã QR Này' : 'Lưu Vào Quản Lý File'}</span>
                </>
              )}
            </button>

            {editingItem && onCancelEdit && (
              <button
                onClick={onCancelEdit}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                Hủy chế độ chỉnh sửa
              </button>
            )}

            {/* Export & Copy Row */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={handleDownloadPng}
                className="flex items-center justify-center px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="Tải ảnh PNG độ nét cao"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                <span>Tải PNG</span>
              </button>

              <button
                onClick={handleDownloadSvg}
                className="flex items-center justify-center px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                title="Tải vector SVG để thiết kế in ấn"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                <span>Tải SVG</span>
              </button>

              <button
                onClick={handleCopyClipboard}
                className={`flex items-center justify-center px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  copied
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
                title="Sao chép ảnh vào bộ nhớ tạm"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1 text-slate-600" />}
                <span>{copied ? 'Đã Chép' : 'Chép Ảnh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-indigo-50/60 rounded-xl p-4 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
          <p className="font-bold flex items-center text-indigo-950">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Mẹo in ấn chất lượng cao:
          </p>
          <p className="text-indigo-800">
            • Để in tem dán hoặc standee quầy thu ngân, nên chọn mức sửa lỗi <strong>H (30%)</strong> để mã luôn quét nhạy kể cả khi bị xước nhẹ.
          </p>
          <p className="text-indigo-800">
            • Bạn có thể nhập danh sách hàng loạt từ file Excel/CSV qua mục <strong>Quản Lý File</strong> phía trên.
          </p>
        </div>
      </div>
    </div>
  );
};
