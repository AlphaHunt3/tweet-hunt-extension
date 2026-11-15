# UI 风格切换 · 阶段 0（地基）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让扩展具备「柔光 / 黑曜 / 原生」三套风格的切换能力：设计变量、风格存储、设置入口、首次引导步骤、老用户提示，以及升级到 React 19 并接入 ui-sdk。

**Architecture:** 风格存在 `@settings/uiSkin`；`useDocumentSkin` 把风格、X 的浅深色和色板写到 `<html>` 的 `data-xh-*` 属性上，并把设计变量 CSS 注入主文档一次，所有 Shadow Root 通过继承拿到变量。旧的 `--bg-primary` 等变量改为新变量的别名，旧界面先跟着变色。新组件用 ui-sdk 的 Radio 做风格选择。

**Tech Stack:** Plasmo 0.84（必要时升到 0.90）、React 19、TypeScript、Tailwind 3.4、@ui-sdk/react 0.1.0-beta.1、Vitest + jsdom + Testing Library、Vite（只用于本地 UI 沙盒）。

对应设计文档：`docs/superpowers/specs/2026-11-14-xhunt-ui-skins-design.md`（第 3、4、5、9 节）。

---

## 前提：公开仓库缺私有模块

公开仓库删掉了接口层等 10 个模块（`src/contents/services/*` 等），工程原样无法构建，`tsc` 有 193 个错误。Task 1 用**本地占位文件**补齐，只为能编译、能跑测试，写进 `.git/info/exclude`，永远不提交。拿到真实文件时，直接用真实文件替换占位文件即可，其余任务不变。

