// background.ts
export { };

import { realtimeService } from './services/realtime';
import { backgroundConfig } from './utils/backgroundConfig';
import { nacosCacheManager } from '../utils/nacosCacheManager';
import { localStorageInstance } from '../storage/index.ts';

// 定义消息类型常量
const MESSAGE_TYPES = {
  EXECUTE_REQUEST: 'EXECUTE_REQUEST',
  CANCEL_REQUEST: 'CANCEL_REQUEST',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  REQUEST_NOTIFICATION_PERMISSION: 'REQUEST_NOTIFICATION_PERMISSION',
  DEBUG_LEADER_STATUS: 'DEBUG_LEADER_STATUS',
  FORCE_REINIT: 'FORCE_REINIT',
  FORCR_EXEC_POLLER_TICK: 'FORCR_EXEC_POLLER_TICK',
  GET_REALTIME_STATUS: 'GET_REALTIME_STATUS',
  RECONNECT_REALTIME: 'RECONNECT_REALTIME',
} as const;

// 应用状态管理
let isInitialized = false;
const onlinePresenceTabs = new Set<number>();
let prewarmConfigDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingInstallDetails: any = null;

const LANGUAGE_STORAGE_KEY = '@settings/language1';
const ALLOWED_API_HOSTS = new Set(['example.invalid', 'example.invalid']);
const ALLOWED_REQUEST_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);
const X_TAB_URL_PATTERNS = ['https://x.com/*'];

const TAB_EDIT_LOCK_RETRY_DELAYS = [150, 350, 700];

function isTabEditLockedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes('Tabs cannot be edited right now');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAllowedApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      ALLOWED_API_HOSTS.has(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function isTrustedMessageSender(sender: any): boolean {
  const extensionId = (chrome as any).runtime?.id;
  if (!sender || sender.id !== extensionId) return false;

  const senderUrl = sender.origin || sender.url || '';
  if (!senderUrl) return true;

  try {
    const parsed = new URL(senderUrl);
    return (
      parsed.origin === `chrome-extension://${extensionId}` ||
      (parsed.protocol === 'https:' &&
        (parsed.hostname === 'x.com' || parsed.hostname === 'twitter.com'))
    );
  } catch {
    return false;
  }
}

function sanitizeProxyHeaders(
  headers?: Record<string, string>
): Record<string, string> {
  if (!headers) return {};

  return Object.entries(headers).reduce<Record<string, string>>(
    (safeHeaders, [name, value]) => {
      const normalized = name.trim().toLowerCase();
      if (
        !normalized ||
        normalized === 'cookie' ||
        normalized === 'host' ||
        normalized === 'origin' ||
        normalized === 'referer' ||
        normalized === 'content-length' ||
        normalized.startsWith('proxy-') ||
        normalized.startsWith('sec-')
      ) {
        return safeHeaders;
      }
      safeHeaders[name] = String(value);
      return safeHeaders;
    },
    {}
  );
}

async function createTabSafely(createProperties: any) {
  for (
    let attempt = 0;
    attempt <= TAB_EDIT_LOCK_RETRY_DELAYS.length;
    attempt += 1
  ) {
    try {
      return await (chrome as any).tabs.create(createProperties);
    } catch (error) {
      if (
        !isTabEditLockedError(error) ||
        attempt >= TAB_EDIT_LOCK_RETRY_DELAYS.length
      ) {
        return undefined;
      }
      await delay(TAB_EDIT_LOCK_RETRY_DELAYS[attempt]);
    }
  }
  return undefined;
}

async function queryTabsSafely(queryInfo: any): Promise<any[]> {
  return new Promise((resolve) => {
    try {
      (chrome as any).tabs?.query(queryInfo, (tabs: any[]) => {
        const lastError = (chrome as any).runtime?.lastError;
        if (lastError) {
          console.log('[App] Failed to query x.com tabs:', lastError.message);
          resolve([]);
          return;
        }

        resolve(Array.isArray(tabs) ? tabs : []);
      });
    } catch (error) {
      console.log('[App] Failed to query x.com tabs:', error);
      resolve([]);
    }
  });
}

async function reloadTabSafely(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      (chrome as any).tabs?.reload(tabId, () => {
        const lastError = (chrome as any).runtime?.lastError;
        if (lastError) {
          console.log('[App] Failed to reload x.com tab:', lastError.message);
        }
        resolve();
      });
    } catch (error) {
      console.log('[App] Failed to reload x.com tab:', error);
      resolve();
    }
  });
}

