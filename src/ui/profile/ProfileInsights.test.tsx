import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import type { InsightItem } from './insightItems';
import { ProfileInsights } from './ProfileInsights';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const ITEMS: InsightItem[] = [
  { key: 'soul', label: '灵魂指数', longLabel: '灵魂指数', value: '87', unit: '分' },
  { key: 'mbti', label: '性格', longLabel: '性格类型', value: 'INTJ' },
  { key: 'edited', label: '改帖', longLabel: '改帖', value: '3', tone: 'warn' },
];

function renderInsights(overrides: Partial<Parameters<typeof ProfileInsights>[0]> = {}) {
  const props = {
    items: ITEMS,
    loading: false,
    expanded: true,
    onExpandedChange: vi.fn(),
    renderDetail: vi.fn((key: string) => <p>详情：{key}</p>),
    onOpenItem: vi.fn(),
    narrative: <p>叙事一行</p>,
    ...overrides,
  };
  render(<ProfileInsights {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

test('soft shows a card with a header, label-over-value tiles and the narrative inside', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  renderInsights();
  const card = await screen.findByRole('region', { name: 'insightsTitle' });
  expect(within(card).getByText('insightsSubtitle', { exact: false })).toBeTruthy();
  const soul = within(card).getByRole('button', { name: /灵魂指数\s*87分/ });
  expect(soul.textContent).toBe('灵魂指数87分');
  expect(within(card).getByRole('button', { name: /性格类型/ })).toBeTruthy();
  expect(within(card).getByText('叙事一行')).toBeTruthy();
});

test('obsidian shows label-then-value chips with a dot on the soul index', async () => {
  renderInsights();
  const group = await screen.findByRole('group', { name: 'insightsTitle' });
  const soul = within(group).getByRole('button', { name: /灵魂指数/ });
  expect(soul.querySelector('.xh-chip-dot')).toBeTruthy();
  expect(within(group).getByRole('button', { name: /性格\s*INTJ/ })).toBeTruthy();
  expect(screen.getByText('叙事一行').closest('[role="group"]')).toBeNull();
});

test('native shows value-then-caption text and only colours the return', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  renderInsights();
  const group = await screen.findByRole('group', { name: 'insightsTitle' });
  const edited = within(group).getByRole('button', { name: /3\s*改帖/ });
  expect(edited.querySelector('b')?.getAttribute('data-tone')).toBeNull();
});

test('hovering an item shows its detail and reports it; moving to another switches the shared popover', async () => {
  const props = renderInsights();
  await userEvent.hover(await screen.findByRole('button', { name: /改帖/ }));
  expect(await screen.findByText('详情：edited')).toBeTruthy();
  expect(props.onOpenItem).toHaveBeenCalledWith('edited');
  await userEvent.unhover(screen.getByRole('button', { name: /改帖/ }));
  await userEvent.hover(screen.getByRole('button', { name: /性格/ }));
  expect(await screen.findByText('详情：mbti')).toBeTruthy();
  expect(screen.queryByText('详情：edited')).toBeNull();
});

test('a press opens an item too, and Escape closes it', async () => {
  renderInsights();
  await userEvent.click(await screen.findByRole('button', { name: /性格/ }));
  expect(await screen.findByText('详情：mbti')).toBeTruthy();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByText('详情：mbti')).toBeNull());
});

test('collapse and expand keep the old test ids, labels and aria-expanded', async () => {
  const props = renderInsights();
  const collapse = await screen.findByTestId('profile-insights-collapse-button');
  expect(collapse.getAttribute('aria-expanded')).toBe('true');
  expect(collapse.textContent).toContain('collapse');
  await userEvent.click(collapse);
  expect(props.onExpandedChange).toHaveBeenCalledWith(false);
});

test('collapsed shows a one-line summary and a more button', async () => {
  const props = renderInsights({ expanded: false });
  expect(await screen.findByText('灵魂指数 87分 · 性格 INTJ · 改帖 3')).toBeTruthy();
  const expand = screen.getByTestId('profile-insights-expand-button');
  expect(expand.getAttribute('aria-expanded')).toBe('false');
  expect(expand.textContent).toContain('profileInsightsMore');
  await userEvent.click(expand);
  expect(props.onExpandedChange).toHaveBeenCalledWith(true);
});

test('loading shows a skeleton; no items still shows the narrative', () => {
  const { unmount } = render(
    <ProfileInsights items={ITEMS} loading expanded onExpandedChange={() => {}} renderDetail={() => null} />,
  );
  expect(document.querySelector('.xh-insight-skeleton')).toBeTruthy();
  unmount();
  render(
    <ProfileInsights
      items={[]}
      loading={false}
      expanded
      onExpandedChange={() => {}}
      renderDetail={() => null}
      narrative={<p>只有叙事</p>}
    />,
  );
  expect(screen.getByText('只有叙事')).toBeTruthy();
  expect(screen.queryByTestId('profile-insights-collapse-button')).toBeNull();
});
