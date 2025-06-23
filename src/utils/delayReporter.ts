// 高延迟请求监控器 - 专门监控和上报延迟超过阈值的请求
import packageJson from '../../package.json';
import { configManager } from './configManager';
import { visibilityManager } from './visibilityManager';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// 网络信息接口
export interface NetworkInfo {
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  downlink?: number;      // 下行速度 Mbps
  rtt?: number;           // 往返时间 ms
  saveData?: boolean;     // 是否开启数据节省模式
  timestamp: number;      // 检测时间戳
}

// 设备信息接口
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  hardwareConcurrency?: number; // CPU 核心数
  deviceMemory?: number;        // 设备内存 GB
  connection?: NetworkInfo;     // 网络连接信息
}

// 高延迟请求记录
export interface HighDelayRecord {
  id: string;
  url: string;
  method: string;
  duration: number;           // 请求耗时（毫秒）
  timestamp: number;          // 请求时间戳
  success: boolean;           // 请求是否成功
  statusCode?: number;        // HTTP 状态码
  errorMessage?: string;      // 错误信息

  // 网络状况
  networkBefore: NetworkInfo; // 请求前网络状况
  networkAfter: NetworkInfo;  // 请求后网络状况

  // 设备信息
  deviceInfo: DeviceInfo;     // 设备信息

  // 🆕 用户信息
  userId?: string;            // 用户ID
  currentUrl: string;         // 🆕 当前浏览的网址
  sessionId: string;          // 会话ID
  version: string;            // 扩展版本
}

// 高延迟上报配置
export interface HighDelayReporterConfig {
  delayThreshold: number;     // 延迟阈值（毫秒），超过此值才上报
  maxRecordsQueue: number;    // 最大队列长度
  reportInterval: number;     // 上报间隔（毫秒）
  apiEndpoint: string;        // 上报接口
  enableLocalStorage: boolean; // 是否启用本地存储
  maxRetries: number;         // 最大重试次数
}

// 延迟记录器实例接口
export interface DelayRecorderInstance {
  recordDelay: (record: DelayRecord) => void;
  getStats: () => any;
  flushAll: () => Promise<void>;
}

// 原始延迟记录（从 API 调用传入）
export interface DelayRecord {
  url: string;
  method: string;
  duration: number;
  timestamp: number;
  success: boolean;
  statusCode?: number;
}

class HighDelayReporter {
  private config: HighDelayReporterConfig;
  private highDelayQueue: HighDelayRecord[] = [];
  private reportTimer: number | null = null;
  private sessionId: string;
  private isPageVisible: boolean = true;
  private secureFetchRef: any = null;
  private isInitialized: boolean = false;
  private readonly STORAGE_KEY = 'xhunt-high-delay-records';

  constructor(config: Partial<HighDelayReporterConfig> = {}) {
    this.config = {
      delayThreshold: 6000,        // 6秒阈值
      maxRecordsQueue: 50,         // 最多存储50条高延迟记录
      reportInterval: 30000,       // 30秒上报一次
      apiEndpoint: '/api/xhunt/report/high-delay',
      enableLocalStorage: true,
      maxRetries: 3,
      ...config
    };

    this.sessionId = this.generateSessionId();
  }

