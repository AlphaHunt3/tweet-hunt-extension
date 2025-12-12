// 工具函数：检查用户是否为老用户（在2025年12月29日前有效）

// 导入老用户名单（使用 require 因为文件是 CommonJS 格式）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const legacyUserListModule = require('~contents/constants/allActiveUserName_2025-11-16.js');
const legacyUserList: string[] = legacyUserListModule?.allActiveUserName || [];

// 截止日期：2025年12月29日 23:59:59
const LEGACY_USER_EXPIRY_DATE = new Date('2025-12-29T23:59:59.999Z');

/**
 * 检查用户是否为老用户且在有效期内
 * @param username 用户名
 * @returns 如果是老用户且在有效期内，返回 true
 */
export function isLegacyUserActive(
  username: string | null | undefined
): boolean {
  if (!username) {
    return false;
  }

  // 检查当前时间是否在有效期内
  const now = new Date();
  if (now > LEGACY_USER_EXPIRY_DATE) {
    return false;
  }

  // 检查用户名是否在老用户名单中（不区分大小写）
  return legacyUserList.some(
    (name) => name.toLowerCase() === username.toLowerCase()
  );
}
