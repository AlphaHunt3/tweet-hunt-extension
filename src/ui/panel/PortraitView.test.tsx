import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { PortraitView, soulTone } from './PortraitView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const soul = vi.hoisted(() => ({ value: { loading: false, data: undefined as any } }));
vi.mock('./useSoulInfo', () => ({ useSoulInfo: () => soul.value }));
vi.mock('~/compontents/InvestmentPanel.tsx', () => ({ InvestmentPanel: () => <p>investment</p> }));

const TW = {
  multiField: { cn: { fields: [{ DeFi: 86 }, { 交易: 78 }] } },
  multiFieldAi: { cn: { fields: [{ Agent: 91 }, { 低分: 40 }] } },
};
const MBTI = { mbti: 'INTJ', keyword: ['战略思维', '长期主义'], explanation: '理性、独立' };
const SOUL = {
  score: 87,
  profile_analysis: 90,
  content_analysis: 82,
  engagement_analysis: 76,
  xhunt_analysis: 88,
  kol_interaction: 84,
  reason: '原创比例高',
};

describe('PortraitView', () => {
  test('shows personality, abilities per domain and the soul index', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    soul.value = { loading: false, data: SOUL };
    render(<PortraitView twInfo={TW} mbti={MBTI} twitterId='42' rootData={null} />);
    expect(screen.getByText('INTJ')).toBeTruthy();
    expect(screen.getByText('战略思维')).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'DeFi' }).getAttribute('aria-valuenow')).toBe('86');
    await userEvent.click(screen.getByRole('radio', { name: 'AI' }));
    expect(screen.getByRole('meter', { name: 'Agent' })).toBeTruthy();
    expect(screen.queryByRole('meter', { name: '低分' })).toBeNull();
    expect(screen.getByText('87')).toBeTruthy();
    expect(screen.getByText('profileAnalysis')).toBeTruthy();
    expect(screen.getByText('原创比例高')).toBeTruthy();
  });

  test('hides cards without data and shows the soul index loading', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    soul.value = { loading: true, data: undefined };
    render(<PortraitView twInfo={{}} mbti={undefined} twitterId='42' rootData={null} />);
    expect(screen.queryByText('personalityType')).toBeNull();
    expect(screen.queryByText('kolAbilityModel')).toBeNull();
    expect(screen.getByRole('heading', { name: 'soulIndex' })).toBeTruthy();
    expect(document.querySelectorAll('.xh-skeleton').length).toBeGreaterThan(0);
  });

  test('keeps the investment panel for projects', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    soul.value = { loading: false, data: undefined };
    render(<PortraitView twInfo={{ basicInfo: { classification: 'project' } }} twitterId='' rootData={{ invested: [{}] }} />);
    expect(screen.getByText('investment')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'soulIndex' })).toBeNull();
  });

  test('colours the soul score by band', () => {
    expect([soulTone(85), soulTone(65), soulTone(30)]).toEqual(['up', 'warn', 'down']);
  });
});
