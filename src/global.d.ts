// 新增全局类型声明文件

declare module 'data-text:~/css/*' {
  const content: string
  export default content
}

declare interface Window {
  _getHeader: (requestId: string, timestamp: string, fingerprint: string, signature: string, version: string) => Record<string, string>;
  _getPayload: (method: string, path: string, timestamp: string | number, fingerprint: string, body?: Record<any, any>) => string;
  _xhunt: string;
  dataLayer: any[];
  gtag: (...args: any[]) => void;
}

// Add Chrome extension API types
interface Chrome {
  storage: any;
  runtime: {
    sendMessage: any;
    onMessage: any;
    id?: string;
    getURL: (path: string) => string;
    getManifest: () => any;
  };
  windows?: {
    create: (options: {
      url: string;
      type: string;
      width: number;
      height: number;
      focused: boolean;
    }) => void;
  };
}

declare var chrome: Chrome;
