# UI 风格切换 · 阶段 2b（资料页主体）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按画布重做资料页主体：洞察（柔光卡片、黑曜数据标签、原生行内文字，默认展开、可收起）、KOL 粉丝与排名、领域切换、点评卡、AI 分身与社交圈按钮。各指标的详情改用 2a 的弹层承载，弹出内容本身暂时沿用旧组件，2c 再重做。

**Architecture:** 洞察的显示条件和数值收进纯函数 `buildInsightItems`（可单测），`ProfileInsights` 只管三套风格的呈现、收起展开和弹层；所有指标共用一个弹层控制器，同一时间只开一个。`NameRightData` 负责算输入、把指标映射到旧的详情组件。KOL 行、点评卡、按钮的部分见第二部分。

**Tech Stack:** React 19、ui-sdk Popover（`createPopoverController`、`openOnHover`）、Plasmo storage 钩子、Vitest + Testing Library、ui-sdk agent 测试。

总览见 `docs/superpowers/plans/2026-11-15-ui-skins-phase2-overview.md`；画布对应 `.claude/design-canvas/profile-spec.md` 第 2、4、5、6 节。

---

## 第一部分：洞察

### 设计要点

- **指标和顺序**（按画布）：灵魂指数、性格、能力、90 天收益、90 天提及代币、删帖、改帖、改名；项目账户再加关联人物、获投资、已投资、1 天讨论、7 天讨论。显示条件、数值写法与现在一致（见 `buildInsightItems` 的测试）。
- **三套风格**（画布第 2 节）：
  - 柔光：灰底卡片（圆角 18、1px 描边阴影），头部是深色小方块标志 +「XHunt 洞察」+「· 近 90 天公开数据」+ 右侧「收起」；下面 4 列白色小卡，标签在上（11px），数值在下（15px/600，等宽数字）；灵魂指数带小号「分」、提及代币带「个」、改名带「次」；90 天收益按涨跌着色，删帖用下跌色，改帖用提醒色；悬停上浮 1px，打开时强调色描边加浅色外圈；AI 叙事放在卡片底部。
  - 黑曜：一排 26px 的数据标签，「标签 + 等宽数值」，灵魂指数前面一个强调色圆点；悬停和打开时强调色内描边；颜色全部用设计变量（顺带修掉画布浅色主题下的层叠问题）。
  - 原生：X 自己的「数值 + 说明」行内写法，开头一个蓝色 XHunt 标志；悬停下划线，打开时下划线变蓝；只有 90 天收益着色。
- **默认展开**（设计文档第 7 节第 4 条）：`@xhunt/name-insights-expanded` 默认值从 `false` 改成 `true`，用户收起后记住。收起时三套风格都显示一行摘要（前 4 项「标签 数值」）加「更多」；展开时柔光在头部、黑曜和原生在行末给「收起」。两个按钮沿用原来的测试标记、`aria-expanded` 和文案。
- **详情弹层**：每个指标是一个按钮，鼠标停留 300ms 或点击、键盘、触屏都能打开；所有指标共用一个 `createPopoverController`，打开一个会关掉另一个；删帖、改帖用 560px 的大尺寸，其余 400px；打开改帖时才加载改帖详情（沿用 `loadDetails`）。弹层内容暂时是旧组件，弹层自身不加内边距。
- **加载**：`loadingTwInfo` 时显示三条骨架；以前骨架和摘要会同时出现，这次不会了。
- **e2e**：`profile-modules.spec.ts` 从折叠状态开始测，`normalizeXhuntState` 里把 `@xhunt/name-insights-expanded` 设成 `false`，用例本身不改。

### 文件结构

| 文件 | 职责 |
|---|---|
| `src/locales/zh.json`、`en.json` | 洞察标题、短标签、单位 |
| `src/ui/primitives/Popover.tsx` | 导出 `createPopoverController` |
| `src/ui/profile/insightItems.ts` | `buildInsightItems`、`insightSummary`（纯函数） |
| `src/ui/profile/ProfileInsights.tsx` | 三套风格的洞察、收起展开、共用弹层 |
| `src/css/profile.css` | 洞察三套样式、详情弹层尺寸 |
| `src/compontents/area/NameRightData.tsx` | 换成 `ProfileInsights`，删掉旧的摘要行和指标行 |
| `tests/e2e/setup/xhuntUi.ts` | 初始状态设为折叠 |

---

### Task 1: 文案和弹层控制器

**Files:**
- Modify: `src/locales/zh.json`、`src/locales/en.json`
- Modify: `src/ui/primitives/Popover.tsx`

- [ ] **Step 1: 加文案**（同 2a 的脚本写法，`git diff` 只应出现新增行和原最后一行补逗号）

| key | zh | en |
|---|---|---|
| `insightsTitle` | XHunt 洞察 | XHunt insights |
| `insightsSubtitle` | 近 90 天公开数据 | Public data from the last 90 days |
| `insightPersonality` | 性格 | Personality |
| `insightAbility` | 能力 | Ability |
| `insightAbilityLong` | KOL 能力 | KOL ability |
| `insightReturn90` | 90 天收益 | 90d return |
| `insightMentions` | 提及代币 | Tokens mentioned |
| `insightMentionsLong` | 90 天提及代币 | Tokens mentioned (90d) |
| `insightDeleted` | 删帖 | Deleted |
| `insightEdited` | 改帖 | Edited |
| `insightUnitTokens` | 个 | tokens |
| `insightUnitTimes` | 次 | times |

沿用的旧 key：`soulIndex`、`personalityType`、`renameInfo`、`projectMembers`、`investors`、`portfolio`、`discussion1d`、`discussion7d`、`points`、`profileInsightsMore`、`collapse`。

- [ ] **Step 2: 导出控制器**（`src/ui/primitives/Popover.tsx`）

import 里加 `createPopoverController`，并在 `export const Popover = UiPopover;` 前加：

```ts
export { createPopoverController };
```

- [ ] **Step 3: 提交**

```bash
git add src/locales/zh.json src/locales/en.json src/ui/primitives/Popover.tsx
git commit -m "feat(profile): add insight strings and export the popover controller"
```

---

### Task 2: 指标的显示条件和数值

