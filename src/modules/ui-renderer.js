import { StorageEngine } from './storage-engine.js';
import {
  getLatestInspection,
  getLatestStatus,
  shouldCreateRepair,
  buildRepairFromInspection,
  findOpenRepair,
  buildMonthlyStatusRows
} from './inspection-logic.js';
import {
  SECTION,
  TARGET_TYPE,
  INSPECTION_STATUS,
  REPAIR_STATUS,
  OPEN_REPAIR_STATUSES,
  BADGE_TONE_CLASSES,
  INSPECTION_STATUS_TONE,
  REPAIR_STATUS_TONE
} from './app-config.js';
import { exportWorkbook, importWorkbookFile } from './excel-io.js';

/* global lucide, html2canvas */

let state = { radios: [], accessories: [], inspections: [], repairs: [] };
let activeTab = 'dashboard';
let activeMonth = new Date().toISOString().slice(0, 7);
let brandDockLightSvg = '';
let brandDockDarkSvg = '';

// ต้อง inline <svg> เข้า DOM ตรงๆ ไม่ใช่ <img src="...svg"> — Chrome ไม่รัน CSS animation
// ของไฟล์ SVG ที่โหลดผ่าน <img> เลย (ค้างที่ keyframe 0% opacity:0 ของ .tube ตลอดไป)
async function loadBrandDockAssets() {
  try {
    const [light, dark] = await Promise.all([
      fetch('/vendor/branding/d1-neon-arcade-bare.svg').then((r) => r.text()),
      fetch('/vendor/branding/d2-crt-night-bare.svg').then((r) => r.text())
    ]);
    brandDockLightSvg = light.replace('<svg ', '<svg class="mark-light" ');
    brandDockDarkSvg = dark.replace('<svg ', '<svg class="mark-dark" ');
  } catch {
    brandDockLightSvg = '';
    brandDockDarkSvg = ''; // โหลดไม่ได้ก็แค่ไม่มี brand dock ไม่กระทบการใช้งานแอป
  }
}

const $app = () => document.getElementById('app');

// แจ้งเตือนแบบไม่บล็อกหน้าจอ (แทน alert() ซึ่งค้างทั้งแท็บจนกว่าจะกด OK)
function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 text-sm font-semibold z-50 animate-fade-in';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function icons() {
  if (window.lucide) lucide.createIcons();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- data ----

// เรียงตาม order (วันเวลาสร้าง) เสมอ กัน IndexedDB คืนลำดับตาม key (UUID) ซึ่งดูสลับไปมา
function sortByOrder(list) {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function loadAll() {
  state = await StorageEngine.loadAll();
  state.radios = sortByOrder(state.radios);
  state.accessories = sortByOrder(state.accessories);
}

function badge(tone, label) {
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold ${BADGE_TONE_CLASSES[tone] || BADGE_TONE_CLASSES.muted}">${label}</span>`;
}

function statusBadge(status) {
  if (status === INSPECTION_STATUS.ABNORMAL) return badge(INSPECTION_STATUS_TONE[status], 'Abnormal');
  if (status === INSPECTION_STATUS.NORMAL) return badge(INSPECTION_STATUS_TONE[status], 'Normal');
  return badge('muted', 'ยังไม่ตรวจ');
}

function repairStatusBadge(status) {
  return badge(REPAIR_STATUS_TONE[status], status);
}

// ------------------------------------------------------------- render ----

function render() {
  const el = $app();
  el.innerHTML = `
    ${renderHeader()}
    <main class="max-w-6xl mx-auto px-4 md:px-8 pt-6 dock-space">
      ${renderTabs()}
      <div class="mt-6">${renderActiveTab()}</div>
    </main>
    ${renderBrandDock()}
  `;
  icons();
  attachGlobalHandlers();
}

// ST-15 Brand Dock — แถบล่างถาวรเต็มความกว้าง พื้นกลืนกับธีมแอปเองผ่าน var(--surface)
function renderBrandDock() {
  return `
    <div class="brand-dock" role="img" aria-label="สร้างโดย A(i)CODER">
      ${brandDockLightSvg}
      ${brandDockDarkSvg}
    </div>
  `;
}

function renderHeader() {
  const isDark = document.documentElement.classList.contains('dark');
  return `
    <header class="border-b border-[var(--border)]">
      <div class="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold" style="color:var(--text)">Walkie Talkie Tracker</h1>
          <p class="text-sm" style="color:var(--text-2)">รายการวิทยุ · ตรวจสภาพประจำเดือน · ประวัติซ่อม — แผนก ${SECTION}</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-export" class="btn px-4 text-sm">
            <i data-lucide="download" class="w-4 h-4" aria-hidden="true"></i> Export
          </button>
          <label class="btn px-4 text-sm cursor-pointer">
            <i data-lucide="upload" class="w-4 h-4" aria-hidden="true"></i> Import
            <input id="input-import" type="file" accept=".xlsx" class="hidden" />
          </label>
          <button id="btn-theme" class="btn btn-icon" aria-label="สลับโหมดสี" aria-pressed="${isDark}" title="สลับโหมดสี">
            <i data-lucide="moon" class="w-4 h-4" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </header>
  `;
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'radios', label: 'รายการวิทยุ', icon: 'radio' },
  { id: 'accessories', label: 'อุปกรณ์เสริม', icon: 'battery-charging' },
  { id: 'inspection', label: 'ตรวจสภาพประจำเดือน', icon: 'clipboard-check' },
  { id: 'repairs', label: 'ประวัติการซ่อม', icon: 'wrench' },
  { id: 'report', label: 'รายงานประจำเดือน', icon: 'file-text' }
];

