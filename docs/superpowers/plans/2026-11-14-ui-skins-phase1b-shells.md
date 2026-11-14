# UI 风格切换 · 阶段 1b（面板外壳和导航）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 悬浮面板换上三套外壳：柔光的悬浮卡片 + 分段导航，黑曜的左侧图标栏，原生的 X 模块 + 下划线标签。现有页面内容先原样放进去（阶段 1c、1d 再改写内容），拖动、收起、关闭、宽度、搜索框聚焦淡出、外部跳转、测试标记全部保留；停用整页 View Transitions。沙盒能用假数据渲染真实面板。

**Architecture:** `PanelNavigator` 新增 `layout` 渲染参数，外壳在导航上下文之内渲染，切换路由时外壳不重新挂载。外壳按 `useUiSkin()` 选实现：`CardShell`（柔光、原生）和 `RailShell`（黑曜）。首页按风格渲染各自的顶部（品牌栏 / 搜索栏 / 模块头）和导航，首页视图（概览、关注者、画像、点评）存在 `@xhunt/panel-home-view`，黑曜的图标栏和首页共用它。头部控件的行为（未读消息、引导气泡、常驻 / 默认两种模式的收起和关闭）从 `HeaderRightControls` 提取成 `usePanelControls`。

**Tech Stack:** React 19、阶段 1a 的基础组件、Tailwind 风格变体、Vitest。

对应设计文档第 4.1、6、7 节（第 7 条：停用整页 View Transitions）。画布：`A/B/C-profile.dc.html`、`A/B/C-pages.dc.html`。

---

## 范围说明

- **内容不改写**：关注者、性格、投资、点评、评论、消息、设置的内部样式留给阶段 1c、1d。本阶段只按视图分组：关注者 = `KolFollowersSection`；画像 = `MBTISection` + `InvestmentPanel`；点评 = `ReviewsOverview` + `CommentsSection`；概览 = 以上全部（等同现在的首页）。
- **原生风格先做悬浮形态**：嵌入 X 右栏和窄窗口回退属于阶段 3。原生的「动态」标签同样等阶段 3。
- **身份区**：公开仓库里 `KolData` 是 `any`，名字和头像字段无法确认，先用账号 handle 生成首字母头像，显示 handle、KOL 标记和排名；真实名字和头像在阶段 2 做资料页时补。「问 AI」依赖 AI 分身名单和登录态，属于阶段 2 的「AI 分身按钮」。
- **灵魂指数**：画布里柔光身份卡第三格是灵魂指数，需要额外请求，阶段 1c 的画像页一起做；本阶段第三格先显示 KOL 粉丝数。

## 保留的测试标记（e2e 依赖）

`fixed-twitter-panel`、`panel-settings-button`、`panel-messages-button`、`panel-back-button`、`panel-close-button`、`panel-minimize-button`、`settings-page`、`messages-page`；设置页标题文字仍在 `settings-page` 根节点内。

## 文件结构

| 文件 | 职责 |
|---|---|
| `dev/sandbox/chromeShim.ts` | 沙盒里的假 `chrome`：`storage`（存在 localStorage）、`runtime` |
| `dev/sandbox/mocks/*` | 接口层、远程配置的假实现和假数据 |
| `dev/sandbox/vite.config.ts` | 把接口层、远程配置重定向到假实现；不再替换存储 |
| `src/ui/shells/panelNav.ts` | 首页视图、各风格可用视图、路由和视图的换算 |
| `src/ui/shells/usePanelHomeView.ts` | 读写当前首页视图 |
| `src/ui/shells/usePanelControls.ts` | 未读消息、引导气泡、打开设置 / 消息、收起 / 关闭 |
| `src/ui/shells/GuideBubble.tsx` | 引导气泡（改用设计变量和基础组件） |
| `src/ui/shells/PanelShell.tsx` | `CardShell`、`RailShell`、`PanelTile` |
| `src/ui/shells/HomeChrome.tsx` | 三种首页顶部：品牌栏、搜索栏、模块头，身份区 |
| `src/ui/shells/PanelPageHeader.tsx` | 消息页、设置页的页头 |
| `src/compontents/navigation/PanelNavigator.tsx` | 新增 `layout`；去掉 View Transitions；路由入场动画；`xhunt:route-request` 事件 |
| `src/compontents/pages/HomePage.tsx` | 按风格渲染首页 |
| `src/compontents/pages/MessagesPage.tsx`、`SettingsPage.tsx` | 改用 `PanelPageHeader` |
| `src/compontents/area/FixedTwitterPanel.tsx` | 接入外壳、收起态 |
| `src/locales/zh.json`、`en.json` | 新文案 |
| `src/test/memoryStorage.ts` | setter 支持函数式更新（和 Plasmo 存储一致） |

---

### Task 1: 沙盒加载真实面板

**Files:**
- Create: `dev/sandbox/chromeShim.ts`、`dev/sandbox/mocks/fixtures.ts`、`dev/sandbox/mocks/api.ts`、`dev/sandbox/mocks/review.ts`、`dev/sandbox/mocks/nacos.ts`、`dev/sandbox/PanelDemo.tsx`
- Modify: `dev/sandbox/vite.config.ts`、`dev/sandbox/main.tsx`

- [ ] **Step 1: `dev/sandbox/chromeShim.ts`**

```ts
type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>;
type Listener = (changes: Changes, area: string) => void;

const PREFIX = 'xh-sandbox:';
const listeners = new Set<Listener>();

const read = (key: string) => {
  const raw = localStorage.getItem(PREFIX + key);
  return raw === null ? undefined : JSON.parse(raw);
};
const keys = () =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => key.slice(PREFIX.length));
const emit = (changes: Changes) => {
  if (Object.keys(changes).length) listeners.forEach((listener) => listener(changes, 'local'));
};

const local = {
  async get(query?: string | string[] | Record<string, unknown> | null) {
    const wanted =
      query == null ? keys() : typeof query === 'string' ? [query] : Array.isArray(query) ? query : Object.keys(query);
    const result: Record<string, unknown> = {};
    for (const key of wanted) {
      const value = read(key);
      if (value !== undefined) result[key] = value;
      else if (query && typeof query === 'object' && !Array.isArray(query)) result[key] = query[key];
    }
    return result;
  },
  async set(items: Record<string, unknown>) {
    const changes: Changes = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: read(key), newValue: value };
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
    emit(changes);
  },
  async remove(query: string | string[]) {
    const changes: Changes = {};
    for (const key of typeof query === 'string' ? [query] : query) {
      changes[key] = { oldValue: read(key) };
      localStorage.removeItem(PREFIX + key);
    }
    emit(changes);
  },
  async clear() {
    const changes: Changes = {};
    for (const key of keys()) {
      changes[key] = { oldValue: read(key) };
      localStorage.removeItem(PREFIX + key);
    }
    emit(changes);
  },
  async getBytesInUse() {
    return 0;
  },
};

const noopEvent = { addListener() {}, removeListener() {}, hasListener: () => false };

Object.assign(globalThis, {
  chrome: {
    storage: {
      local,
      sync: local,
      session: local,
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
        hasListener: (listener: Listener) => listeners.has(listener),
      },
    },
    runtime: {
      id: 'xhunt-sandbox',
      getManifest: () => ({ manifest_version: 3, version: '0.0.0-sandbox' }),
      getURL: (path: string) => path,
      sendMessage: async () => undefined,
      onMessage: noopEvent,
      connect: () => ({ postMessage() {}, disconnect() {}, onMessage: noopEvent, onDisconnect: noopEvent }),
    },
  },
});

export async function seedStorage(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    if (read(key) === undefined) localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }
}
```

- [ ] **Step 2: `dev/sandbox/mocks/fixtures.ts`（假数据，字段来自组件里的用法）**

```ts
const kol = (handle: string, name: string) => ({
  username: handle,
  name,
  avatar: `https://unavatar.io/x/${handle}`,
});

export const MOCK_USER_ID = 'mira_onchain';

