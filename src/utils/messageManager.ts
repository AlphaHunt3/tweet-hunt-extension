// 消息管理器 - 统一管理全局消息通知
import packageJson from '../../package.json';
import { kbPrefix } from '~contents/services/api.ts';
import { localStorageInstance } from '~storage';
import { isUserUsingChinese } from '~contents/utils';
import { nacosCacheManager } from './nacosCacheManager';

// 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// 消息类型定义
export interface Message {
  title: string;
  content: string;
  created: string; // timestamp
}

// 消息状态类型
export interface MessageState {
  messages: Message[];
  hasUnread: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: number;
}

// 消息状态变化回调类型
export type MessageStateChangeCallback = (state: MessageState) => void;

class MessageManager {
  private messages: Message[] = [];
  private lastReadTimestamp: string = '0';
  private isLoading: boolean = true;
  private error: string | null = null;
  private readonly MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for messages
  private lastChecked: number = 0;
  private callbacks: Set<MessageStateChangeCallback> = new Set();
  private checkInterval: number | null = null;
  private currentLang: 'zh' | 'en' = 'zh';
  private isInitialized: boolean = false;
  private readonly STORAGE_KEY = '@xhunt/cached-messages';
  private readonly LAST_READ_KEY = '@xhunt/last-read-message';
  private readonly CHECK_INTERVAL_MS = 60000; // 1分钟检查一次

  // 初始化消息管理器
  public async init(): Promise<void> {
    if (this.isInitialized) {
      devLog('warn', `[v${packageJson.version}] MessageManager already initialized`);
      return;
    }

    try {
      devLog('log', `📨 [v${packageJson.version}] MessageManager initializing...`);

      // 1. 加载上次读取时间戳
      await this.loadLastReadTimestamp();
      
      // 1.5. 确定当前语言
      await this.determineLanguage();

      // 2. 从缓存加载消息
      this.loadCachedMessages();

      // 3. 立即获取最新消息
      await this.fetchMessages();

      // 4. 设置定时检查
      this.startPeriodicCheck();

      this.isInitialized = true;
      devLog('log', `📨 [v${packageJson.version}] MessageManager initialized with ${this.messages.length} messages`);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.isLoading = false;
      devLog('error', `[v${packageJson.version}] Failed to initialize MessageManager:`, error);
    }
  }

