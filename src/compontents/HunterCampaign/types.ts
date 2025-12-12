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
}
