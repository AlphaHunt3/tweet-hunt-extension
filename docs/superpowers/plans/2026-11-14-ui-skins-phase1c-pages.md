# UI 风格切换 · 阶段 1c（面板首页内容、消息、登录栏）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 面板首页的四个视图（概览、关注者、画像、点评）、消息列表、底部登录栏按三套风格重写，用阶段 1a 的基础组件和设计变量；画像页新增能力模型和灵魂指数（设计文档第 7 节第 5 条）。

**Architecture:** 新视图放在 `src/ui/panel/`，只给面板用；资料页悬停卡片还在用的 `KolFollowersSection`、`MBTISection`、`InvestmentPanel`、`ReviewsOverview` 不动，留给阶段 2。`getAbilityModelData` 从 `NameRightData` 提到 `src/utils/abilityModel.ts` 两边共用。灵魂指数用 `useSoulInfo`，按 `twitterId` 缓存请求，资料页以后也能复用。`InAppMessages`、`UserAuthPanel` 只在面板里用，原地改写（`UserAuthPanel` 导出的 `Avatar` 资料页还在用，保持不变）。

**Tech Stack:** React 19、ahooks `useRequest`、dayjs、基础组件、Tailwind 风格变体。

对应设计文档第 6 节「面板内容」一行；画布 `A/B/C-profile.dc.html` 的视图部分。

---

## 取舍

