import {
  generateRequestId,
  generateTimestamp,
  generateSignature,
} from './security-helpers';
import { getDeviceFingerprint } from './fingerprint';
import packageJson from '../../../package.json';
import { localStorageInstance } from '~storage';
import { clearAuthState } from '~contents/utils/auth.ts';
import {
  checkExtensionContext,
  safeSendMessage,
} from '~contents/utils/index.ts';
import { getPlacementTrackingInfo } from '~contents/hooks/usePlacementTrackingDomUserInfo';
import { cleanErrorMessage } from '~utils/dataValidation';
import {
  getAuthToken,
  getCurrentTwitterId,
  getCurrentUsername,
} from './helpers';

const API_BASE_URL =
  process.env.PLASMO_PUBLIC_ENV === 'dev'
    ? 'https://test-kb.xhunt.ai/api'
    : 'https://kb.xhunt.ai/api';

// moved helpers to helpers.ts

interface SecureFetchRequestOptions extends RequestInit {
  body?: any;
  tokenRequired?: boolean;
  signal?: AbortSignal;
  responseType?: 'json' | 'stream';
}

const activeSignals = new Map<string, AbortSignal>(); // requestId → signal

function buildRequestIdWithTwitterId(): string {
  const baseId = generateRequestId();
  try {
    const info = getPlacementTrackingInfo();
    if (info?.twitterId) {
      return `${baseId}-twid${info.twitterId}`;
    }
  } catch (error) {
    console.log(
      `[v${packageJson.version}] Failed to append twitterId to requestId:`,
      error
    );
  }
  return baseId;
}

// 公共的请求准备逻辑
async function prepareSecureRequest(
  endpoint: string,
  options: SecureFetchRequestOptions,
  requestId: string
): Promise<
  | {
    fingerprint: string;
    timestamp: string;
    method: string;
    body: any;
    xUrl: URL;
    path: string;
    signature: string;
    token: string;
    currentUsername: string;
    headers: Record<string, string>;
  }
  | undefined
> {
  // 1. 获取设备指纹
  const fingerprint = await getDeviceFingerprint();

  // 2. 构建请求头
  const timestamp = generateTimestamp();
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;
  const xUrl = new URL(endpoint, API_BASE_URL);

  // 添加语言参数到URL
  try {
    const currentLang =
      (await localStorageInstance.get('@settings/language1')) || 'en';
    xUrl.searchParams.set('x_language', currentLang);
  } catch (err) {
    // 如果获取语言设置失败，使用默认值
    xUrl.searchParams.set('x_language', 'en');
  }

  const path = xUrl.pathname;

  const currentTwitterId = await getCurrentTwitterId();

  // 3. 生成签名
  const signature = await generateSignature(
    method,
    path,
    timestamp,
    fingerprint,
    body,
    currentTwitterId
  );

  // 4. 获取token和用户名
  const token = await getAuthToken();
  const currentUsername = await getCurrentUsername();

  if (options && options.tokenRequired && !token) {
    return undefined;
  }

  // 5. 构建 headers
  const headers: Record<string, string> = {
    ...(window._getHeader(
      requestId,
      timestamp.toString(),
      fingerprint,
      signature,
      packageJson.version
    ) || {}),
    authorization: token ? `Token ${token}` : '',
    'Content-Type': 'application/json',
    'x-user-id': currentUsername,
    'x-window-location-href': window.location.href,
    ...(options.headers as Record<string, string>),
    ...(currentTwitterId ? { 'x-tw-id': currentTwitterId } : {}),
  };

  return {
    fingerprint,
    timestamp: timestamp.toString(),
    method: method as string,
    body,
    xUrl,
    path,
    signature,
    token,
    currentUsername,
    headers,
  };
}

// 公共的错误处理逻辑
function handleRequestError(
  error: any,
  endpoint: string,
  duration: number,
  eventName: string = 'secureFetchFailed'
) {
  throw error;
}

