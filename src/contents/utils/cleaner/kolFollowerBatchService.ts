import {
  fetchKolFollowerCountsBatch,
  type KolFollowerCountsItem,
} from '~contents/services/api';
import {
  kolFollowerCacheManager,
  type SetExemptItem,
} from './kolFollowerCacheManager';
import { cleanerRuleManager } from './ruleManager';

type ExemptionCallback = (isExempt: boolean) => void;

class KolFollowerBatchService {
  private pendingQueue: Map<string, ExemptionCallback[]> = new Map();
  private inFlightCallbacks: Map<string, ExemptionCallback[]> = new Map();
  private timer: NodeJS.Timeout | number | null = null;
  private readonly WINDOW_MS = 300;
  private readonly MAX_BATCH_SIZE = 50;

  /**
   * 提交待复核作者 Handle
   * 注意：仅当该推文在原规则下已被判定为违规、且无白名单与XHunt排名保护时才调用此方法！
   */
  public checkExemption(handle: string, callback: ExemptionCallback): void {
    if (!handle) {
      callback(false);
      return;
    }

    // 0. 特性未开启时直接放行检查流程，不入队也不发网络请求
    const config = cleanerRuleManager.getKolFollowerConfig();
    if (!config.enabled) {
      callback(false);
      return;
    }

    const cleanHandle = handle.toLowerCase().replace(/^@/, '');

    // 1. 若已在正向缓存中，秒级放行
    if (kolFollowerCacheManager.isSyncExempt(cleanHandle)) {
      callback(true);
      return;
    }

    // 2. 若已在负向缓存中，秒级拒绝（避免高频反复请求）
    if (kolFollowerCacheManager.isSyncNegative(cleanHandle)) {
      callback(false);
      return;
    }

    // 3. 若该账号正在请求中（in-flight），直接挂载回调，请求完成后统一通知，避免发起重复请求
    const inFlightList = this.inFlightCallbacks.get(cleanHandle);
    if (inFlightList) {
      inFlightList.push(callback);
      return;
    }

    // 4. 加入待复核批处理队列
    const existing = this.pendingQueue.get(cleanHandle) || [];
    existing.push(callback);
    this.pendingQueue.set(cleanHandle, existing);

    // 5. 启动微批次窗口定时器
    if (this.timer === null) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.processBatch();
      }, this.WINDOW_MS);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.pendingQueue.size === 0) return;

    // 挑选出未在正在请求中的 handles，并在建批前复查一次缓存（覆盖预加载刚就绪或上一批刚写入的场景）
    const batchHandles: string[] = [];

    for (const [handle, cbs] of Array.from(this.pendingQueue.entries())) {
      if (kolFollowerCacheManager.isSyncExempt(handle)) {
        this.pendingQueue.delete(handle);
        cbs.forEach((cb) => {
          try {
            cb(true);
          } catch {}
        });
        continue;
      }

      if (kolFollowerCacheManager.isSyncNegative(handle)) {
        this.pendingQueue.delete(handle);
        cbs.forEach((cb) => {
          try {
            cb(false);
          } catch {}
        });
        continue;
      }

      if (!this.inFlightCallbacks.has(handle)) {
        batchHandles.push(handle);
        if (batchHandles.length >= this.MAX_BATCH_SIZE) {
          break;
        }
      }
    }

    if (batchHandles.length === 0) return;

    // 转移至进行中回调集合
    for (const handle of batchHandles) {
      const cbs = this.pendingQueue.get(handle) || [];
      this.inFlightCallbacks.set(handle, cbs);
      this.pendingQueue.delete(handle);
    }

    // 统一异常降级通知：保持拦截，绝不写入任何负向缓存
    const notifyBatchFailure = () => {
      for (const handle of batchHandles) {
        const cbs = this.inFlightCallbacks.get(handle) || [];
        cbs.forEach((cb) => {
          try {
            cb(false);
          } catch {}
        });
      }
    };

    try {
      const response = await fetchKolFollowerCountsBatch(batchHandles);

      // 核心校验：响应失败、状态异常或无数据结构时立即走降级，严禁污染缓存
      if (
        !response ||
        (response.code !== 200 && response.code !== 0) ||
        !response.data ||
        !Array.isArray(response.data.items)
      ) {
        notifyBatchFailure();
        return;
      }

      const items = response.data.items;
      const returnedMap = new Map<string, KolFollowerCountsItem>();
      for (const item of items) {
        if (item && item.username) {
          returnedMap.set(item.username.toLowerCase().replace(/^@/, ''), item);
        }
      }

      const config = cleanerRuleManager.getKolFollowerConfig();
      const recordsToCache: SetExemptItem[] = [];

      for (const handle of batchHandles) {
        const item = returnedMap.get(handle);
        const cbs = this.inFlightCallbacks.get(handle) || [];

        // 若接口成功返回但未包含该账号数据，保持拦截，不记录负向缓存
        if (!item) {
          cbs.forEach((cb) => {
            try {
              cb(false);
            } catch {}
          });
          continue;
        }

        const isQualified = cleanerRuleManager.isKolFollowerQualified(item.counts);

        // 仅在拿到有效判定数据时记录正向或负向缓存
        const ttlHours = isQualified
          ? config.cacheTtlHours ?? 12
          : config.negativeCacheHours ?? 1;

        recordsToCache.push({
          handle,
          isExempt: isQualified,
          counts: item.counts,
          ttlHours,
        });

        // 触发所有等待回调
        cbs.forEach((cb) => {
          try {
            cb(isQualified);
          } catch {}
        });
      }

      // 批量落盘，一次性写入 storage
      if (recordsToCache.length > 0) {
        void kolFollowerCacheManager.setExemptBatch(recordsToCache);
      }
    } catch {
      // 兜底网络/代码未知异常
      notifyBatchFailure();
    } finally {
      // 解除 in-flight 标记
      for (const handle of batchHandles) {
        this.inFlightCallbacks.delete(handle);
      }

      // 若队列中还有未处理项，继续触发下一次批处理
      if (this.pendingQueue.size > 0 && this.timer === null) {
        this.timer = setTimeout(() => {
          this.timer = null;
          this.processBatch();
        }, 50);
      }
    }
  }

  /**
   * 清除所有正在排队的请求及进行中标记
   */
  public clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingQueue.clear();
    this.inFlightCallbacks.clear();
  }
}

export const kolFollowerBatchService = new KolFollowerBatchService();
