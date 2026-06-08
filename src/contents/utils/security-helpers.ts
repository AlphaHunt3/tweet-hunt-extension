// src/utils/security-helpers.ts

import { v4 as uuidv4 } from 'uuid';
import './security.js';

/**
 * 生成 UUID v4
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * 获取当前时间戳（毫秒）
 */
export function generateTimestamp(): number {
  return Date.now();
}

/**
 * 生成 HMAC-SHA256 签名
 * @param method - HTTP方法（GET/POST等）
 * @param path - 请求路径（不含查询参数）
 * @param timestamp - 时间戳
 * @param fingerprint - 设备指纹
 * @param body - 请求体（可选）
 */
export async function generateSignature(
  method: string,
  path: string,
  timestamp: number,
  fingerprint: string,
  body?: Record<string, any>,
  twId?: string
): Promise<string> {
  // NOTE: intentionally obfuscated for harder static analysis.
  // This preserves behavior while avoiding direct references to sensitive globals and algorithm strings.
  const _w = window as any;

  // Lazily construct property names to avoid readable string literals
  const _j = (...x: (string | number)[]) => x.join('');
  const _p = (n: number) => String.fromCharCode(n);

  // "_getPayload" and "_xhunt" constructed at runtime
  const _gp = _j(_p(95), _j('get', _j('Pay', 'load')));
  const _sk = _j(_p(95), _j('xh', _j('u', 'nt')));

  // Build algorithm descriptors without cleartext
  const _algH = _j(_p(72), _j('MA', _p(67))); // "HMAC"
  const _sha = _j(_p(83), _j('HA-', _j('25', _p(54)))); // "SHA-256"
  const _raw = _j(_p(114), _j('a', _p(119))); // "raw"
  const _sign = _j(_p(115), _j('ig', _p(110))); // "sign"

  // Obtain payload via indirection
  const payloadBase: string = _w[_gp](
    method,
    path,
    timestamp,
    fingerprint,
    body
  );
  const payload = twId ? `${payloadBase}|${twId}` : payloadBase;

  // Create key/data using TextEncoder without exposing the secret identifier
  const enc = new TextEncoder();
  const keyBytes = enc.encode(_w[_sk]);
  const dataBytes = enc.encode(payload);

  // SubtleCrypto access through bracket notation
  const subtle = _w['crypto']['subtle'] as SubtleCrypto;

  const cryptoKey = await subtle.importKey(
    _raw as 'raw',
    keyBytes,
    { name: _algH, hash: { name: _sha } },
    false,
    [_sign as 'sign']
  );

  const sigBuf = await subtle.sign(_algH, cryptoKey, dataBytes);
  const u8 = new Uint8Array(sigBuf);

  // Hex without obvious map/pad semantics
  let out = '';
  for (let i = 0; i < u8.length; i++) {
    const v = u8[i];
    const h = (v >>> 4).toString(16) + (v & 15).toString(16);
    out += h;
  }
  return out;
}

/**
 * 验证时间戳是否在有效期内（5分钟）
 */
export function isTimestampValid(timestamp: number): boolean {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return Math.abs(now - timestamp) <= fiveMinutes;
}

/**
 * 验证指纹格式
 */
export function isValidFingerprint(fingerprint: string): boolean {
  const fingerprintRegex = /^[a-f0-9]{32}$/i;
  return fingerprintRegex.test(fingerprint);
}

/**
 * 验证请求ID格式（UUID v4）
 */
export function isValidRequestId(requestId: string): boolean {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(requestId);
}
