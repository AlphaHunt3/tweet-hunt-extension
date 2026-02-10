// src/storage/index.ts
import { Storage } from '@plasmohq/storage';
const underlying = new Storage({ area: 'local' });
// const KEY_STORAGE_KEY = '@xhunt/enc-key';
const VERSION = 'v1';

// 类型声明
interface StorageChange {
  oldValue?: any;
  newValue?: any;
}

class SelectiveEncryptedStorage {
  private ready: Promise<void>;
  private cryptoKey: CryptoKey | null = null;
  private _watchHandlers: Map<string, Set<() => void>> | null = null;
  private _globalListener:
    |
    ((changes: Record<string, StorageChange>, areaName: string) => void)
    | null = null;

  constructor() {
    this.ready = this.ensureKey();
  }

  private async ensureKey(): Promise<void> {
    const SECRET = 'xhunt-fixed-secret-v1';
    const raw = new TextEncoder().encode(SECRET);
    const digest = await crypto.subtle.digest('SHA-256', raw);
    this.cryptoKey = await crypto.subtle.importKey(
      'raw',
      digest,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
  }

  private isEncryptedKey(key: string): boolean {
    if (
      key === '@xhunt/current-username' ||
      key === '@xhunt/initial-state-current-user' ||
      key === '@xhunt/initial-state-users'
    )
      return true;
    if (
      key.startsWith('xhunt-nacos-cache') ||
      key.startsWith('@xhunt-nacos-cache')
    )
      return true;
    return false;
  }

  private b64encode(data: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
    return btoa(bin);
  }

  private b64decode(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  private async encryptValue(value: any): Promise<string> {
    await this.ready;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(value));
    const buf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey!,
      data
    );
    const cipher = new Uint8Array(buf);
    return [VERSION, this.b64encode(iv), this.b64encode(cipher)].join(':');
  }