基线（2026-11-14，补占位前）：`plasmo build` 失败（缺 `useInitialStateScript.ts`）；`tsc --noEmit` 193 个错误，其中 56 个是「找不到模块」。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/ui/skin/skins.ts` | 风格枚举、默认值、存储 key、名称和描述的文案 key |
| `src/ui/skin/xPalette.ts` | 从 X 的背景色判断浅色 / 昏暗 / 纯黑，外加订阅变化的 store 和 `useXPalette` |
| `src/ui/skin/useUiSkin.ts` | 读写当前风格，非法值兜底 |
| `src/ui/skin/documentSkin.ts` | 写 `<html>` 属性、把设计变量 CSS 注入主文档 |
| `src/ui/skin/fonts.ts` | 按风格往主文档注入 `@font-face` |
| `src/ui/skin/useDocumentSkin.ts` | 在 Main 里把以上几件事接起来 |
| `src/ui/skin/SkinPicker.tsx` | 三选一的风格卡片（ui-sdk Radio） |
| `src/ui/skin/SkinIntroNotice.tsx` | 老用户一次性提示 |
| `src/css/skin-tokens.css` | 三套风格、七种主题组合的设计变量和动效变量 |
| `src/css/style.css` | 顶部声明 `@layer ui-sdk`；旧变量改为新变量的别名 |
| `tailwind.config.js` | 新增 `xh-*` 语义颜色、圆角、阴影、字体 |
| `src/test/setup.ts`、`src/test/memoryStorage.ts` | 测试环境和内存版存储 |
| `vitest.config.ts` | 测试配置，处理 `~` 别名和 `data-text:`、`url:` 导入 |
| `dev/sandbox/*` | 本地 UI 沙盒，脱离 x.com 和接口也能看三套风格 |

---

### Task 1: 本地占位文件（不提交）

**Files:**
- Create: `src/contents/services/api.ts`、`review.ts`、`notes.ts`、`userSettings.ts`、`fetchTwRenameInfo.ts`
- Create: `src/compontents/HunterCampaign/HunterCampaignBanner.tsx`、`CampaignProviderBadge.tsx`、`campaignConfigs.ts`
- Create: `src/compontents/FeatureBannerSection.tsx`、`src/contents/hooks/useInitialStateScript.ts`
- Modify: `.git/info/exclude`

- [ ] **Step 1: 把占位路径加进本地排除列表**

在 `.git/info/exclude` 末尾追加：

```
# 公开仓库缺失的私有模块：本地占位，永不提交
src/contents/services/
src/compontents/HunterCampaign/
src/compontents/FeatureBannerSection.tsx
src/contents/hooks/useInitialStateScript.ts
```

- [ ] **Step 2: 写接口层占位 `src/contents/services/api.ts`**

```ts
// 本地占位：公开仓库没有这个文件。只为编译和测试，已在 .git/info/exclude 中排除。
type Loose = (...args: any[]) => any;
const none: Loose = () => Promise.resolve(null);

export type ApiUserInfo = any;
export type GossipTweet = any;
export type InteractionRankItem = any;
export type AnnualReportResponse = any;
export type FetchKolInteractionsAvailabilityParams = any;
export type KolFollowerCountsItem = any;
export type KolInteractionItem = any;
export type KolInteractionsData = any;
export type KolInteractionsLimitResponse = any;
export type XHuntUserTagsPayload = any;

export const kbPrefix = '';
export const convertNewDataToKolData: Loose = (data) => data;
export const convertNewDataToPopularityInfo: Loose = (data) => data;
export const convertNewRankDataToOldFormat: Loose = (data) => data;
export const clearActiveHotVoteTopicCache: Loose = () => undefined;

export const analyzeGhostFollowingUser = none;
export const checkAnnualReportId = none;
export const checkAnnualReportWhitelist = none;
export const claimApiCredits = none;
export const fetchActiveHotVoteTopic = none;
export const fetchAiContent = none;
export const fetchAiDetect = none;
export const fetchAiDetectQuota = none;
export const fetchAiRankBatch = none;
export const fetchAllHotVotes = none;
export const fetchDelTwitterInfo = none;
export const fetchDeletedStatus = none;
export const fetchEditedTweetCounts = none;
export const fetchEditedTweets = none;
export const fetchFanByHandle = none;
export const fetchFansRank = none;
export const fetchFollowRelation = none;
export const fetchGhostFollowingList = none;
export const fetchGhostFollowingQuota = none;
export const fetchHistoricalTweets = none;
export const fetchHotVoteComments = none;
export const fetchKolChat = none;
export const fetchKolChatList = none;
export const fetchKolFollowerCountsBatch = none;
export const fetchKolInteractions = none;
export const fetchKolInteractionsAvailability = none;
export const fetchPrivateMessages = none;
export const fetchProjectMember = none;
export const fetchRootDataInfo = none;
export const fetchSupportedTokens = none;
export const fetchTagMappings = none;
export const fetchTokenAnalysisInfo = none;
export const fetchTwitterInfoNew = none;
export const fetchTwitterRankBatchNew = none;
export const fetchUnfollowRelation = none;
export const fetchXHuntUserTags = none;
export const getAiHotTweet = none;
export const getAiHotTweetMedia = none;
export const getAiTopInfluencer = none;
export const getAiTrendingTweets = none;
export const getAiTweetModel = none;
export const getApiUserInfo = none;
export const getGithubTrending = none;
export const getHotProject = none;
export const getHotToken = none;
export const getHotTweet = none;
export const getHotTweetMedia = none;
export const getProjectAttitude = none;
export const getSoulInfo = none;
export const getSpecialUserMarkers = none;
export const getTopInfluencer = none;
export const getTopTag = none;
export const getTrendingTweets = none;
export const getTwitterAuthUrl = none;
export const getTwitterTopInfluencer = none;
export const postHotVoteComment = none;
export const postTwitterCallback = none;
export const registerAnnualReport = none;
export const submitHotVote = none;
export const submitRevote = none;
```

- [ ] **Step 3: 写其余接口占位**

`src/contents/services/review.ts`：

```ts
// 本地占位，见 api.ts 顶部说明。
type Loose = (...args: any[]) => any;
const none: Loose = () => Promise.resolve(null);

export const delHandeReviewInfo = none;
export const getHandeReviewInfo = none;
export const getHandleComments = none;
export const postHandeReviewInfo = none;
export const updateEvmAddresses = none;
export const updateUserInfo = none;
export const userLogout = none;
```

`src/contents/services/notes.ts`：

```ts
// 本地占位，见 api.ts 顶部说明。
type Loose = (...args: any[]) => any;
const none: Loose = () => Promise.resolve(null);

export const getUserNote = none;
export const saveUserNote = none;
```

`src/contents/services/userSettings.ts`：

```ts
// 本地占位，见 api.ts 顶部说明。
type Loose = (...args: any[]) => any;
const none: Loose = () => Promise.resolve(null);

export const applyCloudSettingsToLocal = none;
export const collectLocalSettings = none;
export const fetchCloudUserSettings = none;
export const uploadCloudUserSettings = none;
```

`src/contents/services/fetchTwRenameInfo.ts`：

```ts
// 本地占位，见 api.ts 顶部说明。
export const fetchTwRenameInfo = (..._args: any[]): any => Promise.resolve(null);
```

- [ ] **Step 4: 写组件和 hook 占位**

`src/compontents/HunterCampaign/HunterCampaignBanner.tsx`：

```tsx
// 本地占位，见 src/contents/services/api.ts 顶部说明。
export const HunterCampaignBanner = (_props: any) => null;
```

`src/compontents/HunterCampaign/CampaignProviderBadge.tsx`：

```tsx
// 本地占位，见 src/contents/services/api.ts 顶部说明。
export const CampaignProviderBadge = (_props: any) => null;
```

`src/compontents/HunterCampaign/campaignConfigs.ts`：

```ts
// 本地占位，见 src/contents/services/api.ts 顶部说明。
export type CampaignDomain = 'web3' | 'ai';
export const getActiveHunterCampaignsByDomainAsync = async (
  _domain: CampaignDomain,
): Promise<any[]> => [];
```

`src/compontents/FeatureBannerSection.tsx`：

```tsx
// 本地占位，见 src/contents/services/api.ts 顶部说明。
const FeatureBannerSection = (_props: any) => null;
export default FeatureBannerSection;
```

`src/contents/hooks/useInitialStateScript.ts`：

```ts
// 本地占位，见 src/contents/services/api.ts 顶部说明。
export default function useInitialStateScript(): void {}
```

- [ ] **Step 5: 确认占位文件不会进入 git，并记录新的基线**

Run: `git status --short`
Expected: 输出里没有 `src/contents/services/`、`HunterCampaign/`、`FeatureBannerSection.tsx`、`useInitialStateScript.ts`。

Run: `pnpm exec tsc --noEmit -p tsconfig.json > /tmp/xh-tsc-base.txt; grep -c "error TS2307" /tmp/xh-tsc-base.txt; grep -c "error TS" /tmp/xh-tsc-base.txt`
Expected: 第一个数字（找不到模块）为 0；第二个数字记下来，作为后续任务「不新增类型错误」的基线（预计 130 多个，都是原有代码的问题）。

Run: `pnpm exec plasmo build`
Expected: `Finished in …ms!`，生成 `build/chrome-mv3-prod/`。

本任务没有可提交的改动。

---

### Task 2: 测试环境（Vitest）

**Files:**
- Create: `vitest.config.ts`、`src/test/setup.ts`、`src/test/memoryStorage.ts`
- Modify: `package.json`（scripts）

- [ ] **Step 1: 安装测试依赖**

Run: `pnpm add -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event`
Expected: 安装成功。

- [ ] **Step 2: 写 `vitest.config.ts`**

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const src = path.resolve(__dirname, 'src');
const SCHEME = '\0plasmo-scheme:';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [
    {
      // Plasmo 的 data-text: / url: 导入在测试里换成空字符串和占位 URL
      name: 'xhunt-plasmo-schemes',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith('data-text:') || id.startsWith('url:')) return SCHEME + id;
        return null;
      },
      load(id) {
        if (!id.startsWith(SCHEME)) return null;
        const spec = id.slice(SCHEME.length);
        const value = spec.startsWith('url:') ? `stub://${spec.slice(4)}` : '';
        return `export default ${JSON.stringify(value)};`;
      },
    },
  ],
  resolve: {
    alias: [{ find: /^~\/?/, replacement: `${src}/` }],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: 写内存版存储 `src/test/memoryStorage.ts`**

和 `~storage/useLocalStorage` 同名导出，测试里用 `vi.mock` 替换真实存储。

```ts
import { useCallback, useEffect, useState } from 'react';

const store = new Map<string, unknown>();
const listeners = new Map<string, Set<(value: unknown) => void>>();

export function resetMemoryStorage() {
  store.clear();
  listeners.clear();
}

export function getMemoryValue(key: string) {
  return store.get(key);
}

export function setMemoryValue(key: string, value: unknown) {
  store.set(key, value);
  listeners.get(key)?.forEach((listener) => listener(value));
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() =>
    store.has(key) ? (store.get(key) as T) : initialValue,
  );

  useEffect(() => {
    const listener = (next: unknown) => setValue(next as T);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
    };
  }, [key]);

  const set = useCallback((next: T) => setMemoryValue(key, next), [key]);
  return [value, set, { isLoading: false }] as const;
}
```

- [ ] **Step 4: 写 `src/test/setup.ts`**

jsdom 补丁照 ui-sdk 测试指南。

```ts
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetMemoryStorage } from './memoryStorage';

HTMLElement.prototype.showPopover = function () {};
HTMLElement.prototype.hidePopover = function () {};
Element.prototype.getAnimations = () => [];
Element.prototype.scrollIntoView = function () {};
Element.prototype.checkVisibility = () => true;
Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
document.elementFromPoint = () => null;
document.elementsFromPoint = () => [];
(globalThis as any).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
document.head.append(
  Object.assign(document.createElement('style'), {
    textContent: '[popover] { display: block !important }',
  }),
);

afterEach(() => {
  cleanup();
  resetMemoryStorage();
  const html = document.documentElement;
  html.removeAttribute('data-xh-skin');
  html.removeAttribute('data-xh-theme');
  html.removeAttribute('data-xh-palette');
  document.head.querySelectorAll('style[id^="xh-"]').forEach((el) => el.remove());
});
```

- [ ] **Step 5: 加 npm 脚本**

在 `package.json` 的 `scripts` 里加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 跑一遍空测试**

Run: `pnpm test --passWithNoTests`
Expected: exit 0，提示没有测试文件。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/test/setup.ts src/test/memoryStorage.ts
git commit -m "test: add vitest with jsdom and testing library"
```

---

### Task 3: 升级 React 19 及依赖

**Files:**
- Modify: `package.json`、`pnpm-lock.yaml`，以及 `tsc` 报出的、因 React 19 类型变化而出错的文件

- [ ] **Step 1: 升级依赖**

```bash
pnpm add react@^19 react-dom@^19 ahooks@latest recharts@^2.15.0 @plasmohq/storage@^1.15.0 @plasmohq/messaging@^0.7.2
pnpm add -D @types/react@^19.2.10 @types/react-dom@^19
```

Expected: `node -p "require('react/package.json').version"` 输出 19.x。

- [ ] **Step 2: 找出 React 19 带来的新类型错误**

```bash
pnpm exec tsc --noEmit -p tsconfig.json > /tmp/xh-tsc-r19.txt
diff <(grep "error TS" /tmp/xh-tsc-base.txt | sort) <(grep "error TS" /tmp/xh-tsc-r19.txt | sort) | grep '^>'
```

Expected: 列出新增的错误行（没有就跳到 Step 4）。

- [ ] **Step 3: 按规则逐个修掉新增错误**

只修新增的，不顺手修原有错误。React 19 类型的常见改法：

| 报错 | 改法 |
|---|---|
| `Cannot find namespace 'JSX'` | 改成 `React.JSX.Element`，或 `import type { JSX } from 'react'` |
| `Expected 1 arguments, but got 0`（`useRef<T>()`） | 改成 `useRef<T \| undefined>(undefined)`；DOM 引用用 `useRef<HTMLDivElement>(null)` |
| `ReactElement` 的 `props` 是 `unknown` | 给元素加泛型：`ReactElement<{ className?: string }>` |
| `RefObject<T \| null>` 不能赋给 `RefObject<T>` | 接收方类型改为 `RefObject<T \| null>` |

同时检查运行时已移除的 API：

```bash
grep -rn -E "ReactDOM\.render|findDOMNode|\.defaultProps\s*=|propTypes" src | grep -v node_modules
```

Expected: 没有输出；如有，改为 `createRoot`、`nodeRef`、参数默认值。

- [ ] **Step 4: 确认没有新增类型错误，并更新基线**

Run: 重复 Step 2 的 diff 命令
Expected: 没有 `>` 开头的行。

Run: `pnpm exec tsc --noEmit -p tsconfig.json > /tmp/xh-tsc-base.txt`
Expected: 生成 React 19 下的新基线，后续任务都和它比。

- [ ] **Step 5: 构建**

Run: `pnpm exec plasmo build`
Expected: `Finished in …ms!`。如果报错与 React 19 有关（例如 JSX 运行时、`react-dom/client`），执行 `pnpm add -D plasmo@0.90.5` 后重新构建；仍失败则停下来记录报错。

- [ ] **Step 6: 跑测试**

Run: `pnpm test --passWithNoTests`
Expected: exit 0。

- [ ] **Step 7: Commit**

```bash
git add -A package.json pnpm-lock.yaml src
git commit -m "chore: upgrade to react 19"
```

（`git add -A src` 只会带上被修改的已跟踪文件和新文件；占位文件已被排除。）

---

### Task 4: 风格定义 `skins.ts`

**Files:**
- Create: `src/ui/skin/skins.ts`
- Test: `src/ui/skin/skins.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, test } from 'vitest';
import {
  DEFAULT_UI_SKIN,
  UI_SKINS,
  UI_SKIN_INTRO_SEEN_KEY,
  UI_SKIN_META,
  UI_SKIN_STORAGE_KEY,
  isUiSkin,
  resolveUiSkin,
} from './skins';

describe('skins', () => {
  test('lists the three skins in display order', () => {
    expect(UI_SKINS).toEqual(['soft', 'obsidian', 'native']);
  });

  test('defaults to obsidian and uses the settings keys', () => {
    expect(DEFAULT_UI_SKIN).toBe('obsidian');
    expect(UI_SKIN_STORAGE_KEY).toBe('@settings/uiSkin');
    expect(UI_SKIN_INTRO_SEEN_KEY).toBe('@xhunt/uiSkinIntroSeen');
  });

  test('recognises valid skins only', () => {
    expect(isUiSkin('soft')).toBe(true);
    expect(isUiSkin('native')).toBe(true);
    expect(isUiSkin('dark')).toBe(false);
    expect(isUiSkin(undefined)).toBe(false);
    expect(isUiSkin(3)).toBe(false);
  });

  test('falls back to the default for unknown values', () => {
    expect(resolveUiSkin('soft')).toBe('soft');
    expect(resolveUiSkin('')).toBe('obsidian');
    expect(resolveUiSkin(null)).toBe('obsidian');
    expect(resolveUiSkin('Soft')).toBe('obsidian');
  });

  test('has name and description keys for every skin', () => {
    for (const skin of UI_SKINS) {
      expect(UI_SKIN_META[skin].nameKey).toMatch(/^uiSkin.+Name$/);
      expect(UI_SKIN_META[skin].descKey).toMatch(/^uiSkin.+Desc$/);
    }
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/skins.test.ts`
Expected: FAIL，`Failed to resolve import "./skins"`。

- [ ] **Step 3: 实现**

```ts
export const UI_SKINS = ['soft', 'obsidian', 'native'] as const;
export type UiSkin = (typeof UI_SKINS)[number];

export const DEFAULT_UI_SKIN: UiSkin = 'obsidian';
export const UI_SKIN_STORAGE_KEY = '@settings/uiSkin';
export const UI_SKIN_INTRO_SEEN_KEY = '@xhunt/uiSkinIntroSeen';

export const UI_SKIN_META: Record<UiSkin, { nameKey: string; descKey: string }> = {
  soft: { nameKey: 'uiSkinSoftName', descKey: 'uiSkinSoftDesc' },
  obsidian: { nameKey: 'uiSkinObsidianName', descKey: 'uiSkinObsidianDesc' },
  native: { nameKey: 'uiSkinNativeName', descKey: 'uiSkinNativeDesc' },
};

export function isUiSkin(value: unknown): value is UiSkin {
  return typeof value === 'string' && (UI_SKINS as readonly string[]).includes(value);
}

export function resolveUiSkin(value: unknown): UiSkin {
  return isUiSkin(value) ? value : DEFAULT_UI_SKIN;
}
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/skins.test.ts`
Expected: 5 passed。

- [ ] **Step 5: Commit**

```bash
git add src/ui/skin/skins.ts src/ui/skin/skins.test.ts
git commit -m "feat(skin): define ui skins and storage keys"
```

---

### Task 5: X 色板检测 `xPalette.ts`

**Files:**
- Create: `src/ui/skin/xPalette.ts`
- Test: `src/ui/skin/xPalette.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, test } from 'vitest';
import { createXPaletteStore, detectXPalette, parseRgb } from './xPalette';

describe('parseRgb', () => {
  test('reads rgb, rgba and hex colours', () => {
    expect(parseRgb('rgb(21, 32, 43)')).toEqual([21, 32, 43]);
    expect(parseRgb('rgba(0, 0, 0, 1)')).toEqual([0, 0, 0]);
    expect(parseRgb('#ffffff')).toEqual([255, 255, 255]);
  });

  test('treats transparent and unknown values as missing', () => {
    expect(parseRgb('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseRgb('transparent')).toBeNull();
    expect(parseRgb('')).toBeNull();
  });
});

describe('detectXPalette', () => {
  test('maps the three X backgrounds', () => {
    expect(detectXPalette('rgb(255, 255, 255)')).toBe('default');
    expect(detectXPalette('rgb(21, 32, 43)')).toBe('dim');
    expect(detectXPalette('rgb(0, 0, 0)')).toBe('lights-out');
  });

  test('uses the theme when the background is unknown', () => {
    expect(detectXPalette('', 'light')).toBe('default');
    expect(detectXPalette('', 'dark')).toBe('lights-out');
  });
});

describe('createXPaletteStore', () => {
  test('reads the body background and reports changes', async () => {
    document.body.style.backgroundColor = 'rgb(21, 32, 43)';
    const store = createXPaletteStore(document);
    expect(store.getSnapshot()).toBe('dim');

    const seen: string[] = [];
    const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot()));
    document.body.style.backgroundColor = 'rgb(0, 0, 0)';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seen).toEqual(['lights-out']);
    unsubscribe();
    document.body.style.backgroundColor = '';
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/xPalette.test.ts`
Expected: FAIL，找不到 `./xPalette`。

- [ ] **Step 3: 实现**

```ts
import { useSyncExternalStore } from 'react';

export type XPalette = 'default' | 'dim' | 'lights-out';

const DIM_RGB: [number, number, number] = [21, 32, 43];

export function parseRgb(color: string): [number, number, number] | null {
  const rgb = color.match(
    /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)/i,
  );
  if (rgb) {
    if (rgb[4] !== undefined && Number(rgb[4]) === 0) return null;
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

export function detectXPalette(
  background: string,
  fallbackTheme: 'light' | 'dark' = 'dark',
): XPalette {
  const rgb = parseRgb(background);
  if (!rgb) return fallbackTheme === 'light' ? 'default' : 'lights-out';
  const [r, g, b] = rgb;
  if (r > 200 && g > 200 && b > 200) return 'default';
  const distance =
    Math.abs(r - DIM_RGB[0]) + Math.abs(g - DIM_RGB[1]) + Math.abs(b - DIM_RGB[2]);
  return distance < 30 ? 'dim' : 'lights-out';
}

export function createXPaletteStore(doc: Document) {
  let current: XPalette | null = null;
  let observer: MutationObserver | null = null;
  const listeners = new Set<() => void>();

  const read = (): XPalette => {
    const view = doc.defaultView;
    const background =
      doc.body && view ? view.getComputedStyle(doc.body).backgroundColor : '';
    const theme = doc.documentElement.style.colorScheme === 'light' ? 'light' : 'dark';
    return detectXPalette(background, theme);
  };

  const start = () => {
    observer = new MutationObserver(() => {
      const next = read();
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    });
    const options = { attributes: true, attributeFilter: ['style'] };
    observer.observe(doc.documentElement, options);
    if (doc.body) observer.observe(doc.body, options);
  };

  return {
    getSnapshot(): XPalette {
      if (current === null) current = read();
      return current;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!observer) start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && observer) {
          observer.disconnect();
          observer = null;
        }
      };
    },
  };
}

let defaultStore: ReturnType<typeof createXPaletteStore> | null = null;
const getDefaultStore = () => (defaultStore ??= createXPaletteStore(document));

export function useXPalette(): XPalette {
  const store = getDefaultStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => 'lights-out');
}
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/xPalette.test.ts`
Expected: 5 passed。

- [ ] **Step 5: Commit**

```bash
git add src/ui/skin/xPalette.ts src/ui/skin/xPalette.test.ts
git commit -m "feat(skin): detect x light, dim and lights-out palettes"
```

---

### Task 6: 读写当前风格 `useUiSkin`

**Files:**
- Create: `src/ui/skin/useUiSkin.ts`
- Test: `src/ui/skin/useUiSkin.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { useUiSkin } from './useUiSkin';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

describe('useUiSkin', () => {
  test('returns the default skin when nothing is stored', () => {
    const { result } = renderHook(() => useUiSkin());
    expect(result.current.skin).toBe('obsidian');
  });

  test('returns the stored skin', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    const { result } = renderHook(() => useUiSkin());
    expect(result.current.skin).toBe('soft');
  });

  test('falls back to the default for an invalid stored value', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'pink');
    const { result } = renderHook(() => useUiSkin());
    expect(result.current.skin).toBe('obsidian');
  });

  test('stores a new skin', () => {
    const { result } = renderHook(() => useUiSkin());
    act(() => result.current.setSkin('native'));
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('native');
    expect(result.current.skin).toBe('native');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/useUiSkin.test.ts`
Expected: FAIL，找不到 `./useUiSkin`。

- [ ] **Step 3: 实现**

```ts
import { useCallback } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { DEFAULT_UI_SKIN, UI_SKIN_STORAGE_KEY, resolveUiSkin, type UiSkin } from './skins';

export function useUiSkin() {
  const [stored, setStored, meta] = useLocalStorage<string>(
    UI_SKIN_STORAGE_KEY,
    DEFAULT_UI_SKIN,
  );
  const setSkin = useCallback((next: UiSkin) => setStored(next), [setStored]);
  return { skin: resolveUiSkin(stored), setSkin, isLoading: meta.isLoading };
}
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/useUiSkin.test.ts`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/ui/skin/useUiSkin.ts src/ui/skin/useUiSkin.test.ts
git commit -m "feat(skin): add useUiSkin hook backed by settings storage"
```

---

### Task 7: 设计变量、主文档注入、兼容层、Tailwind 语义名

**Files:**
- Create: `src/css/skin-tokens.css`、`src/ui/skin/documentSkin.ts`
- Test: `src/ui/skin/documentSkin.test.ts`
- Modify: `src/css/style.css:6-38`、`tailwind.config.js`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, test } from 'vitest';
import { TOKENS_STYLE_ID, applySkinToDocument, ensureSkinTokens } from './documentSkin';

describe('applySkinToDocument', () => {
  test('writes skin, theme and palette onto the root', () => {
    const root = document.documentElement;
    applySkinToDocument(root, { skin: 'native', theme: 'dark', palette: 'dim' });
    expect(root.getAttribute('data-xh-skin')).toBe('native');
    expect(root.getAttribute('data-xh-theme')).toBe('dark');
    expect(root.getAttribute('data-xh-palette')).toBe('dim');
  });
});

describe('ensureSkinTokens', () => {
  test('injects one style element and updates it in place', () => {
    const first = ensureSkinTokens(document, ':root{--a:1}');
    const second = ensureSkinTokens(document, ':root{--a:2}');
    expect(first).toBe(second);
    expect(document.querySelectorAll(`#${TOKENS_STYLE_ID}`)).toHaveLength(1);
    expect(second.textContent).toBe(':root{--a:2}');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/documentSkin.test.ts`
Expected: FAIL，找不到 `./documentSkin`。

- [ ] **Step 3: 实现 `src/ui/skin/documentSkin.ts`**

```ts
import tokensCss from 'data-text:~/css/skin-tokens.css';
import type { UiSkin } from './skins';
import type { XPalette } from './xPalette';

export const TOKENS_STYLE_ID = 'xh-skin-tokens';

export interface DocumentSkinState {
  skin: UiSkin;
  theme: 'light' | 'dark';
  palette: XPalette;
}

export function applySkinToDocument(root: HTMLElement, state: DocumentSkinState) {
  root.setAttribute('data-xh-skin', state.skin);
  root.setAttribute('data-xh-theme', state.theme);
  root.setAttribute('data-xh-palette', state.palette);
}

export function ensureSkinTokens(doc: Document = document, css: string = tokensCss) {
  let style = doc.getElementById(TOKENS_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = TOKENS_STYLE_ID;
    (doc.head || doc.documentElement).appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
  return style;
}
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/documentSkin.test.ts`
Expected: 2 passed。

- [ ] **Step 5: 写设计变量 `src/css/skin-tokens.css`**

数值来自设计文档第 5 节和画布。

```css
/* XHunt 设计变量：挂在 <html data-xh-skin data-xh-theme data-xh-palette> 上，向下继承进所有 Shadow Root */
html[data-xh-skin] {
  --xh-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --xh-ease-pop: cubic-bezier(0.34, 1.36, 0.64, 1);
  --xh-ease-std: cubic-bezier(0.4, 0, 0.2, 1);
  --xh-d-xs: 150ms;
  --xh-d-sm: 250ms;
  --xh-d-md: 350ms;
  --xh-d-lg: 450ms;
  --xh-d-xl: 600ms;
  --xh-blur-in: 2px;
  --xh-rise: 8px;
  --xh-stagger: 40ms;
}

