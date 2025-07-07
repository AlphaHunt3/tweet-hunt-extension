// 高延迟请求监控器 - 专门监控和上报延迟超过阈值的请求
import packageJson from '../../package.json';
import { configManager } from './configManager';
import { visibilityManager } from './visibilityManager';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  console[level](...args);
};

// 网络信息接口
export interface NetworkInfo {
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  downlink?: number;      // 下行速度 Mbps
  rtt?: number;           // 往返时间 ms
  saveData?: boolean;     // 是否开启数据节省模式
  timestamp: number;      // 检测时间戳
}

// 🆕 IP 地址信息接口
export interface IPInfo {
  ip?: string;            // IP 地址
  country?: string;       // 国家
  region?: string;        // 地区
  city?: string;          // 城市
  isp?: string;           // ISP 提供商
  timezone?: string;      // 时区
  timestamp: number;      // 获取时间戳
  source: 'cache' | 'api' | 'failed'; // 数据来源
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
  ipInfo?: IPInfo;             // 🆕 IP 地址信息
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
  ipCacheExpiry: number;      // 🆕 IP 缓存过期时间（毫秒）
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

// 🆕 IP 地址缓存管理
class IPAddressManager {
  private static readonly CACHE_KEY = 'xhunt-ip-cache';
  private static readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30分钟缓存
  private static cachedIPInfo: IPInfo | null = null;
  private static lastFetchTime = 0;
  private static isCurrentlyFetching = false;

  // 获取 IP 地址信息（带缓存）
  public static async getIPInfo(): Promise<IPInfo> {
    const now = Date.now();

    // 检查内存缓存
    if (this.cachedIPInfo && (now - this.lastFetchTime) < this.CACHE_EXPIRY) {
      return {
        ...this.cachedIPInfo,
        source: 'cache'
      };
    }

    // 检查本地存储缓存
    const cachedData = this.loadFromLocalStorage();
    if (cachedData && (now - cachedData.timestamp) < this.CACHE_EXPIRY) {
      this.cachedIPInfo = cachedData;
      this.lastFetchTime = cachedData.timestamp;
      return {
        ...cachedData,
        source: 'cache'
      };
    }

    // 如果正在获取中，返回缓存数据或默认数据
    if (this.isCurrentlyFetching) {
      return this.cachedIPInfo || this.getDefaultIPInfo();
    }

    // 异步获取新的 IP 信息
    this.fetchIPInfoAsync();

    // 返回缓存数据或默认数据
    return this.cachedIPInfo || this.getDefaultIPInfo();
  }

  // 异步获取 IP 信息
  private static async fetchIPInfoAsync(): Promise<void> {
    if (this.isCurrentlyFetching) return;

    this.isCurrentlyFetching = true;

    try {
      devLog('log', `🌐 [v${packageJson.version}] Fetching IP information...`);

      // 使用多个 IP 服务，提高成功率
      const ipServices = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json',
        'https://api.ipify.org?format=json'
      ];

      let ipInfo: IPInfo | null = null;

      for (const service of ipServices) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

          const response = await fetch(service, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          });

          clearTimeout(timeoutId);

          if (!response.ok) continue;

          const data = await response.json();
          ipInfo = this.parseIPResponse(data, service);

