// src/contents/constants/events.ts

/**
 * 自定义事件常量
 */
export const CUSTOM_EVENTS = {
  // 实时订阅相关事件
  REALTIME_FEED_UPDATE: 'realtime-feed-update',

  // 声音播放事件
  PLAY_CONFIGURED_SOUND: 'play-configured-sound',

  // 其他自定义事件可以在这里添加
  // USER_ACTION: 'user-action',
  // DATA_UPDATE: 'data-update',
} as const;

export type CustomEventType =
  (typeof CUSTOM_EVENTS)[keyof typeof CUSTOM_EVENTS];
