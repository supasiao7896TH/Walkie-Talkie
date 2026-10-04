import { TARGET_TYPE, INSPECTION_STATUS, OPEN_REPAIR_STATUSES } from '../app-config.js';
import { buildMonthlyStatusRows } from '../inspection-logic.js';
import { toast, escapeHtml } from '../ui-utils.js';

/* global html2canvas */

function reportStatusLabel(status) {
  if (status === INSPECTION_STATUS.ABNORMAL) return 'Abnormal';
  if (status === INSPECTION_STATUS.NORMAL) return 'Normal';
  return 'ยังไม่ตรวจ';
}

function reportStatusColor(status) {
  if (status === INSPECTION_STATUS.ABNORMAL) return '#B3261E';
  if (status === INSPECTION_STATUS.NORMAL) return '#1A7444';
  return '#5F6980';
}

function reportStat(label, value, colorHex) {
  return `
    <div style="background:#F7F9FC;border:1px solid #D6DEEE;border-top:3px solid ${colorHex};border-radius:9px;padding:8px 14px;min-width:120px">
      <div style="font-size:11px;color:#5F6980">${escapeHtml(label)}</div>
      <div style="font-size:18px;font-weight:700;color:#131829">${value}</div>
    </div>
  `;
}

const REPORT_TABLE_COLGROUP = `<colgroup><col style="width:50%" /><col style="width:20%" /><col style="width:30%" /></colgroup>`;

function reportTable(title, rows) {
  return `
    <h3 style="font-weight:700;font-size:14px;margin:20px 0 8px;color:#131829">${escapeHtml(title)} (${rows.length})</h3>
    ${
      rows.length === 0
        ? `<p style="font-size:13px;color:#5F6980;padding:12px 0">ยังไม่มีรายการ</p>`
        : `<table style="width:100%;font-size:13px;border-collapse:collapse;table-layout:fixed">
            ${REPORT_TABLE_COLGROUP}
            <thead><tr style="text-align:left;color:#414A60">
              <th style="padding:6px 12px 6px 0;border-bottom:1px solid #D6DEEE">รายการ</th>
              <th style="padding:6px 12px 6px 0;border-bottom:1px solid #D6DEEE">สถานะ</th>
              <th style="padding:6px 0;border-bottom:1px solid #D6DEEE">Remark</th>
            </tr></thead>
            <tbody>
              ${rows
                .map(
                  (r) => `<tr>
                    <td style="padding:6px 12px 6px 0;border-bottom:1px solid #EDF1F9;color:#131829">${escapeHtml(r.label)}</td>
                    <td style="padding:6px 12px 6px 0;border-bottom:1px solid #EDF1F9;color:${reportStatusColor(r.status)};font-weight:700">${reportStatusLabel(r.status)}</td>
                    <td style="padding:6px 0;border-bottom:1px solid #EDF1F9;color:#414A60">${escapeHtml(r.remark) || '-'}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>`
    }
  `;
}

export function renderReport(state, activeMonth, SECTION) {
  const radioRows = buildMonthlyStatusRows(
    state.radios,
    state.inspections,
    TARGET_TYPE.RADIO,
    activeMonth,
    (r) => `${r.position} (${r.serieNo})`
  );
  const accessoryRows = buildMonthlyStatusRows(
    state.accessories,
    state.inspections,
    TARGET_TYPE.ACCESSORY,
    activeMonth,
    (a) => a.details
  );
  const abnormalCount = [...radioRows, ...accessoryRows].filter((r) => r.status === INSPECTION_STATUS.ABNORMAL).length;
  const openRepairsCount = state.repairs.filter((r) => OPEN_REPAIR_STATUSES.includes(r.status)).length;

  return `
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 class="font-bold" style="color:var(--text)">รายงานประจำเดือน</h2>
        <div class="flex items-center gap-2">
          <input id="input-report-month" type="month" value="${activeMonth}" class="input px-3 py-2 text-sm" />
          <button id="btn-copy-report" class="btn btn-primary px-4 text-sm">
            <i data-lucide="clipboard-copy" class="w-4 h-4" aria-hidden="true"></i> คัดลอกเป็นภาพ
          </button>
        </div>
      </div>
      <div id="report-capture" style="background:#FFFFFF;border:1px solid #D6DEEE;border-top:4px solid #1D4ED8;border-radius:13px;padding:20px">
        <p style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8A6410;margin:0 0 4px">แผนก ${escapeHtml(SECTION)}</p>
        <h2 style="font-size:20px;font-weight:700;color:#131829;margin:0 0 12px">รายงานผลตรวจสภาพวิทยุ/อุปกรณ์เสริม — เดือน ${escapeHtml(activeMonth)}</h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px">
          ${reportStat('วิทยุทั้งหมด', state.radios.length, '#1D4ED8')}
          ${reportStat('อุปกรณ์เสริมทั้งหมด', state.accessories.length, '#B2BFD8')}
          ${reportStat('Abnormal เดือนนี้', abnormalCount, '#B3261E')}
          ${reportStat('ซ่อมค้าง', openRepairsCount, '#8A5A08')}
        </div>
        ${reportTable('วิทยุ', radioRows)}
        ${reportTable('อุปกรณ์เสริม', accessoryRows)}
      </div>
    </div>
  `;
}

export async function copyReportImage() {
  const node = document.getElementById('report-capture');
  if (!node || typeof html2canvas !== 'function') {
    toast('คัดลอกไม่สำเร็จ — ไม่พบเครื่องมือสร้างภาพ');
    return;
  }
  try {
    const canvas = await html2canvas(node, { backgroundColor: '#FFFFFF', scale: 2 });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast('คัดลอกรูปรายงานแล้ว — ไปวาง (Ctrl+V) ในอีเมลได้เลย');
  } catch {
    toast('คัดลอกไม่สำเร็จ — เบราว์เซอร์นี้อาจไม่รองรับ ลอง screenshot หน้าจอแทนได้');
  }
}

export function attachReportHandlers({ setActiveMonth, render }) {
  document.getElementById('input-report-month')?.addEventListener('change', (e) => {
    setActiveMonth(e.target.value);
    render();
  });
  document.getElementById('btn-copy-report')?.addEventListener('click', copyReportImage);
}
