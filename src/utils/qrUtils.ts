import QRCode from 'qrcode';
import { QRStyleConfig, WifiData, VCardData, BankingData } from '../types';

export const DEFAULT_QR_STYLE: QRStyleConfig = {
  fgColor: '#0f172a',
  bgColor: '#ffffff',
  ecl: 'M',
  margin: 2,
  scale: 8,
  logoType: 'none',
  presetIcon: 'link',
  logoSizePercent: 22,
  frameText: '',
  framePosition: 'none',
  frameColor: '#0f172a',
  roundedDots: false,
};

// Formatter helpers for various QR content types
export function formatWifiString(wifi: WifiData): string {
  const enc = wifi.encryption;
  const pass = wifi.password ? `P:${wifi.password};` : '';
  const hidden = wifi.hidden ? 'H:true;' : '';
  return `WIFI:T:${enc};S:${wifi.ssid};${pass}${hidden};`;
}

export function formatVCardString(vcard: VCardData): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vcard.fullName}`,
    vcard.organization ? `ORG:${vcard.organization}` : '',
    vcard.title ? `TITLE:${vcard.title}` : '',
    vcard.phone ? `TEL:${vcard.phone}` : '',
    vcard.email ? `EMAIL:${vcard.email}` : '',
    vcard.website ? `URL:${vcard.website}` : '',
    vcard.address ? `ADR:;;${vcard.address};;;;` : '',
    'END:VCARD',
  ].filter(Boolean);
  return lines.join('\n');
}

export function formatVietQRQuickLink(banking: BankingData): string {
  // Using standard VietQR QuickLink format: https://img.vietqr.io/image/{bankId}-{accountNo}-compact2.png
  // Or plain transfer info string if offline
  if (banking.bankId && banking.accountNumber) {
    const bank = banking.bankId.toLowerCase();
    const acc = encodeURIComponent(banking.accountNumber);
    const params = new URLSearchParams();
    if (banking.amount) params.append('amount', banking.amount.toString());
    if (banking.description) params.append('addInfo', banking.description);
    if (banking.accountName) params.append('accountName', banking.accountName);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png${queryString}`;
  }
  return `BANK: ${banking.bankId} | ACC: ${banking.accountNumber} | NAME: ${banking.accountName || ''}`;
}

/**
 * Generates an SVG string representation of the QR code
 */
export async function generateQRSvg(text: string, style: Partial<QRStyleConfig> = {}): Promise<string> {
  const merged = { ...DEFAULT_QR_STYLE, ...style };
  return QRCode.toString(text || ' ', {
    type: 'svg',
    errorCorrectionLevel: merged.ecl,
    margin: merged.margin,
    color: {
      dark: merged.fgColor,
      light: merged.bgColor,
    },
  });
}

/**
 * Draws the QR code and custom overlays onto an HTMLCanvasElement
 */
