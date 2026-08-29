export const APP_NAME = 'Walkie Talkie Tracker';
export const SECTION = 'PE1';

export const DB_NAME = 'WalkieTalkiePE1DB';
export const DB_VERSION = 1;

export const STORES = {
  RADIOS: 'radios',
  ACCESSORIES: 'accessories',
  INSPECTIONS: 'inspections',
  REPAIRS: 'repairs'
};

export const TARGET_TYPE = {
  RADIO: 'radio',
  ACCESSORY: 'accessory'
};

export const INSPECTION_STATUS = {
  NORMAL: 'normal',
  ABNORMAL: 'abnormal'
};

export const REPAIR_STATUS = {
  PENDING: 'รอซ่อม',
  IN_PROGRESS: 'กำลังซ่อม',
  DONE: 'ซ่อมเสร็จ',
  DISPOSED: 'จำหน่ายทิ้ง'
};

// สถานะที่ถือว่า "ยังเปิดอยู่" — ใช้กันสร้างรายการซ่อมซ้ำสำหรับ target เดียวกัน
export const OPEN_REPAIR_STATUSES = [REPAIR_STATUS.PENDING, REPAIR_STATUS.IN_PROGRESS];

// สี badge อ้างอิง CSS variable ของ design token (ok/warn/crit/accent = ความหมายสถานะ ตาม design-system.md ST-4)
export const BADGE_TONE_CLASSES = {
  ok: 'bg-[var(--ok-soft)] text-[var(--ok)]',
  warn: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  crit: 'bg-[var(--crit-soft)] text-[var(--crit)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)]',
  muted: 'bg-[var(--surface-2)] text-[var(--text-3)]'
};

export const INSPECTION_STATUS_TONE = {
  [INSPECTION_STATUS.NORMAL]: 'ok',
  [INSPECTION_STATUS.ABNORMAL]: 'crit'
};

export const REPAIR_STATUS_TONE = {
  [REPAIR_STATUS.PENDING]: 'warn',
  [REPAIR_STATUS.IN_PROGRESS]: 'accent',
  [REPAIR_STATUS.DONE]: 'ok',
  [REPAIR_STATUS.DISPOSED]: 'muted'
};
