export interface Task {
  id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
}

export interface MantleHunterBannerProps {
  className?: string;
  // 仅控制"未报名"时的默认展开/收起模式；已报名的展开/收起由组件内部控制（默认展开）
  unregisteredMode?: 'expanded' | 'collapsed';
  // 是否显示Mantle Hunter相关组件（仅在Mantle官方账号页面显示）
  showMantleHunterComponents?: boolean;
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