  private async decryptValue(payload: any): Promise<any> {
    if (typeof payload !== 'string') return undefined;
    const parts = payload.split(':');
    if (parts.length !== 3 || parts[0] !== VERSION) return undefined;
    await this.ready;
    const iv = this.b64decode(parts[1]);
    const cipher = this.b64decode(parts[2]);
    const buf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey!,
      cipher
    );
    const text = new TextDecoder().decode(buf);
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  async get<T = any>(key: string): Promise<T | null | undefined> {
    const raw = (await underlying.get<any>(key)) as any;
    if (raw == null) return undefined as any;
    if (typeof raw === 'string' && raw.startsWith(`${VERSION}:`)) {
      const v = await this.decryptValue(raw);
      // 如果解密失败，返回 undefined 而不是原始加密字符串
      if (v == null) {
        console.warn(`Failed to decrypt value for key: ${key}`);
        return undefined as any;
      }
      return v as T;
    }

    // 如果不是加密 key，直接返回
    if (!this.isEncryptedKey(key)) {
      return raw as T;
    }

    // 如果是加密 key 但不是加密字符串格式，按原逻辑处理
    if (typeof raw !== 'string') {
      // Backward compatibility: previously stored non-string plaintext value
      return raw as T;
    }
    // Backward compatibility: plaintext string (no version prefix)
    return raw as T;
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.isEncryptedKey(key)) {
      await underlying.set(key, value);
      return;
    }
    const enc = await this.encryptValue(value);
    await underlying.set(key, enc);
  }

  async remove(key: string): Promise<void> {
    await underlying.remove(key);
  }

  async clear(): Promise<void> {
    await underlying.clear();
  }

  watch(handlers: Record<string, () => void>): void {
    try {
      // 分离加密 key 和非加密 key
      const encryptedHandlers: Record<string, () => void> = {};
      const normalHandlers: Record<string, () => void> = {};

      for (const [key, handler] of Object.entries(handlers)) {
        // 只有加密 key 才需要我们的自定义监听逻辑
        if (this.isEncryptedKey(key)) {
          encryptedHandlers[key] = handler;
        } else {
          normalHandlers[key] = handler;
        }
      }

      // 非加密 key 直接使用原始的 watch，性能更好
      if (Object.keys(normalHandlers).length > 0) {
        (underlying as any).watch(normalHandlers);
      }

      // 加密 key 使用我们的自定义监听逻辑
      if (Object.keys(encryptedHandlers).length === 0) {
        return;
      }

      const storageApi =
        (globalThis as any).chrome?.storage ||
        (globalThis as any).browser?.storage;
      if (!storageApi?.onChanged) {
        // 如果没有 storage API，回退到原始的 watch
        (underlying as any).watch(encryptedHandlers);
        return;
      }

      // 使用单个全局 listener 来监听所有变化，提高性能
      if (!this._globalListener) {
        this._watchHandlers = new Map<string, Set<() => void>>();
        this._globalListener = (
          changes: Record<string, StorageChange>,
          areaName: string
        ) => {
          if (areaName !== 'local' || !this._watchHandlers) return;

          // 只处理我们监听的加密 key
          for (const key of Object.keys(changes)) {
            // 只处理加密 key
            if (!this.isEncryptedKey(key)) continue;

            const handlerSet = this._watchHandlers.get(key);
            if (handlerSet) {
              // 触发所有该 key 的 handlers
              // hook 内部会调用 get() 方法，此时会经过我们的解密逻辑
              handlerSet.forEach((handler) => handler());
            }
          }
        };
        try {
          storageApi.onChanged.addListener(this._globalListener);
        } catch (err) {
          // 如果添加 listener 失败，清理状态
          this._watchHandlers = null;
          this._globalListener = null;
          throw err;
        }
      }

      // 为每个加密 key 注册 handler
      if (!this._watchHandlers) {
        this._watchHandlers = new Map<string, Set<() => void>>();
      }
      for (const [key, handler] of Object.entries(encryptedHandlers)) {
        if (!this._watchHandlers.has(key)) {
          this._watchHandlers.set(key, new Set());
        }
        this._watchHandlers.get(key)!.add(handler);
      }
    } catch (err) {
      // 扩展上下文失效时的错误处理
      if (
        err instanceof Error &&
        (err.message.includes('Extension context invalidated') ||
          err.message.includes('onChanged'))
      ) {
        console.warn('Extension context invalidated, watch failed:', err);
        return;
      }
      throw err;
    }
  }

  unwatch(handlers: Record<string, () => void>): void {
    try {
      // 分离加密 key 和非加密 key
      const encryptedHandlers: Record<string, () => void> = {};
      const normalHandlers: Record<string, () => void> = {};

      for (const [key, handler] of Object.entries(handlers)) {
        if (this.isEncryptedKey(key)) {
          encryptedHandlers[key] = handler;
        } else {
          normalHandlers[key] = handler;
        }
      }

      // 非加密 key 直接使用原始的 unwatch
      if (Object.keys(normalHandlers).length > 0) {
        (underlying as any).unwatch(normalHandlers);
      }

      // 加密 key 使用我们的自定义逻辑
      if (Object.keys(encryptedHandlers).length === 0) {
        return;
      }

      const storageApi =
        (globalThis as any).chrome?.storage ||
        (globalThis as any).browser?.storage;
      if (!storageApi?.onChanged || !this._watchHandlers) {
        // 如果没有 storage API 或没有监听器，回退到原始的 unwatch
        (underlying as any).unwatch(encryptedHandlers);
        return;
      }

      // 移除每个加密 key 的 handler
      for (const [key, handler] of Object.entries(encryptedHandlers)) {
        const handlerSet = this._watchHandlers.get(key);
        if (handlerSet) {
          handlerSet.delete(handler);
          // 如果该 key 没有 handler 了，从 Map 中移除
          if (handlerSet.size === 0) {
            this._watchHandlers.delete(key);
          }
        }
      }

      // 如果所有 handlers 都被移除了，移除全局 listener
      if (
        this._watchHandlers &&
        this._watchHandlers.size === 0 &&
        this._globalListener
      ) {
        try {
          storageApi.onChanged.removeListener(this._globalListener);
        } catch (err) {
          console.warn('Failed to remove global listener:', err);
        }
        this._globalListener = null;
        this._watchHandlers = null;
      }
    } catch (err) {
      // 扩展上下文失效时的错误处理
      if (
        err instanceof Error &&
        (err.message.includes('Extension context invalidated') ||
          err.message.includes('onChanged'))
      ) {
        console.warn('Extension context invalidated, unwatch failed:', err);
        return;
      }
      throw err;
    }
  }
}

export const localStorageInstance = new SelectiveEncryptedStorage() as any;

export const sessionStorageInstance = new Storage({
  area: 'session'
}) as any;
