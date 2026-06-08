import React from 'react';
import { AiHotProjectsKOLs } from '../hotProjects/AiHotProjectsKOLs';
import ErrorBoundary from '../ErrorBoundary';

export interface AiHomeSidebarProps {
  className?: string;
}

export function AiHomeSidebar({ className = '' }: AiHomeSidebarProps) {
  return (
    <div
      className={`rounded-xl theme-border ${className}`}
      style={{
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'var(--border-color)',
        width: '350px',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ErrorBoundary name='AiHotProjectsKOLs'>
        <AiHotProjectsKOLs />
      </ErrorBoundary>
    </div>
  );
}

export default AiHomeSidebar;
