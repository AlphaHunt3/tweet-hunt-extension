// 官方标签管理器 - 获取和管理官方标签配置
import packageJson from '../../package.json';
import { kbPrefix } from '~contents/services/api.ts';
import { localStorageInstance } from '~storage';
import { nacosCacheManager } from './nacosCacheManager';

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
  private tags: {
    zh: OfficialTagsConfig | null;
    en: OfficialTagsConfig | null;
  } = {
    zh: null,
    en: null
  };
  private defaultTags: OfficialTagsConfig = {};
  private tagsFetched: {
    zh: boolean;
    en: boolean;
  } = {
    zh: false,
    en: false
  };
  private isInitialized: boolean = false;
  private localStorageKeyPrefix = 'xhunt-official-tags';
  private currentLang: string = 'zh'; // 默认语言
  private readonly TAGS_CACHE_TTL = 22 * 60 * 60 * 1000; // 22 hours cache for tags

  // 初始化标签管理器
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      devLog('log', `🏷️ [v${packageJson.version}] OfficialTagsManager initializing...`);

      // 获取当前语言设置
      await this.getCurrentLanguage();

      // 1. 优先从本地存储加载标签（两种语言都加载）
      this.loadTagsFromLocalStorage('zh');
      this.loadTagsFromLocalStorage('en');

      // 2. 异步获取远程标签并更新本地存储（根据当前语言优先加载）
      if (this.currentLang === 'en') {
        // 英文优先
        await this.fetchAndUpdateTags('en');
        this.fetchAndUpdateTags('zh'); // 后台加载中文版本
      } else {
        // 中文优先
        await this.fetchAndUpdateTags('zh');
        this.fetchAndUpdateTags('en'); // 后台加载英文版本
      }

      this.isInitialized = true;
      // @ts-ignore
      devLog('log', `🏷️ [v${packageJson.version}] OfficialTagsManager initialized with ${Object.keys(this.tags[this.currentLang] || {}).length} users in ${this.currentLang} language`);
    } catch (error) {
      this.tags.zh = this.defaultTags;
      this.tags.en = this.defaultTags;
      this.isInitialized = true;
      devLog('error', `🏷️ [v${packageJson.version}] Failed to initialize OfficialTagsManager:`, error);
    }
  }

  // 获取当前语言设置
  private async getCurrentLanguage(): Promise<void> {
    try {
      const lang = await localStorageInstance.get('@settings/language1');
      if (lang && (lang === 'zh' || lang === 'en')) {
        this.currentLang = lang;
      } else {
        // 如果没有设置语言或语言设置不是 zh/en，则使用默认语言
        this.currentLang = 'zh';
      }
      devLog('log', `🏷️ [v${packageJson.version}] Current language set to: ${this.currentLang}`);
    } catch (error) {
      devLog('warn', `🏷️ [v${packageJson.version}] Failed to get current language, using default:`, error);
      this.currentLang = 'zh';
    }
  }

  // 从本地存储加载标签
  private loadTagsFromLocalStorage(lang: 'zh' | 'en'): void {
    try {
      const storageKey = `${this.localStorageKeyPrefix}-${lang}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const storedData = JSON.parse(stored);

        // 验证存储的标签格式
        if (this.isValidTagsConfig(storedData.tags)) {
          this.tags[lang] = storedData.tags;
          this.tagsFetched[lang] = true;
          devLog('log', `🏷️ [v${packageJson.version}] Loaded official tags (${lang}) from localStorage: ${Object.keys(this.tags[lang] || {}).length} users`);
          return;
        }
      }
    } catch (error) {
      devLog('warn', `🏷️ [v${packageJson.version}] Failed to load official tags (${lang}) from localStorage:`, error);
    }

    // 如果本地存储没有有效标签，使用默认标签
    this.tags[lang] = this.defaultTags;
    devLog('log', `🏷️ [v${packageJson.version}] Using default official tags for ${lang}`);
  }

  // 异步获取远程标签并更新本地存储
  private async fetchAndUpdateTags(lang: 'zh' | 'en'): Promise<void> {
    try {
      devLog('log', `🏷️ [v${packageJson.version}] Fetching remote official tags for ${lang}...`);

      // 根据语言选择不同的 dataId
      const dataId = lang === 'en' ? 'xhunt_built_in_tag_en' : 'xhunt_built_in_tag';

      // 使用 NacosCacheManager 获取数据，设置24小时缓存
      const remoteTags = await nacosCacheManager.fetchWithCache<OfficialTagsConfig>(dataId, this.TAGS_CACHE_TTL);

      // 验证标签格式
      if (this.isValidTagsConfig(remoteTags)) {
        // 更新内存中的标签
        this.tags[lang] = remoteTags;
        this.tagsFetched[lang] = true;

        // 保存到本地存储
        this.saveTagsToLocalStorage(remoteTags, lang);

        devLog('log', `🏷️ [v${packageJson.version}] Remote official tags (${lang}) updated: ${Object.keys(this.tags[lang] || {}).length} users`);
      } else {
        throw new Error(`Invalid remote official tags format for ${lang}`);
      }

    } catch (error) {
      devLog('warn', `🏷️ [v${packageJson.version}] Failed to fetch remote official tags for ${lang}:`, error);
      // 保持当前标签不变（本地存储的或默认的）
    }
  }

  // 保存标签到本地存储
  private saveTagsToLocalStorage(tags: OfficialTagsConfig, lang: 'zh' | 'en'): void {
    try {
      const storageKey = `${this.localStorageKeyPrefix}-${lang}`;
      const dataToStore = {
        tags,
        timestamp: Date.now(),
        version: packageJson.version,
        language: lang
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      devLog('log', `🏷️ [v${packageJson.version}] Official tags (${lang}) saved to localStorage`);
    } catch (error) {
      devLog('error', `🏷️ [v${packageJson.version}] Failed to save official tags (${lang}) to localStorage:`, error);
    }
  }

  // 获取指定用户的官方标签 - 支持语言参数
  public getUserTags(username: string, lang?: 'zh' | 'en'): string[] {
    if (!this.isInitialized) {
      return [];
    }

    // 如果没有指定语言，使用当前语言
    const useLang = lang || this.currentLang as 'zh' | 'en';

    // 如果指定语言的标签未加载，尝试使用另一种语言
    if (!this.tags[useLang]) {
      const fallbackLang = useLang === 'zh' ? 'en' : 'zh';
      if (this.tags[fallbackLang]) {
        devLog('log', `🏷️ [v${packageJson.version}] Using fallback language ${fallbackLang} for user ${username}`);
        return this.getUserTagsFromLanguage(username, fallbackLang);
      }
      return [];
    }

    return this.getUserTagsFromLanguage(username, useLang);
  }

  // 从特定语言获取用户标签
  private getUserTagsFromLanguage(username: string, lang: 'zh' | 'en'): string[] {
    const tags = this.tags[lang] || this.defaultTags;

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

    return [];
  }

  // 更新当前语言
  public async updateLanguage(lang: 'zh' | 'en'): Promise<void> {
    if (lang === this.currentLang) return;

    this.currentLang = lang;

    // 如果当前语言的标签未加载，尝试加载
    if (!this.tagsFetched[lang]) {
      // 先尝试从缓存加载
      this.loadTagsFromLocalStorage(lang);
    }

    devLog('log', `🏷️ [v${packageJson.version}] Language updated to: ${lang}`);

    // 如果当前语言的标签未加载，尝试加载
    if (!this.tagsFetched[lang]) {
      await this.fetchAndUpdateTags(lang);
    }
  }

  // 获取所有官方标签配置 - 支持语言参数
  public getAllTags(lang?: 'zh' | 'en'): OfficialTagsConfig {
    if (!this.isInitialized) {
      return {};
    }

    // 如果没有指定语言，使用当前语言
    const useLang = lang || this.currentLang as 'zh' | 'en';

    // 如果指定语言的标签未加载，尝试使用另一种语言
    if (!this.tags[useLang]) {
      const fallbackLang = useLang === 'zh' ? 'en' : 'zh';
      if (this.tags[fallbackLang]) {
        return { ...(this.tags[fallbackLang] || this.defaultTags) };
      }
      return {};
    }

    return { ...(this.tags[useLang] || this.defaultTags) }; // 返回副本
  }

  // 检查用户是否有官方标签 - 支持语言参数
  public hasUserTags(username: string, lang?: 'zh' | 'en'): boolean {
    return this.getUserTags(username, lang).length > 0;
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
    await this.getCurrentLanguage(); // 确保语言是最新的

    const stats = {
      currentLanguage: this.currentLang,
      languages: {} as Record<string, any>,
      isInitialized: this.isInitialized,
      cacheStatus: nacosCacheManager.getStats(),
      version: packageJson.version
    };

    // 为每种语言添加统计信息
    for (const lang of ['zh', 'en'] as const) {
      const tags = this.tags[lang] || this.defaultTags;
      const totalUsers = Object.keys(tags).length;
      const totalTags = Object.values(tags).reduce((sum, userTags) => sum + userTags.length, 0);
      const avgTagsPerUser = totalUsers > 0 ? (totalTags / totalUsers).toFixed(2) : '0';

      stats.languages[lang] = {
        totalUsers,
        totalTags,
        avgTagsPerUser,
        tagsFetched: this.tagsFetched[lang],
        sampleUsers: Object.keys(tags).slice(0, 3) // 显示前3个用户作为示例
      };
    }

    return stats;
  }

  // 重置标签缓存（用于强制重新获取）
  public resetCache(lang?: 'zh' | 'en'): void {
    if (lang) {
      // 重置 NacosCacheManager 缓存
      const dataId = lang === 'en' ? 'xhunt_built_in_tag_en' : 'xhunt_built_in_tag';
      nacosCacheManager.invalidate(dataId);

      // 重置特定语言的缓存
      this.tags[lang] = null;
      this.tagsFetched[lang] = false;
      localStorage.removeItem(`${this.localStorageKeyPrefix}-${lang}`);
      devLog('log', `🏷️ [v${packageJson.version}] Official tags cache for ${lang} reset`);
    } else {
      // 重置所有语言的缓存
      nacosCacheManager.invalidate('xhunt_built_in_tag');
      nacosCacheManager.invalidate('xhunt_built_in_tag_en');

      this.tags.zh = null;
      this.tags.en = null;
      this.tagsFetched.zh = false;
      this.tagsFetched.en = false;
      localStorage.removeItem(`${this.localStorageKeyPrefix}-zh`);
      localStorage.removeItem(`${this.localStorageKeyPrefix}-en`);
      devLog('log', `🏷️ [v${packageJson.version}] All official tags caches reset`);
    }
  }

  // 清理方法
  public cleanup(): void {
    this.isInitialized = false;
    devLog('log', `🏷️ [v${packageJson.version}] OfficialTagsManager cleaned up`);
  }
}

// 创建全局实例
// @ts-ignore
export const officialTagsManager = new OfficialTagsManager();

// @ts-ignore
export default OfficialTagsManager;
