// 配置管理器 - 获取和管理远程配置
import packageJson from '../../package.json';
import { nacosCacheManager } from './nacosCacheManager';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

export interface XHuntConfig {
  errorsReport: number; // 每日错误上报限制
  delayedReport: number; // 每日延迟上报限制
  kolCapabilityModelDisplay: boolean; // 是否显示能力模型
  forceUpdateRankCache: number; // 最后强制更新头像缓存的时间
  mantleHunterProgram: boolean; // 是否显示 Mantle Hunter 活动
  mantleHunterProgramGuide?: string; // 官方指南链接（无需校验）
  mantleHunterProgramActiveURL?: string; // 活动主链接（无需校验）
}

export interface DailyLimits {
  errors: number;
  delays: number;
  date: string; // YYYY-MM-DD 格式
}

class ConfigManager {
  private config: XHuntConfig | null = null;
  private defaultConfig: XHuntConfig = {
    errorsReport: 1,
    delayedReport: 1,
    kolCapabilityModelDisplay: true,
    forceUpdateRankCache: 0,
    mantleHunterProgram: false,
    mantleHunterProgramGuide: '',
    mantleHunterProgramActiveURL: '',
  };
  private configFetched: boolean = false;
  private isInitialized: boolean = false;
  private localStorageKey = 'xhunt-config';
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5分钟 cache for config

  // 初始化配置管理器
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      devLog(
        'log',
        `📋 [v${packageJson.version}] ConfigManager initializing...`
      );

      // 1. 优先从本地存储加载配置
      this.loadConfigFromLocalStorage();

      // 2. 异步获取远程配置并更新本地存储
      this.fetchAndUpdateConfig();

