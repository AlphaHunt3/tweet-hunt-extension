// 配置管理器 - 获取和管理远程配置
import packageJson from '../../package.json';
import { kbPrefix } from '~contents/services/api.ts';
import { nacosCacheManager } from './nacosCacheManager';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

export interface XHuntConfig {
  errorsReport: number;    // 每日错误上报限制
  delayedReport: number;   // 每日延迟上报限制
  kolCapabilityModelDisplay: boolean; // 是否显示能力模型
}

export interface DailyLimits {
  errors: number;
  delays: number;
  date: string; // YYYY-MM-DD 格式
}

class ConfigManager {
  private config: XHuntConfig | null = null;
  private defaultConfig: XHuntConfig = {
    errorsReport: 50,
    delayedReport: 100,
    kolCapabilityModelDisplay: true
  };
  private configFetched: boolean = false;
  private isInitialized: boolean = false;
  private localStorageKey = 'xhunt-config';
  private readonly CONFIG_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours cache for config

  // 初始化配置管理器
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      devLog('log', `📋 [v${packageJson.version}] ConfigManager initializing...`);

      // 1. 优先从本地存储加载配置
      this.loadConfigFromLocalStorage();

      // 2. 异步获取远程配置并更新本地存储
      this.fetchAndUpdateConfig();

