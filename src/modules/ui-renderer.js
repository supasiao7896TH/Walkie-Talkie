import { StorageEngine } from './storage-engine.js';
import {
  getLatestInspection,
  getLatestStatus,
  shouldCreateRepair,
  buildRepairFromInspection,
  findOpenRepair
} from './inspection-logic.js';
import { SECTION, TARGET_TYPE, INSPECTION_STATUS, REPAIR_STATUS, OPEN_REPAIR_STATUSES } from './app-config.js';
import { exportWorkbook, importWorkbookFile } from './excel-io.js';

/* global lucide */

let state = { radios: [], accessories: [], inspections: [], repairs: [] };
let activeTab = 'dashboard';
let activeMonth = new Date().toISOString().slice(0, 7);

const $app = () => document.getElementById('app');

// แจ้งเตือนแบบไม่บล็อกหน้าจอ (แทน alert() ซึ่งค้างทั้งแท็บจนกว่าจะกด OK)
function toast(message) {
  const el = document.createElement('div');
  el.className =
    'tactile-sm fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 text-sm font-semibold z-50 animate-fade-in border-t-4 border-emerald-500';
  el.style.color = 'var(--text-primary)';
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

async function loadAll() {
  state = await StorageEngine.loadAll();
}

function statusBadge(status) {
  if (status === INSPECTION_STATUS.ABNORMAL) {
    return `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-400">Abnormal</span>`;
  }
  if (status === INSPECTION_STATUS.NORMAL) {
    return `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Normal</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-500">ยังไม่ตรวจ</span>`;
}

function repairStatusBadge(status) {
  const colors = {
    [REPAIR_STATUS.PENDING]: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    [REPAIR_STATUS.IN_PROGRESS]: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    [REPAIR_STATUS.DONE]: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    [REPAIR_STATUS.DISPOSED]: 'bg-slate-500/15 text-slate-500'
  };
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold ${colors[status] || ''}">${status}</span>`;
}

// ------------------------------------------------------------- render ----

function render() {
  const el = $app();
  el.innerHTML = `
    ${renderHeader()}
    <main class="max-w-6xl mx-auto px-4 md:px-8 py-6">
      ${renderTabs()}
      <div class="mt-6">${renderActiveTab()}</div>
    </main>
  `;
  icons();
  attachGlobalHandlers();
}

function renderHeader() {
  return `
    <header class="border-b border-black/5 dark:border-white/5">
      <div class="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold gradient-text">Walkie Talkie Tracker</h1>
          <p class="text-sm" style="color:var(--text-secondary)">รายการวิทยุ · ตรวจสภาพประจำเดือน · ประวัติซ่อม — แผนก ${SECTION}</p>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-export" class="tactile-btn px-3 py-2 flex items-center gap-2 text-sm font-semibold" style="color:var(--text-primary)">
            <i data-lucide="download" class="w-4 h-4"></i> Export
          </button>
          <label class="tactile-btn px-3 py-2 flex items-center gap-2 text-sm font-semibold cursor-pointer" style="color:var(--text-primary)">
            <i data-lucide="upload" class="w-4 h-4"></i> Import
            <input id="input-import" type="file" accept=".xlsx" class="hidden" />
          </label>
          <button id="btn-theme" class="tactile-btn p-2" title="สลับโหมดสี">
            <i data-lucide="moon" class="w-4 h-4"></i>
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
  { id: 'repairs', label: 'ประวัติการซ่อม', icon: 'wrench' }
];

function renderTabs() {
  return `
    <nav class="flex flex-wrap gap-2">
      ${TABS.map(
        (t) => `
        <button data-tab="${t.id}" class="tab-btn tactile-btn px-4 py-2 flex items-center gap-2 text-sm font-semibold ${
          activeTab === t.id ? 'ring-2 ring-teal-500' : ''
        }" style="color:var(--text-primary)">
          <i data-lucide="${t.icon}" class="w-4 h-4"></i> ${t.label}
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
    default:
      return '';
  }
}

// --------------------------------------------------------- dashboard -----

function kpiCard(label, value, colorClass, icon) {
  return `
    <div class="tactile border-t-4 ${colorClass} p-5">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold" style="color:var(--text-secondary)">${label}</span>
        <i data-lucide="${icon}" class="w-5 h-5" style="color:var(--text-tertiary)"></i>
      </div>
      <p class="text-3xl font-extrabold mt-2" style="color:var(--text-primary)">${value}</p>
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
      ${kpiCard('วิทยุทั้งหมด', totalRadios, 'border-blue-500', 'radio')}
      ${kpiCard('อุปกรณ์เสริมทั้งหมด', totalAccessories, 'border-purple-500', 'battery-charging')}
      ${kpiCard(`Abnormal เดือน ${activeMonth}`, abnormalThisMonth, 'border-red-500', 'alert-triangle')}
      ${kpiCard('ซ่อมค้าง (รอ/กำลังซ่อม)', openRepairs.length, 'border-amber-500', 'wrench')}
    </div>

    <div class="tactile p-5 mt-6">
      <h2 class="font-bold mb-3 flex items-center gap-2" style="color:var(--text-primary)"><i data-lucide="wrench" class="w-4 h-4"></i> รายการซ่อมที่ยังไม่เสร็จ</h2>
      ${
        openRepairs.length === 0
          ? emptyState('ไม่มีรายการซ่อมค้างอยู่ตอนนี้')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-secondary)">
                <th class="py-2 pr-4">อุปกรณ์</th><th class="py-2 pr-4">วันที่แจ้ง</th><th class="py-2 pr-4">อาการ</th><th class="py-2">สถานะ</th>
              </tr></thead>
              <tbody>
                ${openRepairs
                  .map(
                    (r) => `<tr class="border-t border-black/5 dark:border-white/5">
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
  return `<p class="text-sm py-6 text-center" style="color:var(--text-tertiary)">${text}</p>`;
}

// -------------------------------------------------------------- radios ---

function renderRadios() {
  return `
    <div class="tactile p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold" style="color:var(--text-primary)">รายการวิทยุ (${state.radios.length})</h2>
        <button id="btn-add-radio" class="tactile-btn px-3 py-2 text-sm font-semibold flex items-center gap-2" style="color:var(--text-primary)">
          <i data-lucide="plus" class="w-4 h-4"></i> เพิ่มวิทยุ
        </button>
      </div>
      <form id="form-add-radio" class="hidden grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <input name="serieNo" required placeholder="Serie No." class="tactile-inset px-3 py-2 text-sm" />
        <input name="position" required placeholder="Position (เช่น CTA1 F/M)" class="tactile-inset px-3 py-2 text-sm" />
        <input name="remark" placeholder="Remark" class="tactile-inset px-3 py-2 text-sm" />
        <button class="tactile-btn px-3 py-2 text-sm font-semibold" style="color:var(--text-primary)">บันทึก</button>
      </form>
      ${
        state.radios.length === 0
          ? emptyState('ยังไม่มีรายการวิทยุ กด "เพิ่มวิทยุ" เพื่อเริ่มต้น')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-secondary)">
                <th class="py-2 pr-4">Serie No.</th><th class="py-2 pr-4">Position</th><th class="py-2 pr-4">Section</th>
                <th class="py-2 pr-4">สถานะล่าสุด</th><th class="py-2 pr-4">Remark</th><th class="py-2"></th>
              </tr></thead>
              <tbody>
                ${state.radios
                  .map((r) => {
                    const status = getLatestStatus(state.inspections, TARGET_TYPE.RADIO, r.id);
                    return `<tr class="border-t border-black/5 dark:border-white/5">
                      <td class="py-2 pr-4 font-mono">${r.serieNo}</td>
                      <td class="py-2 pr-4">${r.position}</td>
                      <td class="py-2 pr-4">${r.section}</td>
                      <td class="py-2 pr-4">${statusBadge(status)}</td>
                      <td class="py-2 pr-4" style="color:var(--text-secondary)">${r.remark || '-'}</td>
                      <td class="py-2"><button data-del-radio="${r.id}" class="text-red-500 hover:text-red-600" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>
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
    <div class="tactile p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-bold" style="color:var(--text-primary)">อุปกรณ์เสริม (${state.accessories.length})</h2>
        <button id="btn-add-accessory" class="tactile-btn px-3 py-2 text-sm font-semibold flex items-center gap-2" style="color:var(--text-primary)">
          <i data-lucide="plus" class="w-4 h-4"></i> เพิ่มอุปกรณ์เสริม
        </button>
      </div>
      <form id="form-add-accessory" class="hidden grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        <select name="radioId" required class="tactile-inset px-3 py-2 text-sm"><option value="">-- เลือกวิทยุ --</option>${radioOptions}</select>
        <input name="details" required placeholder="รายละเอียด เช่น แท่นชาร์จ+แบตเตอรี่" class="tactile-inset px-3 py-2 text-sm sm:col-span-2" />
        <input name="remark" placeholder="Remark" class="tactile-inset px-3 py-2 text-sm" />
        <button class="tactile-btn px-3 py-2 text-sm font-semibold sm:col-span-4" style="color:var(--text-primary)">บันทึก</button>
      </form>
      ${
        state.accessories.length === 0
          ? emptyState('ยังไม่มีอุปกรณ์เสริม')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-secondary)">
                <th class="py-2 pr-4">อุปกรณ์เสริม</th><th class="py-2 pr-4">วิทยุที่ผูกด้วย</th><th class="py-2 pr-4">สถานะล่าสุด</th><th class="py-2 pr-4">Remark</th><th class="py-2"></th>
              </tr></thead>
              <tbody>
                ${state.accessories
                  .map((a) => {
                    const radio = state.radios.find((r) => r.id === a.radioId);
                    const status = getLatestStatus(state.inspections, TARGET_TYPE.ACCESSORY, a.id);
                    return `<tr class="border-t border-black/5 dark:border-white/5">
                      <td class="py-2 pr-4">${a.details}</td>
                      <td class="py-2 pr-4">${radio ? `${radio.position} (${radio.serieNo})` : '-'}</td>
                      <td class="py-2 pr-4">${statusBadge(status)}</td>
                      <td class="py-2 pr-4" style="color:var(--text-secondary)">${a.remark || '-'}</td>
                      <td class="py-2"><button data-del-accessory="${a.id}" class="text-red-500 hover:text-red-600" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>
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
    <tr class="border-t border-black/5 dark:border-white/5" data-insp-row data-target-type="${targetType}" data-target-id="${targetId}">
      <td class="py-2 pr-4">${label}</td>
      <td class="py-2 pr-4">
        <select class="tactile-inset px-2 py-1 text-sm" data-insp-status>
          <option value="" ${!existing ? 'selected' : ''}>ยังไม่ตรวจ</option>
          <option value="${INSPECTION_STATUS.NORMAL}" ${existing?.status === INSPECTION_STATUS.NORMAL ? 'selected' : ''}>Normal</option>
          <option value="${INSPECTION_STATUS.ABNORMAL}" ${existing?.status === INSPECTION_STATUS.ABNORMAL ? 'selected' : ''}>Abnormal</option>
        </select>
      </td>
      <td class="py-2 pr-4">
        <input class="tactile-inset px-2 py-1 text-sm w-full" data-insp-remark placeholder="Remark" value="${existing?.remark || ''}" />
      </td>
    </tr>
  `;
}

function renderInspection() {
  return `
    <div class="tactile p-5">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 class="font-bold" style="color:var(--text-primary)">ตรวจสภาพประจำเดือน</h2>
        <div class="flex items-center gap-2">
          <input id="input-month" type="month" value="${activeMonth}" class="tactile-inset px-3 py-2 text-sm" />
          <button id="btn-save-inspection" class="tactile-btn px-3 py-2 text-sm font-semibold flex items-center gap-2" style="color:var(--text-primary)">
            <i data-lucide="save" class="w-4 h-4"></i> บันทึกผลตรวจเดือนนี้
          </button>
        </div>
      </div>
      <h3 class="text-sm font-bold mb-2" style="color:var(--text-secondary)">วิทยุ</h3>
      <div class="overflow-x-auto mb-6"><table class="w-full text-sm">
        <thead><tr class="text-left" style="color:var(--text-secondary)"><th class="py-2 pr-4">Position / Serie No.</th><th class="py-2 pr-4">สถานะ</th><th class="py-2">Remark</th></tr></thead>
        <tbody>
          ${state.radios.map((r) => inspectionRow(TARGET_TYPE.RADIO, r.id, `${r.position} (${r.serieNo})`)).join('') || `<tr><td colspan="3">${emptyState('ยังไม่มีวิทยุในระบบ')}</td></tr>`}
        </tbody>
      </table></div>
      <h3 class="text-sm font-bold mb-2" style="color:var(--text-secondary)">อุปกรณ์เสริม</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="text-left" style="color:var(--text-secondary)"><th class="py-2 pr-4">รายละเอียด</th><th class="py-2 pr-4">สถานะ</th><th class="py-2">Remark</th></tr></thead>
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
    <div class="tactile p-5">
      <h2 class="font-bold mb-4" style="color:var(--text-primary)">ประวัติการซ่อมแซม (${rows.length})</h2>
      ${
        rows.length === 0
          ? emptyState('ยังไม่มีประวัติการซ่อม — จะสร้างอัตโนมัติเมื่อตรวจสภาพเจอ Abnormal')
          : `<div class="overflow-x-auto"><table class="w-full text-sm">
              <thead><tr class="text-left" style="color:var(--text-secondary)">
                <th class="py-2 pr-4">อุปกรณ์</th><th class="py-2 pr-4">วันที่แจ้งซ่อม</th><th class="py-2 pr-4">อาการ</th>
                <th class="py-2 pr-4">สถานะ</th><th class="py-2 pr-4">วันที่เสร็จ</th><th class="py-2">ผลการซ่อม</th>
              </tr></thead>
              <tbody>
                ${rows
                  .map(
                    (r) => `<tr class="border-t border-black/5 dark:border-white/5" data-repair-row="${r.id}">
                      <td class="py-2 pr-4">${targetLabel(r.targetType, r.targetId)}</td>
                      <td class="py-2 pr-4">${r.reportedDate}</td>
                      <td class="py-2 pr-4">${r.symptom || '-'}</td>
                      <td class="py-2 pr-4">
                        <select class="tactile-inset px-2 py-1 text-sm" data-repair-status>
                          ${Object.values(REPAIR_STATUS)
                            .map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`)
                            .join('')}
                        </select>
                      </td>
                      <td class="py-2 pr-4"><input type="date" class="tactile-inset px-2 py-1 text-sm" data-repair-completed value="${r.completedDate || ''}" /></td>
                      <td class="py-2"><input class="tactile-inset px-2 py-1 text-sm w-full" data-repair-result placeholder="ผลการซ่อม" value="${r.result || ''}" /></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
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
    document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    } catch {
      /* private mode ไม่มี localStorage ก็ไม่เป็นไร แค่ไม่จำค่าธีมข้ามเซสชัน */
    }
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
      remark: fd.get('remark').trim()
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
      remark: fd.get('remark').trim()
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
    const save = async () => {
      const id = row.dataset.repairRow;
      const existing = state.repairs.find((r) => r.id === id);
      if (!existing) return;
      await StorageEngine.repairs.put({
        ...existing,
        status: row.querySelector('[data-repair-status]').value,
        completedDate: row.querySelector('[data-repair-completed]').value || null,
        result: row.querySelector('[data-repair-result]').value.trim()
      });
      await loadAll();
    };
    row.querySelector('[data-repair-status]').addEventListener('change', save);
    row.querySelector('[data-repair-completed]').addEventListener('change', save);
    row.querySelector('[data-repair-result]').addEventListener('change', save);
  });
}

// --------------------------------------------------------------- boot ----

export const UIRenderer = {
  async init() {
    try {
      if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
    } catch {
      /* ไม่มี localStorage ก็ใช้ light mode เป็นค่าเริ่มต้น */
    }
    await loadAll();
    render();
  }
};