          if (ipInfo && ipInfo.ip) {
            devLog('log', `🌐 [v${packageJson.version}] IP info fetched from ${service}:`, ipInfo);
            break;
          }
        } catch (error) {
          devLog('warn', `🌐 [v${packageJson.version}] Failed to fetch from ${service}:`, error);
          continue;
        }
      }

      if (ipInfo && ipInfo.ip) {
        // 更新缓存
        this.cachedIPInfo = ipInfo;
        this.lastFetchTime = Date.now();
        this.saveToLocalStorage(ipInfo);
      } else {
        devLog('warn', `🌐 [v${packageJson.version}] Failed to fetch IP info from all services`);
      }

    } catch (error) {
      devLog('error', `[v${packageJson.version}] Error in fetchIPInfoAsync:`, error);
    } finally {
      this.isCurrentlyFetching = false;
    }
  }

  // 解析不同 IP 服务的响应
  private static parseIPResponse(data: any, service: string): IPInfo {
    const now = Date.now();

    try {
      if (service.includes('ipapi.co')) {
        return {
          ip: data.ip,
          country: data.country_name,
          region: data.region,
          city: data.city,
          isp: data.org,
          timezone: data.timezone,
          timestamp: now,
          source: 'api'
        };
      } else if (service.includes('ip-api.com')) {
        return {
          ip: data.query,
          country: data.country,
          region: data.regionName,
          city: data.city,
          isp: data.isp,
          timezone: data.timezone,
          timestamp: now,
          source: 'api'
        };
      } else if (service.includes('ipinfo.io')) {
        return {
          ip: data.ip,
          country: data.country,
          region: data.region,
          city: data.city,
          isp: data.org,
          timezone: data.timezone,
          timestamp: now,
          source: 'api'
        };
      } else if (service.includes('ipify.org')) {
        return {
          ip: data.ip,
          timestamp: now,
          source: 'api'
        };
      }
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Error parsing IP response from ${service}:`, error);
    }

    return this.getDefaultIPInfo();
  }

  // 获取默认 IP 信息
  private static getDefaultIPInfo(): IPInfo {
    return {
      timestamp: Date.now(),
      source: 'failed'
    };
  }

  // 保存到本地存储
  private static saveToLocalStorage(ipInfo: IPInfo): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(ipInfo));
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to save IP info to localStorage:`, error);
    }
  }

  // 从本地存储加载
  private static loadFromLocalStorage(): IPInfo | null {
    try {
      const stored = localStorage.getItem(this.CACHE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // 验证数据格式
      if (data && typeof data.timestamp === 'number') {
        return data;
      }
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to load IP info from localStorage:`, error);
    }

    return null;
  }

  // 清理缓存
  public static clearCache(): void {
    this.cachedIPInfo = null;
    this.lastFetchTime = 0;
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to clear IP cache:`, error);
    }
  }

  // 获取缓存统计
  public static getCacheStats() {
    return {
      hasCachedData: !!this.cachedIPInfo,
      lastFetchTime: this.lastFetchTime,
      cacheAge: this.lastFetchTime ? Date.now() - this.lastFetchTime : 0,
      isCurrentlyFetching: this.isCurrentlyFetching,
      cachedIP: this.cachedIPInfo?.ip || 'unknown'
    };
  }
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
      ipCacheExpiry: 30 * 60 * 1000, // 🆕 30分钟 IP 缓存
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

      // 🆕 预热 IP 地址获取
      this.preloadIPInfo();

      this.isInitialized = true;

      devLog('log', `🐌 [v${packageJson.version}] HighDelayReporter initialized (threshold: ${this.config.delayThreshold}ms)`);
      return this.createInstance();
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to initialize HighDelayReporter:`, error);
      return this.createEmptyInstance();
    }
  }

  // 🆕 预加载 IP 信息
  private async preloadIPInfo(): Promise<void> {
    try {
      await IPAddressManager.getIPInfo();
      devLog('log', `🌐 [v${packageJson.version}] IP info preloaded successfully`);
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to preload IP info:`, error);
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

      // 🆕 获取 IP 地址信息
      const ipInfo = await IPAddressManager.getIPInfo();

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

        // 设备信息（包含 IP 信息）
        deviceInfo: this.getDeviceInfo(ipInfo),

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

  // 🆕 获取设备信息（包含 IP 信息）
  private getDeviceInfo(ipInfo?: IPInfo): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: (navigator as any).hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      connection: this.getNetworkInfo(),
      ipInfo: ipInfo || { timestamp: Date.now(), source: 'failed' } // 🆕 包含 IP 信息
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
      devLog('log', `🐌 [v${packageJson.version}] High delay record reported immediately: ${record.url} (user: ${record.userId || 'unknown'}, ip: ${record.deviceInfo.ipInfo?.ip || 'unknown'}, url: ${record.currentUrl})`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to report high delay immediately:`, error);
    }
  }

  // 🔧 修复批量上报逻辑
  private async batchReport(): Promise<void> {
    devLog('log', `🐌 [v${packageJson.version}] batchReport called, queue size: ${this.highDelayQueue.length}`);

    if (this.highDelayQueue.length === 0) {
      devLog('log', `🐌 [v${packageJson.version}] No high delay records to report`);
      return;
    }

    if (!this.isPageVisible) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping batch high delay report (page not visible)`);
      return;
    }

    // 🔧 修复：检查 secureFetch 是否可用
    if (!this.secureFetchRef) {
      devLog('warn', `🐌 [v${packageJson.version}] secureFetch not available, skipping batch report`);
      return;
    }

    if (!(await configManager.canReportDelay())) {
      devLog('log', `🚫 [v${packageJson.version}] Skipping batch high delay report (daily limit reached)`);
      return;
    }

    try {
      const recordsToReport = [...this.highDelayQueue];
      devLog('log', `🐌 [v${packageJson.version}] Attempting to report ${recordsToReport.length} high delay records`);

      await this.sendReport(recordsToReport);

      // 清空队列
      this.highDelayQueue = [];
      this.saveRecordsToStorage();

      configManager.incrementDelayCount();
      devLog('log', `🐌 [v${packageJson.version}] Batch reported ${recordsToReport.length} high delay records successfully`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to batch report high delays:`, error);
    }
  }

  // 🔧 修复发送报告方法 - 增强错误处理和调试信息
  private async sendReport(records: HighDelayRecord[]): Promise<void> {
    if (!this.secureFetchRef) {
      devLog('warn', `[v${packageJson.version}] secureFetch not available for high delay reporting`);
      throw new Error('secureFetch not available');
    }

    try {
      const report = {
        id: this.generateReportId(),
        records,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        version: packageJson.version,
        reportType: 'high-delay',
        // 🆕 添加 IP 缓存统计信息
        ipCacheStats: IPAddressManager.getCacheStats()
      };

      devLog('log', `🐌 [v${packageJson.version}] Sending high delay report:`, {
        reportId: report.id,
        recordCount: records.length,
        endpoint: this.config.apiEndpoint,
        reportSize: JSON.stringify(report).length
      });

      // 🔧 增强错误处理 - 检查接口是否存在
      try {
        const response = await this.secureFetchRef(this.config.apiEndpoint, {
          method: 'POST',
          body: JSON.stringify(report),
          tokenRequired: false
        });

        devLog('log', `🐌 [v${packageJson.version}] High delay report sent successfully:`, response);
      } catch (fetchError: any) {
        devLog('error', `🐌 [v${packageJson.version}] High delay report fetch error:`, fetchError);

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
    devLog('log', `🐌 [v${packageJson.version}] Starting high delay report timer (interval: ${this.config.reportInterval}ms)`);

    this.reportTimer = window.setInterval(() => {
      devLog('log', `🐌 [v${packageJson.version}] High delay report timer triggered`);
      this.batchReport();
    }, this.config.reportInterval);
  }

  // 停止定时上报
  public stopReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
      devLog('log', `🐌 [v${packageJson.version}] High delay report timer stopped`);
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
    devLog('log', `🐌 [v${packageJson.version}] Flushing all high delay records`);

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

  // 🆕 获取统计信息（包含 IP 信息）
  public getStats() {
    return {
      queueSize: this.highDelayQueue.length,
      delayThreshold: this.config.delayThreshold,
      sessionId: this.sessionId,
      isPageVisible: this.isPageVisible,
      isInitialized: this.isInitialized,
      secureFetchAvailable: !!this.secureFetchRef, // 🔧 添加 secureFetch 可用性检查
      reportTimerActive: !!this.reportTimer, // 🔧 添加定时器状态检查
      version: packageJson.version,
      // 🆕 IP 缓存统计
      ipCacheStats: IPAddressManager.getCacheStats(),
      recentHighDelays: this.highDelayQueue.slice(-5).map(record => ({
        url: record.url,
        duration: record.duration,
        timestamp: record.timestamp,
        networkType: record.networkAfter.effectiveType,
        userId: record.userId, // 🆕 包含用户信息
        currentUrl: record.currentUrl, // 🆕 包含当前网址
        ip: record.deviceInfo.ipInfo?.ip || 'unknown', // 🆕 包含 IP 地址
        country: record.deviceInfo.ipInfo?.country || 'unknown', // 🆕 包含国家信息
        isp: record.deviceInfo.ipInfo?.isp || 'unknown' // 🆕 包含 ISP 信息
      }))
    };
  }

  // 🆕 手动刷新 IP 信息
  public async refreshIPInfo(): Promise<IPInfo> {
    IPAddressManager.clearCache();
    return await IPAddressManager.getIPInfo();
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
  delayThreshold: 5000,        // 5秒阈值
  maxRecordsQueue: 30,         // 最多50条记录
  reportInterval: 30000,       // 30秒批量上报
  apiEndpoint: '/api/xhunt/report/high-delay',
  enableLocalStorage: true,
  maxRetries: 3,
  ipCacheExpiry: 30 * 60 * 1000 // 🆕 30分钟 IP 缓存
});

// 页面卸载时上报所有数据
window.addEventListener('beforeunload', () => {
  delayReporter.flushAll();
});

export default HighDelayReporter;
