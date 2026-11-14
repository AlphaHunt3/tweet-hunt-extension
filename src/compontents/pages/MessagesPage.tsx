import React, { useEffect, useRef } from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { Loader2 } from 'lucide-react';
import { InAppMessages } from '~/compontents/InAppMessages.tsx';
import { messageManager } from '~/utils/messageManager';
import { PanelPageHeader } from '~/ui/shells/PanelPageHeader';

interface MessagesPageProps {
  showBackButton?: boolean;
  onClose?: () => void;
  loading?: boolean;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  showBackButton = true,
  onClose,
  loading = false,
}) => {
  const { t } = useI18n();
  const { lang } = useI18n();
  const langRef = useRef(lang);

  // Update message manager language when user language changes
  useEffect(() => {
    if (lang && lang !== langRef.current) {
      langRef.current = lang;
      messageManager.updateLanguage(lang as 'zh' | 'en');
    }
  }, [lang]);

  // Mark all messages as read when viewing the messages page
  React.useEffect(() => {
    messageManager.markAllAsRead();
  }, []);

  return (
    <>
      <PanelPageHeader title={`XHunt ${t('messages')}`} showBack={showBackButton} onClose={onClose} />

      {loading ? (
        <div className='flex-1 flex flex-col items-center justify-center min-h-[300px]'>
          <Loader2 className='w-8 h-8 text-blue-400 animate-spin mb-2' />
          <p className='text-sm text-blue-400'>{t('loading')}</p>
        </div>
      ) : (
        <div
          data-xhunt-testid='messages-page'
          className='flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden'
        >
          <InAppMessages />
        </div>
      )}
    </>
  );
};
