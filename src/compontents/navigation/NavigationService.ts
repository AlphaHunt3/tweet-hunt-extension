// Singleton service for global navigation
import { createContext } from 'react';

export interface NavigationService {
  navigateTo: (
    panelId: string,
    route: string,
    props?: Record<string, any>,
  ) => void;
  registerPanel: (
    panelId: string,
    navigateCallback: (route: string, props?: Record<string, any>) => void,
  ) => void;
  unregisterPanel: (panelId: string) => void;
  getPanelHistory: (panelId: string) => string[] | undefined;
  savePanelHistory: (panelId: string, history: string[]) => void;
  clearPanelHistory: (panelId: string) => void;
}

class NavigationServiceImpl implements NavigationService {
  private panels: Record<
    string,
    (route: string, props?: Record<string, any>) => void
  > = {};

  private getStorageKey(panelId: string): string {
    return `@xhunt/navigation/${panelId}/history`;
  }

  private getSessionStorage(): Storage | undefined {
    try {
      if (typeof window === 'undefined') return undefined;
      return window.sessionStorage;
    } catch {
      return undefined;
    }
  }

  navigateTo(
    panelId: string,
    route: string,
    props?: Record<string, any>,
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
    navigateCallback: (route: string, props?: Record<string, any>) => void,
  ): void {
    this.panels[panelId] = navigateCallback;
  }

  unregisterPanel(panelId: string): void {
    delete this.panels[panelId];
  }

  getPanelHistory(panelId: string): string[] | undefined {
    try {
      const storage = this.getSessionStorage();
      const rawHistory = storage?.getItem(this.getStorageKey(panelId));
      if (!rawHistory) return undefined;

      const history = JSON.parse(rawHistory);
      if (!Array.isArray(history)) return undefined;

      return history.filter(
        (route): route is string => typeof route === 'string',
      );
    } catch {
      return undefined;
    }
  }

  savePanelHistory(panelId: string, history: string[]): void {
    try {
      const storage = this.getSessionStorage();
      if (!storage) return;

      storage.setItem(
        this.getStorageKey(panelId),
        JSON.stringify(history.filter((route) => typeof route === 'string')),
      );
    } catch { }
  }

  clearPanelHistory(panelId: string): void {
    try {
      this.getSessionStorage()?.removeItem(this.getStorageKey(panelId));
    } catch { }
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