export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  style: Partial<QRStyleConfig> = {},
  targetWidth = 500
): Promise<void> {
  const merged = { ...DEFAULT_QR_STYLE, ...style };
  const content = text && text.trim() ? text : 'https://google.com';

  const hasFrame = merged.framePosition && merged.framePosition !== 'none' && merged.frameText?.trim();
  const frameHeight = hasFrame ? 70 : 0;
  const qrCanvasSize = targetWidth;
  const totalHeight = qrCanvasSize + frameHeight;

  canvas.width = qrCanvasSize;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = merged.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Temporary canvas to generate raw QR code
  const tempCanvas = document.createElement('canvas');
  await QRCode.toCanvas(tempCanvas, content, {
    errorCorrectionLevel: merged.ecl,
    margin: merged.margin,
    width: qrCanvasSize,
    color: {
      dark: merged.fgColor,
      light: merged.bgColor,
    },
  });

  const qrY = hasFrame && merged.framePosition === 'top' ? frameHeight : 0;
  ctx.drawImage(tempCanvas, 0, qrY, qrCanvasSize, qrCanvasSize);

  // Render Center Logo/Icon if requested
  if (merged.logoType === 'custom' && merged.customLogoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = merged.customLogoUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      if (img.width > 0) {
        const logoSize = Math.floor(qrCanvasSize * ((merged.logoSizePercent || 22) / 100));
        const logoX = Math.floor((qrCanvasSize - logoSize) / 2);
        const logoY = qrY + Math.floor((qrCanvasSize - logoSize) / 2);

        // Draw background pill/box for logo
        ctx.fillStyle = merged.bgColor;
        ctx.beginPath();
        const pad = 6;
        ctx.roundRect(logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = merged.fgColor;
        ctx.stroke();

        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
      }
    } catch {
      // ignore image load errors gracefully
    }
  } else if (merged.logoType === 'icon' && merged.presetIcon) {
    const logoSize = Math.floor(qrCanvasSize * ((merged.logoSizePercent || 20) / 100));
    const logoX = Math.floor((qrCanvasSize - logoSize) / 2);
    const logoY = qrY + Math.floor((qrCanvasSize - logoSize) / 2);

    ctx.fillStyle = merged.bgColor;
    ctx.beginPath();
    const pad = 6;
    ctx.roundRect(logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 8);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = merged.fgColor;
    ctx.stroke();

    // Draw simple crisp vector icon in center
    ctx.fillStyle = merged.fgColor;
    ctx.strokeStyle = merged.fgColor;
    ctx.lineWidth = Math.max(2, Math.floor(logoSize / 12));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = logoX + logoSize / 2;
    const cy = logoY + logoSize / 2;
    const r = logoSize * 0.35;

    ctx.save();
    if (merged.presetIcon === 'wifi') {
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.4, r * 0.9, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.4, r * 0.5, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (merged.presetIcon === 'link') {
      ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy, r * 0.4, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + r * 0.3, cy, r * 0.4, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.3, cy);
      ctx.lineTo(cx + r * 0.3, cy);
      ctx.stroke();
    } else if (merged.presetIcon === 'mail') {
      const w = r * 1.4;
      const h = r * 1.0;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy - h / 2);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + w / 2, cy - h / 2);
      ctx.stroke();
    } else if (merged.presetIcon === 'phone') {
      const pw = r * 0.8;
      const ph = r * 1.4;
      ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
      ctx.beginPath();
      ctx.arc(cx, cy + ph / 2 - 4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (merged.presetIcon === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + Math.cos(a) * r * 0.9;
        const y = cy + Math.sin(a) * r * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (merged.presetIcon === 'heart') {
      ctx.beginPath();
      const hr = r * 0.8;
      ctx.moveTo(cx, cy + hr * 0.7);
      ctx.bezierCurveTo(cx - hr, cy - hr * 0.5, cx - hr * 0.8, cy - hr, cx, cy - hr * 0.3);
      ctx.bezierCurveTo(cx + hr * 0.8, cy - hr, cx + hr, cy - hr * 0.5, cx, cy + hr * 0.7);
      ctx.fill();
    } else {
      // Default dot badge
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw Frame Banner / Text
  if (hasFrame && merged.frameText) {
    const bannerColor = merged.frameColor || merged.fgColor;
    const bannerY = merged.framePosition === 'top' ? 0 : qrCanvasSize;

    // Draw banner bar
    ctx.fillStyle = bannerColor;
    ctx.fillRect(0, bannerY, canvas.width, frameHeight);

    // Text formatting
    ctx.fillStyle = merged.bgColor;
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Ellipsize text if too long
    let textToDraw = merged.frameText;
    const maxTextWidth = canvas.width - 32;
    if (ctx.measureText(textToDraw).width > maxTextWidth) {
      while (ctx.measureText(textToDraw + '...').width > maxTextWidth && textToDraw.length > 0) {
        textToDraw = textToDraw.slice(0, -1);
      }
      textToDraw += '...';
    }

    ctx.fillText(textToDraw, canvas.width / 2, bannerY + frameHeight / 2);
  }
}

/**
 * Returns a high-res PNG Data URL for an item
 */
export async function getQRDataUrl(
  text: string,
  style: Partial<QRStyleConfig> = {},
  resolution = 1000
): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderQRToCanvas(canvas, text, style, resolution);
  return canvas.toDataURL('image/png');
}

/**
 * Trigger download of image data
 */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Copy canvas / dataUrl image to clipboard
 */
export async function copyQRImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
