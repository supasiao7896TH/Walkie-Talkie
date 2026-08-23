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