function renderTabs() {
  return `
    <nav class="flex flex-wrap gap-2">
      ${TABS.map(
        (t) => `
        <button data-tab="${t.id}" class="tab-btn btn px-4 text-sm ${
          activeTab === t.id ? 'tab-active' : ''
        }">
          <i data-lucide="${t.icon}" class="w-4 h-4" aria-hidden="true"></i> ${t.label}
        </button>`
      ).join('')}
    </nav>
  `;
}

function renderActiveTab() {
  switch (activeTab) {
    case 'dashboard':
      return renderDashboard();
    case 'radios':
      return renderRadios();
    case 'accessories':
      return renderAccessories();
    case 'inspection':
      return renderInspection();
    case 'repairs':
      return renderRepairs();
    case 'report':
      return renderReport();
    default:
      return '';
  }
}

// --------------------------------------------------------- dashboard -----

function kpiCard(label, value, colorVar, icon) {
  return `
    <div class="card p-5" style="border-top:4px solid var(${colorVar})">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold" style="color:var(--text-2)">${label}</span>
        <i data-lucide="${icon}" class="w-5 h-5" style="color:var(--text-3)" aria-hidden="true"></i>
      </div>
      <p class="text-3xl font-bold mt-2" style="color:var(--text)">${value}</p>
    </div>
  `;
}

