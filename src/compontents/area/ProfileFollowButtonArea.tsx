import React, { useRef } from 'react';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import cssText from 'data-text:~/css/style.css';
import { MainData } from '~contents/hooks/useMainData.ts';
import { Sparkles } from 'lucide-react';
import { AI_CHAT_EVENT } from './AiChatDialog.tsx';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab, windowGtag } from '~contents/utils';
import { useLockFn } from 'ahooks';

function _ProfileFollowButtonArea(mainData: MainData) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="placementTracking"]',
    useSiblings: true,
    siblingsPosition: 'beforebegin',
    styleText: cssText,
  });

  const [token] = useLocalStorage('@xhunt/token', '');
  const isLoggedIn = !!token;

  const redirectToLogin = useLockFn(async () => {
    windowGtag('event', 'login');
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
    }
  });

  const handleAskXHuntClick = () => {
    if (!isLoggedIn) {
      redirectToLogin();
      return;
    }
    // 确保buttonRef.current存在
    if (!buttonRef.current) {
      console.log('Button ref not found');
      return;
    }

    // 触发AI聊天事件
    const event = new CustomEvent(AI_CHAT_EVENT, {
      detail: {
        userId: mainData.userId,
        element: buttonRef.current,
      },
    });
    window.dispatchEvent(event);
  };

  // 只有在有userId时才返回内容视图
  if (!mainData.userId || !shadowRoot) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        marginRight: 8,
        marginBottom: 12,
      }}
      className='theme-bg-primary'
    >
      <button
        ref={buttonRef}
        onClick={handleAskXHuntClick}
        className='w-[36px] h-[36px] border xhunt-ask-border bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 hover:bg-gradient-to-r hover:from-purple-50 hover:via-pink-50 hover:to-blue-50 rounded-full transition-all duration-500 flex items-center justify-center relative group backdrop-blur-sm'
        title='Ask XHunt'
      >
        <Sparkles className='w-4 h-4 xhunt-ask-icon' />
        <span className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap'>
          Ask XHunt
        </span>
      </button>
    </div>,
    shadowRoot
  );
}

export const ProfileFollowButtonArea = React.memo(_ProfileFollowButtonArea);