  // 初始化方法
  public init(secureFetchFunction?: any): DelayRecorderInstance {
    if (this.isInitialized) {
      devLog('warn', `[v${packageJson.version}] HighDelayReporter already initialized`);
      return this.createInstance();
    }

    try {
      this.secureFetchRef = secureFetchFunction;
      this.initializeVisibilityListener();
      this.loadStoredRecords();
      this.startReportTimer();
      this.isInitialized = true;

      devLog('log', `🐌 [v${packageJson.version}] HighDelayReporter initialized (threshold: ${this.config.delayThreshold}ms)`);
      return this.createInstance();
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to initialize HighDelayReporter:`, error);
      return this.createEmptyInstance();
    }
  }

  // 创建实例方法对象
  private createInstance(): DelayRecorderInstance {
    return {
      recordDelay: this.recordDelay.bind(this),
      getStats: this.getStats.bind(this),
      flushAll: this.flushAll.bind(this)
    };
  }

  // 创建空实例
  private createEmptyInstance(): DelayRecorderInstance {
    return {
      recordDelay: () => {},
      getStats: () => ({ error: 'HighDelayReporter not initialized' }),
      flushAll: async () => {}
    };
  }

  // 初始化页面可见性监听
  private initializeVisibilityListener(): void {
    visibilityManager.addCallback((isVisible: boolean) => {
      this.isPageVisible = isVisible;

      if (!isVisible) {
        this.pauseReporting();
      } else {
        this.resumeReporting();
      }
    });
  }

  // 暂停上报
  private pauseReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  // 恢复上报
  private resumeReporting(): void {
    if (!this.reportTimer && this.isPageVisible) {
      this.startReportTimer();
    }
  }

  // 🆕 获取当前用户名的安全方法
  private async getCurrentUsername(): Promise<string | null> {
    try {
      // 优先从 localStorage 获取
      const username = localStorage.getItem('@xhunt/current-username');
      if (username) {
        return JSON.parse(username);
      }

      // 如果 localStorage 没有，尝试从 chrome.storage 获取
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const result = await chrome.storage.local.get(['@xhunt/current-username']);
          return result['@xhunt/current-username'] || null;
        } catch (error) {
          devLog('warn', `[v${packageJson.version}] Failed to get username from chrome.storage:`, error);
        }
      }

      return null;
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to get current username:`, error);
      return null;
    }
  }

  // 记录延迟（只记录高延迟请求）
  private recordDelay(record: DelayRecord): void {
    if (!this.isInitialized) {
      devLog('warn', `[v${packageJson.version}] HighDelayReporter not initialized, skipping record`);
      return;
    }

    // 只记录超过阈值的请求
    if (record.duration < this.config.delayThreshold) {
      return;
    }

    // 页面不可见时不记录
    if (!this.isPageVisible) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping high delay record (page not visible)`);
      return;
    }

    try {
      devLog('warn', `🐌 [v${packageJson.version}] High delay detected: ${record.url} took ${record.duration}ms`);

      // 获取网络信息（请求后）
      const networkAfter = this.getNetworkInfo();

      // 🆕 异步获取用户名并创建记录
      this.createHighDelayRecord(record, networkAfter);

    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to record high delay:`, error);
    }
  }

  // 🆕 创建高延迟记录（异步方法）
  private async createHighDelayRecord(record: DelayRecord, networkAfter: NetworkInfo): Promise<void> {
    try {
      // 获取当前用户名
      const currentUsername = await this.getCurrentUsername();

      // 创建高延迟记录
      const highDelayRecord: HighDelayRecord = {
        id: this.generateRecordId(),
        url: this.sanitizeUrl(record.url),
        method: record.method,
        duration: record.duration,
        timestamp: record.timestamp,
        success: record.success,
        statusCode: record.statusCode,

        // 网络信息（这里我们用当前时间作为请求前后的网络信息）
        // 实际使用中，请求前的网络信息应该在请求开始时获取
        networkBefore: this.getNetworkInfo(), // 简化处理，实际应该在请求前获取
        networkAfter: networkAfter,

        // 设备信息
        deviceInfo: this.getDeviceInfo(),

        // 🆕 用户和会话信息
        userId: String(currentUsername),
        currentUrl: window.location.href, // 🆕 当前浏览的网址
        sessionId: this.sessionId,
        version: packageJson.version
      };

      // 添加到队列
      this.highDelayQueue.push(highDelayRecord);

      // 限制队列大小
      if (this.highDelayQueue.length > this.config.maxRecordsQueue) {
        this.highDelayQueue.shift(); // 移除最旧的记录
      }

      // 保存到本地存储
      this.saveRecordsToStorage();

      // 立即上报（高延迟是重要事件）
      this.reportImmediately(highDelayRecord);

    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to create high delay record:`, error);
    }
  }

  // 获取网络信息
  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      timestamp: Date.now()
    };
  }

  // 获取设备信息
  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: (navigator as any).hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      connection: this.getNetworkInfo()
    };
  }

  // 立即上报高延迟记录
  private async reportImmediately(record: HighDelayRecord): Promise<void> {
    if (!this.isPageVisible) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping immediate high delay report (page not visible)`);
      return;
    }

    if (!(await configManager.canReportDelay())) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping immediate high delay report (daily limit reached)`);
      return;
    }

    try {
      await this.sendReport([record]);

      // 从队列中移除已上报的记录
      this.highDelayQueue = this.highDelayQueue.filter(r => r.id !== record.id);
      this.saveRecordsToStorage();

      configManager.incrementDelayCount();
      devLog('log', `🐌 [v${packageJson.version}] High delay record reported immediately: ${record.url} (user: ${record.userId || 'unknown'}, url: ${record.currentUrl})`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to report high delay immediately:`, error);
    }
  }

  // 批量上报
  private async batchReport(): Promise<void> {
    if (this.highDelayQueue.length === 0) {
      return;
    }

    if (!this.isPageVisible) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping batch high delay report (page not visible)`);
      return;
    }

    if (!(await configManager.canReportDelay())) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping batch high delay report (daily limit reached)`);
      return;
    }

    try {
      const recordsToReport = [...this.highDelayQueue];
      await this.sendReport(recordsToReport);

      // 清空队列
      this.highDelayQueue = [];
      this.saveRecordsToStorage();

      configManager.incrementDelayCount();
      devLog('log', `🐌 [v${packageJson.version}] Batch reported ${recordsToReport.length} high delay records`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to batch report high delays:`, error);
    }
  }

  // 🔧 修复发送报告方法 - 增强错误处理
  private async sendReport(records: HighDelayRecord[]): Promise<void> {
    if (!this.secureFetchRef) {
      devLog('warn', `[v${packageJson.version}] secureFetch not available for high delay reporting`);
      return;
    }

    try {
      const report = {
        id: this.generateReportId(),
        records,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: packageJson.version,
        reportType: 'high-delay'
      };

      // 🔧 增强错误处理 - 检查接口是否存在
      try {
        await this.secureFetchRef(this.config.apiEndpoint, {
          method: 'POST',
          body: JSON.stringify(report),
          tokenRequired: false
        });
      } catch (fetchError: any) {
        // 🔧 检查是否是接口不存在的错误
        if (fetchError.message && (
          fetchError.message.includes('JSON解析失败') ||
          fetchError.message.includes('<!DOCTYPE') ||
          fetchError.message.includes('404') ||
          fetchError.message.includes('Not Found')
        )) {
          devLog('warn', `🐌 [v${packageJson.version}] High delay report endpoint not available, skipping report`);
          // 接口不存在时，不抛出错误，静默跳过
          return;
        }
        
        // 其他错误继续抛出
        throw fetchError;
      }

    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to send high delay report:`, error);
      throw error;
    }
  }

  // 启动定时上报
  private startReportTimer(): void {
    this.reportTimer = window.setInterval(() => {
      this.batchReport();
    }, this.config.reportInterval);
  }

  // 停止定时上报
  public stopReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  // 保存记录到本地存储
  private saveRecordsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const data = {
        records: this.highDelayQueue,
        timestamp: Date.now(),
        version: packageJson.version
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      devLog('log', `🐌 [v${packageJson.version}] Saved ${this.highDelayQueue.length} high delay records to localStorage`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to save high delay records:`, error);
    }
  }

  // 从本地存储加载记录
  private loadStoredRecords(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);

      // 检查版本
      if (data.version !== packageJson.version) {
        devLog('log', `🐌 [v${packageJson.version}] Version mismatch, clearing stored high delay records`);
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // 检查时间（只保留最近1小时的记录）
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (data.timestamp < oneHourAgo) {
        devLog('log', `🐌 [v${packageJson.version}] Stored high delay records expired, clearing`);
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      this.highDelayQueue = (data.records || []).slice(0, this.config.maxRecordsQueue);
      devLog('log', `🐌 [v${packageJson.version}] Loaded ${this.highDelayQueue.length} high delay records from localStorage`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to load stored high delay records:`, error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // 立即上报所有记录
  public async flushAll(): Promise<void> {
    this.stopReporting();

    if (this.highDelayQueue.length > 0) {
      await this.batchReport();
    }
  }

  // 清理方法
  public cleanup(): void {
    if (!this.isInitialized) return;

    try {
      this.stopReporting();
      this.isInitialized = false;
      devLog('log', `🐌 [v${packageJson.version}] HighDelayReporter cleaned up`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to cleanup HighDelayReporter:`, error);
    }
  }

  // 获取统计信息
  public getStats() {
    return {
      queueSize: this.highDelayQueue.length,
      delayThreshold: this.config.delayThreshold,
      sessionId: this.sessionId,
      isPageVisible: this.isPageVisible,
      version: packageJson.version,
      isInitialized: this.isInitialized,
      recentHighDelays: this.highDelayQueue.slice(-5).map(record => ({
        url: record.url,
        duration: record.duration,
        timestamp: record.timestamp,
        networkType: record.networkAfter.effectiveType,
        userId: record.userId, // 🆕 包含用户信息
        currentUrl: record.currentUrl // 🆕 包含当前网址
      }))
    };
  }

  // 工具方法
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecordId(): string {
    return `high_delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `high_delay_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建全局实例
export const delayReporter = new HighDelayReporter({
  delayThreshold: 6000,        // 6秒阈值
  maxRecordsQueue: 50,         // 最多50条记录
  reportInterval: 30000,       // 30秒批量上报
  apiEndpoint: '/api/xhunt/report/high-delay',
  enableLocalStorage: true,
  maxRetries: 3
});

// 页面卸载时上报所有数据
window.addEventListener('beforeunload', () => {
  delayReporter.flushAll();
});

export default HighDelayReporter;