import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { FloatingPanelSettings, clampWidth } from './FloatingPanelSettings';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

describe('FloatingPanelSettings', () => {
  test('switches the mode and saves the width once the slider is released', async () => {
    const resets: unknown[] = [];
    const onReset = (event: Event) => resets.push((event as CustomEvent).detail);
    window.addEventListener('xhunt:reset-panel-position', onReset);
    render(<FloatingPanelSettings />);
    await userEvent.click(screen.getByTestId('settings-floating-mode-persistent'));
    expect(getMemoryValue('@xhunt/floatingPanelMode')).toBe('persistent');

    screen.getByRole('slider', { name: 'panelWidth' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(getMemoryValue('@xhunt/panelWidth')).toBe(350));
    expect(screen.getByText('350px')).toBeTruthy();
    await waitFor(() => expect(resets).toEqual([{ storageKey: 'fixed-twitter-panel', rightOffset: 30, y: 50 }]));
    window.removeEventListener('xhunt:reset-panel-position', onReset);
  });

  test('clamps widths to 300–400 in steps of 10', () => {
    expect([clampWidth(250), clampWidth(347), clampWidth('x'), clampWidth(999)]).toEqual([300, 350, 340, 400]);
  });
});
