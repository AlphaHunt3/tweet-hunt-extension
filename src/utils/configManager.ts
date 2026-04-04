// 配置管理器 - 获取和管理远程配置
import packageJson from '../../package.json';
import { nacosCacheManager } from './nacosCacheManager';
import { localStorageInstance } from '~storage/index.ts';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

export interface TestConfig {
  features: string[];
  testers: string[];
}

export interface AdBannerItem {
  id: string; // 广告唯一标识
  enabled: boolean; // 是否启用
  type: 'commercial' | 'normal'; // 广告类型：commercial 优先展示
  daily_limit: number; // 每日展示上限，-1 表示无限
  visible_to?: string[]; // 可见用户白名单，空数组或不设置则所有人可见
  // 中文配置
  image_url_zh: string; // 中文图片地址
  link_url_zh: string; // 中文跳转链接
  alt_text_zh?: string; // 中文图片描述
  // 英文配置
  image_url_en: string; // 英文图片地址
  link_url_en: string; // 英文跳转链接
  alt_text_en?: string; // 英文图片描述
}

export interface XHuntConfig {
  errorsReport: number; // 每日错误上报限制
  delayedReport: number; // 每日延迟上报限制
  kolCapabilityModelDisplay: boolean; // 是否显示能力模型
  forceUpdateRankCache: number; // 最后强制更新头像缓存的时间
  mantleHunterProgram: boolean; // 是否显示 Mantle Hunter 活动
  mantleHunterProgramGuide?: string; // 官方指南链接（无需校验）
  mantleHunterProgramActiveURL?: string; // 活动主链接（无需校验）
  bybitHunterProgram?: boolean;
  bybitHunterProgramGuide?: string;
  bybitHunterProgramActiveURL?: string;
  realTimeSubscriptionSSE?: boolean; // 是否启用实时订阅的 SSE 功能
  // 🆕 简易灰度策略配置
  testConfig?: TestConfig;
  flexibleTesting?: {
    [key: string]: string[];
  };
  // 🆕 首页广告轮播配置
  adBanners?: AdBannerItem[];
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
    bybitHunterProgram: false,
    bybitHunterProgramGuide: '',
    bybitHunterProgramActiveURL: '',
    realTimeSubscriptionSSE: true,
  };
  private configFetched: boolean = false;
  private isInitialized: boolean = false;
  private readonly CONFIG_CACHE_TTL = 1 * 60 * 1000; // 1分钟 cache for config
  private dailyLimitsCache: DailyLimits | null = null;
  private lastForceUpdateTimeCache: number = 0;

  // 初始化配置管理器
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      devLog(
        'log',
        `📋 [v${packageJson.version}] ConfigManager initializing...`
      );

      // 1. 优先从本地存储加载配置（Plasmo Storage 优先）
      this.config = this.defaultConfig;

      // 异步加载最后强制更新时间缓存
      try {
        const stored = (await localStorageInstance.get(
          '@xhunt/last-force-update-rank'
        )) as string | number | null;
        const val =
          typeof stored === 'string' ? parseInt(stored, 10) : Number(stored);
        this.lastForceUpdateTimeCache = isNaN(val) ? 0 : val;
      } catch { }

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

  // 🆕 获取最后强制更新时间
  private getLastForceUpdateTime(): number {
    return this.lastForceUpdateTimeCache || 0;
  }

  // 🆕 设置最后强制更新时间
  private setLastForceUpdateTime(timestamp: number): void {
    try {
      // 异步写入 Plasmo Storage（不阻塞主流程）
      try {
        void localStorageInstance.set(
          '@xhunt/last-force-update-rank',
          timestamp.toString()
        );
      } catch { }
      this.lastForceUpdateTimeCache = Number(timestamp) || 0;
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
    if (this.dailyLimitsCache && this.dailyLimitsCache.date === today) {
      return this.dailyLimitsCache;
    }

    // 默认值并异步从存储加载
    const defaults: DailyLimits = { errors: 0, delays: 0, date: today };
    this.dailyLimitsCache = defaults;
    void this.loadDailyLimitsFromStorage(today);
    return defaults;
  }

  // 保存今日限制
  private saveDailyLimits(limits: DailyLimits): void {
    this.dailyLimitsCache = limits;
    try {
      void localStorageInstance.set('@xhunt/daily-limits', limits as any);
    } catch (error) {
      devLog(
        'error',
        `[v${packageJson.version}] Failed to save daily limits:`,
        error
      );
    }
  }

  // 异步从存储加载今日限制
  private async loadDailyLimitsFromStorage(
    expectedDate?: string
  ): Promise<void> {
    try {
      const stored = (await localStorageInstance.get(
        '@xhunt/daily-limits'
      )) as any;
      const today = expectedDate || new Date().toISOString().split('T')[0];
      if (stored && typeof stored === 'object' && stored.date === today) {
        this.dailyLimitsCache = stored as DailyLimits;
        return;
      }
      // 不存在或过期则写入默认
      const defaults: DailyLimits = { errors: 0, delays: 0, date: today };
      this.dailyLimitsCache = defaults;
      try {
        await localStorageInstance.set('@xhunt/daily-limits', defaults as any);
      } catch { }
    } catch {
      // 忽略错误，保持默认
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
    // return false; //暂时不展示
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

  public shouldShowBybitHunterProgram(): boolean {
    const config = this.getConfig();
    return Boolean((config as any).bybitHunterProgram);
  }

  public getBybitHunterProgramGuide(): string {
    const config = this.getConfig();
    return (config as any).bybitHunterProgramGuide || '';
  }

  public getBybitHunterProgramActiveURL(): string {
    const config = this.getConfig();
    return (config as any).bybitHunterProgramActiveURL || '';
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
    try {
      void localStorageInstance.remove('@xhunt/config');
    } catch { }
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
