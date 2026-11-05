import { localStorageInstance } from '~storage/index';
import { hasKolRankInCache } from '~utils/rankCacheManager';
import type { CleanerCategory, InterceptedAccount } from './types';

export const INTERCEPTED_STORAGE_KEY = '@xhunt/cleaner-intercepted-accounts';
const MAX_ACCOUNTS = 300;

// 内存缓冲队列，用于批量写入 storage
const pendingAccounts = new Map<string, InterceptedAccount>();
let flushTimer: NodeJS.Timeout | null = null;

// 串行事务锁，彻底规避并发 Read-Modify-Write 竞争与状态覆盖
let storageLock: Promise<unknown> = Promise.resolve();

function runWithStorageLock<T>(task: () => Promise<T>): Promise<T> {
  const result = storageLock.then(task, task);
  storageLock = result.then(
    () => {},
    () => {}
  );
  return result;
}

export interface RecordInterceptedParams {
  handle: string;
  name?: string;
  avatar?: string;
  category?: CleanerCategory;
  reason: string;
  matchedWord?: string;
}

/**
 * 收集被净化的账号信息，写入防抖缓存队列
 */
export function recordInterceptedAccount({
  handle,
  name,
  avatar,
  category = 'adult',
  reason,
  matchedWord,
}: RecordInterceptedParams): void {
  const cleanHandle = handle.toLowerCase().replace(/^@/, '').trim();
  if (!cleanHandle) return;

  // 有 KOL 排名的账号不进入拦截记录
  if (hasKolRankInCache(cleanHandle)) return;

  const existing = pendingAccounts.get(cleanHandle);
  if (existing) {
    existing.lastSeenAt = Date.now();
    if (name) existing.name = name;
    if (avatar) existing.avatar = avatar;
    if (reason) existing.reason = reason;
    if (matchedWord) existing.matchedWord = matchedWord;
  } else {
    pendingAccounts.set(cleanHandle, {
      handle: cleanHandle,
      name: name || cleanHandle,
      avatar: avatar || '',
      category,
      reason,
      matchedWord,
      lastSeenAt: Date.now(),
      isBlocked: false,
    });
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      void flushPendingAccounts();
    }, 500);
  }
}

/**
 * 将缓冲的拦截记录批量持久化至 storage
 */
async function flushPendingAccounts(): Promise<void> {
  flushTimer = null;
  if (pendingAccounts.size === 0) return;

  const toFlush = new Map(pendingAccounts);
  pendingAccounts.clear();

  return runWithStorageLock(async () => {
    try {
      const stored = (await localStorageInstance.get(
        INTERCEPTED_STORAGE_KEY
      )) as InterceptedAccount[] | null;
      const currentList: InterceptedAccount[] = Array.isArray(stored)
        ? [...stored]
        : [];
      const accountMap = new Map<string, InterceptedAccount>();

      currentList.forEach((acc) => {
        accountMap.set(acc.handle.toLowerCase(), acc);
      });

      // 落库前再校验一次：排名数据可能在缓冲防抖期间到达，有排名的账号一律不写
      const eligibleFlush = new Map<string, InterceptedAccount>();
      toFlush.forEach((newAcc, handle) => {
        if (!hasKolRankInCache(handle)) {
          eligibleFlush.set(handle, newAcc);
        }
      });

      eligibleFlush.forEach((newAcc, handle) => {
        const existing = accountMap.get(handle);
        if (existing) {
          // 只更新资料信息，不刷新 lastSeenAt，保持列表既有顺序稳定
          if (newAcc.name) existing.name = newAcc.name;
          if (newAcc.avatar) existing.avatar = newAcc.avatar;
          if (newAcc.reason) existing.reason = newAcc.reason;
          if (newAcc.matchedWord) existing.matchedWord = newAcc.matchedWord;
        } else {
          accountMap.set(handle, newAcc);
        }
      });

      // 新出现的账号按时间倒序排在最前，已有记录保持原顺序不变
      const newAccounts = eligibleFlush.size
        ? Array.from(eligibleFlush.keys())
            .filter((handle) => !currentList.some(
              (acc) => acc.handle.toLowerCase() === handle
            ))
            .map((handle) => accountMap.get(handle)!)
            .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
        : [];

      const merged = [...newAccounts, ...currentList];
      const trimmed = merged.slice(0, MAX_ACCOUNTS);
      await localStorageInstance.set(INTERCEPTED_STORAGE_KEY, trimmed);
    } catch (err) {
      // 忽略异常写入
    }
  });
}

/**
 * 从拦截记录中移除指定账号（用于 KOL 排名复核通过后撤销误记）
 */
export async function removeInterceptedAccount(handle: string): Promise<void> {
  const clean = handle.toLowerCase().replace(/^@/, '').trim();
  if (!clean) return;

  pendingAccounts.delete(clean);

  return runWithStorageLock(async () => {
    try {
      const stored = (await localStorageInstance.get(
        INTERCEPTED_STORAGE_KEY
      )) as InterceptedAccount[] | null;
      if (!Array.isArray(stored)) return;

      const filtered = stored.filter(
        (acc) => acc.handle.toLowerCase() !== clean
      );
      if (filtered.length !== stored.length) {
        await localStorageInstance.set(INTERCEPTED_STORAGE_KEY, filtered);
      }
    } catch (err) {
      // 忽略异常
    }
  });
}

/**
 * 实时同步并校正指定账号的屏蔽状态（如果该账号存在于拦截记录中）
 */
export async function updateInterceptedBlockStatus(
  handle: string,
  isBlocked: boolean
): Promise<boolean> {
  const clean = handle.toLowerCase().replace(/^@/, '').trim();
  if (!clean) return false;

  const pending = pendingAccounts.get(clean);
  if (pending) {
    pending.isBlocked = isBlocked;
  }

  return runWithStorageLock(async () => {
    try {
      const stored = (await localStorageInstance.get(
        INTERCEPTED_STORAGE_KEY
      )) as InterceptedAccount[] | null;
      const currentList: InterceptedAccount[] = Array.isArray(stored)
        ? [...stored]
        : [];

      let changed = false;
      const updated = currentList.map((acc) => {
        if (acc.handle.toLowerCase() === clean) {
          if (acc.isBlocked !== isBlocked) {
            changed = true;
            return { ...acc, isBlocked };
          }
        }
        return acc;
      });

      if (changed) {
        await localStorageInstance.set(INTERCEPTED_STORAGE_KEY, updated);
        return true;
      }
    } catch (err) {
      // 忽略异常
    }
    return false;
  });
}
