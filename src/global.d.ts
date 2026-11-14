// 新增全局类型声明文件

/// <reference types="react" />

declare module 'data-text:~/css/*' {
  const content: string;
  export default content;
}

declare module 'data-text:*' {
  const content: string;
  export default content;
}

declare module 'url:~/assets/*' {
  const content: string;
  export default content;
}

declare module 'url:*' {
  const content: string;
  export default content;
}

declare interface Window {
  _xhunt_language: string;
}

// Add Chrome extension API types
interface Chrome {
  storage: any;
  runtime: {
    connect(arg0: { name: string }): any;
    sendMessage: any;
    onMessage: {
      addListener: (
        listener: (
          message: any,
          sender: any,
          sendResponse: (response: any) => void
        ) => boolean | void
      ) => void;
    };
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
  tabs: {
    query(queryInfo: {
      active: boolean;
      currentWindow: boolean;
    }): Promise<Array<{ id?: number }>>;
  };
}

declare var chrome: Chrome;