**Files:**
- Create: `src/ui/profile/insightItems.ts`
- Test: `src/ui/profile/insightItems.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
import { describe, expect, test } from 'vitest';
import { buildInsightItems, insightSummary, type InsightInput } from './insightItems';

const t = (key: string) => key;
const base: InsightInput = {
  t,
  isEnabled: () => true,
  hasWeb3: true,
  classification: 'person',
  isProject: false,
  soulScore: 87,
  hasSoul: true,
  mbti: 'INTJ',
  hasMbti: true,
  abilityNames: ['DeFi', '交易', '基建', '宏观'],
  showAbilityModel: true,
  mentions90: 18,
  return90: 0.352,
  deletedCount: 14,
  editedCount: 3,
  showEditInfo: true,
  renameCount: 2,
  membersCount: 0,
  showMembers: false,
  investorsCount: 0,
  totalFunding: 0,
  portfolioCount: 0,
  discussion1d: null,
  discussion1dTotal: 0,
  discussion7d: null,
  discussion7dTotal: 0,
};

describe('buildInsightItems', () => {
  test('lists a person in the canvas order with values, units and tones', () => {
    const items = buildInsightItems(base);
    expect(items.map((item) => item.key)).toEqual([
      'soul', 'mbti', 'ability', 'return90', 'mentions90', 'deleted', 'edited', 'renamed',
    ]);
    const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
    expect(byKey.soul).toMatchObject({ label: 'soulIndex', value: '87', unit: 'points' });
    expect(byKey.mbti).toMatchObject({ label: 'insightPersonality', longLabel: 'personalityType', value: 'INTJ' });
    expect(byKey.ability).toMatchObject({ value: 'DeFi · 交易 · 基建', long: true, longLabel: 'insightAbilityLong' });
    expect(byKey.return90).toMatchObject({ value: '+35.2%', tone: 'up' });
    expect(byKey.mentions90).toMatchObject({ value: '18', unit: 'insightUnitTokens', longLabel: 'insightMentionsLong' });
    expect(byKey.deleted).toMatchObject({ value: '14', tone: 'down' });
    expect(byKey.edited).toMatchObject({ value: '3', tone: 'warn' });
    expect(byKey.renamed).toMatchObject({ value: '2', unit: 'insightUnitTimes', label: 'renameInfo' });
  });

  test('hides items by setting and by missing data, like the old row', () => {
    const off = new Set(['showSoulIndex', 'showDelInfo']);
    const items = buildInsightItems({
      ...base,
      isEnabled: (key) => !off.has(key),
      hasMbti: false,
      showAbilityModel: false,
      return90: 0,
      mentions90: undefined,
      showEditInfo: false,
      renameCount: 0,
    });
    expect(items).toEqual([]);
  });

  test('token stats need web3 and a person; a negative return goes down', () => {
    expect(buildInsightItems({ ...base, hasWeb3: false }).map((item) => item.key)).not.toContain('return90');
    const project = buildInsightItems({ ...base, classification: 'project' });
    expect(project.map((item) => item.key)).not.toContain('mentions90');
    const loss = buildInsightItems({ ...base, return90: -0.12 }).find((item) => item.key === 'return90');
    expect(loss).toMatchObject({ value: '-12.0%', tone: 'down' });
  });

  test('project accounts add members, funding, portfolio and discussion', () => {
    const items = buildInsightItems({
      ...base,
      classification: 'project',
      isProject: true,
      membersCount: 5,
      showMembers: true,
      investorsCount: 3,
      totalFunding: 12_500_000,
      portfolioCount: 7,
      discussion1d: 42,
      discussion1dTotal: 4,
      discussion7d: 88,
      discussion7dTotal: 0,
    });
    const byKey = Object.fromEntries(items.map((item) => [item.key, item]));
    expect(byKey.members.value).toBe('5');
    expect(byKey.investors.value).toBe('$12.5M');
    expect(byKey.portfolio.value).toBe('7');
    expect(byKey.discussion1d.value).toBe('42');
    expect(byKey.discussion7d).toBeUndefined();
    expect(buildInsightItems({ ...base, investorsCount: 3, totalFunding: 0 }).find((item) => item.key === 'investors')?.value).toBe('3');
  });
});

describe('insightSummary', () => {
  test('joins the first four items with their units', () => {
    expect(insightSummary(buildInsightItems(base))).toBe(
      'soulIndex 87points · insightPersonality INTJ · insightAbility DeFi · 交易 · 基建 · insightReturn90 +35.2%',
    );
  });
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/profile/insightItems.test.ts`
Expected: FAIL（找不到 `./insightItems`）。

- [ ] **Step 3: 实现** `src/ui/profile/insightItems.ts`