export const MOCK_TW_INFO = {
  basicInfo: { isKol: true, classification: 'person' },
  kolFollow: {
    isProject: false,
    isCn: true,
    kolRank: 86,
    kolGlobalRank: 1234,
    kolCnRank: 56,
    kolProjectRank: null,
    kolRankChange: { day1: 2, day7: 12, day30: 40 },
    kolGlobalRankChange: { day1: 3, day7: 12, day30: 51 },
    kolCnRankChange: { day1: 0, day7: 3, day30: 8 },
    globalKolFollowersCount: 1200,
    cnKolFollowersCount: 312,
    topKolFollowersCount: 86,
    globalKolFollowers: [
      kol('lumenlabs', 'Lumen Labs'),
      kol('0xkai', '0xKai'),
      kol('echolin', 'Echo Lin'),
      kol('theopark', 'Theo Park'),
      kol('nova_vc', 'Nova VC'),
      kol('rin_eth', 'Rin.eth'),
      kol('juno_dao', 'Juno DAO'),
      kol('mika', 'Mika'),
    ],
    cnKolFollowers: [kol('echolin', 'Echo Lin'), kol('mika', 'Mika'), kol('xiaoyu', '小鱼')],
    topKolFollowers: [kol('lumenlabs', 'Lumen Labs'), kol('nova_vc', 'Nova VC')],
  },
  mbti: {
    cn: { mbti: 'INTJ', keyword: ['战略思维', '长期主义', '独立', '数据驱动'], explanation: '理性、独立，擅长系统化推演，偏好长期框架而非短线噪音。' },
    en: { mbti: 'INTJ', keyword: ['Strategic', 'Long-term', 'Independent', 'Data-driven'], explanation: 'Rational and independent, prefers long-term frameworks over short-term noise.' },
  },
};

export const MOCK_ROOT_DATA = null;

export const MOCK_REVIEW_INFO = {
  averageRating: 4.6,
  totalReviews: 128,
  realTotalReviews: 96,
  topReviewers: [
    { avatar: 'https://unavatar.io/x/echolin', username: 'echolin', displayName: 'Echo Lin' },
    { avatar: 'https://unavatar.io/x/theopark', username: 'theopark', displayName: 'Theo Park' },
  ],
  tagCloud: [
    { text: '投研', value: 12 },
    { text: '二级', value: 9 },
    { text: '宏观', value: 7 },
    { text: '空投', value: 5 },
  ],
};

export const MOCK_COMMENTS = {
  comments: [
    {
      id: 'c1',
      reviewer: { avatar: 'https://unavatar.io/x/echolin', displayName: 'Echo Lin', username: 'echolin' },
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      rating: 5,
      tags: ['投研', '宏观'],
      comment: '链上数据扎实，长期跟踪下来判断很稳。',
    },
    {
      id: 'c2',
      reviewer: { avatar: 'https://unavatar.io/x/theopark', displayName: 'Theo Park', username: 'theopark' },
      updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      rating: 4,
      tags: ['二级'],
      comment: '观点清晰，偶尔偏激进。',
    },
  ],
  pagination: { page: 1, totalPages: 5, totalComments: 23, hasPrevPage: false, hasNextPage: true },
};

export const MOCK_MESSAGES = [
  { id: 'm1', title: 'XHunt 0.4.6 更新', content: '新增三种界面风格，可在设置里切换。', created: String(Date.now() - 2 * 3600000), type: 'all' },
  { id: 'm2', title: '贡献榜新活动', content: '本周贡献榜奖励已开放领取。', created: String(Date.now() - 4 * 86400000), type: 'web3' },
];

export const MOCK_USER = {
  avatar: 'https://unavatar.io/x/alice_web3',
  displayName: 'Alice Chen',
  username: 'alice_web3',
  id: 'u1',
  twitterId: '1',
  xPoints: 120,
};
```

- [ ] **Step 3: `dev/sandbox/mocks/api.ts`、`review.ts`、`nacos.ts`**

```ts
// dev/sandbox/mocks/api.ts
export * from '../../../src/contents/services/api';

export const fetchXHuntUserTags = async () => null;
export const fetchPrivateMessages = async () => [];
export const getTwitterAuthUrl = async () => 'https://x.com';
```

```ts
// dev/sandbox/mocks/review.ts
import { MOCK_COMMENTS } from './fixtures';

export * from '../../../src/contents/services/review';

export const getHandleComments = async () => MOCK_COMMENTS;
export const userLogout = async () => null;
```

```ts
// dev/sandbox/mocks/nacos.ts
import { MOCK_MESSAGES } from './fixtures';

class SandboxNacosCacheManager {
  init() {}
  cleanup() {}
  async fetchWithCache<T = unknown>(dataId: string): Promise<T | undefined> {
    return (dataId.startsWith('xhunt_message') ? MOCK_MESSAGES : undefined) as T | undefined;
  }
  invalidate() {}
  clearCache() {}
  getStats() {
    return {};
  }
}

export const nacosCacheManager = new SandboxNacosCacheManager();
export default SandboxNacosCacheManager;
```

- [ ] **Step 4: `dev/sandbox/vite.config.ts` 改为重定向接口层、保留真实存储**

`resolve.alias` 去掉 `~storage/useLocalStorage` 那一条；`plugins` 里在现有插件后面加：

```ts
    {
      // 接口层和远程配置换成沙盒假数据；假实现自己引用真实文件时不再重定向
      name: 'xhunt-sandbox-mocks',
      enforce: 'pre',
      async resolveId(id, importer) {
        if (!importer || importer.includes('/dev/sandbox/mocks/')) return null;
        if (!/services\/(api|review)|nacosCacheManager/.test(id)) return null;
        const resolved = await this.resolve(id, importer, { skipSelf: true });
        if (!resolved) return null;
        const mocks: Record<string, string> = {
          'src/contents/services/api.ts': 'mocks/api.ts',
          'src/contents/services/review.ts': 'mocks/review.ts',
          'src/utils/nacosCacheManager.ts': 'mocks/nacos.ts',
        };
        const hit = Object.keys(mocks).find((real) => resolved.id.endsWith(real));
        return hit ? path.join(__dirname, mocks[hit]) : null;
      },
    },
```

- [ ] **Step 5: `dev/sandbox/PanelDemo.tsx`（真实面板 + 假数据）**

```tsx
import { FixedTwitterPanel } from '~/compontents/area/FixedTwitterPanel';
import { MOCK_REVIEW_INFO, MOCK_ROOT_DATA, MOCK_TW_INFO, MOCK_USER_ID } from './mocks/fixtures';

export function PanelDemo() {
  return (
    <FixedTwitterPanel
      twInfo={MOCK_TW_INFO}
      deletedTweets={[]}
      loadingTwInfo={false}
      loadingDel={false}
      error={undefined}
      userId={MOCK_USER_ID}
      rootData={MOCK_ROOT_DATA}
      loadingRootData={false}
      reviewInfo={MOCK_REVIEW_INFO as never}
      userInfo={null}
      projectMemberData={null}
      loadingProjectMember={false}
    />
  );
}
```

- [ ] **Step 6: `dev/sandbox/main.tsx` 接入假 `chrome` 和面板视图**

1. 第一行加 `import { seedStorage } from './chromeShim';`（必须在其他导入之前，任何模块读到 `chrome` 之前就装好）。
2. 加 `import { PanelDemo } from './PanelDemo';` 和 `import { MOCK_USER } from './mocks/fixtures';`。
3. 渲染前写入初始存储：

```tsx
await seedStorage({
  '@xhunt/user': MOCK_USER,
  '@xhunt/token': 'sandbox',
  '@xhunt/header-controls-guide-dismissed-map': { settings: true, messages: true, drag: true, panel: true },
  '@xhunt/uiSkinIntroSeen': true,
  '@settings/language1': 'zh',
});
createRoot(document.getElementById('app')!).render(<App />);
```

4. 工具栏加两个按钮切换「组件 / 面板」（`useState<'gallery' | 'panel'>('panel')`）；`panel` 时在 Shadow Root 里渲染 `<div data-theme={host.theme} data-skin={skin}><PanelDemo /></div>`，`gallery` 时保持现有陈列页。

- [ ] **Step 7: 浏览器核对，Commit**

刷新 `http://localhost:5199/`：面板出现在右上角，能看到关注者、性格、点评、评论；右上角图标能进消息（2 条假消息）和设置；切换风格时旧界面跟着变色。

```bash
git add dev/sandbox
git commit -m "chore(sandbox): render the real panel with mock data"
```

---

### Task 2: 首页视图模型

