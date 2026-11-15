import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { ProfileTagline } from './ProfileTagline';

const mocks = vi.hoisted(() => {
  const state = { stored: '', settings: {} as Record<string, boolean>, own: null as Element | null };
  return {
    state,
    getUserNote: vi.fn(async () => ({ note: state.stored })),
    saveUserNote: vi.fn(async ({ note }: { note: string }) => {
      state.stored = note;
      return {};
    }),
    getTwitterAuthUrl: vi.fn(async () => ({ url: 'https://x.com/i/oauth' })),
    openNewTab: vi.fn(),
    setTips: vi.fn(),
  };
});

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~utils/settingsManager.ts', () => ({
  useCrossPageSettings: () => ({ isEnabled: (key: string) => mocks.state.settings[key] ?? true }),
}));
vi.mock('~contents/hooks/useCurrentUrl', () => ({ default: () => 'https://x.com/mira_onchain' }));
vi.mock('~contents/hooks/useWaitForElement', () => ({ default: () => mocks.state.own }));
vi.mock('~/utils/officialTagsManager', () => ({
  officialTagsManager: { init: async () => {}, getUserTags: () => ['研究员', 'DeFi'] },
}));
vi.mock('~contents/services/notes.ts', () => ({
  getUserNote: mocks.getUserNote,
  saveUserNote: mocks.saveUserNote,
}));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: mocks.getTwitterAuthUrl }));
vi.mock('~contents/utils', () => ({ openNewTab: mocks.openNewTab }));
vi.mock('~compontents/area/GlobalTips.tsx', () => ({ useGlobalTips: () => [null, mocks.setTips] }));

beforeEach(() => {
  mocks.state.stored = '';
  mocks.state.settings = {};
  mocks.state.own = null;
  vi.clearAllMocks();
});

test('shows the official tags and a short note button in obsidian', async () => {
  render(<ProfileTagline handle='mira_onchain' twitterId='42' />);
  expect(await screen.findByText('研究员 · DeFi')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'note' })).toBeTruthy();
});

test('settings hide the tags, and your own profile hides the note', async () => {
  mocks.state.settings = { showOfficialTags: false };
  const { unmount } = render(<ProfileTagline handle='mira_onchain' />);
  await screen.findByRole('button', { name: 'note' });
  expect(screen.queryByText('研究员 · DeFi')).toBeNull();
  unmount();

  mocks.state.settings = {};
  mocks.state.own = document.createElement('a');
  render(<ProfileTagline handle='mira_onchain' />);
  await screen.findByText('研究员 · DeFi');
  expect(screen.queryByRole('button', { name: /note|profileNoteAdd/ })).toBeNull();
});

test('saves a note from the editor with Enter and then shows it', async () => {
  setMemoryValue('@xhunt/token', 'tok');
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  render(<ProfileTagline handle='mira_onchain' />);
  await userEvent.click(await screen.findByRole('button', { name: 'profileNoteAdd' }));
  const dialog = await screen.findByRole('dialog', { name: 'profileNoteEditorTitle' });
  const input = within(dialog).getByRole('textbox', { name: 'note' }) as HTMLInputElement;
  await userEvent.type(input, '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十多出来的字');
  expect(input.value).toHaveLength(30);
  expect(within(dialog).getByText('30/30')).toBeTruthy();
  await userEvent.clear(input);
  await userEvent.type(input, '靠谱研究员{Enter}');
  await waitFor(() =>
    expect(mocks.saveUserNote).toHaveBeenCalledWith(
      expect.objectContaining({ handle: 'mira_onchain', note: '靠谱研究员' }),
    ),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByRole('button', { name: 'profileNoteEditLabel：靠谱研究员' })).toBeTruthy();
  expect(mocks.setTips).toHaveBeenCalledWith({ text: 'noteSaveSuccess', type: 'suc' });
});

test('Escape closes the editor without saving', async () => {
  setMemoryValue('@xhunt/token', 'tok');
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  render(<ProfileTagline handle='mira_onchain' />);
  await userEvent.click(await screen.findByRole('button', { name: 'profileNoteAdd' }));
  const dialog = await screen.findByRole('dialog', { name: 'profileNoteEditorTitle' });
  await userEvent.type(within(dialog).getByRole('textbox', { name: 'note' }), '草稿{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(mocks.saveUserNote).not.toHaveBeenCalled();
});

test('asks to log in when signed out', async () => {
  render(<ProfileTagline handle='mira_onchain' />);
  await userEvent.click(await screen.findByRole('button', { name: 'note' }));
  const dialog = await screen.findByRole('dialog', { name: 'profileNoteEditorTitle' });
  expect(within(dialog).getByText('loginRequired2')).toBeTruthy();
  await userEvent.click(within(dialog).getByRole('button', { name: 'profileLoginWithX' }));
  await waitFor(() => expect(mocks.openNewTab).toHaveBeenCalledWith('https://x.com/i/oauth'));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
