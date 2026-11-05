import { nacosCacheManager } from '~utils/nacosCacheManager';
import { DEFAULT_OFFLINE_RULES } from './defaultRules';
import { normalizeTweetText } from './normalize';
import type {
  CleanerCategory,
  CleanerDetectionResult,
  CleanerRemoteConfig,
  KolFollowerExemptConfig,
} from './types';

const CLEANER_CONFIG_DATA_ID = 'xhunt_cleaner_rules';
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟缓存

interface CompiledRegexItem {
  groupKey: string;
  category: CleanerCategory;
  ruleName: string;
  patternStr: string;
  regex: RegExp;
}

// 编译期预归一化的关键词，避免高频检测时重复执行 normalizeTweetText
interface CompiledKeyword {
  raw: string;
  cleanWord: string;
  cleanStripped: string;
}

interface CompiledGroup {
  category: CleanerCategory;
  ruleName: string;
  strongKeywords: CompiledKeyword[];
  exactKeywords: CompiledKeyword[];
  fuzzyKeywords: CompiledKeyword[];
  intentKeywords: CompiledKeyword[];
  maxWeakLength: number;
}

const compileKeyword = (word: string): CompiledKeyword => ({
  raw: word,
  cleanWord: word.trim().toLowerCase(),
  cleanStripped: normalizeTweetText(word).stripped,
});

const defaultAdultTraffic = DEFAULT_OFFLINE_RULES.rules.adult_traffic!;

class CleanerRuleManager {
  private currentConfig: CleanerRemoteConfig = {
    ...DEFAULT_OFFLINE_RULES,
    rules: {
      adult_traffic: defaultAdultTraffic,
    },
  };
  private compiledRegexes: CompiledRegexItem[] = [];
  private compiledGroups: CompiledGroup[] = [];
  private globalExemptSet: Set<string> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    this.compileRules();
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const remoteConfig =
        await nacosCacheManager.fetchWithCache<CleanerRemoteConfig>(
          CLEANER_CONFIG_DATA_ID,
          CACHE_TTL
        );

