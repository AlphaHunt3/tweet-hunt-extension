// 官方标签管理器 - 获取和管理官方标签配置
import packageJson from '../../package.json';
import { kbPrefix } from '~contents/services/api.ts';

// 🆕 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// 官方标签配置类型
export interface OfficialTagsConfig {
  [username: string]: string[];
}

class OfficialTagsManager {
  private tags: OfficialTagsConfig | null = null;
  private defaultTags: OfficialTagsConfig = {};
  private tagsFetched: boolean = false;
  private isInitialized: boolean = false;
  private localStorageKey = 'xhunt-official-tags';

  // 初始化标签管理器
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      devLog('log', `🏷️ [v${packageJson.version}] OfficialTagsManager initializing...`);

      // 1. 优先从本地存储加载标签
      this.loadTagsFromLocalStorage();

      // 2. 异步获取远程标签并更新本地存储
      this.fetchAndUpdateTags();

      this.isInitialized = true;
      devLog('log', `🏷️ [v${packageJson.version}] OfficialTagsManager initialized with ${Object.keys(this.tags || {}).length} users`);
    } catch (error) {
      this.tags = this.defaultTags;
      this.isInitialized = true;
      devLog('error', `🏷️ [v${packageJson.version}] Failed to initialize OfficialTagsManager:`, error);
    }
  }

  // 从本地存储加载标签
  private loadTagsFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const storedData = JSON.parse(stored);

        // 验证存储的标签格式
        if (this.isValidTagsConfig(storedData.tags)) {
          this.tags = storedData.tags;
          this.tagsFetched = true;
          // devLog('log', `🏷️ [v${packageJson.version}] Loaded official tags from localStorage: ${Object.keys(this.tags).length} users`);
          return;
        }
      }
    } catch (error) {
      devLog('warn', `🏷️ [v${packageJson.version}] Failed to load official tags from localStorage:`, error);
    }

    // 如果本地存储没有有效标签，使用默认标签
    this.tags = this.defaultTags;
    devLog('log', `🏷️ [v${packageJson.version}] Using default official tags`);
  }

  // 异步获取远程标签并更新本地存储
  private async fetchAndUpdateTags(): Promise<void> {
    try {
      devLog('log', `🏷️ [v${packageJson.version}] Fetching remote official tags...`);

      const response = await fetch(`${kbPrefix}/nacos-configs?dataId=xhunt_built_in_tag&group=DEFAULT_GROUP`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const remoteTags = await response.json();

      // 验证标签格式
      if (this.isValidTagsConfig(remoteTags)) {
        // 更新内存中的标签
        this.tags = remoteTags;
        this.tagsFetched = true;

        // 保存到本地存储
        this.saveTagsToLocalStorage(remoteTags);

        devLog('log', `🏷️ [v${packageJson.version}] Remote official tags updated: ${Object.keys(this.tags).length} users`);
      } else {
        throw new Error('Invalid remote official tags format');
      }

    } catch (error) {
      devLog('warn', `🏷️ [v${packageJson.version}] Failed to fetch remote official tags:`, error);
      // 保持当前标签不变（本地存储的或默认的）
    }
  }

  // 保存标签到本地存储
  private saveTagsToLocalStorage(tags: OfficialTagsConfig): void {
    try {
      const dataToStore = {
        tags,
        timestamp: Date.now(),
        version: packageJson.version
      };

      localStorage.setItem(this.localStorageKey, JSON.stringify(dataToStore));
      devLog('log', `🏷️ [v${packageJson.version}] Official tags saved to localStorage`);
    } catch (error) {
      devLog('error', `🏷️ [v${packageJson.version}] Failed to save official tags to localStorage:`, error);
    }
  }

  // 获取指定用户的官方标签
  public getUserTags(username: string): string[] {
    if (!this.isInitialized) {
      return [];
    }

    const tags = this.tags || this.defaultTags;

    // 尝试精确匹配
    if (tags[username]) {
      return [...tags[username]]; // 返回副本，避免外部修改
    }

    // 尝试不区分大小写匹配
    const lowerUsername = username.toLowerCase();
    for (const [key, value] of Object.entries(tags)) {
      if (key.toLowerCase() === lowerUsername) {
        return [...value];
      }
    }

    // // 尝试去掉下划线匹配
    // const normalizedUsername = username.replace(/^_+|_+$/g, ''); // 去掉开头和结尾的下划线
    // for (const [key, value] of Object.entries(tags)) {
    //   const normalizedKey = key.replace(/^_+|_+$/g, '');
    //   if (normalizedKey.toLowerCase() === normalizedUsername.toLowerCase()) {
    //     return [...value];
    //   }
    // }

    return [];
  }

  // 获取所有官方标签配置
  public getAllTags(): OfficialTagsConfig {
    if (!this.isInitialized) {
      return {};
    }

    return { ...(this.tags || this.defaultTags) }; // 返回副本
  }

  // 检查用户是否有官方标签
  public hasUserTags(username: string): boolean {
    return this.getUserTags(username).length > 0;
  }

  // 验证标签配置格式
  private isValidTagsConfig(config: any): config is OfficialTagsConfig {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // 检查每个键值对
    for (const [key, value] of Object.entries(config)) {
      if (typeof key !== 'string' || !Array.isArray(value)) {
        return false;
      }

      // 检查标签数组中的每个元素都是字符串
      if (!value.every(tag => typeof tag === 'string')) {
        return false;
      }
    }

    return true;
  }

  // 获取统计信息
  public async getStats() {
    const tags = this.tags || this.defaultTags;
    const totalUsers = Object.keys(tags).length;
    const totalTags = Object.values(tags).reduce((sum, userTags) => sum + userTags.length, 0);
    const avgTagsPerUser = totalUsers > 0 ? (totalTags / totalUsers).toFixed(2) : '0';

    return {
      totalUsers,
      totalTags,
      avgTagsPerUser,
      isInitialized: this.isInitialized,
      tagsFetched: this.tagsFetched,
      version: packageJson.version,
      sampleUsers: Object.keys(tags).slice(0, 5) // 显示前5个用户作为示例
    };
  }

  // 重置标签缓存（用于强制重新获取）
  public resetCache(): void {
    this.tags = null;
    this.tagsFetched = false;
    localStorage.removeItem(this.localStorageKey);
    devLog('log', `🏷️ [v${packageJson.version}] Official tags cache reset`);
  }

  // 清理方法
  public cleanup(): void {
    this.isInitialized = false;
    devLog('log', `🏷️ [v${packageJson.version}] OfficialTagsManager cleaned up`);
  }
}

// 创建全局实例
export const officialTagsManager = new OfficialTagsManager();

export default OfficialTagsManager;