      this.isInitialized = true;
      devLog(
        'log',
        `📋 [v${packageJson.version}] ConfigManager initialized with config:`,
        this.config
      );
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
          devLog(
            'log',
            `📋 [v${packageJson.version}] Loaded config from localStorage:`,
            this.config
          );
          return;
        }
      }
    } catch (error) {
      devLog(
        'warn',
        `📋 [v${packageJson.version}] Failed to load config from localStorage:`,
        error
      );
    }

    // 如果本地存储没有有效配置，使用默认配置
    this.config = this.defaultConfig;
    devLog(
      'log',
      `📋 [v${packageJson.version}] Using default config:`,
      this.config
    );
  }

  // 异步获取远程配置并更新本地存储
  private async fetchAndUpdateConfig(): Promise<void> {
    try {
      devLog('log', `📋 [v${packageJson.version}] Fetching remote config...`);

      // Use NacosCacheManager to fetch with caching
      const remoteConfig = await nacosCacheManager.fetchWithCache<XHuntConfig>(
        'xhunt_config',
        this.CONFIG_CACHE_TTL
      );
      // 验证配置格式
      if (this.isValidConfig(remoteConfig)) {
        // 更新内存中的配置
        this.config = remoteConfig;
        this.configFetched = true;
        // 保存到本地存储
        this.saveConfigToLocalStorage(remoteConfig);

        // 🆕 检查是否需要强制更新排名缓存
        await this.checkForceUpdateRankCache(remoteConfig);
        devLog(
          'log',
          `📋 [v${packageJson.version}] Remote config updated:`,
          this.config
        );
      } else {
        throw new Error('Invalid remote config format');
      }
    } catch (error) {
      devLog(
        'warn',
        `📋 [v${packageJson.version}] Failed to fetch remote config:`,
        error
      );
      // 保持当前配置不变（本地存储的或默认的）
    }
  }

  // 🆕 检查是否需要强制更新排名缓存
  private async checkForceUpdateRankCache(config: XHuntConfig): Promise<void> {
    try {
      const remoteForceUpdateTime = config.forceUpdateRankCache;
      const localLastUpdateTime = this.getLastForceUpdateTime();

      console.log(
        'log1',
        `📋 [v${packageJson.version}] Checking force update: remote=${remoteForceUpdateTime}, local=${localLastUpdateTime}`
      );

      // 如果远程时间戳大于本地时间戳，需要强制清理缓存
      if (Number(remoteForceUpdateTime) > Number(localLastUpdateTime)) {
        devLog(
          'log',
          `📋 [v${packageJson.version}] Force updating rank cache...`
        );

        // 动态导入 RankCacheManager 避免循环依赖
        const { RankCacheManager } = await import('./rankCacheManager');

        // 强制清理所有排名缓存
        await RankCacheManager.forceClearAll();

        // 更新本地时间戳
        this.setLastForceUpdateTime(remoteForceUpdateTime);

        devLog(
          'log',
          `📋 [v${packageJson.version}] Rank cache force updated successfully`
        );
      }
    } catch (error) {
      devLog(
        'error',
        `📋 [v${packageJson.version}] Failed to check force update rank cache:`,
        error
      );
    }
  }

  // 保存配置到本地存储
  private saveConfigToLocalStorage(config: XHuntConfig): void {
    try {
      const dataToStore = {
        config,
        timestamp: Date.now(),
        version: packageJson.version,
      };

      localStorage.setItem(this.localStorageKey, JSON.stringify(dataToStore));
      devLog(
        'log',
        `📋 [v${packageJson.version}] Config saved to localStorage`
      );
    } catch (error) {
      devLog(
        'error',
        `📋 [v${packageJson.version}] Failed to save config to localStorage:`,
        error
      );
    }
  }

  // 🆕 获取最后强制更新时间
  private getLastForceUpdateTime(): number {
    try {
      const stored = localStorage.getItem('xhunt-last-force-update-rank');
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      devLog(
        'error',
        `📋 [v${packageJson.version}] Failed to get last force update time:`,
        error
      );
      return 0;
    }
  }

  // 🆕 设置最后强制更新时间
  private setLastForceUpdateTime(timestamp: number): void {
    try {
      localStorage.setItem(
        'xhunt-last-force-update-rank',
        timestamp.toString()
      );
      devLog(
        'log',
        `📋 [v${packageJson.version}] Last force update time set to: ${timestamp}`
      );
    } catch (error) {
      devLog(
        'error',
        `📋 [v${packageJson.version}] Failed to set last force update time:`,
        error
      );
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
      typeof config.kolCapabilityModelDisplay === 'boolean'
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
      devLog(
        'error',
        `[v${packageJson.version}] Failed to load daily limits:`,
        error
      );
    }

    // 返回新的今日限制
    const newLimits: DailyLimits = {
      errors: 0,
      delays: 0,
      date: today,
    };

    this.saveDailyLimits(newLimits);
    return newLimits;
  }

  // 保存今日限制
  private saveDailyLimits(limits: DailyLimits): void {
    try {
      localStorage.setItem('xhunt-daily-limits', JSON.stringify(limits));
    } catch (error) {
      devLog(
        'error',
        `[v${packageJson.version}] Failed to save daily limits:`,
        error
      );
    }
  }

  // 检查是否可以上报错误
  public async canReportError(): Promise<boolean> {
    const config = this.getConfig();
    const limits = this.getDailyLimits();

    const canReport = limits.errors < config.errorsReport;

    if (!canReport) {
      devLog(
        'log',
        `🚫 [v${packageJson.version}] Error reporting limit reached: ${limits.errors}/${config.errorsReport}`
      );
    }

    return canReport;
  }

  // 检查是否可以上报延迟
  public async canReportDelay(): Promise<boolean> {
    const config = this.getConfig();
    const limits = this.getDailyLimits();

    const canReport = limits.delays < config.delayedReport;

    if (!canReport) {
      devLog(
        'log',
        `🚫 [v${packageJson.version}] Delay reporting limit reached: ${limits.delays}/${config.delayedReport}`
      );
    }

    return canReport;
  }

  // 检查是否显示能力模型
  public shouldShowAbilityModel(): boolean {
    const config = this.getConfig();
    return config.kolCapabilityModelDisplay;
  }

  // 检查是否显示 Mantle Hunter 活动
  public shouldShowMantleHunterProgram(): boolean {
    const config = this.getConfig();
    return config.mantleHunterProgram;
  }

  // 获取 Mantle 活动官方指南链接（不做字段有效性校验）
  public getMantleHunterProgramGuide(): string {
    const config = this.getConfig();
    return (config as any).mantleHunterProgramGuide || '';
  }

  // 获取 Mantle 活动主链接（不做字段有效性校验）
  public getMantleHunterProgramActiveURL(): string {
    const config = this.getConfig();
    return (config as any).mantleHunterProgramActiveURL || '';
  }

  // 增加错误上报计数
  public incrementErrorCount(): void {
    const limits = this.getDailyLimits();
    limits.errors++;
    this.saveDailyLimits(limits);

    devLog(
      'log',
      `📊 [v${packageJson.version}] Error report count: ${limits.errors}`
    );
  }

  // 增加延迟上报计数
  public incrementDelayCount(): void {
    const limits = this.getDailyLimits();
    limits.delays++;
    this.saveDailyLimits(limits);

    devLog(
      'log',
      `📊 [v${packageJson.version}] Delay report count: ${limits.delays}`
    );
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
      version: packageJson.version,
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
