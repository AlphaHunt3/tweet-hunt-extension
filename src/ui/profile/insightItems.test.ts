import { describe, expect, test } from 'vitest';
import { buildInsightItems, insightSummary, type InsightInput } from './insightItems';

const t = (key: string) => key;
const base: InsightInput = {
  t,
  isEnabled: () => true,
  hasWeb3: true,
  classification: 'person',
  isProject: false,
  soulScore: 87,
  hasSoul: true,
  mbti: 'INTJ',
  hasMbti: true,
  abilityNames: ['DeFi', '交易', '基建', '宏观'],
  showAbilityModel: true,
  mentions90: 18,
  return90: 0.352,
  deletedCount: 14,
  editedCount: 3,
  showEditInfo: true,
  renameCount: 2,
  membersCount: 0,
  showMembers: false,
  investorsCount: 0,
  totalFunding: 0,
  portfolioCount: 0,
  discussion1d: null,
  discussion1dTotal: 0,
  discussion7d: null,
  discussion7dTotal: 0,
};

describe('buildInsightItems', () => {
  test('lists a person in the canvas order with values, units and tones', () => {
    const items = buildInsightItems(base);
    expect(items.map((item) => item.key)).toEqual([
      'soul', 'mbti', 'ability', 'return90', 'mentions90', 'deleted', 'edited', 'renamed',
    ]);
    const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
    expect(byKey.soul).toMatchObject({ label: 'soulIndex', value: '87', unit: 'points' });
    expect(byKey.mbti).toMatchObject({ label: 'insightPersonality', longLabel: 'personalityType', value: 'INTJ' });
    expect(byKey.ability).toMatchObject({ value: 'DeFi · 交易 · 基建', long: true, longLabel: 'insightAbilityLong' });
    expect(byKey.return90).toMatchObject({ value: '+35.2%', tone: 'up' });
    expect(byKey.mentions90).toMatchObject({ value: '18', unit: 'insightUnitTokens', longLabel: 'insightMentionsLong' });
    expect(byKey.deleted).toMatchObject({ value: '14', tone: 'down' });
    expect(byKey.edited).toMatchObject({ value: '3', tone: 'warn' });
    expect(byKey.renamed).toMatchObject({ value: '2', unit: 'insightUnitTimes', label: 'renameInfo' });
  });

  test('hides items by setting and by missing data, like the old row', () => {
    const off = new Set(['showSoulIndex', 'showDelInfo']);
    const items = buildInsightItems({
      ...base,
      isEnabled: (key) => !off.has(key),
      hasMbti: false,
      showAbilityModel: false,
      return90: 0,
      mentions90: undefined,
      showEditInfo: false,
      renameCount: 0,
    });
    expect(items).toEqual([]);
  });

  test('token stats need web3 and a person; a negative return goes down', () => {
    expect(buildInsightItems({ ...base, hasWeb3: false }).map((item) => item.key)).not.toContain('return90');
    const project = buildInsightItems({ ...base, classification: 'project' });
    expect(project.map((item) => item.key)).not.toContain('mentions90');
    const loss = buildInsightItems({ ...base, return90: -0.12 }).find((item) => item.key === 'return90');
    expect(loss).toMatchObject({ value: '-12.0%', tone: 'down' });
  });

  test('project accounts add members, funding, portfolio and discussion', () => {
    const items = buildInsightItems({
      ...base,
      classification: 'project',
      isProject: true,
      membersCount: 5,
      showMembers: true,
      investorsCount: 3,
      totalFunding: 12_500_000,
      portfolioCount: 7,
      discussion1d: 42,
      discussion1dTotal: 4,
      discussion7d: 88,
      discussion7dTotal: 0,
    });
    const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
    expect(byKey.members.value).toBe('5');
    expect(byKey.investors.value).toBe('$12.5M');
    expect(byKey.portfolio.value).toBe('7');
    expect(byKey.discussion1d.value).toBe('42');
    expect(byKey.discussion7d).toBeUndefined();
    expect(buildInsightItems({ ...base, investorsCount: 3, totalFunding: 0 }).find((item) => item.key === 'investors')?.value).toBe('3');
  });
});

describe('insightSummary', () => {
  test('joins the first four items with their units', () => {
    expect(insightSummary(buildInsightItems(base))).toBe(
      'soulIndex 87points · insightPersonality INTJ · insightAbility DeFi · 交易 · 基建 · insightReturn90 +35.2%',
    );
  });
});