**Files:**
- Create: `src/ui/shells/panelNav.ts`、`src/ui/shells/usePanelHomeView.ts`
- Test: `src/ui/shells/panelNav.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { HOME_VIEWS, HOME_VIEW_STORAGE_KEY, destinationOf, resolveHomeView, routeOf } from './panelNav';
import { usePanelHomeView } from './usePanelHomeView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

describe('panelNav', () => {
  test('each skin has its own views', () => {
    expect(HOME_VIEWS.soft).toEqual(['followers', 'portrait', 'reviews']);
    expect(HOME_VIEWS.obsidian).toEqual(['overview', 'followers', 'portrait', 'reviews']);
    expect(HOME_VIEWS.native).toEqual(['overview', 'followers', 'reviews']);
  });

  test('falls back to the first view the skin has', () => {
    expect(resolveHomeView('soft', 'overview')).toBe('followers');
    expect(resolveHomeView('native', 'portrait')).toBe('overview');
    expect(resolveHomeView('obsidian', 'reviews')).toBe('reviews');
    expect(resolveHomeView('obsidian', 42)).toBe('overview');
  });

  test('maps destinations to routes and back', () => {
    expect(routeOf('messages')).toBe('/messages');
    expect(routeOf('settings')).toBe('/settings');
    expect(routeOf('portrait')).toBe('/home');
    expect(destinationOf('/settings', 'reviews')).toBe('settings');
    expect(destinationOf('/home', 'reviews')).toBe('reviews');
  });
});

describe('usePanelHomeView', () => {
  test('stores the view and resolves it for the current skin', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    const { result } = renderHook(() => usePanelHomeView());
    expect(result.current.view).toBe('overview');
    act(() => result.current.setView('reviews'));
    expect(result.current.view).toBe('reviews');
    act(() => setMemoryValue(HOME_VIEW_STORAGE_KEY, 'portrait'));
    expect(result.current.view).toBe('overview');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/shells/panelNav.test.ts`
Expected: FAIL，找不到 `./panelNav`。

- [ ] **Step 3: 实现**

```ts
// src/ui/shells/panelNav.ts
import type { UiSkin } from '../skin/skins';

export type HomeView = 'overview' | 'followers' | 'portrait' | 'reviews';
export type PanelDestination = HomeView | 'messages' | 'settings';

export const HOME_VIEWS: Record<UiSkin, readonly HomeView[]> = {
  soft: ['followers', 'portrait', 'reviews'],
  obsidian: ['overview', 'followers', 'portrait', 'reviews'],
  native: ['overview', 'followers', 'reviews'],
};

export const HOME_VIEW_STORAGE_KEY = '@xhunt/panel-home-view';

export function resolveHomeView(skin: UiSkin, stored: unknown): HomeView {
  const views = HOME_VIEWS[skin];
  return views.includes(stored as HomeView) ? (stored as HomeView) : views[0];
}

export function routeOf(destination: PanelDestination) {
  if (destination === 'messages') return '/messages';
  if (destination === 'settings') return '/settings';
  return '/home';
}

export function destinationOf(route: string, view: HomeView): PanelDestination {
  if (route === '/messages') return 'messages';
  if (route === '/settings') return 'settings';
  return view;
}
```

```ts
// src/ui/shells/usePanelHomeView.ts
import { useCallback } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useUiSkin } from '../skin/useUiSkin';
import { HOME_VIEW_STORAGE_KEY, resolveHomeView, type HomeView } from './panelNav';

export function usePanelHomeView() {
  const { skin } = useUiSkin();
  const [stored, setStored] = useLocalStorage<string>(HOME_VIEW_STORAGE_KEY, '');
  const setView = useCallback((next: HomeView) => setStored(next), [setStored]);
  return { skin, view: resolveHomeView(skin, stored), setView };
}
```

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/shells/panelNav.test.ts`
Expected: 4 passed。

```bash
git add src/ui/shells/panelNav.ts src/ui/shells/usePanelHomeView.ts src/ui/shells/panelNav.test.ts
git commit -m "feat(shell): add home view model per skin"
```

---

### Task 3: `usePanelControls` 和引导气泡

**Files:**
- Create: `src/ui/shells/usePanelControls.ts`、`src/ui/shells/GuideBubble.tsx`
- Test: `src/ui/shells/usePanelControls.test.tsx`
- Modify: `src/test/memoryStorage.ts`（setter 支持函数式更新）

- [ ] **Step 1: 写失败的测试**

```tsx
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { GuideBubble } from './GuideBubble';
import { GUIDE_STORAGE_KEY, usePanelControls } from './usePanelControls';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const navigateTo = vi.fn();
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo, goBack: () => {}, history: ['/home'], currentRoute: '/home' }),
}));

const listeners = new Set<(state: { hasUnread: boolean; isLoading: boolean; messages: unknown[] }) => void>();
const markAllAsRead = vi.fn();
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: vi.fn(),
    getState: () => ({ messages: [], hasUnread: false, isLoading: true }),
    addCallback: (cb: never) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    markAllAsRead: () => markAllAsRead(),
  },
}));

const minimize = vi.fn();
vi.mock('~/compontents/navigation/PanelContext', () => ({
  usePanelContext: () => ({ onMinimize: minimize }),
}));

describe('usePanelControls', () => {
  beforeEach(() => {
    navigateTo.mockReset();
    markAllAsRead.mockReset();
    minimize.mockReset();
  });

  test('shows the unread dot once messages have loaded', () => {
    const { result } = renderHook(() => usePanelControls());
    expect(result.current.hasUnread).toBe(false);
    act(() => listeners.forEach((cb) => cb({ hasUnread: true, isLoading: false, messages: [{}] })));
    expect(result.current.hasUnread).toBe(true);
  });

  test('opening messages navigates, marks read and retires its guide', () => {
    const { result } = renderHook(() => usePanelControls());
    act(() => listeners.forEach((cb) => cb({ hasUnread: true, isLoading: false, messages: [{}] })));
    expect(result.current.activeGuide).toBe('settings');
    act(() => result.current.openMessages());
    expect(navigateTo).toHaveBeenCalledWith('/messages');
    expect(markAllAsRead).toHaveBeenCalled();
    expect((getMemoryValue(GUIDE_STORAGE_KEY) as Record<string, boolean>).messages).toBe(true);
  });

  test('hiding closes in default mode and minimizes in persistent mode', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(() => usePanelControls(onClose));
    expect(result.current.persistent).toBe(false);
    result.current.hide?.();
    expect(onClose).toHaveBeenCalled();
    act(() => setMemoryValue('@xhunt/floatingPanelMode', 'persistent'));
    rerender();
    result.current.hide?.();
    expect(minimize).toHaveBeenCalled();
    expect(result.current.hideLabel).toBe('headerControlsGuideMinimizeTitle');
  });
});

describe('GuideBubble', () => {
  test('is a status with two ways to dismiss it', async () => {
    const onDismiss = vi.fn();
    render(<GuideBubble text='Open settings here' onDismiss={onDismiss} />);
    expect(screen.getByRole('status').textContent).toContain('Open settings here');
    await userEvent.click(screen.getByRole('button', { name: 'headerControlsGuideGotIt' }));
    await userEvent.click(screen.getByRole('button', { name: 'fanTipPanelCloseButtonLabel' }));
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/shells/usePanelControls.test.tsx`
Expected: FAIL，找不到 `./GuideBubble`。

- [ ] **Step 3: `src/test/memoryStorage.ts` 的 setter 改为支持函数式更新**

```ts
  const set = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = (store.has(key) ? store.get(key) : initialValue) as T;
      setMemoryValue(key, typeof next === 'function' ? (next as (previous: T) => T)(previous) : next);
    },
    [key, initialValue],
  );
```

- [ ] **Step 4: 实现 `src/ui/shells/usePanelControls.ts`**

```ts
import { useEffect, useState } from 'react';
import { usePanelContext } from '~/compontents/navigation/PanelContext';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { messageManager } from '~/utils/messageManager';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';

export type GuideKey = 'settings' | 'messages' | 'drag' | 'panel';

export const GUIDE_STORAGE_KEY = '@xhunt/header-controls-guide-dismissed-map';
const GUIDE_DEFAULTS: Record<GuideKey, boolean> = { settings: false, messages: false, drag: false, panel: false };

function useUnreadMessages() {
  const [hasUnread, setHasUnread] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!messageManager.getState().messages.length) messageManager.init();
    return messageManager.addCallback((state) => {
      setHasUnread(state.hasUnread);
      if (!state.isLoading) setChecked(true);
    });
  }, []);
  return checked && hasUnread;
}

export function usePanelControls(onClose?: () => void) {
  const { t } = useI18n();
  const { navigateTo } = useNavigation();
  const { onMinimize } = usePanelContext();
  const [mode] = useLocalStorage<'default' | 'persistent'>('@xhunt/floatingPanelMode', 'default');
  const [dismissed, setDismissed] = useLocalStorage<Record<GuideKey, boolean>>(GUIDE_STORAGE_KEY, GUIDE_DEFAULTS);
  const hasUnread = useUnreadMessages();
  const persistent = mode === 'persistent';
  const hide = persistent ? onMinimize : onClose;

  const dismissGuide = (key: GuideKey) =>
    setDismissed((previous) => ({ ...GUIDE_DEFAULTS, ...(previous || {}), [key]: true }));
  const available: GuideKey[] = ['settings', 'messages', 'drag', ...(hide ? (['panel'] as const) : [])];

  return {
    hasUnread,
    persistent,
    hide,
    hideLabel: persistent ? t('headerControlsGuideMinimizeTitle') : t('headerControlsGuideCloseTitle'),
    openSettings: () => {
      dismissGuide('settings');
      navigateTo('/settings');
    },
    openMessages: () => {
      dismissGuide('messages');
      navigateTo('/messages');
      if (hasUnread) messageManager.markAllAsRead();
    },
    activeGuide: available.find((key) => !dismissed?.[key]) ?? null,
    guideText: {
      settings: t('headerControlsGuideSettingsDesc'),
      messages: t('headerControlsGuideMessagesDesc'),
      drag: t('headerControlsGuideDragDesc'),
      panel: persistent ? t('headerControlsGuideMinimizeDesc') : t('headerControlsGuideCloseDesc'),
    } satisfies Record<GuideKey, string>,
    dismissGuide,
  };
}