  // 确定当前语言
  private async determineLanguage(): Promise<void> {
    try {
      // 优先从存储中获取语言设置
      const lang = await localStorageInstance.get('@settings/language1');
      if (lang === 'en') {
        this.currentLang = 'en';
      } else if (lang === 'zh') {
        this.currentLang = 'zh';
      } else {
        // 如果没有明确设置，则根据浏览器语言判断
        this.currentLang = isUserUsingChinese() ? 'zh' : 'en';
      }
      devLog('log', `📨 [v${packageJson.version}] Current language set to: ${this.currentLang}`);
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to determine language, using default:`, error);
      this.currentLang = 'zh'; // 默认使用中文
    }
  }

  // 加载上次读取时间戳
  private async loadLastReadTimestamp(): Promise<void> {
    try {
      const timestamp = await localStorageInstance.get(this.LAST_READ_KEY);
      this.lastReadTimestamp = timestamp || '0';
      devLog('log', `📨 [v${packageJson.version}] Loaded last read timestamp: ${this.lastReadTimestamp}`);
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to load last read timestamp:`, error);
      this.lastReadTimestamp = '0';
    }
  }

  // 从缓存加载消息
  private loadCachedMessages(): void {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const parsedMessages = JSON.parse(cached);
        if (Array.isArray(parsedMessages)) {
          this.messages = parsedMessages;
          this.notifyStateChange();
          devLog('log', `📨 [v${packageJson.version}] Loaded ${parsedMessages.length} messages from cache`);
        }
      }
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to load cached messages:`, error);
    }
  }

  // 获取最新消息
  public async fetchMessages(): Promise<void> {
    if (!this.isInitialized && !this.isLoading) {
      await this.init();
      return;
    }

    try {
      this.isLoading = true;
      this.notifyStateChange();

      try {
        // 根据语言选择不同的 dataId
        const dataId = this.currentLang === 'en' ? 'xhunt_message_en' : 'xhunt_message';
        
        // 使用 NacosCacheManager 获取数据，设置5分钟缓存
        const data = await nacosCacheManager.fetchWithCache<Message[]>(dataId, this.MESSAGE_CACHE_TTL);

        // 排序消息（最新的在前）
        const sortedMessages = [...data].sort((a, b) => 
          parseInt(b.created) - parseInt(a.created)
        );
        
        this.messages = sortedMessages;
        this.lastChecked = Date.now();
        
        // 更新缓存
        this.updateCache(sortedMessages);
        
        devLog('log', `📨 [v${packageJson.version}] Fetched ${sortedMessages.length} messages`);
      } catch (fetchError) {
        this.error = fetchError instanceof Error ? fetchError.message : String(fetchError);
        devLog('error', `[v${packageJson.version}] Failed to fetch messages:`, fetchError);
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      devLog('error', `[v${packageJson.version}] Failed to fetch messages:`, error);
    } finally {
      this.isLoading = false;
      this.notifyStateChange();
    }
  }

  // 更新消息缓存
  private updateCache(messages: Message[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to update message cache:`, error);
    }
  }

  // 开始定期检查新消息
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = window.setInterval(() => {
      this.fetchMessages();
    }, this.CHECK_INTERVAL_MS);

    devLog('log', `📨 [v${packageJson.version}] Started periodic message check (${this.CHECK_INTERVAL_MS / 1000}s interval)`);
  }

  // 标记所有消息为已读
  public async markAllAsRead(): Promise<void> {
    try {
      const now = Date.now().toString();
      this.lastReadTimestamp = now;
      await localStorageInstance.set(this.LAST_READ_KEY, now);
      this.notifyStateChange();
      devLog('log', `📨 [v${packageJson.version}] Marked all messages as read`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to mark messages as read:`, error);
    }
  }

  // 获取当前消息状态
  public getState(): MessageState {
    const hasUnread = this.messages.some(
      message => parseInt(message.created) > parseInt(this.lastReadTimestamp)
    );

    return {
      messages: [...this.messages], // 返回副本
      hasUnread,
      isLoading: this.isLoading,
      error: this.error,
      lastChecked: this.lastChecked
    };
  }

  // 添加状态变化回调
  public addCallback(callback: MessageStateChangeCallback): () => void {
    this.callbacks.add(callback);
    
    // 立即通知当前状态
    callback(this.getState());
    
    // 返回移除回调的函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // 通知所有回调
  private notifyStateChange(): void {
    const state = this.getState();
    this.callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        devLog('error', `[v${packageJson.version}] Error in message state change callback:`, error);
      }
    });
  }

  // 强制刷新消息
  public async refresh(): Promise<void> {
    await this.fetchMessages();
  }
  
  // 更新语言设置
  public async updateLanguage(lang: 'zh' | 'en'): Promise<void> {
    if (this.currentLang === lang) return;
    
    const oldLang = this.currentLang;
    this.currentLang = lang;
    devLog('log', `📨 [v${packageJson.version}] Language updated to: ${lang}`);
    
    // Invalidate the cache for the old language to ensure we get fresh data next time
    const oldDataId = oldLang === 'en' ? 'xhunt_message_en' : 'xhunt_message';
    nacosCacheManager.invalidate(oldDataId);
    
    // 重新获取消息
    await this.fetchMessages();
  }

  // 获取统计信息
  public getStats() {
    return {
      totalMessages: this.messages.length,
      hasUnread: this.getState().hasUnread,
      lastChecked: this.lastChecked,
      timeSinceLastCheck: Date.now() - this.lastChecked,
      currentLanguage: this.currentLang,
      cacheStatus: nacosCacheManager.getStats(),
      isInitialized: this.isInitialized,
      callbackCount: this.callbacks.size,
      version: packageJson.version
    };
  }

  // 清理方法
  public cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.callbacks.clear();
    this.isInitialized = false;
    devLog('log', `📨 [v${packageJson.version}] MessageManager cleaned up`);
  }
}

// 创建全局实例
export const messageManager = new MessageManager();

export default MessageManager;