- **关注者身份标签**：画布每位 KOL 下有身份胶囊（研究员等），来自 `officialTagsManager`，要逐个异步取，阶段 1c 先显示 `@handle`，阶段 2 做资料页标签时一起接。
- **点评分布条**：画布有 5 星到 1 星的占比条，`ReviewStats` 没有分布数据，不画。
- **黑曜底栏的 AI 额度胶囊**：没有对应数据，不画。
- **评论举报**：保留原来的 Google 表单链接。
- 保留的测试标记：`panel-scroll-reviews`、`panel-scroll-comments`（外部跳转）、`messages-page`、`auth-logged-out-panel`、`auth-login-button`、`auth-logged-in-panel`、`auth-user-menu-button`、`auth-logout-button`。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/utils/abilityModel.ts` | `getAbilityModelData`、`AI_ABILITY_MIN_SCORE`、`toAbilityList` |
| `src/ui/panel/useSoulInfo.ts` | 按 `twitterId` 缓存的灵魂指数请求 |
| `src/ui/panel/PanelSection.tsx` | `PanelCard`、`CardHeader`、`EmptyState`、`Skeleton` |
| `src/ui/panel/FollowersView.tsx` | KOL 关注者：范围切换 + 头像网格 / 列表 |
| `src/ui/panel/PortraitView.tsx` | 性格、能力模型、灵魂指数、投资 |
| `src/ui/panel/ReviewsView.tsx` | 评分概览、仅看精选、标签、评论分页 |
| `src/ui/panel/OverviewView.tsx` | 黑曜的指标格 + 快捷入口；原生的 X 热门式列表 |
| `src/ui/primitives/SegmentedControl.tsx` + `primitives.css` | 新增 `variant='tiles'`（柔光的指标格样式） |
| `src/compontents/InAppMessages.tsx` | 消息列表按风格改写 |
| `src/compontents/UserAuthPanel.tsx` | 登录栏按风格改写，账户菜单改用 ui-sdk Menu |
| `src/compontents/pages/HomePage.tsx` | 视图换成新组件 |
| `src/compontents/area/NameRightData.tsx` | 改为引用 `src/utils/abilityModel.ts` |
| `src/locales/*.json` | 新文案 |

---

### Task 1: 能力模型工具和灵魂指数请求

**Files:**
- Create: `src/utils/abilityModel.ts`、`src/ui/panel/useSoulInfo.ts`
- Test: `src/utils/abilityModel.test.ts`、`src/ui/panel/useSoulInfo.test.ts`
- Modify: `src/compontents/area/NameRightData.tsx`（删掉本地的 `AbilityModelData`、`getAbilityModelData`、`AI_ABILITY_MIN_SCORE`，改为导入）

- [ ] **Step 1: 写失败的测试**

```ts
// src/utils/abilityModel.test.ts
import { describe, expect, test } from 'vitest';
import { AI_ABILITY_MIN_SCORE, getAbilityModelData, toAbilityList } from './abilityModel';

const field = {
  cn: { fields: [{ DeFi: 86 }, { 交易: 78 }, { Meme: 64 }], summary: '偏 DeFi' },
  en: { fields: [{ DeFi: 86 }, { Trading: 78 }], summary: 'DeFi first' },
  update: '2026-11-01',
};

describe('abilityModel', () => {
  test('picks the language and keeps the update time', () => {
    expect(getAbilityModelData(field, 'zh')).toEqual({ abilities: field.cn.fields, summary: '偏 DeFi', updateTime: '2026-11-01' });
    expect(getAbilityModelData(field, 'en').summary).toBe('DeFi first');
  });

  test('filters by a minimum score and survives bad data', () => {
    expect(getAbilityModelData(field, 'zh', AI_ABILITY_MIN_SCORE).abilities).toEqual([{ DeFi: 86 }, { 交易: 78 }]);
    expect(getAbilityModelData(null, 'zh')).toEqual({ abilities: [], summary: '', updateTime: null });
  });

  test('converts to a sorted name and score list', () => {
    expect(toAbilityList(field.cn.fields)).toEqual([
      { name: 'DeFi', score: 86 },
      { name: '交易', score: 78 },
      { name: 'Meme', score: 64 },
    ]);
  });
});
```

```ts
// src/ui/panel/useSoulInfo.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSoulInfo } from './useSoulInfo';

const getSoulInfo = vi.fn(async (id: string) => ({ score: 87, twitterId: id }));
vi.mock('~contents/services/api.ts', () => ({ getSoulInfo: (id: string) => getSoulInfo(id) }));

describe('useSoulInfo', () => {
  test('loads once per twitter id and shares the result', async () => {
    const first = renderHook(() => useSoulInfo('42'));
    await waitFor(() => expect(first.result.current.data?.score).toBe(87));
    const second = renderHook(() => useSoulInfo('42'));
    await waitFor(() => expect(second.result.current.data?.score).toBe(87));
    expect(getSoulInfo).toHaveBeenCalledTimes(1);
  });

  test('does nothing without an id', () => {
    const { result } = renderHook(() => useSoulInfo(''));
    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/utils/abilityModel.test.ts src/ui/panel/useSoulInfo.test.ts`
Expected: FAIL，找不到模块。

- [ ] **Step 3: 实现 `src/utils/abilityModel.ts`（从 `NameRightData` 原样搬过来，外加 `toAbilityList`）**

```ts
import type { MultiFieldData, MultiFieldItem } from '~types';

export const AI_ABILITY_MIN_SCORE = 70;

export interface AbilityModelData {
  abilities: MultiFieldItem[];
  summary: string;
  updateTime?: string | number | null;
}

export function getAbilityModelData(
  multiField: MultiFieldData | null | undefined,
  lang: string,
  minScore?: number,
): AbilityModelData {
  try {
    if (!multiField) return { abilities: [], summary: '', updateTime: null };

    const languageFields = lang === 'zh' ? multiField.cn : multiField.en;
    const updateTime = multiField.update ?? multiField.updateDate ?? multiField.updatedAt ?? null;
    if (!languageFields?.fields || !Array.isArray(languageFields.fields)) {
      return { abilities: [], summary: '', updateTime };
    }

    const abilities =
      typeof minScore === 'number'
        ? languageFields.fields.filter((item: MultiFieldItem) => {
            const key = Object.keys(item)[0];
            const score = Number(item?.[key]);
            return Number.isFinite(score) && score >= minScore;
          })
        : languageFields.fields;

    return { abilities, summary: languageFields.summary || '', updateTime };
  } catch {
    return { abilities: [], summary: '', updateTime: null };
  }
}

export function toAbilityList(abilities: MultiFieldItem[]) {
  return abilities
    .map((item) => {
      const name = Object.keys(item ?? {})[0];
      return { name, score: Number(item?.[name]) };
    })
    .filter((item) => item.name && Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: `NameRightData.tsx` 改为导入**

删掉 `const AI_ABILITY_MIN_SCORE = 70;`、`interface AbilityModelData {…}` 和 `function getAbilityModelData(…) {…}` 三段，在导入区加：

```ts
import { AI_ABILITY_MIN_SCORE, getAbilityModelData } from '~/utils/abilityModel';
```

- [ ] **Step 5: 实现 `src/ui/panel/useSoulInfo.ts`**

```ts
import { useRequest } from 'ahooks';
import { getSoulInfo } from '~contents/services/api.ts';

const cache = new Map<string, Promise<any>>();

function loadSoulInfo(twitterId: string) {
  if (!cache.has(twitterId)) {
    const request = Promise.resolve(getSoulInfo(twitterId)).catch((error: unknown) => {
      cache.delete(twitterId);
      throw error;
    });
    cache.set(twitterId, request);
  }
  return cache.get(twitterId)!;
}

export function useSoulInfo(twitterId: string | null | undefined) {
  const id = twitterId ? String(twitterId) : '';
  const { data, loading } = useRequest(() => loadSoulInfo(id), { refreshDeps: [id], ready: Boolean(id) });
  return { data: id ? data : undefined, loading: Boolean(id) && loading };
}
```

- [ ] **Step 6: 确认通过，类型检查，Commit**

Run: `pnpm test src/utils/abilityModel.test.ts src/ui/panel/useSoulInfo.test.ts`，Expected: 5 passed。
Run: 类型检查 diff，Expected: 没有新增错误。

```bash
git add src/utils/abilityModel.ts src/utils/abilityModel.test.ts src/ui/panel/useSoulInfo.ts src/ui/panel/useSoulInfo.test.ts src/compontents/area/NameRightData.tsx
git commit -m "refactor: share the ability model helper and cache soul index requests"
```

---

### Task 2: 文案

**Files:** Modify `src/locales/zh.json`、`src/locales/en.json`

- [ ] **Step 1: 末尾各加（上一行补逗号）**

zh：

```json
  "panelKolScopeGlobal": "全球",
  "panelKolScopeCn": "中文",
  "panelKolScopeTop": "TOP100",
  "panelKolScopeLabel": "KOL 范围",
  "panelKolAnalysis": "KOL 关注分析",
  "panelShowAll": "查看全部 {count} 位",
  "panelShowLess": "收起",
  "panelPersonality": "性格类型",
  "panelAbilityModel": "KOL 能力模型",
  "panelAbilityDomain": "能力领域",
  "panelSoulIndex": "灵魂指数",
  "panelReviewsCount": "{count} 条点评",
  "panelFeaturedCount": "{count} 条精评",
  "panelOnlyFeatured": "仅看精选",
  "panelOnlyFeaturedHint": "来自影响力排名前 20 万的用户",
  "panelComments": "评论",
  "panelPrevPage": "上一页",
  "panelNextPage": "下一页",
  "panelNoReviews": "还没有点评",
  "panelNoComments": "还没有评论",
  "panelNoFollowers": "还没有 KOL 关注",
  "panelOpenView": "查看",
  "panelConnectedX": "已连接 X",
  "panelSignedInAs": "已登录 {handle}",
  "panelAccountMenu": "账户菜单"
```

en：

```json
  "panelKolScopeGlobal": "Global",
  "panelKolScopeCn": "Chinese",
  "panelKolScopeTop": "TOP100",
  "panelKolScopeLabel": "KOL scope",
  "panelKolAnalysis": "KOL followers",
  "panelShowAll": "Show all {count}",
  "panelShowLess": "Show less",
  "panelPersonality": "Personality",
  "panelAbilityModel": "KOL ability model",
  "panelAbilityDomain": "Ability domain",
  "panelSoulIndex": "Soul index",
  "panelReviewsCount": "{count} reviews",
  "panelFeaturedCount": "{count} featured",
  "panelOnlyFeatured": "Featured only",
  "panelOnlyFeaturedHint": "From the top 200K accounts by influence",
  "panelComments": "Comments",
  "panelPrevPage": "Previous page",
  "panelNextPage": "Next page",
  "panelNoReviews": "No reviews yet",
  "panelNoComments": "No comments yet",
  "panelNoFollowers": "No KOL followers yet",
  "panelOpenView": "Open",
  "panelConnectedX": "Connected to X",
  "panelSignedInAs": "Signed in as {handle}",
  "panelAccountMenu": "Account menu"
```

`{count}`、`{handle}` 用 `.replace('{count}', …)` 填入。

- [ ] **Step 2: 校验 JSON，Commit**

Run: `node -e "require('./src/locales/zh.json'); require('./src/locales/en.json'); console.log('ok')"`

```bash
git add src/locales/zh.json src/locales/en.json
git commit -m "feat(panel): add panel content strings"
```

---

### Task 3: 公共片段和分段控件的「指标格」外观

**Files:**
- Create: `src/ui/panel/PanelSection.tsx`
- Modify: `src/ui/primitives/SegmentedControl.tsx`（新增 `variant`）、`src/css/primitives.css`
- Test: `src/ui/panel/PanelSection.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SegmentedControl } from '../primitives';
import { CardHeader, EmptyState, PanelCard, Skeleton } from './PanelSection';

describe('PanelSection', () => {
  test('renders a titled card, an empty state and a skeleton', () => {
    render(
      <>
        <PanelCard>
          <CardHeader title='KOL 关注分析' aside={<span>Web3</span>} />
        </PanelCard>
        <EmptyState>还没有点评</EmptyState>
        <Skeleton className='h-4' />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'KOL 关注分析' })).toBeTruthy();
    expect(screen.getByText('Web3')).toBeTruthy();
    expect(screen.getByText('还没有点评')).toBeTruthy();
    expect(document.querySelector('[aria-hidden="true"].xh-skeleton')).not.toBeNull();
  });

  test('segmented control can render as tiles', () => {
    render(
      <SegmentedControl
        aria-label='KOL scope'
        variant='tiles'
        value='global'
        onValueChange={() => {}}
        options={[
          { value: 'global', label: 'Global' },
          { value: 'cn', label: 'Chinese' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'KOL scope' }).dataset.variant).toBe('tiles');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/panel/PanelSection.test.tsx`
Expected: FAIL，找不到 `./PanelSection`。

- [ ] **Step 3: 实现 `src/ui/panel/PanelSection.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cx } from '../primitives/cx';

export function PanelCard({ flush = false, className, children, id }: { flush?: boolean; className?: string; children: ReactNode; id?: string }) {
  return (
    <section
      id={id}
      className={cx(
        'xh-rise',
        'soft:rounded-xh-card soft:bg-xh-raised soft:shadow-xh-card',
        'obsidian:rounded-xh-card obsidian:bg-xh-raised obsidian:shadow-xh-card',
        'native:border-b native:border-xh-line',
        flush ? 'soft:p-1.5 obsidian:p-1 native:py-1' : 'soft:p-3 obsidian:px-3 obsidian:py-2.5 native:px-4 native:py-3',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, aside, icon }: { title: ReactNode; aside?: ReactNode; icon?: ReactNode }) {
  return (
    <div className='mb-2.5 flex items-center justify-between gap-2'>
      <h3 className='flex min-w-0 items-center gap-1.5 truncate soft:text-[13px] soft:font-semibold obsidian:text-[11.5px] obsidian:font-medium obsidian:text-xh-fg-2 native:text-[13px] native:font-bold native:text-xh-fg-2'>
        {icon ? <span className='text-xh-fg-2'>{icon}</span> : null}
        {title}
      </h3>
      {aside}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className='py-6 text-center text-[12px] text-xh-fg-2'>{children}</p>;
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden='true' className={cx('xh-skeleton block rounded-lg bg-xh-sunken', className)} />;
}
```

- [ ] **Step 4: `SegmentedControl` 加 `variant`**

`SegmentedControlProps` 加 `variant?: 'default' | 'tiles';`，解构 `variant = 'default'`，根节点加 `data-variant={variant}`。

- [ ] **Step 5: 追加样式（`primitives.css` 图层内）**

```css
  .xh-skeleton {
    animation: xh-pulse 1s var(--xh-ease-std) infinite;
  }

  .xh-seg[data-variant='tiles'] {
    gap: 6px;
    padding: 0;
    background: transparent;
  }
  .xh-seg[data-variant='tiles'] .xh-seg-indicator {
    display: none;
  }
  .xh-seg[data-variant='tiles'] .xh-seg-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    height: auto;
    padding: 7px 9px;
    border-radius: 12px;
    background: var(--xh-canvas);
    font-size: 11px;
    font-weight: 400;
    text-align: start;
    transition:
      background-color var(--xh-d-xs) var(--xh-ease-out),
      box-shadow var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-seg[data-variant='tiles'] .xh-seg-item b {
    color: var(--xh-fg);
    font-size: 16px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .xh-seg[data-variant='tiles'] .xh-seg-item[data-checked] {
    background: var(--xh-accent-soft);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--xh-accent) 35%, transparent);
    color: var(--xh-accent-fg);
  }
  .xh-seg[data-variant='tiles'] .xh-seg-item[data-checked] b {
    color: var(--xh-accent-fg);
  }
```

- [ ] **Step 6: 确认通过，Commit**

Run: `pnpm test src/ui/panel/PanelSection.test.tsx`，Expected: 2 passed。

```bash
git add src/ui/panel/PanelSection.tsx src/ui/panel/PanelSection.test.tsx src/ui/primitives/SegmentedControl.tsx src/css/primitives.css
git commit -m "feat(panel): add panel card parts and a tiles look for segments"
```

---

### Task 4: 关注者视图

**Files:**
- Create: `src/ui/panel/FollowersView.tsx`
- Test: `src/ui/panel/FollowersView.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { FollowersView } from './FollowersView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const navigateInX = vi.fn();
vi.mock('~contents/utils/navigateInX', () => ({ navigateInX: (url: string) => navigateInX(url) }));

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ username: `kol${i}`, name: `KOL ${i}`, avatar: '' }));
const TW = {
  kolFollow: {
    globalKolFollowers: people(10),
    cnKolFollowers: people(2),
    topKolFollowers: [],
    globalKolFollowersCount: 1200,
    cnKolFollowersCount: 312,
    topKolFollowersCount: 0,
  },
};

describe('FollowersView', () => {
  test('switches scope, expands the list and opens a profile', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<FollowersView twInfo={TW} />);
    expect(screen.getByRole('radiogroup', { name: 'panelKolScopeLabel' }).dataset.variant).toBe('tiles');
    expect(screen.getAllByRole('link')).toHaveLength(8);
    await userEvent.click(screen.getByRole('button', { name: 'panelShowAll' }));
    expect(screen.getAllByRole('link')).toHaveLength(10);
    await userEvent.click(screen.getByRole('radio', { name: /panelKolScopeCn/ }));
    expect(screen.getAllByRole('link')).toHaveLength(2);
    await userEvent.click(screen.getByRole('link', { name: /KOL 1/ }));
    expect(navigateInX).toHaveBeenCalledWith('https://x.com/kol1');
  });

  test('shows an empty state for a scope without followers', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    render(<FollowersView twInfo={TW} />);
    await userEvent.click(screen.getByRole('radio', { name: /panelKolScopeTop/ }));
    expect(screen.getByText('panelNoFollowers')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/panel/FollowersView.test.tsx`
Expected: FAIL，找不到 `./FollowersView`。

- [ ] **Step 3: 实现 `src/ui/panel/FollowersView.tsx`**

```tsx
import { useState } from 'react';
import { navigateInX } from '~contents/utils/navigateInX';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { ChevronRightIcon, UsersIcon } from '../icons';
import { Avatar, Badge, Button, SegmentedControl } from '../primitives';
import { useUiSkin } from '../skin/useUiSkin';
import { formatCount } from '../shells/HomeChrome';
import { CardHeader, EmptyState, PanelCard } from './PanelSection';

type Scope = 'global' | 'cn' | 'top';
interface Person {
  username: string;
  name?: string;
  avatar?: string;
}

const KEYS: Record<Scope, { list: string; count: string; label: string }> = {
  global: { list: 'globalKolFollowers', count: 'globalKolFollowersCount', label: 'panelKolScopeGlobal' },
  cn: { list: 'cnKolFollowers', count: 'cnKolFollowersCount', label: 'panelKolScopeCn' },
  top: { list: 'topKolFollowers', count: 'topKolFollowersCount', label: 'panelKolScopeTop' },
};

export function FollowersView({ twInfo }: { twInfo: any }) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const { primaryDomain } = useUserDomain();
  const [scope, setScope] = useState<Scope>('global');
  const [expanded, setExpanded] = useState(false);
  const kol = twInfo?.kolFollow ?? {};
  const suffix = primaryDomain === 'ai' ? 'Ai' : '';
  const listOf = (s: Scope): Person[] => (Array.isArray(kol[KEYS[s].list + suffix]) ? kol[KEYS[s].list + suffix] : []);
  const countOf = (s: Scope) => kol[KEYS[s].count + suffix] ?? listOf(s).length;
  const people = listOf(scope);
  const limit = skin === 'soft' ? 8 : 6;
  const shown = expanded ? people : people.slice(0, limit);

  const open = (person: Person) => navigateInX(`https://x.com/${person.username}`);

  return (
    <PanelCard className='flex flex-col gap-3'>
      <CardHeader icon={<UsersIcon size={14} />} title={t('panelKolAnalysis')} aside={<Badge>{primaryDomain === 'ai' ? 'AI' : 'Web3'}</Badge>} />
      <SegmentedControl
        aria-label={t('panelKolScopeLabel')}
        variant={skin === 'soft' ? 'tiles' : 'default'}
        block
        value={scope}
        onValueChange={(next) => {
          setScope(next);
          setExpanded(false);
        }}
        options={(['global', 'cn', 'top'] as const).map((s) => ({
          value: s,
          label: skin === 'soft' ? (
            <>
              <span>{t(KEYS[s].label)}</span>
              <b>{formatCount(countOf(s))}</b>
            </>
          ) : (
            `${t(KEYS[s].label)} ${formatCount(countOf(s))}`
          ),
        }))}
      />
      {people.length === 0 ? (
        <EmptyState>{t('panelNoFollowers')}</EmptyState>
      ) : skin === 'soft' ? (
        <ul className='grid grid-cols-4 gap-x-1.5 gap-y-3'>
          {shown.map((person) => (
            <li key={person.username}>
              <a
                href={`https://x.com/${person.username}`}
                onClick={(event) => {
                  event.preventDefault();
                  open(person);
                }}
                className='flex flex-col items-center gap-1 rounded-xl p-1 text-center hover:bg-xh-hover'
              >
                <Avatar name={person.name || person.username} src={person.avatar} size='md' />
                <span className='w-full truncate text-[11px] font-medium'>{person.name || person.username}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <ul className='flex flex-col obsidian:-mx-1 native:-mx-4'>
          {shown.map((person, index) => (
            <li key={person.username}>
              <a
                href={`https://x.com/${person.username}`}
                onClick={(event) => {
                  event.preventDefault();
                  open(person);
                }}
                className='flex items-center gap-2.5 hover:bg-xh-hover obsidian:rounded-[9px] obsidian:px-2 obsidian:py-[7px] native:gap-3 native:px-4 native:py-2.5'
              >
                {skin === 'obsidian' ? (
                  <span className='w-4 text-right font-xh-mono text-[11px] text-xh-fg-3'>{index + 1}</span>
                ) : null}
                <Avatar name={person.name || person.username} src={person.avatar} size={skin === 'native' ? 'lg' : 'md'} />
                <span className='min-w-0 flex-1'>
                  <span className='block truncate obsidian:text-[12.5px] obsidian:font-medium native:text-[15px] native:font-bold'>
                    {person.name || person.username}
                  </span>
                  <span className='block truncate text-xh-fg-2 obsidian:text-[11.5px] native:text-[13px]'>@{person.username}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {people.length > limit ? (
        <Button size='sm' block={skin !== 'native'} variant={skin === 'native' ? 'soft' : 'default'} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('panelShowLess') : t('panelShowAll').replace('{count}', formatCount(countOf(scope)))}
          <ChevronRightIcon size={14} className={expanded ? '-rotate-90' : 'rotate-90'} />
        </Button>
      ) : null}
    </PanelCard>
  );
}
```

注意：`panelShowAll` 文案带 `{count}`，测试里 `t` 返回键本身，所以按钮名称就是 `panelShowAll`。

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/panel/FollowersView.test.tsx`，Expected: 2 passed。

```bash
git add src/ui/panel/FollowersView.tsx src/ui/panel/FollowersView.test.tsx
git commit -m "feat(panel): add followers view for all skins"
```

---

### Task 5: 画像视图

**Files:**
- Create: `src/ui/panel/PortraitView.tsx`
- Test: `src/ui/panel/PortraitView.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { PortraitView } from './PortraitView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./useSoulInfo', () => ({
  useSoulInfo: () => ({
    loading: false,
    data: { score: 87, profile_analysis: 90, content_analysis: 82, engagement_analysis: 76, xhunt_analysis: 88, kol_interaction: 84 },
  }),
}));
vi.mock('~/compontents/InvestmentPanel.tsx', () => ({ InvestmentPanel: () => <p>investment</p> }));

const TW = {
  multiField: { cn: { fields: [{ DeFi: 86 }, { 交易: 78 }] } },
  multiFieldAi: { cn: { fields: [{ Agent: 91 }] } },
};
const MBTI = { mbti: 'INTJ', keyword: ['战略思维', '长期主义'], explanation: '理性、独立' };

describe('PortraitView', () => {
  test('shows personality, abilities per domain and the soul index', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<PortraitView twInfo={TW} mbti={MBTI} twitterId='42' rootData={null} />);
    expect(screen.getByText('INTJ')).toBeTruthy();
    expect(screen.getByText('战略思维')).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'DeFi' }).getAttribute('aria-valuenow')).toBe('86');
    await userEvent.click(screen.getByRole('radio', { name: 'AI' }));
    expect(screen.getByRole('meter', { name: 'Agent' })).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    expect(screen.getByText('profileAnalysis')).toBeTruthy();
  });

  test('hides cards without data', () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    render(<PortraitView twInfo={{}} mbti={undefined} twitterId='42' rootData={null} />);
    expect(screen.queryByText('panelPersonality')).toBeNull();
    expect(screen.queryByText('panelAbilityModel')).toBeNull();
    expect(screen.getByText('panelSoulIndex')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/panel/PortraitView.test.tsx`
Expected: FAIL，找不到 `./PortraitView`。

- [ ] **Step 3: 实现 `src/ui/panel/PortraitView.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { InvestmentPanel } from '~/compontents/InvestmentPanel.tsx';
import { AI_ABILITY_MIN_SCORE, getAbilityModelData, toAbilityList } from '~/utils/abilityModel';
import { useI18n } from '~contents/hooks/i18n';
import { Badge, Meter, SegmentedControl, Tag } from '../primitives';
import { cx } from '../primitives/cx';
import { CardHeader, PanelCard, Skeleton } from './PanelSection';
import { useSoulInfo } from './useSoulInfo';

const SOUL_DIMENSIONS = [
  ['profile_analysis', 'profileAnalysis'],
  ['content_analysis', 'contentAnalysis'],
  ['engagement_analysis', 'engagementAnalysis'],
  ['xhunt_analysis', 'xhuntAnalysis'],
  ['kol_interaction', 'kolInteraction'],
] as const;

export function soulTone(score: number) {
  if (score >= 80) return 'up' as const;
  if (score >= 60) return 'warn' as const;
  return 'down' as const;
}

interface PortraitViewProps {
  twInfo: any;
  mbti?: { mbti?: string; keyword?: string[]; explanation?: string };
  twitterId?: string | null;
  rootData: any;
}

export function PortraitView({ twInfo, mbti, twitterId, rootData }: PortraitViewProps) {
  const { t, lang } = useI18n();
  const web3 = useMemo(() => toAbilityList(getAbilityModelData(twInfo?.multiField, lang).abilities), [twInfo, lang]);
  const ai = useMemo(
    () => toAbilityList(getAbilityModelData(twInfo?.multiFieldAi, lang, AI_ABILITY_MIN_SCORE).abilities),
    [twInfo, lang],
  );
  const [domain, setDomain] = useState<'web3' | 'ai'>(web3.length ? 'web3' : 'ai');
  const abilities = (domain === 'ai' ? ai : web3).slice(0, 5);
  const soul = useSoulInfo(twitterId);
  const showInvestment =
    rootData && (rootData.invested || rootData.investor) && twInfo?.basicInfo?.classification !== 'person';

  return (
    <div className='flex flex-col soft:gap-2 obsidian:gap-2.5'>
      {mbti?.mbti ? (
        <PanelCard>
          <CardHeader title={t('panelPersonality')} />
          <p className='font-xh-num text-[28px] leading-none tracking-[-0.03em] text-xh-accent-fg soft:font-bold'>{mbti.mbti}</p>
          {mbti.keyword?.length ? (
            <div className='mt-2.5 flex flex-wrap gap-1'>
              {mbti.keyword.map((word) => (
                <Tag key={word}>{word}</Tag>
              ))}
            </div>
          ) : null}
          {mbti.explanation ? <p className='mt-2 text-[12px] leading-[1.55] text-xh-fg-2'>{mbti.explanation}</p> : null}
        </PanelCard>
      ) : null}

      {web3.length || ai.length ? (
        <PanelCard>
          <CardHeader
            title={t('panelAbilityModel')}
            aside={
              web3.length && ai.length ? (
                <SegmentedControl
                  aria-label={t('panelAbilityDomain')}
                  size='sm'
                  value={domain}
                  onValueChange={setDomain}
                  options={[
                    { value: 'web3', label: 'Web3' },
                    { value: 'ai', label: 'AI' },
                  ]}
                />
              ) : null
            }
          />
          <ul className='flex flex-col gap-2'>
            {abilities.map((ability) => (
              <li key={ability.name} className='grid grid-cols-[64px_1fr_28px] items-center gap-2 text-[12px]'>
                <span className='truncate text-xh-fg-2'>{ability.name}</span>
                <Meter label={ability.name} value={ability.score} />
                <b className='text-right font-xh-num font-semibold tabular-nums'>{ability.score}</b>
              </li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      <PanelCard>
        <CardHeader
          title={t('panelSoulIndex')}
          aside={soul.data ? <Badge tone={soulTone(Number(soul.data.score))}>{soul.data.score}</Badge> : null}
        />
        {soul.loading ? (
          <div className='grid grid-cols-5 gap-1'>
            {SOUL_DIMENSIONS.map(([key]) => (
              <Skeleton key={key} className='h-12' />
            ))}
          </div>
        ) : soul.data ? (
          <dl className='grid grid-cols-5 gap-1 text-center'>
            {SOUL_DIMENSIONS.map(([key, label]) => (
              <div key={key} className={cx('flex flex-col-reverse gap-0.5 rounded-xl px-0.5 py-1.5', 'soft:bg-xh-canvas')}>
                <dt className='truncate text-[10.5px] text-xh-fg-2'>{t(label)}</dt>
                <dd className='font-xh-num text-[15px] font-semibold tabular-nums'>{Math.round(Number(soul.data[key]) || 0)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {soul.data && (lang === 'en' ? soul.data.reason_en : soul.data.reason) ? (
          <p className='mt-2 text-[12px] leading-[1.55] text-xh-fg-2'>{lang === 'en' ? soul.data.reason_en : soul.data.reason}</p>
        ) : null}
      </PanelCard>

      {showInvestment ? <InvestmentPanel data={rootData} classicStyle /> : null}
    </div>
  );
}
```

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/panel/PortraitView.test.tsx`，Expected: 2 passed。

```bash
git add src/ui/panel/PortraitView.tsx src/ui/panel/PortraitView.test.tsx
git commit -m "feat(panel): add portrait view with ability model and soul index"
```

---

### Task 6: 点评视图

**Files:**
- Create: `src/ui/panel/ReviewsView.tsx`
- Test: `src/ui/panel/ReviewsView.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { ReviewsView } from './ReviewsView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const getHandleComments = vi.fn(async (_id: string, page: number) => ({
  comments: [
    {
      id: `c${page}`,
      reviewer: { avatar: '', displayName: `Reviewer ${page}`, username: `r${page}` },
      updatedAt: new Date().toISOString(),
      rating: 5,
      tags: ['投研'],
      comment: `comment on page ${page}`,
    },
  ],
  pagination: { page, totalPages: 3, totalComments: 11, hasPrevPage: page > 1, hasNextPage: page < 3 },
}));
vi.mock('~contents/services/review.ts', () => ({
  getHandleComments: (...args: [string, number]) => getHandleComments(...args),
}));

const STATS = {
  averageRating: 4.6,
  totalReviews: 128,
  realTotalReviews: 96,
  topReviewers: [{ username: 'a' }],
  tagCloud: [{ text: '投研', value: 12 }],
};

describe('ReviewsView', () => {
  test('summarises ratings, toggles featured reviews and pages comments', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<ReviewsView stats={STATS} userId='mira' />);
    expect(screen.getByText('4.6')).toBeTruthy();
    expect(screen.getByText('投研 12')).toBeTruthy();
    await userEvent.click(screen.getByRole('switch', { name: /panelOnlyFeatured/ }));
    expect(getMemoryValue('@xhunt/reviewOnlyKol')).toBe(false);
    await waitFor(() => expect(screen.getByText('comment on page 1')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: 'panelNextPage' }));
    await waitFor(() => expect(screen.getByText('comment on page 2')).toBeTruthy());
    expect(document.getElementById('panel-scroll-comments')).not.toBeNull();
    expect(document.getElementById('panel-scroll-reviews')).not.toBeNull();
  });

  test('shows empty states', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    getHandleComments.mockResolvedValueOnce({ comments: [], pagination: { page: 1, totalPages: 0, totalComments: 0, hasPrevPage: false, hasNextPage: false } });
    render(<ReviewsView stats={{ averageRating: 0, totalReviews: 0, realTotalReviews: 0, topReviewers: [], tagCloud: [] }} userId='mira' />);
    expect(screen.getByText('panelNoReviews')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('panelNoComments')).toBeTruthy());
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/panel/ReviewsView.test.tsx`
Expected: FAIL，找不到 `./ReviewsView`。

- [ ] **Step 3: 实现 `src/ui/panel/ReviewsView.tsx`**

```tsx
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useState } from 'react';
import { getHandleComments } from '~contents/services/review.ts';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '../icons';
import { Avatar, IconButton, Switch, Tag } from '../primitives';
import { CardHeader, EmptyState, PanelCard, Skeleton } from './PanelSection';

dayjs.extend(relativeTime);

const REPORT_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdm_ekrYB57m1xUaYTmgOsQBdWTkc4pzNnLsctJS17O7u1FrA/viewform';

function Stars({ value }: { value: number }) {
  return (
    <span className='flex gap-px text-[#f2b01e] native:text-[#f5b301]' aria-hidden='true'>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={12} className={n <= Math.round(value) ? '' : 'opacity-40'} />
      ))}
    </span>
  );
}

export function ReviewsView({ stats, userId }: { stats: any; userId: string }) {
  const { t } = useI18n();
  const [onlyFeatured, setOnlyFeatured] = useLocalStorage<boolean>('@xhunt/reviewOnlyKol', true);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [userId, onlyFeatured]);

  const { data, loading } = useRequest(() => getHandleComments(userId, page, 5, onlyFeatured), {
    refreshDeps: [userId, page, onlyFeatured],
    ready: Boolean(userId),
  });

  const average = Number(stats?.averageRating) || 0;
  const hasReviews = Array.isArray(stats?.topReviewers) && stats.topReviewers.length > 0;
  const tags: Array<{ text: string; value: number }> = Array.isArray(stats?.tagCloud) ? stats.tagCloud : [];
  const comments: any[] = data?.comments ?? [];
  const pagination = data?.pagination;

  return (
    <div className='flex flex-col soft:gap-2 obsidian:gap-2.5'>
      <PanelCard id='panel-scroll-reviews'>
        {hasReviews ? (
          <div className='flex items-center gap-3.5'>
            <div className='flex min-w-[72px] flex-col items-center gap-1'>
              <span className='font-xh-num text-[34px] font-semibold leading-none tracking-[-0.04em] obsidian:text-[32px] obsidian:font-normal native:text-[40px] native:font-extrabold'>
                {average.toFixed(1)}
              </span>
              <Stars value={average} />
            </div>
            <p className='text-[12px] leading-5 text-xh-fg-2'>
              {t('panelReviewsCount').replace('{count}', String(stats?.totalReviews ?? 0))}
              <br />
              {t('panelFeaturedCount').replace('{count}', String(stats?.realTotalReviews ?? 0))}
            </p>
          </div>
        ) : (
          <EmptyState>{t('panelNoReviews')}</EmptyState>
        )}
        <label className='mt-3 flex items-center justify-between gap-3 border-t border-xh-line pt-2.5 text-[12px]'>
          <span>
            {t('panelOnlyFeatured')}
            <span className='ml-1 text-xh-fg-2'>· {t('panelOnlyFeaturedHint')}</span>
          </span>
          <Switch checked={onlyFeatured} onCheckedChange={setOnlyFeatured} />
        </label>
        {tags.length ? (
          <div className='mt-2.5 flex flex-wrap gap-1'>
            {tags.slice(0, 8).map((tag) => (
              <Tag key={tag.text}>{`${tag.text} ${tag.value}`}</Tag>
            ))}
          </div>
        ) : null}
      </PanelCard>

      <PanelCard id='panel-scroll-comments'>
        <CardHeader
          title={
            <>
              {t('panelComments')}
              {pagination?.totalComments ? <span className='ml-1 font-normal text-xh-fg-2'>{pagination.totalComments}</span> : null}
            </>
          }
          aside={
            pagination && pagination.totalPages > 1 ? (
              <span className='flex items-center gap-1 text-[12px] tabular-nums text-xh-fg-2'>
                <IconButton label={t('panelPrevPage')} size='sm' disabled={!pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeftIcon size={14} />
                </IconButton>
                {pagination.page} / {pagination.totalPages}
                <IconButton label={t('panelNextPage')} size='sm' disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRightIcon size={14} />
                </IconButton>
              </span>
            ) : null
          }
        />
        {loading && !comments.length ? (
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='h-14' />
            <Skeleton className='h-14' />
          </div>
        ) : comments.length ? (
          <ul className='flex flex-col gap-1.5 native:-mx-4 native:gap-0'>
            {comments.map((comment) => (
              <li
                key={comment.id}
                className='flex flex-col gap-1 soft:rounded-xl soft:bg-xh-canvas soft:px-2.5 soft:py-2 obsidian:rounded-[9px] obsidian:px-2 obsidian:py-1.5 native:border-t native:border-xh-line native:px-4 native:py-3'
              >
                <div className='flex items-center gap-2 text-[11px]'>
                  <Avatar name={comment.reviewer?.displayName || comment.reviewer?.username || '?'} src={comment.reviewer?.avatar} size='xs' />
                  <b className='truncate text-[12px] font-semibold'>{comment.reviewer?.displayName}</b>
                  <span className='truncate text-xh-fg-2'>
                    @{comment.reviewer?.username} · {dayjs(comment.updatedAt).fromNow()}
                  </span>
                  <span className='ml-auto shrink-0 font-semibold'>★ {Number(comment.rating || 0).toFixed(1)}</span>
                </div>
                <p className='line-clamp-4 text-[12px] leading-[1.5] native:text-[15px]'>{comment.comment}</p>
                <a href={REPORT_URL} target='_blank' rel='noreferrer' className='self-end text-[11px] text-xh-fg-2 hover:text-xh-fg'>
                  {t('reportError') || 'Report error'}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{t('panelNoComments')}</EmptyState>
        )}
      </PanelCard>
    </div>
  );
}
```

注意：`Switch` 放在 `<label>` 里，名称来自标签文字（`panelOnlyFeatured · panelOnlyFeaturedHint`），测试用正则匹配。

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/panel/ReviewsView.test.tsx`，Expected: 2 passed。

```bash
git add src/ui/panel/ReviewsView.tsx src/ui/panel/ReviewsView.test.tsx
git commit -m "feat(panel): add reviews view with featured filter and comment paging"
```

---

### Task 7: 概览视图（黑曜、原生）

**Files:**
- Create: `src/ui/panel/OverviewView.tsx`
- Test: `src/ui/panel/OverviewView.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { OverviewView } from './OverviewView';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./useSoulInfo', () => ({ useSoulInfo: () => ({ loading: false, data: { score: 87 } }) }));

const TW = {
  kolFollow: {
    kolGlobalRank: 1234,
    kolCnRank: 56,
    kolGlobalRankChange: { day7: 12 },
    globalKolFollowersCount: 1200,
    globalKolFollowers: [{ username: 'a', name: 'Lumen Labs', avatar: '' }],
  },
};
const MBTI = { mbti: 'INTJ', keyword: ['战略思维'] };
const STATS = { averageRating: 4.6, totalReviews: 128, topReviewers: [{}] };

describe('OverviewView', () => {
  test('obsidian shows stat tiles and jumps to a view', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    const onOpen = vi.fn();
    render(<OverviewView twInfo={TW} mbti={MBTI} stats={STATS} twitterId='42' onOpen={onOpen} />);
    expect(screen.getByText('#1,234')).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /INTJ/ }));
    expect(onOpen).toHaveBeenCalledWith('portrait');
  });

  test('native lists summary rows like X trends', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    const onOpen = vi.fn();
    render(<OverviewView twInfo={TW} mbti={MBTI} stats={STATS} twitterId='42' onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /4\.6/ }));
    expect(onOpen).toHaveBeenCalledWith('reviews');
    expect(screen.getByText('INTJ')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/panel/OverviewView.test.tsx`
Expected: FAIL，找不到 `./OverviewView`。

- [ ] **Step 3: 实现 `src/ui/panel/OverviewView.tsx`**

```tsx
import type { ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { ChevronRightIcon, StarIcon } from '../icons';
import { Avatar, Badge, Button } from '../primitives';
import { useUiSkin } from '../skin/useUiSkin';
import { formatCount, formatRank, rankDelta } from '../shells/HomeChrome';
import type { HomeView } from '../shells/panelNav';
import { PanelCard } from './PanelSection';
import { useSoulInfo } from './useSoulInfo';

interface OverviewViewProps {
  twInfo: any;
  mbti?: { mbti?: string; keyword?: string[] };
  stats: any;
  twitterId?: string | null;
  onOpen: (view: HomeView) => void;
}

export function OverviewView({ twInfo, mbti, stats, twitterId, onOpen }: OverviewViewProps) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const { primaryDomain } = useUserDomain();
  const soul = useSoulInfo(twitterId);
  const kol = twInfo?.kolFollow ?? {};
  const s = primaryDomain === 'ai' ? 'Ai' : '';
  const globalDelta = rankDelta(kol[`kolGlobalRankChange${s}`]);
  const cnDelta = rankDelta(kol[`kolCnRankChange${s}`]);
  const followers: any[] = Array.isArray(kol[`globalKolFollowers${s}`]) ? kol[`globalKolFollowers${s}`] : [];
  const average = Number(stats?.averageRating) || 0;

  if (skin === 'native') {
    return (
      <ul className='-mx-0'>
        <Row category={`${t('panelGlobalInfluence')} · ${primaryDomain === 'ai' ? 'AI' : 'Web3'}`} title={formatRank(kol[`kolGlobalRank${s}`])} delta={globalDelta} meta={`${t('panelCnInfluence')} ${formatRank(kol[`kolCnRank${s}`])}`} />
        {soul.data ? <Row category={t('panelSoulIndex')} title={String(soul.data.score)} /> : null}
        <Row
          category={t('panelKolAnalysis')}
          title={`${formatCount(kol[`globalKolFollowersCount${s}`])} KOL`}
          meta={followers.slice(0, 3).map((p) => p.name || p.username).join('、')}
          onOpen={() => onOpen('followers')}
        />
        {mbti?.mbti ? <Row category={t('panelPersonality')} title={mbti.mbti} meta={mbti.keyword?.slice(0, 3).join(' · ')} /> : null}
        <Row category={t('homeViewReviews')} title={`★ ${average.toFixed(1)} · ${t('panelReviewsCount').replace('{count}', String(stats?.totalReviews ?? 0))}`} onOpen={() => onOpen('reviews')} />
      </ul>
    );
  }

  return (
    <div className='flex flex-col gap-2.5'>
      <dl className='grid grid-cols-2 gap-2'>
        <Stat label={t('panelGlobalInfluence')} value={formatRank(kol[`kolGlobalRank${s}`])} pill={globalDelta ? <Badge tone={globalDelta.tone}>{globalDelta.text}</Badge> : null} />
        <Stat label={t('panelSoulIndex')} value={soul.data ? String(soul.data.score) : '—'} />
        <Stat label={t('panelKolFollowers')} value={formatCount(kol[`globalKolFollowersCount${s}`])} />
        <Stat label={t('panelCnInfluence')} value={formatRank(kol[`kolCnRank${s}`])} pill={cnDelta ? <Badge tone={cnDelta.tone}>{cnDelta.text}</Badge> : null} />
      </dl>
      {followers.length ? (
        <PanelCard flush>
          <ul>
            {followers.slice(0, 3).map((person, index) => (
              <li key={person.username} className='flex items-center gap-2.5 px-2 py-[7px]'>
                <span className='w-4 text-right font-xh-mono text-[11px] text-xh-fg-3'>{index + 1}</span>
                <Avatar name={person.name || person.username} src={person.avatar} size='md' />
                <span className='min-w-0 flex-1 truncate text-[12.5px] font-medium'>{person.name || person.username}</span>
              </li>
            ))}
          </ul>
          <Button size='sm' block onClick={() => onOpen('followers')} className='mt-1'>
            {t('panelShowAll').replace('{count}', formatCount(kol[`globalKolFollowersCount${s}`]))}
          </Button>
        </PanelCard>
      ) : null}
      {mbti?.mbti ? (
        <Shortcut onClick={() => onOpen('portrait')} title={mbti.mbti} sub={mbti.keyword?.slice(0, 3).join(' · ')} />
      ) : null}
      <Shortcut
        onClick={() => onOpen('reviews')}
        title={
          <>
            <StarIcon size={14} className='text-xh-warn' /> {average.toFixed(1)} · {t('panelReviewsCount').replace('{count}', String(stats?.totalReviews ?? 0))}
          </>
        }
      />
    </div>
  );
}

function Stat({ label, value, pill }: { label: string; value: string; pill?: ReactNode }) {
  return (
    <div className='xh-rise flex flex-col gap-1 rounded-xh-card bg-xh-raised px-[11px] pb-2 pt-[9px] shadow-xh-card'>
      <div className='flex items-center justify-between gap-1.5'>
        <dt className='truncate text-[11.5px] text-xh-fg-2'>{label}</dt>
        {pill}
      </div>
      <dd className='font-xh-num text-[20px] font-medium leading-[1.15] tracking-[-0.03em] tabular-nums'>{value}</dd>
    </div>
  );
}

function Shortcut({ title, sub, onClick }: { title: ReactNode; sub?: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} className='!h-auto !justify-start !rounded-xh-card !bg-xh-raised !px-3 !py-2.5 !text-left shadow-xh-card'>
      <span className='min-w-0 flex-1'>
        <span className='flex items-center gap-1 text-[12.5px] font-medium'>{title}</span>
        {sub ? <span className='mt-0.5 block truncate text-[11.5px] text-xh-fg-2'>{sub}</span> : null}
      </span>
      <ChevronRightIcon size={14} className='text-xh-fg-3' />
    </Button>
  );
}

function Row({ category, title, delta, meta, onOpen }: { category: string; title: string; delta?: { text: string; tone: 'up' | 'down' } | null; meta?: string; onOpen?: () => void }) {
  const body = (
    <>
      <span className='min-w-0 flex-1'>
        <span className='block text-[13px] text-xh-fg-2'>{category}</span>
        <span className='flex items-center gap-1.5 text-[15px] font-bold'>
          {title}
          {delta ? <Badge tone={delta.tone}>{delta.text}</Badge> : null}
        </span>
        {meta ? <span className='block truncate text-[13px] text-xh-fg-2'>{meta}</span> : null}
      </span>
      {onOpen ? <ChevronRightIcon size={16} className='text-xh-fg-2' /> : null}
    </>
  );
  return (
    <li className='xh-rise'>
      {onOpen ? (
        <Button onClick={onOpen} className='!flex !h-auto !w-full !justify-start !rounded-none !border-0 !px-4 !py-2.5 !text-left !font-normal'>
          {body}
        </Button>
      ) : (
        <div className='flex items-center gap-3 px-4 py-2.5'>{body}</div>
      )}
    </li>
  );
}
```

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/ui/panel/OverviewView.test.tsx`，Expected: 2 passed。

```bash
git add src/ui/panel/OverviewView.tsx src/ui/panel/OverviewView.test.tsx
git commit -m "feat(panel): add overview view for obsidian and native"
```

---

### Task 8: 首页接入新视图

**Files:** Modify `src/compontents/pages/HomePage.tsx`

- [ ] **Step 1: 改 `sections`**

1. 删除 `KolFollowersSection`、`MBTISection`、`InvestmentPanel`、`ReviewsOverview`、`CommentsSection` 的导入和 `reviewsRef`；加：

```ts
import usePlacementTracking from '~contents/hooks/usePlacementTracking';
import { FollowersView } from '~/ui/panel/FollowersView';
import { OverviewView } from '~/ui/panel/OverviewView';
import { PortraitView } from '~/ui/panel/PortraitView';
import { ReviewsView } from '~/ui/panel/ReviewsView';
```

2. 组件内：`const { twitterId } = usePlacementTracking();`

3. `sections` 的非加载分支换成：

```tsx
    if (view === 'followers') return <FollowersView twInfo={twInfo} />;
    if (view === 'portrait') return <PortraitView twInfo={twInfo} mbti={mbti} twitterId={twitterId} rootData={loadingRootData ? null : rootData} />;
    if (view === 'reviews') return <ReviewsView stats={reviewInfo} userId={userId} />;
    return <OverviewView twInfo={twInfo} mbti={mbti} stats={reviewInfo} twitterId={twitterId} onOpen={setView} />;
```

- [ ] **Step 2: 全部测试、类型检查，Commit**

Run: `pnpm test`；类型检查 diff。Expected: 全部通过，没有新增错误。

```bash
git add src/compontents/pages/HomePage.tsx
git commit -m "feat(panel): render the new home views"
```

---

### Task 9: 消息列表

**Files:**
- Modify: `src/compontents/InAppMessages.tsx`
- Test: `src/compontents/InAppMessages.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../test/memoryStorage';
import { InAppMessages } from './InAppMessages';

vi.mock('~storage/useLocalStorage', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: () => {},
    getState: () => ({
      isLoading: false,
      error: null,
      messages: [
        { id: 1, title: 'XHunt 0.4.6', content: 'New looks', created: String(Date.now()), type: 'all' },
        { id: 2, title: 'AI only', content: 'For AI users', created: String(Date.now()), type: 'ai' },
      ],
    }),
    addCallback: () => () => {},
  },
}));

describe('InAppMessages', () => {
  test('lists messages for the user domains as articles', () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
    render(<InAppMessages />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'XHunt 0.4.6' })).toBeTruthy();
    expect(screen.queryByText('AI only')).toBeNull();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/compontents/InAppMessages.test.tsx`
Expected: FAIL（现在的条目不是 `article`，也没有标题角色）。

- [ ] **Step 3: 改写渲染部分**

保留数据逻辑（订阅 `messageManager`、按领域过滤、展开收起、`sanitizeHtml`）；渲染换成：

- 外层 `div` 去掉内部的 `max-h-[calc(90vh-150px)] overflow-y-auto`（外层页面已经滚动），加 `className='flex flex-col soft:gap-1.5 soft:p-0.5 obsidian:mx-3 obsidian:rounded-xh-card obsidian:bg-xh-raised obsidian:px-3 obsidian:shadow-xh-card'`。
- 加载中：两条 `Skeleton`（`import { Skeleton } from '~/ui/panel/PanelSection'`）。
- 空 / 出错：`EmptyState`。
- 每条消息：

```tsx
<article
  key={message.id ?? index}
  className='flex flex-col gap-1 soft:rounded-xh-card soft:bg-xh-raised soft:p-3 soft:shadow-xh-card obsidian:border-t obsidian:border-xh-line obsidian:py-2.5 obsidian:first:border-t-0 native:border-b native:border-xh-line native:px-4 native:py-3'
>
  <div className='flex items-start justify-between gap-2'>
    <h4 className='text-[12.5px] font-semibold native:text-[15px] native:font-bold'>{message.title}</h4>
    <time className='shrink-0 font-xh-num text-[11px] text-xh-fg-2'>{dayjs(Number(message.created)).format('MM-DD HH:mm')}</time>
  </div>
  <div className={cx('text-[12px] leading-[1.5] text-xh-fg-2 native:text-[14px]', !expanded && 'line-clamp-3')} dangerouslySetInnerHTML={{ __html: html }} />
  {long ? (
    <Button size='sm' variant='soft' className='self-start' onClick={() => toggle(id)}>
      {expanded ? t('showLess') : t('showMore')}
    </Button>
  ) : null}
</article>
```

（`expanded`、`long`、`html`、`toggle` 对应原来的变量；`showLess` / `showMore` 用原来的文案键。）

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/compontents/InAppMessages.test.tsx`，Expected: 1 passed。

```bash
git add src/compontents/InAppMessages.tsx src/compontents/InAppMessages.test.tsx
git commit -m "feat(panel): restyle in-app messages per skin"
```

---

### Task 10: 登录栏

**Files:**
- Modify: `src/compontents/UserAuthPanel.tsx`
- Test: `src/compontents/UserAuthPanel.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import { UserAuthPanel } from './UserAuthPanel';

vi.mock('~storage/useLocalStorage', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
const logout = vi.fn(async () => null);
vi.mock('~contents/services/review.ts', () => ({ userLogout: () => logout() }));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: async () => ({ url: 'https://x.com/auth' }) }));
const openNewTab = vi.fn();
vi.mock('~contents/utils', () => ({ openNewTab: (url: string) => openNewTab(url) }));
vi.mock('~contents/utils/auth.ts', () => ({ clearAuthState: async () => {} }));
vi.mock('~/compontents/navigation/PanelNavigator', () => ({ useNavigation: () => ({ navigateTo: () => {} }) }));

describe('UserAuthPanel', () => {
  test('signed out: a login button and social links', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    render(<UserAuthPanel userInfo={null} />);
    expect(screen.getByTestId('auth-logged-out-panel')).toBeTruthy();
    await userEvent.click(screen.getByTestId('auth-login-button'));
    expect(openNewTab).toHaveBeenCalledWith('https://x.com/auth');
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeTruthy();
  });

  test('signed in: shows the handle and logs out from the menu', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'obsidian');
    setMemoryValue('@xhunt/user', { username: 'alice_web3', displayName: 'Alice Chen', avatar: '' });
    render(<UserAuthPanel userInfo={null} />);
    const panel = screen.getByTestId('auth-logged-in-panel');
    expect(panel.textContent).toContain('@alice_web3');
    await userEvent.click(screen.getByTestId('auth-user-menu-button'));
    await userEvent.click(await screen.findByTestId('auth-logout-button'));
    expect(logout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/compontents/UserAuthPanel.test.tsx`
Expected: FAIL（账户菜单不是 ui-sdk Menu，`findByTestId('auth-logout-button')` 找不到；社交链接没有名称）。

- [ ] **Step 3: 改写 `_UserAuthPanel` 的两种状态（`Avatar`、`XIcon` 保持不变）**

导入：

```ts
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@ui-sdk/react/menu';
import { Avatar as UiAvatar, Button, IconButton } from '~/ui/primitives';
import { MoreIcon } from '~/ui/icons';
import { useUiSkin } from '~/ui/skin/useUiSkin';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
```

未登录：

```tsx
<div
  data-xhunt-testid='auth-logged-out-panel'
  className='flex items-center gap-1 soft:px-1 soft:pt-1 obsidian:border-t obsidian:border-xh-line obsidian:px-2.5 obsidian:py-2 native:border-t native:border-xh-line native:px-3 native:py-2'
>
  <IconButton label='X' size='sm' render={<a href='https://x.com/xhunt_ai' target='_blank' rel='noreferrer' />}>
    <XIcon className='h-3.5 w-3.5 fill-current' />
  </IconButton>
  <IconButton label='GitHub' size='sm' render={<a href='https://github.com/AlphaHunt3/tweet-hunt-extension' target='_blank' rel='noreferrer' />}>
    <Github className='h-3.5 w-3.5' />
  </IconButton>
  <IconButton label='Telegram' size='sm' render={<a href='https://t.me/xhunt_ai' target='_blank' rel='noreferrer' />}>
    {/* 原来的 Telegram SVG */}
  </IconButton>
  <Button size='sm' variant='primary' className='ml-auto' onClick={handleLogin} title={t('loginRequired')} data-xhunt-testid='auth-login-button'>
    <XIcon className='h-3.5 w-3.5 fill-current' />
    {t('login')}
  </Button>
