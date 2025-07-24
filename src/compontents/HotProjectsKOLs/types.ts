export interface HotItem {
  id: string;
  share: number;
  twitter: {
    ai: {
      classification: 'project' | 'person';
      is_cn: boolean;
    };
    name: string;
    profile: {
      profile_image_url: string;
      username: string;
      username_raw: string;
      followers_count: number;
      description: string;
      is_blue_verified: boolean;
      profile_banner_url?: string;
    };
    username: string;
    username_raw: string;
  };
}

export interface TreemapNode extends d3.HierarchyRectangularNode<HotItem> {
  data: HotItem;
}

// Token相关类型
export interface HotToken {
  image: string;
  mentionCount: number;
  name: string;
  pricePct24H: number;
  share: number;
  symbol: string;
  token_raw: string;
}

export interface TokenTreemapNode extends d3.HierarchyRectangularNode<HotToken> {
  data: HotToken;
}