function renderDashboard() {
  const totalRadios = state.radios.length;
  const totalAccessories = state.accessories.length;

  const abnormalThisMonth = [...state.radios.map((r) => [TARGET_TYPE.RADIO, r.id]), ...state.accessories.map((a) => [TARGET_TYPE.ACCESSORY, a.id])].filter(
    ([type, id]) => {
      const insp = state.inspections.find((i) => i.targetType === type && i.targetId === id && i.yearMonth === activeMonth);
      return insp && insp.status === INSPECTION_STATUS.ABNORMAL;
    }
  ).length;

  const openRepairs = state.repairs.filter((r) => OPEN_REPAIR_STATUSES.includes(r.status));

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${kpiCard('วิทยุทั้งหมด', totalRadios, '--accent', 'radio')}
      ${kpiCard('อุปกรณ์เสริมทั้งหมด', totalAccessories, '--border-strong', 'battery-charging')}
      ${kpiCard(`Abnormal เดือน ${activeMonth}`, abnormalThisMonth, '--crit', 'alert-triangle')}
      ${kpiCard('ซ่อมค้าง (รอ/กำลังซ่อม)', openRepairs.length, '--warn', 'wrench')}
    </div>

    <div class="card p-5 mt-6">
      <h2 class="font-bold mb-3 flex items-center gap-2" style="color:var(--text)"><i data-lucide="wrench" class="w-4 h-4" aria-hidden="true"></i> รายการซ่อมที่ยังไม่เสร็จ</h2>
      ${
        openRepairs.length === 0
          ? emptyState('ไม่มีรายการซ่อมค้างอยู่ตอนนี้')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-2)">
                <th class="py-2 pr-4">อุปกรณ์</th><th class="py-2 pr-4">วันที่แจ้ง</th><th class="py-2 pr-4">อาการ</th><th class="py-2">สถานะ</th>
              </tr></thead>
              <tbody>
                ${openRepairs
                  .map(
                    (r) => `<tr class="border-t border-[var(--border)]">
                      <td class="py-2 pr-4">${targetLabel(r.targetType, r.targetId)}</td>
                      <td class="py-2 pr-4">${r.reportedDate}</td>
                      <td class="py-2 pr-4">${r.symptom || '-'}</td>
                      <td class="py-2">${repairStatusBadge(r.status)}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
}

function targetLabel(targetType, targetId) {
  if (targetType === TARGET_TYPE.RADIO) {
    const r = state.radios.find((x) => x.id === targetId);
    return r ? `${r.position} (${r.serieNo})` : '(ลบแล้ว)';
  }
  const a = state.accessories.find((x) => x.id === targetId);
  const radio = a ? state.radios.find((r) => r.id === a.radioId) : null;
  return a ? `${a.details}${radio ? ' — ' + radio.position : ''}` : '(ลบแล้ว)';
}

function emptyState(text) {
  return `<p class="text-sm py-6 text-center" style="color:var(--text-3)">${text}</p>`;
}

// -------------------------------------------------------------- radios ---

function renderRadios() {
  return `
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold" style="color:var(--text)">รายการวิทยุ (${state.radios.length})</h2>
        <button id="btn-add-radio" class="btn px-4 text-sm">
          <i data-lucide="plus" class="w-4 h-4" aria-hidden="true"></i> เพิ่มวิทยุ
        </button>
      </div>
      <form id="form-add-radio" class="hidden grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <input name="serieNo" required placeholder="Serie No." class="input px-3 py-2 text-sm" />
        <input name="position" required placeholder="Position (เช่น CTA1 F/M)" class="input px-3 py-2 text-sm" />
        <input name="remark" placeholder="Remark" class="input px-3 py-2 text-sm" />
        <button class="btn btn-primary px-4 text-sm">บันทึก</button>
      </form>
      ${
        state.radios.length === 0
          ? emptyState('ยังไม่มีรายการวิทยุ กด "เพิ่มวิทยุ" เพื่อเริ่มต้น')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-2)">
                <th class="py-2 pr-4">Serie No.</th><th class="py-2 pr-4">Position</th><th class="py-2 pr-4">Section</th>
                <th class="py-2 pr-4">สถานะล่าสุด</th><th class="py-2 pr-4">Remark</th><th class="py-2"></th>
              </tr></thead>
              <tbody>
                ${state.radios
                  .map((r) => {
                    const status = getLatestStatus(state.inspections, TARGET_TYPE.RADIO, r.id);
                    return `<tr class="border-t border-[var(--border)]">
                      <td class="py-2 pr-4" style="color:var(--accent-2)">${r.serieNo}</td>
                      <td class="py-2 pr-4">${r.position}</td>
                      <td class="py-2 pr-4">${r.section}</td>
                      <td class="py-2 pr-4">${statusBadge(status)}</td>
                      <td class="py-2 pr-4" style="color:var(--text-2)">${r.remark || '-'}</td>
                      <td class="py-2"><button data-del-radio="${r.id}" class="icon-btn icon-btn-danger" aria-label="ลบวิทยุ ${r.serieNo}" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i></button></td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
}

// --------------------------------------------------------- accessories ---

function renderAccessories() {
  const radioOptions = state.radios
    .map((r) => `<option value="${r.id}">${r.position} (${r.serieNo})</option>`)
    .join('');
  return `
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold" style="color:var(--text)">อุปกรณ์เสริม (${state.accessories.length})</h2>
        <button id="btn-add-accessory" class="btn px-4 text-sm">
          <i data-lucide="plus" class="w-4 h-4" aria-hidden="true"></i> เพิ่มอุปกรณ์เสริม
        </button>
      </div>
      <form id="form-add-accessory" class="hidden grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <select name="radioId" required class="input px-3 py-2 text-sm"><option value="">-- เลือกวิทยุ --</option>${radioOptions}</select>
        <input name="details" required placeholder="รายละเอียด เช่น แท่นชาร์จ+แบตเตอรี่" class="input px-3 py-2 text-sm sm:col-span-2" />
        <input name="remark" placeholder="Remark" class="input px-3 py-2 text-sm" />
        <button class="btn btn-primary px-4 text-sm sm:col-span-4">บันทึก</button>
      </form>
      ${
        state.accessories.length === 0
          ? emptyState('ยังไม่มีอุปกรณ์เสริม')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-2)">
                <th class="py-2 pr-4">อุปกรณ์เสริม</th><th class="py-2 pr-4">วิทยุที่ผูกด้วย</th><th class="py-2 pr-4">สถานะล่าสุด</th><th class="py-2 pr-4">Remark</th><th class="py-2"></th>
              </tr></thead>
              <tbody>
                ${state.accessories
                  .map((a) => {
                    const radio = state.radios.find((r) => r.id === a.radioId);
                    const status = getLatestStatus(state.inspections, TARGET_TYPE.ACCESSORY, a.id);
                    return `<tr class="border-t border-[var(--border)]">
                      <td class="py-2 pr-4">${a.details}</td>
                      <td class="py-2 pr-4">${radio ? `${radio.position} (${radio.serieNo})` : '-'}</td>
                      <td class="py-2 pr-4">${statusBadge(status)}</td>
                      <td class="py-2 pr-4" style="color:var(--text-2)">${a.remark || '-'}</td>
                      <td class="py-2"><button data-del-accessory="${a.id}" class="icon-btn icon-btn-danger" aria-label="ลบอุปกรณ์เสริม ${a.details}" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i></button></td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
}

// ----------------------------------------------------------- inspection --

function inspectionRow(targetType, targetId, label) {
  const existing = state.inspections.find(
    (i) => i.targetType === targetType && i.targetId === targetId && i.yearMonth === activeMonth
  );
  return `
    <tr class="border-t border-[var(--border)]" data-insp-row data-target-type="${targetType}" data-target-id="${targetId}">
      <td class="py-2 pr-4">${label}</td>
      <td class="py-2 pr-4">
        <select class="input px-2 py-1 text-sm w-full" data-insp-status>
          <option value="" ${!existing ? 'selected' : ''}>ยังไม่ตรวจ</option>
          <option value="${INSPECTION_STATUS.NORMAL}" ${existing?.status === INSPECTION_STATUS.NORMAL ? 'selected' : ''}>Normal</option>
          <option value="${INSPECTION_STATUS.ABNORMAL}" ${existing?.status === INSPECTION_STATUS.ABNORMAL ? 'selected' : ''}>Abnormal</option>
        </select>
      </td>
      <td class="py-2 pr-4">
        <input class="input px-2 py-1 text-sm w-full" data-insp-remark placeholder="Remark" value="${existing?.remark || ''}" />
      </td>
    </tr>
  `;
}

// colgroup เดียวกันบังคับใช้กับทั้ง 2 ตาราง ไม่งั้นแต่ละตารางจะคำนวณความกว้างคอลัมน์เองตามเนื้อหา
// ของตัวเอง (label วิทยุกับอุปกรณ์เสริมยาวไม่เท่ากัน) ทำให้คอลัมน์ "สถานะ" เหลื่อมกันระหว่าง 2 ตาราง
const INSPECTION_COLGROUP = `<colgroup><col style="width:50%" /><col style="width:20%" /><col style="width:30%" /></colgroup>`;

function renderInspection() {
  return `
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 class="font-bold" style="color:var(--text)">ตรวจสภาพประจำเดือน</h2>
        <div class="flex items-center gap-2">
          <input id="input-month" type="month" value="${activeMonth}" class="input px-3 py-2 text-sm" />
          <button id="btn-save-inspection" class="btn btn-primary px-4 text-sm">
            <i data-lucide="save" class="w-4 h-4" aria-hidden="true"></i> บันทึกผลตรวจเดือนนี้
          </button>
        </div>
      </div>
      <h3 class="text-sm font-bold mb-2" style="color:var(--text-2)">วิทยุ</h3>
      <div class="overflow-x-auto mb-6"><table class="w-full text-sm" style="table-layout:fixed">
        ${INSPECTION_COLGROUP}
        <thead><tr class="text-left" style="color:var(--text-2)"><th class="py-2 pr-4">Position / Serie No.</th><th class="py-2 pr-4">สถานะ</th><th class="py-2">Remark</th></tr></thead>
        <tbody>
          ${state.radios.map((r) => inspectionRow(TARGET_TYPE.RADIO, r.id, `${r.position} (${r.serieNo})`)).join('') || `<tr><td colspan="3">${emptyState('ยังไม่มีวิทยุในระบบ')}</td></tr>`}
        </tbody>
      </table></div>
      <h3 class="text-sm font-bold mb-2" style="color:var(--text-2)">อุปกรณ์เสริม</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm" style="table-layout:fixed">
        ${INSPECTION_COLGROUP}
        <thead><tr class="text-left" style="color:var(--text-2)"><th class="py-2 pr-4">รายละเอียด</th><th class="py-2 pr-4">สถานะ</th><th class="py-2">Remark</th></tr></thead>
        <tbody>
          ${state.accessories.map((a) => inspectionRow(TARGET_TYPE.ACCESSORY, a.id, a.details)).join('') || `<tr><td colspan="3">${emptyState('ยังไม่มีอุปกรณ์เสริมในระบบ')}</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
}

// -------------------------------------------------------------- repairs --

function renderRepairs() {
  const rows = [...state.repairs].sort((a, b) => (a.reportedDate < b.reportedDate ? 1 : -1));
  return `
    <div class="card p-5">
      <h2 class="font-bold mb-4" style="color:var(--text)">ประวัติการซ่อมแซม (${rows.length})</h2>
      ${
        rows.length === 0
          ? emptyState('ยังไม่มีประวัติการซ่อม — จะสร้างอัตโนมัติเมื่อตรวจสภาพเจอ Abnormal')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-2)">
                <th class="py-2 pr-4">อุปกรณ์</th><th class="py-2 pr-4">วันที่แจ้งซ่อม</th><th class="py-2 pr-4">อาการ</th>
                <th class="py-2 pr-4">สถานะ</th><th class="py-2 pr-4">วันที่เสร็จ</th><th class="py-2">ผลการซ่อม</th>
              </tr></thead>
              <tbody>
                ${rows
                  .map(
                    (r) => `<tr class="border-t border-[var(--border)]" data-repair-row="${r.id}">
                      <td class="py-2 pr-4">${targetLabel(r.targetType, r.targetId)}</td>
                      <td class="py-2 pr-4">${r.reportedDate}</td>
                      <td class="py-2 pr-4">${r.symptom || '-'}</td>
                      <td class="py-2 pr-4">
                        <select class="input px-2 py-1 text-sm" data-repair-status>
                          ${Object.values(REPAIR_STATUS)
                            .map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`)
                            .join('')}
                        </select>
                      </td>
                      <td class="py-2 pr-4"><input type="date" class="input px-2 py-1 text-sm" data-repair-completed value="${r.completedDate || ''}" /></td>
                      <td class="py-2"><input class="input px-2 py-1 text-sm w-full" data-repair-result placeholder="ผลการซ่อม" value="${r.result || ''}" /></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
}

// --------------------------------------------------------------- report --

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

// ตาราง/สถิติในรายงานใช้สีตายตัวเสมอ (ไม่อิง CSS variable ธีมแอป) เพราะภาพที่ copy
// ไปวางในอีเมลต้องอ่านง่ายบนพื้นขาวเสมอ ไม่ว่าตอน capture แอปจะอยู่ธีมไหน
function reportStat(label, value) {
  return `
    <div style="background:#F7F9FC;border:1px solid #D6DEEE;border-radius:9px;padding:8px 14px;min-width:120px">
      <div style="font-size:11px;color:#5F6980">${label}</div>
      <div style="font-size:18px;font-weight:700;color:#131829">${value}</div>
    </div>
  `;
}

function reportTable(title, rows) {
  return `
    <h3 style="font-weight:700;font-size:14px;margin:20px 0 8px;color:#131829">${title} (${rows.length})</h3>
    ${
      rows.length === 0
        ? `<p style="font-size:13px;color:#5F6980;padding:12px 0">ยังไม่มีรายการ</p>`
        : `<table style="width:100%;font-size:13px;border-collapse:collapse">
            <thead><tr style="text-align:left;color:#414A60">
              <th style="padding:6px 12px 6px 0;border-bottom:1px solid #D6DEEE">รายการ</th>
              <th style="padding:6px 12px 6px 0;border-bottom:1px solid #D6DEEE">สถานะ</th>
              <th style="padding:6px 0;border-bottom:1px solid #D6DEEE">Remark</th>
            </tr></thead>
            <tbody>
              ${rows
                .map(
                  (r) => `<tr>
                    <td style="padding:6px 12px 6px 0;border-bottom:1px solid #EDF1F9;color:#131829">${r.label}</td>
                    <td style="padding:6px 12px 6px 0;border-bottom:1px solid #EDF1F9;color:${reportStatusColor(r.status)};font-weight:700">${reportStatusLabel(r.status)}</td>
                    <td style="padding:6px 0;border-bottom:1px solid #EDF1F9;color:#414A60">${r.remark || '-'}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>`
    }
  `;
}

function renderReport() {
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
      <div id="report-capture" style="background:#FFFFFF;border:1px solid #D6DEEE;border-radius:13px;padding:20px">
        <p style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8A6410;margin:0 0 4px">แผนก ${SECTION}</p>
        <h2 style="font-size:20px;font-weight:700;color:#131829;margin:0 0 12px">รายงานผลตรวจสภาพวิทยุ/อุปกรณ์เสริม — เดือน ${activeMonth}</h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px">
          ${reportStat('วิทยุทั้งหมด', state.radios.length)}
          ${reportStat('อุปกรณ์เสริมทั้งหมด', state.accessories.length)}
          ${reportStat('Abnormal เดือนนี้', abnormalCount)}
          ${reportStat('ซ่อมค้าง', openRepairsCount)}
        </div>
        ${reportTable('วิทยุ', radioRows)}
        ${reportTable('อุปกรณ์เสริม', accessoryRows)}
      </div>
    </div>
  `;
}

async function copyReportImage() {
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

// ------------------------------------------------------------- handlers --

function attachGlobalHandlers() {
  document.querySelectorAll('.tab-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      render();
    })
  );

  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = !root.classList.contains('dark');
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      /* private mode ไม่มี localStorage ก็ไม่เป็นไร แค่ไม่จำค่าธีมข้ามเซสชัน */
    }
    render();
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    exportWorkbook(state);
  });

  document.getElementById('input-import')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Import จะแทนที่ข้อมูลทั้งหมดในเครื่องนี้ด้วยไฟล์ที่เลือก ยืนยันหรือไม่?')) {
      e.target.value = '';
      return;
    }
    const data = await importWorkbookFile(file);
    await StorageEngine.replaceAll(data);
    await loadAll();
    render();
    e.target.value = '';
  });

  if (activeTab === 'radios') attachRadiosHandlers();
  if (activeTab === 'accessories') attachAccessoriesHandlers();
  if (activeTab === 'inspection') attachInspectionHandlers();
  if (activeTab === 'repairs') attachRepairsHandlers();
  if (activeTab === 'report') attachReportHandlers();
}

function attachRadiosHandlers() {
  const form = document.getElementById('form-add-radio');
  document.getElementById('btn-add-radio')?.addEventListener('click', () => form.classList.toggle('hidden'));
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    await StorageEngine.radios.put({
      id: crypto.randomUUID(),
      serieNo: fd.get('serieNo').trim(),
      position: fd.get('position').trim(),
      section: SECTION,
      remark: fd.get('remark').trim(),
      order: Date.now()
    });
    await loadAll();
    render();
  });
  document.querySelectorAll('[data-del-radio]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('ลบวิทยุตัวนี้? (ประวัติตรวจ/ซ่อมที่เกี่ยวข้องจะยังอยู่ในระบบ)')) return;
      await StorageEngine.radios.remove(btn.dataset.delRadio);
      await loadAll();
      render();
    })
  );
}