</div>
```

已登录：

```tsx
<div
  data-xhunt-testid='auth-logged-in-panel'
  className='flex items-center gap-2 soft:px-1.5 soft:pt-1 obsidian:border-t obsidian:border-xh-line obsidian:px-3 obsidian:py-2 native:border-t native:border-xh-line native:px-4 native:py-3'
>
  <span className='relative'>
    <UiAvatar name={user.displayName || user.username} src={user.avatar} size='sm' />
    <span aria-hidden='true' className='absolute -bottom-px -right-px size-2 rounded-full bg-[#3fbf7f] ring-2 ring-[var(--xh-canvas)]' />
  </span>
  {skin === 'native' ? (
    <p className='min-w-0 flex-1 truncate text-[13px] text-xh-fg-2'>{t('panelSignedInAs').replace('{handle}', `@${user.username}`)}</p>
  ) : (
    <p className='min-w-0 flex-1 leading-[1.3]'>
      <span className='block truncate text-[12px] font-semibold obsidian:font-medium'>{user.displayName}</span>
      <span className='block truncate text-[11px] text-xh-fg-2 obsidian:font-xh-mono obsidian:text-[10.5px]'>
        @{user.username}
        {skin === 'soft' ? ` · ${t('panelConnectedX')}` : ''}
      </span>
    </p>
  )}
  {skin === 'native' ? (
    <a href='#' onClick={(event) => { event.preventDefault(); navigateTo('/settings'); }} className='text-[13px] text-xh-accent-fg hover:underline'>
      {t('settings')}
    </a>
  ) : null}
  <Menu onAction={(value) => { if (value === 'logout') handleLogout(); }}>
    <MenuTrigger render={<IconButton label={t('panelAccountMenu')} size='sm' data-xhunt-testid='auth-user-menu-button'><MoreIcon /></IconButton>} />
    <MenuContent className='xh-select-content min-w-[140px]'>
      <MenuItem value='logout' className='xh-select-item text-xh-down' data-xhunt-testid='auth-logout-button'>
        {t('logout')}
      </MenuItem>
    </MenuContent>
  </Menu>
