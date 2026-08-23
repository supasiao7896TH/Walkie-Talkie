import { describe, it, expect } from 'vitest';
import { getLatestInspection, getLatestStatus } from '../src/modules/inspection-logic.js';

const radioA = { targetType: 'radio', targetId: 'r1' };
const radioB = { targetType: 'radio', targetId: 'r2' };

function inspection(overrides) {
  return { id: crypto.randomUUID(), remark: '', ...radioA, ...overrides };
}

describe('getLatestInspection / getLatestStatus', () => {
  it('returns null when target has no inspection history', () => {
    expect(getLatestInspection([], 'radio', 'r1')).toBeNull();
    expect(getLatestStatus([], 'radio', 'r1')).toBeNull();
  });

  it('picks the most recent yearMonth, not insertion order', () => {
    const list = [
      inspection({ yearMonth: '2026-06', status: 'normal' }),
      inspection({ yearMonth: '2026-08', status: 'abnormal' }),
      inspection({ yearMonth: '2026-07', status: 'normal' })
    ];
    expect(getLatestStatus(list, 'radio', 'r1')).toBe('abnormal');
    expect(getLatestInspection(list, 'radio', 'r1').yearMonth).toBe('2026-08');
  });

  it('does not mix inspections across different targets', () => {
    const list = [
      inspection({ yearMonth: '2026-08', status: 'abnormal' }),
      { ...radioB, id: crypto.randomUUID(), yearMonth: '2026-08', status: 'normal' }
    ];
    expect(getLatestStatus(list, 'radio', 'r1')).toBe('abnormal');
    expect(getLatestStatus(list, 'radio', 'r2')).toBe('normal');
  });

  it('does not mix radio and accessory history sharing the same targetId', () => {
    const list = [
      inspection({ yearMonth: '2026-08', status: 'abnormal', targetType: 'radio', targetId: 'x1' }),
      inspection({ yearMonth: '2026-08', status: 'normal', targetType: 'accessory', targetId: 'x1' })
    ];
    expect(getLatestStatus(list, 'radio', 'x1')).toBe('abnormal');
    expect(getLatestStatus(list, 'accessory', 'x1')).toBe('normal');
  });
});
