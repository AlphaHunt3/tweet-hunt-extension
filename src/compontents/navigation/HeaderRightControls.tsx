import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { Bell, GripVertical, CircleX } from 'lucide-react';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { messageManager } from '~/utils/messageManager';

interface HeaderRightControlsProps {
  onOpenSettings?: () => void;
  onOpenMessages?: () => void;
  onClose?: () => void;
}

export const HeaderRightControls: React.FC<HeaderRightControlsProps> = ({
  onOpenSettings,
  onOpenMessages,
  onClose,
}) => {
  const { t } = useI18n();
  const { navigateTo } = useNavigation();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  // const [isCheckingMessages, setIsCheckingMessages] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Initialize message manager only once per mount
    if (!messageManager.getState().messages.length && !initializedRef.current) {
      initializedRef.current = true;
      messageManager.init();
    }

    const removeCallback = messageManager.addCallback((state) => {
      setHasUnreadMessages(state.hasUnread);
      // setIsCheckingMessages(state.isLoading);
      if (!initialCheckDone && !state.isLoading) {
        setInitialCheckDone(true);
      }
    });

    return () => {
      removeCallback();
    };
  }, [initialCheckDone]);

  const handleOpenSettings = () => {
    if (onOpenSettings) return onOpenSettings();
    navigateTo('/settings');
  };

  const handleOpenMessages = () => {
    if (onOpenMessages) return onOpenMessages();
    navigateTo('/messages');
    if (hasUnreadMessages) {
      messageManager.markAllAsRead();
    }
    setInitialCheckDone(false);
  };

  const showUnreadDot = initialCheckDone && hasUnreadMessages;

  return (
    <div className='flex items-center gap-1'>
      {/* Settings Button */}
      <button
        onClick={handleOpenSettings}
        className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer'
        title={t('settings')}
      >
        <svg
          viewBox='0 0 1024 1024'
          version='1.1'
          xmlns='http://www.w3.org/2000/svg'
          p-id='5703'
          width='17'
          height='17'
          className='fill-current theme-text-secondary'
        >
          <path
            d='M547.4 926.1h-67.2c-44 0-81.9-32.8-88.2-76.3l-3.1-21.2c-0.3-2.2-1.7-3.9-3.8-4.8-2.9-1.2-5.2-1-7 0.3L362 836.3c-35.3 26.6-85.4 23.1-116.7-8.1L198.1 781c-31.2-31.2-34.7-81.4-8.1-116.7l12-15.9c1.3-1.7 1.6-4 0.7-6.1 0-0.1-0.8-2-0.9-2.1-0.8-2-2.6-3.4-4.7-3.7l-19.9-2.8c-43.8-6.1-76.8-44.1-76.8-88.2v-66.8c0-44.2 33-82.1 76.7-88.2l19.7-2.8c2.1-0.3 3.9-1.7 4.7-3.7 0.1-0.2 0.8-1.9 0.8-2 0.9-2.1 0.6-4.4-0.7-6.1l-12.1-16.1c-26.6-35.3-23.1-85.5 8.1-116.7L245 196c31.2-31.2 81.4-34.7 116.6-8.1l16 12.1c1.7 1.3 4 1.5 6.1 0.7 0.1-0.1 1.9-0.8 2-0.8 1.9-0.8 3.3-2.6 3.6-4.7l2.8-20.1c6.1-43.8 44-76.7 88.2-76.7h66.8c44.2 0 82.1 33 88.2 76.7l2.8 20.1c0.3 2.1 1.7 3.9 3.8 4.7 0.1 0.1 1.9 0.8 2 0.8 1.9 0.8 4.2 0.5 5.9-0.7l17.2-12.9c35.1-26.3 85.2-22.7 116.3 8.4l47.5 47.5c31.1 31.1 34.7 81.1 8.4 116.3l-13.1 17.5c-1.3 1.7-1.5 4-0.6 6.1l0.8 2c0.3 0.7 2.1 2.1 4.2 2.4l21.4 3.1c43.5 6.3 76.3 44.2 76.3 88.2v67.2c0 44-32.8 81.9-76.3 88.2l-21.7 3.1c-2.1 0.3-3.9 1.7-4.8 3.8-1.1 2.7-0.9 5 0.4 6.7l13 17.4c26.3 35.2 22.7 85.2-8.4 116.3L783 828.8c-31.1 31.1-81.1 34.7-116.3 8.4l-17.4-13c-1.7-1.3-4-1.5-6.1-0.6-2.8 1.2-4.2 3-4.5 5.1l-3.1 21.2c-6.3 43.4-44.2 76.2-88.2 76.2zM381.9 740.2c11.7 0 23.4 2.3 34.5 6.9 29.4 12.3 50 38.8 54.5 69.6l3.1 21.2c0.4 3.1 3.1 5.4 6.2 5.4h67.2c3.1 0 5.8-2.3 6.2-5.4l3.1-21.3c4.5-30.8 25.1-57.3 53.8-69.3 29.6-12.4 63.2-8.3 88.3 10.4l17.4 13c2.4 1.8 6 1.6 8.2-0.6l47.5-47.5c2.2-2.2 2.4-5.7 0.6-8.2l-13-17.3c-18.8-25.1-22.8-58.7-10.6-87.8 12.2-29.2 38.8-49.8 69.5-54.2L840 552c3.1-0.4 5.4-3.1 5.4-6.2v-67.2c0-3.1-2.3-5.8-5.4-6.2l-21.4-3.1c-30.8-4.5-57.3-25.1-69.3-53.9-12.3-29.4-8.2-63 10.5-88.1l13.1-17.5c1.9-2.5 1.6-6-0.6-8.2L724.9 254c-2.2-2.2-5.8-2.4-8.2-0.6l-17.2 12.9c-25.1 18.8-58.8 22.8-87.7 10.6-30.4-12.6-51.1-39.3-55.4-70.3l-2.8-20.1c-0.4-3.1-3.1-5.4-6.3-5.4h-66.8c-3.1 0-5.8 2.3-6.2 5.4l-2.8 20.1c-4.3 31-25 57.8-54 69.8-30.7 12.9-64.4 8.7-89.5-10.3L312 254c-2.5-1.8-6-1.6-8.2 0.6l-47.2 47.2c-2.2 2.2-2.5 5.8-0.6 8.3l12.1 16c19 25.2 23.2 58.9 11 88-12.6 30.6-39.4 51.4-70.5 55.7l-19.7 2.8c-3.1 0.4-5.4 3.1-5.4 6.2v66.8c0 3.1 2.3 5.8 5.5 6.3l19.9 2.8c31 4.4 57.7 25 69.8 54 13 30.8 8.8 64.5-10.2 89.8l-12 15.9c-1.9 2.5-1.6 6.1 0.6 8.3l47.2 47.2c2.2 2.2 5.8 2.4 8.2 0.6l16.2-12.2c15.2-12 34.1-18.1 53.2-18.1z'
            fill='currentColor'
            p-id='5704'
          ></path>
          <path
            d='M514.3 664.2c-83.8 0-152-68.2-152-152.1s68.2-152 152-152 152.1 68.2 152.1 152-68.2 152.1-152.1 152.1z m0-221.3c-38.2 0-69.2 31.1-69.2 69.3s31.1 69.3 69.2 69.3c38.2 0 69.3-31.1 69.3-69.3s-31.1-69.3-69.3-69.3z'
            fill='currentColor'
            p-id='5705'
          ></path>
        </svg>
      </button>

      {/* Messages Button */}
      <button
        onClick={handleOpenMessages}
        className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer relative'
        title={t('messages')}
      >
        <Bell className='w-4 h-4 theme-text-secondary' />
        {showUnreadDot && (
          <div className='absolute -top-0.5 -right-0.5 w-2 h-2'>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-red-500'></span>
          </div>
        )}
      </button>

      {/* Drag Handle */}
      <div className='tw-hunt-drag-handle p-1.5 rounded-full theme-hover cursor-grab active:cursor-grabbing'>
        <GripVertical className='w-4 h-4 theme-text-secondary' />
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer'
          onClick={onClose}
        >
          <CircleX className='w-4 h-4 theme-text-secondary' />
        </button>
      )}
    </div>
  );
};

export default HeaderRightControls;
