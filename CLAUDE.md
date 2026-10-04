# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Walkie Talkie Tracker (PE1)

รายการวิทยุสื่อสาร/อุปกรณ์เสริม · ตรวจสภาพประจำเดือน · ประวัติการซ่อมแซม · รายงานประจำเดือน — แผนกผลิต 1 (PE1), GC-M PTA

## Commands
```
npm install
npm run dev        # Vite dev server พร้อม hot reload
npm test           # รัน Vitest ทั้งหมดครั้งเดียว
npm run test:watch # รัน Vitest แบบ watch mode
npm run build      # production build -> dist/
npm run preview    # เปิด dist/ ที่ build แล้วดูก่อน deploy จริง
```
รันเทสไฟล์เดียว: `npx vitest run tests/<ชื่อไฟล์>.test.js`

## Architecture
- `src/main.js` — entry point, ลงทะเบียน service worker (`public/sw.js`)
- `src/modules/app-config.js` — ค่าคงที่ (DB name/version, enum สถานะ) + mapping สี badge ตาม "tone" (ok/warn/crit/accent/muted) ที่ใช้ร่วมกันทั้งแอป
- `src/modules/storage-engine.js` — IndexedDB CRUD (Promise-based) 4 store: radios, accessories, inspections, repairs
- `src/modules/inspection-logic.js` — pure business logic ทั้งหมด (สถานะล่าสุดของ target, สถานะรายเดือนสำหรับหน้ารายงาน, auto-link Repair↔Inspection) — มี Vitest คุ้มครองเต็ม
- `src/modules/excel-io.js` — mapping ระหว่าง record กับแถว Excel (Export/Import) — มี Vitest คุ้มครอง
- `src/modules/ui-renderer.js` — render ทุกหน้าจอแบบ template string ล้วน ไม่ใช้ framework: Dashboard / รายการวิทยุ / อุปกรณ์เสริม / ตรวจสภาพประจำเดือน / ประวัติการซ่อม / รายงานประจำเดือน (ใน `TABS`) เก็บ state เป็น module-level `let` (`state`, `activeTab`, `activeMonth`, `editingRadioId`/`editingAccessoryId`) แล้ว `render()` regenerate `#app.innerHTML` ทั้งก้อนทุกครั้งที่มีการเปลี่ยนแปลง — ทุกแท็บต้องมีคู่ `render*()` + `attach*Handlers()` แยกกันเสมอ (handler ถูก rebind ใหม่หลัง re-render ทุกครั้งเพราะ DOM ถูกสร้างใหม่)
- Design tokens ทั้งหมดอยู่ใน `src/style.css` เป็น CSS variable (`--bg`, `--surface`, `--accent`, `--ok/--warn/--crit`, `--r-*` radius scale ฯลฯ) รองรับ 3 สถานะธีม (`:root` → `@media prefers-color-scheme` → `[data-theme]`) — ใช้ token ชุดนี้เท่านั้น ห้าม hardcode สี/radius ใหม่ในหน้าแอปปกติ (ยกเว้นหน้า "รายงานประจำเดือน" ที่บังคับสีสว่างตายตัวโดยตั้งใจ — ดูด้านล่าง)
- Footer มี "Brand Dock" (`renderBrandDock()`) เป็นแถบ branding ส่วนตัวของผู้พัฒนา (A(i)CODER) fixed อยู่ล่างสุดเสมอ ใช้ asset จาก `public/vendor/branding/d1-neon-arcade-bare.svg`/`d2-crt-night-bare.svg` (สลับตามธีม) — inline `<svg>` ตรงๆ ไม่ใช้ `<img>` เพราะ Chrome ไม่รัน CSS animation ของ SVG ที่โหลดผ่าน `<img>` ไม่ใช่ UI ฟีเจอร์ของแอป ไม่ควรแก้ตาม feature request ทั่วไป
- "รายงานประจำเดือน" (`renderReport()` + `copyReportImage()`) capture DOM ด้วย html2canvas แล้วเขียนเข้า clipboard ตรงๆ ผ่าน Clipboard API ให้ paste ในอีเมลได้เลย — เนื้อหาในนี้ (`#report-capture`) บังคับสีสว่างตายตัวด้วย inline style (ไม่อิง CSS variable ธีมแอป) เพื่อให้อ่านง่ายบนพื้นขาวของอีเมลเสมอไม่ว่าแอปจะอยู่ธีมไหน
- CDN/vendor libs โหลดใน `index.html`: Tailwind CSS (CDN); Lucide icons, SheetJS/XLSX, html2canvas vendored ที่ `public/vendor/` (ไม่ใช้ CDN — xlsx เพราะ npm registry version มีช่องโหว่ที่ยังไม่ patch, ที่เหลือเพื่อ CSP-friendly/offline-first)
- CSP บังคับผ่าน `<meta http-equiv="Content-Security-Policy">` ใน `index.html` — เพิ่ม domain ใหม่ที่นี่ทุกครั้งที่เพิ่ม external resource
- ดู `CONTEXT.md` สำหรับ domain glossary (Radio/Accessory/Position/Section/Inspection/Repair/Target) และ `docs/adr/` สำหรับเหตุผลของการตัดสินใจสำคัญ

## Testing
- `tests/*.test.js` ครอบเฉพาะ pure logic ใน `inspection-logic.js` และ `excel-io.js` เท่านั้น — ไม่มีเทส UI/DOM (`ui-renderer.js` ตั้งใจไม่เทส)
- แต่ละไฟล์เทสสร้าง fixture ด้วยฟังก์ชัน helper เล็กๆ ในไฟล์ตัวเอง ไม่มี shared fixture file — ดู `tests/inspection-status.test.js` เป็นตัวอย่างแพทเทิร์น

## Storage & scope (v1)
- Local-only IndexedDB — ไม่มี cloud sync/login/server (ดู `docs/adr/0002-local-only-storage.md`) — ฟีเจอร์ใดที่ปกติต้องมี backend (เช่น ส่งอีเมลอัตโนมัติ) ต้องหาทางออกที่ทำงานฝั่ง client ล้วน (ดู copy-as-image ของหน้ารายงานเป็นตัวอย่างการแก้ปัญหานี้)
- Backup ผ่าน Export/Import Excel เท่านั้น — เตือนผู้ใช้เป็นระยะให้ export เก็บไว้
- Section hardcode เป็น "PE1" เดียว ไม่รองรับหลายแผนกใน v1

## CI/CD
- `.github/workflows/ci.yml`: job `build-and-test` รันทุก push/PR (npm ci → build → test), job `deploy` รันเฉพาะ push → main และต้องรอ `build-and-test` ผ่านก่อน (`needs:`)
- Deploy ไป Cloudflare Workers ผ่าน `wrangler deploy` (ดู `cloudflare-workers-deploy` skill) — ต้องตั้ง GitHub Secret `CLOUDFLARE_API_TOKEN` และแก้ `account_id` ใน `wrangler.jsonc` ก่อน push ครั้งแรก (ดูคอมเมนต์ในไฟล์)
- `wrangler.jsonc` ชี้ `assets.directory` ไปที่ `./dist` (ไม่ใช่ `./`) เพราะมี Vite build step ก่อน deploy จริง
