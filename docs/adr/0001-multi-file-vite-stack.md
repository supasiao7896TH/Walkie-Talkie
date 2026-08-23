# ใช้ Multi-file (Vite + ES Modules + Vitest) แทนมาตรฐาน Single HTML File

มาตรฐานเดิมของ Supasit.A สำหรับแอปเล็ก/คนเดียวคือ Single HTML File (ไม่มี build step ง่ายต่อ workflow 2 เครื่อง) แต่โปรเจกต์นี้ต้องการ automated test (Vitest) คุ้มครอง business logic ที่พังเงียบได้ง่าย — โดยเฉพาะการคำนวณสถานะล่าสุดของอุปกรณ์จากประวัติตรวจ และการ sync สถานะ Repair↔Inspection อัตโนมัติ ซึ่ง Single HTML File ไม่มีทางตั้ง test runner ได้ในตัว จึงเลือกสลับมาใช้ Vite + ES Modules + Vitest ตาม `vibe-coding-multifile` skill แทน โดยยอมรับ trade-off ที่ต้องมี `npm install`/build step เพิ่มขึ้น
