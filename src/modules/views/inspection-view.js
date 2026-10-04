import { TARGET_TYPE, INSPECTION_STATUS } from '../app-config.js';
import { shouldCreateRepair, buildRepairFromInspection } from '../inspection-logic.js';
import { emptyState, todayStr, toast, escapeHtml } from '../ui-utils.js';

function inspectionRow(state, activeMonth, targetType, targetId, labelCells) {
  const existing = state.inspections.find(
    (i) => i.targetType === targetType && i.targetId === targetId && i.yearMonth === activeMonth
  );
  const leadingCells = labelCells.map((cell) => `<td class="py-2 pr-4">${cell}</td>`).join('');
  return `
    <tr class="border-t border-[var(--border)]" data-insp-row data-target-type="${targetType}" data-target-id="${targetId}">
      ${leadingCells}
      <td class="py-2 pr-4">
        <select class="input px-2 py-1 text-sm w-full" data-insp-status>
          <option value="" ${!existing ? 'selected' : ''}>ยังไม่ตรวจ</option>
          <option value="${INSPECTION_STATUS.NORMAL}" ${existing?.status === INSPECTION_STATUS.NORMAL ? 'selected' : ''}>Normal</option>
          <option value="${INSPECTION_STATUS.ABNORMAL}" ${existing?.status === INSPECTION_STATUS.ABNORMAL ? 'selected' : ''}>Abnormal</option>
        </select>
      </td>
      <td class="py-2 pr-4">
        <input class="input px-2 py-1 text-sm w-full" data-insp-remark placeholder="Remark" value="${escapeHtml(existing?.remark || '')}" />
      </td>
    </tr>
  `;
}

const RADIO_INSPECTION_COLGROUP = `<colgroup><col style="width:30%" /><col style="width:20%" /><col style="width:20%" /><col style="width:30%" /></colgroup>`;
const ACCESSORY_INSPECTION_COLGROUP = `<colgroup><col style="width:50%" /><col style="width:20%" /><col style="width:30%" /></colgroup>`;

export function renderInspection(state, activeMonth) {
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
        ${RADIO_INSPECTION_COLGROUP}
        <thead><tr class="text-left" style="color:var(--text-2)"><th class="py-2 pr-4">Position</th><th class="py-2 pr-4">Serie No.</th><th class="py-2 pr-4">สถานะ</th><th class="py-2">Remark</th></tr></thead>
        <tbody>
          ${state.radios
            .map((r) =>
              inspectionRow(state, activeMonth, TARGET_TYPE.RADIO, r.id, [
                escapeHtml(r.position),
                `<span style="color:var(--accent-2)">${escapeHtml(r.serieNo)}</span>`
              ])
            )
            .join('') || `<tr><td colspan="4">${emptyState('ยังไม่มีวิทยุในระบบ')}</td></tr>`}
        </tbody>
      </table></div>
      <h3 class="text-sm font-bold mb-2" style="color:var(--text-2)">อุปกรณ์เสริม</h3>
      <div class="overflow-x-auto"><table class="w-full text-sm" style="table-layout:fixed">
        ${ACCESSORY_INSPECTION_COLGROUP}
        <thead><tr class="text-left" style="color:var(--text-2)"><th class="py-2 pr-4">รายละเอียด</th><th class="py-2 pr-4">สถานะ</th><th class="py-2">Remark</th></tr></thead>
        <tbody>
          ${state.accessories
            .map((a) => inspectionRow(state, activeMonth, TARGET_TYPE.ACCESSORY, a.id, [escapeHtml(a.details)]))
            .join('') || `<tr><td colspan="3">${emptyState('ยังไม่มีอุปกรณ์เสริมในระบบ')}</td></tr>`}
        </tbody>
      </table></div>
    </div>
  `;
}

export function attachInspectionHandlers({ state, getActiveMonth, setActiveMonth, loadAll, render, StorageEngine }) {
  document.getElementById('input-month')?.addEventListener('change', (e) => {
    setActiveMonth(e.target.value);
    render();
  });

  document.getElementById('btn-save-inspection')?.addEventListener('click', async () => {
    const rows = document.querySelectorAll('[data-insp-row]');
    const newInspections = [];
    const newRepairs = [];
    const currentMonth = getActiveMonth();

    for (const row of rows) {
      const status = row.querySelector('[data-insp-status]').value;
      if (!status) continue; // แถวที่ยังไม่ได้ตรวจ ข้ามไป

      const targetType = row.dataset.targetType;
      const targetId = row.dataset.targetId;
      const remark = row.querySelector('[data-insp-remark]').value.trim();

      const existing = state.inspections.find(
        (i) => i.targetType === targetType && i.targetId === targetId && i.yearMonth === currentMonth
      );

      const record = {
        id: existing?.id || crypto.randomUUID(),
        targetType,
        targetId,
        yearMonth: currentMonth,
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