export type PanelControls = ReturnType<typeof usePanelControls>;
```

- [ ] **Step 5: 实现 `src/ui/shells/GuideBubble.tsx`**

```tsx
import { useI18n } from '~contents/hooks/i18n';
import { CloseIcon } from '../icons';
import { Button, IconButton } from '../primitives';
import { cx } from '../primitives/cx';

export function GuideBubble({
  text,
  onDismiss,
  placement = 'below',
}: {
  text: string;
  onDismiss: () => void;
  placement?: 'below' | 'inline';
}) {
  const { t } = useI18n();
  return (
    <div
      role='status'
      className={cx(
        'z-[80] w-[218px] rounded-xh-card bg-xh-surface p-3 pr-8 text-[12px] leading-[18px] text-xh-fg-2 shadow-xh-pop xh-rise',
        placement === 'below' ? 'absolute right-0 top-[38px]' : 'relative w-auto',
      )}
    >
      <IconButton label={t('fanTipPanelCloseButtonLabel') || 'Close'} size='sm' onClick={onDismiss} className='!absolute right-1 top-1'>
        <CloseIcon size={12} />
      </IconButton>
      <p>{text}</p>
      <div className='mt-1.5 flex justify-end'>
        <Button size='sm' variant='soft' onClick={onDismiss}>
          {t('headerControlsGuideGotIt') || 'Got it'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 确认通过，Commit**

Run: `pnpm test src/ui/shells/usePanelControls.test.tsx`
Expected: 4 passed。

```bash
git add src/ui/shells/usePanelControls.ts src/ui/shells/GuideBubble.tsx src/ui/shells/usePanelControls.test.tsx src/test/memoryStorage.ts
git commit -m "feat(shell): extract panel controls and restyle guide bubbles"
```

---

### Task 4: `PanelNavigator` 加外壳插槽、去掉整页过渡

**Files:**
- Modify: `src/compontents/navigation/PanelNavigator.tsx`
- Test: `src/compontents/navigation/PanelNavigator.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { navigationService } from './NavigationService';
import { PanelNavigator, useNavigation } from './PanelNavigator';

function Home() {
  const { navigateTo } = useNavigation();
  return <button onClick={() => navigateTo('/settings')}>open settings</button>;
}

const routes = {
  '/home': { path: '/home', component: <Home /> },
  '/settings': { path: '/settings', component: <p>settings page</p> },
};

function Shell({ children }: { children: React.ReactNode }) {
  const { currentRoute } = useNavigation();
  return (
    <section aria-label='shell' data-route={currentRoute}>
      {children}
    </section>
  );
}

describe('PanelNavigator', () => {
  afterEach(() => {
    sessionStorage.clear();
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  test('renders routes inside a persistent layout without document view transitions', async () => {
    const startViewTransition = vi.fn((cb: () => void) => cb());
    Object.assign(document, { startViewTransition });
    render(<PanelNavigator routes={routes} layout={(content) => <Shell>{content}</Shell>} />);
    const shell = screen.getByRole('region', { name: 'shell' });
    expect(shell.dataset.route).toBe('/home');
    await userEvent.click(screen.getByRole('button', { name: 'open settings' }));
    expect(screen.getByText('settings page')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'shell' })).toBe(shell);
    expect(shell.dataset.route).toBe('/settings');
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  test('announces route requests before navigating', () => {
    const requests: unknown[] = [];
    const listener = (event: Event) => requests.push((event as CustomEvent).detail);
    window.addEventListener('xhunt:route-request', listener);
    render(<PanelNavigator routes={routes} />);
    act(() => navigationService.navigateTo('main-panel', '/home', { scrollToId: 'panel-scroll-comments' }));
    expect(requests).toEqual([{ route: '/home', props: { scrollToId: 'panel-scroll-comments' } }]);
    window.removeEventListener('xhunt:route-request', listener);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/compontents/navigation/PanelNavigator.test.tsx`
Expected: FAIL（`layout` 不存在，外壳区域找不到；`xhunt:route-request` 没有派发）。

- [ ] **Step 3: 修改 `PanelNavigator.tsx`**

1. `PanelNavigatorProps` 加 `layout?: (content: ReactNode) => ReactNode;`，组件参数解构出 `layout`。
2. 删掉 `supportsViewTransition` 常量；`navigateTo` 和 `goBack` 里直接调用 `updateHistory()`，依赖数组去掉 `supportsViewTransition`。
3. `navigateWithProps` 第一行加：

```ts
      try {
        window.dispatchEvent(new CustomEvent('xhunt:route-request', { detail: { route, props } }));
      } catch {}
```

4. 渲染部分替换为：

```tsx
  const routeConfig = routes[currentRoute] ?? routes['/home'];
  if (!routeConfig) return <div>No routes defined</div>;

  const content = (
    <div
      ref={contentRef}
      key={currentRoute}
      data-route={currentRoute}
      className={
        layout
          ? 'panel-route-content xh-rise flex min-h-0 flex-1 flex-col'
          : 'panel-route-content flex flex-col h-full max-h-[calc(90vh-80px)] overflow-hidden'
      }
    >
      {routeConfig.component}
    </div>
  );

  return <NavigationContext.Provider value={value}>{layout ? layout(content) : content}</NavigationContext.Provider>;
```

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/compontents/navigation/PanelNavigator.test.tsx`
Expected: 2 passed。

```bash
git add src/compontents/navigation/PanelNavigator.tsx src/compontents/navigation/PanelNavigator.test.tsx
git commit -m "feat(shell): let the panel navigator host a persistent layout

Drop document-level view transitions, which also animated x.com itself."
```

---

### Task 5: 文案

**Files:** Modify `src/locales/zh.json`、`src/locales/en.json`

- [ ] **Step 1: 两个文件末尾各加（上一行补逗号）**

zh：

```json
  "homeViewOverview": "概览",
  "homeViewFollowers": "关注者",
  "homeViewPortrait": "画像",
  "homeViewReviews": "点评",
  "panelSectionsLabel": "面板分区",
  "panelNavLabel": "面板导航",
  "panelSearchLabel": "在 X 上搜索",
  "panelSearchPlaceholder": "搜索账户、代币或合约",
  "panelCollapse": "收起为图标栏",
  "panelExpand": "展开面板",
  "panelRestore": "展开 XHunt 面板",
  "panelDrag": "拖动面板",
  "messagesUnread": "消息，有未读",
  "panelGlobalInfluence": "全球影响力",
  "panelCnInfluence": "华语影响力",
  "panelKolFollowers": "KOL 粉丝"
```

en：

```json
  "homeViewOverview": "Overview",
  "homeViewFollowers": "Followers",
  "homeViewPortrait": "Profile",
  "homeViewReviews": "Reviews",
  "panelSectionsLabel": "Panel sections",
  "panelNavLabel": "Panel navigation",
  "panelSearchLabel": "Search on X",
  "panelSearchPlaceholder": "Search accounts, tokens or contracts",
  "panelCollapse": "Collapse to icon bar",
  "panelExpand": "Expand panel",
  "panelRestore": "Open XHunt panel",
  "panelDrag": "Drag panel",
  "messagesUnread": "Messages, unread",
  "panelGlobalInfluence": "Global influence",
  "panelCnInfluence": "Chinese influence",
  "panelKolFollowers": "KOL followers"
```

- [ ] **Step 2: 校验 JSON，Commit**

Run: `node -e "require('./src/locales/zh.json'); require('./src/locales/en.json'); console.log('ok')"`

```bash
git add src/locales/zh.json src/locales/en.json
git commit -m "feat(shell): add panel shell strings"
```

---

### Task 6: 外壳 `PanelShell`

**Files:**
- Create: `src/ui/shells/PanelShell.tsx`
- Test: `src/ui/shells/PanelShell.test.tsx`

`CardShell`（柔光、原生）只负责外框、提示和底栏；`RailShell`（黑曜）多一条图标栏，收起时只剩图标栏。柔光、原生的收起态由 `FixedTwitterPanel` 渲染 `PanelTile`。

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAgent } from '@ui-sdk/react/agent';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { PanelShell, PanelTile } from './PanelShell';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const navigateTo = vi.fn();
let currentRoute = '/home';
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo, goBack: () => {}, history: ['/home'], currentRoute }),
}));
vi.mock('~/utils/messageManager', () => ({
  messageManager: { init: () => {}, getState: () => ({ messages: [], hasUnread: false, isLoading: false }), addCallback: () => () => {}, markAllAsRead: () => {} },
}));
const minimize = vi.fn();
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: minimize }) }));

const agent = createAgent();

function renderShell(collapsed = false, onRestore = vi.fn()) {
  return render(
    <div data-skin='obsidian'>
      <PanelShell collapsed={collapsed} onRestore={onRestore} footer={<footer>account</footer>}>
        <p>route content</p>
      </PanelShell>
    </div>,
  );
}

describe('PanelShell', () => {
  beforeEach(() => {
    navigateTo.mockReset();
    currentRoute = '/home';
    setMemoryValue('@xhunt/header-controls-guide-dismissed-map', { settings: true, messages: true, drag: true, panel: true });
  });

  test('soft and native shells frame the route content and footer', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(
      <PanelShell collapsed={false} onRestore={() => {}} footer={<footer>account</footer>}>
        <p>route content</p>
      </PanelShell>,
    );
    expect(screen.getByText('route content')).toBeTruthy();
    expect(screen.getByText('account')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  test('the obsidian rail navigates home views, messages and settings', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    renderShell();
    expect(screen.getByRole('tablist', { name: 'panelNavLabel' })).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'homeViewPortrait' }));
    expect(navigateTo).toHaveBeenCalledWith('/home');
    await userEvent.click(screen.getByTestId('panel-settings-button'));
    expect(navigateTo).toHaveBeenCalledWith('/settings');
  });

  test('collapsed obsidian keeps only the rail, and a rail tab restores it', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    setMemoryValue('@xhunt/floatingPanelMode', 'persistent');
    const onRestore = vi.fn();
    renderShell(true, onRestore);
    expect(screen.getByText('route content').closest('[hidden], .hidden')).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'panelExpand' }));
    expect(onRestore).toHaveBeenCalled();
  });

  test('an agent can use the rail by name', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    renderShell();
    const rail = agent.snapshot().find((entry) => !entry.offPage && entry.label === 'panelNavLabel');
    expect(rail, 'rail is missing from the snapshot').toBeTruthy();
    const result = await agent.act({ steps: [{ ref: 'panelNavLabel', action: 'setValue', args: ['messages'] }] });
    expect(result.ok, result.error?.message).toBe(true);
    expect(navigateTo).toHaveBeenCalledWith('/messages');
  });
});

describe('PanelTile', () => {
  test('is a named restore button', async () => {
    const onRestore = vi.fn();
    render(<PanelTile onRestore={onRestore} />);
    await userEvent.click(screen.getByRole('button', { name: 'panelRestore' }));
    expect(onRestore).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/shells/PanelShell.test.tsx`
Expected: FAIL，找不到 `./PanelShell`。

- [ ] **Step 3: 实现 `src/ui/shells/PanelShell.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { useI18n } from '~contents/hooks/i18n';
import { BellIcon, LogoIcon, OverviewIcon, PortraitIcon, SidebarIcon, SlidersIcon, StarIcon, UsersIcon } from '../icons';
import { Button, IconButton, TabList, TabPanel, Tabs } from '../primitives';
import { cx } from '../primitives/cx';
import { useUiSkin } from '../skin/useUiSkin';
import { GuideBubble } from './GuideBubble';
import { destinationOf, type PanelDestination } from './panelNav';
import { usePanelControls } from './usePanelControls';
import { usePanelHomeView } from './usePanelHomeView';

export interface PanelShellProps {
  collapsed: boolean;
  onRestore: () => void;
  onClose?: () => void;
  notice?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function PanelShell(props: PanelShellProps) {
  const { skin } = useUiSkin();
  return skin === 'obsidian' ? <RailShell {...props} /> : <CardShell {...props} />;
}

function CardShell({ notice, footer, children }: PanelShellProps) {
  return (
    <div
      className={cx(
        'flex max-h-[calc(90vh-32px)] flex-col overflow-hidden bg-xh-canvas font-xh-ui text-xh-fg',
        'soft:gap-2 soft:rounded-[24px] soft:p-2 soft:text-[13px] soft:leading-[1.45] soft:shadow-xh-panel',
        'native:rounded-2xl native:text-[15px] native:leading-[1.35] native:shadow-xh-pop',
      )}
    >
      {notice}
      <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
      {footer}
    </div>
  );
}

function RailShell({ collapsed, onRestore, onClose, notice, footer, children }: PanelShellProps) {
  const { t } = useI18n();
  const { currentRoute, navigateTo } = useNavigation();
  const { view, setView } = usePanelHomeView();
  const controls = usePanelControls(onClose);
  const destination = destinationOf(currentRoute, view);

  const go = (next: PanelDestination) => {
    if (collapsed) onRestore();
    if (next === 'messages') return controls.openMessages();
    if (next === 'settings') return controls.openSettings();
    setView(next);
    navigateTo('/home');
  };

  const items = [
    { value: 'overview', label: t('homeViewOverview'), icon: <OverviewIcon size={18} /> },
    { value: 'followers', label: t('homeViewFollowers'), icon: <UsersIcon size={18} /> },
    { value: 'portrait', label: t('homeViewPortrait'), icon: <PortraitIcon size={18} /> },
    { value: 'reviews', label: t('homeViewReviews'), icon: <StarIcon size={18} /> },
    {
      value: 'messages',
      label: controls.hasUnread ? t('messagesUnread') : t('messages'),
      icon: <BellIcon size={18} />,
      dot: controls.hasUnread,
      testId: 'panel-messages-button',
    },
    { value: 'settings', label: t('settings'), icon: <SlidersIcon size={18} />, spaceBefore: true, testId: 'panel-settings-button' },
  ] as const;

  return (
    <Tabs
      value={destination}
      onValueChange={go}
      variant='rail'
      className='flex max-h-[calc(90vh-32px)] overflow-hidden rounded-[18px] bg-xh-canvas font-xh-ui text-[13px] leading-[1.45] text-xh-fg shadow-xh-panel'
    >
      <div
        className={cx(
          'flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-[var(--xh-rail)] py-2.5',
          collapsed ? 'border-transparent' : 'border-xh-line',
        )}
      >
        <span className='tw-hunt-drag-handle mb-2.5 grid size-[30px] cursor-grab place-items-center rounded-[9px] bg-xh-fg text-xh-canvas'>
          <LogoIcon size={14} />
        </span>
        <TabList aria-label={t('panelNavLabel')} items={items} className='min-h-0 flex-1' />
        {controls.persistent ? (
          <IconButton
            label={collapsed ? t('panelExpand') : t('panelCollapse')}
            onClick={collapsed ? onRestore : controls.hide}
            data-xhunt-testid='panel-minimize-button'
          >
            <SidebarIcon size={18} />
          </IconButton>
        ) : null}
      </div>
      <TabPanel value={destination} className={cx('flex min-w-0 flex-1 flex-col', collapsed && 'hidden')}>
        {notice}
        {controls.activeGuide ? (
          <div className='px-3 pt-2'>
            <GuideBubble
              placement='inline'
              text={controls.guideText[controls.activeGuide]}
              onDismiss={() => controls.dismissGuide(controls.activeGuide!)}
            />
          </div>
        ) : null}
        <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
        {footer}
      </TabPanel>
    </Tabs>
  );
}

export function PanelTile({ onRestore }: { onRestore: () => void }) {
  const { t } = useI18n();
  return (
    <Button
      aria-label={t('panelRestore')}
      title='XHunt'
      onClick={onRestore}
      data-xhunt-testid='panel-restore-button'
      className={cx(
        'tw-hunt-drag-handle-minimized !size-12 !p-0 shadow-xh-panel',
        'soft:!rounded-2xl soft:!border-0 soft:!bg-xh-fg soft:!text-xh-canvas',
        'native:!rounded-full native:!bg-xh-surface native:!text-xh-fg native:shadow-xh-pop',
        'obsidian:!rounded-[14px] obsidian:!bg-xh-fg obsidian:!text-xh-canvas',
      )}
    >
      <LogoIcon size={20} />
    </Button>
  );
}
```

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/shells/PanelShell.test.tsx`
Expected: 5 passed。

```bash
git add src/ui/shells/PanelShell.tsx src/ui/shells/PanelShell.test.tsx
git commit -m "feat(shell): add card and rail panel shells"
```

---

### Task 7: 三种首页顶部和身份区

**Files:**
- Create: `src/ui/shells/HomeChrome.tsx`
- Test: `src/ui/shells/HomeChrome.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { HomeChrome, formatRank, rankDelta } from './HomeChrome';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const navigateTo = vi.fn();
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo, goBack: () => {}, history: ['/home'], currentRoute: '/home' }),
}));
vi.mock('~/utils/messageManager', () => ({
  messageManager: { init: () => {}, getState: () => ({ messages: [], hasUnread: false, isLoading: false }), addCallback: () => () => {}, markAllAsRead: () => {} },
}));
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: () => {} }) }));

