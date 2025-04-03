// global.d.ts
declare global {
  interface Window {
    dataLayer: any[]; // 或者更具体的类型定义
    _gtag: (...args: any[]) => void;
  }
}
