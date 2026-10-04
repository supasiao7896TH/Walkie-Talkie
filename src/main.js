import { UIRenderer } from './modules/ui-renderer.js';

UIRenderer.init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // บังคับตรวจหา Service Worker เวอร์ชันใหม่ทุกครั้งที่เปิดหน้าเว็บ
        reg.update();
      })
      .catch(() => {
        /* ลงทะเบียนไม่สำเร็จก็ใช้งานแอปปกติได้ แค่ไม่มี offline cache */
      });
  });

  // เมื่อ Service Worker เวอร์ชันใหม่ (v3) เข้าควบคุม ให้โหลดหน้าใหม่ 1 ครั้งเพื่อใช้โค้ดล่าสุด
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
