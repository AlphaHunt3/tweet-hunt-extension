import packageJson from '../../package.json';
import { getSpecialUserMarkers } from '~contents/services/api';
import type { SpecialMarkerItem } from '~types';
import { localStorageInstance } from '~storage';

const devLog = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
  if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
    console[level](...args);
  }
};

const STORAGE_CACHE_KEY = '@xhunt/special-markers:cache:v1';

function normalizeUsername(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

type MarkerChangeListener = () => void;

class SpecialMarkersManager {
  private markersMap: Map<string, SpecialMarkerItem> = new Map();
  private twidMap: Map<
    string,
    { handle: string; item: SpecialMarkerItem }
  > = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private lastTwId: string | null = null;
  private listeners: Set<MarkerChangeListener> = new Set();

  /**
   * 初始化管理器
   */
  public async init(twId?: string | null): Promise<void> {
    if (this.isInitialized && this.lastTwId === (twId || null)) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.lastTwId = twId || null;
    this.initPromise = this.initInternal();
    return this.initPromise;
  }

  private async initInternal(): Promise<void> {
    try {
      devLog(
        'log',
        `🏷️ [v${packageJson.version}] SpecialMarkersManager initializing...`,
      );

      // 1. 先尝试从本地 Storage 加载缓存，避免白屏
      await this.loadFromStorage();

      // 2. 发起静默校验更新 (后端支持 ETag 与 300s 缓存)
      await this.fetchMarkers();
    } catch (error) {
      devLog(
        'error',
        `🏷️ [v${packageJson.version}] Failed to initialize SpecialMarkersManager:`,
        error,
      );
    } finally {
      this.isInitialized = true;
      this.initPromise = null;
    }
  }

  /**
   * 从本地缓存加载
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const cached = (await localStorageInstance.get(
        STORAGE_CACHE_KEY,
      )) as Record<string, SpecialMarkerItem> | null;
      if (cached && typeof cached === 'object') {
        this.markersMap.clear();
        this.twidMap.clear();
        Object.entries(cached).forEach(([u, item]) => {
          const handle = normalizeUsername(u);
          this.markersMap.set(handle, item);
          if (item && item.twid) {
            this.twidMap.set(String(item.twid).trim(), { handle, item });
          }
        });
        devLog(
          'log',
          `🏷️ [v${packageJson.version}] Loaded ${this.markersMap.size} special markers from storage`,
        );
        // 缓存生效后通知订阅者重扫，避免 API 失败时缓存标记迟迟不上屏
        if (this.markersMap.size > 0) {
          this.notifyListeners();
        }
      }
    } catch (_) {}
  }

  /**
   * 从后端 API 刷新标记列表
   */
  public async fetchMarkers(): Promise<void> {
    try {
      const res = await getSpecialUserMarkers();
      if (res && res.success && res.data && res.data.markers) {
        this.markersMap.clear();
        this.twidMap.clear();
        const rawMarkers = res.data.markers;
        Object.entries(rawMarkers).forEach(([u, item]) => {
          const handle = normalizeUsername(u);
          this.markersMap.set(handle, item);
          if (item && item.twid) {
            this.twidMap.set(String(item.twid).trim(), { handle, item });
          }
        });

        // 写入本地 Storage
        await localStorageInstance
          .set(STORAGE_CACHE_KEY, rawMarkers)
          .catch(() => {});

        devLog(
          'log',
          `🏷️ [v${packageJson.version}] Fetched ${this.markersMap.size} special markers from API`,
        );

        // 通知所有订阅者重新刷新 DOM
        this.notifyListeners();
      }
    } catch (err) {
      devLog(
        'warn',
        `🏷️ [v${packageJson.version}] Fetch special markers failed:`,
        err,
      );
    }
  }

  /**
   * 根据 Twitter handle 或 numeric twid 获取其特殊标记
   */
  public getMarker(usernameOrTwid: string): SpecialMarkerItem | null {
    const clean = normalizeUsername(usernameOrTwid);
    if (!clean) return null;
    return this.markersMap.get(clean) || this.twidMap.get(clean)?.item || null;
  }

  /**
   * 判断某个 handle 或 numeric twid 是否有特殊标记
   */
  public hasMarker(usernameOrTwid: string): boolean {
    const clean = normalizeUsername(usernameOrTwid);
    return this.markersMap.has(clean) || this.twidMap.has(clean);
  }

  /**
   * 根据 numeric twid 反查 handle
   */
  public getHandleByTwid(twid: string): string | null {
    const clean = String(twid || '').trim();
    if (!clean) return null;
    return this.twidMap.get(clean)?.handle || null;
  }

  /**
   * 订阅数据变化通知
   */
  public addListener(listener: MarkerChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (_) {}
    });
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getCount(): number {
    return this.markersMap.size;
  }
}

export const specialMarkersManager = new SpecialMarkersManager();
