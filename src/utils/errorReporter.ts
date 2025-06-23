// 错误上报器 - 实现批量上报、去重、优先级等策略
import { secureFetch } from '~contents/utils/api';
import packageJson from '../../package.json';
import { configManager } from './configManager';
import { visibilityManager } from './visibilityManager';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

export interface ErrorReportConfig {
  maxBatchSize: number;        // 批量上报的最大数量
  reportInterval: number;      // 上报间隔（毫秒）
  maxRetries: number;         // 最大重试次数
  enableLocalStorage: boolean; // 是否启用本地存储
  apiEndpoint: string;        // 上报接口
  maxStorageSize: number;     // 🆕 localStorage 最大存储条目数
  maxStorageAge: number;      // 🆕 localStorage 数据最大保存时间（毫秒）
}

export interface ErrorReport {
  id: string;
  errors: ErrorInfo[];
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  retryCount?: number;
  version: string;
}

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
  errorType: 'javascript' | 'promise' | 'react' | 'network' | 'custom' | 'async';
  componentStack?: string;
  errorBoundary?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  count: number; // 相同错误的出现次数
}

class ErrorReporter {
  private config: ErrorReportConfig;
  private errorQueue: ErrorInfo[] = [];
  private reportTimer: number | null = null;
  private sessionId: string;
  private isOnline: boolean = navigator.onLine;
  private retryQueue: ErrorReport[] = [];
  private isPageVisible: boolean = true;
  private readonly STORAGE_KEY = 'xhunt-error-queue';

