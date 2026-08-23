# Walkie Talkie Tracker (PE1)

รายการวิทยุสื่อสาร/อุปกรณ์เสริม · ตรวจสภาพประจำเดือน · ประวัติการซ่อมแซม — แผนกผลิต 1 (PE1), GC-M PTA

## Commands
```
npm install
npm run dev      # Vite dev server พร้อม hot reload
npm test         # รัน Vitest ทั้งหมดครั้งเดียว
npm run build    # production build -> dist/
npm run preview  # เปิด dist/ ที่ build แล้วดูก่อน deploy จริง
```

## Architecture
- `src/main.js` — entry point
- `src/modules/app-config.js` — ค่าคงที่ (DB name/version, enum สถานะต่างๆ)
- `src/modules/storage-engine.js` — IndexedDB CRUD (Promise-based) 4 store: radios, accessories, inspections, repairs
- `src/modules/inspection-logic.js` — pure business logic (คำนวณสถานะล่าสุด, auto-link Repair↔Inspection) — มี Vitest คุ้มครอง
- `src/modules/excel-io.js` — mapping ระหว่าง record กับแถว Excel (Export/Import) — มี Vitest คุ้มครอง
- `src/modules/ui-renderer.js` — render หน้าจอทั้งหมด (Dashboard/รายการวิทยุ/อุปกรณ์เสริม/ตรวจสภาพ/ประวัติซ่อม)
- CDN/vendor libs โหลดใน `index.html`: Tailwind CSS (CDN), Lucide icons + SheetJS/XLSX (vendored ที่ `public/vendor/` — ไม่ใช้ CDN เพราะ npm registry version ของ xlsx มีช่องโหว่ที่ยังไม่ patch)
- ดู `CONTEXT.md` สำหรับ domain glossary และ `docs/adr/` สำหรับเหตุผลของการตัดสินใจสำคัญ

## Storage & scope (v1)
- Local-only IndexedDB — ไม่มี cloud sync/login (ดู `docs/adr/0002-local-only-storage.md`)
- Backup ผ่าน Export/Import Excel เท่านั้น — เตือนผู้ใช้เป็นระยะให้ export เก็บไว้
- Section hardcode เป็น "PE1" เดียว ไม่รองรับหลายแผนกใน v1

## CI/CD
- `.github/workflows/ci.yml`: job `build-and-test` รันทุก push/PR (npm ci → build → test), job `deploy` รันเฉพาะ push → main และต้องรอ `build-and-test` ผ่านก่อน (`needs:`)
- Deploy ไป Cloudflare Workers ผ่าน `wrangler deploy` (ดู `cloudflare-workers-deploy` skill) — ต้องตั้ง GitHub Secret `CLOUDFLARE_API_TOKEN` และแก้ `account_id` ใน `wrangler.jsonc` ก่อน push ครั้งแรก (ดูคอมเมนต์ในไฟล์)
- `wrangler.jsonc` ชี้ `assets.directory` ไปที่ `./dist` (ไม่ใช่ `./`) เพราะมี Vite build step ก่อน deploy จริง
