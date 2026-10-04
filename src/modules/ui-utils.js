import {
  INSPECTION_STATUS,
  BADGE_TONE_CLASSES,
  INSPECTION_STATUS_TONE,
  REPAIR_STATUS_TONE,
  TARGET_TYPE
} from './app-config.js';

/* global lucide */

/**
 * แปลงตัวอักขระพิเศษเพื่อป้องกัน XSS (Cross-Site Scripting) 100%
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function badge(tone, label) {
  return `<span class="px-2 py-0.5 rounded-full text-xs font-bold ${BADGE_TONE_CLASSES[tone] || BADGE_TONE_CLASSES.muted}">${label}</span>`;
}

export function statusBadge(status) {
  if (status === INSPECTION_STATUS.ABNORMAL) return badge(INSPECTION_STATUS_TONE[status], 'Abnormal');
  if (status === INSPECTION_STATUS.NORMAL) return badge(INSPECTION_STATUS_TONE[status], 'Normal');
  return badge('muted', 'ยังไม่ตรวจ');
}

export function repairStatusBadge(status) {
  return badge(REPAIR_STATUS_TONE[status], escapeHtml(status));
}

export function emptyState(text) {
  return `<p class="text-sm py-6 text-center" style="color:var(--text-3)">${escapeHtml(text)}</p>`;
}

export function targetLabel(state, targetType, targetId) {
  if (targetType === TARGET_TYPE.RADIO) {
    const r = state.radios.find((x) => x.id === targetId);
    return r ? `${escapeHtml(r.position)} (${escapeHtml(r.serieNo)})` : '(ลบแล้ว)';
  }
  const a = state.accessories.find((x) => x.id === targetId);
  const radio = a ? state.radios.find((r) => r.id === a.radioId) : null;
  return a ? `${escapeHtml(a.details)}${radio ? ' — ' + escapeHtml(radio.position) : ''}` : '(ลบแล้ว)';
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 text-sm font-semibold z-50 animate-fade-in';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export function icons() {
  if (typeof window !== 'undefined' && window.lucide) {
    lucide.createIcons();
  }
}
