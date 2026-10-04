import { describe, it, expect } from 'vitest';
import { DEFAULT_RADIOS, DEFAULT_ACCESSORIES } from '../src/data/seed-data.js';

describe('Seed Data Integrity', () => {
  it('has 12 default radios with valid schema', () => {
    expect(DEFAULT_RADIOS).toHaveLength(12);
    for (const r of DEFAULT_RADIOS) {
      expect(r.id).toBeDefined();
      expect(typeof r.id).toBe('string');
      expect(r.serieNo).toMatch(/^[0-9A-Z]+$/);
      expect(r.position).toBeTruthy();
      expect(r.section).toBe('PE1');
      expect(typeof r.order).toBe('number');
    }
  });

  it('has unique serie numbers across all default radios', () => {
    const series = DEFAULT_RADIOS.map((r) => r.serieNo);
    const uniqueSeries = new Set(series);
    expect(uniqueSeries.size).toBe(DEFAULT_RADIOS.length);
  });

  it('has 7 default accessories and each references a valid radio', () => {
    expect(DEFAULT_ACCESSORIES).toHaveLength(7);
    const radioIds = new Set(DEFAULT_RADIOS.map((r) => r.id));
    for (const a of DEFAULT_ACCESSORIES) {
      expect(a.id).toBeDefined();
      expect(radioIds.has(a.radioId)).toBe(true);
      expect(a.details).toBeTruthy();
      expect(typeof a.order).toBe('number');
    }
  });
});
