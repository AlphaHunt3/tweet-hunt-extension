import { useEffect, useRef } from 'react';
import { visibilityManager } from '~/utils/visibilityManager';
import { configManager } from '~/utils/configManager';
import { officialTagsManager } from '~/utils/officialTagsManager';
import { messageManager } from '~/utils/messageManager';
import useWaitForElement from './useWaitForElement';
import packageJson from '../../../package.json';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useLatest } from 'ahooks';
import { useI18n } from '~contents/hooks/i18n.ts';

export interface SystemInitializationStats {
  configManager: any;
  visibilityManager: any;
  officialTagsManager: any;
  messageManager: any;
}

/**
 * 系统初始化 Hook - 统一管理所有系统级组件的初始化
 * 包括：配置管理器、可见性管理器、官方标签管理器、消息管理器等
 */
export function useSystemInitialization() {
  // 等待页面主要内容加载完成后再初始化
  const mainElement = useWaitForElement('main[role]', [], 10000);
  const isInitializedRef = useRef(false);
  const [username] = useLocalStorage('@xhunt/current-username', '');
  // const userNameRef = useLatest(username);
  const { lang } = useI18n();
  const langRef = useLatest(lang);

  // 监听语言变化，更新官方标签管理器的语言设置
  useEffect(() => {
    if (isInitializedRef.current && lang) {
      // 确保语言是 'zh' 或 'en'
      const validLang = lang === 'en' ? 'en' : 'zh';
      officialTagsManager.updateLanguage(validLang);
    }
  }, [lang]);

  useEffect(() => {
    if (!mainElement || isInitializedRef.current) return;

    console.log(
      `🚀 [v${packageJson.version}] Starting system initialization...`
    );

    const initializeSystem = async () => {
      try {
        // 1. 初始化页面可见性管理器（最高优先级，其他模块依赖）
        console.log(
          `📱 [v${packageJson.version}] Initializing visibility manager...`
        );
        visibilityManager.init();

        // 2. 初始化配置管理器（高优先级，其他模块可能依赖配置）
        console.log(
          `⚙️ [v${packageJson.version}] Initializing config manager...`
        );
        await configManager.init();

        // 3. 初始化官方标签管理器
        console.log(
          `🏷️ [v${packageJson.version}] Initializing official tags manager...`
        );
        await officialTagsManager.init();

        // 确保使用当前语言
        if (langRef.current) {
          const validLang = langRef.current === 'en' ? 'en' : 'zh';
          await officialTagsManager.updateLanguage(validLang);
        }

        // 4. 初始化消息管理器
        console.log(
          `📨 [v${packageJson.version}] Initializing message manager...`
        );
        await messageManager.init();

        isInitializedRef.current = true;
        console.log(
          `✅ [v${packageJson.version}] System initialization completed successfully`
        );
      } catch (error) {
        console.log(
          `❌ [v${packageJson.version}] System initialization failed:`,
          error
        );
        isInitializedRef.current = false;
      }
    };

    // 执行初始化
    initializeSystem();

    // 清理函数
    return () => {
      // 清理所有系统组件
      console.log(
        `🧹 [v${packageJson.version}] Cleaning up system components...`
      );
      try {
        visibilityManager.cleanup();
        configManager.cleanup();
        officialTagsManager.cleanup();
        messageManager.cleanup();
      } catch (error) {
        console.log(
          `❌ [v${packageJson.version}] Error during cleanup:`,
          error
        );
      }

      isInitializedRef.current = false;
    };
  }, [mainElement]);

  // 返回系统组件的统计信息和实例
  return {
    isInitialized: isInitializedRef.current,

    // 获取各组件统计信息的方法
    getSystemStats: (): SystemInitializationStats => {
      try {
        return {
          configManager: configManager.getStats(),
          visibilityManager: visibilityManager.getStats(),
          officialTagsManager: officialTagsManager.getStats(),
          messageManager: messageManager.getStats(),
        };
      } catch (error) {
        console.log(
          `❌ [v${packageJson.version}] Error getting system stats:`,
          error
        );
        return {
          configManager: null,
          visibilityManager: null,
          officialTagsManager: null,
          messageManager: null,
        };
      }
    },

    // 获取配置的便捷方法
    getConfig: () => {
      try {
        return configManager.getConfig();
      } catch (error) {
        console.log(
          `❌ [v${packageJson.version}] Error getting config:`,
          error
        );
        return configManager.getConfig(); // 返回默认配置
      }
    },

    // 获取官方标签的便捷方法
    getOfficialTags: (username: string, lang?: 'zh' | 'en') => {
      try {
        return officialTagsManager.getUserTags(username, lang);
      } catch (error) {
        console.log(
          `❌ [v${packageJson.version}] Error getting official tags:`,
          error
        );
        return [];
      }
    },
  };
}
