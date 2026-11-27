// src/background/utils/backgroundConfig.ts
import { localStorageInstance } from '~storage/index.ts';
import { nacosCacheManager } from '~utils/nacosCacheManager.ts';

export interface XHuntConfig {
  errorsReport: number;
  delayedReport: number;
  kolCapabilityModelDisplay: boolean;
  forceUpdateRankCache: number;
  mantleHunterProgram: boolean;
  mantleHunterProgramGuide?: string;
  mantleHunterProgramActiveURL?: string;
  realTimeSubscriptionSSE?: boolean;
}

class BackgroundConfigService {
  private config: XHuntConfig | null = null;
  private initializing: Promise<void> | null = null;

  private defaultConfig: XHuntConfig = {
    errorsReport: 1,
    delayedReport: 1,
    kolCapabilityModelDisplay: true,
    forceUpdateRankCache: 0,
    mantleHunterProgram: false,
    mantleHunterProgramGuide: '',
    mantleHunterProgramActiveURL: '',
    realTimeSubscriptionSSE: true,
  };

  public async init(forceRefresh: boolean = false): Promise<void> {
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      try {
        if (!forceRefresh) {
          // 优先从 storage 读取
          const storedConfig = await this.readFromStorage();
          if (storedConfig) {
            this.config = storedConfig;
          }
        }

        // 每次调用都可以强制刷新（由调用方传入 forceRefresh）
        if (forceRefresh || !this.config) {
          const remote = await this.fetchRemoteConfig();
          if (remote && this.isValidConfig(remote)) {
            this.config = remote;
          }
        }
      } catch {
        // 静默失败，保留已有配置或使用默认
      } finally {
        this.initializing = null;
      }
    })();

    return this.initializing;
  }

  public getConfig(): XHuntConfig {
    return this.config || this.defaultConfig;
  }

  private async readFromStorage(): Promise<XHuntConfig | null> {
    try {
      const STORAGE_KEY = '@xhunt/config';
      const cfg = (await localStorageInstance.get(
        STORAGE_KEY
      )) as XHuntConfig | null;
      return cfg || null;
    } catch {
      return null;
    }
  }

  private isValidConfig(config: any): config is XHuntConfig {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.errorsReport === 'number' &&
      typeof config.delayedReport === 'number' &&
      typeof config.kolCapabilityModelDisplay === 'boolean'
    );
  }

  private async fetchRemoteConfig(): Promise<XHuntConfig | null> {
    try {
      const data = await nacosCacheManager.fetchWithCache<XHuntConfig>(
        'xhunt_config',
        5 * 60 * 1000
      );
      return data || null;
    } catch {
      return null;
    }
  }
}

export const backgroundConfig = new BackgroundConfigService();
export default BackgroundConfigService;
