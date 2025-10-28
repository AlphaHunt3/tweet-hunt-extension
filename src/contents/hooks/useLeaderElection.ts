// src/contents/hooks/useLeaderElection.ts

import { useEffect, useState } from 'react';

const LEADER_LIST_KEY = 'xhunt_leader_list';
const PAGE_ID_KEY = 'xhunt_page_id';

/**
 * Leader 竞选 Hook
 * 使用 sessionStorage 管理 leader 列表，最后一个注册的成为 leader
 * 要求用户交互后才能成为 leader，确保音频上下文被激活
 */
export function useLeaderElection() {
  const [isLeader, setIsLeader] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [pageId] = useState(
    () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // 检测用户交互并激活音频上下文，同时注册到leader列表
  useEffect(() => {
    const activateAudioContextAndRegister = async () => {
      if (hasUserInteracted) return;

      try {
        // 播放静音音频来激活音频上下文
        const silentAudio = new Audio();
        silentAudio.src =
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        silentAudio.volume = 0;

        await silentAudio.play();
        silentAudio.pause();

        setHasUserInteracted(true);
        console.log(
          '[LeaderElection] Audio context activated by user interaction'
        );

        // 用户交互后注册到leader列表
        registerPage();
      } catch (error) {
        // console.log(
        //   '[LeaderElection] Failed to activate audio context:',
        //   error
        // );
      }
    };

    // 监听用户交互事件
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        activateAudioContextAndRegister();
      }
    };

    // 添加事件监听器 - 只保留真正有效的用户交互事件
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, {
      once: true,
    });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  // 注册当前页面到 leader 列表
  const registerPage = () => {
    try {
      const leaderList = JSON.parse(
        localStorage.getItem(LEADER_LIST_KEY) || '[]'
      );
      const currentPage = { id: pageId, timestamp: Date.now() };

      // 清理过期的页面注册（超过5分钟的）
      const now = Date.now();
      const validPages = leaderList.filter(
        (page: any) => now - page.timestamp < 5 * 60 * 1000
      );

      // 添加当前页面到列表
      validPages.push(currentPage);

      // 保存到 localStorage
      localStorage.setItem(LEADER_LIST_KEY, JSON.stringify(validPages));
      localStorage.setItem(PAGE_ID_KEY, pageId);

      // 检查是否为 leader（列表中的最后一个）
      const isCurrentLeader = validPages[validPages.length - 1].id === pageId;
      setIsLeader(isCurrentLeader);

      console.log(
        '[Content] Registered page:',
        pageId,
        'isLeader:',
        isCurrentLeader
      );
    } catch (error) {
      console.log('[Content] Failed to register page:', error);
    }
  };

  // 注销当前页面
  const unregisterPage = () => {
    try {
      const leaderList = JSON.parse(
        localStorage.getItem(LEADER_LIST_KEY) || '[]'
      );
      const updatedList = leaderList.filter((page: any) => page.id !== pageId);
      localStorage.setItem(LEADER_LIST_KEY, JSON.stringify(updatedList));
      console.log('[Content] Unregistered page:', pageId);
    } catch (error) {
      console.log('[Content] Failed to unregister page:', error);
    }
  };

  // 监听其他页面的注册（通过 storage 事件）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LEADER_LIST_KEY && e.newValue) {
        const updatedList = JSON.parse(e.newValue);
        const isCurrentLeader =
          updatedList[updatedList.length - 1]?.id === pageId;
        setIsLeader(isCurrentLeader);
        console.log('[Content] Leader status updated:', isCurrentLeader);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pageId]);

  // 心跳机制：每30秒更新一次注册时间（只有已注册的页面才需要心跳）
  useEffect(() => {
    if (!hasUserInteracted) return;

    const heartbeatInterval = setInterval(() => {
      try {
        const leaderList = JSON.parse(
          localStorage.getItem(LEADER_LIST_KEY) || '[]'
        );
        const updatedList = leaderList.map((page: any) =>
          page.id === pageId ? { ...page, timestamp: Date.now() } : page
        );
        localStorage.setItem(LEADER_LIST_KEY, JSON.stringify(updatedList));
      } catch (error) {
        console.log('[LeaderElection] Heartbeat failed:', error);
      }
    }, 30 * 1000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [hasUserInteracted, pageId]);

  // 页面卸载时注销
  useEffect(() => {
    const handleBeforeUnload = () => {
      unregisterPage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unregisterPage();
    };
  }, [pageId]);

  return {
    isLeader,
    pageId,
    hasUserInteracted,
  };
}
