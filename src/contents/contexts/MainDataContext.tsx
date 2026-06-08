import React, { createContext, useContext } from 'react';
import useMainData, { MainData } from '../hooks/useMainData';

const MainDataContext = createContext<MainData | null>(null);

export function MainDataProvider({ children }: { children: React.ReactNode }) {
  const mainData = useMainData();

  return (
    <MainDataContext.Provider value={mainData}>
      {children}
    </MainDataContext.Provider>
  );
}

export function useMainDataContext(): MainData {
  const ctx = useContext(MainDataContext);
  if (!ctx) {
    // Fall back to running the hook directly if provider is missing
    return useMainData();
  }
  return ctx;
}
