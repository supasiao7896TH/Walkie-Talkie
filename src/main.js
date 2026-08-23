import { UIRenderer } from './modules/ui-renderer.js';

UIRenderer.init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* ลงทะเบียนไม่สำเร็จก็ใช้งานแอปปกติได้ แค่ไม่มี offline cache */
    });
  });
}
