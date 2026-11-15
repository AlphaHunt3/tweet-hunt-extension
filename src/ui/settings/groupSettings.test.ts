import { describe, expect, test } from 'vitest';
import { groupSettings } from './groupSettings';

const LISTS = {
  nameRight: [
    { key: 'showInvestors', label: 'showInvestors' },
    { key: 'show90dMention', label: 'show90dMention' },
  ],
  followedRight: [
    { key: 'showReviews', label: 'showReviews' },
    { key: 'showFqRank', label: 'showFqRank' },
    { key: 'showFqRankAi', label: 'showFqRankAi' },
  ],
};

const keys = (items: Array<{ key: string }>) => items.map((item) => item.key);

describe('groupSettings', () => {
  test('moves domain-only items out of the profile page group', () => {
    const groups = groupSettings(LISTS, null);
    expect(keys(groups.profilePage)).toEqual(['showInvestors', 'showReviews', 'showSearchPanel', 'showNotes', 'showOfficialTags']);
    expect(keys(groups.web3OnlySettings)).toContain('show90dMention');
    expect(keys(groups.aiOnlySettings)).toContain('showFqRankAi');
    expect(keys(groups.others)).toEqual(['showSidebarIcon', 'showTokenAnalysis', 'showTweetAIAnalysis', 'showAiDetectButton']);
    expect(keys(groups.avatarSettings)).toEqual(['showAvatarRank']);
    expect(groups.homeRightSidebar).toEqual([]);
  });

  test('shows gated items to testers only', () => {
    const config = { testConfig: { features: ['showNotes', 'showHotVote'], testers: ['mira'] } };
    expect(keys(groupSettings(LISTS, config).profilePage)).not.toContain('showNotes');
    expect(keys(groupSettings(LISTS, config, 'mira').profilePage)).toContain('showNotes');
    expect(keys(groupSettings(LISTS, config, 'someone').web3OnlySettings)).not.toContain('showHotVote');
  });
});
