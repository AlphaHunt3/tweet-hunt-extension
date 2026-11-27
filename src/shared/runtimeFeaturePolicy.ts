export const REALTIME_SUBSCRIPTION_SETTING_KEY =
  'showRealtimeSubscription';

// 实时订阅目前使用人数极少且持续消耗服务器资源，暂时对所有用户强制关闭。
// 只在运行时覆盖，不修改用户存储值，后续恢复时无需迁移。
const FORCED_DISABLED_SETTING_KEYS = new Set<string>([
  REALTIME_SUBSCRIPTION_SETTING_KEY,
]);

export const isSettingForcedDisabled = (settingKey: string): boolean =>
  FORCED_DISABLED_SETTING_KEYS.has(settingKey);
