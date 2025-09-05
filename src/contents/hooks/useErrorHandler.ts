import { useEffect } from 'react';
import { globalErrorHandler } from '~/utils/errorHandler';
import { visibilityManager } from '~/utils/visibilityManager';
import { configManager } from '~/utils/configManager';
import useWaitForElement from './useWaitForElement';

/**
 * @deprecated 请使用 useSystemInitialization 替代
 * 这个 Hook 已被 useSystemInitialization 取代，提供更完整的系统初始化功能
 */
export function useErrorHandler() {
  // 等待页面主要内容加载完成后再初始化错误处理器
  const mainElement = useWaitForElement('main[role]', [], 10000);

  useEffect(() => {
    if (!mainElement) return;

    console.log('⚠️ useErrorHandler is deprecated. Please use useSystemInitialization instead.');

    // 初始化页面可见性管理器
    visibilityManager.init();

    // 初始化配置管理器（优先级最高，其他模块可能依赖配置）
    configManager.init();

    // 页面加载完成后初始化错误处理器
    const initTimer = setTimeout(() => {
      globalErrorHandler.init();
    }, 1000); // 延迟1秒确保页面完全加载

    // 监听错误事件，可以在这里添加上报逻辑
    const handleErrorCapture = (event: CustomEvent) => {
      const errorInfo = event.detail;

      // 开发环境下的额外处理
      if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
        console.log('📊 Error captured for reporting:', errorInfo);
      }
    };

    window.addEventListener('xhunt:error-captured', handleErrorCapture as EventListener);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('xhunt:error-captured', handleErrorCapture as EventListener);
      // 清理错误处理器
      globalErrorHandler.cleanup();
      // 清理可见性管理器
      visibilityManager.cleanup();
      // 清理配置管理器
      configManager.cleanup();
    };
  }, [mainElement]);

  // 返回手动错误捕获方法，供组件使用
  return {
    captureError: globalErrorHandler.captureCustomError.bind(globalErrorHandler),
    getErrorStats: globalErrorHandler.getErrorStats.bind(globalErrorHandler),
    getReporterStats: globalErrorHandler.getReporterStats.bind(globalErrorHandler),
    clearErrors: globalErrorHandler.clearErrorQueue.bind(globalErrorHandler),
    getConfigStats: configManager.getStats.bind(configManager),
    getVisibilityStats: visibilityManager.getStats.bind(visibilityManager)
  };
}
