import { useEffect, useRef } from 'react';
import { globalErrorHandler } from '~/utils/errorHandler';
import { visibilityManager } from '~/utils/visibilityManager';
import { configManager } from '~/utils/configManager';
import { delayReporter } from '~/utils/delayReporter';
import { officialTagsManager } from '~/utils/officialTagsManager';
import { setDelayRecorderInstance } from '~contents/utils/api.ts';
import useWaitForElement from './useWaitForElement';
import packageJson from '../../../package.json';

export interface SystemInitializationStats {
  errorHandler: any;
  delayReporter: any;
  configManager: any;
  visibilityManager: any;
  officialTagsManager: any;
}

/**
 * 系统初始化 Hook - 统一管理所有系统级组件的初始化
 * 包括：错误处理器、延迟监控器、配置管理器、可见性管理器、官方标签管理器等
 */
export function useSystemInitialization() {
  // 等待页面主要内容加载完成后再初始化
  const mainElement = useWaitForElement('main[role]', [], 10000);
  const delayReporterInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!mainElement || isInitializedRef.current) return;

    console.log(`🚀 [v${packageJson.version}] Starting system initialization...`);

    let errorHandlerTimer: NodeJS.Timeout | null = null;
    let errorCaptureHandler: ((event: CustomEvent) => void) | null = null;

    const initializeSystem = async () => {
      try {
        // 1. 初始化页面可见性管理器（最高优先级，其他模块依赖）
        console.log(`📱 [v${packageJson.version}] Initializing visibility manager...`);
        visibilityManager.init();

        // 2. 初始化配置管理器（高优先级，其他模块可能依赖配置）
        console.log(`⚙️ [v${packageJson.version}] Initializing config manager...`);
        await configManager.init();

        // 3. 初始化官方标签管理器（新增）
        console.log(`🏷️ [v${packageJson.version}] Initializing official tags manager...`);
        await officialTagsManager.init();

        // 4. 初始化延迟监控器（需要 secureFetch 引用）
        console.log(`📊 [v${packageJson.version}] Initializing delay reporter...`);
        const { secureFetch } = await import('~contents/utils/api.ts');
        const delayReporterInstance = delayReporter.init(secureFetch);
        delayReporterInstanceRef.current = delayReporterInstance;

        // 5. 设置全局延迟记录器实例，供 secureFetch 使用
        if (delayReporterInstance) {
          setDelayRecorderInstance(delayReporterInstance);
          console.log(`🔗 [v${packageJson.version}] Delay recorder instance linked to secureFetch`);
        }

        // 6. 延迟初始化错误处理器（确保页面完全加载）
        errorHandlerTimer = setTimeout(() => {
          console.log(`🛡️ [v${packageJson.version}] Initializing error handler...`);
          globalErrorHandler.init();
        }, 1000);

        // 7. 监听错误事件，可以在这里添加上报逻辑
        errorCaptureHandler = (event: CustomEvent) => {
          const errorInfo = event.detail;
          
          // 开发环境下的额外处理
          if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
            console.log('📊 Error captured for reporting:', errorInfo);
          }
        };

        window.addEventListener('xhunt:error-captured', errorCaptureHandler as EventListener);

        isInitializedRef.current = true;
        console.log(`✅ [v${packageJson.version}] System initialization completed successfully`);

      } catch (error) {
        console.error(`❌ [v${packageJson.version}] System initialization failed:`, error);
        isInitializedRef.current = false;
      }
    };

    // 执行初始化
    initializeSystem();

    // 清理函数
    return () => {
      if (errorHandlerTimer) {
        clearTimeout(errorHandlerTimer);
      }
      
      if (errorCaptureHandler) {
        window.removeEventListener('xhunt:error-captured', errorCaptureHandler as EventListener);
      }
      
      // 清理所有系统组件
      console.log(`🧹 [v${packageJson.version}] Cleaning up system components...`);
      try {
        globalErrorHandler.cleanup();
        visibilityManager.cleanup();
        configManager.cleanup();
        officialTagsManager.cleanup();
        delayReporter.cleanup();
      } catch (error) {
        console.error(`❌ [v${packageJson.version}] Error during cleanup:`, error);
      }
      
      isInitializedRef.current = false;
    };
  }, [mainElement]);

  // 返回系统组件的统计信息和实例
  return {
    isInitialized: isInitializedRef.current,
    delayReporterInstance: delayReporterInstanceRef.current,
    
    // 获取各组件统计信息的方法
    getSystemStats: (): SystemInitializationStats => {
      try {
        return {
          errorHandler: globalErrorHandler.getErrorStats(),
          delayReporter: delayReporter.getStats(),
          configManager: configManager.getStats(),
          visibilityManager: visibilityManager.getStats(),
          officialTagsManager: officialTagsManager.getStats()
        };
      } catch (error) {
        console.error(`❌ [v${packageJson.version}] Error getting system stats:`, error);
        return {
          errorHandler: null,
          delayReporter: null,
          configManager: null,
          visibilityManager: null,
          officialTagsManager: null
        };
      }
    },

    // 手动错误捕获方法
    captureError: (error: Error | string, context?: Record<string, any>) => {
      try {
        globalErrorHandler.captureCustomError(error, context);
      } catch (captureError) {
        console.error(`❌ [v${packageJson.version}] Error capturing custom error:`, captureError);
      }
    },
    
    // 获取配置的便捷方法
    getConfig: () => {
      try {
        return configManager.getConfig();
      } catch (error) {
        console.error(`❌ [v${packageJson.version}] Error getting config:`, error);
        return configManager.getConfig(); // 返回默认配置
      }
    },

    // 获取官方标签的便捷方法
    getOfficialTags: (username: string) => {
      try {
        return officialTagsManager.getUserTags(username);
      } catch (error) {
        console.error(`❌ [v${packageJson.version}] Error getting official tags:`, error);
        return [];
      }
    },
    
    // 强制刷新所有数据的方法
    flushAll: async () => {
      try {
        if (delayReporterInstanceRef.current) {
          await delayReporterInstanceRef.current.flushAll();
        }
        await globalErrorHandler.flushAll();
        console.log(`🚀 [v${packageJson.version}] All system data flushed successfully`);
      } catch (error) {
        console.error(`❌ [v${packageJson.version}] Error flushing system data:`, error);
      }
    }
  };
}