import React, { createContext, useContext } from 'react';

interface PanelContextType {
  onMinimize?: () => void;
}

const PanelContext = createContext<PanelContextType>({});

export const PanelContextProvider: React.FC<{
  children: React.ReactNode;
  onMinimize?: () => void;
}> = ({ children, onMinimize }) => {
  return (
    <PanelContext.Provider value={{ onMinimize }}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanelContext = () => useContext(PanelContext);
