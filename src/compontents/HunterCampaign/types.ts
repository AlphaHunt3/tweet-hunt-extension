import type React from 'react';

export interface Task {
  id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
}

export interface HunterCampaignBannerProps {
  className?: string;
  // 仅控制"未报名"时的默认展开/收起模式；已报名的展开/收起由组件内部控制（默认展开）
  unregisteredMode?: 'expanded' | 'collapsed';
  // 是否显示活动附加组件（排行榜、Captain 等）
  showMantleHunterComponents?: boolean;
  campaignConfig?: HunterCampaignConfig;
  // 强制设置默认展开状态（如果提供，将覆盖默认逻辑）
  defaultExpanded?: boolean;
}

// 排行榜项目类型
export interface LeaderboardItem {
  rank: number;
  username: string;
  displayName: string;
  avatar: string;
  share: number;
  change?: number;
  isVerified: boolean;
}

export type HunterCampaignTaskType = 'twitter' | 'telegram' | 'custom';

export interface HunterCampaignTaskDefinition {
  id: string;
  title: string;
  url: string;
  type: HunterCampaignTaskType;
  autoComplete?: boolean;
}

// Custom task state for refresh cooldown tracking
export interface CustomTaskState {
  lastRefreshAt: number;
  completed?: boolean;
  completedAt?: string;
}

// Extended task type that includes custom task specific properties
export interface CustomTask extends Task {
  type: 'custom';
  onRefresh?: () => void;
  canRefresh?: boolean;
  refreshCooldown?: number;
  isLoading?: boolean;
}

export interface HunterCampaignLogo {
  image: string;
  url: string;
  label: string;
  ringClassName?: string;
}

export interface HunterCampaignLinks {
  shouldShow: () => boolean;
  getGuideUrl: () => string;
  getActiveUrl: () => string;
  /** 是否在排行榜底部展示「查看更多」链接（跳转 activeUrl） */
  getShowLeaderboardLink?: () => boolean;
  activeUrl: string;
  guideUrl: string;
  showLeaderboardLink: boolean;
}

export interface HunterCampaignApi {
  fetchRegistration: (userId: string) => Promise<any | undefined>;
  submitRegistration: (payload: {
    invitedByCode?: string | null;
    evmAddress?: string | null;
    registrationUrl?: string | null;
  }) => Promise<
    | {
      success: boolean;
      inviteCode?: string | null;
      registration?: any;
    }
    | undefined
  >;
  fetchStats?: () => Promise<any | undefined>;
  fetchLeaderboard?: () => Promise<any | undefined>;
  fetchHotTweets?: () => Promise<any | undefined>;
}

export interface HunterCampaignConfig {
  id: string;
  campaignKey: string;
  displayName: string;
  taskStorageKey: string;
  expandedStorageKey: string;
  logos: HunterCampaignLogo[];
  copy?: {
    activityTitleKey?: string; // 完整标题翻译键，用于展开后的内容区域
    shortTitleKey?: string; // 简短标题翻译键，用于活动列表展示（例如 "Mantle Hunter 2 - $20K"）
    emoji?: string;
    registeredDescription?: string;
    unregisteredDescription?: string;
    // 按钮文本翻译键
    ctaButtonKey?: string; // 报名按钮翻译键，默认使用 'mantleHunterCta'
    goToOfficialButtonKey?: string; // 前往活动页面按钮翻译键，默认使用 'mantleHunterStatusGoToOfficial'
    viewGuideLinkKey?: string; // 查看官方指南链接翻译键，默认使用 'mantleHunterViewOfficialGuide'
    shortTitleText?: string;
    activityTitleText?: string;
  };
  tasks: HunterCampaignTaskDefinition[];
  links: HunterCampaignLinks;
  api: HunterCampaignApi;
  showExtraComponents?: boolean;
  // 该活动应该在哪些 userId 的个人页面显示（不区分大小写）
  targetUserIds?: string[];
  // 活动报名时间窗口（从服务端透传）
  enrollmentWindow?: { startAt?: string | null; endAt?: string | null };
  // 报名前的风险提示弹框（富文本 HTML）
  riskConfirmHtml?: string;
  // 是否展示付费推广政策免责声明
  showSponsoredPolicy?: boolean;
  // ===== 奖励与报名规则相关字段（从服务端透传） =====
  // 奖池金额（如果有的话，优先在其他组件里展示）
  rewardAmount?: number;
  // 获奖用户总名额
  rewardParticipantCount?: number;
  // 奖励分配方式: equal / mindshare / 其他
  rewardDistributionType?: 'equal' | 'mindshare' | string;
  // 报名门槛：KOL 排名需要小于等于该值
  threshold?: number;
  // 已认证创作者是否也能报名
  includeCreator?: boolean;
  // 奖励单位（如 "U" 表示 USDT）
  rewardUnit?: string;
  // 是否启用征文大赛
  enableEssayContest?: boolean;
  // 征文大赛奖池金额
  essayContestAmount?: number;
  // 征文大赛获奖人数
  essayContestWinnerCount?: number;
  // 征文大赛获奖名单
  essayContestWinners?: Array<{
    name: string;
    handler: string;
    avatar: string;
    reward: string;
  }>;
  // 征文大赛奖励单位（选填，不填则使用 rewardUnit）
  essayContestUnit?: string;
  // ===== POW 排行榜相关字段 =====
  // 是否启用 POW 排行榜
  enablePowLeaderboard?: boolean;
  // POW 奖池金额
  powAmount?: number;
  // POW 分配方式: workshare / 其他
  powDistributionType?: string;
  // POW 获奖人数
  powWinnerCount?: number;
  // POW 奖励单位
  powUnit?: string;
  // ===== 自定义标签配置（可选，配置后优先使用） =====
  tags?: CampaignTag[];
}

// 自定义标签配置
export interface CampaignTag {
  // 色系：green | purple | yellow | blue | gray | gold | red | pink | cyan | orange
  colorScheme: 'green' | 'purple' | 'yellow' | 'blue' | 'gray' | 'gold' | 'red' | 'pink' | 'cyan' | 'orange';
  // Lucide 图标名称（如：Gift, Trophy, FileText 等）
  icon: string;
  // 中文标签文本
  label: string;
  // 英文标签文本
  label_en: string;
  // 中文 hover 提示（可选，支持换行用 \n）
  hoverTips?: string;
  // 英文 hover 提示（可选，支持换行用 \n）
  hoverTips_en?: string;
}
