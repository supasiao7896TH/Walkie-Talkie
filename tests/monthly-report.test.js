import { describe, it, expect } from 'vitest';
import { buildMonthlyStatusRows } from '../src/modules/inspection-logic.js';

const items = [
  { id: 'r1', serieNo: 'SN-001' },
  { id: 'r2', serieNo: 'SN-002' }
];

function inspection(overrides) {
  return { id: crypto.randomUUID(), targetType: 'radio', remark: '', ...overrides };
}

describe('buildMonthlyStatusRows', () => {
  it('returns null status when the item has no inspection for that month', () => {
    const rows = buildMonthlyStatusRows(items, [], 'radio', '2026-08', (i) => i.serieNo);
    expect(rows).toEqual([
      { id: 'r1', label: 'SN-001', status: null, remark: '' },
      { id: 'r2', label: 'SN-002', status: null, remark: '' }
    ]);
  });

  it('matches the inspection for the requested month only, ignoring other months', () => {
    const inspections = [
      inspection({ targetId: 'r1', yearMonth: '2026-07', status: 'abnormal' }),
      inspection({ targetId: 'r1', yearMonth: '2026-08', status: 'normal', remark: 'โอเคแล้ว' })
    ];
    const rows = buildMonthlyStatusRows(items, inspections, 'radio', '2026-08', (i) => i.serieNo);
    expect(rows[0]).toEqual({ id: 'r1', label: 'SN-001', status: 'normal', remark: 'โอเคแล้ว' });
  });

  it('does not mix inspections across different targetType sharing the same targetId', () => {
    const inspections = [
      inspection({ targetType: 'accessory', targetId: 'r1', yearMonth: '2026-08', status: 'abnormal' })
    ];
    const rows = buildMonthlyStatusRows(items, inspections, 'radio', '2026-08', (i) => i.serieNo);
    expect(rows[0].status).toBeNull();
  });
});
