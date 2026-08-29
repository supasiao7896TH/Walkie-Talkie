import { INSPECTION_STATUS, OPEN_REPAIR_STATUSES, REPAIR_STATUS } from './app-config.js';

/**
 * หาผลตรวจล่าสุดของ target หนึ่งตัว จากประวัติ inspection ทั้งหมด (append-only)
 * yearMonth เป็นสตริง "YYYY-MM" เทียบแบบ lexical ได้ตรงกับลำดับเวลาจริง
 */
export function getLatestInspection(inspections, targetType, targetId) {
  const list = inspections.filter(
    (i) => i.targetType === targetType && i.targetId === targetId
  );
  if (list.length === 0) return null;
  return list.reduce((latest, cur) => (cur.yearMonth > latest.yearMonth ? cur : latest));
}

export function getLatestStatus(inspections, targetType, targetId) {
  const latest = getLatestInspection(inspections, targetType, targetId);
  return latest ? latest.status : null;
}

/** repair ที่ยังไม่ปิดงาน (รอซ่อม/กำลังซ่อม) ของ target หนึ่งตัว ถ้ามีมากกว่า 1 ถือตัวล่าสุด */
export function findOpenRepair(repairs, targetType, targetId) {
  const list = repairs.filter(
    (r) => r.targetType === targetType && r.targetId === targetId && OPEN_REPAIR_STATUSES.includes(r.status)
  );
  if (list.length === 0) return null;
  return list.reduce((latest, cur) => (cur.reportedDate > latest.reportedDate ? cur : latest));
}

/**
 * เจอ Abnormal + ยังไม่มี repair เปิดอยู่ของ target นั้น → ควรสร้าง repair ใหม่อัตโนมัติ
 * เจอ Abnormal ซ้ำระหว่างที่ยังซ่อมไม่เสร็จ → ไม่สร้างซ้ำ (กันข้อมูลซ่อมซ้อนกัน)
 */
export function shouldCreateRepair(inspection, repairs) {
  if (inspection.status !== INSPECTION_STATUS.ABNORMAL) return false;
  return findOpenRepair(repairs, inspection.targetType, inspection.targetId) === null;
}

/** แถวรายงานประจำเดือน — สถานะตรวจของแต่ละ item เฉพาะเดือนที่ระบุ (ไม่ใช่สถานะล่าสุดโดยรวม) */
export function buildMonthlyStatusRows(items, inspections, targetType, yearMonth, labelFn) {
  return items.map((item) => {
    const insp = inspections.find(
      (i) => i.targetType === targetType && i.targetId === item.id && i.yearMonth === yearMonth
    );
    return {
      id: item.id,
      label: labelFn(item),
      status: insp?.status || null,
      remark: insp?.remark || ''
    };
  });
}

export function buildRepairFromInspection(inspection, today = new Date().toISOString().slice(0, 10)) {
  return {
    id: crypto.randomUUID(),
    targetType: inspection.targetType,
    targetId: inspection.targetId,
    inspectionId: inspection.id,
    reportedDate: today,
    symptom: inspection.remark || '',
    completedDate: null,
    result: '',
    status: REPAIR_STATUS.PENDING
  };
}