```ts
import { formatFunding, formatPercentage } from '~contents/utils';

export type InsightKey =
  | 'soul'
  | 'mbti'
  | 'ability'
  | 'return90'
  | 'mentions90'
  | 'deleted'
  | 'edited'
  | 'renamed'
  | 'members'
  | 'investors'
  | 'portfolio'
  | 'discussion1d'
  | 'discussion7d';

export type InsightTone = 'up' | 'down' | 'warn';

export interface InsightItem {
  key: InsightKey;
  label: string;
  longLabel: string;
  value: string;
  unit?: string;
  tone?: InsightTone;
  long?: boolean;
}

export interface InsightInput {
  t: (key: string) => string;
  isEnabled: (key: string) => boolean;
  hasWeb3: boolean;
  classification?: string | null;
  isProject?: boolean;
  soulScore?: number | null;
  hasSoul: boolean;
  mbti?: string | null;
  hasMbti: boolean;
  abilityNames: string[];
  showAbilityModel: boolean;
  mentions90?: number;
  return90?: number | null;
  deletedCount: number;
  editedCount: number;
  showEditInfo: boolean;
  renameCount: number;
  membersCount: number;
  showMembers: boolean;
  investorsCount: number;
  totalFunding?: number;
  portfolioCount: number;
  discussion1d?: number | string | null;
  discussion1dTotal: number;
  discussion7d?: number | string | null;
  discussion7dTotal: number;
}

export const WIDE_INSIGHTS: readonly InsightKey[] = ['deleted', 'edited'];

export function buildInsightItems(input: InsightInput): InsightItem[] {
  const { t, isEnabled } = input;
  const isPerson = input.classification === 'person';
  const items: InsightItem[] = [];
  const add = (item: Omit<InsightItem, 'longLabel'> & { longLabel?: string }) =>
    items.push({ ...item, longLabel: item.longLabel ?? item.label });

  if (isEnabled('showSoulIndex') && input.hasSoul) {
    add({ key: 'soul', label: t('soulIndex'), value: String(input.soulScore || 0), unit: t('points') });
  }
  if (isEnabled('showPersonalityType') && input.hasMbti) {
    add({
      key: 'mbti',
      label: t('insightPersonality'),
      longLabel: t('personalityType'),
      value: input.mbti || 'N/A',
    });
  }
  if (isEnabled('showKolAbilityModel') && input.showAbilityModel && input.abilityNames.length > 0) {
    add({
      key: 'ability',
      label: t('insightAbility'),
      longLabel: t('insightAbilityLong'),
      value: input.abilityNames.slice(0, 3).join(' · '),
      long: true,
    });
  }
  if (isEnabled('show90dPerformance') && input.hasWeb3 && isPerson && input.return90) {
    add({
      key: 'return90',
      label: t('insightReturn90'),
      value: `${input.return90 >= 0 ? '+' : ''}${formatPercentage(input.return90)}`,
      tone: input.return90 >= 0 ? 'up' : 'down',
    });
  }
  if (isEnabled('show90dMention') && input.hasWeb3 && isPerson && Number(input.mentions90)) {
    add({
      key: 'mentions90',
      label: t('insightMentions'),
      longLabel: t('insightMentionsLong'),
      value: String(input.mentions90),
      unit: t('insightUnitTokens'),
    });
  }
  if (isEnabled('showDelInfo') && input.deletedCount > 0) {
    add({ key: 'deleted', label: t('insightDeleted'), value: String(input.deletedCount), tone: 'down' });
  }
  if (input.showEditInfo && input.editedCount > 0) {
    add({ key: 'edited', label: t('insightEdited'), value: String(input.editedCount), tone: 'warn' });
  }
  if (isEnabled('showRenameInfo') && input.renameCount > 0) {
    add({ key: 'renamed', label: t('renameInfo'), value: String(input.renameCount), unit: t('insightUnitTimes') });
  }
  if (isEnabled('showProjectMembers') && !isPerson && input.showMembers) {
    add({ key: 'members', label: t('projectMembers'), value: String(input.membersCount) });
  }
  if (isEnabled('showInvestors') && input.investorsCount > 0) {
    add({
      key: 'investors',
      label: t('investors'),
      value: input.totalFunding ? formatFunding(input.totalFunding) : String(input.investorsCount),
    });
  }
  if (isEnabled('showPortfolio') && input.portfolioCount > 0) {
    add({ key: 'portfolio', label: t('portfolio'), value: String(input.portfolioCount) });
  }
  if (isEnabled('showDiscussion') && input.isProject) {
    if (input.discussion1d && input.discussion1dTotal > 0) {
      add({ key: 'discussion1d', label: t('discussion1d'), value: String(input.discussion1d) });
    }
    if (input.discussion7d && input.discussion7dTotal > 0) {
      add({ key: 'discussion7d', label: t('discussion7d'), value: String(input.discussion7d) });
    }
  }
  return items;
}

export function insightSummary(items: InsightItem[]) {
  return items
    .slice(0, 4)
    .map((item) => `${item.label} ${item.value}${item.unit ?? ''}`)
    .join(' · ');
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/profile/insightItems.test.ts`
Expected: PASS（5 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/ui/profile/insightItems.ts src/ui/profile/insightItems.test.ts
git commit -m "feat(profile): derive insight items from the profile data"
```

---

### Task 3: 洞察组件

**Files:**
- Create: `src/ui/profile/ProfileInsights.tsx`
- Test: `src/ui/profile/ProfileInsights.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import type { InsightItem } from './insightItems';
import { ProfileInsights } from './ProfileInsights';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

const ITEMS: InsightItem[] = [
  { key: 'soul', label: '灵魂指数', longLabel: '灵魂指数', value: '87', unit: '分' },
  { key: 'mbti', label: '性格', longLabel: '性格类型', value: 'INTJ' },
  { key: 'edited', label: '改帖', longLabel: '改帖', value: '3', tone: 'warn' },
];

