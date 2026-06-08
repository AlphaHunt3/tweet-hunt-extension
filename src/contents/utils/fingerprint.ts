// src/utils/fingerprint.ts

import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;

/**
 * 获取设备指纹（缓存一次）
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  const fp = await FingerprintJS.load();
  const result = await fp.get();

  // 32位十六进制字符串
  cachedFingerprint = result.visitorId;
  return cachedFingerprint;
}
