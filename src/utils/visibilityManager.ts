// 页面可见性管理器 - 检测页面是否可见，控制统计和上报
import packageJson from '../../package.json';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

export type VisibilityChangeCallback = (isVisible: boolean) => void;

class VisibilityManager {
  private isVisible: boolean = true;
  private callbacks: Set<VisibilityChangeCallback> = new Set();
  private isInitialized: boolean = false;

  // 初始化可见性监听
  public init(): void {
    if (this.isInitialized) {
      devLog('warn', `[v${packageJson.version}] VisibilityManager already initialized`);
      return;
    }

    try {
      // 初始状态
      this.isVisible = !document.hidden;

      // 监听页面可见性变化
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

      // 监听窗口焦点变化（作为补充）
      window.addEventListener('focus', this.handleWindowFocus.bind(this));
      window.addEventListener('blur', this.handleWindowBlur.bind(this));

      this.isInitialized = true;
      devLog('log', `👁️ [v${packageJson.version}] VisibilityManager initialized, current state: ${this.isVisible ? 'visible' : 'hidden'}`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to initialize VisibilityManager:`, error);
    }
  }

  // 清理监听器
  public cleanup(): void {
    if (!this.isInitialized) return;

    try {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.removeEventListener('focus', this.handleWindowFocus.bind(this));
      window.removeEventListener('blur', this.handleWindowBlur.bind(this));

      this.callbacks.clear();
      this.isInitialized = false;
      devLog('log', `👁️ [v${packageJson.version}] VisibilityManager cleaned up`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to cleanup VisibilityManager:`, error);
    }
  }

  // 处理页面可见性变化
  private handleVisibilityChange(): void {
    const newVisibility = !document.hidden;

    if (newVisibility !== this.isVisible) {
      this.isVisible = newVisibility;
      this.notifyCallbacks();
    }
  }

  // 处理窗口获得焦点
  private handleWindowFocus(): void {
    if (!this.isVisible) {
      this.isVisible = true;
      devLog('log', `👁️ [v${packageJson.version}] Window focused, setting visible`);
      this.notifyCallbacks();
    }
  }

  // 处理窗口失去焦点
  private handleWindowBlur(): void {
    if (this.isVisible) {
      this.isVisible = false;
      devLog('log', `👁️ [v${packageJson.version}] Window blurred, setting hidden`);
      this.notifyCallbacks();
    }
  }

  // 通知所有回调函数
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.isVisible);
      } catch (error) {
        devLog('error', `[v${packageJson.version}] Error in visibility callback:`, error);
      }
    });
  }

  // 添加可见性变化回调
  public addCallback(callback: VisibilityChangeCallback): void {
    this.callbacks.add(callback);
  }

  // 移除可见性变化回调
  public removeCallback(callback: VisibilityChangeCallback): void {
    this.callbacks.delete(callback);
  }

  // 获取当前可见性状态
  public getVisibility(): boolean {
    return this.isVisible;
  }

  // 获取统计信息
  public getStats() {
    return {
      isVisible: this.isVisible,
      callbackCount: this.callbacks.size,
      isInitialized: this.isInitialized,
      version: packageJson.version
    };
  }
}

// 创建全局实例
export const visibilityManager = new VisibilityManager();

export default VisibilityManager;