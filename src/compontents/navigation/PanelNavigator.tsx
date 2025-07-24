import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { navigationService } from './NavigationService';

// Define route types
export interface Route {
  path: string;
  component: React.ReactNode; // 改为ReactNode，直接接受组件实例
  showBackButton?: boolean;
}

// Navigation context
interface NavigationContextType {
  currentRoute: string;
  navigateTo: (path: string) => void;
  goBack: () => void;
  history: string[];
}

const NavigationContext = createContext<NavigationContextType>({
  currentRoute: '/home',
  navigateTo: () => {
    console.log('Navigating to')
  },
  goBack: () => {},
  history: ['/home']
});

// Hook to use navigation
export const useNavigation = () => useContext(NavigationContext);

interface PanelNavigatorProps {
  routes: Record<string, {
    path: string;
    component: React.ReactNode; // 改为ReactNode，直接接受组件实例
    showBackButton?: boolean;
  }>;
  initialRoute?: string;
  children?: ReactNode;
}

export const PanelNavigator: React.FC<PanelNavigatorProps> = ({
  routes,
  initialRoute = '/home'
}) => {
  const [history, setHistory] = useState<string[]>([initialRoute]);
  const panelId = 'main-panel'; // Unique ID for this panel

  const currentRoute = history[history.length - 1];

  // Update history when initialRoute changes
  useEffect(() => {
    setHistory([initialRoute]);
  }, [initialRoute]);

  const navigateTo = useCallback((path: string) => {
    if (routes[path]) {
      setHistory(prev => [...new Set([...prev, path])]);
    } else {
      console.log(`Route "${path}" not found`);
    }
  }, [routes]);

  const goBack = useCallback(() => {
    if (history.length > 1) {
      setHistory(prev => prev.slice(0, prev.length - 1));
    }
  }, [history]);

  // Register this panel with the navigation service
  useEffect(() => {
    navigationService.registerPanel(panelId, navigateTo);

    return () => {
      navigationService.unregisterPanel(panelId);
    };
  }, [navigateTo]);

  const value = {
    currentRoute,
    navigateTo,
    goBack,
    history
  };

  // Get the current route configuration
  const currentRouteConfig = routes[currentRoute];

  // If there's a matching route, render its component
  if (currentRouteConfig) {
    return (
      <NavigationContext.Provider value={value}>
        <div className="flex flex-col h-full max-h-[calc(90vh-80px)] overflow-hidden">
          {currentRouteConfig.component}
        </div>
      </NavigationContext.Provider>
    );
  }

  // Fallback to home route if current route not found
  const fallbackRoute = routes['/home'];
  if (fallbackRoute) {
    return (
      <NavigationContext.Provider value={value}>
        <div className="flex flex-col h-full max-h-[calc(90vh-80px)] overflow-hidden">
          {fallbackRoute.component}
        </div>
      </NavigationContext.Provider>
    );
  }

  // If no routes at all, render empty div
  return <div>No routes defined</div>;
};

// Header component with back button
interface PanelHeaderProps {
  title: React.ReactNode;
  showBackButton?: boolean;
  rightContent?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  showBackButton = false,
  rightContent
}) => {
  const { goBack, history } = useNavigation();

  return (
    <div className="sticky top-0 z-50 theme-bg-secondary theme-border border-b flex items-center justify-between p-3">
      <div className="flex items-center gap-2">
        {showBackButton && history.length > 1 && (
          <button
            onClick={goBack}
            className="p-1 rounded-full theme-hover transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="theme-text-primary"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <h2 className="text-sm font-semibold theme-text-primary">{title}</h2>
      </div>
      {rightContent}
    </div>
  );
};