function attachAccessoriesHandlers() {
  const form = document.getElementById('form-add-accessory');
  document.getElementById('btn-add-accessory')?.addEventListener('click', () => form.classList.toggle('hidden'));
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    await StorageEngine.accessories.put({
      id: crypto.randomUUID(),
      radioId: fd.get('radioId'),
      details: fd.get('details').trim(),
      remark: fd.get('remark').trim(),
      order: Date.now()
    });
    await loadAll();
    render();
  });
  document.querySelectorAll('[data-del-accessory]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('ลบอุปกรณ์เสริมชิ้นนี้?')) return;
      await StorageEngine.accessories.remove(btn.dataset.delAccessory);
      await loadAll();
      render();
    })
  );
}

function attachInspectionHandlers() {
  document.getElementById('input-month')?.addEventListener('change', (e) => {
    activeMonth = e.target.value;
    render();
  });

  document.getElementById('btn-save-inspection')?.addEventListener('click', async () => {
    const rows = document.querySelectorAll('[data-insp-row]');
    const newInspections = [];
    const newRepairs = [];

    for (const row of rows) {
      const status = row.querySelector('[data-insp-status]').value;
      if (!status) continue; // แถวที่ยังไม่ได้ตรวจ ข้ามไป

      const targetType = row.dataset.targetType;
      const targetId = row.dataset.targetId;
      const remark = row.querySelector('[data-insp-remark]').value.trim();

      const existing = state.inspections.find(
        (i) => i.targetType === targetType && i.targetId === targetId && i.yearMonth === activeMonth
      );

      const record = {
        id: existing?.id || crypto.randomUUID(),
        targetType,
        targetId,
        yearMonth: activeMonth,
        status,
        remark,
        inspectedAt: todayStr()
      };
      newInspections.push(record);

      if (shouldCreateRepair(record, [...state.repairs, ...newRepairs])) {
        newRepairs.push(buildRepairFromInspection(record, todayStr()));
      }
    }

    for (const r of newInspections) await StorageEngine.inspections.put(r);
    for (const r of newRepairs) await StorageEngine.repairs.put(r);

    await loadAll();
    render();
    toast(
      newRepairs.length > 0
        ? `บันทึกผลตรวจแล้ว — สร้างรายการซ่อมอัตโนมัติ ${newRepairs.length} รายการ (ดูที่แท็บ "ประวัติการซ่อม")`
        : 'บันทึกผลตรวจเดือนนี้เรียบร้อยแล้ว'
    );
  });
}

