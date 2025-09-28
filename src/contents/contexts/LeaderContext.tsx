// src/contents/contexts/LeaderContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { useLeaderElection } from '~contents/hooks/useLeaderElection.ts';

interface LeaderContextType {
  isLeader: boolean;
  pageId: string;
  hasUserInteracted: boolean;
}

const LeaderContext = createContext<LeaderContextType | undefined>(undefined);

interface LeaderProviderProps {
  children: ReactNode;
}

export function LeaderProvider({ children }: LeaderProviderProps) {
  const { isLeader, pageId, hasUserInteracted } = useLeaderElection();

  return (
    <LeaderContext.Provider value={{ isLeader, pageId, hasUserInteracted }}>
      {children}
    </LeaderContext.Provider>
  );
}

export function useLeader() {
  const context = useContext(LeaderContext);
  if (context === undefined) {
    throw new Error('useLeader must be used within a LeaderProvider');
  }
  return context;
}
