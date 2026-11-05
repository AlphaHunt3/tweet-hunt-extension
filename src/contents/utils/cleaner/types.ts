export type CleanerMode = 'mark' | 'hide' | 'collapse';

export type CleanerCategory = 'adult' | 'gray' | 'custom';

export interface KolFollowerExemptConfig {
  enabled: boolean;
  minCount: number;
  matchMode: 'any' | 'total';
  cacheTtlHours: number;
  negativeCacheHours?: number;
  activeDomains: string[];
}

export interface CleanerRuleGroup {
  name: string;
  enabled: boolean;
  strongKeywords?: string[];
  exactKeywords: string[];
  fuzzyKeywords: string[];
  regexPatterns: string[];
  intentKeywords?: string[];
  maxWeakSpamLength?: number;
}

export interface CleanerRemoteConfig {
  version: number;
  enabled: boolean;
  updateTime: string;
  description?: string;
  rules: {
    adult_traffic?: CleanerRuleGroup;
    gray_promotion?: CleanerRuleGroup;
    [key: string]: CleanerRuleGroup | undefined;
  };
  globalExemptHandles: string[];
  kolFollowerExempt?: KolFollowerExemptConfig;
}

export interface CleanerDetectionResult {
  matched: boolean;
  category?: CleanerCategory;
  ruleName?: string;
  reason?: string;
  matchedWord?: string;
}

export interface InterceptedAccount {
  handle: string;
  name?: string;
  avatar?: string;
  category: CleanerCategory;
  reason: string;
  matchedWord?: string;
  lastSeenAt: number;
  count?: number;
  isBlocked?: boolean;
}