function attachRepairsHandlers() {
  document.querySelectorAll('[data-repair-row]').forEach((row) => {
    const statusSelect = row.querySelector('[data-repair-status]');
    const completedInput = row.querySelector('[data-repair-completed]');

    const save = async () => {
      const id = row.dataset.repairRow;
      const existing = state.repairs.find((r) => r.id === id);
      if (!existing) return;
      await StorageEngine.repairs.put({
        ...existing,
        status: statusSelect.value,
        completedDate: completedInput.value || null,
        result: row.querySelector('[data-repair-result]').value.trim()
      });
      await loadAll();
      render();
    };

    completedInput.addEventListener('change', () => {
      // กรอกวันที่เสร็จ = ถือว่าซ่อมเสร็จแล้ว เว้นแต่สถานะถูกปิดไปแล้ว (เช่น จำหน่ายทิ้ง)
      if (completedInput.value && OPEN_REPAIR_STATUSES.includes(statusSelect.value)) {
        statusSelect.value = REPAIR_STATUS.DONE;
      }
      save();
    });
    statusSelect.addEventListener('change', save);
    row.querySelector('[data-repair-result]').addEventListener('change', save);
  });
}

function attachReportHandlers() {
  document.getElementById('input-report-month')?.addEventListener('change', (e) => {
    activeMonth = e.target.value;
    render();
  });
  document.getElementById('btn-copy-report')?.addEventListener('click', copyReportImage);
}

// --------------------------------------------------------------- boot ----

export const UIRenderer = {
  async init() {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      // ไม่มีค่าเก็บไว้ (saved เป็น null) → ไม่ stamp data-theme ปล่อยให้ prefers-color-scheme ทำงานเอง
    } catch {
      /* ไม่มี localStorage ก็ใช้ system preference ผ่าน prefers-color-scheme แทน */
    }
    await Promise.all([loadAll(), loadBrandDockAssets()]);
    render();
  }
};