      if (
        remoteConfig &&
        typeof remoteConfig === 'object' &&
        remoteConfig.enabled &&
        remoteConfig.rules
      ) {
        // 显式忽略远端及本地关于灰产的配置，只保留黄推规则
        const remoteAdultRule = remoteConfig.rules.adult_traffic;
        this.currentConfig = {
          ...DEFAULT_OFFLINE_RULES,
          ...remoteConfig,
          rules: {
            adult_traffic: remoteAdultRule
              ? {
                  ...defaultAdultTraffic,
                  ...remoteAdultRule,
                  name: remoteAdultRule.name || defaultAdultTraffic.name,
                }
              : defaultAdultTraffic,
          },
          globalExemptHandles: [
            ...new Set([
              ...DEFAULT_OFFLINE_RULES.globalExemptHandles,
              ...(remoteConfig.globalExemptHandles || []),
            ]),
          ],
          kolFollowerExempt: {
            ...DEFAULT_OFFLINE_RULES.kolFollowerExempt!,
            ...(remoteConfig.kolFollowerExempt || {}),
          },
        };
      }
    } catch {
      this.currentConfig = {
        ...DEFAULT_OFFLINE_RULES,
        rules: {
          adult_traffic: defaultAdultTraffic,
        },
        kolFollowerExempt: DEFAULT_OFFLINE_RULES.kolFollowerExempt,
      };
    } finally {
      this.compileRules();
    }
  }

  private compileRules(): void {
    const items: CompiledRegexItem[] = [];
    const groups: CompiledGroup[] = [];
    const rules = this.currentConfig.rules || {};

    for (const [groupKey, group] of Object.entries(rules)) {
      // 灰产先不做，严格只编译黄推规则
      if (groupKey !== 'adult_traffic' || !group || !group.enabled) {
        continue;
      }
      const category: CleanerCategory = 'adult';

      groups.push({
        category,
        ruleName: group.name,
        strongKeywords: (group.strongKeywords || []).map(compileKeyword),
        exactKeywords: (group.exactKeywords || []).map(compileKeyword),
        fuzzyKeywords: (group.fuzzyKeywords || []).map(compileKeyword),
        intentKeywords: (group.intentKeywords || []).map(compileKeyword),
        maxWeakLength: group.maxWeakSpamLength ?? 80,
      });

      if (!Array.isArray(group.regexPatterns)) {
        continue;
      }
      for (const pattern of group.regexPatterns) {
        try {
          items.push({
            groupKey,
            category,
            ruleName: group.name,
            patternStr: pattern,
            regex: new RegExp(pattern, 'i'),
          });
        } catch {
          // 忽略非法正则
        }
      }
    }

    this.compiledRegexes = items;
    this.compiledGroups = groups;
    this.globalExemptSet = new Set(
      (this.currentConfig.globalExemptHandles || []).map((h) =>
        h.toLowerCase().replace(/^@/, '')
      )
    );
  }

  public checkSpam(
    rawText: string,
    customKeywords: string[] = []
  ): CleanerDetectionResult {
    if (!rawText || !rawText.trim()) {
      return { matched: false };
    }

    const { normalized, stripped } = normalizeTweetText(rawText);
    const lowerNormalized = normalized.toLowerCase();
    const textLength = stripped.length;

    // 1. 优先匹配用户自定义关键词（至少 2 个字符，且纯英文/数字做单词边界匹配，避免子串误杀）
    for (const rawKw of customKeywords) {
      const kw = rawKw.trim().toLowerCase();
      if (!kw || kw.length < 2) continue;

      const isAlphanumericWord = /^[a-z0-9_-]+$/i.test(kw);
      if (isAlphanumericWord) {
        const regex = new RegExp(`(^|[^a-z0-9_-])${kw}([^a-z0-9_-]|$)`, 'i');
        if (regex.test(normalized) || regex.test(rawText)) {
          return {
            matched: true,
            category: 'custom',
            ruleName: '自定义规则',
            reason: `命中自定义词: ${rawKw}`,
            matchedWord: rawKw,
          };
        }
      } else {
        const { stripped: cleanKwStripped } = normalizeTweetText(rawKw);
        if (
          lowerNormalized.includes(kw) ||
          stripped.includes(kw) ||
          (cleanKwStripped && stripped.includes(cleanKwStripped))
        ) {
          return {
            matched: true,
            category: 'custom',
            ruleName: '自定义规则',
            reason: `命中自定义词: ${rawKw}`,
            matchedWord: rawKw,
          };
        }
      }
    }

    // 2. 强特征词（Strong Keywords，黑产专有暗语，只检测黄推）
    for (const group of this.compiledGroups) {
      for (const kw of group.strongKeywords) {
        if (
          (kw.cleanWord && lowerNormalized.includes(kw.cleanWord)) ||
          (kw.cleanStripped && stripped.includes(kw.cleanStripped))
        ) {
          return {
            matched: true,
            category: group.category,
            ruleName: group.ruleName,
            reason: `命中强引流特征: ${kw.raw}`,
            matchedWord: kw.raw,
          };
        }
      }
    }

    // 3. 高级正则匹配（针对引流套路与行为模式，强拦截）
    for (const item of this.compiledRegexes) {
      if (
        item.regex.test(normalized) ||
        item.regex.test(rawText) ||
        item.regex.test(stripped)
      ) {
        return {
          matched: true,
          category: item.category,
          ruleName: item.ruleName,
          reason: `命中模式: ${item.ruleName}`,
          matchedWord: item.patternStr,
        };
      }
    }

    // 4. 短文本特征词过滤（长文本保护，字数 <= maxWeakLength 时只要命中即拦截）
    for (const group of this.compiledGroups) {
      // 长文本保护：超过指定字数（默认 80 字），说明是长篇讨论、分析或观点，不作为引流机器人屏蔽
      if (textLength > group.maxWeakLength) {
        continue;
      }

      const matchWeakKeyword = (kw: CompiledKeyword, isFuzzy: boolean) => {
        if (isFuzzy) {
          return Boolean(
            (kw.cleanStripped && stripped.includes(kw.cleanStripped)) ||
            (kw.cleanWord && lowerNormalized.includes(kw.cleanWord))
          );
        }
        return Boolean(kw.cleanWord && lowerNormalized.includes(kw.cleanWord));
      };

      for (const kw of group.exactKeywords) {
        if (matchWeakKeyword(kw, false)) {
          return {
            matched: true,
            category: group.category,
            ruleName: group.ruleName,
            reason: `短回复特征: ${kw.raw}`,
            matchedWord: kw.raw,
          };
        }
      }

      for (const kw of group.fuzzyKeywords) {
        if (matchWeakKeyword(kw, true)) {
          return {
            matched: true,
            category: group.category,
            ruleName: group.ruleName,
            reason: `短回复特征: ${kw.raw}`,
            matchedWord: kw.raw,
          };
        }
      }

      for (const kw of group.intentKeywords) {
        if (matchWeakKeyword(kw, true)) {
          return {
            matched: true,
            category: group.category,
            ruleName: group.ruleName,
            reason: `短回复引流特征: ${kw.raw}`,
            matchedWord: kw.raw,
          };
        }
      }
    }

    return { matched: false };
  }


  public checkAuthorSpam(
    author: { name?: string; handle?: string },
    customKeywords: string[] = []
  ): CleanerDetectionResult {
    const rawName = author.name || "";
    const rawHandle = (author.handle || "").replace(/^@/, "");
    if (!rawName.trim() && !rawHandle.trim()) {
      return { matched: false };
    }

    const targets = [rawName, rawHandle].filter((t) => Boolean(t && t.trim()));

    for (const targetText of targets) {
      const { normalized, stripped } = normalizeTweetText(targetText);
      const lowerNormalized = normalized.toLowerCase();

      // 1. 优先匹配用户自定义关键词
      for (const rawKw of customKeywords) {
        const kw = rawKw.trim().toLowerCase();
        if (!kw || kw.length < 2) continue;

        const isAlphanumericWord = /^[a-z0-9_-]+$/i.test(kw);
        if (isAlphanumericWord) {
          const regex = new RegExp(`(^|[^a-z0-9_-])${kw}([^a-z0-9_-]|$)`, "i");
          if (regex.test(normalized) || regex.test(targetText)) {
            return {
              matched: true,
              category: "custom",
              ruleName: "自定义规则",
              reason: `作者名字命中自定义词: ${rawKw}`,
              matchedWord: rawKw,
            };
          }
        } else {
          const { stripped: cleanKwStripped } = normalizeTweetText(rawKw);
          if (
            lowerNormalized.includes(kw) ||
            stripped.includes(kw) ||
            (cleanKwStripped && stripped.includes(cleanKwStripped))
          ) {
            return {
              matched: true,
              category: "custom",
              ruleName: "自定义规则",
              reason: `作者名字命中自定义词: ${rawKw}`,
              matchedWord: rawKw,
            };
          }
        }
      }

      // 2. 强特征词（Strong Keywords，黑产专有暗语，只检测黄推）
      for (const group of this.compiledGroups) {
        for (const kw of group.strongKeywords) {
          if (
            (kw.cleanWord && lowerNormalized.includes(kw.cleanWord)) ||
            (kw.cleanStripped && stripped.includes(kw.cleanStripped))
          ) {
            return {
              matched: true,
              category: group.category,
              ruleName: group.ruleName,
              reason: `作者名字命中强特征: ${kw.raw}`,
              matchedWord: kw.raw,
            };
          }
        }
      }
    }

    return { matched: false };
  }

  public isGlobalExempt(handle: string): boolean {
    if (!handle) return false;
    const lowerHandle = handle.toLowerCase().replace(/^@/, '');
    return this.globalExemptSet.has(lowerHandle);
  }

  public getKolFollowerConfig(): KolFollowerExemptConfig {
    return (
      this.currentConfig.kolFollowerExempt ||
      DEFAULT_OFFLINE_RULES.kolFollowerExempt!
    );
  }

  public isKolFollowerQualified(
    counts: Record<string, number> | null | undefined
  ): boolean {
    if (!counts || typeof counts !== 'object') return false;

    const config = this.getKolFollowerConfig();
    if (!config.enabled) return false;

    const domains =
      config.activeDomains && config.activeDomains.length > 0
        ? config.activeDomains
        : ['ai_cn', 'ai_global', 'web3_cn', 'web3_global'];
    const minCount = config.minCount ?? 1;

    if (config.matchMode === 'total') {
      const total = domains.reduce((sum, d) => sum + (Number(counts[d]) || 0), 0);
      return total >= minCount;
    }

    return domains.some((d) => (Number(counts[d]) || 0) >= minCount);
  }

  public getConfig(): CleanerRemoteConfig {
    return this.currentConfig;
  }
}

export const cleanerRuleManager = new CleanerRuleManager();
