import { localStorageInstance } from '~storage/index';

export interface KolExemptCacheRecord {
  handle: string;
  isExempt: boolean;
  expireAt: number;
  counts?: Record<string, number> | null;
}

export interface SetExemptItem {
  handle: string;
  isExempt: boolean;
  counts?: Record<string, number> | null;
  ttlHours?: number;
}

const STORAGE_KEY = '@xhunt/cleaner-kol-exempt-cache';
const DEFAULT_POSITIVE_TTL_HOURS = 12; // 0.5 天误杀缓存
const DEFAULT_NEGATIVE_TTL_HOURS = 1; // 1 小时负向缓存
const MAX_CACHE_SIZE = 1000;

class KolFollowerCacheManager {
  private memoryCache: Map<string, KolExemptCacheRecord> = new Map();
  private isInitialized: boolean = false;
  private pendingInit: Promise<void> | null = null;
  private persistPromise: Promise<void> | null = null;
  private pendingPersist: boolean = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.pendingInit) return this.pendingInit;

    this.pendingInit = (async () => {
      try {
        const stored = (await localStorageInstance.get(STORAGE_KEY)) as
          | Record<string, KolExemptCacheRecord>
          | null
          | undefined;
        const now = Date.now();
        if (stored && typeof stored === 'object') {
          const validRecords: Record<string, KolExemptCacheRecord> = {};
          let hasExpired = false;

          for (const [key, item] of Object.entries(stored)) {
            const record = item as KolExemptCacheRecord;
            if (
              record &&
              typeof record.expireAt === 'number' &&
              record.expireAt > now
            ) {
              const cleanHandle = (record.handle || key)
                .toLowerCase()
                .replace(/^@/, '');
              this.memoryCache.set(cleanHandle, {
                ...record,
                handle: cleanHandle,
              });
              validRecords[cleanHandle] = record;
            } else {
              hasExpired = true;
            }
          }

          // 如果存在过期数据，清理持久化存储
          if (hasExpired) {
            void localStorageInstance.set(STORAGE_KEY, validRecords as any);
          }
        }
      } catch {
        // 容错：降级仅使用内存
      } finally {
        this.isInitialized = true;
        this.pendingInit = null;
      }
    })();

    return this.pendingInit;
  }

  /**
   * 同步快速检查是否命中“误杀放行”白名单缓存
   */
  public isSyncExempt(handle: string): boolean {
    if (!handle) return false;
    const cleanHandle = handle.toLowerCase().replace(/^@/, '');
    const record = this.memoryCache.get(cleanHandle);
    if (!record) return false;

    if (Date.now() > record.expireAt) {
      this.memoryCache.delete(cleanHandle);
      return false;
    }

    return record.isExempt === true;
  }

  /**
   * 同步检查是否处于负向缓存中（近期已反查确认无KOL关注，避免短时间内重复查）
   */
  public isSyncNegative(handle: string): boolean {
    if (!handle) return false;
    const cleanHandle = handle.toLowerCase().replace(/^@/, '');
    const record = this.memoryCache.get(cleanHandle);
    if (!record) return false;

    if (Date.now() > record.expireAt) {
      this.memoryCache.delete(cleanHandle);
      return false;
    }

    return record.isExempt === false;
  }

  /**
   * 写入单条免除/负向缓存
   */
  public async setExempt(
    handle: string,
    isExempt: boolean,
    counts?: Record<string, number> | null,
    ttlHours?: number
  ): Promise<void> {
    return this.setExemptBatch([{ handle, isExempt, counts, ttlHours }]);
  }

  /**
   * 批量写入免除/负向缓存，合并落盘操作彻底避免并发写盘
   */
  public async setExemptBatch(records: SetExemptItem[]): Promise<void> {
    if (!records || records.length === 0) return;

    const now = Date.now();
    for (const item of records) {
      if (!item.handle) continue;
      const cleanHandle = item.handle.toLowerCase().replace(/^@/, '');
      const hours =
        item.ttlHours ??
        (item.isExempt ? DEFAULT_POSITIVE_TTL_HOURS : DEFAULT_NEGATIVE_TTL_HOURS);
      const expireAt = now + Math.max(0.1, hours) * 60 * 60 * 1000;

      this.memoryCache.set(cleanHandle, {
        handle: cleanHandle,
        isExempt: item.isExempt,
        expireAt,
        counts: item.counts,
      });
    }

    await this.persistToStorage();
  }

  /**
   * 异步将内存有效记录合并落盘，带并发防抖与容量上限保护
   */
  private async persistToStorage(): Promise<void> {
    if (this.persistPromise) {
      this.pendingPersist = true;
      return this.persistPromise;
    }

    this.persistPromise = (async () => {
      try {
        const now = Date.now();
        const validEntries: Array<[string, KolExemptCacheRecord]> = [];

        for (const [key, record] of this.memoryCache.entries()) {
          if (record.expireAt > now) {
            validEntries.push([key, record]);
          } else {
            this.memoryCache.delete(key);
          }
        }

        // 超出上限按过期时间保留最晚过期的记录
        if (validEntries.length > MAX_CACHE_SIZE) {
          validEntries.sort((a, b) => b[1].expireAt - a[1].expireAt);
          validEntries.length = MAX_CACHE_SIZE;
          this.memoryCache.clear();
          for (const [k, r] of validEntries) {
            this.memoryCache.set(k, r);
          }
        }

        const storageObj: Record<string, KolExemptCacheRecord> = {};
        for (const [k, r] of validEntries) {
          storageObj[k] = r;
        }

        await localStorageInstance.set(STORAGE_KEY, storageObj as any);
      } catch {
        // 存储异常降级（内存缓存仍可用）
      } finally {
        this.persistPromise = null;
        if (this.pendingPersist) {
          this.pendingPersist = false;
          void this.persistToStorage();
        }
      }
    })();

    return this.persistPromise;
  }

  /**
   * 清理特定账号的缓存
   */
  public remove(handle: string): void {
    if (!handle) return;
    const cleanHandle = handle.toLowerCase().replace(/^@/, '');
    this.memoryCache.delete(cleanHandle);
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.memoryCache.clear();
    try {
      void localStorageInstance.set(STORAGE_KEY, {} as any);
    } catch {}
  }
}

export const kolFollowerCacheManager = new KolFollowerCacheManager();
