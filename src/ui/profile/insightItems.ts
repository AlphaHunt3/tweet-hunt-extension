import { formatFunding, formatPercentage } from '~contents/utils';

export type InsightKey =
  | 'soul'
  | 'mbti'
  | 'ability'
  | 'return90'
  | 'mentions90'
  | 'deleted'
  | 'edited'
  | 'renamed'
  | 'members'
  | 'investors'
  | 'portfolio'
  | 'discussion1d'
  | 'discussion7d';

export type InsightTone = 'up' | 'down' | 'warn';

export interface InsightItem {
  key: InsightKey;
  label: string;
  longLabel: string;
  value: string;
  unit?: string;
  tone?: InsightTone;
  long?: boolean;
}

export interface InsightInput {
  t: (key: string) => string;
  isEnabled: (key: string) => boolean;
  hasWeb3: boolean;
  classification?: string | null;
  isProject?: boolean;
  soulScore?: number | null;
  hasSoul: boolean;
  mbti?: string | null;
  hasMbti: boolean;
  abilityNames: string[];
  showAbilityModel: boolean;
  mentions90?: number;
  return90?: number | null;
  deletedCount: number;
  editedCount: number;
  showEditInfo: boolean;
  renameCount: number;
  membersCount: number;
  showMembers: boolean;
  investorsCount: number;
  totalFunding?: number;
  portfolioCount: number;
  discussion1d?: number | string | null;
  discussion1dTotal: number;
  discussion7d?: number | string | null;
  discussion7dTotal: number;
}

export const WIDE_INSIGHTS: readonly InsightKey[] = ['deleted', 'edited'];

export function buildInsightItems(input: InsightInput): InsightItem[] {
  const { t, isEnabled } = input;
  const isPerson = input.classification === 'person';
  const items: InsightItem[] = [];
  const add = (item: Omit<InsightItem, 'longLabel'> & { longLabel?: string }) =>
    items.push({ ...item, longLabel: item.longLabel ?? item.label });

  if (isEnabled('showSoulIndex') && input.hasSoul) {
    add({ key: 'soul', label: t('soulIndex'), value: String(input.soulScore || 0), unit: t('points') });
  }
  if (isEnabled('showPersonalityType') && input.hasMbti) {
    add({
      key: 'mbti',
      label: t('insightPersonality'),
      longLabel: t('personalityType'),
      value: input.mbti || 'N/A',
    });
  }
  if (isEnabled('showKolAbilityModel') && input.showAbilityModel && input.abilityNames.length > 0) {
    add({
      key: 'ability',
      label: t('insightAbility'),
      longLabel: t('insightAbilityLong'),
      value: input.abilityNames.slice(0, 3).join(' · '),
      long: true,
    });
  }
  if (isEnabled('show90dPerformance') && input.hasWeb3 && isPerson && input.return90) {
    add({
      key: 'return90',
      label: t('insightReturn90'),
      value: `${input.return90 >= 0 ? '+' : ''}${formatPercentage(input.return90)}`,
      tone: input.return90 >= 0 ? 'up' : 'down',
    });
  }
  if (isEnabled('show90dMention') && input.hasWeb3 && isPerson && Number(input.mentions90)) {
    add({
      key: 'mentions90',
      label: t('insightMentions'),
      longLabel: t('insightMentionsLong'),
      value: String(input.mentions90),
      unit: t('insightUnitTokens'),
    });
  }
  if (isEnabled('showDelInfo') && input.deletedCount > 0) {
    add({ key: 'deleted', label: t('insightDeleted'), value: String(input.deletedCount), tone: 'down' });
  }
  if (input.showEditInfo && input.editedCount > 0) {
    add({ key: 'edited', label: t('insightEdited'), value: String(input.editedCount), tone: 'warn' });
  }
  if (isEnabled('showRenameInfo') && input.renameCount > 0) {
    add({ key: 'renamed', label: t('renameInfo'), value: String(input.renameCount), unit: t('insightUnitTimes') });
  }
  if (isEnabled('showProjectMembers') && !isPerson && input.showMembers) {
    add({ key: 'members', label: t('projectMembers'), value: String(input.membersCount) });
  }
  if (isEnabled('showInvestors') && input.investorsCount > 0) {
    add({
      key: 'investors',
      label: t('investors'),
      value: input.totalFunding ? formatFunding(input.totalFunding) : String(input.investorsCount),
    });
  }
  if (isEnabled('showPortfolio') && input.portfolioCount > 0) {
    add({ key: 'portfolio', label: t('portfolio'), value: String(input.portfolioCount) });
  }
  if (isEnabled('showDiscussion') && input.isProject) {
    if (input.discussion1d && input.discussion1dTotal > 0) {
      add({ key: 'discussion1d', label: t('discussion1d'), value: String(input.discussion1d) });
    }
    if (input.discussion7d && input.discussion7dTotal > 0) {
      add({ key: 'discussion7d', label: t('discussion7d'), value: String(input.discussion7d) });
    }
  }
  return items;
}

export function insightSummary(items: InsightItem[]) {
  return items
    .slice(0, 4)
    .map((item) => `${item.label} ${item.value}${item.unit ?? ''}`)
    .join(' · ');
}