</div>
```

（`handleLogin`、`handleLogout` 是原来的登录和退出逻辑；删掉 `showProPanel`、悬停开关和自制下拉；`useNavigation` 在面板外调用时拿到的是默认上下文，原生的「设置」链接点了没反应但不报错。）

- [ ] **Step 4: 确认通过，Commit**

Run: `pnpm test src/compontents/UserAuthPanel.test.tsx`，Expected: 2 passed。若 `MenuTrigger` 不支持 `render` 传入组件，改为 `<MenuTrigger className='xh-iconbtn' data-size='sm' aria-label={…} data-xhunt-testid='auth-user-menu-button'><MoreIcon /></MenuTrigger>`。

```bash
git add src/compontents/UserAuthPanel.tsx src/compontents/UserAuthPanel.test.tsx
git commit -m "feat(panel): restyle the account bar and use a ui-sdk menu"
```

---

### Task 11: 验收

- [ ] `pnpm test` 全部通过；类型检查没有新增错误；`pnpm exec plasmo build` 成功。
- [ ] 沙盒 3 种风格 × 3 种 X 背景：关注者切换范围、展开、点名字跳转；画像的能力模型切换 Web3 / AI（沙盒假数据补上 `multiField`、`multiFieldAi` 和灵魂指数）；点评的仅看精选、翻页；概览的快捷入口；消息列表；登录栏的菜单和退出。
- [ ] 用脚本量对比度：新视图里的文字 ≥ 4.5:1，控件边缘 ≥ 3:1。

---

## 对照代码校对后的调整（执行前）

写完计划后逐条对照了现有代码，以下几处按这里执行，覆盖上面任务里的写法：

1. **沿用已有文案键**，不新增同义词：标题用 `kFollowingAnalytics`、`personalityType`、`kolAbilityModel`、`soulIndex`、`comments`；点评用 `reviews` / `reviews2`、`noReviews` / `noSelectedReviews`、`onlyShowSelectedReviews`、`selectedReviewersTooltip`；评论用 `noComments`、`showMore` / `showLess`、`reportError`；消息用 `noMessages`。Task 2 只新增 `panelKolScopeGlobal/Cn/Top`、`panelKolScopeLabel`、`panelShowAll`、`panelAbilityDomain`、`panelPrevPage`、`panelNextPage`、`panelNoFollowers`、`panelConnectedX`、`panelSignedInAs`、`panelAccountMenu`。
2. **点评数的写法和原来一致**：开着「仅看精选」时是「`realTotalReviews` 条点评」，`realTotalReviews > totalReviews` 时再加「，`totalReviews` 条精评」；关着时是「`totalReviews` 条点评」。抽成 `reviewCountText`，概览也用它。点评统计本来就随 `@xhunt/reviewOnlyKol` 重新请求（`useMainData`）。
3. **「仅看精选」用 ui-sdk 的 `Field` + `FieldLabel` + `FieldDescription`**（switch 文档推荐的写法），说明文字通过 `aria-describedby` 关联，开关的名称就是「仅查看精选评论」。
4. **翻页不用 effect 重置页码**：切换精选时在回调里 `setPage(1)`；换人时 `HomePage` 给 `ReviewsView` 加 `key={userId}`，避免先按旧页码多请求一次。翻页后和原来一样调 `navigationService.navigateTo('main-panel', '/home', { scrollToId: 'panel-scroll-comments' })` 回到评论顶部。
5. **评论条目保留原有功能**：标签、超过 150 字的展开收起、举报链接（`aria-label` 为举报文案）。
6. **新增 `RowButton` 基础组件和 `.xh-rowbtn` / `.xh-link` 样式**：整行可点的按钮或链接（概览的快捷入口、原生的列表行和「显示更多」、关注者条目），焦点环和其他控件一致。不再用一串 `!` 覆盖 `Button` 的样式（Tailwind 类不在图层里，本来就能覆盖图层内的基础样式）。
7. **账户菜单的触发按钮直接给 `MenuTrigger` 加 `xh-iconbtn` 类**，不经 `render` 套 `IconButton`；退出项用 `MenuItem destructive`，样式补 `.xh-select-item[data-destructive]`。ui-sdk 的菜单在原地渲染并进 top layer，Shadow DOM 里的样式照常生效。社交链接是链接不是按钮，用带 `xh-iconbtn` 类的 `<a>`。
8. **消息列表**：保留原来的预览规则（第一条 600 字 / 6 行，其余 80 字 / 3 行）；列表按 `message.id`，没有时按 `created + title` 做 key；消息页的加载图标去掉写死的蓝色。
9. **`NameRightData` 还在用 `AbilityModelData` 类型**，一并导入；`~types` 里的 `MultiFieldData`、`MultiFieldItem` 没别处用就删掉。资料页自己的灵魂指数请求这一阶段不动。
10. **沙盒**：`usePlacementTracking` 在沙盒里换成固定 `twitterId` 的假实现（Vite 别名），`mocks/api.ts` 补 `getSoulInfo`，假数据补 `multiField`、`multiFieldAi`。

## 执行中的调整

1. **关注者链接和原来一样在新标签页打开**（`target='_blank'`），不用 `navigateInX`；展开按钮沿用「显示更多 / 收起」，`panelShowAll` 删掉了。
2. **关注者列表跟随主领域**：主领域是 AI 时显示 `*Ai` 列表和数量，和卡片上的 Web3 / AI 标记、身份卡的排名一致（原来的面板固定显示 Web3 列表）。画像页能力模型默认也选主领域。
3. **原生没有画像页**，所以原生的概览多一行能力模型摘要，项目账号的投资面板也放在概览底部，原来的信息都还在。
4. **灵魂指数的五个维度改成和能力模型一样的「名称 + 进度条 + 分数」行**，五列小格在英文下放不下。
5. **评论卡片没有评论时不显示**（和原来一样），`panel-scroll-comments` 外层容器一直在，外部跳转不受影响。
6. **评论时间跟随界面语言**（原来中文界面也显示「3 days ago」），做法同 `VoteCommentSection`。
7. **头像默认对读屏和 agent 隐藏**（`aria-hidden`），因为每个头像旁边都有名字；单独出现时传 `label` 变成 `role="img"`。这是 agent 测试发现的：头像在快照里是没有名字的组件。
8. **对比度修正**（浏览器里实测）：黑曜浅色卡片上的绿色徽标 4.42:1，`--xh-up` 改为 `#06723f` 后 4.91:1（设计文档同步）；柔光关注者「指标格」选中态的描边改用 `accent-fg`，对卡片和格子本身都在 5.5:1 以上。
9. **沙盒**：`mocks/placement.ts` 固定 `twitterId`；`getSoulInfo` 延迟 600ms 返回，能看到骨架屏；评论按页返回；点评统计改成 `realTotalReviews 128 / totalReviews 96`，能看到「128 条点评 · 96 条精评」。

