// 通知事件类型
export interface NotificationClickEvent {
  type: 'NOTIFICATION_CLICKED';
  dataType: 'bnb' | 'gossip';
  data: any;
}

// 事件监听器类型
export type NotificationEventListener = (event: NotificationClickEvent) => void;

class NotificationEventManager {
  private listeners: NotificationEventListener[] = [];

  // 添加事件监听器
  addEventListener(listener: NotificationEventListener) {
    this.listeners.push(listener);
  }

  // 移除事件监听器
  removeEventListener(listener: NotificationEventListener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 发送事件
  dispatchEvent(event: NotificationClickEvent) {
    // 立即处理所有已注册的监听器
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error in notification event listener:', error);
      }
    });
  }

  // 清理所有监听器
  clear() {
    this.listeners = [];
  }
}

// 创建单例实例
export const notificationEventManager = new NotificationEventManager();

// 事件常量
export const NOTIFICATION_EVENTS = {
  CLICKED: 'NOTIFICATION_CLICKED' as const,
} as const;
