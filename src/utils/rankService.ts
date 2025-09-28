// 排名服务类 - 统一管理所有排名请求，包括缓存和请求合并
import packageJson from '../../package.json';
import { fetchTwitterRankBatchNew, convertNewRankDataToOldFormat } from '~contents/services/api';
import { RankCacheManager } from './rankCacheManager';
import RequestMerger from './requestMerger';

// 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// 排名数据接口
export interface RankData {
  username: string;
  kolRank: number;
}

// 排名请求结果接口
export interface RankRequestResult {
  [username: string]: number; // username -> kolRank
}

// 排名请求状态回调
export type RankStatusCallback = (loadingUsernames: Set<string>) => void;

class RankService {
  private statusCallbacks: Set<RankStatusCallback> = new Set();
  private batchRankFetcher: ((usernames: string[]) => Promise<RankData[]>) | null = null;
  private isInitialized: boolean = false;

  // 初始化排名服务
  public init(): void {
    if (this.isInitialized) {
      devLog('warn', `[v${packageJson.version}] RankService already initialized`);
      return;
    }

    try {
      // 创建批量排名请求函数
      // @ts-ignore
      this.batchRankFetcher = RequestMerger.createBatchRequest<string, RankData>({
        mergeWindowMs: 400,        // 600ms内的请求会被合并
        maxBatchSize: 55,          // 单次最大请求55个用户名
        requestKey: 'twitter-ranks',
        batchFetcher: this.fetchRanksFromAPI.bind(this)
      });

      this.isInitialized = true;
      devLog('log', `📊 [v${packageJson.version}] RankService initialized`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to initialize RankService:`, error);
    }
  }

  // 从API批量获取排名数据
  private async fetchRanksFromAPI(usernames: string[]): Promise<RankData[]> {
    try {
      devLog('log', `📊 [v${packageJson.version}] Fetching ranks from API for ${usernames.length} usernames`);

      const newData = await fetchTwitterRankBatchNew(usernames);
      if (!newData) {
        devLog('warn', `📊 [v${packageJson.version}] No data returned from API`);
        return [];
      }

      const oldFormatData = convertNewRankDataToOldFormat(newData, usernames);

      // 转换为 RankData 格式
      const rankData: RankData[] = [];
      oldFormatData.forEach((rank, index) => {
        const username = usernames[index];
        if (rank && rank.kolRank !== undefined) {
          rankData.push({
            username,
            kolRank: rank.kolRank
          });
        }
      });

      devLog('log', `📊 [v${packageJson.version}] Successfully fetched ${rankData.length} ranks from API`);
      return rankData;
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to fetch ranks from API:`, error);
      return [];
    }
  }

  // 获取单个用户排名
  public async getRank(username: string): Promise<number | null> {
    if (!this.isInitialized) {
      this.init();
    }

    try {
      // 先检查缓存
      const cachedEntry = await RankCacheManager.get(username);
      if (cachedEntry) {
        devLog('log', `📊 [v${packageJson.version}] Cache hit for ${username}: ${cachedEntry.kolRank}`);
        return cachedEntry.kolRank;
      }

      // 缓存未命中，通过批量请求获取
      const results = await this.getRanks([username]);
      return results[username] ?? null;
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to get rank for ${username}:`, error);
      return null;
    }
  }

  // 批量获取用户排名
  public async getRanks(usernames: string[]): Promise<RankRequestResult> {
    if (!this.isInitialized) {
      this.init();
    }

    if (!usernames.length) {
      return {};
    }

    try {
      // 通知状态回调：开始加载
      this.notifyStatusCallbacks(new Set(usernames));

      // 1. 批量检查缓存
      const cachedRanks = await RankCacheManager.getBatch(usernames);
      const result: RankRequestResult = {};
      const uncachedUsernames: string[] = [];

      // 2. 处理缓存结果
      usernames.forEach(username => {
        const cachedEntry = cachedRanks[username.toLowerCase()];
        if (cachedEntry) {
          result[username] = cachedEntry.kolRank;
        } else {
          uncachedUsernames.push(username);
        }
      });

      devLog('log', `📊 [v${packageJson.version}] Cache results: ${Object.keys(result).length} cached, ${uncachedUsernames.length} uncached`);

      // 3. 如果有未缓存的用户名，批量请求
      if (uncachedUsernames.length > 0 && this.batchRankFetcher) {
        try {
          const fetchedRanks = await this.batchRankFetcher(uncachedUsernames);

          // 4. 处理API返回的数据
          const fetchedRankMap: Record<string, number> = {};
          fetchedRanks.forEach(rankData => {
            if (rankData && rankData.kolRank !== undefined) {
              result[rankData.username] = rankData.kolRank;
              fetchedRankMap[rankData.username] = rankData.kolRank;
            }
          });

          // 5. 批量更新缓存
          if (Object.keys(fetchedRankMap).length > 0) {
            await RankCacheManager.setBatch(fetchedRankMap);
            devLog('log', `📊 [v${packageJson.version}] Updated cache with ${Object.keys(fetchedRankMap).length} new ranks`);
          }

        } catch (error) {
          devLog('error', `[v${packageJson.version}] Failed to fetch uncached ranks:`, error);
        }
      }

      // 通知状态回调：加载完成
      this.notifyStatusCallbacks(new Set());

      return result;
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to get ranks:`, error);
      // 通知状态回调：加载完成（即使失败）
      this.notifyStatusCallbacks(new Set());
      return {};
    }
  }

  // 添加状态变化回调
  public addStatusCallback(callback: RankStatusCallback): () => void {
    this.statusCallbacks.add(callback);

    // 返回移除回调的函数
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  // 通知所有状态回调
  private notifyStatusCallbacks(loadingUsernames: Set<string>): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(loadingUsernames);
      } catch (error) {
        devLog('error', `[v${packageJson.version}] Error in rank status callback:`, error);
      }
    });
  }

  // 预加载排名（用于预热缓存）
  public async preloadRanks(usernames: string[]): Promise<void> {
    try {
      await this.getRanks(usernames);
      devLog('log', `📊 [v${packageJson.version}] Preloaded ranks for ${usernames.length} usernames`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to preload ranks:`, error);
    }
  }

  // 获取统计信息
  public getStats() {
    return {
      isInitialized: this.isInitialized,
      statusCallbackCount: this.statusCallbacks.size,
      cacheStats: RankCacheManager.getStats(),
      requestMergerStats: RequestMerger.getStats(),
      version: packageJson.version
    };
  }

  // 清理方法
  public cleanup(): void {
    this.statusCallbacks.clear();
    this.batchRankFetcher = null;
    this.isInitialized = false;

    // 清理请求合并器
    RequestMerger.cleanup('twitter-ranks');

    devLog('log', `📊 [v${packageJson.version}] RankService cleaned up`);
  }
}

// 创建全局实例
export const rankService = new RankService();

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  rankService.cleanup();
});

export default RankService;
