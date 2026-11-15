import { render, screen, waitFor } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { NarrativeLine } from './NarrativeLine';
import { ProfileTagline } from './ProfileTagline';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~utils/settingsManager.ts', () => ({ useCrossPageSettings: () => ({ isEnabled: () => true }) }));
vi.mock('~contents/hooks/useCurrentUrl', () => ({ default: () => 'https://x.com/mira_onchain' }));
vi.mock('~contents/hooks/useWaitForElement', () => ({ default: () => null }));
vi.mock('~/utils/officialTagsManager', () => ({
  officialTagsManager: { init: async () => {}, getUserTags: () => ['研究员', 'DeFi'] },
}));
vi.mock('~contents/services/notes.ts', () => ({
  getUserNote: async () => ({ note: '' }),
  saveUserNote: async () => ({}),
}));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: async () => ({ url: '' }) }));
vi.mock('~contents/utils', () => ({ openNewTab: () => {} }));
vi.mock('~compontents/area/GlobalTips.tsx', () => ({ useGlobalTips: () => [null, () => {}] }));

const agent = createAgent();

test('an agent can find the note control by name in every skin', async () => {
  setMemoryValue('@xhunt/token', 'tok');
  for (const [skin, label] of [
    ['soft', 'profileNoteAdd'],
    ['obsidian', 'note'],
    ['native', 'profileNoteAdd'],
  ] as const) {
    setMemoryValue(UI_SKIN_STORAGE_KEY, skin);
    const { unmount } = render(
      <>
        <ProfileTagline handle='mira_onchain' />
        <NarrativeLine narrative={{ cn: '长期跟踪再质押与链上收益策略。' }} />
      </>,
    );
    await waitFor(() => expect(screen.getByText('研究员 · DeFi')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: label })).toBeTruthy());
    const components = agent.snapshot().filter((entry) => !entry.offPage);
    for (const entry of components) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    expect(components.map((entry) => entry.label)).toContain(label);
    unmount();
  }
});
