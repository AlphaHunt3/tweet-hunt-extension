import { useState, type ReactNode } from 'react';
import { SettingsProvider, type RealtimeMode } from '~/ui/settings/SettingsContext';

export function SettingsHarness({
  initial,
  realtimeMode = 'Inactive',
  children,
}: {
  initial: Record<string, boolean>;
  realtimeMode?: RealtimeMode;
  children: ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const settingStates = Object.fromEntries(
    Object.entries(values).map(([key, get]) => [
      key,
      { get, set: (value: boolean) => setValues((previous) => ({ ...previous, [key]: value })) },
    ]),
  );
  return <SettingsProvider value={{ settingStates, realtimeMode }}>{children}</SettingsProvider>;
}