/* 柔光 */
html[data-xh-skin='soft'] {
  --xh-rise: 10px;
  --xh-radius-panel: 24px;
  --xh-radius-card: 16px;
  --xh-radius-control: 10px;
  --xh-accent: #5a5cf0;
  --xh-on-accent: #ffffff;
  --xh-font-ui: 'XH Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --xh-font-num: var(--xh-font-ui);
  --xh-font-mono: 'XH JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}
html[data-xh-skin='soft'][data-xh-theme='light'] {
  --xh-canvas: #f5f5f5;
  --xh-raised: #ffffff;
  --xh-surface: #ffffff;
  --xh-sunken: #ececec;
  --xh-line: #ebebeb;
  --xh-fg: #0a0a0a;
  --xh-fg-2: #5c5c5c;
  --xh-fg-3: #8a8a8a;
  --xh-accent-soft: color-mix(in oklab, #5a5cf0 11%, white);
  --xh-accent-fg: color-mix(in oklab, #5a5cf0 82%, black);
  --xh-up: #3a5a0c;
  --xh-up-bg: #e2f6c0;
  --xh-down: #a51f18;
  --xh-down-bg: #fde3e1;
  --xh-warn: #864806;
  --xh-warn-bg: #fcefc9;
  --xh-shadow-panel: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04), 0 18px 44px -14px rgba(0, 0, 0, 0.22);
  --xh-shadow-pop: 0 0 0 1px rgba(0, 0, 0, 0.06), 0 12px 32px -8px rgba(0, 0, 0, 0.2);
}
html[data-xh-skin='soft'][data-xh-theme='dark'] {
  --xh-canvas: #141414;
  --xh-raised: #1d1d1d;
  --xh-surface: #1d1d1d;
  --xh-sunken: #0e0e0e;
  --xh-line: #2a2a2a;
  --xh-fg: #f3f3f3;
  --xh-fg-2: #a8a8a8;
  --xh-fg-3: #7d7d7d;
  --xh-accent-soft: color-mix(in oklab, #5a5cf0 22%, #1d1d1d);
  --xh-accent-fg: color-mix(in oklab, #5a5cf0 62%, white);
  --xh-up: #c3ef7a;
  --xh-up-bg: rgba(163, 230, 53, 0.14);
  --xh-down: #fca5a5;
  --xh-down-bg: rgba(248, 113, 113, 0.14);
  --xh-warn: #fcd77a;
  --xh-warn-bg: rgba(251, 191, 36, 0.14);
  --xh-shadow-panel: 0 0 0 1px rgba(255, 255, 255, 0.07), 0 18px 44px -14px rgba(0, 0, 0, 0.7);
  --xh-shadow-pop: 0 0 0 1px rgba(255, 255, 255, 0.08), 0 12px 32px -8px rgba(0, 0, 0, 0.7);
}

/* 黑曜 */
html[data-xh-skin='obsidian'] {
  --xh-d-sm: 200ms;
  --xh-d-md: 280ms;
  --xh-d-lg: 360ms;
  --xh-d-xl: 480ms;
  --xh-rise: 6px;
  --xh-radius-panel: 18px;
  --xh-radius-card: 12px;
  --xh-radius-control: 8px;
  --xh-accent: #8b9cff;
  --xh-on-accent: #0b0b0c;
  --xh-font-ui: 'XH Geist', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --xh-font-num: 'XH Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --xh-font-mono: var(--xh-font-num);
}
html[data-xh-skin='obsidian'][data-xh-theme='dark'] {
  --xh-canvas: #0b0b0c;
  --xh-raised: rgba(255, 255, 255, 0.035);
  --xh-surface: #121214;
  --xh-sunken: rgba(255, 255, 255, 0.065);
  --xh-line: rgba(255, 255, 255, 0.075);
  --xh-fg: rgba(255, 255, 255, 0.93);
  --xh-fg-2: rgba(255, 255, 255, 0.6);
  --xh-fg-3: rgba(255, 255, 255, 0.47);
  --xh-accent-soft: color-mix(in oklab, #8b9cff 17%, transparent);
  --xh-accent-fg: #8b9cff;
  --xh-up: #3ddc7a;
  --xh-up-bg: rgba(46, 204, 113, 0.13);
  --xh-down: #ff6b6b;
  --xh-down-bg: rgba(255, 99, 99, 0.13);
  --xh-warn: #f5b84c;
  --xh-warn-bg: rgba(245, 184, 76, 0.13);
  --xh-shadow-panel: 0 0 0 1px rgba(255, 255, 255, 0.085), 0 28px 64px -16px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --xh-shadow-pop: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 18px 44px -10px rgba(0, 0, 0, 0.8);
}
html[data-xh-skin='obsidian'][data-xh-theme='light'] {
  --xh-canvas: #fcfcfc;
  --xh-raised: rgba(0, 0, 0, 0.025);
  --xh-surface: #ffffff;
  --xh-sunken: rgba(0, 0, 0, 0.05);
  --xh-line: rgba(0, 0, 0, 0.085);
  --xh-fg: rgba(0, 0, 0, 0.9);
  --xh-fg-2: rgba(0, 0, 0, 0.6);
  --xh-fg-3: rgba(0, 0, 0, 0.5);
  --xh-accent-soft: color-mix(in oklab, #8b9cff 15%, transparent);
  --xh-accent-fg: color-mix(in oklab, #8b9cff 62%, black);
  --xh-up: #0d8a4c;
  --xh-up-bg: rgba(13, 138, 76, 0.1);
  --xh-down: #d4343b;
  --xh-down-bg: rgba(212, 52, 59, 0.09);
  --xh-warn: #a35d00;
  --xh-warn-bg: rgba(214, 137, 16, 0.12);
  --xh-shadow-panel: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 24px 56px -16px rgba(0, 0, 0, 0.22);
  --xh-shadow-pop: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 14px 36px -10px rgba(0, 0, 0, 0.22);
}

/* 原生：跟随 X 的三种主题 */
html[data-xh-skin='native'] {
  --xh-blur-in: 0px;
  --xh-rise: 4px;
  --xh-radius-panel: 16px;
  --xh-radius-card: 16px;
  --xh-radius-control: 9999px;
  --xh-accent: #1d9bf0;
  --xh-on-accent: #ffffff;
  --xh-raised: transparent;
  --xh-shadow-panel: none;
  --xh-font-ui: TwitterChirp, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --xh-font-num: var(--xh-font-ui);
  --xh-font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
html[data-xh-skin='native'][data-xh-palette='default'] {
  --xh-canvas: #f7f9f9;
  --xh-surface: #ffffff;
  --xh-sunken: rgba(15, 20, 25, 0.07);
  --xh-line: #eff3f4;
  --xh-fg: #0f1419;
  --xh-fg-2: #536471;
  --xh-fg-3: #536471;
  --xh-accent-soft: rgba(29, 155, 240, 0.1);
  --xh-accent-fg: #1478c2;
  --xh-up: #00875a;
  --xh-up-bg: rgba(0, 186, 124, 0.12);
  --xh-down: #c8102a;
  --xh-down-bg: rgba(244, 33, 46, 0.1);
  --xh-warn: #9a6700;
  --xh-warn-bg: rgba(255, 212, 0, 0.18);
  --xh-shadow-pop: rgba(101, 119, 134, 0.2) 0 0 15px, rgba(101, 119, 134, 0.15) 0 0 3px 1px;
}
html[data-xh-skin='native'][data-xh-palette='dim'] {
  --xh-canvas: #1e2732;
  --xh-surface: #15202b;
  --xh-sunken: rgba(247, 249, 249, 0.07);
  --xh-line: #38444d;
  --xh-fg: #f7f9f9;
  --xh-fg-2: #8b98a5;
  --xh-fg-3: #8b98a5;
  --xh-accent-soft: rgba(29, 155, 240, 0.16);
  --xh-accent-fg: #4cb0f5;
  --xh-up: #00ba7c;
  --xh-up-bg: rgba(0, 186, 124, 0.16);
  --xh-down: #ff5c6b;
  --xh-down-bg: rgba(244, 33, 46, 0.16);
  --xh-warn: #ffd84d;
  --xh-warn-bg: rgba(255, 212, 0, 0.14);
  --xh-shadow-pop: rgba(136, 153, 166, 0.2) 0 0 15px, rgba(136, 153, 166, 0.15) 0 0 3px 1px;
}
html[data-xh-skin='native'][data-xh-palette='lights-out'] {
  --xh-canvas: #16181c;
  --xh-surface: #000000;
  --xh-sunken: rgba(231, 233, 234, 0.07);
  --xh-line: #2f3336;
  --xh-fg: #e7e9ea;
  --xh-fg-2: #71767b;
  --xh-fg-3: #71767b;
  --xh-accent-soft: rgba(29, 155, 240, 0.16);
  --xh-accent-fg: #4cb0f5;
  --xh-up: #00ba7c;
  --xh-up-bg: rgba(0, 186, 124, 0.16);
  --xh-down: #ff5c6b;
  --xh-down-bg: rgba(244, 33, 46, 0.16);
  --xh-warn: #ffd84d;
  --xh-warn-bg: rgba(255, 212, 0, 0.14);
  --xh-shadow-pop: rgba(255, 255, 255, 0.2) 0 0 15px, rgba(255, 255, 255, 0.15) 0 0 3px 1px;
}

@media (prefers-reduced-motion: reduce) {
  html[data-xh-skin] {
    --xh-rise: 0px;
    --xh-blur-in: 0px;
  }
}
```

- [ ] **Step 6: 把旧变量改成新变量的别名（`src/css/style.css` 第 5–38 行）**

把 `/* Theme variables */` 下面的 `div[data-theme='light'] {…}` 和 `div[data-theme='dark'] {…}` 两段整体替换为下面内容。原来的值留作兜底，主文档变量还没注入时不变样：

```css
/* Theme variables：迁移期别名，原值作为变量缺失时的兜底 */
div[data-theme='light'] {
  --bg-primary: var(--xh-surface, #ffffff);
  --bg-secondary: var(--xh-canvas, #ffffff);
  --bg-tertiary: var(--xh-sunken, #f3f4f6);
  --xhunt-accent: var(--xh-accent, #1d9bf0);
  --xhunt-accent-hover: color-mix(in oklab, var(--xh-accent, #1d9bf0) 88%, black);
  --xhunt-accent-soft: var(--xh-accent-soft, rgba(29, 155, 240, 0.1));
  --text-primary: var(--xh-fg, #000000);
  --text-secondary: var(--xh-fg-2, #4a5568);
  --text-tertiary: var(--xh-fg-3, #9ca3af);
  --border-color: var(--xh-line, #eff3f4);
  --border-color-soft: var(--xh-line, rgba(107, 114, 128, 0.2));
  --hover-bg: var(--xh-sunken, #f3f4f6);
  --icon-color: var(--xh-fg-2, #6b7280);
  --icon-hover-color: var(--xh-fg, #374151);
}

div[data-theme='dark'] {
  --bg-primary: var(--xh-surface, #15202b);
  --bg-secondary: var(--xh-canvas, #1a2634);
  --bg-tertiary: var(--xh-sunken, #1e2732);
  --xhunt-accent: var(--xh-accent, #1d9bf0);
  --xhunt-accent-hover: color-mix(in oklab, var(--xh-accent, #1d9bf0) 88%, black);
  --xhunt-accent-soft: var(--xh-accent-soft, rgba(29, 155, 240, 0.14));
  --text-primary: var(--xh-fg, #ffffff);
  --text-secondary: var(--xh-fg-2, #a0aec0);
  --text-tertiary: var(--xh-fg-3, #64748b);
  --border-color: var(--xh-line, #374151);
  --border-color-soft: var(--xh-line, rgba(163, 172, 184, 0.4));
  --hover-bg: var(--xh-sunken, #283340);
  --icon-color: var(--xh-fg-2, #d1d5db);
  --icon-hover-color: var(--xh-fg, #f3f4f6);
}
```

- [ ] **Step 7: Tailwind 加语义名（`tailwind.config.js`）**

在 `theme.extend` 里，`colors` 增加 `xh`，并新增 `borderRadius`、`boxShadow`、`fontFamily`：

```js
    extend: {
      colors: {
        blue: twitterBlue,
        'xhunt-accent': {
          DEFAULT: twitterBlue[500],
          hover: twitterBlue[600],
          soft: twitterBlue[50],
        },
        xh: {
          canvas: 'var(--xh-canvas)',
          raised: 'var(--xh-raised)',
          surface: 'var(--xh-surface)',
          sunken: 'var(--xh-sunken)',
          line: 'var(--xh-line)',
          fg: 'var(--xh-fg)',
          'fg-2': 'var(--xh-fg-2)',
          'fg-3': 'var(--xh-fg-3)',
          accent: 'var(--xh-accent)',
          'accent-soft': 'var(--xh-accent-soft)',
          'accent-fg': 'var(--xh-accent-fg)',
          'on-accent': 'var(--xh-on-accent)',
          up: 'var(--xh-up)',
          'up-bg': 'var(--xh-up-bg)',
          down: 'var(--xh-down)',
          'down-bg': 'var(--xh-down-bg)',
          warn: 'var(--xh-warn)',
          'warn-bg': 'var(--xh-warn-bg)',
        },
      },
      borderRadius: {
        'xh-panel': 'var(--xh-radius-panel)',
        'xh-card': 'var(--xh-radius-card)',
        'xh-control': 'var(--xh-radius-control)',
      },
      boxShadow: {
        'xh-panel': 'var(--xh-shadow-panel)',
        'xh-pop': 'var(--xh-shadow-pop)',
      },
      fontFamily: {
        'xh-ui': 'var(--xh-font-ui)',
        'xh-num': 'var(--xh-font-num)',
        'xh-mono': 'var(--xh-font-mono)',
      },
    },
```

注意：这些颜色是 CSS 变量，不能用 Tailwind 的透明度修饰（`bg-xh-accent/20` 不生效），需要淡色时用 `xh-accent-soft` 这类现成变量。

- [ ] **Step 8: 跑测试，Commit**

Run: `pnpm test`
Expected: 全部通过。

```bash
git add src/css/skin-tokens.css src/css/style.css tailwind.config.js src/ui/skin/documentSkin.ts src/ui/skin/documentSkin.test.ts
git commit -m "feat(skin): add design tokens and alias legacy theme variables"
```

---

### Task 8: 按风格注入字体 `fonts.ts`

**Files:**
- Create: `src/ui/skin/fonts.ts`
- Test: `src/ui/skin/fonts.test.ts`
- Modify: `src/global.d.ts`（`url:*` 模块声明）、`package.json`

- [ ] **Step 1: 安装字体包**

Run: `pnpm add @fontsource-variable/inter @fontsource-variable/jetbrains-mono @fontsource-variable/geist @fontsource-variable/geist-mono`
Expected: 安装成功；`ls node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2` 存在。

- [ ] **Step 2: 写失败的测试**

```ts
import { describe, expect, test } from 'vitest';
import { ensureSkinFonts, fontFaceCss } from './fonts';

describe('fontFaceCss', () => {
  test('declares a variable woff2 face', () => {
    expect(fontFaceCss([{ family: 'XH Inter', url: 'x.woff2' }])).toBe(
      '@font-face{font-family:"XH Inter";src:url("x.woff2") format("woff2");font-weight:100 900;font-style:normal;font-display:swap;}',
    );
  });
});

describe('ensureSkinFonts', () => {
  test('injects the fonts of a skin once', () => {
    const first = ensureSkinFonts('soft');
    const second = ensureSkinFonts('soft');
    expect(first).not.toBeNull();
    expect(first).toBe(second);
    expect(first!.textContent).toContain('"XH Inter"');
    expect(first!.textContent).toContain('"XH JetBrains Mono"');
  });

  test('injects nothing for the native skin, which uses the page font', () => {
    expect(ensureSkinFonts('native')).toBeNull();
    expect(document.getElementById('xh-fonts-native')).toBeNull();
  });
});
```

- [ ] **Step 3: 确认失败**

Run: `pnpm test src/ui/skin/fonts.test.ts`
Expected: FAIL，找不到 `./fonts`。

- [ ] **Step 4: 加模块声明**

在 `src/global.d.ts` 的 `declare module 'url:~/assets/*' {…}` 后面加：

```ts
declare module 'url:*' {
  const content: string;
  export default content;
}
```

- [ ] **Step 5: 实现 `src/ui/skin/fonts.ts`**

```ts
import geistMonoUrl from 'url:@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2';
import geistUrl from 'url:@fontsource-variable/geist/files/geist-latin-wght-normal.woff2';
import interUrl from 'url:@fontsource-variable/inter/files/inter-latin-wght-normal.woff2';
import jetbrainsMonoUrl from 'url:@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2';
import type { UiSkin } from './skins';

interface SkinFont {
  family: string;
  url: string;
}

const SKIN_FONTS: Record<UiSkin, SkinFont[]> = {
  soft: [
    { family: 'XH Inter', url: interUrl },
    { family: 'XH JetBrains Mono', url: jetbrainsMonoUrl },
  ],
  obsidian: [
    { family: 'XH Geist', url: geistUrl },
    { family: 'XH Geist Mono', url: geistMonoUrl },
  ],
  native: [],
};

export function fontFaceCss(fonts: SkinFont[]) {
  return fonts
    .map(
      (font) =>
        `@font-face{font-family:"${font.family}";src:url("${font.url}") format("woff2");font-weight:100 900;font-style:normal;font-display:swap;}`,
    )
    .join('\n');
}

// @font-face 写在 Shadow Root 里不生效，所以注入主文档
export function ensureSkinFonts(skin: UiSkin, doc: Document = document) {
  const fonts = SKIN_FONTS[skin];
  if (fonts.length === 0) return null;
  const id = `xh-fonts-${skin}`;
  const existing = doc.getElementById(id) as HTMLStyleElement | null;
  if (existing) return existing;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = fontFaceCss(fonts);
  (doc.head || doc.documentElement).appendChild(style);
  return style;
}
```

- [ ] **Step 6: 确认通过，Commit**

Run: `pnpm test src/ui/skin/fonts.test.ts`
Expected: 3 passed。

```bash
git add package.json pnpm-lock.yaml src/global.d.ts src/ui/skin/fonts.ts src/ui/skin/fonts.test.ts
git commit -m "feat(skin): bundle skin fonts and inject them per skin"
```

---

### Task 9: 在 Main 里接上 `useDocumentSkin`

**Files:**
- Create: `src/ui/skin/useDocumentSkin.ts`
- Test: `src/ui/skin/useDocumentSkin.test.ts`
- Modify: `src/contents/Main.tsx:126-140`

- [ ] **Step 1: 写失败的测试**

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { TOKENS_STYLE_ID } from './documentSkin';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { useDocumentSkin } from './useDocumentSkin';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

describe('useDocumentSkin', () => {
  test('applies the stored skin and the theme to <html>', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    renderHook(() => useDocumentSkin('light'));
    const html = document.documentElement;
    expect(html.getAttribute('data-xh-skin')).toBe('soft');
    expect(html.getAttribute('data-xh-theme')).toBe('light');
    expect(html.getAttribute('data-xh-palette')).toBeTruthy();
    expect(document.getElementById(TOKENS_STYLE_ID)).not.toBeNull();
    expect(document.getElementById('xh-fonts-soft')).not.toBeNull();
  });

  test('follows skin changes made elsewhere', () => {
    renderHook(() => useDocumentSkin('dark'));
    expect(document.documentElement.getAttribute('data-xh-skin')).toBe('obsidian');
    act(() => setMemoryValue(UI_SKIN_STORAGE_KEY, 'native'));
    expect(document.documentElement.getAttribute('data-xh-skin')).toBe('native');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/useDocumentSkin.test.ts`
Expected: FAIL，找不到 `./useDocumentSkin`。

- [ ] **Step 3: 实现 `src/ui/skin/useDocumentSkin.ts`**

```ts
import { useEffect } from 'react';
import { applySkinToDocument, ensureSkinTokens } from './documentSkin';
import { ensureSkinFonts } from './fonts';
import { useUiSkin } from './useUiSkin';
import { useXPalette } from './xPalette';

export function useDocumentSkin(theme: string) {
  const { skin } = useUiSkin();
  const palette = useXPalette();

  useEffect(() => {
    ensureSkinTokens();
  }, []);

  useEffect(() => {
    applySkinToDocument(document.documentElement, {
      skin,
      theme: theme === 'light' ? 'light' : 'dark',
      palette,
    });
    ensureSkinFonts(skin);
  }, [skin, theme, palette]);

  return skin;
}
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/useDocumentSkin.test.ts`
Expected: 2 passed。

- [ ] **Step 5: 在 `MainContent` 里调用**

`src/contents/Main.tsx` 顶部 import 区加：

```ts
import { useDocumentSkin } from '~/ui/skin/useDocumentSkin';
```

`MainContent` 里 `useThemeWatcher();` 下一行加：

```ts
  useDocumentSkin(theme);
```

- [ ] **Step 6: 构建并检查产物**

Run: `pnpm exec plasmo build`
Expected: `Finished in …ms!`。

Run: `grep -l -- "--xh-canvas" build/chrome-mv3-prod/*.js`
Expected: 至少一个文件（设计变量已经被打进内容脚本）。

Run: `ls build/chrome-mv3-prod | grep -c woff2` 和 `node -p "JSON.stringify(require('./build/chrome-mv3-prod/manifest.json').web_accessible_resources)"`
Expected: 有 4 个 woff2 文件，且它们出现在 `web_accessible_resources` 里。若字体没进 `web_accessible_resources`，在 `package.json` 的 `manifest` 里加 `"web_accessible_resources": [{ "resources": ["*.woff2"], "matches": ["https://x.com/*"] }]` 后重新构建。

- [ ] **Step 7: 确认没有新增类型错误，Commit**

Run: `pnpm exec tsc --noEmit -p tsconfig.json > /tmp/xh-tsc-now.txt; diff <(grep "error TS" /tmp/xh-tsc-base.txt | sort) <(grep "error TS" /tmp/xh-tsc-now.txt | sort) | grep '^>'`
Expected: 没有输出。

```bash
git add src/ui/skin/useDocumentSkin.ts src/ui/skin/useDocumentSkin.test.ts src/contents/Main.tsx package.json
git commit -m "feat(skin): sync the active skin onto the page"
```

---

### Task 10: 接入 ui-sdk，风格选择卡片，设置页入口

**Files:**
- Create: `src/ui/skin/SkinPicker.tsx`
- Test: `src/ui/skin/SkinPicker.test.tsx`
- Modify: `src/css/style.css`（顶部）、`src/locales/zh.json`、`src/locales/en.json`、`src/compontents/pages/SettingsPage.tsx:746-748`

- [ ] **Step 1: 安装 ui-sdk（锁定版本）**

Run: `pnpm add --save-exact @ui-sdk/react@0.1.0-beta.1 @ui-sdk/core@0.1.0-beta.1`
Expected: `package.json` 里两者都是精确版本号。

- [ ] **Step 2: 在 `src/css/style.css` 第一行之前声明 ui-sdk 图层**

```css
@layer ui-sdk;

@layer ui-sdk {
  :where([data-slot][hidden]:not([hidden='until-found'])) {
    display: none !important;
  }
}
```

（style.css 是每个 Shadow Root 注入的全局样式表，图层声明必须在最前面，我们自己的样式才能盖过 ui-sdk 的基础样式。）

Run: `pnpm exec plasmo build`
Expected: 成功。若 Tailwind 报 `@layer ui-sdk` 相关错误，删掉第一行的图层声明，把第二段改成不带 `@layer` 包裹的普通规则：ui-sdk 的基础样式加在主文档里，和 Shadow Root 内的样式不冲突，去掉图层不影响效果。

- [ ] **Step 3: 加文案**

`src/locales/zh.json` 末尾的 `}` 之前加（注意给上一行补逗号）：

```json
  "uiSkinLabel": "界面风格",
  "uiSkinSoftName": "柔光",
  "uiSkinSoftDesc": "浅色卡片，清爽亲和",
  "uiSkinObsidianName": "黑曜",
  "uiSkinObsidianDesc": "深色高密度，数据优先",
  "uiSkinNativeName": "原生",
  "uiSkinNativeDesc": "融进 X，跟随 X 主题",
  "uiSkinStepTitle": "选择界面风格",
  "uiSkinStepSubtitle": "随时可以在设置里更换",
  "uiSkinIntroTitle": "界面已更新",
  "uiSkinIntroBody": "现在有三种界面风格，可以在设置里切换。",
  "uiSkinIntroAction": "去切换",
  "uiSkinIntroDismiss": "知道了"
```

`src/locales/en.json` 同样位置加：

```json
  "uiSkinLabel": "Interface style",
  "uiSkinSoftName": "Soft",
  "uiSkinSoftDesc": "Light cards, calm and friendly",
  "uiSkinObsidianName": "Obsidian",
  "uiSkinObsidianDesc": "Dark and dense, data first",
  "uiSkinNativeName": "Native",
  "uiSkinNativeDesc": "Blends into X and follows its theme",
  "uiSkinStepTitle": "Choose an interface style",
  "uiSkinStepSubtitle": "You can change it anytime in Settings",
  "uiSkinIntroTitle": "XHunt has a new look",
  "uiSkinIntroBody": "There are now three interface styles. Switch anytime in Settings.",
  "uiSkinIntroAction": "Choose a style",
  "uiSkinIntroDismiss": "Got it"
```

Run: `node -e "require('./src/locales/zh.json'); require('./src/locales/en.json'); console.log('ok')"`
Expected: `ok`。

- [ ] **Step 4: 写失败的测试 `src/ui/skin/SkinPicker.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from './skins';
import { SkinPicker } from './SkinPicker';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

describe('SkinPicker', () => {
  test('offers three named skins with obsidian selected by default', () => {
    render(<SkinPicker />);
    expect(screen.getByRole('radiogroup', { name: 'uiSkinLabel' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /uiSkinObsidianName/ }).getAttribute('aria-checked')).toBe('true');
  });

  test('stores the skin a user picks', async () => {
    const user = userEvent.setup();
    render(<SkinPicker />);
    await user.click(screen.getByRole('radio', { name: /uiSkinSoftName/ }));
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('soft');
    expect(screen.getByRole('radio', { name: /uiSkinSoftName/ }).getAttribute('aria-checked')).toBe('true');
  });

  test('moves the selection with arrow keys', async () => {
    const user = userEvent.setup();
    render(<SkinPicker />);
    screen.getByRole('radio', { name: /uiSkinObsidianName/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('native');
  });
});
```

- [ ] **Step 5: 确认失败**

Run: `pnpm test src/ui/skin/SkinPicker.test.tsx`
Expected: FAIL，找不到 `./SkinPicker`。

- [ ] **Step 6: 实现 `src/ui/skin/SkinPicker.tsx`**

缩略图用固定配色画出每套风格自己的样子，和当前主题无关。

```tsx
import { Radio, RadioGroup, RadioIndicator } from '@ui-sdk/react/radio';
import { useI18n } from '~contents/hooks/i18n';
import { UI_SKINS, UI_SKIN_META, isUiSkin, type UiSkin } from './skins';
import { useUiSkin } from './useUiSkin';

const PREVIEW: Record<UiSkin, { bg: string; card: string; bar: string; accent: string; radius: number }> = {
  soft: { bg: '#f5f5f5', card: '#ffffff', bar: '#e6e6e6', accent: '#5a5cf0', radius: 6 },
  obsidian: { bg: '#0b0b0c', card: 'rgba(255,255,255,0.07)', bar: 'rgba(255,255,255,0.12)', accent: '#8b9cff', radius: 4 },
  native: { bg: '#15202b', card: '#1e2732', bar: '#38444d', accent: '#1d9bf0', radius: 8 },
};

function SkinPreview({ skin }: { skin: UiSkin }) {
  const p = PREVIEW[skin];
  return (
    <span
      aria-hidden='true'
      className='flex h-12 flex-col gap-1 p-1.5'
      style={{ background: p.bg, borderRadius: p.radius + 2 }}
    >
      <span className='h-1.5 w-1/2 rounded-full' style={{ background: p.accent }} />
      <span className='flex flex-1 gap-1'>
        <span className='flex-1' style={{ background: p.card, borderRadius: p.radius }} />
        <span className='flex-1' style={{ background: p.card, borderRadius: p.radius }} />
      </span>
      <span className='h-1 w-3/4 rounded-full' style={{ background: p.bar }} />
    </span>
  );
}

export function SkinPicker() {
  const { t } = useI18n();
  const { skin, setSkin } = useUiSkin();

  return (
    <RadioGroup
      value={skin}
      onValueChange={(next) => {
        if (isUiSkin(next)) setSkin(next);
      }}
      aria-label={t('uiSkinLabel')}
      className='grid grid-cols-3 gap-2'
    >
      {UI_SKINS.map((id) => (
        <label
          key={id}
          data-xhunt-testid={`skin-option-${id}`}
          className='flex cursor-pointer flex-col gap-1.5 rounded-xl border border-xh-line bg-xh-raised p-1.5 transition-shadow has-[[data-checked]]:border-xh-accent has-[[data-checked]]:ring-2 has-[[data-checked]]:ring-xh-accent-soft'
        >
          <SkinPreview skin={id} />
          <span className='flex items-center justify-between gap-1 px-0.5'>
            <span className='text-[12px] font-semibold text-xh-fg'>{t(UI_SKIN_META[id].nameKey)}</span>
            <Radio
              value={id}
              className='flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-xh-fg-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xh-accent data-[checked]:border-xh-accent'
            >
              <RadioIndicator className='h-1.5 w-1.5 rounded-full bg-xh-accent' />
            </Radio>
          </span>
          <span className='px-0.5 text-[11px] leading-4 text-xh-fg-2'>{t(UI_SKIN_META[id].descKey)}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
```

- [ ] **Step 7: 确认通过**

Run: `pnpm test src/ui/skin/SkinPicker.test.tsx`
Expected: 3 passed。若 `radiogroup` 的名称取不到，改为用 ui-sdk 的 `Field` + `FieldLabel` 包住（`import { Field, FieldLabel } from '@ui-sdk/react/field'`，`<Field><FieldLabel>{t('uiSkinLabel')}</FieldLabel><RadioGroup …/></Field>`），再跑一遍。

- [ ] **Step 8: 放进设置页**

`src/compontents/pages/SettingsPage.tsx` 顶部 import 区加：

```ts
import { SkinPicker } from '~/ui/skin/SkinPicker';
```

在 `{groupKey === 'others' && (` 之后、`<div key={'language'}` 之前插入：

```tsx
                <div
                  key={'uiSkin'}
                  data-xhunt-testid='settings-ui-skin'
                  className='px-3 pt-2 pb-3'
                >
                  <div className='text-[13px] theme-text-primary leading-tight mb-2'>
                    {t('uiSkinLabel')}
                  </div>
                  <SkinPicker />
                </div>
```

- [ ] **Step 9: 全量测试、类型检查、构建，Commit**

Run: `pnpm test`，Expected: 全部通过。
Run: Task 9 Step 7 的类型检查 diff，Expected: 没有输出。
Run: `pnpm exec plasmo build`，Expected: `Finished in …ms!`。

```bash
git add package.json pnpm-lock.yaml src/css/style.css src/locales/zh.json src/locales/en.json src/ui/skin/SkinPicker.tsx src/ui/skin/SkinPicker.test.tsx src/compontents/pages/SettingsPage.tsx
git commit -m "feat(skin): add skin picker to settings using ui-sdk radio"
```

---

### Task 11: 首次引导新增「选择界面风格」

**Files:**
- Modify: `src/compontents/UserDomainSetupModal.tsx`
- Test: `src/compontents/UserDomainSetupModal.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../test/memoryStorage';
import { UI_SKIN_INTRO_SEEN_KEY, UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import UserDomainSetupModal from './UserDomainSetupModal';

vi.mock('~storage/useLocalStorage', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/hooks/useAvatarSkin', () => ({
  useAvatarSkinState: () => ({ skin: 'skin-1', setSkinCustomized: vi.fn() }),
}));

async function openModal(onComplete = vi.fn()) {
  render(<UserDomainSetupModal isOpen onComplete={onComplete} />);
  const host = document.getElementById('xhunt-domain-setup-host')!;
  const root = host.shadowRoot!.querySelector('div') as HTMLElement;
  const ui = within(root);
  await waitFor(() => ui.getByTestId('domain-card-web3'));
  return { ui, onComplete };
}

describe('UserDomainSetupModal', () => {
  test('asks for a skin between the domain and avatar steps', async () => {
    const user = userEvent.setup();
    const { ui, onComplete } = await openModal();

    await user.click(ui.getByTestId('domain-card-web3'));
    await user.click(ui.getByTestId('domain-setup-next'));
    expect(ui.getByText('uiSkinStepTitle')).toBeTruthy();

    await user.click(ui.getByRole('radio', { name: /uiSkinSoftName/ }));
    expect(getMemoryValue(UI_SKIN_STORAGE_KEY)).toBe('soft');

    await user.click(ui.getByTestId('domain-setup-skin-next'));
    await user.click(ui.getByTestId('domain-setup-confirm'));

    expect(onComplete).toHaveBeenCalledWith({ domains: ['web3'], primaryDomain: 'web3' });
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
  });

  test('can go back from the skin step', async () => {
    const user = userEvent.setup();
    const { ui } = await openModal();
    await user.click(ui.getByTestId('domain-card-web3'));
    await user.click(ui.getByTestId('domain-setup-next'));
    await user.click(ui.getByTestId('domain-setup-skin-back'));
    expect(ui.getByTestId('domain-setup-next')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/compontents/UserDomainSetupModal.test.tsx`
Expected: FAIL，找不到 `uiSkinStepTitle`（还没有这一步）。

- [ ] **Step 3: 改 `UserDomainSetupModal.tsx`**

1. import 区加：

```ts
import { SkinPicker } from '~/ui/skin/SkinPicker';
import { UI_SKIN_INTRO_SEEN_KEY } from '~/ui/skin/skins';
```

2. 步骤类型和介绍标记（替换第 193 行）：

```ts
  const [setupStep, setSetupStep] = useState<'domain' | 'skin' | 'avatar'>('domain');
  const [, setSkinIntroSeen] = useLocalStorage<boolean>(UI_SKIN_INTRO_SEEN_KEY, false);
```

3. `handleNextStep` 里把 `setSetupStep('avatar');` 改为 `setSetupStep('skin');`。

4. `handleConfirm` 里 `setSkinCustomized(selectedAvatarSkin);` 下一行加 `setSkinIntroSeen(true);`，并把 `setSkinIntroSeen` 加进它的依赖数组。

5. 标题和副标题（第 402–416 行）改为三种情况：

```tsx
                <h2 className='text-[16px] leading-5 font-semibold theme-text-primary'>
                  {setupStep === 'domain'
                    ? t('userDomainSetupTitle') || '选择您感兴趣的领域'
                    : setupStep === 'skin'
                      ? t('uiSkinStepTitle')
                      : t('domainSetupAvatarSkinTitle') || '头像排名颜色'}
                </h2>
                <p className='mt-0.5 text-[12px] leading-4 theme-text-secondary'>
                  {setupStep === 'domain' ? (
                    <>
                      {t('userDomainSetupSubtitle') || '根据选择定制内容'}
                      <span className='ml-1 text-[#1D9BF0]'>
                        {t('domainSetupMultiSelectHint') || '支持多选'}
                      </span>
                    </>
                  ) : setupStep === 'skin' ? (
                    t('uiSkinStepSubtitle')
                  ) : (
                    avatarStepSubtitle
                  )}
                </p>
```

6. 进度条（第 421–440 行）换成三段：

```tsx
            <div className='mb-5 flex items-center gap-2.5'>
              {(['domain', 'skin', 'avatar'] as const).map((step, index, steps) => {
                const current = steps.indexOf(setupStep);
                return (
                  <div
                    key={step}
                    className='h-1 flex-1 rounded-full transition-colors'
                    style={{
                      background:
                        index === current
                          ? '#1D9BF0'
                          : index < current
                            ? 'rgba(29,155,240,0.35)'
                            : 'var(--border-color-soft)',
                    }}
                  />
                );
              })}
            </div>
```

7. 在 `{setupStep === 'avatar' && (` 这一块之前插入风格步骤：

```tsx
            {setupStep === 'skin' && <SkinPicker />}
```

8. 按钮区：把 `{setupStep === 'domain' ? (…) : (<div className='flex items-center gap-2'>…</div>)}` 中的 else 分支改为按步骤区分：

```tsx
              ) : setupStep === 'skin' ? (
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    data-xhunt-testid='domain-setup-skin-back'
                    onClick={() => setSetupStep('domain')}
                    className='h-9 px-4 rounded-full text-[13px] font-medium theme-text-secondary theme-bg-tertiary hover:theme-text-primary transition-colors'
                  >
                    {t('domainSetupBackButton') || '上一步'}
                  </button>
                  <button
                    type='button'
                    data-xhunt-testid='domain-setup-skin-next'
                    onClick={() => setSetupStep('avatar')}
                    className='h-9 flex-1 px-4 rounded-full text-[13px] font-semibold text-white transition-all border-none hover:opacity-90'
                    style={{
                      background: 'linear-gradient(90deg, #1D9BF0, #6366f1)',
                      boxShadow: '0 6px 18px rgba(29, 155, 240, 0.22)',
                    }}
                  >
                    {t('domainSetupNextButton') || '下一步'}
                  </button>
                </div>
              ) : (
```

并把头像步骤里「上一步」按钮的 `onClick={() => setSetupStep('domain')}` 改为 `onClick={() => setSetupStep('skin')}`。

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/compontents/UserDomainSetupModal.test.tsx`
Expected: 2 passed。

- [ ] **Step 5: 全量测试、类型检查，Commit**

Run: `pnpm test`，Expected: 全部通过。
Run: Task 9 Step 7 的类型检查 diff，Expected: 没有输出。

```bash
git add src/compontents/UserDomainSetupModal.tsx src/compontents/UserDomainSetupModal.test.tsx
git commit -m "feat(onboarding): add the interface style step"
```

---

### Task 12: 老用户一次性提示

**Files:**
- Create: `src/ui/skin/SkinIntroNotice.tsx`
- Test: `src/ui/skin/SkinIntroNotice.test.tsx`
- Modify: `src/compontents/area/FixedTwitterPanel.tsx:244-250`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { navigationService } from '~/compontents/navigation/NavigationService';
import { UI_SKIN_INTRO_SEEN_KEY } from './skins';
import { SkinIntroNotice } from './SkinIntroNotice';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

describe('SkinIntroNotice', () => {
  beforeEach(() => {
    vi.spyOn(navigationService, 'navigateTo').mockImplementation(() => {});
  });

  test('shows once for users who have not seen it', () => {
    render(<SkinIntroNotice />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('uiSkinIntroTitle')).toBeTruthy();
  });

  test('stays hidden after it has been seen', () => {
    setMemoryValue(UI_SKIN_INTRO_SEEN_KEY, true);
    render(<SkinIntroNotice />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('dismissing remembers the choice', async () => {
    const user = userEvent.setup();
    render(<SkinIntroNotice />);
    await user.click(screen.getByRole('button', { name: 'uiSkinIntroDismiss' }));
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('the action opens settings', async () => {
    const user = userEvent.setup();
    render(<SkinIntroNotice />);
    await user.click(screen.getByRole('button', { name: 'uiSkinIntroAction' }));
    expect(navigationService.navigateTo).toHaveBeenCalledWith('main-panel', '/settings');
    expect(getMemoryValue(UI_SKIN_INTRO_SEEN_KEY)).toBe(true);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/SkinIntroNotice.test.tsx`
Expected: FAIL，找不到 `./SkinIntroNotice`。

- [ ] **Step 3: 实现 `src/ui/skin/SkinIntroNotice.tsx`**

```tsx
import { navigationService } from '~/compontents/navigation/NavigationService';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { UI_SKIN_INTRO_SEEN_KEY } from './skins';

export function SkinIntroNotice() {
  const { t } = useI18n();
  const [seen, setSeen, { isLoading }] = useLocalStorage<boolean>(UI_SKIN_INTRO_SEEN_KEY, false);

  if (isLoading || seen) return null;

  return (
    <div
      role='status'
      data-xhunt-testid='skin-intro-notice'
      className='mx-2 mt-2 rounded-xh-card border border-xh-line bg-xh-raised p-3'
    >
      <p className='text-[13px] font-semibold text-xh-fg'>{t('uiSkinIntroTitle')}</p>
      <p className='mt-0.5 text-[12px] leading-4 text-xh-fg-2'>{t('uiSkinIntroBody')}</p>
      <div className='mt-2 flex gap-2'>
        <button
          type='button'
          className='h-7 rounded-xh-control bg-xh-accent px-3 text-[12px] font-semibold text-xh-on-accent'
          onClick={() => {
            setSeen(true);
            navigationService.navigateTo('main-panel', '/settings');
          }}
        >
          {t('uiSkinIntroAction')}
        </button>
        <button
          type='button'
          className='h-7 rounded-xh-control px-3 text-[12px] text-xh-fg-2 hover:text-xh-fg'
          onClick={() => setSeen(true)}
        >
          {t('uiSkinIntroDismiss')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/SkinIntroNotice.test.tsx`
Expected: 4 passed。

- [ ] **Step 5: 放进面板**

`src/compontents/area/FixedTwitterPanel.tsx` import 区加：

```ts
import { SkinIntroNotice } from '~/ui/skin/SkinIntroNotice';
```

在 `{/* Navigation System with Panel Context - 始终保持挂载以保留状态 */}` 这一行之前加：

```tsx
            <SkinIntroNotice />
```

- [ ] **Step 6: 全量测试、类型检查、构建，Commit**

Run: `pnpm test`；Task 9 Step 7 的类型检查 diff；`pnpm exec plasmo build`
Expected: 全部通过、没有新增类型错误、构建成功。

```bash
git add src/ui/skin/SkinIntroNotice.tsx src/ui/skin/SkinIntroNotice.test.tsx src/compontents/area/FixedTwitterPanel.tsx
git commit -m "feat(skin): tell existing users about interface styles once"
```

---

### Task 13: 本地 UI 沙盒

没有接口、不上 x.com 也能在浏览器里核对三套风格。后续阶段的新界面也放进这里。

**Files:**
- Create: `dev/sandbox/index.html`、`dev/sandbox/main.tsx`、`dev/sandbox/i18n.ts`、`dev/sandbox/vite.config.ts`
- Modify: `package.json`（scripts）

- [ ] **Step 0: 安装 Vite**

Run: `pnpm add -D vite`
Expected: 安装成功（pnpm 不会把 Vitest 自带的 vite 暴露到根目录，沙盒要直接依赖它）。

- [ ] **Step 1: 写 `dev/sandbox/vite.config.ts`**

```ts
import path from 'node:path';
import { defineConfig } from 'vite';

const repo = path.resolve(__dirname, '../..');
const src = path.join(repo, 'src');

export default defineConfig({
  root: __dirname,
  esbuild: { jsx: 'automatic' },
  plugins: [
    {
      // 把 Plasmo 的 data-text: / url: 导入换成 Vite 的 ?inline / ?url
      name: 'xhunt-plasmo-schemes',
      enforce: 'pre',
      async resolveId(id, importer) {
        const match = id.match(/^(data-text|url):(.*)$/);
        if (!match) return null;
        const [, scheme, spec] = match;
        const target = spec.replace(/^~\/?/, `${src}/`);
        const resolved = await this.resolve(target, importer, { skipSelf: true });
        if (!resolved) return null;
        return `${resolved.id}?${scheme === 'url' ? 'url' : 'inline'}`;
      },
    },
  ],
  resolve: {
    alias: [
      { find: /^~storage\/useLocalStorage(\.ts)?$/, replacement: path.join(src, 'test/memoryStorage.ts') },
      { find: /^~contents\/hooks\/i18n(\.ts)?$/, replacement: path.join(__dirname, 'i18n.ts') },
      { find: /^~\/?/, replacement: `${src}/` },
    ],
  },
  server: { port: 5199, fs: { allow: [repo] } },
});
```

- [ ] **Step 2: 写 `dev/sandbox/i18n.ts`**

```ts
import zh from '../../src/locales/zh.json';

export const useI18n = () => ({
  lang: 'zh',
  setLang: () => {},
  t: (key: string, fallback?: string) =>
    (zh as Record<string, string>)[key] ?? fallback ?? key,
});
```

- [ ] **Step 3: 写 `dev/sandbox/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>XHunt UI 沙盒</title>
    <style>
      body { margin: 0; font: 14px -apple-system, 'PingFang SC', sans-serif; background: var(--host-bg); color: var(--host-fg); }
      .bar { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px; border-bottom: 1px solid rgba(128,128,128,.3); }
      .bar button[aria-pressed='true'] { font-weight: 700; text-decoration: underline; }
      #stage { padding: 24px 16px; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 写 `dev/sandbox/main.tsx`**

页面模拟 X 的三种背景；组件放进 Shadow Root，和扩展里的真实情况一致。

```tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import styleCss from 'data-text:~/css/style.css';
import { applySkinToDocument, ensureSkinTokens } from '~/ui/skin/documentSkin';
import { ensureSkinFonts } from '~/ui/skin/fonts';
import { SkinIntroNotice } from '~/ui/skin/SkinIntroNotice';
import { SkinPicker } from '~/ui/skin/SkinPicker';
import { useUiSkin } from '~/ui/skin/useUiSkin';
import type { XPalette } from '~/ui/skin/xPalette';

const HOSTS: Record<XPalette, { bg: string; fg: string; theme: 'light' | 'dark' }> = {
  default: { bg: '#ffffff', fg: '#0f1419', theme: 'light' },
  dim: { bg: '#15202b', fg: '#f7f9f9', theme: 'dark' },
  'lights-out': { bg: '#000000', fg: '#e7e9ea', theme: 'dark' },
};

const SWATCHES = ['canvas', 'raised', 'surface', 'sunken', 'line', 'fg', 'fg-2', 'fg-3', 'accent', 'accent-soft', 'up', 'down', 'warn'];

function useShadowMount() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const host = document.getElementById('shadow-host')!;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = styleCss;
    const div = document.createElement('div');
    shadow.append(style, div);
    setMount(div);
  }, []);
  return mount;
}

function App() {
  const { skin } = useUiSkin();
  const [palette, setPalette] = useState<XPalette>('dim');
  const mount = useShadowMount();
  const host = HOSTS[palette];

  useEffect(() => {
    ensureSkinTokens();
  }, []);

  useEffect(() => {
    document.body.style.setProperty('--host-bg', host.bg);
    document.body.style.setProperty('--host-fg', host.fg);
    applySkinToDocument(document.documentElement, { skin, theme: host.theme, palette });
    ensureSkinFonts(skin);
  }, [skin, palette, host]);

  return (
    <>
      <div className="bar">
        {(Object.keys(HOSTS) as XPalette[]).map((p) => (
          <button key={p} type="button" aria-pressed={p === palette} onClick={() => setPalette(p)}>
            X 背景：{p}
          </button>
        ))}
      </div>
      <div id="stage">
        <div id="shadow-host" />
      </div>
      {mount &&
        createPortal(
          // 外层布局用行内样式：Tailwind 只扫描 src，沙盒自己的类名不会被生成
          <div
            data-theme={host.theme}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxWidth: 360,
              padding: 12,
              background: 'var(--xh-canvas)',
              borderRadius: 'var(--xh-radius-panel)',
              boxShadow: 'var(--xh-shadow-panel)',
              fontFamily: 'var(--xh-font-ui)',
            }}
          >
            <SkinIntroNotice />
            <div style={{ background: 'var(--xh-raised)', borderRadius: 'var(--xh-radius-card)', padding: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--xh-fg)' }}>界面风格</p>
              <SkinPicker />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {SWATCHES.map((name) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--xh-fg-2)' }}>
                  <span style={{ display: 'block', width: '100%', height: 32, borderRadius: 8, border: '1px solid var(--xh-line)', background: `var(--xh-${name})` }} />
                  {name}
                </div>
              ))}
            </div>
            <div className="theme-bg-secondary theme-text-primary" style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, fontSize: 12 }}>
              旧组件（theme-*）跟随当前风格
            </div>
          </div>,
          mount,
        )}
    </>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
```

- [ ] **Step 5: 加脚本并启动**

`package.json` 的 `scripts` 加 `"sandbox": "vite --config dev/sandbox/vite.config.ts"`。

Run: `pnpm sandbox`（后台运行）
Expected: `Local: http://localhost:5199/`。

- [ ] **Step 6: 在浏览器里核对**

打开 `http://localhost:5199/`，逐一核对：三种 X 背景 × 三种风格都切换一遍；变量色块和设计文档第 5 节一致；选中的风格卡片有强调色描边；没有露出原生单选框；「旧组件」那一行颜色跟着风格变；按 Tab 能进入风格卡片、方向键能切换。截图留档。

若露出了 ui-sdk 的原生单选框（ui-sdk 的基础样式只加在主文档，进不了 Shadow Root），在 `src/css/style.css` 的 ui-sdk 段里补一条，然后重新核对：

```css
  :where([data-slot='radio'] input[type='radio']) {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
```

- [ ] **Step 7: Commit**

```bash
git add dev/sandbox package.json
git commit -m "chore: add a local ui sandbox for skins"
```

---

### Task 14: 阶段 0 验收

- [ ] **Step 1: 全量测试**

Run: `pnpm test`
Expected: 全部通过（约 28 个用例）。

- [ ] **Step 2: 类型检查**

Run: Task 9 Step 7 的 diff 命令
Expected: 没有新增错误；`grep "src/ui/" /tmp/xh-tsc-now.txt` 没有输出。

- [ ] **Step 3: 生产构建**

Run: `pnpm exec plasmo build`
Expected: 成功；`build/chrome-mv3-prod` 里有设计变量、4 个字体文件和 ui-sdk 代码。

- [ ] **Step 4: 沙盒截图**

三种风格 × 三种 X 背景各一张，确认风格切换、变量、兼容层都正确。

- [ ] **Step 5: 真实 x.com 上的验收（需要完整源码）**

占位文件下扩展能加载，但没有数据。拿到真实的私有模块后，在 Chrome 里加载 `build/chrome-mv3-prod`，核对：设置页切换风格立即生效、换标签页同步；首次引导出现三步；老用户提示只出现一次；X 切换浅色 / 昏暗 / 纯黑时 `<html>` 的 `data-xh-palette` 跟着变；现有界面没有错位或看不清的文字。
