import { describe, it, expect } from 'vitest';
import {
  radiosToRows,
  rowsToRadios,
  accessoriesToRows,
  rowsToAccessories,
  inspectionsToRows,
  rowsToInspections,
  repairsToRows,
  rowsToRepairs
} from '../src/modules/excel-io.js';

describe('Radios row mapping round-trip', () => {
  it('keeps every field identical after export -> import', () => {
    const radios = [
      { id: 'r1', serieNo: '16D26A1281', position: 'CTA1 F/M', section: 'PE1', remark: '', order: 1000 },
      { id: 'r2', serieNo: '17306A1479', position: 'PTA1 F/M', section: 'PE1', remark: 'จอมัว', order: 2000 }
    ];
    const roundTripped = rowsToRadios(radiosToRows(radios));
    expect(roundTripped).toEqual(radios);
  });

  it('generates a fresh id for a hand-added row with no ID column, and falls back to sheet order', () => {
    const rows = [{ 'Serie No.': '99999X0001', Position: 'PE1 spare 03', Section: 'PE1', Remark: '' }];
    const [radio] = rowsToRadios(rows);
    expect(radio.id).toBeTruthy();
    expect(radio.serieNo).toBe('99999X0001');
    expect(radio.order).toBe(0);
  });

  it('keeps the sheet row order (top to bottom) as the imported order when re-imported', () => {
    const radios = [
      { id: 'r1', serieNo: 'A', position: 'CTA1 F/M', section: 'PE1', remark: '', order: 500 },
      { id: 'r2', serieNo: 'B', position: 'PTA1 F/M', section: 'PE1', remark: '', order: 100 }
    ];
    const roundTripped = rowsToRadios(radiosToRows(radios));
    expect(roundTripped.map((r) => r.order)).toEqual([500, 100]);
  });
});

describe('Accessories row mapping round-trip', () => {
  const radiosById = new Map([['r1', { id: 'r1', serieNo: '16D26A1281' }]]);
  const radioIdBySerieNo = new Map([['16D26A1281', 'r1']]);

  it('keeps radioId identical after export -> import via the raw ID column', () => {
    const accessories = [
      { id: 'a1', radioId: 'r1', details: 'แท่นชาร์จ+แบตเตอรี่ (CTA1 F/M)', remark: '', order: 1000 }
    ];
    const roundTripped = rowsToAccessories(accessoriesToRows(accessories, radiosById), radioIdBySerieNo);
    expect(roundTripped).toEqual(accessories);
  });

  it('resolves radioId from Serie No. when the raw Radio ID column is blank (manual entry)', () => {
    const rows = [{ 'Radio Serie No.': '16D26A1281', Details: 'แบตเตอรี่สำรอง', Remark: '' }];
    const [accessory] = rowsToAccessories(rows, radioIdBySerieNo);
    expect(accessory.radioId).toBe('r1');
  });
});

describe('Inspections row mapping round-trip', () => {
  it('keeps every field identical after export -> import', () => {
    const inspections = [
      {
        id: 'i1',
        targetType: 'radio',
        targetId: 'r1',
        yearMonth: '2026-08',
        status: 'abnormal',
        remark: 'สัญญาณขาด',
        inspectedAt: '2026-08-23'
      }
    ];
    expect(rowsToInspections(inspectionsToRows(inspections))).toEqual(inspections);
  });
});

describe('Repairs row mapping round-trip', () => {
  it('keeps every field identical after export -> import, including a null completedDate', () => {
    const repairs = [
      {
        id: 're1',
        targetType: 'radio',
        targetId: 'r1',
        inspectionId: 'i1',
        reportedDate: '2026-08-23',
        symptom: 'สัญญาณขาด',
        completedDate: null,
        result: '',
        status: 'รอซ่อม'
      }
    ];
    expect(rowsToRepairs(repairsToRows(repairs))).toEqual(repairs);
  });
});
