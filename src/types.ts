export type QRContentType = 
  | 'text' 
  | 'url' 
  | 'wifi' 
  | 'email' 
  | 'phone' 
  | 'sms' 
  | 'vcard' 
  | 'banking';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRStyleConfig {
  fgColor: string;
  bgColor: string;
  ecl: ErrorCorrectionLevel;
  margin: number;
  scale: number;
  logoType?: 'none' | 'icon' | 'custom';
  presetIcon?: 'link' | 'wifi' | 'mail' | 'phone' | 'shopping' | 'user' | 'location' | 'star' | 'heart' | 'zap';
  customLogoUrl?: string;
  logoSizePercent?: number; // default 20%
  frameText?: string;
  framePosition?: 'bottom' | 'top' | 'none';
  frameColor?: string;
  roundedDots?: boolean;
}

export type PrintStatus = 'never_printed' | 'printed' | 'needs_reprint';

export interface QRItem {
  id: string;
  title: string;
  content: string;
  type: QRContentType;
  category: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  style: QRStyleConfig;
  tags?: string[];
  printCopies?: number;
  // Print status and history
  printStatus?: PrintStatus;
  printCount?: number;
  lastPrintedAt?: string;
  printBatchNote?: string;
}

export interface WifiData {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface VCardData {
  fullName: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

export interface BankingData {
  bankId: string;
  accountNumber: string;
  accountName?: string;
  amount?: number;
  description?: string;
}

export interface ImportResult {
  total: number;
  successCount: number;
  failedCount: number;
  errors: string[];
  items: QRItem[];
}

export type DecalPreset = 
  | 'custom'
  | 'tomy145' // 38 x 21 mm (5 cols x 13 rows = 65 tem/trang)
  | 'tomy135' // 66 x 38 mm (3 cols x 7 rows = 21 tem/trang)
  | 'tomy138' // 99 x 38 mm (2 cols x 7 rows = 14 tem/trang)
  | 'grid24'  // 64 x 33.8 mm (3 cols x 8 rows = 24 tem/trang)
  | 'square40'// 40 x 40 mm (4 cols x 6 rows = 24 tem/trang)
  | 'standee' // 90 x 130 mm (2 cols x 2 rows = 4 bảng/trang)
  | 'badge';  // 85 x 54 mm (2 cols x 4 rows = 8 thẻ/trang)

export interface PrintSheetConfig {
  paperSize: 'a4' | 'a5' | 'letter';
  presetType: DecalPreset;
  columns: number;
  rowsPerPage: number;
  qrSizeMm: number; // QR code size in mm
  labelWidthMm: number;
  labelHeightMm: number;
  gapXMm: number;
  gapYMm: number;
  pageMarginTopMm: number;
  pageMarginSideMm: number;
  showTitle: boolean;
  showContent: boolean;
  showCategory: boolean;
  showIndexNumber: boolean;
  showBorder: boolean;
  showCutLines: boolean;
  fontSizePt: number;
  layoutStyle: 'standard' | 'badge' | 'minimal' | 'compact';
}
