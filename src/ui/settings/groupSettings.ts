export interface SettingItem {
  key: string;
  label: string;
}

export interface SettingGroups {
  others: SettingItem[];
  avatarSettings: SettingItem[];
  profilePage: SettingItem[];
  homeRightSidebar: SettingItem[];
  web3OnlySettings: SettingItem[];
  aiOnlySettings: SettingItem[];
}

interface SettingsConfigLists {
  nameRight: SettingItem[];
  followedRight: SettingItem[];
}

interface TestConfig {
  testConfig?: { features?: string[]; testers?: string[] };
}

const WEB3_ONLY = new Set([
  'show90dMention',
  'show90dPerformance',
  'showFqRank',
  'showCnRank',
  'showEnInfluenceRank',
  'showProjectRank',
]);
const AI_ONLY = new Set(['showFqRankAi', 'showCnRankAi', 'showEnInfluenceRankAi', 'showProjectRankAi']);

const item = (key: string, label = key): SettingItem => ({ key, label });

export function groupSettings(
  lists: SettingsConfigLists,
  config: TestConfig | null | undefined,
  username?: string,
): SettingGroups {
  const features = config?.testConfig?.features ?? [];
  const testers = config?.testConfig?.testers ?? [];
  const isTester = username ? testers.includes(username) : false;
  const gated = new Set(features);
  const visible = (items: SettingItem[]) => items.filter((entry) => !gated.has(entry.key) || isTester);

  return {
    others: visible([
      item('showSidebarIcon'),
      item('showTokenAnalysis'),
      item('showTweetAIAnalysis'),
      item('showAiDetectButton'),
    ]),
    avatarSettings: [item('showAvatarRank')],
    profilePage: visible([
      ...lists.nameRight.filter((entry) => !WEB3_ONLY.has(entry.key)),
      ...lists.followedRight.filter((entry) => !WEB3_ONLY.has(entry.key) && !AI_ONLY.has(entry.key)),
      item('showSearchPanel', 'showProfileChanges'),
      item('showNotes'),
      item('showOfficialTags'),
    ]),
    homeRightSidebar: [],
    web3OnlySettings: visible([
      item('showHotVote'),
      item('showFeatureSlot'),
      item('showHunterCampaign'),
      item('showRealtimeSubscription'),
      item('enableBnbFeeds'),
      item('enableGossip'),
      item('enableListing'),
      item('showHotTrendingWeb3'),
      item('show90dMention'),
      item('show90dPerformance'),
      item('showWeb3KolFollowers'),
      item('showTop100KolsWeb3'),
      item('showCnKolsWeb3'),
      item('showFqRank'),
      item('showCnRank'),
      item('showEnInfluenceRank'),
      item('showProjectRank'),
    ]),
    aiOnlySettings: visible([
      item('showHotVote'),
      item('showHunterCampaign'),
      item('showHotTrendingAi'),
      item('showAiKolFollowers'),
      item('showTop100KolsAi'),
      item('showCnKolsAi'),
      item('showFqRankAi'),
      item('showCnRankAi'),
      item('showEnInfluenceRankAi'),
      item('showProjectRankAi'),
    ]),
  };
}