export async function secureFetch<T = any>(
  endpoint: string,
  options: SecureFetchRequestOptions = {}
): Promise<T> {
  // Check extension context before proceeding
  if (!checkExtensionContext()) {
    return Promise.resolve(undefined as any);
  }

  const requestId = buildRequestIdWithTwitterId();
  const originalSignal = options.signal;
  const startTime = performance.now();

  // 如果存在 signal，绑定取消事件
  if (originalSignal) {
    activeSignals.set(requestId, originalSignal);
    originalSignal.addEventListener('abort', () => {
      if (checkExtensionContext()) {
        try {
          chrome.runtime
            .sendMessage({
              type: 'CANCEL_REQUEST',
              requestId,
            })
            .catch(() => {
              // Silently handle promise rejection
            });
        } catch (error) {
          console.log(
            `[v${packageJson.version}] Failed to cancel request:`,
            error
          );
        }
      }
    });
  }

  try {
    const requestData = await prepareSecureRequest(
      endpoint,
      options,
      requestId
    );
    if (!requestData) return undefined as T;

    const { xUrl, method, headers, currentUsername } = requestData;

    // 构建请求配置
    const requestConfig = {
      url: xUrl.href,
      method,
      headers,
      body: options.body,
      requestId,
    };

    // 使用安全的消息发送方法
    const response = await new Promise<T>((resolve, reject) => {
      safeSendMessage({
        type: 'EXECUTE_REQUEST',
        ...requestConfig,
      })
        .then((backendResponse) => {
          const endTime = performance.now();
          const duration = Math.round(endTime - startTime);

          if (backendResponse?.error) {
            // Handle error - could be string or object with error structure
            if (typeof backendResponse.error === 'string') {
              if (backendResponse.error === '登录已过期') {
                clearAuthState();
              }
              const errorObj = new Error(
                `[v${packageJson.version}] ${backendResponse.error}`
              );
              // 保留原始响应用于上层解析
              (errorObj as any).originalResponse = backendResponse;
              reject(errorObj);
            } else if (
              backendResponse.error.error &&
              typeof backendResponse.error.error === 'string'
            ) {
              // Error is an object with structure: { error, message, limit, remaining }
              const errorData = backendResponse.error;
              const errorObj = new Error(
                `[v${packageJson.version}] ${errorData.error}`
              );
              (errorObj as any).errorDetails = {
                error: errorData.error,
                message: errorData.message || errorData.error,
                limit: errorData.limit,
                remaining: errorData.remaining,
              };
              (errorObj as any).originalResponse = backendResponse;
              reject(errorObj);
            } else {
              const errorObj = new Error(
                `[v${packageJson.version}] ${JSON.stringify(
                  backendResponse.error
                )}`
              );
              (errorObj as any).originalResponse = backendResponse;
              reject(errorObj);
            }
          } else if (backendResponse?.data) {
            // Check if the response data contains an error structure
            const data = backendResponse.data;
            if (data.error && typeof data.error === 'string') {
              // This is an error response with structure: { error, message, limit, remaining }
              const errorObj = new Error(
                `[v${packageJson.version}] ${data.error}`
              );
              // Attach additional error information
              (errorObj as any).errorDetails = {
                error: data.error,
                message: data.message || data.error,
                limit: data.limit,
                remaining: data.remaining,
              };
              reject(errorObj);
            } else {
              resolve(backendResponse.data);
            }
          } else {
            resolve(backendResponse.data);
          }
        })
        .catch((error) => {
          const endTime = performance.now();
          const duration = Math.round(endTime - startTime);

          if (
            error &&
            typeof error.message === 'string' &&
            error.message.includes('Extension context invalidated')
          ) {
            console.log(
              `[v${packageJson.version}] Extension context invalidated during API call`
            );
            resolve(undefined as any);
          } else {
            reject(error);
          }
        });
    });

    return response;
  } catch (error) {
    const cleaned = cleanErrorMessage(String(error));
    try {
      if (typeof cleaned === 'string' && cleaned.trim().endsWith('400-3')) {
        const lang =
          ((await localStorageInstance.get('@settings/language1')) as
            | 'en'
            | 'zh'
            | null) || 'en';

        const tipText =
          lang === 'zh'
            ? '系统时间异常，请检查本机时间与网络时间是否一致，然后重启浏览器后重试。'
            : 'System time appears incorrect. Please check that your system time matches network time, then restart the browser and try again.';

        await localStorageInstance.set('@xhunt/tips', {
          text: tipText,
          type: 'warning',
        });
      }
    } catch {
      // ignore tip errors
    }
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    handleRequestError(error, endpoint, duration, 'secureFetchFailed');
    return undefined as T;
    return undefined as T; // 添加明确的返回语句
  }
}

/**
 * 在content script中直接发起请求，不通过background script
 * 适用于需要流式响应或特殊处理的请求
 */
export async function secureFetchInContent<T = any>(
  endpoint: string,
  options: SecureFetchRequestOptions = {}
): Promise<T> {
  // Check extension context before proceeding
  if (!checkExtensionContext()) {
    return Promise.resolve(undefined as any);
  }

  const requestId = generateRequestId();
  const originalSignal = options.signal;
  const startTime = performance.now();

  // 如果存在 signal，绑定取消事件
  if (originalSignal) {
    activeSignals.set(requestId, originalSignal);
    originalSignal.addEventListener('abort', () => {
      if (checkExtensionContext()) {
        try {
          chrome.runtime
            .sendMessage({
              type: 'CANCEL_REQUEST',
              requestId,
            })
            .catch(() => {
              // Silently handle promise rejection
            });
        } catch (error) {
          console.log(
            `[v${packageJson.version}] Failed to cancel request:`,
            error
          );
        }
      }
    });
  }

  try {
    const requestData = await prepareSecureRequest(
      endpoint,
      options,
      requestId
    );
    if (!requestData) return undefined as T;

    const { xUrl, method, headers, currentUsername } = requestData;

    // 直接发起fetch请求
    const response = await fetch(xUrl.href, {
      method,
      headers,
      body: options.body,
      signal: options.signal,
    });

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthState();
        throw new Error('登录已过期');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 对于流式响应，直接返回response.body 1
    if (options.responseType === 'stream') {
      return response.body as T;
    }

    // 对于普通响应，解析JSON
    const data = await response.json();
    return data;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    handleRequestError(error, endpoint, duration, 'secureFetchInContentFailed');
    return undefined as T; // 添加明确的返回语句
  }
}
