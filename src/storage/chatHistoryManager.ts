import { localStorageInstance } from './index';
import { ChatHistory, ChatMessage } from '~/types';

const CHAT_HISTORY_KEY = 'ai_chat_history';
const MAX_KOL_CHATS = 3; // 最多存储3个KOL的聊天记录
const MAX_MESSAGES_PER_KOL = 20; // 每个KOL最多存储20条消息
const MAX_HISTORY_FOR_API = 5; // 发送给API的最近消息数量

export class ChatHistoryManager {
  private static instance: ChatHistoryManager;
  private histories: Map<string, ChatHistory> = new Map();

  private constructor() {}

  static getInstance(): ChatHistoryManager {
    if (!ChatHistoryManager.instance) {
      ChatHistoryManager.instance = new ChatHistoryManager();
    }
    return ChatHistoryManager.instance;
  }

  async init(): Promise<void> {
    try {
      const stored = await localStorageInstance.get(CHAT_HISTORY_KEY);
      if (stored && Array.isArray(stored)) {
        stored.forEach((item: ChatHistory) => {
          this.histories.set(item.handle, item);
        });
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  async addMessage(handle: string, message: ChatMessage): Promise<void> {
    const history = this.histories.get(handle) || {
      handle,
      messages: [],
      lastUpdated: Date.now(),
    };

    // 添加时间戳
    const messageWithTimestamp = {
      ...message,
      timestamp: Date.now(),
    };

    history.messages.push(messageWithTimestamp);
    history.lastUpdated = Date.now();

    // 限制消息数量
    if (history.messages.length > MAX_MESSAGES_PER_KOL) {
      history.messages = history.messages.slice(-MAX_MESSAGES_PER_KOL);
    }

    this.histories.set(handle, history);

    // 限制KOL数量
    if (this.histories.size > MAX_KOL_CHATS) {
      const sortedEntries = Array.from(this.histories.entries()).sort(
        (a, b) => b[1].lastUpdated - a[1].lastUpdated
      );

      // 保留最新的MAX_KOL_CHATS个
      const entriesToKeep = sortedEntries.slice(0, MAX_KOL_CHATS);
      this.histories.clear();
      entriesToKeep.forEach(([key, value]) => {
        this.histories.set(key, value);
      });
    }

    await this.saveToStorage();
  }

  getHistory(handle: string): ChatMessage[] {
    return this.histories.get(handle)?.messages || [];
  }

  getRecentHistoryForAPI(handle: string): ChatMessage[] {
    const history = this.getHistory(handle);
    return history.slice(-MAX_HISTORY_FOR_API);
  }

  async clearHistory(handle: string): Promise<void> {
    this.histories.delete(handle);
    await this.saveToStorage();
  }

  async clearAllHistory(): Promise<void> {
    this.histories.clear();
    await this.saveToStorage();
  }

  private async saveToStorage(): Promise<void> {
    try {
      const historiesArray = Array.from(this.histories.values());
      await localStorageInstance.set(CHAT_HISTORY_KEY, historiesArray);
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  getStats(): { totalKols: number; totalMessages: number } {
    let totalMessages = 0;
    this.histories.forEach((history) => {
      totalMessages += history.messages.length;
    });

    return {
      totalKols: this.histories.size,
      totalMessages,
    };
  }
}

export const chatHistoryManager = ChatHistoryManager.getInstance();
