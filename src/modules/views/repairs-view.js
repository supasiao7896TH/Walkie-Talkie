import { REPAIR_STATUS, OPEN_REPAIR_STATUSES } from '../app-config.js';
import { emptyState, targetLabel, escapeHtml } from '../ui-utils.js';

export function renderRepairs(state) {
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
                <th class="py-2 pr-4">สถานะ</th><th class="py-2 pr-4">วันที่เสร็จ</th><th class="py-2 pr-4">ผลการซ่อม</th><th class="py-2"></th>
              </tr></thead>
              <tbody>
                ${rows
                  .map(
                    (r) => `<tr class="border-t border-[var(--border)]" data-repair-row="${r.id}">
                      <td class="py-2 pr-4">${targetLabel(state, r.targetType, r.targetId)}</td>
                      <td class="py-2 pr-4">${escapeHtml(r.reportedDate)}</td>
                      <td class="py-2 pr-4">${escapeHtml(r.symptom) || '-'}</td>
                      <td class="py-2 pr-4">
                        <select class="input px-2 py-1 text-sm" data-repair-status>
                          ${Object.values(REPAIR_STATUS)
                            .map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`)
                            .join('')}
                        </select>
                      </td>
                      <td class="py-2 pr-4"><input type="date" class="input px-2 py-1 text-sm" data-repair-completed value="${escapeHtml(r.completedDate || '')}" /></td>
                      <td class="py-2 pr-4"><input class="input px-2 py-1 text-sm w-full" data-repair-result placeholder="ผลการซ่อม" value="${escapeHtml(r.result || '')}" /></td>
                      <td class="py-2"><button data-del-repair="${r.id}" class="icon-btn icon-btn-danger" aria-label="ลบประวัติการซ่อม ${targetLabel(state, r.targetType, r.targetId)}" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i></button></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
}

export function attachRepairsHandlers({ state, loadAll, render, StorageEngine }) {
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

  document.querySelectorAll('[data-del-repair]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('ลบประวัติการซ่อมรายการนี้? การลบนี้ไม่สามารถย้อนกลับได้')) return;
      await StorageEngine.repairs.remove(btn.dataset.delRepair);
      await loadAll();
      render();
    })
  );
}
