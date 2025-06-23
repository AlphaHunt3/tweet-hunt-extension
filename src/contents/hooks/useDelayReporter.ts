import { useEffect, useRef } from 'react';
import { delayReporter, DelayRecorderInstance } from '~/utils/delayReporter';
import { secureFetch } from '~contents/utils/api';

/**
 * @deprecated 请使用 useSystemInitialization 替代
 * 这个 Hook 已被 useSystemInitialization 取代，提供更完整的系统初始化功能
 */
export function useDelayReporter() {
  const recorderInstanceRef = useRef<DelayRecorderInstance | null>(null);

  useEffect(() => {
    console.warn('⚠️ useDelayReporter is deprecated. Please use useSystemInitialization instead.');

    // 初始化延迟上报器，获取实例
    recorderInstanceRef.current = delayReporter.init(secureFetch);

    // 清理函数
    return () => {
      delayReporter.cleanup();
      recorderInstanceRef.current = null;
    };
  }, []);

  // 返回实例方法，供组件使用
  return {
    getInstance: () => recorderInstanceRef.current,
    getStats: () => recorderInstanceRef.current?.getStats() || { error: 'Not initialized' },
    flushAll: () => recorderInstanceRef.current?.flushAll() || Promise.resolve(),
    recordDelay: (record: any) => recorderInstanceRef.current?.recordDelay(record)
  };
}