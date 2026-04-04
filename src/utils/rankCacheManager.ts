// Rank cache manager - Extracted from useAvatarRanks.ts
import packageJson from '../../package.json';
import { localStorageInstance } from '~storage/index.ts';

// Constants
const MAX_CACHE_SIZE = 800;
const CACHE_EXPIRATION = 15 * 60 * 60 * 1000; // 15小时
const RANK_CACHE_KEY_OLD = '@xhunt/rank-cache';
const RANK_CACHE_KEY = '@xhunt/rank-cache-new';

const buildCacheKey = (namespace: RankCacheNamespace): string => {
  // influence 保持原 key，确保不影响原来的缓存
  if (namespace === 'influence') return RANK_CACHE_KEY;
  return `${RANK_CACHE_KEY}-${namespace}`;
};
const BATCH_OPERATION_DELAY = 100; // Delay for batch operations

// Cache management
export interface RankCacheEntry {
  kolRank: number;
  timestamp: number;
  lastAccessed: number;
}

interface RankCache {
  [key: string]: RankCacheEntry;
}

// Development environment log function
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

export type RankCacheNamespace = 'influence' | 'composite';

export class RankCacheManager {
  private static cleanupTimer: NodeJS.Timeout | null = null;

  // Start cleanup timer
  static startCleanupTimer(interval = 10 * 60 * 1000) {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.performScheduledCleanup('influence');
      this.performScheduledCleanup('composite');
    }, interval);

    devLog(
      'log',
      `📊 [v${packageJson.version}] Cache cleanup timer started (${
        interval / 1000
      }s interval)`
    );
  }

  // Stop cleanup timer
  static stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      devLog('log', `📊 [v${packageJson.version}] Cache cleanup timer stopped`);
    }
  }

  // Perform scheduled cleanup
  private static async performScheduledCleanup(namespace: RankCacheNamespace) {
    try {
      const cache = await this.getCache(namespace);
      const now = Date.now();
      let cleanedCount = 0;

      // Clean expired data
      for (const [username, entry] of Object.entries(cache)) {
        if (now - entry.timestamp > CACHE_EXPIRATION) {
          delete cache[username];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        await this.setCache(cache, namespace);
        devLog(
          'log',
          `📊 [v${packageJson.version}] Scheduled cleanup removed ${cleanedCount} expired entries`
        );
      }
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Scheduled cleanup failed:`,
        error
      );
    }
  }

  // Get cache from local storage (encrypted wrapper)
  static async getCache(namespace: RankCacheNamespace): Promise<RankCache> {
    try {
      const cacheKey = buildCacheKey(namespace);
      const cache = (await localStorageInstance.get(
        cacheKey
      )) as RankCache | null;
      return cache || {};
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to get cache:`,
        error
      );
      return {};
    }
  }

  // Set cache to local storage (encrypted wrapper)
  static async setCache(cache: RankCache, namespace: RankCacheNamespace) {
    try {
      const now = Date.now();

      // Check cache size limit
      if (Object.keys(cache).length > MAX_CACHE_SIZE) {
        devLog(
          'log',
          `📊 [v${packageJson.version}] Cache size limit exceeded (${
            Object.keys(cache).length
          }/${MAX_CACHE_SIZE}), performing LRU cleanup...`
        );

        const entries = Object.entries(cache);

        // LRU cleanup: sort by last accessed time, keep most recently accessed
        const sortedEntries = entries.sort(
          ([, a], [, b]) => b.lastAccessed - a.lastAccessed
        );
        const entriesToKeep = sortedEntries.slice(
          0,
          Math.floor(MAX_CACHE_SIZE * 0.8)
        ); // keep 80%

        cache = Object.fromEntries(entriesToKeep);
        devLog(
          'log',
          `📊 [v${packageJson.version}] LRU cleanup completed, kept ${entriesToKeep.length} entries`
        );
      }

      // Check storage size
      const cacheString = JSON.stringify(cache);
      if (cacheString.length > 1024 * 1024) {
        // 1MB
        devLog(
          'warn',
          `📊 [v${packageJson.version}] Cache size too large (${cacheString.length} bytes), performing aggressive cleanup...`
        );

        // Aggressive cleanup: only keep recent data
        const entries = Object.entries(cache);
        const recentEntries = entries
          .filter(([, entry]) => now - entry.timestamp < 24 * 60 * 60 * 1000) // only keep 24h data
          .sort(([, a], [, b]) => b.lastAccessed - a.lastAccessed)
          .slice(0, Math.floor(MAX_CACHE_SIZE * 0.5)); // only keep 50%

        cache = Object.fromEntries(recentEntries);
        devLog(
          'log',
          `📊 [v${packageJson.version}] Aggressive cleanup completed, kept ${recentEntries.length} entries`
        );
      }

      await localStorageInstance.set(buildCacheKey(namespace), cache);
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to set cache:`,
        error
      );
      // If storage fails, try to clear cache
      try {
        await localStorageInstance.remove(RANK_CACHE_KEY);
        devLog(
          'warn',
          `📊 [v${packageJson.version}] Cache cleared due to storage failure`
        );
      } catch (clearError) {
        devLog(
          'error',
          `📊 [v${packageJson.version}] Failed to clear cache:`,
          clearError
        );
      }
    }
  }

  // Get a rank from cache
  static async get(
    username: string,
    namespace: RankCacheNamespace
  ): Promise<RankCacheEntry | null> {
    try {
      const cache = await this.getCache(namespace);
      const entry = cache[username.toLowerCase()];

      if (!entry) return null;

      const now = Date.now();
      if (now - entry.timestamp > CACHE_EXPIRATION) {
        delete cache[username.toLowerCase()];
        await this.setCache(cache, namespace);
        return null;
      }

      // Update last accessed time
      entry.lastAccessed = now;
      cache[username.toLowerCase()] = entry;
      await this.setCache(cache, namespace);

      return entry;
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to get cache entry:`,
        error
      );
      return null;
    }
  }

  // Set a rank in cache
  static async set(
    username: string,
    rank: number,
    namespace: RankCacheNamespace
  ) {
    try {
      let cache = await this.getCache(namespace);
      const now = Date.now();

      cache[username.toLowerCase()] = {
        kolRank: rank,
        timestamp: now,
        lastAccessed: now,
      };

      await this.setCache(cache, namespace);
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to set cache entry:`,
        error
      );
      // Create minimal cache
      const minimalCache = {
        [username.toLowerCase()]: {
          kolRank: rank,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
        },
      };

      try {
        await localStorageInstance.set(buildCacheKey(namespace), minimalCache);
      } catch (fallbackError) {
        devLog(
          'error',
          `📊 [v${packageJson.version}] Failed to create minimal cache:`,
          fallbackError
        );
      }
    }
  }

  // Set multiple ranks in cache at once (batch operation)
  static async setBatch(
    usernameRankMap: Record<string, number>,
    namespace: RankCacheNamespace
  ): Promise<void> {
    try {
      if (Object.keys(usernameRankMap).length === 0) return;

      let cache = await this.getCache(namespace);
      const now = Date.now();

      // Update all entries in one operation
      Object.entries(usernameRankMap).forEach(([username, rank]) => {
        cache[username.toLowerCase()] = {
          kolRank: rank,
          timestamp: now,
          lastAccessed: now,
        };
      });

      await this.setCache(cache, namespace);
      devLog(
        'log',
        `📊 [v${packageJson.version}] Batch updated ${
          Object.keys(usernameRankMap).length
        } rank entries`
      );
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to batch set cache entries:`,
        error
      );

      // If batch operation fails, try to save at least some entries
      try {
        const minimalCache: RankCache = {};
        const entries = Object.entries(usernameRankMap).slice(0, 10); // Take first 10 entries

        entries.forEach(([username, rank]) => {
          minimalCache[username.toLowerCase()] = {
            kolRank: rank,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
          };
        });

        await localStorageInstance.set(buildCacheKey(namespace), minimalCache);
        devLog(
          'warn',
          `📊 [v${packageJson.version}] Created minimal cache with ${entries.length} entries`
        );
      } catch (fallbackError) {
        devLog(
          'error',
          `📊 [v${packageJson.version}] Failed to create minimal cache:`,
          fallbackError
        );
      }
    }
  }

  // Get multiple ranks from cache at once (batch operation)
  static async getBatch(
    usernames: string[],
    namespace: RankCacheNamespace
  ): Promise<Record<string, RankCacheEntry>> {
    try {
      if (usernames.length === 0) return {};

      const cache = await this.getCache(namespace);
      const now = Date.now();
      const result: Record<string, RankCacheEntry> = {};
      const cacheUpdates: Record<string, RankCacheEntry> = {};
      let needsUpdate = false;

      usernames.forEach((username) => {
        const entry = cache[username.toLowerCase()];

        if (!entry) return;

        // Check expiration
        if (now - entry.timestamp > CACHE_EXPIRATION) {
          delete cache[username.toLowerCase()];
          needsUpdate = true;
          return;
        }

        // Update last accessed time
        if (now - entry.lastAccessed > 60000) {
          // Only update if last access was more than a minute ago
          entry.lastAccessed = now;
          cacheUpdates[username.toLowerCase()] = entry;
          needsUpdate = true;
        }

        result[username.toLowerCase()] = entry;
      });

      // Update cache if needed (with delay to avoid excessive writes)
      if (needsUpdate) {
        setTimeout(async () => {
          try {
            // Only update the cache if there are actual updates
            if (Object.keys(cacheUpdates).length > 0) {
              const updatedCache = await this.getCache(namespace);

              // Apply all updates
              Object.entries(cacheUpdates).forEach(([username, entry]) => {
                updatedCache[username] = entry;
              });

              await this.setCache(updatedCache, namespace);
              devLog(
                'log',
                `📊 [v${packageJson.version}] Updated lastAccessed for ${
                  Object.keys(cacheUpdates).length
                } entries`
              );
            }
          } catch (error) {
            devLog(
              'error',
              `📊 [v${packageJson.version}] Failed to update cache after batch get:`,
              error
            );
          }
        }, BATCH_OPERATION_DELAY);
      }

      return result;
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to batch get cache entries:`,
        error
      );
      return {};
    }
  }

  // Get cache statistics
  static async getStats(namespace: RankCacheNamespace) {
    try {
      const cache = await this.getCache(namespace);
      const now = Date.now();

      const stats = {
        totalEntries: Object.keys(cache).length,
        expiredEntries: 0,
        recentEntries: 0,
        cacheSize: JSON.stringify(cache).length,
        cleanupInterval: 10 * 60 * 1000, // 10 minutes
      };

      Object.values(cache).forEach((entry) => {
        if (now - entry.timestamp > CACHE_EXPIRATION) {
          stats.expiredEntries++;
        }
        if (now - entry.lastAccessed < 60 * 60 * 1000) {
          // 1 hour
          stats.recentEntries++;
        }
      });

      return stats;
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to get cache stats:`,
        error
      );
      return null;
    }
  }

  // Manual cleanup
  static async manualCleanup(namespace: RankCacheNamespace) {
    await this.performScheduledCleanup(namespace);
  }

  // Force clear all cache data
  static async forceClearAll(): Promise<void> {
    try {
      // Clear storage
      // influence: 清理新旧缓存
      await localStorageInstance.remove(buildCacheKey('influence'));
      await localStorageInstance.remove(RANK_CACHE_KEY_OLD);
      // composite: 清理独立命名空间缓存
      await localStorageInstance.remove(buildCacheKey('composite'));

      devLog(
        'log',
        `📊 [v${packageJson.version}] Force cleared all rank cache data`
      );
    } catch (error) {
      devLog(
        'error',
        `📊 [v${packageJson.version}] Failed to force clear rank cache:`,
        error
      );
    }
  }
}

// Initialize cleanup timer when module is loaded
// RankCacheManager.startCleanupTimer();

// // Clean up on page unload (guard for non-window contexts)
// typeof window !== 'undefined' &&
//   window.addEventListener('beforeunload', () => {
//     RankCacheManager.stopCleanupTimer();
//   });
