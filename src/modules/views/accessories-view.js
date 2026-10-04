import { TARGET_TYPE } from '../app-config.js';
import { getLatestStatus } from '../inspection-logic.js';
import { emptyState, statusBadge, escapeHtml } from '../ui-utils.js';

export function renderAccessories(state) {
  const radioOptions = state.radios
    .map((r) => `<option value="${r.id}">${escapeHtml(r.position)} (${escapeHtml(r.serieNo)})</option>`)
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
                      <td class="py-2 pr-4">${escapeHtml(a.details)}</td>
                      <td class="py-2 pr-4">${radio ? `${escapeHtml(radio.position)} (${escapeHtml(radio.serieNo)})` : '-'}</td>
                      <td class="py-2 pr-4">${statusBadge(status)}</td>
                      <td class="py-2 pr-4" style="color:var(--text-2)">${escapeHtml(a.remark) || '-'}</td>
                      <td class="py-2">
                        <div class="flex items-center gap-1">
                          <button data-edit-accessory="${a.id}" class="icon-btn" aria-label="แก้ไขอุปกรณ์เสริม ${escapeHtml(a.details)}" title="แก้ไข"><i data-lucide="pencil" class="w-4 h-4" aria-hidden="true"></i></button>
                          <button data-del-accessory="${a.id}" class="icon-btn icon-btn-danger" aria-label="ลบอุปกรณ์เสริม ${escapeHtml(a.details)}" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i></button>
                        </div>
                      </td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;
}

export function attachAccessoriesHandlers({ state, loadAll, render, StorageEngine, getEditingId, setEditingId }) {
  const form = document.getElementById('form-add-accessory');
  if (!form) return;
  const submitBtn = form.querySelector('button');

  document.getElementById('btn-add-accessory')?.addEventListener('click', () => {
    const wasHidden = form.classList.contains('hidden');
    form.classList.toggle('hidden');
    if (wasHidden) {
      setEditingId(null);
      form.reset();
      submitBtn.textContent = 'บันทึก';
    }
  });

  document.querySelectorAll('[data-edit-accessory]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const a = state.accessories.find((x) => x.id === btn.dataset.editAccessory);
      if (!a) return;
      setEditingId(a.id);
      form.classList.remove('hidden');
      form.querySelector('[name=radioId]').value = a.radioId;
      form.querySelector('[name=details]').value = a.details;
      form.querySelector('[name=remark]').value = a.remark || '';
      submitBtn.textContent = 'บันทึกการแก้ไข';
      form.querySelector('[name=details]').focus();
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const editingId = getEditingId();
    if (editingId) {
      const existing = state.accessories.find((a) => a.id === editingId);
      await StorageEngine.accessories.put({
        ...existing,
        radioId: fd.get('radioId'),
        details: fd.get('details').trim(),
        remark: fd.get('remark').trim()
      });
      setEditingId(null);
    } else {
      await StorageEngine.accessories.put({
        id: crypto.randomUUID(),
        radioId: fd.get('radioId'),
        details: fd.get('details').trim(),
        remark: fd.get('remark').trim(),
        order: Date.now()
      });
    }
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