async function reloadXTabs(reason: string): Promise<void> {
  const tabs = await queryTabsSafely({ url: X_TAB_URL_PATTERNS });
  await Promise.all(
    tabs
      .map((tab) => tab?.id)
      .filter((tabId) => typeof tabId === 'number')
      .map((tabId) => reloadTabSafely(tabId)),
  );

  if (tabs.length > 0) {
    console.log(`[App] Reloaded ${tabs.length} x.com tabs:`, reason);
  }
}

/**
 * 检查是否有 x.com 的 tab
 */
async function hasXComTab(): Promise<boolean> {
  try {
    return onlinePresenceTabs.size > 0;
  } catch (error) {
    console.log('[App] Failed to check presence:', error);
    return false;
  }
}

// 处理重连实时订阅
async function handleReconnectRealtime(
  sendResponse: (response: ResponseData) => void,
) {
  try {
    // 简单重启服务
    realtimeService.stop();
    await backgroundConfig.init(true);
    realtimeService.start();
    sendResponse({ success: true, data: { message: 'Realtime reconnected' } });
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

/**
 * 检查并管理服务状态
 */
async function checkAndManageService(): Promise<void> {
  try {
    const hasXTab = await hasXComTab();

    if (hasXTab) {
      // 如果有 x.com tab，确保服务运行
      if (!isInitialized) {
        console.log('[App] X.com tab detected, starting service...');
        await initializeApp();
      }
    } else {
      // 如果没有 x.com tab，停止服务
      if (isInitialized) {
        console.log('[App] No X.com tab found, stopping service...');
        realtimeService.stop();
        isInitialized = false;
      }
    }
  } catch (error) {
    console.log('[App] Failed to check and manage service:', error);
  }
}

// 提前初始化语言偏好，和 useLocalStorage('@settings/language1', '') 使用同一个 Plasmo local storage key
async function ensureLanguagePreference(): Promise<void> {
  try {
    const chromeUiLanguage = (chrome as any).i18n?.getUILanguage?.();
    const navigatorLanguage =
      typeof navigator !== 'undefined' ? navigator.language : undefined;
    const existing = await localStorageInstance.get(LANGUAGE_STORAGE_KEY);
    if (existing) return;

    const primaryLanguage = chromeUiLanguage || navigatorLanguage || 'en';
    const shouldUseChinese = /^zh/i.test(primaryLanguage);

    await localStorageInstance.set(
      LANGUAGE_STORAGE_KEY,
      shouldUseChinese ? 'zh' : 'en',
    );
    console.log(
      '[App] Initialized language preference:',
      shouldUseChinese ? 'zh' : 'en',
    );
  } catch (e) {
    console.log('[App] Failed to initialize language preference:', e);
  }
}

// 预热远程配置并写入 Plasmo Storage，供前台/内容脚本快速读取
async function prewarmConfig(): Promise<void> {
  try {
    await nacosCacheManager.fetchWithCache('xhunt_config', 10 * 60 * 1000);
    await nacosCacheManager.fetchWithCache('xhunt_i18n', 10 * 60 * 1000);
    // nacosCacheManager.fetchWithCache('xhunt_campaigns', 5 * 60 * 1000);
    nacosCacheManager.cleanup();
  } catch (e) {
    // 静默失败
  }

  // prewarm 完成后，处理 pending 的安装/更新逻辑
  if (pendingInstallDetails) {
    await handleInstallOrUpdate(pendingInstallDetails);
    pendingInstallDetails = null;
  }
}

function prewarmConfigDebounced(): void {
  if (prewarmConfigDebounceTimer) {
    clearTimeout(prewarmConfigDebounceTimer);
  }
  prewarmConfigDebounceTimer = setTimeout(() => {
    void prewarmConfig();
  }, 300);
}

// 应用初始化
async function initializeApp(): Promise<void> {
  // 防止重复初始化
  if (isInitialized) {
    console.log('[App] Already initialized, skipping...');
    return;
  }

  try {
    console.log('[App] Starting initialization...');

    // 启动实时订阅（优先使用 SSE，不支持时使用轮询）
    console.log('[App] Starting realtime subscription...');
    // 每次检查前强制刷新配置，确保读取到最新的后端开关
    await backgroundConfig.init(true);
    realtimeService.start();

    // 标记为已初始化
    isInitialized = true;

    console.log('[App] Initialization complete');
  } catch (e) {
    // 静默处理初始化失败的错误
    // console.log('[App] Initialization failed:', e);
  }
}

// 应用启动
(chrome as any).runtime?.onStartup?.addListener(() => {
  console.log('[App] Extension startup');
  prewarmConfigDebounced();
  checkAndManageService();
});

// 处理安装/更新逻辑（在 prewarmConfig 完成后调用）
async function handleInstallOrUpdate(details: any) {
  await ensureLanguagePreference();
  if (details?.reason === 'install') {
    // 新用户安装：自动打开 x.com
    try {
      (chrome as any).tabs?.create({ url: 'https://x.com' });
    } catch (e) {
      console.log('[App] Failed to open x.com on install:', e);
    }
  }
}

// 应用安装/更新
(chrome as any).runtime?.onInstalled?.addListener((details: any) => {
  console.log('[App] Extension installed/updated, reason:', details?.reason);
  if (details?.reason === 'update') {
    void reloadXTabs('extension updated');
  }
  // 暂存 details，等 prewarmConfig 完成后再执行
  pendingInstallDetails = details;
  prewarmConfigDebounced();
  checkAndManageService();
});

prewarmConfigDebounced();
// 立即初始化（background script 只会在有 x.com 页面时执行）
console.log('[App] Background script loaded, initializing...');
// 先检查是否有 x.com tab，再决定是否初始化
checkAndManageService().catch((e) => {
  // 静默处理初始化失败的错误
  // console.error('[App] Initial check failed:', e);
});

// 基于 content script 的长连接感知 x.com 存在性
(chrome as any).runtime?.onConnect?.addListener((port: any) => {
  if (!port || port.name !== 'presence') return;
  const tabId = port?.sender?.tab?.id;
  if (typeof tabId !== 'number') return;

  const wasEmpty = onlinePresenceTabs.size === 0;
  onlinePresenceTabs.add(tabId);
  console.log('[App] Port: X.com tab connected', tabId);
  if (wasEmpty && onlinePresenceTabs.size > 0) {
    console.log('[App] Port: X.com tab detected, starting service...');
    checkAndManageService();
  }

  port.onDisconnect.addListener(() => {
    const beforeSize = onlinePresenceTabs.size;
    onlinePresenceTabs.delete(tabId);
    console.log('[App] Port: X.com tab disconnected', tabId);
    if (beforeSize > 0 && onlinePresenceTabs.size === 0) {
      console.log('[App] Port: No X.com tab found, stopping service...');
      checkAndManageService();
    }
  });
});

// 监听系统空闲状态变化（熄屏/恢复）
try {
  (chrome as any).idle?.onStateChanged?.addListener((newState: string) => {
    console.log(`[App] System idle state changed: ${newState}`);

    // 当系统从 idle 或 locked 状态恢复到 active 时，检查并管理服务
    if (newState === 'active') {
      checkAndManageService().catch((e) => {
        // 静默处理恢复失败的错误
        // console.error('[App] Check and manage service failed:', e);
      });
    }
  });

  // 设置检测间隔（可选，默认15秒）
  // chrome.idle.setDetectionInterval(15);
} catch (e) {
  // 如果 idle API 不可用，静默处理
  // console.log('[App] Idle API not available:', e);
}

// 删除基于 tabs API 的监听，改为基于 Port 的在线集合变化触发

interface ExecuteRequestMessage {
  type: typeof MESSAGE_TYPES.EXECUTE_REQUEST;
  requestId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface CancelRequestMessage {
  type: typeof MESSAGE_TYPES.CANCEL_REQUEST;
  requestId: string;
}

type BackgroundMessage =
  | ExecuteRequestMessage
  | CancelRequestMessage;

interface ResponseData {
  data?: any;
  error?: string;
  success?: boolean;
}

// 请求控制器管理
const activeControllers = new Map<string, AbortController>();

// 消息监听器
chrome.runtime.onMessage.addListener(
  // @ts-ignore
  (
    message: BackgroundMessage,
    sender: any,
    sendResponse: (response: ResponseData) => void,
  ) => {
    if (!message || typeof message !== 'object') {
      return false;
    }

    // 处理执行请求
    if (message.type === MESSAGE_TYPES.EXECUTE_REQUEST) {
      if (!isTrustedMessageSender(sender)) {
        sendResponse({ error: 'Unauthorized sender' });
        return true;
      }
      handleExecuteRequest(message as ExecuteRequestMessage, sendResponse);
      return true; // 保持消息通道开放
    }

    // 处理取消请求
    if (message.type === MESSAGE_TYPES.CANCEL_REQUEST) {
      if (!isTrustedMessageSender(sender)) {
        sendResponse({ error: 'Unauthorized sender' });
        return true;
      }
      handleCancelRequest(message as CancelRequestMessage, sendResponse);
      return true; // 保持消息通道开放
    }

    // 处理调试 Leader 状态请求
    if ((message as any).type === MESSAGE_TYPES.DEBUG_LEADER_STATUS) {
      handleDebugLeaderStatus(sendResponse);
      return true; // 保持消息通道开放
    }

    // 处理强制重新初始化请求
    if ((message as any).type === MESSAGE_TYPES.FORCE_REINIT) {
      // handleForceReinit(sendResponse);
      return true; // 保持消息通道开放
    }
    // 处理强制执行轮询请求
    if ((message as any).type === MESSAGE_TYPES.FORCR_EXEC_POLLER_TICK) {
      handleForceExecPollerTick(sendResponse);
      return true; // 保持消息通道开放
    }

    // 处理获取实时订阅状态请求
    if ((message as any).type === MESSAGE_TYPES.GET_REALTIME_STATUS) {
      handleGetRealtimeStatus(sendResponse);
      return true; // 保持消息通道开放
    }

    // 处理重连实时订阅请求
    if ((message as any).type === MESSAGE_TYPES.RECONNECT_REALTIME) {
      handleReconnectRealtime(sendResponse);
      return true; // 保持消息通道开放
    }
  },
);

// 点击扩展图标时，通知当前激活标签页打开悬浮框并进入设置页
try {
  (chrome as any).action.onClicked.addListener(async (tab: any) => {
    try {
      const openSettingsInTab = (tabId: number) =>
        new Promise<boolean>((resolve) => {
          try {
            (chrome as any).tabs.sendMessage(
              tabId,
              { type: MESSAGE_TYPES.OPEN_SETTINGS },
              () => {
                // 如果没有 contentjs，Chrome 会在 runtime.lastError 中给出提示
                const lastErr = (chrome as any).runtime?.lastError;
                const msg: string = lastErr?.message || '';
                const needOpen =
                  typeof msg === 'string' &&
                  msg.includes('Could not establish connection');
                if (lastErr) {
                  // 静默处理发送消息的错误
                  // console.log('[xhunt] sendMessage lastError:', msg);
                }
                resolve(needOpen);
              },
            );
          } catch (err) {
            // 静默处理发送消息的异常
            // console.log('[xhunt] sendMessage exception:', err);
            resolve(true);
          }
        });

      const openXAndThenSettings = async () => {
        const created = await createTabSafely({
          url: 'https://x.com/',
        });
        const createdTabId = created?.id;
        if (!createdTabId) return;
        const onUpdated = (tabId: number, info: any) => {
          if (tabId === createdTabId && info.status === 'complete') {
            (chrome as any).tabs.onUpdated.removeListener(onUpdated);
            void openSettingsInTab(createdTabId);
          }
        };
        (chrome as any).tabs.onUpdated.addListener(onUpdated);
      };

      // 使用 onClicked 回调提供的 tab.id，避免读取 URL 或额外查询
      if (tab?.id) {
        console.log('[xhunt] Trying current tab first. tabId=', tab.id);
        const needOpen = await openSettingsInTab(tab.id);
        if (!needOpen) return; // 已成功，或错误非连接问题
      }

      // 当前标签不可用或无接收端，打开 x.com 并在加载完成后重试
      console.log('[xhunt] Opening x.com and retry (no receiver).');
      await openXAndThenSettings();
    } catch (e) {
      // 静默处理发送设置消息失败的错误
      // console.log('Failed to send OPEN_SETTINGS message:', e);
    }
  });
} catch (_) {
  // 某些环境下 action 可能不可用，忽略
}

// 处理强制执行轮询请求
async function handleForceExecPollerTick(
  sendResponse: (response: ResponseData) => void,
) {
  console.log('[App] Force exec poller tick...');
  realtimeService.debouncedPollerTick();
  sendResponse({
    success: true,
    data: {
      message: 'Force exec poller tick successfully',
    },
  });
}

// 处理获取实时订阅状态请求
async function handleGetRealtimeStatus(
  sendResponse: (response: ResponseData) => void,
) {
  try {
    const isUsingSSE = realtimeService.isUsingSSE();
    const isPolling = realtimeService.isPolling();

    sendResponse({
      success: true,
      data: {
        isUsingSSE,
        isPolling,
        mode: isUsingSSE ? 'SSE' : isPolling ? 'Polling' : 'Inactive',
      },
    });
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

// 处理网络请求执行
async function handleExecuteRequest(
  message: ExecuteRequestMessage,
  sendResponse: (response: ResponseData) => void,
) {
  const { requestId, url, method, headers, body } = message;
  const safeMethod = String(method || 'GET').toUpperCase();

  if (!requestId || !isAllowedApiUrl(url)) {
    sendResponse({ error: 'Request URL is not allowed' });
    return;
  }

  if (!ALLOWED_REQUEST_METHODS.has(safeMethod)) {
    sendResponse({ error: 'Request method is not allowed' });
    return;
  }

  // 创建中止控制器
  const controller = new AbortController();
  activeControllers.set(requestId, controller);

  // 修改请求配置以减少 OPTIONS 请求
  const requestOptions: RequestInit = {
    method: safeMethod,
    headers: sanitizeProxyHeaders(headers),
    body,
    signal: controller.signal,
    // 添加 mode: 'cors' 明确指定跨域请求
    mode: 'cors',
    // 避免 background 代理自动携带浏览器 cookie
    credentials: 'omit',
  };

  try {
    // 执行网络请求
    const response = await fetch(url, requestOptions);

    // 特殊状态码处理
    if (response.status === 419) {
      sendResponse({ error: '登录已过期' });
      return;
    }

    // 非2xx响应处理
    if (!response.ok) {
      try {
        const errorData = await response.json();
        const errorMessage =
          (errorData && errorData.message) ||
          (errorData && errorData.error) ||
          `请求失败（${response.status}）`;
        sendResponse({ error: errorMessage });
      } catch (jsonError) {
        sendResponse({
          error: `JSON解析失败: ${jsonError instanceof Error ? jsonError.message : String(jsonError)
            }`,
        });
      }
      return;
    }

    // 正常响应处理
    // 先读取文本内容，然后判断是 JSON、纯文本还是 HTML
    const text = await response.text();

    // 尝试解析为 JSON
    try {
      const data = JSON.parse(text);
      sendResponse({ data });
    } catch (jsonError) {
      // JSON 解析失败，作为纯文本或 HTML 原样返回（如 'True' 或 HTML 内容）
      sendResponse({ data: text });
    }
  } catch (error) {
    // 错误处理
    if (error instanceof Error && error.name === 'AbortError') {
      sendResponse({ error: 'Request aborted' });
    } else {
      sendResponse({
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  } finally {
    // 清理资源
    activeControllers.delete(requestId);
  }
}

// 处理取消网络请求
function handleCancelRequest(
  message: CancelRequestMessage,
  sendResponse: (response: ResponseData) => void,
) {
  const { requestId } = message;
  const controller = activeControllers.get(requestId);

  if (controller) {
    controller.abort();
    activeControllers.delete(requestId);
    sendResponse({ data: { success: true } });
  } else {
    sendResponse({ error: 'Request not found or already completed' });
  }
}

// 处理调试状态请求
async function handleDebugLeaderStatus(
  sendResponse: (response: ResponseData) => void,
) {
  try {
    sendResponse({
      success: true,
      data: {
        pollingActive: realtimeService.isPolling(),
      },
    });
  } catch (error) {
    // 静默处理调试状态错误
    // console.error('Debug status error:', error);
    sendResponse({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

// // 处理强制重新初始化请求
// async function handleForceReinit(
//   sendResponse: (response: ResponseData) => void
// ) {
//   try {
//     console.log('[App] Force reinitializing...');

//     // 停止现有实时订阅
//     realtimeService.stop();

//     // 重置初始化状态
//     isInitialized = false;

//     // 重新初始化
//     await initializeApp();

//     sendResponse({
//       success: true,
//       data: {
//         message: 'Reinitialized successfully',
//         pollingActive: realtimeService.isPolling(),
//       },
//     });
//   } catch (error) {
//     // 静默处理强制重新初始化错误
//     // console.error('Force reinit error:', error);
//     sendResponse({
//       error: error instanceof Error ? error.message : 'Unknown error occurred',
//     });
//   }
// }
