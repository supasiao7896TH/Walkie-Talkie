import { TARGET_TYPE, INSPECTION_STATUS, OPEN_REPAIR_STATUSES } from '../app-config.js';
import { emptyState, targetLabel, repairStatusBadge, escapeHtml } from '../ui-utils.js';

function kpiCard(label, value, colorVar, icon) {
  return `
    <div class="card p-5" style="border-top:4px solid var(${colorVar})">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold" style="color:var(--text-2)">${escapeHtml(label)}</span>
        <i data-lucide="${icon}" class="w-5 h-5" style="color:var(--text-3)" aria-hidden="true"></i>
      </div>
      <p class="text-3xl font-bold mt-2" style="color:var(--text)">${value}</p>
    </div>
  `;
}

export function renderDashboard(state, activeMonth) {
  const totalRadios = state.radios.length;
  const totalAccessories = state.accessories.length;

  const abnormalThisMonth = [
    ...state.radios.map((r) => [TARGET_TYPE.RADIO, r.id]),
    ...state.accessories.map((a) => [TARGET_TYPE.ACCESSORY, a.id])
  ].filter(([type, id]) => {
    const insp = state.inspections.find(
      (i) => i.targetType === type && i.targetId === id && i.yearMonth === activeMonth
    );
    return insp && insp.status === INSPECTION_STATUS.ABNORMAL;
  }).length;

  const openRepairs = state.repairs.filter((r) => OPEN_REPAIR_STATUSES.includes(r.status));

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${kpiCard('วิทยุทั้งหมด', totalRadios, '--accent', 'radio')}
      ${kpiCard('อุปกรณ์เสริมทั้งหมด', totalAccessories, '--border-strong', 'battery-charging')}
      ${kpiCard(`Abnormal เดือน ${activeMonth}`, abnormalThisMonth, '--crit', 'alert-triangle')}
      ${kpiCard('ซ่อมค้าง (รอ/กำลังซ่อม)', openRepairs.length, '--warn', 'wrench')}
    </div>

    <div class="card p-5 mt-6">
      <h2 class="font-bold mb-3 flex items-center gap-2" style="color:var(--text)">
        <i data-lucide="wrench" class="w-4 h-4" aria-hidden="true"></i> รายการซ่อมที่ยังไม่เสร็จ
      </h2>
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
                      <td class="py-2 pr-4">${targetLabel(state, r.targetType, r.targetId)}</td>
                      <td class="py-2 pr-4">${escapeHtml(r.reportedDate)}</td>
                      <td class="py-2 pr-4">${escapeHtml(r.symptom) || '-'}</td>
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