## 验收结果

- `pnpm vitest run`：38 个测试文件、116 个测试全部通过（含 `src/ui/panel/panel.agent.test.tsx`）。
- 类型检查：76 个错误，都是原有的（阶段 1b 结束时 77 个，提取 `getAbilityModelData` 时顺手消掉一个），没有新增。
- `pnpm exec plasmo build` 成功；15 个测试标记都在包里。`Main.js` 4,374,026 字节，阶段 1b 结束时 4,175,184 字节，增加约 199KB，主要是样式表在包里嵌了约 5 份，加上新的风格变体工具类和 ui-sdk 的 Menu / Field；阶段 5 改成共享样式表。
- 沙盒 3 种风格 × 3 种 X 背景逐一检查了概览、关注者、画像、点评、消息页和登录栏（登录 / 未登录）：范围切换、Web3 / AI 切换、仅看精选、翻页（2 / 5）、账户菜单（在 Shadow DOM 内渲染、样式生效）都正常。所有可见文字对比度 ≥ 4.5:1，最低 4.57:1（原生 dim 概览的 ↑12 徽标）。
- 没能验证的：焦点环只核对了编译后的样式规则（浏览器面板在后台，页面拿不到焦点，`:focus-visible` 不触发）；真实 x.com 上的效果（缺私有模块，扩展在 x.com 上跑不起来）。
