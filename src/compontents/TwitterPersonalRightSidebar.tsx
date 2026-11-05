import React from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { PersonalAnalysisPanel } from './PersonalAnalysisPanel';
import { useCrossPageSettings } from '~utils/settingsManager';
import { LoginRequired } from './LoginRequired';
import ErrorBoundary from './ErrorBoundary';

export interface TwitterPersonalRightSidebarProps {
  userId: string;
  newTwitterData: any;
  loadingTwInfo: boolean;
  className?: string;
}

export function TwitterPersonalRightSidebar({
  userId,
  newTwitterData,
  loadingTwInfo,
  className = '',
}: TwitterPersonalRightSidebarProps) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const { isEnabled } = useCrossPageSettings();

  if (!isEnabled('showSearchPanel')) {
    return null;
  }

  return (
    <div
      data-theme={theme}
      className={`rounded-xl ${className}`}
      key={`${currentUsername}-${theme}-personal-right-sidebar`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* 内容区域 */}
      <div className='personal-sidebar-content'>
        <LoginRequired showInCenter={true}>
          <ErrorBoundary name='PersonalAnalysisPanel'>
            <PersonalAnalysisPanel
              userId={userId}
              newTwitterData={newTwitterData}
              loadingTwInfo={loadingTwInfo}
            />
          </ErrorBoundary>
        </LoginRequired>
      </div>
    </div>
  );
}
