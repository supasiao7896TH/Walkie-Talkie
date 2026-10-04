/**
 * ข้อมูลตั้งต้นพื้นฐาน (Master Seed Data) ของแผนก PE1
 * มาจากข้อมูลจริงที่ Export เมื่อ 2026-10-04
 * ใช้สำหรับ populate เข้า IndexedDB อัตโนมัติเมื่อเปิดใช้งานครั้งแรกบนอุปกรณ์ใหม่
 */

export const DEFAULT_RADIOS = [
  {
    id: 'f7b4f27d-c0ad-4a94-8e40-394c4fb2f1ca',
    serieNo: '16D26A1281',
    position: 'CTA1 F/M',
    section: 'PE1',
    remark: '',
    order: 0
  },
  {
    id: 'c4a3c58f-377e-461f-998e-e7cab9772803',
    serieNo: '16114A1167',
    position: 'CTA1 B/M 01',
    section: 'PE1',
    remark: '',
    order: 1
  },
  {
    id: '4d44651a-dc6e-4363-a480-505489bd26b4',
    serieNo: '15313D1123',
    position: 'CTA1 B/M 02',
    section: 'PE1',
    remark: '',
    order: 2
  },
  {
    id: 'b7ccd0f6-2134-4d35-921b-969a27bada54',
    serieNo: '16D26A1317',
    position: 'CTA1 F/O 1',
    section: 'PE1',
    remark: '',
    order: 3
  },
  {
    id: '536d1b43-ba0c-4aaa-aaff-e06fd458a860',
    serieNo: '16D26A1302',
    position: 'CTA1 F/O 2',
    section: 'PE1',
    remark: '',
    order: 4
  },
  {
    id: 'a0c3df59-ec16-431f-8eb9-f167eeaaf665',
    serieNo: '17306A1479',
    position: 'PTA1 F/M',
    section: 'PE1',
    remark: '',
    order: 5
  },
  {
    id: '024b4325-8785-44db-bead-fd084e61aff0',
    serieNo: '15627D0024',
    position: 'PTA1 B/M',
    section: 'PE1',
    remark: '',
    order: 6
  },
  {
    id: 'db55f3b0-690c-4886-a536-4fca16ae2b1d',
    serieNo: '16D26A1298',
    position: 'PTA1 F/O',
    section: 'PE1',
    remark: '',
    order: 7
  },
  {
    id: '4a2f9e73-abea-44a9-a23a-2caa9ed225f2',
    serieNo: '16D26A1278',
    position: 'CTA1 Sub 01',
    section: 'PE1',
    remark: '',
    order: 8
  },
  {
    id: '46ed2202-cb12-48da-a1fe-be3b2a63db64',
    serieNo: '16D26A1237',
    position: 'PTA1 Sub',
    section: 'PE1',
    remark: '',
    order: 9
  },
  {
    id: '1a6c0a12-a10b-4095-9ff3-1e5cea53354a',
    serieNo: '16D26A1151',
    position: 'PE1 spare 01',
    section: 'PE1',
    remark: '',
    order: 10
  },
  {
    id: 'b18eb629-f776-48de-ad97-3af89e998441',
    serieNo: '16D26A1088',
    position: 'PE1 spare 02',
    section: 'PE1',
    remark: '',
    order: 11
  }
];

export const DEFAULT_ACCESSORIES = [
  {
    id: 'a0e8ead1-8fde-45dc-a7aa-9c4c262db0d8',
    radioId: 'f7b4f27d-c0ad-4a94-8e40-394c4fb2f1ca',
    details: 'แท่นชาร์จ+แบตเตอรี่ (CTA1 F/M)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 0
  },
  {
    id: 'd15beafe-b990-4ee9-8b81-6f4002ffe170',
    radioId: 'b7ccd0f6-2134-4d35-921b-969a27bada54',
    details: 'แท่นชาร์จ+แบตเตอรี่ (CTA1 F/O 1)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 1
  },
  {
    id: '48ab127b-2d75-4fb0-a4c1-6d6f3233e276',
    radioId: '536d1b43-ba0c-4aaa-aaff-e06fd458a860',
    details: 'แท่นชาร์จ+แบตเตอรี่ (CTA1 F/O 2)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 2
  },
  {
    id: '71ddb66c-9609-4e07-9787-7c8fa2fa56e9',
    radioId: 'a0c3df59-ec16-431f-8eb9-f167eeaaf665',
    details: 'แท่นชาร์จ+แบตเตอรี่ (PTA1 F/M)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 3
  },
  {
    id: '85c68060-03e4-4330-acd8-6cfc6e4a743c',
    radioId: 'db55f3b0-690c-4886-a536-4fca16ae2b1d',
    details: 'แท่นชาร์จ+แบตเตอรี่ (PTA1 F/O)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 4
  },
  {
    id: 'd990fece-6efe-4931-b6cf-6a49e390351e',
    radioId: '4a2f9e73-abea-44a9-a23a-2caa9ed225f2',
    details: 'แท่นชาร์จ+แบตเตอรี่ (CTA1 Sub 01)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 5
  },
  {
    id: '43eb3911-ee34-47d8-a013-135e8ce89865',
    radioId: '46ed2202-cb12-48da-a1fe-be3b2a63db64',
    details: 'แท่นชาร์จ+แบตเตอรี่ (PTA1 Sub)',
    remark: 'แบตเตอรี่ใช้งาน 1 ก้อน+ชาร์ตอยู่ 1 ก้อน',
    order: 6
  }
];