  constructor(config: Partial<ErrorReportConfig> = {}) {
    this.config = {
      maxBatchSize: 10,
      reportInterval: 30000, // 30秒
      maxRetries: 3,
      enableLocalStorage: true,
      apiEndpoint: '/api/xhunt/report/errors',
      maxStorageSize: 100,    // 🆕 最多存储100条错误记录
      maxStorageAge: 24 * 60 * 60 * 1000, // 🆕 24小时过期
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.initializeNetworkListener();
    this.initializeVisibilityListener();
    this.loadStoredErrors();
    this.startReportTimer();
    devLog('log', `📊 [v${packageJson.version}] ErrorReporter initialized`)
  }

  // 初始化页面可见性监听
  private initializeVisibilityListener(): void {
    visibilityManager.addCallback((isVisible: boolean) => {
      this.isPageVisible = isVisible;

      if (!isVisible) {
        // 页面不可见时，暂停定时上报
        this.pauseReporting();
      } else {
        // 页面可见时，恢复定时上报
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

  // 添加错误到队列
  public addError(error: ErrorInfo): void {
    try {
      // 暂时过滤掉网络错误，不进行上报
      if (error.errorType === 'network') {
        devLog('log', `🚫 [v${packageJson.version}] Network error filtered out from reporting:`, error.message);
        return;
      }

      // 设置错误优先级
      const errorWithPriority = {
        ...error,
        priority: this.calculatePriority(error),
        count: 1
      };

      // 检查是否为重复错误
      const existingError = this.findDuplicateError(errorWithPriority);
      if (existingError) {
        existingError.count++;
        existingError.timestamp = Date.now(); // 更新最后发生时间
        return;
      }

      // 添加到队列
      this.errorQueue.push(errorWithPriority);

      // 🆕 限制内存队列大小（更严格的限制）
      if (this.errorQueue.length > this.config.maxBatchSize * 2) {
        // 保留高优先级错误，移除低优先级错误
        this.errorQueue = this.errorQueue
          .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
          .slice(0, this.config.maxBatchSize * 2);
      }

      // 如果是关键错误，立即上报
      if (errorWithPriority.priority === 'critical') {
        this.reportImmediately([errorWithPriority]);
      }

      // 保存到本地存储
      this.saveErrorsToStorage();

    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to add error to reporter:`, err);
    }
  }

  // 计算错误优先级
  private calculatePriority(error: ErrorInfo): 'low' | 'medium' | 'high' | 'critical' {
    // 关键错误 - 移除网络相关的关键错误判断
    if (
      error.errorType === 'react' ||
      error.message.toLowerCase().includes('chunk')
    ) {
      return 'critical';
    }

    // 高优先级错误
    if (
      error.errorType === 'javascript' ||
      error.errorType === 'promise' ||
      error.message.toLowerCase().includes('typeerror') ||
      error.message.toLowerCase().includes('referenceerror')
    ) {
      return 'high';
    }

    // 中等优先级错误
    if (
      error.errorType === 'custom' ||
      error.errorType === 'async'
    ) {
      return 'medium';
    }

    // 低优先级错误
    return 'low';
  }

  // 获取优先级权重
  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // 查找重复错误
  private findDuplicateError(newError: ErrorInfo): ErrorInfo | undefined {
    return this.errorQueue.find(error =>
      error.message === newError.message &&
      error.errorType === newError.errorType &&
      error.filename === newError.filename &&
      error.lineno === newError.lineno
    );
  }

  // 立即上报（用于关键错误）
  private async reportImmediately(errors: ErrorInfo[]): Promise<void> {
    // 检查页面可见性和每日限制
    if (!this.isPageVisible) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping immediate error report (page not visible)`);
      return;
    }

    if (!(await configManager.canReportError())) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping immediate error report (daily limit reached)`);
      return;
    }

    try {
      const report: ErrorReport = {
        id: this.generateReportId(),
        errors,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
        version: packageJson.version
      };

      await this.sendReport(report);
      configManager.incrementErrorCount();
    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to report immediately:`, err);
      // 添加到重试队列
      this.addToRetryQueue({
        id: this.generateReportId(),
        errors,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
        version: packageJson.version
      });
    }
  }

  // 批量上报
  private async batchReport(): Promise<void> {
    if (this.errorQueue.length === 0) {
      devLog('log', `📊 [v${packageJson.version}] No errors to report`);
      return;
    }

    // 检查页面可见性和每日限制
    if (!this.isPageVisible) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping batch error report (page not visible)`);
      return;
    }

    if (!(await configManager.canReportError())) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping batch error report (daily limit reached)`);
      return;
    }

    try {
      // 按优先级排序，优先上报高优先级错误
      const sortedErrors = [...this.errorQueue].sort(
        (a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority)
      );

      const errorsToReport = sortedErrors.slice(0, this.config.maxBatchSize);

      const report: ErrorReport = {
        id: this.generateReportId(),
        errors: errorsToReport,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.sessionId,
        version: packageJson.version
      };
      devLog('log', `📊 [v${packageJson.version}] Reporting errors:`, report)
      await this.sendReport(report);

      // 移除已上报的错误
      this.errorQueue = this.errorQueue.filter(
        error => !errorsToReport.includes(error)
      );

      this.saveErrorsToStorage();
      configManager.incrementErrorCount();

      devLog('log', `📊 [v${packageJson.version}] Reported ${errorsToReport.length} errors successfully`);

    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to batch report errors:`, err);
    }
  }

  // 发送报告 - 移除动态导入
  private async sendReport(report: ErrorReport): Promise<void> {
    if (!this.isOnline) {
      this.addToRetryQueue(report);
      return;
    }

    try {
      // 直接使用已导入的 secureFetch
      await secureFetch(this.config.apiEndpoint, {
        method: 'POST',
        body: JSON.stringify(report),
        tokenRequired: false
      });

    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to send error report:`, err);
      this.addToRetryQueue(report);
      throw err;
    }
  }

  // 添加到重试队列
  private addToRetryQueue(report: ErrorReport): void {
    this.retryQueue.push(report);

    // 🆕 限制重试队列大小
    if (this.retryQueue.length > 10) {
      this.retryQueue = this.retryQueue.slice(-8); // 只保留最新的8个
    }
  }

  // 重试失败的上报
  private async retryFailedReports(): Promise<void> {
    if (!this.isOnline || this.retryQueue.length === 0) return;
    if (!this.isPageVisible) return; // 页面不可见时不重试

    const reportsToRetry = [...this.retryQueue];
    this.retryQueue = [];

    for (const report of reportsToRetry) {
      try {
        if (await configManager.canReportError()) {
          await this.sendReport(report);
          configManager.incrementErrorCount();
          devLog('log', `📊 [v${packageJson.version}] Retry report ${report.id} successful`);
        } else {
          devLog('log', `🚫 [v${packageJson.version}] Skipping retry report (daily limit reached)`);
          break; // 达到限制，停止重试
        }
      } catch (err) {
        // 重新添加到重试队列（有最大重试次数限制）
        if (!report.retryCount) report.retryCount = 0;
        if (report.retryCount < this.config.maxRetries) {
          report.retryCount++;
          this.addToRetryQueue(report);
        }
      }
    }
  }

  // 启动定时上报
  private startReportTimer(): void {
    this.reportTimer = window.setInterval(() => {
      devLog('log', `📊 [v${packageJson.version}] 开始上报`)
      this.batchReport();
      this.retryFailedReports();
    }, this.config.reportInterval);
  }

  // 停止定时上报
  public stopReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  // 立即上报所有错误（用于页面卸载时）
  public async flushAll(): Promise<void> {
    this.stopReporting();

    if (this.errorQueue.length > 0) {
      await this.batchReport();
    }

    if (this.retryQueue.length > 0) {
      await this.retryFailedReports();
    }
  }

  // 网络状态监听
  private initializeNetworkListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.isPageVisible) {
        this.retryFailedReports();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // 🆕 改进的保存错误到本地存储（带大小和时间限制）
  private saveErrorsToStorage(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      // 清理过期数据
      this.cleanupExpiredData();

      // 限制存储的错误数量
      const errorsToStore = this.errorQueue
        .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
        .slice(0, this.config.maxStorageSize);

      // 限制重试队列大小
      const retryQueueToStore = this.retryQueue.slice(0, 10);

      const data = {
        errors: errorsToStore,
        retryQueue: retryQueueToStore,
        timestamp: Date.now(),
        version: packageJson.version
      };

      const dataString = JSON.stringify(data);
      
      // 🆕 检查存储大小（大约限制在 1MB 以内）
      if (dataString.length > 1024 * 1024) { // 1MB
        devLog('warn', `📊 [v${packageJson.version}] Error storage data too large, reducing size...`);
        
        // 进一步减少存储数据
        const reducedData = {
          errors: errorsToStore.slice(0, Math.floor(this.config.maxStorageSize / 2)),
          retryQueue: retryQueueToStore.slice(0, 5),
          timestamp: Date.now(),
          version: packageJson.version
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reducedData));
      } else {
        localStorage.setItem(this.STORAGE_KEY, dataString);
      }

      devLog('log', `📊 [v${packageJson.version}] Saved ${errorsToStore.length} errors to localStorage`);
    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to save errors to storage:`, err);
      
      // 🆕 如果存储失败（可能是空间不足），尝试清理并重试
      try {
        this.clearOldStorageData();
        
        // 只保存最重要的错误
        const criticalErrors = this.errorQueue
          .filter(error => error.priority === 'critical')
          .slice(0, 10);
          
        const minimalData = {
          errors: criticalErrors,
          retryQueue: [],
          timestamp: Date.now(),
          version: packageJson.version
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(minimalData));
        devLog('log', `📊 [v${packageJson.version}] Saved minimal error data after cleanup`);
      } catch (retryErr) {
        devLog('error', `[v${packageJson.version}] Failed to save minimal error data:`, retryErr);
      }
    }
  }

  // 🆕 清理过期数据
  private cleanupExpiredData(): void {
    const now = Date.now();
    
    // 清理过期的错误
    this.errorQueue = this.errorQueue.filter(error => 
      now - error.timestamp < this.config.maxStorageAge
    );
    
    // 清理过期的重试队列
    this.retryQueue = this.retryQueue.filter(report => 
      now - report.timestamp < this.config.maxStorageAge
    );
  }

  // 🆕 清理旧的存储数据
  private clearOldStorageData(): void {
    try {
      // 清理可能的旧版本存储键
      const oldKeys = [
        'xhunt-error-queue-old',
        'xhunt-error-backup',
        'xhunt-errors-temp'
      ];
      
      oldKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      devLog('log', `📊 [v${packageJson.version}] Cleared old storage data`);
    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to clear old storage data:`, err);
    }
  }

  // 🆕 改进的从本地存储加载错误
  private loadStoredErrors(): void {
    if (!this.config.enableLocalStorage) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);

      // 检查数据版本和时间
      if (data.version !== packageJson.version) {
        devLog('log', `📊 [v${packageJson.version}] Version mismatch, clearing stored errors`);
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // 检查数据是否过期
      if (Date.now() - data.timestamp > this.config.maxStorageAge) {
        devLog('log', `📊 [v${packageJson.version}] Stored errors expired, clearing`);
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }

      // 加载数据并限制大小
      this.errorQueue = (data.errors || []).slice(0, this.config.maxStorageSize);
      this.retryQueue = (data.retryQueue || []).slice(0, 10);

      devLog('log', `📊 [v${packageJson.version}] Loaded ${this.errorQueue.length} errors from localStorage`);
    } catch (err) {
      devLog('error', `[v${packageJson.version}] Failed to load stored errors:`, err);
      // 清理损坏的数据
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成报告ID
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取统计信息
  public getStats() {
    return {
      queueSize: this.errorQueue.length,
      retryQueueSize: this.retryQueue.length,
      isOnline: this.isOnline,
      isPageVisible: this.isPageVisible,
      sessionId: this.sessionId,
      version: packageJson.version,
      storageConfig: {
        maxStorageSize: this.config.maxStorageSize,
        maxStorageAge: this.config.maxStorageAge,
        currentStorageUsage: this.errorQueue.length
      },
      priorityBreakdown: this.errorQueue.reduce((acc, error) => {
        acc[error.priority] = (acc[error.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// 创建全局实例
export const errorReporter = new ErrorReporter({
  maxBatchSize: 10,
  reportInterval: 30000, // 30秒批量上报
  maxRetries: 3,
  enableLocalStorage: true,
  apiEndpoint: '/api/xhunt/report/errors',
  maxStorageSize: 50,     // 🆕 最多存储50条错误记录
  maxStorageAge: 12 * 60 * 60 * 1000 // 🆕 12小时过期
});

// 页面卸载时上报所有错误
window.addEventListener('beforeunload', () => {
  errorReporter.flushAll();
});

export default ErrorReporter;