      this.isInitialized = true;
      devLog('log', `📋 [v${packageJson.version}] ConfigManager initialized with config:`, this.config);
    } catch (error) {
      this.config = this.defaultConfig;
      this.isInitialized = true;
    }
  }

  // 从本地存储加载配置
  private loadConfigFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const storedConfig = JSON.parse(stored);

        // 验证存储的配置格式
        if (this.isValidConfig(storedConfig.config)) {
          this.config = storedConfig.config;
          this.configFetched = true;
          devLog('log', `📋 [v${packageJson.version}] Loaded config from localStorage:`, this.config);
          return;
        }
      }
    } catch (error) {
      devLog('warn', `📋 [v${packageJson.version}] Failed to load config from localStorage:`, error);
    }

    // 如果本地存储没有有效配置，使用默认配置
    this.config = this.defaultConfig;
    devLog('log', `📋 [v${packageJson.version}] Using default config:`, this.config);
  }

  // 异步获取远程配置并更新本地存储
  private async fetchAndUpdateConfig(): Promise<void> {
    try {
      devLog('log', `📋 [v${packageJson.version}] Fetching remote config...`);

      // Use NacosCacheManager to fetch with caching
      const remoteConfig = await nacosCacheManager.fetchWithCache<XHuntConfig>('xhunt_config', this.CONFIG_CACHE_TTL);

      // 验证配置格式
      if (this.isValidConfig(remoteConfig)) {
        // 更新内存中的配置
        this.config = remoteConfig;
        this.configFetched = true;

        // 保存到本地存储
        this.saveConfigToLocalStorage(remoteConfig);

        devLog('log', `📋 [v${packageJson.version}] Remote config updated:`, this.config);
      } else {
        throw new Error('Invalid remote config format');
      }

    } catch (error) {
      devLog('warn', `📋 [v${packageJson.version}] Failed to fetch remote config:`, error);
      // 保持当前配置不变（本地存储的或默认的）
    }
  }

  // 保存配置到本地存储
  private saveConfigToLocalStorage(config: XHuntConfig): void {
    try {
      const dataToStore = {
        config,
        timestamp: Date.now(),
        version: packageJson.version
      };

      localStorage.setItem(this.localStorageKey, JSON.stringify(dataToStore));
      devLog('log', `📋 [v${packageJson.version}] Config saved to localStorage`);
    } catch (error) {
      devLog('error', `📋 [v${packageJson.version}] Failed to save config to localStorage:`, error);
    }
  }

  // 获取配置（同步方法，因为已经在 init 中加载）
  public getConfig(): XHuntConfig {
    if (!this.isInitialized) {
      return this.defaultConfig;
    }

    return this.config || this.defaultConfig;
  }

  // 验证配置格式
  private isValidConfig(config: any): config is XHuntConfig {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.errorsReport === 'number' &&
      typeof config.delayedReport === 'number' &&
      typeof config.kolCapabilityModelDisplay === 'boolean' &&
      config.errorsReport > 0 &&
      config.delayedReport > 0
    );
  }

  // 获取今日限制情况
  public getDailyLimits(): DailyLimits {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const stored = localStorage.getItem('xhunt-daily-limits');
      if (stored) {
        const limits = JSON.parse(stored);

        // 如果是今天的数据，返回
        if (limits.date === today) {
          return limits;
        }
      }
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to load daily limits:`, error);
    }

    // 返回新的今日限制
    const newLimits: DailyLimits = {
      errors: 0,
      delays: 0,
      date: today
    };

    this.saveDailyLimits(newLimits);
    return newLimits;
  }

  // 保存今日限制
  private saveDailyLimits(limits: DailyLimits): void {
    try {
      localStorage.setItem('xhunt-daily-limits', JSON.stringify(limits));
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to save daily limits:`, error);
    }
  }

  // 检查是否可以上报错误
  public async canReportError(): Promise<boolean> {
    const config = this.getConfig();
    const limits = this.getDailyLimits();

    const canReport = limits.errors < config.errorsReport;

    if (!canReport) {
      devLog('log', `🚫 [v${packageJson.version}] Error reporting limit reached: ${limits.errors}/${config.errorsReport}`);
    }

    return canReport;
  }

  // 检查是否可以上报延迟
  public async canReportDelay(): Promise<boolean> {
    const config = this.getConfig();
    const limits = this.getDailyLimits();

    const canReport = limits.delays < config.delayedReport;

    if (!canReport) {
      devLog('log', `🚫 [v${packageJson.version}] Delay reporting limit reached: ${limits.delays}/${config.delayedReport}`);
    }

    return canReport;
  }

  // 检查是否显示能力模型
  public shouldShowAbilityModel(): boolean {
    const config = this.getConfig();
    return config.kolCapabilityModelDisplay;
  }

  // 增加错误上报计数
  public incrementErrorCount(): void {
    const limits = this.getDailyLimits();
    limits.errors++;
    this.saveDailyLimits(limits);

    devLog('log', `📊 [v${packageJson.version}] Error report count: ${limits.errors}`);
  }

  // 增加延迟上报计数
  public incrementDelayCount(): void {
    const limits = this.getDailyLimits();
    limits.delays++;
    this.saveDailyLimits(limits);

    devLog('log', `📊 [v${packageJson.version}] Delay report count: ${limits.delays}`);
  }

  // 获取统计信息
  public async getStats() {
    const config = this.getConfig();
    const limits = this.getDailyLimits();

    return {
      config,
      limits,
      errorReportsRemaining: Math.max(0, config.errorsReport - limits.errors),
      delayReportsRemaining: Math.max(0, config.delayedReport - limits.delays),
      cacheStatus: nacosCacheManager.getStats(),
      isInitialized: this.isInitialized,
      configFetched: this.configFetched,
      version: packageJson.version
    };
  }

  // 重置配置缓存（用于强制重新获取）
  public resetCache(): void {
    this.config = null;

    // Invalidate NacosCacheManager cache
    nacosCacheManager.invalidate('xhunt_config');
    this.configFetched = false;
    localStorage.removeItem(this.localStorageKey);
    devLog('log', `📋 [v${packageJson.version}] Config cache reset`);
  }

  // 清理方法
  public cleanup(): void {
    this.isInitialized = false;
    devLog('log', `📋 [v${packageJson.version}] ConfigManager cleaned up`);
  }
}

// 创建全局实例
export const configManager = new ConfigManager();

export default ConfigManager;
