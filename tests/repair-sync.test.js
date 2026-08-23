import { describe, it, expect } from 'vitest';
import {
  shouldCreateRepair,
  buildRepairFromInspection,
  findOpenRepair
} from '../src/modules/inspection-logic.js';
import { REPAIR_STATUS } from '../src/modules/app-config.js';

function inspection(overrides) {
  return {
    id: crypto.randomUUID(),
    targetType: 'radio',
    targetId: 'r1',
    yearMonth: '2026-08',
    status: 'abnormal',
    remark: 'สัญญาณขาด',
    inspectedAt: '2026-08-23',
    ...overrides
  };
}

describe('shouldCreateRepair', () => {
  it('does not create a repair for a normal inspection', () => {
    expect(shouldCreateRepair(inspection({ status: 'normal' }), [])).toBe(false);
  });

  it('creates a repair for abnormal inspection with no open repair yet', () => {
    expect(shouldCreateRepair(inspection(), [])).toBe(true);
  });

  it('does not duplicate a repair while one is already open (pending/in-progress)', () => {
    const openRepair = {
      targetType: 'radio',
      targetId: 'r1',
      reportedDate: '2026-08-01',
      status: REPAIR_STATUS.IN_PROGRESS
    };
    expect(shouldCreateRepair(inspection(), [openRepair])).toBe(false);
  });

  it('allows a new repair once the previous one is closed (done/disposed)', () => {
    const closedRepair = {
      targetType: 'radio',
      targetId: 'r1',
      reportedDate: '2026-07-01',
      status: REPAIR_STATUS.DONE
    };
    expect(shouldCreateRepair(inspection(), [closedRepair])).toBe(true);
  });

  it('ignores open repairs belonging to a different target', () => {
    const otherTargetRepair = {
      targetType: 'radio',
      targetId: 'r2',
      reportedDate: '2026-08-01',
      status: REPAIR_STATUS.PENDING
    };
    expect(shouldCreateRepair(inspection(), [otherTargetRepair])).toBe(true);
  });
});

describe('buildRepairFromInspection', () => {
  it('links the repair back to the triggering inspection and defaults to PENDING', () => {
    const insp = inspection();
    const repair = buildRepairFromInspection(insp, '2026-08-23');
    expect(repair.id).toBeTruthy(); // ต้องมี id เสมอ — IndexedDB (keyPath: 'id') put() จะ throw DataError ถ้าไม่มี
    expect(repair.inspectionId).toBe(insp.id);
    expect(repair.targetType).toBe('radio');
    expect(repair.targetId).toBe('r1');
    expect(repair.status).toBe(REPAIR_STATUS.PENDING);
    expect(repair.symptom).toBe('สัญญาณขาด');
    expect(repair.reportedDate).toBe('2026-08-23');
    expect(repair.completedDate).toBeNull();
  });
});

describe('findOpenRepair', () => {
  it('returns the most recently reported open repair when several exist', () => {
    const repairs = [
      { targetType: 'radio', targetId: 'r1', reportedDate: '2026-06-01', status: REPAIR_STATUS.PENDING },
      { targetType: 'radio', targetId: 'r1', reportedDate: '2026-08-01', status: REPAIR_STATUS.IN_PROGRESS }
    ];
    expect(findOpenRepair(repairs, 'radio', 'r1').reportedDate).toBe('2026-08-01');
  });
});
