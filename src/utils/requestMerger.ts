// 请求合并工具 - 将短时间内的多个请求合并为批量请求
import packageJson from '../../package.json';

// 开发环境日志函数
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// 批量请求配置
interface BatchRequestConfig<T, R> {
  mergeWindowMs: number;        // 合并窗口时间（毫秒）
  maxBatchSize: number;         // 单次最大请求数量
  requestKey: string;           // 请求类型标识
  batchFetcher: (items: T[]) => Promise<R[]>; // 批量请求函数
}

// 批量请求状态
interface BatchRequestState<T, R> {
  items: Set<T>;
  promises: Map<T, Array<{ resolve: (value: R | undefined) => void; reject: (reason?: any) => void }>>;
  timer: NodeJS.Timeout | null;
}

// 全局批量请求管理器
class RequestMerger {
  private static batchRequests: Record<string, BatchRequestState<any, any>> = {};

  /**
   * 创建批量请求函数
   * @param config 批量请求配置
   * @returns 合并后的请求函数
   */
  static createBatchRequest<T, R>(config: BatchRequestConfig<T, R>) {
    const { mergeWindowMs, maxBatchSize, requestKey, batchFetcher } = config;

    return async (items: T[]): Promise<Array<R | undefined>> => {
      if (!items.length) return [];

      // 初始化请求状态
      if (!this.batchRequests[requestKey]) {
        this.batchRequests[requestKey] = {
          items: new Set<T>(),
          promises: new Map<T, Array<{ resolve: (value: R | undefined) => void; reject: (reason?: any) => void }>>(),
          timer: null
        };
      }

      const batch = this.batchRequests[requestKey];

      // 将当前请求的项目添加到队列（Set自动去重）
      items.forEach(item => batch.items.add(item));

      // 为每个项目创建Promise，支持同一项目的多个请求
      const itemPromises = items.map(item => {
        return new Promise<R | undefined>((resolve, reject) => {
          if (!batch.promises.has(item)) {
            batch.promises.set(item, []);
          }
          batch.promises.get(item)!.push({ resolve, reject });
        });
      });

      // 如果已经有定时器在运行，清除它
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      // 设置新的定时器，在指定时间后执行批量请求
      batch.timer = setTimeout(async () => {
        await this.executeBatchRequest(requestKey, config);
      }, mergeWindowMs);

      // 等待所有项目的Promise完成，返回完整结果（包含undefined）
      try {
        const results = await Promise.all(itemPromises);
        return results;
      } catch (err) {
        devLog('error', `[v${packageJson.version}] Batch request failed for ${requestKey}:`, err);
        return items.map(() => undefined);
      }
    };
  }

  /**
   * 执行批量请求
   */
  private static async executeBatchRequest<T, R>(
    requestKey: string, 
    config: BatchRequestConfig<T, R>
  ): Promise<void> {
    const batch = this.batchRequests[requestKey];
    if (!batch) return;

    // 复制当前批次数据，避免race condition
    const allItems = Array.from(batch.items);
    const allPromises = new Map(batch.promises);

    // 清空当前批次
    batch.items.clear();
    batch.promises.clear();
    batch.timer = null;

    try {
      if (!allItems.length) {
        // 如果没有项目，解析所有Promise为undefined
        allPromises.forEach(promiseArray => {
          promiseArray.forEach(({ resolve }) => resolve(undefined));
        });
        return;
      }

      // 分批处理，避免单次请求过大
      const batches: T[][] = [];
      for (let i = 0; i < allItems.length; i += config.maxBatchSize) {
        batches.push(allItems.slice(i, i + config.maxBatchSize));
      }

      devLog('log', `[v${packageJson.version}] Executing ${batches.length} batch requests for ${requestKey}`);

      // 并行发起所有批次请求
      const batchPromises = batches.map(async (batchItems) => {
        try {
          const data = await config.batchFetcher(batchItems);
          return { items: batchItems, data: data || [] };
        } catch (err) {
          devLog('error', `[v${packageJson.version}] Failed to fetch batch for ${batchItems.length} items:`, err);
          return { items: batchItems, data: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // 合并所有批次的结果，保持顺序对应
      const resultData: Array<R | undefined> = new Array(allItems.length);
      batchResults.forEach(({ items: batchItems, data }) => {
        // 确保每个批次的结果按原始顺序添加
        batchItems.forEach((item, index) => {
          const itemIndex = allItems.indexOf(item);
          if (itemIndex !== -1) {
            resultData[itemIndex] = data[index] || undefined;
          }
        });
      });

      // 创建项目到结果数据的映射，保持一一对应关系
      const resultMap = new Map<T, R | undefined>();
      allItems.forEach((item, index) => {
        const result = resultData[index];
        resultMap.set(item, result); // 保留undefined，保持一一对应
      });

      // 解析所有Promise，支持同一项目的多个请求
      allPromises.forEach((promiseArray, item) => {
        const result = resultMap.get(item);
        promiseArray.forEach(({ resolve }) => resolve(result));
      });

    } catch (err) {
      devLog('error', `[v${packageJson.version}] Batch request failed for ${requestKey}:`, err);
      // 如果请求失败，拒绝所有Promise
      allPromises.forEach(promiseArray => {
        promiseArray.forEach(({ reject }) => reject(err));
      });
    }
  }

  /**
   * 获取统计信息
   */
  static getStats() {
    const stats: Record<string, any> = {};
    
    Object.keys(this.batchRequests).forEach(key => {
      const batch = this.batchRequests[key];
      stats[key] = {
        pendingItems: batch.items.size,
        pendingPromises: batch.promises.size,
        hasTimer: !!batch.timer
      };
    });

    return {
      activeRequests: Object.keys(this.batchRequests).length,
      details: stats,
      version: packageJson.version
    };
  }

  /**
   * 清理指定请求类型的状态
   */
  static cleanup(requestKey?: string) {
    if (requestKey) {
      const batch = this.batchRequests[requestKey];
      if (batch) {
        if (batch.timer) {
          clearTimeout(batch.timer);
        }
        delete this.batchRequests[requestKey];
      }
    } else {
      // 清理所有请求状态
      Object.values(this.batchRequests).forEach(batch => {
        if (batch.timer) {
          clearTimeout(batch.timer);
        }
      });
      this.batchRequests = {};
    }
  }
}

export default RequestMerger;