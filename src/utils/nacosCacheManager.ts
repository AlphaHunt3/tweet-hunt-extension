// Nacos Cache Manager - Efficient caching for Nacos configuration data
import packageJson from '../../package.json';
import { kbPrefix } from '~contents/services/api.ts';

// Constants
const DEFAULT_GROUP = 'DEFAULT_GROUP';

// Development environment log function
const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

// Cache entry interface
export interface NacosCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache configuration interface
export interface NacosCacheConfig {
  defaultTTL: number;        // Default time-to-live in milliseconds
  maxEntries: number;        // Maximum number of entries in the cache
  cleanupInterval: number;   // Interval for cleanup in milliseconds
  storagePrefix: string;     // Prefix for localStorage keys
}

/**
 * NacosCacheManager - A utility for caching Nacos configuration data
 *
 * Features:
 * - Configurable TTL (time-to-live) per data type
 * - In-memory and localStorage caching
 * - Automatic cache cleanup
 * - Deduplication of concurrent requests
 */
class NacosCacheManager {
  private config: NacosCacheConfig;
  private memoryCache: Map<string, NacosCacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cleanupTimer: number | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<NacosCacheConfig> = {}) {
    // Default configuration
    this.config = {
      defaultTTL: 5 * 60 * 1000,  // 5 minutes default TTL
      maxEntries: 50,             // Store up to 50 entries
      cleanupInterval: 10 * 60 * 1000, // Clean up every 10 minutes
      storagePrefix: 'xhunt-nacos-cache',
      ...config
    };
  }

  /**
   * Initialize the cache manager
   */
  public init(): void {
    if (this.isInitialized) {
      devLog('warn', `[v${packageJson.version}] NacosCacheManager already initialized`);
      return;
    }

    try {
      // Load cached data from localStorage
      this.loadFromStorage();

      // Start cleanup timer
      this.startCleanupTimer();

      this.isInitialized = true;
      devLog('log', `🗄️ [v${packageJson.version}] NacosCacheManager initialized`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to initialize NacosCacheManager:`, error);
    }
  }

  /**
   * Fetch data from Nacos with caching
   *
   * @param dataId - The Nacos dataId to fetch
   * @param ttl - Custom TTL in milliseconds (optional)
   * @returns The cached or freshly fetched data
   */
  public async fetchWithCache<T>(
    dataId: string,
    ttl?: number
  ): Promise<T> {
    if (!this.isInitialized) {
      this.init();
    }

    const cacheKey = this.generateCacheKey(dataId, DEFAULT_GROUP);

    // Check if we already have a pending request for this key
    if (this.pendingRequests.has(cacheKey)) {
      devLog('log', `🗄️ [v${packageJson.version}] Reusing pending request for ${dataId}`);
      return this.pendingRequests.get(cacheKey)!;
    }

    // Check memory cache first
    const cachedEntry = this.memoryCache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      devLog('log', `🗄️ [v${packageJson.version}] Cache hit for ${dataId} (memory)`);
      return cachedEntry.data;
    }

    // Then check localStorage
    const storedEntry = this.getFromStorage<T>(cacheKey);
    if (storedEntry && Date.now() < storedEntry.expiresAt) {
      // Update memory cache with data from localStorage
      this.memoryCache.set(cacheKey, storedEntry);
      devLog('log', `🗄️ [v${packageJson.version}] Cache hit for ${dataId} (localStorage)`);
      return storedEntry.data;
    }

    // If not in cache or expired, fetch from API
    const fetchPromise = this.fetchFromNacos<T>(dataId)
      .then(data => {
        // Calculate expiration time
        const effectiveTTL = ttl || this.config.defaultTTL;
        const expiresAt = Date.now() + effectiveTTL;

        // Create cache entry
        const entry: NacosCacheEntry<T> = {
          data,
          timestamp: Date.now(),
          expiresAt
        };

        // Update both caches
        this.memoryCache.set(cacheKey, entry);
        this.saveToStorage(cacheKey, entry);

        devLog('log', `🗄️ [v${packageJson.version}] Cached ${dataId} (expires in ${effectiveTTL/1000}s)`);

        return data;
      })
      .finally(() => {
        // Remove from pending requests when done
        this.pendingRequests.delete(cacheKey);
      });

    // Store the promise to deduplicate concurrent requests
    this.pendingRequests.set(cacheKey, fetchPromise);

    return fetchPromise;
  }

  /**
   * Fetch data directly from Nacos API
   */
  private async fetchFromNacos<T>(dataId: string): Promise<T> {
    try {
      devLog('log', `🗄️ [v${packageJson.version}] Fetching ${dataId} from Nacos API`);

      const url = `${kbPrefix}/nacos-configs?dataId=${dataId}&group=${DEFAULT_GROUP}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to fetch ${dataId} from Nacos:`, error);
      throw error;
    }
  }

  /**
   * Generate a unique cache key for a dataId and group
   */
  private generateCacheKey(dataId: string, group: string): string {
    return `${dataId}:${group}`;
  }

  /**
   * Get an entry from localStorage
   */
  private getFromStorage<T>(key: string): NacosCacheEntry<T> | null {
    try {
      const storageKey = `${this.config.storagePrefix}:${key}`;
      const stored = localStorage.getItem(storageKey);

      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to get from localStorage:`, error);
      return null;
    }
  }

  /**
   * Save an entry to localStorage
   */
  private saveToStorage<T>(key: string, entry: NacosCacheEntry<T>): void {
    try {
      const storageKey = `${this.config.storagePrefix}:${key}`;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      devLog('warn', `[v${packageJson.version}] Failed to save to localStorage:`, error);
      // If storage fails, try to clear some space
      this.clearOldEntries();
    }
  }

  /**
   * Load all cached entries from localStorage into memory
   */
  private loadFromStorage(): void {
    try {
      const prefix = this.config.storagePrefix + ':';
      const now = Date.now();
      let loadedCount = 0;

      // Iterate through localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(prefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key)!);

            // Skip expired entries
            if (entry.expiresAt < now) {
              localStorage.removeItem(key);
              continue;
            }

            // Add to memory cache
            const cacheKey = key.substring(prefix.length);
            this.memoryCache.set(cacheKey, entry);
            loadedCount++;

            // Limit the number of entries
            if (loadedCount >= this.config.maxEntries) {
              break;
            }
          } catch (parseError) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }

      devLog('log', `🗄️ [v${packageJson.version}] Loaded ${loadedCount} entries from localStorage`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to load from localStorage:`, error);
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    devLog('log', `🗄️ [v${packageJson.version}] Cleanup timer started (interval: ${this.config.cleanupInterval/1000}s)`);
  }
  /**
   * Clear old entries when storage is full
   */
  private clearOldEntries(): void {
    try {
      const prefix = this.config.storagePrefix + ':';
      const entries: {key: string, timestamp: number}[] = [];

      // Collect all our entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith(prefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key)!);
            entries.push({
              key,
              timestamp: entry.timestamp
            });
          } catch (error) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest entries (keep half)
      const toRemove = Math.ceil(entries.length / 2);
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(entries[i].key);
      }

      devLog('log', `🗄️ [v${packageJson.version}] Cleared ${toRemove} old entries from localStorage`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to clear old entries:`, error);
    }
  }

  /**
   * Invalidate a specific cache entry
   */
  public invalidate(dataId: string): void {
    const cacheKey = this.generateCacheKey(dataId, DEFAULT_GROUP);

    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from localStorage
    try {
      const storageKey = `${this.config.storagePrefix}:${cacheKey}`;
      localStorage.removeItem(storageKey);

      devLog('log', `🗄️ [v${packageJson.version}] Invalidated cache for ${dataId}`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to invalidate cache:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  public clearAll(): void {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear localStorage (only our keys)
      const prefix = this.config.storagePrefix + ':';
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      devLog('log', `🗄️ [v${packageJson.version}] Cleared all cache entries (${keysToRemove.length} items)`);
    } catch (error) {
      devLog('error', `[v${packageJson.version}] Failed to clear all cache:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;

    // Count expired and valid entries
    this.memoryCache.forEach(entry => {
      if (entry.expiresAt < now) {
        expiredCount++;
      } else {
        validCount++;
      }
    });

    return {
      memoryEntries: this.memoryCache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      pendingRequests: this.pendingRequests.size,
      isInitialized: this.isInitialized,
      config: { ...this.config },
      version: packageJson.version
    };
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.memoryCache.clear();
    this.pendingRequests.clear();
    this.isInitialized = false;

    devLog('log', `🗄️ [v${packageJson.version}] NacosCacheManager cleaned up`);
  }
}

// Create global instance with default configuration
export const nacosCacheManager = new NacosCacheManager();

// Initialize on module load
nacosCacheManager.init();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  nacosCacheManager.cleanup();
});

export default NacosCacheManager;
