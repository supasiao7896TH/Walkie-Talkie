import { TARGET_TYPE } from '../app-config.js';
import { getLatestStatus } from '../inspection-logic.js';
import { emptyState, statusBadge, escapeHtml } from '../ui-utils.js';

export function renderRadios(state) {
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
                      <td class="py-2 pr-4" style="color:var(--accent-2)">${escapeHtml(r.serieNo)}</td>
                      <td class="py-2 pr-4">${escapeHtml(r.position)}</td>
                      <td class="py-2 pr-4">${escapeHtml(r.section)}</td>
                      <td class="py-2 pr-4">${statusBadge(status)}</td>
                      <td class="py-2 pr-4" style="color:var(--text-2)">${escapeHtml(r.remark) || '-'}</td>
                      <td class="py-2">
                        <div class="flex items-center gap-1">
                          <button data-edit-radio="${r.id}" class="icon-btn" aria-label="แก้ไขวิทยุ ${escapeHtml(r.serieNo)}" title="แก้ไข"><i data-lucide="pencil" class="w-4 h-4" aria-hidden="true"></i></button>
                          <button data-del-radio="${r.id}" class="icon-btn icon-btn-danger" aria-label="ลบวิทยุ ${escapeHtml(r.serieNo)}" title="ลบ"><i data-lucide="trash-2" class="w-4 h-4" aria-hidden="true"></i></button>
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

export function attachRadiosHandlers({ state, loadAll, render, SECTION, StorageEngine, getEditingId, setEditingId }) {
  const form = document.getElementById('form-add-radio');
  if (!form) return;
  const submitBtn = form.querySelector('button');

  document.getElementById('btn-add-radio')?.addEventListener('click', () => {
    const wasHidden = form.classList.contains('hidden');
    form.classList.toggle('hidden');
    if (wasHidden) {
      setEditingId(null);
      form.reset();
      submitBtn.textContent = 'บันทึก';
    }
  });

  document.querySelectorAll('[data-edit-radio]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const r = state.radios.find((x) => x.id === btn.dataset.editRadio);
      if (!r) return;
      setEditingId(r.id);
      form.classList.remove('hidden');
      form.querySelector('[name=serieNo]').value = r.serieNo;
      form.querySelector('[name=position]').value = r.position;
      form.querySelector('[name=remark]').value = r.remark || '';
      submitBtn.textContent = 'บันทึกการแก้ไข';
      form.querySelector('[name=serieNo]').focus();
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const editingId = getEditingId();
    if (editingId) {
      const existing = state.radios.find((r) => r.id === editingId);
      await StorageEngine.radios.put({
        ...existing,
        serieNo: fd.get('serieNo').trim(),
        position: fd.get('position').trim(),
        remark: fd.get('remark').trim()
      });
      setEditingId(null);
    } else {
      await StorageEngine.radios.put({
        id: crypto.randomUUID(),
        serieNo: fd.get('serieNo').trim(),
        position: fd.get('position').trim(),
        section: SECTION,
        remark: fd.get('remark').trim(),
        order: Date.now()
      });
    }
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