function renderInsights(overrides: Partial<Parameters<typeof ProfileInsights>[0]> = {}) {
  const props = {
    items: ITEMS,
    loading: false,
    expanded: true,
    onExpandedChange: vi.fn(),
    renderDetail: vi.fn((key: string) => <p>详情：{key}</p>),
    onOpenItem: vi.fn(),
    narrative: <p>叙事一行</p>,
    ...overrides,
  };
  render(<ProfileInsights {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

test('soft shows a card with a header, label-over-value tiles and the narrative inside', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  renderInsights();
  const card = await screen.findByRole('region', { name: 'insightsTitle' });
  expect(within(card).getByText('insightsSubtitle', { exact: false })).toBeTruthy();
  const soul = within(card).getByRole('button', { name: /灵魂指数\s*87分/ });
  expect(soul.textContent).toBe('灵魂指数87分');
  expect(within(card).getByRole('button', { name: /性格类型/ })).toBeTruthy();
  expect(within(card).getByText('叙事一行')).toBeTruthy();
});

test('obsidian shows label-then-value chips with a dot on the soul index', async () => {
  renderInsights();
  const group = await screen.findByRole('group', { name: 'insightsTitle' });
  const soul = within(group).getByRole('button', { name: /灵魂指数/ });
  expect(soul.querySelector('.xh-chip-dot')).toBeTruthy();
  expect(within(group).getByRole('button', { name: /性格\s*INTJ/ })).toBeTruthy();
  expect(screen.getByText('叙事一行').closest('[role="group"]')).toBeNull();
});

test('native shows value-then-caption text and only colours the return', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  renderInsights();
  const group = await screen.findByRole('group', { name: 'insightsTitle' });
  const edited = within(group).getByRole('button', { name: /3\s*改帖/ });
  expect(edited.querySelector('b')?.getAttribute('data-tone')).toBeNull();
});

test('opening an item shows its detail and reports it; only one is open', async () => {
  const props = renderInsights();
  await userEvent.click(await screen.findByRole('button', { name: /改帖/ }));
  expect(await screen.findByText('详情：edited')).toBeTruthy();
  expect(props.onOpenItem).toHaveBeenCalledWith('edited');
  await userEvent.click(screen.getByRole('button', { name: /性格/ }));
  expect(await screen.findByText('详情：mbti')).toBeTruthy();
  await waitFor(() => expect(screen.queryByText('详情：edited')).toBeNull());
});

test('collapse and expand keep the old test ids, labels and aria-expanded', async () => {
  const props = renderInsights();
  const collapse = await screen.findByTestId('profile-insights-collapse-button');
  expect(collapse.getAttribute('aria-expanded')).toBe('true');
  expect(collapse.textContent).toContain('collapse');
  await userEvent.click(collapse);
  expect(props.onExpandedChange).toHaveBeenCalledWith(false);
});

test('collapsed shows a one-line summary and a more button', async () => {
  const props = renderInsights({ expanded: false });
  expect(await screen.findByText('灵魂指数 87分 · 性格 INTJ · 改帖 3')).toBeTruthy();
  const expand = screen.getByTestId('profile-insights-expand-button');
  expect(expand.getAttribute('aria-expanded')).toBe('false');
  expect(expand.textContent).toContain('profileInsightsMore');
  await userEvent.click(expand);
  expect(props.onExpandedChange).toHaveBeenCalledWith(true);
});

test('loading shows a skeleton; no items still shows the narrative', () => {
  const { unmount } = render(
    <ProfileInsights items={ITEMS} loading expanded onExpandedChange={() => {}} renderDetail={() => null} />,
  );
  expect(document.querySelector('.xh-insight-skeleton')).toBeTruthy();
  unmount();
  render(
    <ProfileInsights
      items={[]}
      loading={false}
      expanded
      onExpandedChange={() => {}}
      renderDetail={() => null}
      narrative={<p>只有叙事</p>}
    />,
  );
  expect(screen.getByText('只有叙事')).toBeTruthy();
  expect(screen.queryByTestId('profile-insights-collapse-button')).toBeNull();
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/profile/ProfileInsights.test.tsx`
Expected: FAIL（找不到 `./ProfileInsights`）。

- [ ] **Step 3: 实现** `src/ui/profile/ProfileInsights.tsx`

```tsx
import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { ChevronDownIcon, LogoIcon } from '../icons';
import { cx } from '../primitives/cx';
import { createPopoverController, Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover';
import { useUiSkin } from '../skin/useUiSkin';
import { insightSummary, WIDE_INSIGHTS, type InsightItem, type InsightKey } from './insightItems';

export interface ProfileInsightsProps {
  items: InsightItem[];
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  renderDetail: (key: InsightKey) => ReactNode;
  onOpenItem?: (key: InsightKey) => void;
  narrative?: ReactNode;
}

export function ProfileInsights({
  items,
  loading,
  expanded,
  onExpandedChange,
  renderDetail,
  onOpenItem,
  narrative,
}: ProfileInsightsProps) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const [controller] = useState(() => createPopoverController<InsightKey>());
  const [activeKey, setActiveKey] = useState<InsightKey | null>(null);

  if (loading) {
    return (
      <div className='xh-insight-skeleton' aria-hidden='true'>
        <span className='xh-skeleton' />
        <span className='xh-skeleton' />
        <span className='xh-skeleton' />
      </div>
    );
  }
  if (items.length === 0) return <>{narrative}</>;

  const activeItem = items.find((item) => item.key === activeKey);
  const toggle = expanded ? (
    <button
      type='button'
      className='xh-insight-toggle'
      data-xhunt-testid='profile-insights-collapse-button'
      aria-expanded
      onClick={() => onExpandedChange(false)}
    >
      {t('collapse')}
      {skin === 'soft' && <ChevronDownIcon size={12} className='xh-insight-chevron' />}
    </button>
  ) : (
    <button
      type='button'
      className='xh-insight-toggle'
      data-xhunt-testid='profile-insights-expand-button'
      aria-expanded={false}
      onClick={() => onExpandedChange(true)}
    >
      {t('profileInsightsMore')}
      {skin === 'soft' && <ChevronDownIcon size={12} />}
    </button>
  );

  const trigger = (item: InsightItem) => (
    <PopoverTrigger
      key={item.key}
      controller={controller}
      payload={item.key}
      className={cx(skin === 'soft' && 'xh-itile', skin === 'obsidian' && 'xh-chip', skin === 'native' && 'xh-inline-item')}
      data-key={item.key}
      data-xhunt-testid={`profile-insight-${item.key}`}
    >
      {skin === 'soft' && (
        <>
          <span className='xh-itile-label'>{item.longLabel}</span>
          <b className='xh-itile-value' data-tone={item.tone} data-long={item.long ? '' : undefined}>
            {item.value}
            {item.unit && <small className='xh-itile-unit'>{item.unit}</small>}
          </b>
        </>
      )}
      {skin === 'obsidian' && (
        <>
          {item.key === 'soul' && <span className='xh-chip-dot' aria-hidden='true' />}
          {item.label}
          <b data-tone={item.tone} data-long={item.long ? '' : undefined}>
            {item.value}
          </b>
        </>
      )}
      {skin === 'native' && (
        <>
          <b data-tone={item.key === 'return90' ? item.tone : undefined}>{item.value}</b>
          {item.label}
        </>
      )}
    </PopoverTrigger>
  );

  const popover = (
    <Popover
      controller={controller}
      openOnHover
      delay={300}
      closeDelay={150}
      onPayloadChange={(payload) => {
        const key = (payload as InsightKey | undefined) ?? null;
        setActiveKey(key);
        if (key) onOpenItem?.(key);
      }}
    >
      <PopoverContent
        align='start'
        className='xh-detail-pop'
        data-size={activeKey && WIDE_INSIGHTS.includes(activeKey) ? 'lg' : 'md'}
        aria-label={activeItem?.label}
      >
        {(state: { payload?: unknown }) => (state.payload ? renderDetail(state.payload as InsightKey) : null)}
      </PopoverContent>
    </Popover>
  );

  const summary = (
    <div className='xh-insight-collapsed'>
      <span className='xh-insight-summary'>{insightSummary(items)}</span>
      {toggle}
    </div>
  );

  if (skin === 'soft') {
    return (
      <section className='xh-insight' aria-label={t('insightsTitle')}>
        <div className='xh-insight-head'>
          <span className='xh-insight-mark' aria-hidden='true'>
            <LogoIcon size={12} />
          </span>
          <b>{t('insightsTitle')}</b>
          {expanded ? <span>· {t('insightsSubtitle')}</span> : <span className='xh-insight-summary'>{insightSummary(items)}</span>}
          {toggle}
        </div>
        {expanded && <div className='xh-itiles'>{items.map(trigger)}</div>}
        {narrative}
        {popover}
      </section>
    );
  }

  return (
    <>
      {expanded ? (
        <div
          className={skin === 'obsidian' ? 'xh-chips' : 'xh-inline'}
          role='group'
          aria-label={t('insightsTitle')}
        >
          {skin === 'native' && (
            <span className='xh-inline-mark' aria-hidden='true'>
              <LogoIcon size={14} strokeWidth={2} />
            </span>
          )}
          {items.map(trigger)}
          {toggle}
        </div>
      ) : (
        summary
      )}
      {narrative}
      {popover}
    </>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/profile/ProfileInsights.test.tsx`
Expected: PASS（7 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/ui/profile/ProfileInsights.tsx src/ui/profile/ProfileInsights.test.tsx
git commit -m "feat(profile): add the insights block for every skin with a shared detail popover"
```

---

### Task 4: 洞察样式

**Files:**
- Modify: `src/css/profile.css`（`@layer xh-primitives { … }` 里、`.xh-narr` 规则之前）

- [ ] **Step 1: 加样式**

```css
  .xh-insight {
    margin-top: 10px;
    padding: 8px;
    border-radius: 18px;
    background: var(--xh-canvas);
    box-shadow: 0 0 0 1px var(--xh-line);
    font-family: var(--xh-font-ui);
    line-height: 1.45;
  }
  .xh-insight-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 2px 4px 8px;
    color: var(--xh-fg-2);
    font-size: 12px;
  }
  .xh-insight-head b {
    color: var(--xh-fg);
    font-weight: 600;
    white-space: nowrap;
  }
  .xh-insight-mark {
    display: grid;
    flex: none;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 6px;
    background: var(--xh-fg);
    color: var(--xh-canvas);
  }
  .xh-insight-toggle {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 2px;
    margin-inline-start: auto;
    color: var(--xh-fg-2);
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
    transition: color var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-insight-toggle:hover {
    color: var(--xh-fg);
  }
  .xh-insight-toggle:focus-visible,
  .xh-itile:focus-visible,
  .xh-chip:focus-visible,
  .xh-inline-item:focus-visible {
    outline: 2px solid var(--xh-accent);
    outline-offset: 2px;
  }
  .xh-insight-chevron {
    rotate: 180deg;
  }
  .xh-insight-summary {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .xh-itiles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .xh-itile {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    padding: 7px 10px 8px;
    border-radius: 12px;
    background: var(--xh-surface);
    box-shadow: var(--xh-shadow-card);
    text-align: start;
    cursor: pointer;
    transition:
      transform var(--xh-d-xs) var(--xh-ease-out),
      box-shadow var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-itile:hover {
    transform: translateY(-1px);
    box-shadow:
      0 0 0 1px var(--xh-line-2),
      0 6px 14px -6px rgba(0, 0, 0, 0.14);
  }
  .xh-itile[data-open] {
    box-shadow:
      0 0 0 1.5px var(--xh-accent),
      0 0 0 4px var(--xh-accent-soft);
  }
  .xh-itile-label {
    overflow: hidden;
    color: var(--xh-fg-2);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .xh-itile-value {
    overflow: hidden;
    color: var(--xh-fg);
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .xh-itile-value[data-long] {
    font-size: 13px;
    letter-spacing: -0.01em;
    line-height: 1.55;
  }
  .xh-itile-unit {
    margin-inline-start: 2px;
    color: var(--xh-fg-2);
    font-size: 11px;
    font-weight: 500;
  }
  .xh-itile-value[data-tone='up'],
  .xh-chip b[data-tone='up'],
  .xh-inline-item b[data-tone='up'] {
    color: var(--xh-up);
  }
  .xh-itile-value[data-tone='down'],
  .xh-chip b[data-tone='down'],
  .xh-inline-item b[data-tone='down'] {
    color: var(--xh-down);
  }
  .xh-itile-value[data-tone='warn'],
  .xh-chip b[data-tone='warn'] {
    color: var(--xh-warn);
  }

  .xh-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
  }
  .xh-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    padding: 0 9px 0 7px;
    border-radius: 8px;
    background: var(--xh-raised);
    box-shadow: inset 0 0 0 1px var(--xh-line-2);
    color: var(--xh-fg-2);
    font-family: var(--xh-font-ui);
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      box-shadow var(--xh-d-xs) var(--xh-ease-out),
      background var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-chip b {
    color: var(--xh-fg);
    font-family: var(--xh-font-num);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .xh-chip b[data-long] {
    font-family: var(--xh-font-ui);
    letter-spacing: 0;
  }
  .xh-chip:hover,
  .xh-chip[data-open] {
    background: var(--xh-hover);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--xh-accent) 50%, transparent);
  }
  .xh-chip-dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--xh-accent);
  }
  .xh-chips .xh-insight-toggle {
    margin-inline-start: 2px;
    color: var(--xh-fg-3);
    font-family: var(--xh-font-num);
    font-size: 11px;
  }

  .xh-inline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 14px;
    margin-top: 10px;
    color: var(--xh-fg-2);
    font-size: 15px;
    line-height: 1.45;
  }
  .xh-inline-mark {
    display: inline-flex;
    margin-inline-end: -6px;
    color: var(--xh-accent-fg);
  }
  .xh-inline-item {
    color: inherit;
    font-size: inherit;
    cursor: pointer;
    text-underline-offset: 3px;
  }
  .xh-inline-item b {
    margin-inline-end: 4px;
    color: var(--xh-fg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .xh-inline-item:hover,
  .xh-inline-item[data-open] {
    text-decoration: underline;
    text-decoration-thickness: 1px;
  }
  .xh-inline-item[data-open] {
    text-decoration-color: var(--xh-accent);
  }
  .xh-inline .xh-insight-toggle {
    margin-inline-start: 0;
    color: var(--xh-accent-fg);
    font-size: 15px;
  }
  .xh-inline .xh-insight-toggle:hover {
    color: var(--xh-accent-fg);
    text-decoration: underline;
  }

  .xh-insight-collapsed {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin-top: 10px;
    color: var(--xh-fg-2);
    font-family: var(--xh-font-ui);
    font-size: 12.5px;
  }
  .xh-insight-collapsed .xh-insight-toggle {
    margin-inline-start: 0;
    color: var(--xh-accent-fg);
  }
  [data-skin='native'] .xh-insight-collapsed {
    font-size: 15px;
  }
  .xh-insight-skeleton {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .xh-insight-skeleton .xh-skeleton {
    width: 72px;
    height: 14px;
  }

  .xh-detail-pop {
    padding: 0;
    max-width: min(400px, calc(100vw - 24px));
    max-height: min(400px, var(--available-height));
  }
  .xh-detail-pop[data-size='lg'] {
    max-width: min(560px, calc(100vw - 24px));
    max-height: min(560px, var(--available-height));
  }
```

- [ ] **Step 2: 确认样式进了产物，提交**

Run: `pnpm exec plasmo build && grep -c "xh-itiles" build/chrome-mv3-prod/Main.*.js`
Expected: 计数大于 0。

```bash
git add src/css/profile.css
git commit -m "feat(profile): style the insights block per skin"
```

---

### Task 5: 接进资料页

**Files:**
- Modify: `src/compontents/area/NameRightData.tsx`
- Modify: `tests/e2e/setup/xhuntUi.ts`

- [ ] **Step 1: 改 `NameRightData`**
  1. `@xhunt/name-insights-expanded` 的默认值从 `false` 改成 `true`。
  2. 删掉：`compactInvestorsText`、`compactPortfolioText`、`compactAbilityText`、`compactMbtiText`、`compactSoulText`、`compactInsightParts`、`shouldCollapseInsights`、`fullStatsClassName`、`compactInsightContent`、`mbtiColor`、`soulColor`、`NameInsightsSkeleton`，以及 portal 里从摘要行到指标行结束（含收起按钮）的整段 JSX 和单独的 `NarrativeLine`。
  3. 在原 `day90NowProfitAvg` 附近算输入，构造指标（`useMemo` 依赖写全）：

```tsx
  const discussionData = useMemo(
    () =>
      discussionInfo
        ? {
            ca: discussionInfo.ca || '',
            symbol: discussionInfo.symbol || '',
            name: discussionInfo.name,
            twitter: discussionInfo.twitter,
            discussion1dCn: discussionInfo.discussion1dCn,
            discussion1dEn: discussionInfo.discussion1dEn,
            discussion7dCn: discussionInfo.discussion7dCn,
            discussion7dEn: discussionInfo.discussion7dEn,
          }
        : undefined,
    [discussionInfo],
  );
  const bulletCount = (period?: { negativeBulletPoints?: unknown[]; positiveBulletPoints?: unknown[] }) =>
    (period?.negativeBulletPoints?.length || 0) + (period?.positiveBulletPoints?.length || 0);
  const renameCount = !loadingRenameInfo && renameInfo?.accounts?.length
    ? Math.max(Object.keys(renameInfo.accounts[0]?.screen_names || {}).length - 1, 0)
    : 0;

  const insightItems = buildInsightItems({
    t,
    isEnabled,
    hasWeb3,
    classification: twInfo?.basicInfo?.classification,
    isProject: Boolean(twInfo?.kolFollow?.isProject),
    soulScore: soulData?.score,
    hasSoul: !loadingSoulData && Boolean(soulData),
    mbti: mbti?.mbti,
    hasMbti: Boolean(twInfo?.mbti),
    abilityNames,
    showAbilityModel: shouldShowAbilityModel,
    mentions90: twInfo?.kolTokenMention?.day90?.tokenMentions?.length,
    return90: day90NowProfitAvg,
    deletedCount: !loadingDel && deletedTweets?.length ? deletedTweets.length : 0,
    editedCount: !editedTweets.loadingCount ? editedTweets.count : 0,
    showEditInfo,
    renameCount,
    membersCount: projectMembersCount,
    showMembers: hasRootMembers || hasGroupedMembers,
    investorsCount: !loadingRootData ? rootData?.invested?.investors?.length || 0 : 0,
    totalFunding: Number(rootData?.invested?.total_funding) || 0,
    portfolioCount: !loadingRootData ? rootData?.investor?.investors?.length || 0 : 0,
    discussion1d: !loadingDiscussionInfo ? discussionInfo?.popularity1d : null,
    discussion1dTotal: bulletCount(discussionInfo?.discussion1dCn),
    discussion7d: !loadingDiscussionInfo ? discussionInfo?.popularity7d : null,
    discussion7dTotal: bulletCount(discussionInfo?.discussion7dCn),
  });
```

  4. 详情映射（属性照抄原来各 `HoverStatItem` 的 `hoverContent`）：

```tsx
  const renderDetail = (key: InsightKey): React.ReactNode => {
    switch (key) {
      case 'soul':
        return <SoulDensity data={soulData} userId={userId} newTwitterData={newTwitterData} loadingTwInfo={loadingTwInfo} />;
      case 'mbti':
        return <MBTISection data={mbti!} isHoverPanel={true} />;
      case 'ability':
        return shouldShowAbilityRadar ? (
          <AbilityModelPanel
            web3Data={web3AbilityData}
            aiData={aiAbilityData}
            activeDomain={activeAbilityDomain}
            onDomainChange={setStoredAbilityDomain}
            userId={userId}
            newTwitterData={newTwitterData}
            loadingTwInfo={loadingTwInfo}
            title={t('kolAbilityModel')}
            web3Label={t('domainWeb3')}
            aiLabel={t('domainAi')}
          />
        ) : (
          <AbilityModelDetailPanel
            web3Data={web3AbilityData}
            aiData={aiAbilityData}
            activeDomain={activeAbilityDomain}
            onDomainChange={setStoredAbilityDomain}
            title={t('kolAbilityModel')}
            web3Label={t('domainWeb3')}
            aiLabel={t('domainAi')}
            personalizedColor={personalizedColors.primary}
          />
        );
      case 'return90':
        return <TokenPerformanceSection isHoverPanel={true} kolData={twInfo} defaultPeriod={'day90'} mode={'Metrics'} />;
      case 'mentions90':
        return <TokenPerformanceSection isHoverPanel={true} kolData={twInfo} defaultPeriod={'day90'} mode={'WordCloud'} />;
      case 'deleted':
        return (
          <ProRequired enableAnimation={false} showExtraTitle={true}>
            <DeletedTweetsSection isHoverPanel={true} deletedTweets={deletedTweets} loadingDel={loadingDel} isVip={deletedTweetsIsVip} />
          </ProRequired>
        );
      case 'edited':
        return (
          <EditedTweetsSection
            count={editedTweets.count}
            access={editedTweets.access}
            items={editedTweets.items}
            loading={editedTweets.loadingDetails}
            loaded={editedTweets.detailsLoaded}
            error={editedTweets.error}
            hasMore={editedTweets.hasMore}
            onRetry={editedTweets.retryDetails}
            onLoadMore={editedTweets.loadMore}
          />
        );
      case 'renamed':
        return renameInfo?.accounts?.[0] ? <NameHistorySection data={renameInfo.accounts[0]} /> : null;
      case 'members':
        return <ProjectMembersSection data={projectMemberData} isHoverPanel={true} />;
      case 'investors':
        return renderInvestorList(t('investors'), rootData?.invested?.investors, rootData?.invested?.total_funding, rootData?.projectLink, true);
      case 'portfolio':
        return renderInvestorList(t('portfolio'), rootData?.investor?.investors, rootData?.investor?.total_funding, rootData?.projectLink, true);
      case 'discussion1d':
        return <DiscussionPanel data={discussionData} period='1d' loading={loadingDiscussionInfo} />;
      case 'discussion7d':
        return <DiscussionPanel data={discussionData} period='7d' loading={loadingDiscussionInfo} />;
    }
  };
```

  5. portal 里 `ProfileTagline` 之后换成：

```tsx
      <ProfileInsights
        items={insightItems}
        loading={loadingTwInfo}
        expanded={isInsightsExpanded}
        onExpandedChange={setIsInsightsExpanded}
        renderDetail={renderDetail}
        onOpenItem={(key) => {
          if (key === 'edited') void editedTweets.loadDetails();
        }}
        narrative={
          isEnabled('showNarrative') && twInfo?.narrative && !loadingTwInfo ? (
            <NarrativeLine narrative={twInfo.narrative} />
          ) : null
        }
      />
```

  6. import：加 `ProfileInsights`、`buildInsightItems`、`InsightKey`、`DiscussionPanel`；删掉不再使用的 `HoverStatItem`、`DiscussionSection`、`AbilityTags`、`formatFunding`、`formatPercentage`、`getMBTIColor`、`generateScoreBasedColor`（以 `tsc` 报的未使用为准，用到的保留）。

- [ ] **Step 2: e2e 初始状态**（`tests/e2e/setup/xhuntUi.ts` 的 `normalizeXhuntState`，`setExtensionStorage` 对象里加一行）

```ts
    '@xhunt/name-insights-expanded': false,
```

- [ ] **Step 3: 类型检查没有新增错误，全量测试通过**

Run: `pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: 不超过 75。

Run: `pnpm test`
Expected: 全部通过。

- [ ] **Step 4: 沙盒自查后提交**

在沙盒「资料页」里补齐假数据（`MOCK_TW_INFO` 加 `kolTokenMention.day90`：`tokenMentions` 18 项、`maxProfitAvg: 0.352`；`ProfileDemo` 传 `deletedTweets` 14 条、`renameInfo` 3 个名字），三套风格各看一遍，悬停和点击指标都能打开旧的详情。

```bash
git add src/compontents/area/NameRightData.tsx tests/e2e/setup/xhuntUi.ts dev/sandbox
git commit -m "feat(profile): render insights per skin, expanded by default"
```


### 第一部分：执行中的调整

1. **点另一个指标会先关掉当前弹层**：弹层开着时按下另一个指标，ui-sdk 按「点在弹层外」处理，先关闭，再点一次才打开新的。鼠标悬停时从一个指标移到另一个会直接切换。测试改为验证悬停切换，另加「点击打开、Esc 关闭」。
2. **弹层会盖住下一行的指标**：弹层默认在指标下方打开，鼠标要先移开、等弹层关闭，才能悬停到被盖住的那项。旧的悬停卡片也是这样，没有改变。
3. **沙盒补了假数据**：90 天提及代币（18 个、收益 +35.2%）、14 条删帖、3 个历史用户名。

### 第一部分：验收结果

- `pnpm test`：56 个测试文件、171 个测试全部通过；类型检查 75 个错误，全部是原有的；`plasmo build` 成功。
- 沙盒三套风格 × X 三种背景逐一截图：柔光卡片（头部、4 列小卡、卡内叙事）、黑曜数据标签、原生行内文字都和画布一致；90 天收益着上涨色，删帖着下跌色。
- 浏览器实测对比度：柔光小卡标签不低于 6.69:1，黑曜标签文字不低于 5.65:1，原生说明文字不低于 5.6:1；数值都在 13:1 以上。
- 悬停：灵魂指数打开旧的灵魂指数卡片（400px）；移开后关闭；删帖打开 560px 的大尺寸弹层。
- `NameRightData` 从 981 行减到 781 行。

---

## 第二部分：KOL 行、点评卡、按钮（要点；任务在第一部分完成后展开）

### 现状要点（盘点结果，行号对应 HEAD `f8c1868`）

**KOL 粉丝与排名**（`FollowedRightData.tsx` 371–863）。只显示当前领域的一组，`kf` 指 `twInfo?.kolFollow`：

| 项 | Web3 条件 | AI 条件 | 现在的数值 | 详情 |
|---|---|---|---|---|
| KOL 粉丝 | `hasWeb3 && showWeb3KolFollowers && kf.globalKolFollowersCount > 0` | `hasAi && showAiKolFollowers && kf.globalKolFollowersCountAi > 0` | `formatNumber(count)` | `KolFollowersSection defaultTab='global'`（AI 加 `domain='ai'`） |
| TOP100 | `showTop100KolsWeb3`、`topKolFollowersCount` | `showTop100KolsAi`、`topKolFollowersCountAi` | 同上 | `defaultTab='top100'` |
| 中文 KOL | `showCnKolsWeb3`、`cnKolFollowersCount` | `showCnKolsAi`、`cnKolFollowersCountAi` | 同上 | `defaultTab='cn'` |
| 全球影响力 | `showFqRank`（无数据条件） | `showFqRankAi` | `kolRank20W` 有效时 `1,234/200K`，否则 `>200K`；AI 用 `kolRank20WAi`、`/50K` | `RankTooltip rankType='followers'`（AI 加 `isAi`） |
| 华语排名（仅中文界面） | `showCnRank && kf.isCn` | `showCnRankAi && kf.isCn` | `kolCnRank`，分母 `t('kolCnRankTotal')`（AI 固定 3000） | `rankType='chinese'` |
| 英文排名（非中文界面） | `showEnInfluenceRank && kf.kolGlobalRank` | `showEnInfluenceRankAi && kf.kolGlobalRankAi` | 分母 `Number(t('kolEnRankTotal')) \|\| 10000` | `rankType='english'` |
| 项目排名 | `showProjectRank && kf.isProject` | `showProjectRankAi && kf.isProject` | `kolProjectRank(Ai)`，分母 `t('kolProjectRankTotal')` | `rankType='project'` |

- 排名后面的涨跌一律用 `day1`（`kolRankChange`、`kolCnRankChange`、`kolGlobalRankChange`、`kolProjectRankChange`，AI 版加 `Ai` 后缀）。
- `formatUpperCase(n) = numeral(n).format('0,0a')` 再把 k/m/t 大写；`formatNumber` 在 `~contents/utils`。
- **缺文案**：`zh.json` 没有 `kolCnRankTotal`、`kolProjectRankTotal`（en 都是 `"10000"`），中文界面会显示 `1,234/0`、`>0`。补上。
- **领域切换**：`@xhunt/followed-active-domain`（默认 `null`）；默认领域 `hasWeb3 && hasAi ? primaryDomain : hasWeb3 ? 'web3' : 'ai'`；保存的领域不可用时回退默认。两个领域都有时才能点。提示文案 `currentDomainRankData`、`switchToDomainRank`（含 `{domain}`）。`Web3`、`AI` 用 `domainWeb3`、`domainAi`。

**点评卡**（`ReviewHeader.tsx`，由 `FollowedRightData` 在 `showReviews` 时渲染；加载中显示骨架）：
- 换 handler 时先用 `useDebounceEffect`（100ms，maxWait 300，leading）等数据就位，没就位前什么都不画。
- 空状态条件 `!stats || !stats.realTotalReviews`：星标 + `reviewOnlyKol ? t('noSelectedReviews') : t('noReviews')`。
- 有点评：平均分（`averageRating` 为真时，保留一位小数）；数量文案 `reviewOnlyKol ? `${real} ${t('reviews')}` + (real > total ? ` · ${total} ${t('reviews2')}` : '') : `${total} ${t('reviews')}``；有数据时可点，点了 `window.dispatchEvent(new CustomEvent('xhunt:open-panel'))` 再 `navigationService.navigateTo('main-panel', '/home', { scrollToId: 'panel-scroll-comments' })`，并在 `xhunt:panel-registered` 时再导航一次。
- 头像：`stats.topReviewers`（字段 `avatar`、`name`；沙盒假数据是 `displayName`/`username`，两者都要兼容）。
- 标签：`tagCloud` 前 5 个，`文本 + 次数`；多出来的写成 `+N`（原来写死「个标签」）。
- 「写点评」按钮：自己的主页不显示（`@xhunt/user.username` 与 handler 忽略大小写相等）；文案 `stats.currentUserReview && isLoggedIn ? t('modifyReview') : t('submitReview')`；测试标记 `review-open-button`。
- 弹出的内容是 `ReviewTooltip`：没登录是标签词云 + 「请使用推特登录后点评」按钮（`getTwitterAuthUrl` → `openNewTab`）；登录后是 `ReviewSection`（写点评表单，2b 不改）。宽 380px。
- `getRatingColor` 被 `CommentsSection` 引用，要保留导出。

**AI 分身按钮**（`KolAiChatButton.tsx`）：
- 列表 `useRequest(fetchKolChatList, { ready: showAiAvatarButton, cacheKey: 'kol-chat-list', staleTime: 60000, debounceWait: 300 })`；非公开条目只给测试用户（`isTesterOnly`）；按 `twitter_handle` 忽略大小写、去掉 `@` 匹配当前 handler。
- 文案：官方 KOL 用 `perspective_name_zh/en`，缺省 `t('aiAvatar')`；非官方缺省 `${name}思维` / `${name} Perspective`。
- 隐藏：没有 handler、加载中、不在列表、`showAiAvatarButton` 关、`showAiAvatarButton_official/_unofficial` 远程开关关。
- 点击：没登录跳登录；否则派发 `ai-chat-event`，`detail` 为 `{ userId, element: 按钮本身, kolId, kolType, perspectiveName }`，对话框锚定在 `element` 上，所以 ref 必须挂在真正的按钮上。
- 已知问题：接口返回 `null` 时 `.filter` 报错。
- 外层 `kol-ai-chat-button` 测试标记、右 8px 下 12px 的外边距（适配 X 的按钮行）保留。

**社交圈按钮**（`SocialCircleFeature.tsx` 206–243）：`isAvailable` 为真才显示；按钮 `aria-label`/`title` 为 `t('socialCircleView')`，`aria-haspopup='dialog'`、`aria-expanded={isOpen}`，加载时禁用；`triggerRef` 必须挂在按钮上（对话框定位和关闭后回焦都靠它）；「NEW」用 `t('newBadge', 'NEW')`；测试标记 `kol-social-circle-button`。对话框本身不改（阶段 5）。

### 设计决定

- **排名写法按画布改成 `#1,234`**：没进榜写 `>200K`、`>50K`、`>10K`、`>3K`。分母说明留在详情里（`RankTooltip` 的描述文字已经写了总样本数）。
- **柔光、黑曜的 KOL 粉丝合成一个胶囊**（三个数字用分隔线或「/」隔开），点开是带三个标签页的 KOL 粉丝卡；原生拆成三个行内按钮，各自打开对应标签页。
- **领域切换**：柔光、黑曜用基础组件 `SegmentedControl`（迷你尺寸）；原生是「Web3 ⇄」文字按钮，`aria-label` 用 `switchToDomainRank`。只有一个领域时不显示。
- **位置**：柔光、黑曜的 KOL 行和点评卡各占一整行（在 X 关注数下面）；原生的 KOL 数据接在 X 的关注数后面，点评另起一行。
- **点评卡**：柔光是浅底卡片（星标、平均分、数量、最多 4 个头像、写点评按钮，下面一行标签）；黑曜是一行数据标签；原生是一行文字，「写点评」是蓝色链接。写点评改用弹层（宽 380px），内容仍是 `ReviewTooltip`。
- **按钮**：AI 分身是胶囊（柔光强调色浅底、黑曜强调色发丝描边、原生 X 描边按钮），「BETA」三套各一种；社交圈是 36px 圆形按钮加「NEW」角标。去掉 AI 按钮上重复的悬停提示（按钮上已经写了名字）。
