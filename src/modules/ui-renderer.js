import { StorageEngine, setSyncHook } from './storage-engine.js';
import { SECTION } from './app-config.js';
import { exportWorkbook, importWorkbookFile } from './excel-io.js';
import { DEFAULT_RADIOS, DEFAULT_ACCESSORIES } from '../data/seed-data.js';
import { icons } from './ui-utils.js';
import { CloudSyncManager } from './cloud-sync-manager.js';

// Views
import { renderDashboard } from './views/dashboard-view.js';
import { renderRadios, attachRadiosHandlers } from './views/radios-view.js';
import { renderAccessories, attachAccessoriesHandlers } from './views/accessories-view.js';
import { renderInspection, attachInspectionHandlers } from './views/inspection-view.js';
import { renderRepairs, attachRepairsHandlers } from './views/repairs-view.js';
import { renderReport, attachReportHandlers } from './views/report-view.js';

setSyncHook(CloudSyncManager);

let state = { radios: [], accessories: [], inspections: [], repairs: [] };
let activeTab = 'dashboard';
let activeMonth = new Date().toISOString().slice(0, 7);
let editingRadioId = null;
let editingAccessoryId = null;
let brandDockLightSvg = '';
let brandDockDarkSvg = '';

function syncStatusBadge(status) {
  if (status === 'online') {
    return `<span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="เชื่อมต่อ Real-time สำเร็จ"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cloud Sync</span>`;
  }
  if (status === 'connecting') {
    return `<span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="กำลังเชื่อมต่อ Cloud..."><span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Connecting</span>`;
  }
  return `<span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20" title="โหมดออฟไลน์ — ข้อมูลปลอดภัยในเครื่อง"><span class="w-2 h-2 rounded-full bg-slate-400"></span> Local-First</span>`;
}

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

function sortByOrder(list) {
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function loadAll() {
  await StorageEngine.seedIfEmpty({ defaultRadios: DEFAULT_RADIOS, defaultAccessories: DEFAULT_ACCESSORIES });
  state = await StorageEngine.loadAll();
  state.radios = sortByOrder(state.radios);
  state.accessories = sortByOrder(state.accessories);
}

function renderHeader() {
  const isDark = document.documentElement.classList.contains('dark');
  const syncStatus = CloudSyncManager.getStatus();
  return `
    <header class="border-b border-[var(--border)]">
      <div class="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl md:text-3xl font-bold" style="color:var(--text)">Walkie Talkie Tracker</h1>
            ${syncStatusBadge(syncStatus)}
          </div>
          <p class="text-sm mt-0.5" style="color:var(--text-2)">รายการวิทยุ · ตรวจสภาพประจำเดือน · ประวัติซ่อม — แผนก ${SECTION}</p>
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
      return renderDashboard(state, activeMonth);
    case 'radios':
      return renderRadios(state);
    case 'accessories':
      return renderAccessories(state);
    case 'inspection':
      return renderInspection(state, activeMonth);
    case 'repairs':
      return renderRepairs(state);
    case 'report':
      return renderReport(state, activeMonth, SECTION);
    default:
      return '';
  }
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

  // Attach handlers by tab
  if (activeTab === 'radios') {
    attachRadiosHandlers({
      state,
      loadAll,
      render,
      SECTION,
      StorageEngine,
      getEditingId: () => editingRadioId,
      setEditingId: (id) => { editingRadioId = id; }
    });
  } else if (activeTab === 'accessories') {
    attachAccessoriesHandlers({
      state,
      loadAll,
      render,
      StorageEngine,
      getEditingId: () => editingAccessoryId,
      setEditingId: (id) => { editingAccessoryId = id; }
    });
  } else if (activeTab === 'inspection') {
    attachInspectionHandlers({
      state,
      getActiveMonth: () => activeMonth,
      setActiveMonth: (m) => { activeMonth = m; },
      loadAll,
      render,
      StorageEngine
    });
  } else if (activeTab === 'repairs') {
    attachRepairsHandlers({
      state,
      loadAll,
      render,
      StorageEngine
    });
  } else if (activeTab === 'report') {
    attachReportHandlers({
      setActiveMonth: (m) => { activeMonth = m; },
      render
    });
  }
}

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
    } catch {
      /* ไม่มี localStorage ก็ใช้ system preference */
    }
    await Promise.all([loadAll(), loadBrandDockAssets()]);
    render();

    // เริ่มต้น Real-Time Cloud Sync ในพื้นหลัง
    CloudSyncManager.onStatusChange(() => {
      // Re-render header indicator เมื่อสถานะการเชื่อมต่อเปลี่ยน
      const headerEl = document.querySelector('header');
      if (headerEl) {
        render();
      }
    });

    CloudSyncManager.initRealtimeSync({
      onDataUpdated: async () => {
        await loadAll();
        render();
      }
    });
  }
};
