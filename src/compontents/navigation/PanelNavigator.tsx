import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useDebounceFn } from 'ahooks';
import { navigationService } from './NavigationService';

const panelId = 'main-panel'; // Unique ID for this panel

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
    console.log('Navigating to');
  },
  goBack: () => {},
  history: ['/home'],
});

// Hook to use navigation
export const useNavigation = () => useContext(NavigationContext);

interface PanelNavigatorProps {
  routes: Record<
    string,
    {
      path: string;
      component: React.ReactNode; // 改为ReactNode，直接接受组件实例
      showBackButton?: boolean;
    }
  >;
  initialRoute?: string;
  children?: ReactNode;
  layout?: (content: ReactNode) => ReactNode;
}

export const PanelNavigator: React.FC<PanelNavigatorProps> = ({
  routes,
  initialRoute = '/home',
  layout,
}) => {
  const [history, setHistory] = useState<string[]>(() => {
    const storedHistory = navigationService
      .getPanelHistory(panelId)
      ?.filter((route) => !!routes[route]);

    return storedHistory?.length ? storedHistory : [initialRoute];
  });
  const previousInitialRouteRef = React.useRef(initialRoute);
  const pendingPayloadRef = React.useRef<{
    route: string;
    props?: Record<string, any>;
  } | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const currentRoute = history[history.length - 1];

  // Update history when initialRoute changes, but keep the user's restored route
  useEffect(() => {
    const previousInitialRoute = previousInitialRouteRef.current;
    if (previousInitialRoute === initialRoute) return;

    previousInitialRouteRef.current = initialRoute;
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      return last === previousInitialRoute ? [initialRoute] : prev;
    });
  }, [initialRoute]);

  // Remember current navigation stack for the current tab session
  useEffect(() => {
    navigationService.savePanelHistory(panelId, history);
  }, [history]);

  const navigateTo = useCallback(
    (path: string) => {
      if (routes[path]) {
        // 仅当目标路由不是当前路由时再更新；并确保每个路由在历史中只保留一个实例
        setHistory((prev) => {
          const last = prev[prev.length - 1];
          if (last === path) return prev;
          const withoutTarget = prev.filter((p) => p !== path);
          return [...withoutTarget, path];
        });
      }
    },
    [routes],
  );

  const goBack = useCallback(() => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, prev.length - 1));
    }
  }, [history]);

  // Handle pending payload: scroll and notify, then clear
  const flushPendingPayload = useCallback(() => {
    const payload = pendingPayloadRef.current;
    if (payload && payload.route === currentRoute) {
      try {
        const props = payload.props || {};
        const scrollToId = (props as any).scrollToId as string | undefined;
        const scrollToSelector = (props as any).scrollToSelector as
          | string
          | undefined;
        const container = contentRef.current;
        let target: Element | null = null;
        if (container) {
          if (scrollToId) {
            try {
              target = container.querySelector(
                `#${scrollToId.replace(/([^a-zA-Z0-9_\-])/g, '\\$1')}`,
              );
            } catch {}
          }
          if (!target && scrollToSelector) {
            try {
              target = container.querySelector(scrollToSelector);
            } catch {}
          }
        }
        if (target && 'scrollIntoView' in target) {
          try {
            (target as any).scrollIntoView({
              // behavior: 'smooth',
              // block: 'start',
            });
          } catch {}
        }
        if (typeof (props as any).onArrive === 'function') {
          try {
            (props as any).onArrive();
          } catch {}
        }
      } catch {}

      try {
        window.dispatchEvent(
          new CustomEvent('xhunt:route-enter', { detail: payload }),
        );
      } catch {}
      pendingPayloadRef.current = null;
    }
  }, [currentRoute]);

  // Debounced flush to wait for panel open/layout settle
  const { run: debouncedFlushPendingPayload } = useDebounceFn(
    () => {
      flushPendingPayload();
    },
    { wait: 400, trailing: true, leading: !!contentRef.current },
  );

  // Register this panel with the navigation service
  useEffect(() => {
    // Wrap to capture props and then navigate
    const navigateWithProps = (route: string, props?: Record<string, any>) => {
      try {
        window.dispatchEvent(
          new CustomEvent('xhunt:route-request', { detail: { route, props } }),
        );
      } catch {}
      if (props) {
        pendingPayloadRef.current = { route, props };
      }
      if (route === currentRoute) {
        // 当前已在目标路由：延迟一帧处理，确保节点已挂载
        try {
          requestAnimationFrame(() => debouncedFlushPendingPayload());
        } catch {
          debouncedFlushPendingPayload();
        }
      } else {
        navigateTo(route);
      }
    };

    navigationService.registerPanel(panelId, navigateWithProps);
    try {
      window.dispatchEvent(
        new CustomEvent('xhunt:panel-registered', { detail: panelId }),
      );
    } catch {}

    return () => {
      navigationService.unregisterPanel(panelId);
    };
  }, [navigateTo]);

  // Emit an event when entering a route with pending payload
  useEffect(() => {
    try {
      requestAnimationFrame(() => debouncedFlushPendingPayload());
    } catch {
      debouncedFlushPendingPayload();
    }
  }, [currentRoute, debouncedFlushPendingPayload]);

  const value = {
    currentRoute,
    navigateTo,
    goBack,
    history,
  };

  const routeConfig = routes[currentRoute] ?? routes['/home'];
  if (!routeConfig) return <div>No routes defined</div>;

  const content = (
    <div
      ref={contentRef}
      key={currentRoute}
      data-route={currentRoute}
      className={
        layout
          ? 'panel-route-content xh-rise flex min-h-0 flex-1 flex-col'
          : 'panel-route-content flex flex-col h-full max-h-[calc(90vh-80px)] overflow-hidden'
      }
    >
      {routeConfig.component}
    </div>
  );

  return (
    <NavigationContext.Provider value={value}>
      {layout ? layout(content) : content}
    </NavigationContext.Provider>
  );
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
  rightContent,
}) => {
  const { goBack, history } = useNavigation();

  return (
    <div className='sticky top-0 z-50 theme-bg-secondary theme-border border-b flex items-center justify-between p-3'>
      <div className='flex items-center gap-2'>
        {showBackButton && history.length > 1 && (
          <button
            data-xhunt-testid='panel-back-button'
            onClick={goBack}
            className='p-1 rounded-full theme-hover transition-colors'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='theme-text-primary'
            >
              <path d='m15 18-6-6 6-6' />
            </svg>
          </button>
        )}
        <h2 className='text-sm font-semibold theme-text-primary'>{title}</h2>
      </div>
      {rightContent}
    </div>
  );
};