const TW = {
  basicInfo: { isKol: true },
  kolFollow: { kolGlobalRank: 1234, kolCnRank: 56, kolGlobalRankChange: { day7: 12 }, kolCnRankChange: { day7: -3 }, globalKolFollowersCount: 1200 },
};

function renderChrome() {
  return render(
    <HomeChrome userId='mira_onchain' twInfo={TW} onClose={() => {}}>
      {(view) => <p>view {view}</p>}
    </HomeChrome>,
  );
}

describe('HomeChrome', () => {
  beforeEach(() => {
    navigateTo.mockReset();
    setMemoryValue('@xhunt/header-controls-guide-dismissed-map', { settings: true, messages: true, drag: true, panel: true });
  });

  test('soft: brand bar, identity card with ranks and segmented sections', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    renderChrome();
    expect(screen.getByText('XHunt')).toBeTruthy();
    expect(screen.getByText('@mira_onchain')).toBeTruthy();
    expect(screen.getByText('#1,234')).toBeTruthy();
    expect(screen.getByText('↑12')).toBeTruthy();
    expect(screen.getByText('↓3')).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'panelSectionsLabel' })).toBeTruthy();
    expect(screen.getByText('view followers')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'homeViewReviews' }));
    expect(screen.getByText('view reviews')).toBeTruthy();
    await userEvent.click(screen.getByTestId('panel-settings-button'));
    expect(navigateTo).toHaveBeenCalledWith('/settings');
  });

  test('native: module header with underline tabs', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    renderChrome();
    expect(screen.getByRole('heading', { name: /XHunt/ })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'homeViewOverview',
      'homeViewFollowers',
      'homeViewReviews',
    ]);
    expect(screen.getByTestId('panel-messages-button')).toBeTruthy();
  });

  test('obsidian: search bar and identity row, views come from the rail', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    renderChrome();
    expect(screen.getByRole('searchbox', { name: 'panelSearchLabel' })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('view overview')).toBeTruthy();
  });
});

