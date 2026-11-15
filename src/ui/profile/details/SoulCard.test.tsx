import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pickReason, SoulCard, soulLevel } from './SoulCard';

const state = vi.hoisted(() => ({ skin: 'soft', lang: 'zh' }));

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: state.lang }),
}));
vi.mock('~/ui/skin/useUiSkin', () => ({
  useUiSkin: () => ({ skin: state.skin }),
}));

const DATA = {
  score: 87,
  profile_analysis: 90,
  content_analysis: 82,
  engagement_analysis: 76,
  xhunt_analysis: 88,
  kol_interaction: 84,
  reason: '原创内容占比高',
  reason_en: 'Mostly original posts',
  last_updated: '2026-11-10',
};

beforeEach(() => {
  state.skin = 'soft';
  state.lang = 'zh';
});

describe('soulLevel', () => {
  it('splits scores into three levels', () => {
    expect(soulLevel(87)).toEqual({ tone: 'up', key: 'soulLevelExcellent' });
    expect(soulLevel(60)).toEqual({ tone: 'warn', key: 'soulLevelGood' });
    expect(soulLevel(59)).toEqual({ tone: 'down', key: 'soulLevelLow' });
  });
});

describe('pickReason', () => {
  it('falls back to the other language when the current one is missing', () => {
    expect(pickReason({ reason_en: 'Only English' }, 'zh')).toBe('Only English');
    expect(pickReason({ reason: '只有中文' }, 'en')).toBe('只有中文');
    expect(pickReason(DATA, 'en')).toBe('Mostly original posts');
    expect(pickReason({}, 'zh')).toBe('');
  });
});

describe('SoulCard', () => {
  it('shows the radar, five meters, the level and the unit in the soft skin', () => {
    render(<SoulCard data={DATA} handle='mira_onchain' />);
    expect(screen.getByRole('img', { name: /soulRadarLabel/ })).toBeTruthy();
    expect(screen.getAllByRole('meter')).toHaveLength(5);
    expect(screen.getByText('soulLevelExcellent')).toBeTruthy();
    expect(screen.getByText('points')).toBeTruthy();
    expect(screen.getByText('@mira_onchain')).toBeTruthy();
    expect(screen.getByText('原创内容占比高')).toBeTruthy();
  });

  it('drops the radar and the handle in the native skin', () => {
    state.skin = 'native';
    render(<SoulCard data={DATA} handle='mira_onchain' />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getAllByRole('meter')).toHaveLength(5);
    expect(screen.queryByText('@mira_onchain')).toBeNull();
    expect(screen.getByText('soulIndex')).toBeTruthy();
  });

  it('shows the level as a pill without a unit in the obsidian skin', () => {
    state.skin = 'obsidian';
    const { container } = render(<SoulCard data={DATA} handle='mira_onchain' />);
    expect(container.querySelector('.xh-dpill')?.textContent).toBe('soulLevelExcellent');
    expect(screen.queryByText('points')).toBeNull();
  });

  it('keeps the footer when the update date is missing', () => {
    const { container } = render(<SoulCard data={{ ...DATA, last_updated: undefined }} handle='mira_onchain' />);
    expect(container.querySelector('.xh-dcard-foot')?.textContent).toContain('soulCardBasis');
    expect(container.querySelector('.xh-dcard-foot')?.textContent).not.toContain('detailUpdated');
  });
});
