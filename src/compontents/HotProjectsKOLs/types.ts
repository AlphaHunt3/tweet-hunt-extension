export interface HotItem {
  id: string;
  share: number;
  twitter: {
    ai: {
      classification: 'project' | 'person';
      is_cn: boolean;
    };
    name: string;
    feature: {
      narrative: {
        en: string;
        cn: string
      }
    };
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

// 讨论相关类型
export interface HotDiscussion {
  price: number | null;
  share: number;
  summary_cn: string;
  summary_en: string;
  tag: string;
  twitter: {
    ai: {
      classification: 'project' | 'person';
      is_cn: boolean;
    };
    create_time: string;
    id: string;
    name: string;
    profile: {
      changed_field: string[];
      description: string;
      first_record: string;
      followers_count: number;
      following_count: number;
      is_blue_verified: boolean;
      listed_count: number;
      location: string;
      name: string;
      pinned_tweet_id: string[];
      profile_banner_url: string;
      profile_image_url: string;
      protected: boolean;
      tweets_count: number;
      url: string;
      username: string;
      username_raw: string;
      verified: boolean;
    };
    username: string;
    username_raw: string;
  };
}

export interface DiscussionTreemapNode extends d3.HierarchyRectangularNode<HotDiscussion> {
  data: HotDiscussion;
}
