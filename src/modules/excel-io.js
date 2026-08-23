/* global XLSX */
// XLSX โหลดผ่าน CDN <script> ใน index.html (ดู DS-8 pattern เดียวกับ Lucide แต่ XLSX ยังใช้ CDN ตรงตาม
// tech stack มาตรฐานของพี่ A — ไม่ vendor เพราะไฟล์ใหญ่และอัปเดตบ่อยกว่า)

// ---- Pure mapping functions (มี Vitest คุ้มครอง — ดู tests/excel-io.test.js) ----

export function radiosToRows(radios) {
  return radios.map((r) => ({
    ID: r.id,
    'Serie No.': r.serieNo,
    Position: r.position,
    Section: r.section,
    Remark: r.remark || ''
  }));
}

export function rowsToRadios(rows) {
  return rows.map((row) => ({
    id: String(row.ID || '').trim() || crypto.randomUUID(),
    serieNo: String(row['Serie No.'] || '').trim(),
    position: String(row.Position || '').trim(),
    section: String(row.Section || '').trim(),
    remark: String(row.Remark || '').trim()
  }));
}

export function accessoriesToRows(accessories, radiosById) {
  return accessories.map((a) => ({
    ID: a.id,
    'Radio ID': a.radioId,
    'Radio Serie No.': radiosById.get(a.radioId)?.serieNo || '',
    Details: a.details,
    Remark: a.remark || ''
  }));
}

export function rowsToAccessories(rows, radioIdBySerieNo) {
  return rows.map((row) => {
    const explicitRadioId = String(row['Radio ID'] || '').trim();
    const serieNo = String(row['Radio Serie No.'] || '').trim();
    return {
      id: String(row.ID || '').trim() || crypto.randomUUID(),
      radioId: explicitRadioId || radioIdBySerieNo.get(serieNo) || '',
      details: String(row.Details || '').trim(),
      remark: String(row.Remark || '').trim()
    };
  });
}

export function inspectionsToRows(inspections) {
  return inspections.map((i) => ({
    ID: i.id,
    'Target Type': i.targetType,
    'Target ID': i.targetId,
    'Year-Month': i.yearMonth,
    Status: i.status,
    Remark: i.remark || '',
    'Inspected At': i.inspectedAt
  }));
}

export function rowsToInspections(rows) {
  return rows.map((row) => ({
    id: String(row.ID || '').trim() || crypto.randomUUID(),
    targetType: String(row['Target Type'] || '').trim(),
    targetId: String(row['Target ID'] || '').trim(),
    yearMonth: String(row['Year-Month'] || '').trim(),
    status: String(row.Status || '').trim(),
    remark: String(row.Remark || '').trim(),
    inspectedAt: String(row['Inspected At'] || '').trim()
  }));
}

export function repairsToRows(repairs) {
  return repairs.map((r) => ({
    ID: r.id,
    'Target Type': r.targetType,
    'Target ID': r.targetId,
    'Inspection ID': r.inspectionId || '',
    'Reported Date': r.reportedDate,
    Symptom: r.symptom || '',
    'Completed Date': r.completedDate || '',
    Result: r.result || '',
    Status: r.status
  }));
}

export function rowsToRepairs(rows) {
  return rows.map((row) => ({
    id: String(row.ID || '').trim() || crypto.randomUUID(),
    targetType: String(row['Target Type'] || '').trim(),
    targetId: String(row['Target ID'] || '').trim(),
    inspectionId: String(row['Inspection ID'] || '').trim() || null,
    reportedDate: String(row['Reported Date'] || '').trim(),
    symptom: String(row.Symptom || '').trim(),
    completedDate: String(row['Completed Date'] || '').trim() || null,
    result: String(row.Result || '').trim(),
    status: String(row.Status || '').trim()
  }));
}

// ---- File I/O (ใช้ global XLSX จริง — ไม่ผ่าน Vitest, ทดสอบผ่าน manual verify) ----

export function exportWorkbook({ radios, accessories, inspections, repairs }) {
  const radiosById = new Map(radios.map((r) => [r.id, r]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(radiosToRows(radios)), 'Radios');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(accessoriesToRows(accessories, radiosById)),
    'Accessories'
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inspectionsToRows(inspections)), 'Inspections');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(repairsToRows(repairs)), 'Repairs');
  const filename = `walkie-talkie-pe1-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function importWorkbookFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const sheetToRows = (name) => {
    const sheet = wb.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet) : [];
  };

  const radios = rowsToRadios(sheetToRows('Radios'));
  const radioIdBySerieNo = new Map(radios.map((r) => [r.serieNo, r.id]));

  return {
    radios,
    accessories: rowsToAccessories(sheetToRows('Accessories'), radioIdBySerieNo),
    inspections: rowsToInspections(sheetToRows('Inspections')),
    repairs: rowsToRepairs(sheetToRows('Repairs'))
  };
}
