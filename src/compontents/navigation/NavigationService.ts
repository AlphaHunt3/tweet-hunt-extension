// Singleton service for global navigation
import { createContext } from 'react';

export interface NavigationService {
  navigateTo: (
    panelId: string,
    route: string,
    props?: Record<string, any>
  ) => void;
  registerPanel: (
    panelId: string,
    navigateCallback: (route: string, props?: Record<string, any>) => void
  ) => void;
  unregisterPanel: (panelId: string) => void;
}

class NavigationServiceImpl implements NavigationService {
  private panels: Record<
    string,
    (route: string, props?: Record<string, any>) => void
  > = {};

  navigateTo(
    panelId: string,
    route: string,
    props?: Record<string, any>
  ): void {
    const navigateCallback = this.panels[panelId];
    if (navigateCallback) {
      navigateCallback(route, props);
    } else {
      // 静默处理面板未注册的警告，不输出到控制台
      // console.log(`Panel with ID "${panelId}" not registered`);
    }
  }

  registerPanel(
    panelId: string,
    navigateCallback: (route: string, props?: Record<string, any>) => void
  ): void {
    this.panels[panelId] = navigateCallback;
  }

  unregisterPanel(panelId: string): void {
    delete this.panels[panelId];
  }
}

// Create a singleton instance
export const navigationService = new NavigationServiceImpl();

// Create a React context for components that need direct access
export const NavigationServiceContext =
  createContext<NavigationService>(navigationService);

// Export a hook for easy access
export const useNavigationService = () => {
  return navigationService;
};
