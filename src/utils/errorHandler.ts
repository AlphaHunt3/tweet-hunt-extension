import { errorReporter } from './errorReporter';
import packageJson from '../../package.json';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// 全局错误处理器
export interface ErrorInfo {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  filename?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  errorType:
    | 'javascript'
    | 'promise'
    | 'react'
    | 'network'
    | 'custom'
    | 'async';
  componentStack?: string;
  errorBoundary?: string;
  // 添加 errorReporter 需要的属性
  priority?: 'low' | 'medium' | 'high' | 'critical';
  count?: number;
}

class GlobalErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private isInitialized = false;
  private maxQueueSize = 50;
  private originalConsoleError?: typeof console.error;
  private originalFetch?: typeof window.fetch;
  private errorReporter = errorReporter; // 直接引用
  private isExtensionContextValid = true; // 🆕 跟踪扩展上下文状态

  constructor() {
    // 不在构造函数中初始化，等待外部调用
  }

  // 🆕 检查扩展上下文是否有效
  private checkExtensionContext(): boolean {
    try {
      // 检查 chrome API 是否可用
      if (typeof chrome === 'undefined') {
        return false;
      }

      // 检查 runtime 是否有效
      if (!chrome.runtime || !chrome.runtime.id) {
        return false;
      }

      // 尝试访问 runtime.getManifest，如果失败说明上下文无效
      chrome.runtime.getManifest();
      return true;
    } catch (error) {
      devLog(
        'warn',
        `[v${packageJson.version}] Extension context is invalid:`,
        error
      );
      return false;
    }
  }

  // 🆕 安全的 Chrome API 调用包装器
  private async safeChromeCaller<T>(
    apiCall: () => Promise<T> | T,
    fallback: T,
    operationName: string = 'Chrome API'
  ): Promise<T> {
    try {
      // 首先检查扩展上下文
      if (!this.checkExtensionContext()) {
        devLog(
          'warn',
          `[v${packageJson.version}] ${operationName} skipped: Extension context invalid`
        );
        return fallback;
      }

      const result = await apiCall();
      return result;
    } catch (error) {
      // 检查是否是上下文失效错误
      if (
        error instanceof Error &&
        error.message.includes('Extension context invalidated')
      ) {
        this.isExtensionContextValid = false;
        devLog(
          'warn',
          `[v${packageJson.version}] ${operationName} failed: Extension context invalidated`
        );
      } else {
        devLog(
          'warn',
          `[v${packageJson.version}] ${operationName} failed:`,
          error
        );
      }
      return fallback;
    }
  }

  // 获取当前用户名的辅助方法 - 🆕 添加安全检查
  private async getCurrentUsername(): Promise<string | null> {
    // 如果扩展上下文无效，直接尝试 localStorage
    if (!this.isExtensionContextValid) {
      return this.getUsernameFromLocalStorage();
    }

    // 尝试从 chrome.storage 获取用户名
    const chromeStorageResult = await this.safeChromeCaller(
      async () => {
        if (chrome.storage && chrome.storage.local) {
          const result = await chrome.storage.local.get([
            '@xhunt/current-username',
          ]);
          return result['@xhunt/current-username'] || null;
        }
        return null;
      },
      null,
      'Chrome Storage Get Username'
    );

    if (chromeStorageResult) {
      return chromeStorageResult;
    }

    // 如果 chrome.storage 失败，尝试 localStorage
    return this.getUsernameFromLocalStorage();
  }

  // 🆕 从 localStorage 获取用户名的安全方法
  private getUsernameFromLocalStorage(): string | null {
    try {
      const username = localStorage.getItem('@xhunt/current-username');
      return username ? JSON.parse(username) : null;
    } catch (error) {
      devLog(
        'warn',
        `[v${packageJson.version}] Failed to get username from localStorage:`,
        error
      );
      return null;
    }
  }

  // 格式化错误消息，添加版本号和用户名
  private async formatErrorMessage(originalMessage: string): Promise<string> {
    try {
      const username = await this.getCurrentUsername();
      const versionPrefix = `[v${packageJson.version}]`;
      const userPrefix = username ? `[@${username}]` : '';

      // 如果消息已经包含版本号，先移除它
      let cleanMessage = originalMessage;
      const versionRegex = /^\[v[\d.]+\]\s*/;
      if (versionRegex.test(cleanMessage)) {
        cleanMessage = cleanMessage.replace(versionRegex, '');
      }

      // 组合新的消息格式：[v版本号][@用户名] 原始消息
      return `${versionPrefix}${userPrefix} ${cleanMessage}`.trim();
    } catch (error) {
      // 如果格式化失败，至少保证版本号
      return `[v${packageJson.version}] ${originalMessage}`;
    }
  }

  // 公开初始化方法，供外部在合适时机调用
  public init() {
    if (this.isInitialized) return;
    try {
      // 🆕 初始化时检查扩展上下文
      this.isExtensionContextValid = this.checkExtensionContext();

      // 1. 捕获同步 JavaScript 错误
      window.addEventListener('error', this.handleJavaScriptError.bind(this));

      // 2. 捕获未处理的 Promise 拒绝（异步错误）
      window.addEventListener(
        'unhandledrejection',
        this.handlePromiseRejection.bind(this)
      );

      // 3. 重写 console.error 来捕获更多异步错误
      this.interceptConsoleError();

      // 4. 初始化错误上报器 - 直接使用，不需要动态导入
      this.initializeErrorReporter();

      // 🆕 5. 监听扩展上下文变化
      this.setupExtensionContextMonitoring();

      this.isInitialized = true;
      console.log(
        `🛡️ [v${packageJson.version}] XHunt Global Error Handler initialized`
      );
      devLog(
        'log',
        `🛡️ [v${packageJson.version}] XHunt Global Error Handler initialized (context valid: ${this.isExtensionContextValid})`
      );
    } catch (error) {
      devLog(
        'error',
        `[v${packageJson.version}] Failed to initialize global error handler:`,
        error
      );
    }
  }

  // 🆕 设置扩展上下文监控
  private setupExtensionContextMonitoring(): void {
    // 定期检查扩展上下文状态
    const checkInterval = setInterval(() => {
      const wasValid = this.isExtensionContextValid;
      this.isExtensionContextValid = this.checkExtensionContext();

      if (wasValid && !this.isExtensionContextValid) {
        devLog(
          'warn',
          `[v${packageJson.version}] Extension context became invalid`
        );
        // 可以在这里触发一些清理操作
      } else if (!wasValid && this.isExtensionContextValid) {
        devLog('log', `[v${packageJson.version}] Extension context restored`);
      }
    }, 10000); // 每10秒检查一次

    // 页面卸载时清理定时器
    window.addEventListener('beforeunload', () => {
      clearInterval(checkInterval);
    });
  }

  // 初始化错误上报器 - 改为同步方法
  private initializeErrorReporter() {
    try {
      // 直接使用已导入的 errorReporter
      if (this.errorReporter) {
        // 将已收集的错误添加到上报器
        this.errorQueue.forEach((error) => {
          // 确保错误对象包含必要的属性
          const errorWithDefaults = {
            ...error,
            priority: error.priority || ('medium' as const),
            count: error.count || 1,
          };
          this.errorReporter.addError(errorWithDefaults);
        });

        devLog(
          'log',
          `📊 [v${packageJson.version}] Error reporter initialized`
        );
      } else {
        devLog(
          'warn',
          `[v${packageJson.version}] Error reporter not available`
        );
      }
    } catch (error) {
      devLog(
        'error',
        `[v${packageJson.version}] Failed to initialize error reporter:`,
        error
      );
      // 如果错误上报器初始化失败，继续运行但不上报
      this.errorReporter = null as any;
    }
  }

  // 清理方法
  public cleanup() {
    if (!this.isInitialized) return;

    try {
      window.removeEventListener(
        'error',
        this.handleJavaScriptError.bind(this)
      );
      window.removeEventListener(
        'unhandledrejection',
        this.handlePromiseRejection.bind(this)
      );

      // 恢复原始方法
      if (this.originalConsoleError) {
        console.error = this.originalConsoleError;
      }
      if (this.originalFetch) {
        window.fetch = this.originalFetch;
      }

      // 清理错误上报器
      if (this.errorReporter) {
        this.errorReporter.stopReporting();
      }

      this.isInitialized = false;
      devLog(
        'log',
        `🛡️ [v${packageJson.version}] XHunt Global Error Handler cleaned up`
      );
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Error during cleanup:`, error);
    }
  }

  private handleJavaScriptError = async (event: ErrorEvent) => {
    try {
      // 🔧 过滤已知的无害错误
      const message = event.message || 'Unknown JavaScript error';

      // 过滤 ResizeObserver 错误（这是浏览器的已知问题，不是我们的代码错误）
      if (
        message.includes(
          'ResizeObserver loop completed with undelivered notifications'
        )
      ) {
        devLog(
          'log',
          `🚫 [v${packageJson.version}] Filtered ResizeObserver error (browser issue)`
        );
        return;
      }

      // 🆕 过滤扩展上下文失效错误，避免无限循环
      if (message.includes('Extension context invalidated')) {
        this.isExtensionContextValid = false;
        devLog(
          'warn',
          `[v${packageJson.version}] Extension context invalidated detected, skipping error report`
        );
        return;
      }

      // 🔧 过滤 textContent 为 null 的错误（如果是我们已知的安全处理）
      if (
        message.includes(
          "Cannot read properties of null (reading 'textContent')"
        )
      ) {
        // 检查是否是我们的代码文件
        const filename = event.filename || '';
        if (
          filename.includes('Main.') ||
          filename.includes('chrome-extension://')
        ) {
          devLog(
            'log',
            `🚫 [v${packageJson.version}] Filtered textContent null error (handled safely)`
          );
          return;
        }
      }

      const formattedMessage = await this.formatErrorMessage(message);

      const errorInfo: ErrorInfo = {
        message: formattedMessage,
        stack: event.error?.stack,
        source: 'window.onerror',
        lineno: event.lineno,
        colno: event.colno,
        filename: event.filename,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorType: 'javascript',
      };

      this.captureError(errorInfo);
    } catch (captureError) {
      // 安全地处理捕获错误，避免访问 undefined.message
      const errorMessage =
        captureError instanceof Error
          ? captureError.message
          : captureError != null
          ? String(captureError)
          : 'Unknown error in handleJavaScriptError';
      devLog(
        'error',
        `[v${packageJson.version}] Error in handleJavaScriptError:`,
        errorMessage
      );
    }
  };

  private handlePromiseRejection = async (event: PromiseRejectionEvent) => {
    try {
      let message = 'Unhandled Promise Rejection';
      let stack: string | undefined;

      // 检查 event.reason 是否存在
      if (event.reason == null) {
        message = 'Unhandled Promise Rejection (reason: null or undefined)';
      } else if (event.reason instanceof Error) {
        message = event.reason.message || 'Unknown error';
        stack = event.reason.stack;

        // 🆕 过滤扩展上下文失效错误
        if (message.includes('Extension context invalidated')) {
          this.isExtensionContextValid = false;
          devLog(
            'warn',
            `[v${packageJson.version}] Extension context invalidated in promise rejection, skipping error report`
          );
          return;
        }
      } else if (typeof event.reason === 'string') {
        message = event.reason;

        // 🆕 过滤扩展上下文失效错误
        if (message.includes('Extension context invalidated')) {
          this.isExtensionContextValid = false;
          devLog(
            'warn',
            `[v${packageJson.version}] Extension context invalidated in promise rejection, skipping error report`
          );
          return;
        }
      } else {
        // 安全地处理其他类型的 reason
        try {
          message = JSON.stringify(event.reason);
        } catch {
          message = String(event.reason) || 'Unknown promise rejection';
        }
      }

      const formattedMessage = await this.formatErrorMessage(message);

      const errorInfo: ErrorInfo = {
        message: formattedMessage,
        stack,
        source: 'unhandledrejection',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorType: 'promise',
      };

      this.captureError(errorInfo);
    } catch (captureError) {
      // 安全地处理捕获错误，避免访问 undefined.message
      const errorMessage =
        captureError instanceof Error
          ? captureError.message
          : captureError != null
          ? String(captureError)
          : 'Unknown error in handlePromiseRejection';
      devLog(
        'error',
        `[v${packageJson.version}] Error in handlePromiseRejection:`,
        errorMessage
      );
    }
  };

  // 拦截 console.error 来捕获更多异步错误
  private interceptConsoleError() {
    try {
      this.originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        // 调用原始的 console.error
        this.originalConsoleError!.apply(console, args);

        // 捕获错误信息
        try {
          const message = args
            .map((arg) =>
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            )
            .join(' ');

          // 🔧 过滤已知的无害错误
          if (
            message.includes(
              'ResizeObserver loop completed with undelivered notifications'
            )
          ) {
            return;
          }

          // 🆕 过滤扩展上下文失效错误
          if (message.includes('Extension context invalidated')) {
            this.isExtensionContextValid = false;
            return;
          }

          if (message.includes('Error') || message.includes('error')) {
            // 异步格式化消息
            this.formatErrorMessage(`Console Error: ${message}`)
              .then((formattedMessage) => {
                const errorInfo: ErrorInfo = {
                  message: formattedMessage,
                  source: 'console.error',
                  timestamp: Date.now(),
                  userAgent: navigator.userAgent,
                  url: window.location.href,
                  errorType: 'async',
                };

                this.captureError(errorInfo);
              })
              .catch(() => {
                // 静默失败
              });
          }
        } catch (error) {
          // 静默失败，避免无限循环
        }
      };
    } catch (error) {
      devLog(
        'error',
        `[v${packageJson.version}] Failed to intercept console.error:`,
        error
      );
    }
  }

  // React Error Boundary 错误捕获
  public async captureReactError(
    error: Error,
    errorInfo: React.ErrorInfo,
    errorBoundary?: string
  ) {
    try {
      // 安全地获取错误消息，避免访问 undefined.message
      const errorMessage = error?.message || 'Unknown React error';

      // 🆕 过滤扩展上下文失效错误
      if (errorMessage.includes('Extension context invalidated')) {
        this.isExtensionContextValid = false;
        devLog(
          'warn',
          `[v${packageJson.version}] Extension context invalidated in React error, skipping error report`
        );
        return;
      }

      const formattedMessage = await this.formatErrorMessage(errorMessage);

      const errorData: ErrorInfo = {
        message: formattedMessage,
        stack: error.stack,
        source: 'react-error-boundary',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorType: 'react',
        componentStack: errorInfo.componentStack || '',
        errorBoundary,
      };

      this.captureError(errorData);
    } catch (captureError) {
      // 安全地处理捕获错误，避免访问 undefined.message
      const errorMessage =
        captureError instanceof Error
          ? captureError.message
          : captureError != null
          ? String(captureError)
          : 'Unknown error in captureReactError';
      devLog(
        'error',
        `[v${packageJson.version}] Error in captureReactError:`,
        errorMessage
      );
    }
  }

  // 手动错误捕获
  public async captureCustomError(
    error: Error | string,
    context?: Record<string, any>
  ) {
    try {
      let message: string;
      let stack: string | undefined;

      if (error instanceof Error) {
        message = error.message;
        stack = error.stack;

        // 🆕 过滤扩展上下文失效错误
        if (message.includes('Extension context invalidated')) {
          this.isExtensionContextValid = false;
          devLog(
            'warn',
            `[v${packageJson.version}] Extension context invalidated in custom error, skipping error report`
          );
          return;
        }
      } else {
        message = String(error);

        // 🆕 过滤扩展上下文失效错误
        if (message.includes('Extension context invalidated')) {
          this.isExtensionContextValid = false;
          devLog(
            'warn',
            `[v${packageJson.version}] Extension context invalidated in custom error, skipping error report`
          );
          return;
        }
      }

      const formattedMessage = await this.formatErrorMessage(message);

      const errorInfo: ErrorInfo = {
        message: formattedMessage,
        stack,
        source: 'custom-capture',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorType: 'custom',
        ...context,
      };

      this.captureError(errorInfo);
    } catch (captureError) {
      // 安全地处理捕获错误，避免访问 undefined.message
      const errorMessage =
        captureError instanceof Error
          ? captureError.message
          : captureError != null
          ? String(captureError)
          : 'Unknown error in captureCustomError';
      devLog(
        'error',
        `[v${packageJson.version}] Error in captureCustomError:`,
        errorMessage
      );
    }
  }

  private captureError(errorInfo: ErrorInfo) {
    try {
      // 添加用户ID（如果可用）
      this.addUserContext(errorInfo);

      // 过滤重复错误
      if (this.isDuplicateError(errorInfo)) {
        return;
      }

      // 添加到队列
      this.errorQueue.push(errorInfo);

      // 限制队列大小
      if (this.errorQueue.length > this.maxQueueSize) {
        this.errorQueue.shift();
      }

      // 添加到错误上报器（如果可用）
      if (this.errorReporter) {
        // 确保错误对象包含必要的属性
        const errorWithDefaults = {
          ...errorInfo,
          priority: errorInfo.priority || ('medium' as const),
          count: errorInfo.count || 1,
        };
        this.errorReporter.addError(errorWithDefaults);
      }

      // 控制台输出（开发环境）
      if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
        console.group(`🚨 [v${packageJson.version}] XHunt Error Captured`);
        console.log('Message:', errorInfo.message);
        console.log('Stack:', errorInfo.stack);
        console.log('Type:', errorInfo.errorType);
        console.log('Full Info:', errorInfo);
        console.groupEnd();
      }

      // 触发自定义事件，供其他模块监听
      window.dispatchEvent(
        new CustomEvent('xhunt:error-captured', {
          detail: errorInfo,
        })
      );
    } catch (processingError) {
      // 安全地处理捕获错误，避免访问 undefined.message
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : processingError != null
          ? String(processingError)
          : 'Unknown error in captureError';
      devLog(
        'error',
        `[v${packageJson.version}] Error in captureError:`,
        errorMessage
      );
    }
  }

  private async addUserContext(errorInfo: ErrorInfo) {
    try {
      // 🆕 使用安全的用户名获取方法
      const username = await this.getCurrentUsername();
      if (username) {
        errorInfo.userId = username;
      }
    } catch (error) {
      // 静默失败，不影响错误捕获
    }
  }

  private isDuplicateError(newError: ErrorInfo): boolean {
    try {
      const recentErrors = this.errorQueue.slice(-5); // 检查最近5个错误
      return recentErrors.some(
        (error) =>
          error.message === newError.message &&
          error.errorType === newError.errorType &&
          Date.now() - error.timestamp < 5000 // 5秒内的重复错误
      );
    } catch (error) {
      return false;
    }
  }

  // 获取错误队列（供上报使用）
  public getErrorQueue(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  // 清空错误队列
  public clearErrorQueue(): void {
    this.errorQueue = [];
  }

  // 获取错误统计
  public getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      byType: {} as Record<string, number>,
      recent: this.errorQueue.filter(
        (error) => Date.now() - error.timestamp < 60000
      ).length, // 最近1分钟
      extensionContextValid: this.isExtensionContextValid, // 🆕 添加扩展上下文状态
    };

    this.errorQueue.forEach((error) => {
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1;
    });

    return stats;
  }

  // 获取错误上报器统计
  public getReporterStats() {
    return this.errorReporter ? this.errorReporter.getStats() : null;
  }

  // 🆕 添加 flushAll 方法
  public async flushAll(): Promise<void> {
    try {
      if (this.errorReporter) {
        await this.errorReporter.flushAll();
      }
      devLog(
        'log',
        `🛡️ [v${packageJson.version}] Error handler flushed all data`
      );
    } catch (error) {
      devLog(
        'error',
        `[v${packageJson.version}] Failed to flush error handler:`,
        error
      );
    }
  }

  // 🆕 获取扩展上下文状态
  public getExtensionContextStatus(): boolean {
    return this.isExtensionContextValid;
  }
}

// 创建全局实例
export const globalErrorHandler = new GlobalErrorHandler();

// 导出便捷方法
export const captureError = (
  error: Error | string,
  context?: Record<string, any>
) => {
  globalErrorHandler.captureCustomError(error, context);
};

export const captureReactError = (
  error: Error,
  errorInfo: React.ErrorInfo,
  errorBoundary?: string
) => {
  globalErrorHandler.captureReactError(error, errorInfo, errorBoundary);
};
