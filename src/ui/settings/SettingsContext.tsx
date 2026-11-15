import { createContext, useContext, type ReactNode } from 'react';

export interface SettingState {
  get: boolean;
  set: (value: boolean) => void;
}

export type RealtimeMode = 'SSE' | 'Polling' | 'Inactive';

interface SettingsContextValue {
  settingStates: Record<string, SettingState>;
  realtimeMode: RealtimeMode;
}

const SettingsContext = createContext<SettingsContextValue>({ settingStates: {}, realtimeMode: 'Inactive' });

export function SettingsProvider({ value, children }: { value: SettingsContextValue; children: ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}