describe('rank helpers', () => {
  test('format ranks and deltas', () => {
    expect(formatRank(1234)).toBe('#1,234');
    expect(formatRank(undefined)).toBe('—');
    expect(rankDelta({ day7: 5 })).toEqual({ text: '↑5', tone: 'up' });
    expect(rankDelta({ day7: -2 })).toEqual({ text: '↓2', tone: 'down' });
    expect(rankDelta({ day7: 0 })).toBeNull();
    expect(rankDelta(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/shells/HomeChrome.test.tsx`
Expected: FAIL，找不到 `./HomeChrome`。

- [ ] **Step 3: 实现 `src/ui/shells/HomeChrome.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { useI18n } from '~contents/hooks/i18n';
import { BellIcon, CloseIcon, GripIcon, LogoIcon, MinimizeIcon, SlidersIcon } from '../icons';
import { Avatar, Badge, IconButton, SearchField, TabList, TabPanel, Tabs } from '../primitives';
import { cx } from '../primitives/cx';
import { GuideBubble } from './GuideBubble';
import { HOME_VIEWS, type HomeView } from './panelNav';
import { usePanelControls, type GuideKey, type PanelControls } from './usePanelControls';
import { usePanelHomeView } from './usePanelHomeView';

type RankChange = Partial<Record<'day1' | 'day7' | 'day30', number>> | undefined;

export function formatRank(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `#${n.toLocaleString('en-US')}` : '—';
}

export function formatCount(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
}

export function rankDelta(change: RankChange) {
  const n = Number(change?.day7);
  if (!Number.isFinite(n) || n === 0) return null;
  return n > 0 ? { text: `↑${n}`, tone: 'up' as const } : { text: `↓${Math.abs(n)}`, tone: 'down' as const };
}

interface HomeChromeProps {
  userId: string;
  twInfo: any;
  onClose?: () => void;
  children: (view: HomeView) => ReactNode;
}

export function HomeChrome({ userId, twInfo, onClose, children }: HomeChromeProps) {
  const { t } = useI18n();
  const { skin, view, setView } = usePanelHomeView();
  const controls = usePanelControls(onClose);
  const items = HOME_VIEWS[skin].map((value) => ({ value, label: t(VIEW_LABEL[value]) }));
  const body = (
    <div className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar soft:-mx-2 soft:px-2 obsidian:px-3 obsidian:pb-3'>
      {children(view)}
    </div>
  );

  if (skin === 'obsidian') {
    return (
      <>
        <ObsidianTopBar controls={controls} />
        <div className='px-3 pb-2.5'>
          <Identity userId={userId} twInfo={twInfo} showRanks={false} />
        </div>
        {body}
      </>
    );
  }

  return (
    <Tabs value={view} onValueChange={setView} variant={skin === 'native' ? 'underline' : 'segmented'} className='flex min-h-0 flex-1 flex-col soft:gap-2'>
      {skin === 'native' ? (
        <NativeModuleHeader userId={userId} controls={controls} />
      ) : (
        <>
          <SoftTopBar controls={controls} />
          <div className='rounded-xh-card bg-xh-raised p-3 shadow-xh-card'>
            <Identity userId={userId} twInfo={twInfo} showRanks />
          </div>
        </>
      )}
      <TabList aria-label={t('panelSectionsLabel')} items={items} />
      <TabPanel value={view} className='flex min-h-0 flex-1 flex-col'>
        {body}
      </TabPanel>
    </Tabs>
  );
}

const VIEW_LABEL: Record<HomeView, string> = {
  overview: 'homeViewOverview',
  followers: 'homeViewFollowers',
  portrait: 'homeViewPortrait',
  reviews: 'homeViewReviews',
};

function Guided({ controls, guide, children }: { controls: PanelControls; guide: GuideKey; children: ReactNode }) {
  return (
    <span className='relative inline-flex'>
      {children}
      {controls.activeGuide === guide ? (
        <GuideBubble text={controls.guideText[guide]} onDismiss={() => controls.dismissGuide(guide)} />
      ) : null}
    </span>
  );
}

function ControlButtons({ controls, iconSize }: { controls: PanelControls; iconSize: number }) {
  const { t } = useI18n();
  return (
    <>
      <Guided controls={controls} guide='messages'>
        <IconButton
          label={controls.hasUnread ? t('messagesUnread') : t('messages')}
          dot={controls.hasUnread}
          onClick={controls.openMessages}
          data-xhunt-testid='panel-messages-button'
        >
          <BellIcon size={iconSize} />
        </IconButton>
      </Guided>
      <Guided controls={controls} guide='settings'>
        <IconButton label={t('settings')} onClick={controls.openSettings} data-xhunt-testid='panel-settings-button'>
          <SlidersIcon size={iconSize} />
        </IconButton>
      </Guided>
      <Guided controls={controls} guide='drag'>
        <IconButton label={t('panelDrag')} className='tw-hunt-drag-handle cursor-grab' onClick={() => controls.dismissGuide('drag')}>
          <GripIcon size={iconSize} />
        </IconButton>
      </Guided>
      {controls.hide ? (
        <Guided controls={controls} guide='panel'>
          <IconButton
            label={controls.hideLabel}
            onClick={() => {
              controls.dismissGuide('panel');
              controls.hide?.();
            }}
            data-xhunt-testid={controls.persistent ? 'panel-minimize-button' : 'panel-close-button'}
          >
            {controls.persistent ? <MinimizeIcon size={iconSize} /> : <CloseIcon size={iconSize} />}
          </IconButton>
        </Guided>
      ) : null}
    </>
  );
}

function SoftTopBar({ controls }: { controls: PanelControls }) {
  return (
    <div className='flex h-9 items-center justify-between pl-1.5 pr-0.5'>
      <span className='tw-hunt-drag-handle flex cursor-grab items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]'>
        <span className='grid size-[22px] place-items-center rounded-[7px] bg-xh-fg text-xh-canvas'>
          <LogoIcon size={14} />
        </span>
        XHunt
      </span>
      <span className='flex items-center gap-0.5'>
        <ControlButtons controls={controls} iconSize={16} />
      </span>
    </div>
  );
}

function ObsidianTopBar({ controls }: { controls: PanelControls }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  return (
    <div className='flex items-center gap-1 px-3 pb-2 pt-2.5'>
      <SearchField
        aria-label={t('panelSearchLabel')}
        placeholder={t('panelSearchPlaceholder')}
        value={query}
        onValueChange={setQuery}
        onSubmit={(value) => {
          if (value.trim()) window.location.assign(`https://x.com/search?q=${encodeURIComponent(value.trim())}&src=typed_query`);
        }}
        className='flex-1'
      />
      <IconButton label={t('panelDrag')} className='tw-hunt-drag-handle cursor-grab' onClick={() => controls.dismissGuide('drag')}>
        <GripIcon />
      </IconButton>
      {!controls.persistent && controls.hide ? (
        <IconButton label={controls.hideLabel} onClick={controls.hide} data-xhunt-testid='panel-close-button'>
          <CloseIcon />
        </IconButton>
      ) : null}
    </div>
  );
}

function NativeModuleHeader({ userId, controls }: { userId: string; controls: PanelControls }) {
  const { primaryDomain } = useUserDomain();
  return (
    <div className='flex items-start justify-between gap-2 pb-1.5 pl-4 pr-3 pt-3'>
      <div className='tw-hunt-drag-handle min-w-0 cursor-grab'>
        <h2 className='flex items-center gap-2 text-[20px] font-extrabold leading-[1.2] tracking-[-0.01em]'>
          XHunt
          <Badge>{primaryDomain === 'ai' ? 'AI' : 'Web3'}</Badge>
        </h2>
        <p className='mt-px truncate text-[13px] text-xh-fg-2'>{userId ? `@${userId}` : 'XHunt'}</p>
      </div>
      <span className='flex items-center gap-0.5'>
        <ControlButtons controls={controls} iconSize={18} />
      </span>
    </div>
  );
}

function Identity({ userId, twInfo, showRanks }: { userId: string; twInfo: any; showRanks: boolean }) {
  const { t } = useI18n();
  const { primaryDomain } = useUserDomain();
  const kol = twInfo?.kolFollow ?? {};
  const ai = primaryDomain === 'ai';
  const ranks = [
    { label: t('panelGlobalInfluence'), value: formatRank(kol[ai ? 'kolGlobalRankAi' : 'kolGlobalRank']), delta: rankDelta(kol[ai ? 'kolGlobalRankChangeAi' : 'kolGlobalRankChange']) },
    { label: t('panelCnInfluence'), value: formatRank(kol[ai ? 'kolCnRankAi' : 'kolCnRank']), delta: rankDelta(kol[ai ? 'kolCnRankChangeAi' : 'kolCnRankChange']) },
    { label: t('panelKolFollowers'), value: formatCount(kol[ai ? 'globalKolFollowersCountAi' : 'globalKolFollowersCount']), delta: null },
  ];
  return (
    <>
      <div className='flex items-center gap-2.5'>
        <Avatar name={userId || 'XHunt'} />
        <div className='min-w-0'>
          <div className='flex items-center gap-1.5 text-[15px] font-semibold leading-[1.2] tracking-[-0.015em]'>
            <span className='truncate'>@{userId}</span>
            {twInfo?.basicInfo?.isKol ? <Badge>KOL</Badge> : null}
          </div>
        </div>
      </div>
      {showRanks ? (
        <dl className='mt-3 grid grid-cols-3 gap-1.5'>
          {ranks.map((rank) => (
            <div key={rank.label} className='flex flex-col gap-px rounded-xl bg-xh-canvas px-[9px] py-[7px]'>
              <dt className='truncate text-[11px] text-xh-fg-2'>{rank.label}</dt>
              <dd className='flex items-baseline gap-1 text-[15px] font-semibold tracking-[-0.02em] tabular-nums'>
                {rank.value}
                {rank.delta ? (
                  <em className={cx('text-[10.5px] font-semibold not-italic', rank.delta.tone === 'up' ? 'text-xh-up' : 'text-xh-down')}>
                    {rank.delta.text}
                  </em>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/shells/HomeChrome.test.tsx`
Expected: 4 passed。

```bash
git add src/ui/shells/HomeChrome.tsx src/ui/shells/HomeChrome.test.tsx
git commit -m "feat(shell): add soft, obsidian and native home headers"
```

---

### Task 8: 消息页、设置页的页头

**Files:**
- Create: `src/ui/shells/PanelPageHeader.tsx`
- Test: `src/ui/shells/PanelPageHeader.test.tsx`
- Modify: `src/compontents/pages/MessagesPage.tsx`、`src/compontents/pages/SettingsPage.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { PanelPageHeader } from './PanelPageHeader';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const goBack = vi.fn();
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo: () => {}, goBack, history: ['/home', '/settings'], currentRoute: '/settings' }),
}));
vi.mock('~/utils/messageManager', () => ({
  messageManager: { init: () => {}, getState: () => ({ messages: [], hasUnread: false, isLoading: false }), addCallback: () => () => {}, markAllAsRead: () => {} },
}));
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: () => {} }) }));

describe('PanelPageHeader', () => {
  test('shows the title, goes back and closes', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    const onClose = vi.fn();
    render(<PanelPageHeader title='XHunt 设置' showBack onClose={onClose} />);
    expect(screen.getByRole('heading', { name: 'XHunt 设置' })).toBeTruthy();
    await userEvent.click(screen.getByTestId('panel-back-button'));
    expect(goBack).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('panel-close-button'));
    expect(onClose).toHaveBeenCalled();
  });

  test('obsidian has no back button because the rail navigates', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    render(<PanelPageHeader title='XHunt 消息' showBack onClose={() => {}} />);
    expect(screen.queryByTestId('panel-back-button')).toBeNull();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/shells/PanelPageHeader.test.tsx`
Expected: FAIL，找不到 `./PanelPageHeader`。

- [ ] **Step 3: 实现 `src/ui/shells/PanelPageHeader.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { useI18n } from '~contents/hooks/i18n';
import { ArrowLeftIcon, ChevronLeftIcon, CloseIcon, GripIcon, MinimizeIcon } from '../icons';
import { IconButton } from '../primitives';
import { useUiSkin } from '../skin/useUiSkin';
import { usePanelControls } from './usePanelControls';

export function PanelPageHeader({
  title,
  showBack = true,
  onClose,
  actions,
}: {
  title: ReactNode;
  showBack?: boolean;
  onClose?: () => void;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const { goBack, history } = useNavigation();
  const controls = usePanelControls(onClose);
  const canGoBack = skin !== 'obsidian' && showBack && history.length > 1;

  return (
    <div className='flex items-center gap-2 soft:h-9 soft:pl-0.5 soft:pr-0.5 obsidian:px-3 obsidian:pb-2 obsidian:pt-2.5 native:gap-3 native:pb-1 native:pl-4 native:pr-3 native:pt-3'>
      {canGoBack ? (
        <IconButton label={t('back') || 'Back'} size='sm' onClick={goBack} data-xhunt-testid='panel-back-button'>
          {skin === 'native' ? <ArrowLeftIcon size={20} /> : <ChevronLeftIcon />}
        </IconButton>
      ) : null}
      <h2 className='tw-hunt-drag-handle min-w-0 flex-1 cursor-grab truncate font-semibold soft:text-[13px] obsidian:text-[13px] native:text-[20px] native:font-extrabold'>
        {title}
      </h2>
      {actions}
      <IconButton label={t('panelDrag')} size='sm' className='tw-hunt-drag-handle cursor-grab'>
        <GripIcon />
      </IconButton>
      {controls.hide ? (
        <IconButton
          label={controls.hideLabel}
          size='sm'
          onClick={controls.hide}
          data-xhunt-testid={controls.persistent ? 'panel-minimize-button' : 'panel-close-button'}
        >
          {controls.persistent ? <MinimizeIcon /> : <CloseIcon />}
        </IconButton>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 两个页面改用新页头**

`MessagesPage.tsx`：删除 `PanelHeader`、`HeaderRightControls` 的导入和 `headerRightContent`，把 `<PanelHeader title={…} showBackButton={showBackButton} rightContent={…} />` 换成：

```tsx
<PanelPageHeader title={`XHunt ${t('messages')}`} showBack={showBackButton} onClose={onClose} />
```

`SettingsPage.tsx`：同样把顶部的 `<PanelHeader … />` 换成：

```tsx
<PanelPageHeader title={t('settingsTitle')} showBack={showBackButton} onClose={onClose} />
```

两处都加 `import { PanelPageHeader } from '~/ui/shells/PanelPageHeader';`，并删掉不再使用的导入。

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/shells/PanelPageHeader.test.tsx`
Expected: 2 passed。

```bash
git add src/ui/shells/PanelPageHeader.tsx src/ui/shells/PanelPageHeader.test.tsx src/compontents/pages/MessagesPage.tsx src/compontents/pages/SettingsPage.tsx
git commit -m "feat(shell): add skin-aware page header for messages and settings"
```

---

### Task 9: 首页按风格渲染

**Files:** Modify `src/compontents/pages/HomePage.tsx`

- [ ] **Step 1: 改写渲染部分**

1. 删除 `PanelHeader`、`HeaderRightControls`、`useNavigation`、lucide 中不再用的图标、`DeletedTweetsSection`、`ProjectMembersSection` 的导入，加：

```ts
import { HomeChrome } from '~/ui/shells/HomeChrome';
import type { HomeView } from '~/ui/shells/panelNav';
import { usePanelHomeView } from '~/ui/shells/usePanelHomeView';
```

2. 组件内加：评论或点评被外部跳转时切到点评视图（`navigationService.navigateTo('main-panel','/home',{scrollToId:'panel-scroll-comments'})` 来自资料页点评卡和评论翻页）：

```ts
  const { setView } = usePanelHomeView();
  useEffect(() => {
    const onRequest = (event: Event) => {
      const id = (event as CustomEvent<{ route?: string; props?: { scrollToId?: string } }>).detail?.props?.scrollToId;
      if (id === 'panel-scroll-comments' || id === 'panel-scroll-reviews') setView('reviews');
    };
    window.addEventListener('xhunt:route-request', onRequest);
    return () => window.removeEventListener('xhunt:route-request', onRequest);
  }, [setView]);
```

三套风格都有「点评」视图，所以统一切到 `'reviews'`。

3. `return` 改为：

```tsx
  const sections = (view: HomeView) => {
    if (loadingTwInfo) {
      return (
        <div className='flex min-h-[240px] flex-col items-center justify-center gap-2 text-xh-fg-2'>
          <Loader2 className='h-6 w-6 animate-spin' />
          <p className='text-sm'>{t('loading')}</p>
        </div>
      );
    }
    const followers = twInfo ? <KolFollowersSection kolData={twInfo} /> : null;
    const portrait = (
      <>
        {mbti && <MBTISection data={mbti} />}
        {!loadingRootData && rootData && (rootData?.invested || rootData?.investor) && twInfo?.basicInfo?.classification !== 'person' && (
          <InvestmentPanel data={rootData} classicStyle />
        )}
      </>
    );
    const reviews = (
      <>
        <div id='panel-scroll-reviews' ref={reviewsRef}>
          <ReviewsOverview stats={reviewInfo} />
        </div>
        {userId && (
          <div id='panel-scroll-comments'>
            <CommentsSection userId={userId} initialCommentsCount={0} />
          </div>
        )}
      </>
    );
    if (view === 'followers') return followers;
    if (view === 'portrait') return portrait;
    if (view === 'reviews') return reviews;
    return (
      <>
        {followers}
        {portrait}
        {reviews}
      </>
    );
  };

  return (
    <HomeChrome userId={userId} twInfo={twInfo} onClose={onClose}>
      {sections}
    </HomeChrome>
  );
```

保留 `Loader2` 的导入；删掉 `isHoverPanel`、`titleContent`、`headerRightContent`。

- [ ] **Step 2: 跑全部测试，Commit**

Run: `pnpm test`，Expected: 全部通过。

```bash
git add src/compontents/pages/HomePage.tsx
git commit -m "feat(shell): render the panel home per skin"
```

---

### Task 10: 接入 `FixedTwitterPanel`

**Files:** Modify `src/compontents/area/FixedTwitterPanel.tsx`

- [ ] **Step 1: 改动**

1. 导入：

```ts
import { PanelShell, PanelTile } from '~/ui/shells/PanelShell';
import { useUiSkin } from '~/ui/skin/useUiSkin';
```

删掉 `iconUrl` 的导入。

2. 组件开头加 `const { skin } = useUiSkin();`，并计算：

```ts
  const railCollapse = skin === 'obsidian';
  const hideContent = isMinimized && !railCollapse;
  const contentWidth = safeWidth + (railCollapse ? 48 : 0);
```

3. `DraggablePanel` 的 `width` 改为 `isMinimized ? 48 : contentWidth`；`dragHandleClassName` 改为 `hideContent ? 'tw-hunt-drag-handle-minimized' : 'tw-hunt-drag-handle'`；`disabled` 改为 `hideContent`。

4. 最小化图标块换成：

```tsx
        {hideContent && showIcon && <PanelTile onRestore={() => setIsMinimized(false)} />}
```

5. 展开内容的外层样式里，所有 `isMinimized` 换成 `hideContent`，宽度换成 `isMinimized && railCollapse ? 48 : contentWidth`（单位 px）。

6. 卡片 `div` 去掉 `theme-bg-secondary rounded-2xl theme-text-primary overflow-hidden shadow-[…]` 和行内背景、`maxHeight`，只保留 `absolute top-0 right-0 w-full`；里面换成：

```tsx
            <PanelContextProvider onMinimize={() => setIsMinimized(true)}>
              <PanelNavigator
                routes={routes}
                initialRoute={userId ? '/home' : '/messages'}
                layout={(content) => (
                  <PanelShell
                    collapsed={isMinimized && railCollapse}
                    onRestore={() => setIsMinimized(false)}
                    onClose={handleClosePanel}
                    notice={<SkinIntroNotice />}
                    footer={<UserAuthPanel userInfo={userInfo} />}
                  >
                    {content}
                  </PanelShell>
                )}
              />
            </PanelContextProvider>
```

（`SkinIntroNotice` 和 `UserAuthPanel` 从原来的位置挪进外壳。）

- [ ] **Step 2: 类型检查、构建**

Run: 类型检查 diff，Expected: 没有新增错误。
Run: `pnpm exec plasmo build`，Expected: 成功。

- [ ] **Step 3: 沙盒核对（Task 1 的面板视图）**

3 种风格 × 3 种 X 背景：
- 柔光：品牌栏 + 身份卡（排名、涨跌）+ 分段切换，点评视图显示点评和评论；收起成 48px 方块，点一下展开。
- 黑曜：左侧图标栏 6 个入口，指示块和强调条跟随；顶部搜索；常驻模式下收起只剩图标栏，点任一入口展开。
- 原生：模块头（XHunt + 领域 + handle）+ 下划线标签；收起成圆形方块。
- 三套都能进消息（显示 2 条假消息）、进设置、返回；未读点、关闭 / 最小化按钮按模式出现；拖动柄能拖动面板。
- 用键盘 Tab 走一遍：图标按钮、标签、搜索框都能聚焦，焦点环可见。

- [ ] **Step 4: Commit**

```bash
git add src/compontents/area/FixedTwitterPanel.tsx
git commit -m "feat(shell): mount the panel inside the skin shells"
```

---

### 执行中的调整（已在代码里落实，以代码为准）

1. **沙盒**：Plasmo 把 `~/assets/…` 解析到仓库根目录的 `assets/`，沙盒的导入解析补了这条规则；Vite 不注入 `process.env`，在 `define` 里补上；Plasmo 存储把值再序列化一层 JSON，`seedStorage` 写入时照这个格式。
2. **文案**：多加了 `panelBack`（返回 / Back），原来没有通用的返回文案。
3. **首页**：`HomeChrome` 的内容区去掉了柔光的负边距；`formatCount` 对 `null` 显示「—」。
4. **View Transitions**：面板导航已不再调用。`src/compontents/Tabs.tsx` 和 `TopTabNavigator.tsx` 仍在用（资料页、右栏），阶段 2、3 换成 ui-sdk Tabs 时一起去掉。
5. **沙盒核对结果**：三套外壳、首页顶部、身份区排名和涨跌、消息 / 设置页头和返回、未读点、常驻模式下黑曜收起成图标栏、柔光收起成 48px 方块，均已实测。

---

### Task 11: 阶段 1b 验收

- [ ] `pnpm test` 全部通过。
- [ ] 类型检查没有新增错误，`src/ui/` 下没有错误。
- [ ] `pnpm exec plasmo build` 成功；产物里 `fixed-twitter-panel`、`panel-settings-button`、`panel-messages-button`、`panel-back-button`、`panel-close-button`、`panel-minimize-button`、`settings-page`、`messages-page` 都在；没有 `startViewTransition` 调用。
- [ ] 沙盒 9 种组合核对完毕，截图留档。
