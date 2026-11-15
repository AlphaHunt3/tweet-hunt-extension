import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbilityCard, abilityEntries } from './AbilityCard';

const state = vi.hoisted(() => ({ skin: 'soft' }));

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh' }),
}));
vi.mock('~/ui/skin/useUiSkin', () => ({
  useUiSkin: () => ({ skin: state.skin }),
}));

const WEB3 = {
  abilities: [{ DeFi: 86 }, { 二级交易: 78 }, { 宏观: 71 }, { Meme: 64 }],
  summary: '偏 DeFi 与二级交易',
  updateTime: '2026-11-01',
};
const AI = { abilities: [{ 'AI Agent': 91 }, { 模型评测: 'oops' }], summary: '', updateTime: null };
const EMPTY = { abilities: [], summary: '', updateTime: null };

beforeEach(() => {
  state.skin = 'soft';
});

describe('abilityEntries', () => {
  it('reads the name and clamps the score, treating bad scores as 0', () => {
    expect(abilityEntries(AI).map(({ name, score }) => [name, score])).toEqual([
      ['AI Agent', 91],
      ['模型评测', 0],
    ]);
  });
});

describe('AbilityCard', () => {
  it('draws a radar and one meter per ability when there are at least three', () => {
    render(<AbilityCard handle='mira' web3={WEB3} ai={AI} domain='web3' onDomainChange={() => {}} />);
    expect(screen.getByRole('img', { name: /abilityRadarLabel/ })).toBeTruthy();
    expect(screen.getAllByRole('meter')).toHaveLength(4);
    expect(screen.getByText('偏 DeFi 与二级交易')).toBeTruthy();
  });

  it('shows only meters for one or two abilities and keeps the footer without a summary', () => {
    const { container } = render(<AbilityCard handle='mira' web3={WEB3} ai={AI} domain='ai' onDomainChange={() => {}} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getAllByRole('meter')).toHaveLength(2);
    expect(container.querySelector('.xh-dcard-foot')?.textContent).toContain('abilityCardBasis');
  });

  it('switches the domain through the segmented control', async () => {
    const onDomainChange = vi.fn();
    render(<AbilityCard handle='mira' web3={WEB3} ai={AI} domain='web3' onDomainChange={onDomainChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'domainAi' }));
    expect(onDomainChange).toHaveBeenCalledWith('ai');
  });

  it('shows the domain as text when only one domain has data', () => {
    render(<AbilityCard handle='mira' web3={WEB3} ai={EMPTY} domain='ai' onDomainChange={() => {}} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText('domainWeb3')).toBeTruthy();
    expect(screen.getAllByRole('meter')).toHaveLength(4);
  });

  it('leaves out the radar in the native skin', () => {
    state.skin = 'native';
    render(<AbilityCard handle='mira' web3={WEB3} ai={AI} domain='web3' onDomainChange={() => {}} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('kolAbilityModel')).toBeTruthy();
  });
});
