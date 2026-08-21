/**
 * ==========================================================================
 * QR CONTENT MANAGER - MAIN APPLICATION SCRIPT (app.js)
 * ES6+ Vanilla JavaScript, LocalStorage Persistence, QRCode.js Integration
 * ==========================================================================
 */

(function () {
  'use strict';

  // Constants & Storage Keys
  const STORAGE_KEY = 'qr_content_manager_v1';

  // Default Sample Data
  const INITIAL_SAMPLE_DATA = [
    {
      id: 'QR-0001',
      title: 'Thiết bị VHF Park Air',
      content: 'VHF TX Park Air T6\nFrequency: 134.050 MHz\nLocation: Phu Quoc',
      note: 'Thiết bị tại Phú Quốc',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'QR-0002',
      title: 'Nokia 7250 IXR',
      content: 'Device: Nokia 7250 IXR\nRole: Network Router',
      note: 'Thiết bị mạng trung tâm',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'QR-0003',
      title: 'VCS SITTI M800IP',
      content: 'System: SITTI MULTIFONO M800IP\nProtocol: ED-137\nSystem: VCCS',
      note: 'Hệ thống điều hành thoại không lưu',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Application State
  let appState = {
    items: [],
    editingId: null, // null means "Create Mode", string ID means "Edit Mode"
    searchTerm: '',
    qrInstance: null,
  };

  // DOM Elements Cache
  const dom = {
    // Stats
    statTotal: document.getElementById('stat-total'),
    statToday: document.getElementById('stat-today'),
    statFiltered: document.getElementById('stat-filtered'),

    // Form
    form: document.getElementById('qr-form'),
    inputId: document.getElementById('input-id'),
    inputTitle: document.getElementById('input-title'),
    inputContent: document.getElementById('input-content'),
    inputNote: document.getElementById('input-note'),
    btnAutoId: document.getElementById('btn-auto-id'),
    btnNew: document.getElementById('btn-new'),
    btnSave: document.getElementById('btn-save'),
    btnUpdate: document.getElementById('btn-update'),
    btnDeleteCurrent: document.getElementById('btn-delete-current'),
    formModeBadge: document.getElementById('form-mode-badge'),

    // QR Preview
    qrContainer: document.getElementById('qrcode-container'),
    qrPlaceholder: document.getElementById('qr-placeholder'),
    previewId: document.getElementById('preview-id'),
    previewTitle: document.getElementById('preview-title'),
    previewContent: document.getElementById('preview-content'),
    btnDownloadPng: document.getElementById('btn-download-png'),
    btnPrintSingle: document.getElementById('btn-print-single'),

    // Table & Search
    searchInput: document.getElementById('search-input'),
    tableBody: document.getElementById('table-body'),
    emptyState: document.getElementById('empty-state'),
    tableCountInfo: document.getElementById('table-count-info'),
    btnPrintAll: document.getElementById('btn-print-all'),

    // Backup / Restore
    btnExportJson: document.getElementById('btn-export-json'),
    btnImportJson: document.getElementById('btn-import-json'),
    fileInputJson: document.getElementById('file-input-json'),

    // Toast Container & Print Target Area
    toastContainer: document.getElementById('toast-container'),
    printTargetArea: document.getElementById('print-target-area'),
  };

  // ==========================================================================
  // UTILITY & SECURITY FUNCTIONS
  // ==========================================================================

  /**
   * Escape HTML to prevent XSS injection attacks.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sanitize string for clean filenames in download.
   */
  function sanitizeFilename(str) {
    if (!str) return 'qrcode';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics for cross-platform filenames
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  /**
   * Format ISO date string to localized Vietnamese format.
   */
  function formatDate(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  }

  /**
   * Toast Notification Dispatcher.
   */
  function showToast(message, type = 'success') {
    if (!dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '✔';
    if (type === 'danger') icon = '✖';
    if (type === 'warning') icon = '⚠';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 3200);
  }

  // ==========================================================================
  // STORAGE & DATA MANAGEMENT
  // ==========================================================================

  function loadDataFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          appState.items = parsed;
          return;
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc LocalStorage:', err);
    }

    // Default if empty or invalid
    appState.items = [...INITIAL_SAMPLE_DATA];
    saveDataToStorage(false);
  }

  function saveDataToStorage(notify = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.items));
      if (notify) {
        // quiet save
      }
    } catch (err) {
      console.error('Lỗi khi lưu LocalStorage:', err);
      showToast('Lỗi khi ghi dữ liệu vào trình duyệt', 'danger');
    }
  }

  /**
   * Generate Next Sequential ID: QR-0001, QR-0002, etc.
   */
  function generateNextId() {
    let maxNum = 0;
    const regex = /^QR-(\d+)$/i;

    appState.items.forEach((item) => {
      const match = item.id.trim().match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `QR-${String(nextNum).padStart(4, '0')}`;
  }

  // ==========================================================================
  // QR CODE GENERATION ENGINE
  // ==========================================================================

  /**
   * Render QR Code into preview box in realtime.
   */
  function renderLiveQR(content, id = '', title = '') {
    const trimmedContent = (content || '').trim();

    if (!trimmedContent) {
      if (dom.qrContainer) dom.qrContainer.innerHTML = '';
      if (dom.qrPlaceholder) dom.qrPlaceholder.classList.remove('hidden');
      if (dom.previewId) dom.previewId.textContent = id || 'QR-XXXX';
      if (dom.previewTitle) dom.previewTitle.textContent = title || 'Chưa có tiêu đề';
      if (dom.previewContent) dom.previewContent.textContent = 'Hãy nhập nội dung để tạo mã QR tự động';
      return;
    }

    if (dom.qrPlaceholder) dom.qrPlaceholder.classList.add('hidden');
    if (dom.qrContainer) dom.qrContainer.innerHTML = '';

    // Create high-clarity QR Code instance
    try {
      new QRCode(dom.qrContainer, {
        text: trimmedContent,
        width: 200,
        height: 200,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } catch (err) {
      console.error('Lỗi tạo QRCode:', err);
    }

    if (dom.previewId) dom.previewId.textContent = id || 'QR-XXXX';
    if (dom.previewTitle) dom.previewTitle.textContent = title || 'Chưa có tiêu đề';
    if (dom.previewContent) dom.previewContent.textContent = trimmedContent;
  }

  /**
   * Helper: Generate a standalone Canvas for high-res PNG download or print.
   */
  function generateQRCanvasAsync(content, size = 600) {
    return new Promise((resolve, reject) => {
      const tempDiv = document.createElement('div');
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);

      try {
        const qr = new QRCode(tempDiv, {
          text: content,
          width: size,
          height: size,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        });

        setTimeout(() => {
          const canvas = tempDiv.querySelector('canvas');
          if (canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            document.body.removeChild(tempDiv);
            resolve(dataUrl);
          } else {
            const img = tempDiv.querySelector('img');
            if (img && img.src) {
              document.body.removeChild(tempDiv);
              resolve(img.src);
            } else {
              document.body.removeChild(tempDiv);
              reject(new Error('Không tìm thấy canvas QR'));
            }
          }
        }, 80);
      } catch (e) {
        document.body.removeChild(tempDiv);
        reject(e);
      }
    });
  }

  // ==========================================================================
  // DASHBOARD RENDER & TABLE LOGIC
  // ==========================================================================

  function getFilteredItems() {
    const term = appState.searchTerm.toLowerCase().trim();
    if (!term) return appState.items;

    return appState.items.filter((item) => {
      return (
        item.id.toLowerCase().includes(term) ||
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.content && item.content.toLowerCase().includes(term)) ||
        (item.note && item.note.toLowerCase().includes(term))
      );
    });
  }

  function updateStats() {
    const total = appState.items.length;
    const filtered = getFilteredItems().length;

    // Count items created today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = appState.items.filter((item) => {
      return item.createdAt && item.createdAt.startsWith(todayStr);
    }).length;

    if (dom.statTotal) dom.statTotal.textContent = total;
    if (dom.statToday) dom.statToday.textContent = todayCount;
    if (dom.statFiltered) dom.statFiltered.textContent = filtered;
    if (dom.tableCountInfo) dom.tableCountInfo.textContent = `Hiển thị ${filtered} / ${total} bản ghi`;
  }

  function renderTable() {
    const filteredItems = getFilteredItems();
    updateStats();

    if (!dom.tableBody) return;
    dom.tableBody.innerHTML = '';

    if (filteredItems.length === 0) {
      if (dom.emptyState) dom.emptyState.classList.remove('hidden');
      return;
    }

    if (dom.emptyState) dom.emptyState.classList.add('hidden');

    filteredItems.forEach((item) => {
      const tr = document.createElement('tr');
      tr.id = `row-${item.id}`;
      if (appState.editingId === item.id) {
        tr.style.backgroundColor = 'var(--primary-100)';
      }

      tr.innerHTML = `
        <td class="td-id">${escapeHtml(item.id)}</td>
        <td class="td-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title || '—')}</td>
        <td class="td-content" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</td>
        <td class="td-date">${formatDate(item.updatedAt || item.createdAt)}</td>
        <td class="td-actions">
          <div class="row-actions-group">
            <button type="button" class="btn btn-subtle btn-sm btn-action-view" data-id="${escapeHtml(item.id)}" title="Xem mã QR">
              👁 Xem
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-action-edit" data-id="${escapeHtml(item.id)}" title="Sửa nội dung">
              ✏ Sửa
            </button>
            <button type="button" class="btn btn-subtle btn-sm btn-action-print" data-id="${escapeHtml(item.id)}" title="In tem này">
              🖨 In
            </button>
            <button type="button" class="btn btn-danger btn-sm btn-action-delete" data-id="${escapeHtml(item.id)}" title="Xóa bản ghi">
              🗑 Xóa
            </button>
          </div>
        </td>
      `;

      dom.tableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // FORM ACTIONS & CRUD
  // ==========================================================================

  function resetFormToNew() {
    appState.editingId = null;
    const newId = generateNextId();

    dom.inputId.value = newId;
    dom.inputTitle.value = '';
    dom.inputContent.value = '';
    dom.inputNote.value = '';

    dom.btnSave.classList.remove('hidden');
    dom.btnUpdate.classList.add('hidden');
    dom.btnDeleteCurrent.classList.add('hidden');
    dom.formModeBadge.textContent = 'Thêm Mới';
    dom.formModeBadge.className = 'card-badge';

    renderLiveQR('', newId, '');
    renderTable();
  }

  function loadItemIntoForm(id) {
    const item = appState.items.find((i) => i.id === id);
    if (!item) return;

    appState.editingId = item.id;

    dom.inputId.value = item.id;
    dom.inputTitle.value = item.title || '';
    dom.inputContent.value = item.content || '';
    dom.inputNote.value = item.note || '';

    dom.btnSave.classList.add('hidden');
    dom.btnUpdate.classList.remove('hidden');
    dom.btnDeleteCurrent.classList.remove('hidden');
    dom.formModeBadge.textContent = `Đang Sửa (${item.id})`;
    dom.formModeBadge.className = 'card-badge';
    dom.formModeBadge.style.background = 'var(--warning-50)';
    dom.formModeBadge.style.color = 'var(--warning-600)';

    renderLiveQR(item.content, item.id, item.title);
    renderTable();

    // Scroll to form smoothly
    dom.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSaveNew() {
    const id = dom.inputId.value.trim();
    const title = dom.inputTitle.value.trim();
    const content = dom.inputContent.value.trim();
    const note = dom.inputNote.value.trim();

    // Validation
    if (!content) {
      showToast('Lỗi dữ liệu: Nội dung QR không được để trống!', 'danger');
      dom.inputContent.focus();
      return;
    }

    if (!id) {
      showToast('Lỗi dữ liệu: Mã ID không được để trống!', 'danger');
      dom.inputId.focus();
      return;
    }

    // Check duplicate ID
    const exists = appState.items.some((i) => i.id.toLowerCase() === id.toLowerCase());
    if (exists) {
      showToast(`Lỗi dữ liệu: Mã ID "${id}" đã tồn tại! Vui lòng đổi ID khác.`, 'danger');
      dom.inputId.focus();
      return;
    }

    const nowIso = new Date().toISOString();
    const newItem = {
      id,
      title,
      content,
      note,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    appState.items.unshift(newItem);
    saveDataToStorage();
    renderTable();
    showToast('Đã lưu thành công!', 'success');
    resetFormToNew();
  }

  function handleUpdateExisting() {
    if (!appState.editingId) return;

    const id = dom.inputId.value.trim();
    const title = dom.inputTitle.value.trim();
    const content = dom.inputContent.value.trim();
    const note = dom.inputNote.value.trim();

    // Validation
    if (!content) {
      showToast('Lỗi dữ liệu: Nội dung QR không được để trống!', 'danger');
      dom.inputContent.focus();
      return;
    }

    if (!id) {
      showToast('Lỗi dữ liệu: Mã ID không được để trống!', 'danger');
      dom.inputId.focus();
      return;
    }

    // If ID was modified, verify it does not clash with another record
    if (id.toLowerCase() !== appState.editingId.toLowerCase()) {
      const exists = appState.items.some(
        (i) => i.id.toLowerCase() === id.toLowerCase() && i.id !== appState.editingId
      );
      if (exists) {
        showToast(`Lỗi dữ liệu: Mã ID "${id}" đã tồn tại trên một bản ghi khác!`, 'danger');
        dom.inputId.focus();
        return;
      }
    }

    const itemIndex = appState.items.findIndex((i) => i.id === appState.editingId);
    if (itemIndex === -1) {
      showToast('Lỗi: Không tìm thấy bản ghi cần cập nhật', 'danger');
      return;
    }

    const original = appState.items[itemIndex];
    appState.items[itemIndex] = {
      ...original,
      id,
      title,
      content,
      note,
      updatedAt: new Date().toISOString(),
    };

    saveDataToStorage();
    renderTable();
    showToast('Đã cập nhật', 'info');
    resetFormToNew();
  }

  function handleDeleteItem(id) {
    const item = appState.items.find((i) => i.id === id);
    if (!item) return;

    const confirmMsg = `Bạn có chắc chắn muốn xóa bản ghi [${item.id}] - "${item.title || 'Không có tiêu đề'}"?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    appState.items = appState.items.filter((i) => i.id !== id);
    saveDataToStorage();

    if (appState.editingId === id) {
      resetFormToNew();
    } else {
      renderTable();
    }

    showToast('Đã xóa', 'warning');
  }

  // ==========================================================================
  // DOWNLOAD PNG & PRINT HANDLERS
  // ==========================================================================

  async function handleDownloadCurrentPng() {
    const id = dom.inputId.value.trim() || 'QR';
    const title = dom.inputTitle.value.trim() || 'ma-qr';
    const content = dom.inputContent.value.trim();

    if (!content) {
      showToast('Chưa có nội dung để tải mã QR!', 'warning');
      return;
    }

    try {
      showToast('Đang tạo ảnh chất lượng cao...', 'info');
      const dataUrl = await generateQRCanvasAsync(content, 800);

      const safeTitle = sanitizeFilename(title);
      const safeId = sanitizeFilename(id);
      const filename = `${safeId}_${safeTitle}.png`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Đã tải xuống: ${filename}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tạo file PNG!', 'danger');
    }
  }

  async function handlePrintSingleItem(itemOrNull) {
    let item = itemOrNull;
    if (!item) {
      const content = dom.inputContent.value.trim();
      if (!content) {
        showToast('Vui lòng nhập nội dung trước khi in!', 'warning');
        return;
      }
      item = {
        id: dom.inputId.value.trim() || 'QR-0001',
        title: dom.inputTitle.value.trim() || 'NỘI DUNG MÃ QR',
        content: content,
        note: dom.inputNote.value.trim() || '',
      };
    }

    showToast('Đang chuẩn bị trang in...', 'info');
    try {
      const qrDataUrl = await generateQRCanvasAsync(item.content, 600);

      dom.printTargetArea.innerHTML = `
        <div class="print-page-item">
          <div class="print-border-box">
            <div class="print-title">${escapeHtml(item.title || 'MÃ QR')}</div>
            <img src="${qrDataUrl}" alt="QR" class="print-qr-img" />
            <div class="print-id-tag">${escapeHtml(item.id)}</div>
            <div class="print-content-text">${escapeHtml(item.content)}</div>
            ${item.note ? `<div class="print-note-text">Ghi chú: ${escapeHtml(item.note)}</div>` : ''}
          </div>
        </div>
      `;

      setTimeout(() => {
        window.print();
      }, 250);
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi nạp dữ liệu in!', 'danger');
    }
  }

  async function handlePrintAllFiltered() {
    const itemsToPrint = getFilteredItems();
    if (itemsToPrint.length === 0) {
      showToast('Không có bản ghi nào để in!', 'warning');
      return;
    }

    showToast(`Đang kết xuất ${itemsToPrint.length} trang in A4...`, 'info');

    try {
      const pageElements = [];
      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];
        const qrDataUrl = await generateQRCanvasAsync(item.content, 600);

        pageElements.push(`
          <div class="print-page-item">
            <div class="print-border-box">
              <div class="print-title">${escapeHtml(item.title || 'MÃ QR')}</div>
              <img src="${qrDataUrl}" alt="QR" class="print-qr-img" />
              <div class="print-id-tag">${escapeHtml(item.id)}</div>
              <div class="print-content-text">${escapeHtml(item.content)}</div>
              ${item.note ? `<div class="print-note-text">Ghi chú: ${escapeHtml(item.note)}</div>` : ''}
            </div>
          </div>
        `);
      }

      dom.printTargetArea.innerHTML = pageElements.join('');

      setTimeout(() => {
        window.print();
      }, 350);
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi nạp danh sách in hàng loạt!', 'danger');
    }
  }

  // ==========================================================================
  // JSON IMPORT & EXPORT
  // ==========================================================================

  function handleExportJson() {
    try {
      const jsonString = JSON.stringify(appState.items, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().split('T')[0];
      const filename = `qr_data_${today}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Export thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất file JSON', 'danger');
    }
  }

  function handleImportJsonFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const text = e.target.result;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed)) {
          showToast('Lỗi dữ liệu: File JSON phải chứa danh sách mảng các bản ghi!', 'danger');
          return;
        }

        // Validate structure
        const validItems = [];
        for (let idx = 0; idx < parsed.length; idx++) {
          const item = parsed[idx];
          if (!item || typeof item !== 'object') continue;
          if (!item.content || typeof item.content !== 'string') continue;

          validItems.push({
            id: String(item.id || `QR-${String(idx + 1).padStart(4, '0')}`).trim(),
            title: String(item.title || '').trim(),
            content: String(item.content).trim(),
            note: String(item.note || '').trim(),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          });
        }

        if (validItems.length === 0) {
          showToast('Lỗi dữ liệu: Không tìm thấy bản ghi hợp lệ trong file!', 'danger');
          return;
        }

        const confirmMsg = `File chứa ${validItems.length} bản ghi hợp lệ.\n\nBạn có muốn ghi đè danh sách hiện tại (${appState.items.length} mục) bằng dữ liệu mới này không?`;
        if (window.confirm(confirmMsg)) {
          appState.items = validItems;
          saveDataToStorage();
          resetFormToNew();
          showToast(`Import thành công ${validItems.length} bản ghi!`, 'success');
        }
      } catch (err) {
        console.error('JSON Parse error:', err);
        showToast('Lỗi dữ liệu: Định dạng file JSON không hợp lệ!', 'danger');
      } finally {
        event.target.value = ''; // reset file input
      }
    };

    reader.onerror = function () {
      showToast('Lỗi khi đọc file từ thiết bị!', 'danger');
      event.target.value = '';
    };

    reader.readAsText(file, 'utf-8');
  }

  // ==========================================================================
  // EVENT LISTENERS BINDINGS
  // ==========================================================================

  function bindEvents() {
    // Realtime input updates for live QR preview
    const handleInputLive = () => {
      const id = dom.inputId.value;
      const title = dom.inputTitle.value;
      const content = dom.inputContent.value;
      renderLiveQR(content, id, title);
    };

    dom.inputContent.addEventListener('input', handleInputLive);
    dom.inputTitle.addEventListener('input', handleInputLive);
    dom.inputId.addEventListener('input', handleInputLive);

    // Auto ID button
    dom.btnAutoId.addEventListener('click', () => {
      dom.inputId.value = generateNextId();
      handleInputLive();
      showToast('Đã tự động tạo mã ID mới', 'info');
    });

    // Form button actions
    dom.btnNew.addEventListener('click', () => {
      resetFormToNew();
      showToast('Đã chuyển sang chế độ tạo bản ghi mới', 'info');
    });

    dom.btnSave.addEventListener('click', handleSaveNew);
    dom.btnUpdate.addEventListener('click', handleUpdateExisting);
    dom.btnDeleteCurrent.addEventListener('click', () => {
      if (appState.editingId) {
        handleDeleteItem(appState.editingId);
      }
    });

    // QR Preview action buttons
    dom.btnDownloadPng.addEventListener('click', handleDownloadCurrentPng);
    dom.btnPrintSingle.addEventListener('click', () => handlePrintSingleItem(null));

    // Search input realtime
    dom.searchInput.addEventListener('input', (e) => {
      appState.searchTerm = e.target.value;
      renderTable();
    });

    // Batch Print Button
    dom.btnPrintAll.addEventListener('click', handlePrintAllFiltered);

    // Export & Import JSON
    dom.btnExportJson.addEventListener('click', handleExportJson);
    dom.btnImportJson.addEventListener('click', () => {
      if (dom.fileInputJson) dom.fileInputJson.click();
    });
    dom.fileInputJson.addEventListener('change', handleImportJsonFile);

    // Table delegated action buttons
    dom.tableBody.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const id = target.getAttribute('data-id');
      if (!id) return;

      if (target.classList.contains('btn-action-view')) {
        const item = appState.items.find((i) => i.id === id);
        if (item) {
          renderLiveQR(item.content, item.id, item.title);
          showToast(`Đang xem mã QR: ${item.id}`, 'info');
        }
      } else if (target.classList.contains('btn-action-edit')) {
        loadItemIntoForm(id);
      } else if (target.classList.contains('btn-action-print')) {
        const item = appState.items.find((i) => i.id === id);
        if (item) handlePrintSingleItem(item);
      } else if (target.classList.contains('btn-action-delete')) {
        handleDeleteItem(id);
      }
    });
  }

  // ==========================================================================
  // INITIALIZATION ON DOM READY
  // ==========================================================================

  function initApp() {
    loadDataFromStorage();
    bindEvents();
    resetFormToNew();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
