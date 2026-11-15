# UI 风格切换 · 阶段 1d（设置页重排）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 设置页按三套风格重排：顶部搜索，主列表只放「通用」「头像排名」两组常用项和一组「更多」入口，其余分组点进二级页；所有设置项、存储键、测试标记和行为保持不变。

**Architecture:** `SettingsPage` 只做容器：读一次 `useAllSettings()`，通过 `SettingsProvider` 往下传，管理当前二级页、搜索词、信息流净化的跳转。各分组拆到 `src/ui/settings/`，各自持有自己的存储状态（语言音效、头像排名、领域、悬浮面板、EVM 地址）。信息流净化保留原组件，去掉自带的折叠头，控件换成基础组件。分组和过滤规则（测试账号可见项、领域专属项）提成纯函数 `groupSettings`。

**Tech Stack:** React 19、ui-sdk（Field、Switch、SegmentedControl、Select、Radio、Slider、Collapsible、Input）、Plasmo storage 钩子、Vitest。

对应设计文档第 3 节「设置页」、第 4 节组件映射（设置开关 = switch，设置分组 = accordion），画布 `A/B/C-pages.dc.html` 的设置页。

---

## 设计要点

- **主列表**：通用（界面风格、语言、提示音效、4 个开关）→ 头像排名设置（显示开关；打开后才有排名类型和徽章皮肤）→ 更多（感兴趣领域、信息流净化、Profile 页面设置、[首页右侧栏]、Web3 领域设置、AI 领域设置、悬浮面板设置、[EVM 地址绑定]），每行右侧是当前状态摘要。
- **三套风格**：柔光是可折叠的白卡片（`CollapsibleSection`），「更多」是一张不折叠的卡片；黑曜是平铺的分组，组名小号大写；原生像 X 自己的设置页，组名 20px 粗体，行通栏，「更多」的摘要在第二行。
- **二级页**：标题换成分组名，左上角返回主列表（三套风格都有，黑曜也有）；内容沿用同一套行组件。
- **搜索**：按当前语言的文案匹配，开关直接在结果里切换；界面风格、语言、音效直接给控件；其余（如「呈现方式」「悬浮框宽度」）给一行跳转到所在二级页。
- **跳转到信息流净化**：时间线上的「设置」链接走 `openCleanerSettings()`，会先 `navigateTo('/settings', { highlightCleaner: true })` 再发 `xhunt:focus-cleaner-settings`；设置页收到任一个就打开信息流净化二级页，并把聚焦请求传给组件（高亮 + 引导气泡）。
- **保留的测试标记**：`settings-page`、`settings-item-{key}`、`settings-toggle-{key}`（现在是开关本身）、`settings-group-{key}`、`settings-group-header-{key}`、`settings-ui-skin`、`settings-language-en/zh`、`settings-avatar-rank-mode-web3/ai`、`settings-avatar-skin-{id}`、`settings-domain-toggle-web3/ai`、`settings-domain-primary-web3/ai`、`settings-floating-mode-default/persistent`、`settings-panel-width-range`（滑块把手）。新增 `settings-search`、`settings-evm-address-input`、`panel-section-back-button`。
- **行为保持**：关闭头像排名或代币分析后刷新页面；切换排名类型后刷新；只剩一个领域时排名类型跟着它走并刷新；关闭 AI 领域时若排名类型是 AI 则改回 Web3 并刷新；实时订阅下三个子项至少留一个，且只在实时订阅打开时出现；打开设置页时用 `updateUserInfo` 同步一次用户信息；清空缓存保留领域选择。
- **小改动**：音效、宽度等原来写死蓝色/翠绿的选中态换成风格色；EVM 说明从悬停提示改成常显文字；「去屏蔽」的风险说明从悬停提示改成列表上方的常显文字；关注不到的行为（子项用复选框样式）统一成缩进的开关。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/ui/primitives/useKeyGuard.ts` | 输入框挡住 X 的快捷键（从 `SearchField` 提出来共用） |
| `src/ui/primitives/TextField.tsx` | 普通文本框（屏蔽词、白名单、EVM 地址） |
| `src/ui/settings/SettingsContext.tsx` | 往下传 `settingStates` 和实时订阅状态 |
| `src/ui/settings/reloadPage.ts` | 延迟刷新页面（便于测试替换） |
| `src/ui/settings/groupSettings.ts` | 分组和过滤规则（纯函数） |
| `src/ui/settings/SettingRow.tsx` | `SettingRow`、`SwitchSetting`、`DrillRow`、`SettingsGroup` |
| `src/ui/settings/GeneralSettings.tsx` | 界面风格、语言、提示音效、通用开关 |
| `src/ui/settings/AvatarRankSettings.tsx` | 头像排名开关、排名类型、徽章皮肤 |
| `src/ui/settings/DomainSettings.tsx` | 感兴趣领域 |
| `src/ui/settings/FloatingPanelSettings.tsx` | 悬浮面板模式和宽度 |
| `src/ui/settings/EvmAddressSettings.tsx` | EVM 地址绑定 |
| `src/compontents/cleaner/FeedCleanerSettingsSection.tsx` | 信息流净化（改写渲染） |
| `src/compontents/pages/SettingsPage.tsx` | 容器（重写） |
| `src/ui/shells/PanelPageHeader.tsx` | 新增 `onBack` |
| `src/compontents/UserAuthPanel.tsx` | 导出 `SocialLinks` 给设置页底部复用 |
| `src/test/settingsHarness.tsx` | 测试用的 `SettingsProvider` 包装 |
| `tests/e2e/setup/xhuntUi.ts`、`tests/e2e/panel/settings.spec.ts` | 端到端辅助函数跟着新语义改 |

代码块的信息串里写了目标路径（`file=…`），执行时直接按路径落盘。

---

### Task 1: 文本框和快捷键守卫

**Files:** Create `src/ui/primitives/useKeyGuard.ts`、`src/ui/primitives/TextField.tsx`、`src/ui/primitives/TextField.test.tsx`；Modify `src/ui/primitives/SearchField.tsx`、`src/ui/primitives/index.ts`、`src/css/primitives.css`

- [ ] **Step 1: 写失败的测试**

```tsx file=src/ui/primitives/TextField.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { TextField } from './TextField';

function Keyword({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <TextField
      aria-label='Keyword'
      placeholder='Add a keyword'
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      invalid={value === 'bad'}
    />
  );
}

describe('TextField', () => {
  test('is a named textbox that submits on Enter and keeps keys away from the page', async () => {
    const onSubmit = vi.fn();
    const pageKeys = vi.fn();
    document.addEventListener('keydown', pageKeys, true);
    render(<Keyword onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'Keyword' });
    await userEvent.type(box, 'j{Enter}');
    expect((box as HTMLInputElement).value).toBe('j');
    expect(onSubmit).toHaveBeenCalledWith('j');
    expect(pageKeys).not.toHaveBeenCalled();
    document.removeEventListener('keydown', pageKeys, true);
  });

  test('marks an invalid value', async () => {
    render(<Keyword onSubmit={() => {}} />);
    const box = screen.getByRole('textbox', { name: 'Keyword' });
    await userEvent.type(box, 'bad');
    expect(box.getAttribute('aria-invalid')).toBe('true');
  });
});
```

- [ ] **Step 2: 确认失败**：`pnpm vitest run src/ui/primitives/TextField.test.tsx`，找不到 `./TextField`。

- [ ] **Step 3: 实现**

```ts file=src/ui/primitives/useKeyGuard.ts
import { useEffect, useRef, type RefObject } from 'react';

// X 的快捷键挂在 document 捕获阶段，window 捕获阶段更早，在这里挡住才来得及；
// 挡住之后 React 的 onKeyDown 也收不到，回车只能在这里处理
export function useKeyGuard(
  inputRef: RefObject<HTMLInputElement | null>,
  onEnter?: (value: string) => void,
) {
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    const guard = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (!input || event.isComposing || !event.composedPath().includes(input)) return;
      event.stopImmediatePropagation();
      if (event.type === 'keydown' && event.key === 'Enter' && onEnterRef.current) {
        event.preventDefault();
        onEnterRef.current(input.value);
      }
    };
    const types = ['keydown', 'keypress', 'keyup'] as const;
    types.forEach((type) => window.addEventListener(type, guard, true));
    return () => types.forEach((type) => window.removeEventListener(type, guard, true));
  }, [inputRef]);
}
```

```tsx file=src/ui/primitives/TextField.tsx
import { Input } from '@ui-sdk/react/input';
import { useRef } from 'react';
import { cx } from './cx';
import { useKeyGuard } from './useKeyGuard';

export interface TextFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  'aria-label': string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  invalid?: boolean;
  className?: string;
  testId?: string;
}

export function TextField({
  value,
  onValueChange,
  placeholder,
  onSubmit,
  invalid = false,
  className,
  testId,
  ...rest
}: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useKeyGuard(inputRef, onSubmit);

  return (
    <label className={cx('xh-search', className)} data-invalid={invalid ? '' : undefined}>
      <Input
        ref={inputRef}
        value={value}
        onValueChange={(next) => onValueChange(next)}
        placeholder={placeholder}
        aria-label={rest['aria-label']}
        aria-invalid={invalid || undefined}
        className='xh-search-input'
        data-xhunt-testid={testId}
      />
    </label>
  );
}
```

`SearchField.tsx`：删掉组件里的 `useEffect` 守卫和 `onSubmitRef`，换成 `useKeyGuard(inputRef, onSubmit);`，导入改为 `import { useRef } from 'react';` 和 `import { useKeyGuard } from './useKeyGuard';`。

`index.ts` 加 `export { TextField } from './TextField';`。

`primitives.css` 在 `.xh-search-input` 规则后加：

```css
  .xh-search[data-invalid] {
    box-shadow: 0 0 0 1px var(--xh-down);
  }
```

- [ ] **Step 4: 确认通过**：`pnpm vitest run src/ui/primitives`，全部通过（含原 `SearchField` 测试）。

- [ ] **Step 5: Commit** `feat(ui): add a text field and share the X shortcut guard`

---

### Task 2: 文案

**Files:** Modify `src/locales/zh.json`、`src/locales/en.json`（末尾追加）

zh：

```json
  "settingsGroupGeneral": "通用",
  "settingsGroupMore": "更多",
  "settingsSearchLabel": "搜索设置",
  "settingsSearchPlaceholder": "搜索设置，例如「头像排名」",
  "settingsNoResults": "没有匹配的设置",
  "settingsItemCount": "{count} 项",
  "settingsOn": "已开启",
  "settingsOff": "已关闭",
  "settingsNotBound": "未绑定",
  "settingsDomainDisabled": "先在「感兴趣领域」里选上这个领域，下面的设置才会生效。",
  "settingsReloadOnOff": "关闭后会刷新页面",
  "settingsReloadOnChange": "切换后会刷新页面",
  "settingsRemoveItem": "移除 {item}",
  "settingsAddTo": "添加到{list}"
```

en：

```json
  "settingsGroupGeneral": "General",
  "settingsGroupMore": "More",
  "settingsSearchLabel": "Search settings",
  "settingsSearchPlaceholder": "Search settings, e.g. avatar rank",
  "settingsNoResults": "No matching settings",
  "settingsItemCount": "{count} items",
  "settingsOn": "On",
  "settingsOff": "Off",
  "settingsNotBound": "Not bound",
  "settingsDomainDisabled": "Turn this domain on in Interests first for these settings to apply.",
  "settingsReloadOnOff": "Turning it off reloads the page",
  "settingsReloadOnChange": "Changing it reloads the page",
  "settingsRemoveItem": "Remove {item}",
  "settingsAddTo": "Add to {list}"
```

- [ ] 校验 JSON 后 Commit `feat(settings): add settings page strings`

---

### Task 3: 上下文、分组规则和行组件

**Files:** Create `src/ui/settings/SettingsContext.tsx`、`reloadPage.ts`、`groupSettings.ts`、`SettingRow.tsx`、`src/test/settingsHarness.tsx`；Test `groupSettings.test.ts`、`SettingRow.test.tsx`

- [ ] **Step 1: 写失败的测试**

```ts file=src/ui/settings/groupSettings.test.ts
import { describe, expect, test } from 'vitest';
import { groupSettings } from './groupSettings';

const LISTS = {
  nameRight: [
    { key: 'showInvestors', label: 'showInvestors' },
    { key: 'show90dMention', label: 'show90dMention' },
  ],
  followedRight: [
    { key: 'showReviews', label: 'showReviews' },
    { key: 'showFqRank', label: 'showFqRank' },
    { key: 'showFqRankAi', label: 'showFqRankAi' },
  ],
};

const keys = (items: Array<{ key: string }>) => items.map((item) => item.key);

describe('groupSettings', () => {
  test('moves domain-only items out of the profile page group', () => {
    const groups = groupSettings(LISTS, null);
    expect(keys(groups.profilePage)).toEqual(['showInvestors', 'showReviews', 'showSearchPanel', 'showNotes', 'showOfficialTags']);
    expect(keys(groups.web3OnlySettings)).toContain('show90dMention');
    expect(keys(groups.aiOnlySettings)).toContain('showFqRankAi');
    expect(keys(groups.others)).toEqual(['showSidebarIcon', 'showTokenAnalysis', 'showTweetAIAnalysis', 'showAiDetectButton']);
    expect(keys(groups.avatarSettings)).toEqual(['showAvatarRank']);
    expect(groups.homeRightSidebar).toEqual([]);
  });

  test('shows gated items to testers only', () => {
    const config = { testConfig: { features: ['showNotes', 'showHotVote'], testers: ['mira'] } };
    expect(keys(groupSettings(LISTS, config).profilePage)).not.toContain('showNotes');
    expect(keys(groupSettings(LISTS, config, 'mira').profilePage)).toContain('showNotes');
    expect(keys(groupSettings(LISTS, config, 'someone').web3OnlySettings)).not.toContain('showHotVote');
  });
});
```

```tsx file=src/ui/settings/SettingRow.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { SettingsHarness } from '../../test/settingsHarness';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { reloadPage } from './reloadPage';
import { DrillRow, SettingsGroup, SwitchSetting } from './SettingRow';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-disabled');

describe('settings rows', () => {
  test('a switch row is named by its label, keeps the test ids and reloads when token analysis turns off', async () => {
    render(
      <SettingsHarness initial={{ showTokenAnalysis: true }}>
        <SwitchSetting setting={{ key: 'showTokenAnalysis', label: 'showTokenAnalysis' }} />
      </SettingsHarness>,
    );
    const toggle = screen.getByRole('switch', { name: 'showTokenAnalysis' });
    expect(toggle).toBe(screen.getByTestId('settings-toggle-showTokenAnalysis'));
    expect(screen.getByTestId('settings-item-showTokenAnalysis').textContent).toContain('settingsReloadOnOff');
    await userEvent.click(screen.getByText('showTokenAnalysis'));
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  test('keeps one realtime feed on and hides the feeds while realtime is off', async () => {
    render(
      <SettingsHarness
        realtimeMode='SSE'
        initial={{ showRealtimeSubscription: true, enableBnbFeeds: true, enableGossip: false, enableListing: false }}
      >
        <SwitchSetting setting={{ key: 'showRealtimeSubscription', label: 'showRealtimeSubscription' }} />
        <SwitchSetting setting={{ key: 'enableBnbFeeds', label: 'enableBnbFeeds' }} />
        <SwitchSetting setting={{ key: 'enableGossip', label: 'enableGossip' }} />
        <SwitchSetting setting={{ key: 'enableListing', label: 'enableListing' }} />
      </SettingsHarness>,
    );
    expect(screen.getByText('SSE')).toBeTruthy();
    expect(isDisabled(screen.getByRole('switch', { name: 'enableBnbFeeds' }))).toBe(true);
    await userEvent.click(screen.getByRole('switch', { name: 'enableGossip' }));
    expect(isDisabled(screen.getByRole('switch', { name: 'enableBnbFeeds' }))).toBe(false);
    await userEvent.click(screen.getByRole('switch', { name: /showRealtimeSubscription/ }));
    expect(screen.queryByRole('switch', { name: 'enableGossip' })).toBeNull();
  });

  test('groups fold in soft and stay flat elsewhere; drill rows open sections', async () => {
    setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
    const { unmount } = render(
      <SettingsGroup id='others' title='General'>
        <p>row</p>
      </SettingsGroup>,
    );
    const header = screen.getByTestId('settings-group-header-others');
    expect(header.getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    unmount();

    setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
    const onOpen = vi.fn();
    render(
      <SettingsGroup id='more' title='More' collapsible={false}>
        <DrillRow testId='settings-group-header-floatingPanel' label='Floating panel' summary='Default · 340px' onOpen={onOpen} />
      </SettingsGroup>,
    );
    expect(screen.getByRole('heading', { name: 'More' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Floating panel/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-group-header-floatingPanel').textContent).toContain('340px');
  });
});
```

- [ ] **Step 2: 确认失败**：`pnpm vitest run src/ui/settings`，模块不存在。

- [ ] **Step 3: 实现**

```tsx file=src/ui/settings/SettingsContext.tsx
import { createContext, useContext, type ReactNode } from 'react';

export interface SettingState {
  get: boolean;
  set: (value: boolean) => void;
}

export type RealtimeMode = 'SSE' | 'Polling' | 'Inactive';

interface SettingsContextValue {
  settingStates: Record<string, SettingState>;
  realtimeMode: RealtimeMode;
}

const SettingsContext = createContext<SettingsContextValue>({ settingStates: {}, realtimeMode: 'Inactive' });

export function SettingsProvider({ value, children }: { value: SettingsContextValue; children: ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}
```

```ts file=src/ui/settings/reloadPage.ts
export function reloadPage(delay = 200) {
  setTimeout(() => {
    try {
      window.location.reload();
    } catch {}
  }, delay);
}
```

```ts file=src/ui/settings/groupSettings.ts
export interface SettingItem {
  key: string;
  label: string;
}

export interface SettingGroups {
  others: SettingItem[];
  avatarSettings: SettingItem[];
  profilePage: SettingItem[];
  homeRightSidebar: SettingItem[];
  web3OnlySettings: SettingItem[];
  aiOnlySettings: SettingItem[];
}

interface SettingsConfigLists {
  nameRight: SettingItem[];
  followedRight: SettingItem[];
}

interface TestConfig {
  testConfig?: { features?: string[]; testers?: string[] };
}

const WEB3_ONLY = new Set([
  'show90dMention',
  'show90dPerformance',
  'showFqRank',
  'showCnRank',
  'showEnInfluenceRank',
  'showProjectRank',
]);
const AI_ONLY = new Set(['showFqRankAi', 'showCnRankAi', 'showEnInfluenceRankAi', 'showProjectRankAi']);

const item = (key: string, label = key): SettingItem => ({ key, label });

export function groupSettings(
  lists: SettingsConfigLists,
  config: TestConfig | null | undefined,
  username?: string,
): SettingGroups {
  const features = config?.testConfig?.features ?? [];
  const testers = config?.testConfig?.testers ?? [];
  const isTester = username ? testers.includes(username) : false;
  const gated = new Set(features);
  const visible = (items: SettingItem[]) => items.filter((entry) => !gated.has(entry.key) || isTester);

  return {
    others: visible([
      item('showSidebarIcon'),
      item('showTokenAnalysis'),
      item('showTweetAIAnalysis'),
      item('showAiDetectButton'),
    ]),
    avatarSettings: [item('showAvatarRank')],
    profilePage: visible([
      ...lists.nameRight.filter((entry) => !WEB3_ONLY.has(entry.key)),
      ...lists.followedRight.filter((entry) => !WEB3_ONLY.has(entry.key) && !AI_ONLY.has(entry.key)),
      item('showSearchPanel', 'showProfileChanges'),
      item('showNotes'),
      item('showOfficialTags'),
    ]),
    homeRightSidebar: [],
    web3OnlySettings: visible([
      item('showHotVote'),
      item('showFeatureSlot'),
      item('showHunterCampaign'),
      item('showRealtimeSubscription'),
      item('enableBnbFeeds'),
      item('enableGossip'),
      item('enableListing'),
      item('showHotTrendingWeb3'),
      item('show90dMention'),
      item('show90dPerformance'),
      item('showWeb3KolFollowers'),
      item('showTop100KolsWeb3'),
      item('showCnKolsWeb3'),
      item('showFqRank'),
      item('showCnRank'),
      item('showEnInfluenceRank'),
      item('showProjectRank'),
    ]),
    aiOnlySettings: visible([
      item('showHotVote'),
      item('showHunterCampaign'),
      item('showHotTrendingAi'),
      item('showAiKolFollowers'),
      item('showTop100KolsAi'),
      item('showCnKolsAi'),
      item('showFqRankAi'),
      item('showCnRankAi'),
      item('showEnInfluenceRankAi'),
      item('showProjectRankAi'),
    ]),
  };
}
```

```tsx file=src/ui/settings/SettingRow.tsx
import { Field, FieldDescription, FieldLabel } from '@ui-sdk/react/field';
import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { ChevronRightIcon } from '../icons';
import { Badge, CollapsibleSection, RowButton, Switch } from '../primitives';
import { cx } from '../primitives/cx';
import { useUiSkin } from '../skin/useUiSkin';
import type { SettingItem } from './groupSettings';
import { reloadPage } from './reloadPage';
import { useSettingsContext, type RealtimeMode, type SettingState } from './SettingsContext';

export const ROW_PAD = 'soft:px-3 soft:py-2.5 obsidian:px-2 obsidian:py-2 native:px-4 native:py-3';
const LABEL = 'block text-[12.5px] leading-snug native:text-[15px]';
const DESCRIPTION = 'mt-0.5 block text-[11px] leading-snug text-xh-fg-2 native:text-[13px]';

const FEEDS = ['enableBnbFeeds', 'enableGossip', 'enableListing'];
const RELOAD_WHEN_OFF = new Set(['showAvatarRank', 'showTokenAnalysis']);
const REALTIME_TONE: Record<RealtimeMode, 'up' | 'accent' | 'neutral'> = {
  SSE: 'up',
  Polling: 'accent',
  Inactive: 'neutral',
};

interface SettingRowProps {
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  testId?: string;
  disabled?: boolean;
  indent?: boolean;
  labelled?: boolean;
}

export function SettingRow({
  label,
  description,
  control,
  testId,
  disabled = false,
  indent = false,
  labelled = false,
}: SettingRowProps) {
  const className = cx(
    'flex items-center justify-between gap-3',
    ROW_PAD,
    indent && 'soft:pl-6 obsidian:pl-5 native:pl-8',
    disabled && 'opacity-50',
  );
  if (labelled) {
    return (
      <Field className={className} data-xhunt-testid={testId}>
        <div className='min-w-0 flex-1'>
          <FieldLabel className={cx(LABEL, !disabled && 'cursor-pointer')}>{label}</FieldLabel>
          {description ? <FieldDescription className={DESCRIPTION}>{description}</FieldDescription> : null}
        </div>
        {control}
      </Field>
    );
  }
  return (
    <div className={className} data-xhunt-testid={testId}>
      <div className='min-w-0 flex-1'>
        <span className={LABEL}>{label}</span>
        {description ? <span className={DESCRIPTION}>{description}</span> : null}
      </div>
      <div className='flex shrink-0 items-center gap-1.5'>{control}</div>
    </div>
  );
}

function isLastFeed(key: string, states: Record<string, SettingState>) {
  const bnb = states.enableBnbFeeds?.get;
  const gossip = states.enableGossip?.get;
  const listing = states.enableListing?.get;
  if (key === 'enableBnbFeeds') return Boolean(bnb && !gossip);
  if (key === 'enableGossip') return Boolean(gossip && !bnb);
  if (key === 'enableListing') return Boolean(listing && !bnb && !gossip);
  return false;
}

export function SwitchSetting({
  setting,
  disabled = false,
  description,
}: {
  setting: SettingItem;
  disabled?: boolean;
  description?: ReactNode;
}) {
  const { t } = useI18n();
  const { settingStates, realtimeMode } = useSettingsContext();
  const state = settingStates[setting.key];
  if (!state) return null;
  const feed = FEEDS.includes(setting.key);
  if (feed && !settingStates.showRealtimeSubscription?.get) return null;

  const change = (checked: boolean) => {
    if (feed && !checked && FEEDS.filter((key) => key !== setting.key).every((key) => !settingStates[key]?.get)) return;
    state.set(checked);
    if (RELOAD_WHEN_OFF.has(setting.key) && !checked) reloadPage();
  };

  return (
    <SettingRow
      labelled
      indent={feed}
      disabled={disabled}
      testId={`settings-item-${setting.key}`}
      label={
        <span className='inline-flex items-center gap-1.5'>
          {t(setting.label)}
          {setting.key === 'showRealtimeSubscription' && state.get ? (
            <Badge tone={REALTIME_TONE[realtimeMode]}>{realtimeMode}</Badge>
          ) : null}
        </span>
      }
      description={description ?? (RELOAD_WHEN_OFF.has(setting.key) ? t('settingsReloadOnOff') : undefined)}
      control={
        <Switch
          checked={state.get}
          disabled={disabled || (feed && isLastFeed(setting.key, settingStates))}
          onCheckedChange={change}
          data-xhunt-testid={`settings-toggle-${setting.key}`}
        />
      }
    />
  );
}

export function DrillRow({
  label,
  summary,
  onOpen,
  testId,
}: {
  label: string;
  summary?: ReactNode;
  onOpen: () => void;
  testId?: string;
}) {
  return (
    <RowButton
      onClick={onOpen}
      data-xhunt-testid={testId}
      className={cx('gap-3 soft:rounded-xl obsidian:rounded-[9px]', ROW_PAD)}
    >
      <span className='flex min-w-0 flex-1 items-center justify-between gap-3 native:flex-col native:items-start native:gap-0.5'>
        <span className='truncate text-[12.5px] native:text-[15px]'>{label}</span>
        {summary ? (
          <span className='min-w-0 truncate text-[11.5px] text-xh-fg-2 obsidian:font-xh-mono obsidian:text-[11px] native:text-[13px]'>
            {summary}
          </span>
        ) : null}
      </span>
      <ChevronRightIcon size={14} className='shrink-0 text-xh-fg-2' />
    </RowButton>
  );
}

export function SettingsGroup({
  id,
  title,
  children,
  collapsible = true,
}: {
  id: string;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const { skin } = useUiSkin();
  const [open, setOpen] = useState(true);
  const body = (
    <div data-settings-body='' className='flex flex-col soft:divide-y soft:divide-xh-line'>
      {children}
    </div>
  );

  if (skin === 'soft' && collapsible) {
    return (
      <CollapsibleSection
        title={title}
        open={open}
        onOpenChange={setOpen}
        testId={`settings-group-${id}`}
        triggerTestId={`settings-group-header-${id}`}
        className='xh-rise rounded-xh-card bg-xh-raised shadow-xh-card [&>.xh-collapsible-trigger]:px-3 [&>.xh-collapsible-trigger]:pb-1.5 [&>.xh-collapsible-trigger]:pt-3'
      >
        {body}
      </CollapsibleSection>
    );
  }

  if (skin === 'soft') {
    return (
      <section data-xhunt-testid={`settings-group-${id}`} className='xh-rise rounded-xh-card bg-xh-raised p-1.5 shadow-xh-card'>
        <h3 className='sr-only' data-xhunt-testid={`settings-group-header-${id}`}>
          {title}
        </h3>
        {body}
      </section>
    );
  }

  return (
    <section data-xhunt-testid={`settings-group-${id}`} className='xh-rise'>
      <h3
        data-xhunt-testid={`settings-group-header-${id}`}
        className='obsidian:px-2 obsidian:pb-1 obsidian:pt-3 obsidian:text-[11px] obsidian:font-medium obsidian:uppercase obsidian:tracking-[0.06em] obsidian:text-xh-fg-2 native:px-4 native:pb-1 native:pt-4 native:text-[20px] native:font-extrabold native:leading-6'
      >
        {title}
      </h3>
      {body}
    </section>
  );
}
```

```tsx file=src/test/settingsHarness.tsx
import { useState, type ReactNode } from 'react';
import { SettingsProvider, type RealtimeMode } from '~/ui/settings/SettingsContext';

export function SettingsHarness({
  initial,
  realtimeMode = 'Inactive',
  children,
}: {
  initial: Record<string, boolean>;
  realtimeMode?: RealtimeMode;
  children: ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const settingStates = Object.fromEntries(
    Object.entries(values).map(([key, get]) => [
      key,
      { get, set: (value: boolean) => setValues((previous) => ({ ...previous, [key]: value })) },
    ]),
  );
  return <SettingsProvider value={{ settingStates, realtimeMode }}>{children}</SettingsProvider>;
}
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): add setting rows, groups and grouping rules`

---

### Task 4: 通用（界面风格、语言、提示音效）

**Files:** Create `src/ui/settings/GeneralSettings.tsx`；Test `GeneralSettings.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx file=src/ui/settings/GeneralSettings.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { SettingsHarness } from '../../test/settingsHarness';
import { GeneralSettings, SOUND_FILES, SoundSetting } from './GeneralSettings';

const setLang = vi.hoisted(() => vi.fn());
vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang }),
}));
vi.mock('~compontents/pages/constants.tsx', () => ({
  defaultSound: { url: 'https://cdn.example/15011.mp3', data: 'data:default' },
}));

describe('GeneralSettings', () => {
  test('offers the skin picker, switches language with the old test ids and lists the switches', async () => {
    render(
      <SettingsHarness initial={{ showSidebarIcon: true }}>
        <GeneralSettings items={[{ key: 'showSidebarIcon', label: 'showSidebarIcon' }]} />
      </SettingsHarness>,
    );
    expect(screen.getByRole('radiogroup', { name: 'uiSkinLabel' })).toBeTruthy();
    expect(screen.getByTestId('settings-ui-skin')).toBeTruthy();
    await userEvent.click(screen.getByTestId('settings-language-en'));
    expect(setLang).toHaveBeenCalledWith('en');
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
  });

  test('stores the default sound, then fetches, caches and previews another one', async () => {
    const played: string[] = [];
    const onPlay = (event: Event) => played.push((event as CustomEvent<{ url: string }>).detail.url);
    window.addEventListener('xhunt:play-sound', onPlay);
    vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob(['ab'], { type: 'audio/mpeg' }) })));
    render(
      <SettingsHarness initial={{}}>
        <SoundSetting />
      </SettingsHarness>,
    );
    await waitFor(() =>
      expect(getMemoryValue('@xhunt/sound')).toEqual({ url: 'https://cdn.example/15011.mp3', data: 'data:default' }),
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'soundEffect' }));
    await userEvent.click(await screen.findByRole('option', { name: 'sound1' }));
    await waitFor(() => expect((getMemoryValue('@xhunt/sound') as { url: string }).url).toBe(SOUND_FILES[0]));
    expect((getMemoryValue('@xhunt/sound') as { data: string }).data).toMatch(/^data:audio\/mpeg;base64,/);
    await waitFor(() => expect(played).toHaveLength(1), { timeout: 1500 });
    window.removeEventListener('xhunt:play-sound', onPlay);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现**

```tsx file=src/ui/settings/GeneralSettings.tsx
import { useDebounceFn } from 'ahooks';
import { useEffect, useMemo, useState } from 'react';
import { defaultSound } from '~compontents/pages/constants.tsx';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { PlayIcon } from '../icons';
import { IconButton, SegmentedControl, Select } from '../primitives';
import { cx } from '../primitives/cx';
import { SkinPicker } from '../skin/SkinPicker';
import type { SettingItem } from './groupSettings';
import { ROW_PAD, SettingRow, SwitchSetting } from './SettingRow';

export const SOUND_FILES = [
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1009.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1478.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1561.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1873.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y2181.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y899.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/14428.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/15011.mp3',
];

interface StoredSound {
  url: string;
  data: string;
}

async function fetchAndCacheSound(url: string) {
  try {
    if (!url) return '';
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function playSound(url: string) {
  try {
    window.dispatchEvent(new CustomEvent('xhunt:play-sound', { detail: { url } }));
  } catch {}
}

export function SkinSetting() {
  const { t } = useI18n();
  return (
    <div data-xhunt-testid='settings-ui-skin' className={cx('flex flex-col gap-2', ROW_PAD)}>
      <span className='text-[12.5px] native:text-[15px]'>{t('uiSkinLabel')}</span>
      <SkinPicker />
    </div>
  );
}

export function LanguageSetting() {
  const { t, lang, setLang } = useI18n();
  return (
    <SettingRow
      label={t('language')}
      control={
        <SegmentedControl
          aria-label={t('language')}
          size='sm'
          value={lang === 'en' ? 'en' : 'zh'}
          onValueChange={(next) => setLang(next)}
          options={[
            { value: 'en', label: 'EN', testId: 'settings-language-en' },
            { value: 'zh', label: '中', testId: 'settings-language-zh' },
          ]}
        />
      }
    />
  );
}

export function SoundSetting() {
  const { t } = useI18n();
  const [sound, setSound, { isLoading }] = useLocalStorage<StoredSound>('@xhunt/sound', { url: '', data: '' });
  const [fetching, setFetching] = useState(false);
  const { run: playLater } = useDebounceFn(
    (url: string) => {
      if (url) playSound(url);
    },
    { wait: 300 },
  );
  const options = useMemo(
    () => SOUND_FILES.map((url, index) => ({ value: url, label: `${t('sound')}${index + 1}` })),
    [t],
  );

  useEffect(() => {
    if (!isLoading && (!sound || (!sound.data && sound.url !== '__MUTE__')) && defaultSound?.data) {
      setSound({ url: defaultSound.url, data: defaultSound.data });
    }
  }, [isLoading, sound?.data, setSound]);

  const busy = fetching || isLoading;
  const canPlay = Boolean(sound?.data) && sound?.url !== '__MUTE__' && !busy;

  return (
    <SettingRow
      label={t('soundEffect')}
      control={
        <>
          <Select
            aria-label={t('soundEffect')}
            placeholder={t('select')}
            value={sound?.url || null}
            disabled={busy}
            options={options}
            onValueChange={async (url) => {
              setFetching(true);
              try {
                const data = await fetchAndCacheSound(url);
                if (data) {
                  setSound({ url, data });
                  playLater(data);
                }
              } finally {
                setFetching(false);
              }
            }}
          />
          <IconButton
            label={t('playSelectedSound')}
            size='sm'
            disabled={!canPlay}
            onClick={() => {
              if (sound?.data) playLater(sound.data);
            }}
          >
            <PlayIcon size={14} />
          </IconButton>
        </>
      }
    />
  );
}

export function GeneralSettings({ items }: { items: SettingItem[] }) {
  return (
    <>
      <SkinSetting />
      <LanguageSetting />
      <SoundSetting />
      {items.map((item) => (
        <SwitchSetting key={item.key} setting={item} />
      ))}
    </>
  );
}
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): add general settings`

---

### Task 5: 头像排名

**Files:** Create `src/ui/settings/AvatarRankSettings.tsx`；Test `AvatarRankSettings.test.tsx`；`primitives.css` 加徽章色块

- [ ] **Step 1: 写失败的测试**

```tsx file=src/ui/settings/AvatarRankSettings.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { avatarSkins } from '~contents/constants/avatarSkins';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { SettingsHarness } from '../../test/settingsHarness';
import { AvatarRankSettings } from './AvatarRankSettings';
import { reloadPage } from './reloadPage';

const setSkinCustomized = vi.hoisted(() => vi.fn());
vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/hooks/useAvatarSkin', () => ({
  useAvatarSkinState: () => ({ skin: 'skin-1', setSkinCustomized }),
}));
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

const ITEMS = [{ key: 'showAvatarRank', label: 'showAvatarRank' }];
const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-disabled');

describe('AvatarRankSettings', () => {
  test('shows the rank type and badge skins only while ranks are on', async () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3', 'ai'], primaryDomain: 'web3' });
    render(
      <SettingsHarness initial={{ showAvatarRank: false }}>
        <AvatarRankSettings items={ITEMS} />
      </SettingsHarness>,
    );
    expect(screen.queryByRole('radiogroup', { name: 'avatarRankModeSelectorTitle' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'showAvatarRank' }));
    expect(reloadPage).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('settings-avatar-rank-mode-ai'));
    expect(getMemoryValue('@settings/avatarRankMode')).toBe('ai');
    expect(reloadPage).toHaveBeenCalledWith(100);

    const [id, skin] = Object.entries(avatarSkins)[1];
    await userEvent.click(screen.getByRole('radio', { name: skin.nameKey }));
    expect(setSkinCustomized).toHaveBeenCalledWith(id);
    expect(screen.getByTestId(`settings-avatar-skin-${id}`)).toBeTruthy();
  });

  test('locks the rank type to the only domain', () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
    render(
      <SettingsHarness initial={{ showAvatarRank: true }}>
        <AvatarRankSettings items={ITEMS} />
      </SettingsHarness>,
    );
    expect(isDisabled(screen.getByTestId('settings-avatar-rank-mode-web3'))).toBe(true);
    expect(screen.queryByTestId('settings-avatar-rank-mode-ai')).toBeNull();
  });
});
```

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现**

```tsx file=src/ui/settings/AvatarRankSettings.tsx
import { Radio, RadioGroup } from '@ui-sdk/react/radio';
import type { CSSProperties } from 'react';
import { avatarSkins } from '~contents/constants/avatarSkins';
import { useAvatarSkinState } from '~contents/hooks/useAvatarSkin';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { useLocalStorage } from '~storage/useLocalStorage';
import { SegmentedControl } from '../primitives';
import { cx } from '../primitives/cx';
import type { SettingItem } from './groupSettings';
import { reloadPage } from './reloadPage';
import { ROW_PAD, SettingRow, SwitchSetting } from './SettingRow';
import { useSettingsContext } from './SettingsContext';

export const AVATAR_RANK_MODE_KEY = '@settings/avatarRankMode';

type RankMode = 'web3' | 'ai';

export function AvatarRankSettings({ items }: { items: SettingItem[] }) {
  const { t } = useI18n();
  const { settingStates } = useSettingsContext();
  const { domains } = useUserDomain();
  const [mode, setMode] = useLocalStorage<RankMode>(AVATAR_RANK_MODE_KEY, 'web3');
  const { skin, setSkinCustomized } = useAvatarSkinState();
  const modes = (['web3', 'ai'] as const).filter((domain) => domains.includes(domain));

  return (
    <>
      {items.map((item) => (
        <SwitchSetting key={item.key} setting={item} />
      ))}
      {settingStates.showAvatarRank?.get ? (
        <>
          <SettingRow
            label={t('avatarRankModeSelectorTitle')}
            description={t('settingsReloadOnChange')}
            control={
              <SegmentedControl
                aria-label={t('avatarRankModeSelectorTitle')}
                size='sm'
                disabled={domains.length === 1}
                value={mode}
                onValueChange={(next) => {
                  if (next === mode) return;
                  setMode(next);
                  reloadPage(next === 'ai' ? 100 : 200);
                }}
                options={modes.map((domain) => ({
                  value: domain,
                  label: domain === 'web3' ? 'Web3' : 'AI',
                  testId: `settings-avatar-rank-mode-${domain}`,
                }))}
              />
            }
          />
          <BadgeSkinPicker value={skin} onValueChange={setSkinCustomized} />
        </>
      ) : null}
    </>
  );
}

function BadgeSkinPicker({ value, onValueChange }: { value: string; onValueChange: (id: string) => void }) {
  const { t } = useI18n();
  const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const current = avatarSkins[value];

  return (
    <div className={cx('flex flex-col gap-2.5', ROW_PAD)}>
      <span className='text-[12.5px] native:text-[15px]'>
        {t('avatarSkinSelectorTitle')}
        {current ? <span className='text-xh-fg-2'> · {t(current.nameKey)}</span> : null}
      </span>
      <RadioGroup
        value={value}
        onValueChange={(next) => {
          if (typeof next === 'string') onValueChange(next);
        }}
        aria-label={t('avatarSkinSelectorTitle')}
        className='flex flex-wrap gap-2'
      >
        {Object.entries(avatarSkins).map(([id, config]) => (
          <Radio
            key={id}
            value={id}
            title={t(config.nameKey)}
            data-xhunt-testid={`settings-avatar-skin-${id}`}
            className='xh-swatch'
            style={{ '--xh-sw': (theme === 'light' ? config.light : config.dark).background } as CSSProperties}
          >
            <span className='sr-only'>{t(config.nameKey)}</span>
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
```

`primitives.css`（`.xh-tag` 规则组之后）：

```css
  .xh-swatch {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 7px;
    background: var(--xh-sw);
    box-shadow: inset 0 0 0 1px var(--xh-line-2);
    cursor: pointer;
    transition: transform var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-swatch:hover {
    transform: scale(1.08);
  }
  .xh-swatch[data-checked],
  .xh-swatch:focus-visible {
    outline: 2px solid var(--xh-accent-fg);
    outline-offset: 2px;
  }
  [data-skin='native'] .xh-swatch {
    border-radius: 9999px;
  }
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): add avatar rank settings with badge skin radios`

---

### Task 6: 感兴趣领域

**Files:** Create `src/ui/settings/DomainSettings.tsx`；Test `DomainSettings.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx file=src/ui/settings/DomainSettings.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { DomainSettings } from './DomainSettings';
import { reloadPage } from './reloadPage';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('./reloadPage', () => ({ reloadPage: vi.fn() }));

const preference = () => getMemoryValue('@xhunt/user-domain-preference') as { domains: string[]; primaryDomain: string };
const isDisabled = (element: HTMLElement) =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('data-disabled');

describe('DomainSettings', () => {
  test('sets the priority, keeps one domain and moves AI ranks back to Web3', async () => {
    setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3', 'ai'], primaryDomain: 'web3' });
    setMemoryValue('@settings/avatarRankMode', 'ai');
    render(<DomainSettings />);
    await userEvent.click(screen.getByTestId('settings-domain-primary-ai'));
    expect(preference().primaryDomain).toBe('ai');

    await userEvent.click(screen.getByTestId('settings-domain-toggle-ai'));
    expect(preference().domains).toEqual(['web3']);
    expect(getMemoryValue('@settings/avatarRankMode')).toBe('web3');
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(isDisabled(screen.getByTestId('settings-domain-toggle-web3'))).toBe(true);
    expect(screen.queryByRole('radiogroup', { name: 'domainPriorityTitle' })).toBeNull();
  });
});
```

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现**

```tsx file=src/ui/settings/DomainSettings.tsx
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain, type DomainType } from '~contents/hooks/useUserDomain';
import { useLocalStorage } from '~storage/useLocalStorage';
import { SegmentedControl, Switch } from '../primitives';
import { AVATAR_RANK_MODE_KEY } from './AvatarRankSettings';
import { reloadPage } from './reloadPage';
import { SettingRow } from './SettingRow';

export function DomainSettings() {
  const { t, lang } = useI18n();
  const { domains, primaryDomain, addDomain, removeDomain, setPrimaryDomain } = useUserDomain();
  const [rankMode, setRankMode] = useLocalStorage<DomainType>(AVATAR_RANK_MODE_KEY, 'web3');

  const toggle = (domain: DomainType) => {
    if (!domains.includes(domain)) {
      addDomain(domain);
      return;
    }
    if (domains.length <= 1) return;
    removeDomain(domain);
    if (domain === 'ai' && rankMode === 'ai') {
      setRankMode('web3');
      reloadPage();
    }
  };

  const label = (domain: DomainType) =>
    domain === 'web3'
      ? lang === 'zh'
        ? t('domainWeb3Desc') || '区块链'
        : t('domainWeb3') || 'Web3'
      : lang === 'zh'
        ? t('domainAiDesc') || '人工智能'
        : t('domainAi') || 'AI';

  return (
    <>
      {(['web3', 'ai'] as const).map((domain) => (
        <SettingRow
          key={domain}
          labelled
          testId={`settings-item-domain-${domain}`}
          label={label(domain)}
          control={
            <Switch
              checked={domains.includes(domain)}
              disabled={domains.length === 1 && domains.includes(domain)}
              onCheckedChange={() => toggle(domain)}
              data-xhunt-testid={`settings-domain-toggle-${domain}`}
            />
          }
        />
      ))}
      {domains.includes('web3') && domains.includes('ai') ? (
        <SettingRow
          label={t('domainPriorityTitle') || '首选'}
          control={
            <SegmentedControl
              aria-label={t('domainPriorityTitle') || '首选'}
              size='sm'
              value={primaryDomain}
              onValueChange={setPrimaryDomain}
              options={[
                { value: 'web3', label: 'Web3', testId: 'settings-domain-primary-web3' },
                { value: 'ai', label: 'AI', testId: 'settings-domain-primary-ai' },
              ]}
            />
          }
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): add domain settings`

---

### Task 7: 悬浮面板

**Files:** Create `src/ui/settings/FloatingPanelSettings.tsx`；Test `FloatingPanelSettings.test.tsx`；`primitives.css` 加滑块

- [ ] **Step 1: 写失败的测试**

```tsx file=src/ui/settings/FloatingPanelSettings.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { getMemoryValue } from '../../test/memoryStorage';
import { FloatingPanelSettings, clampWidth } from './FloatingPanelSettings';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

describe('FloatingPanelSettings', () => {
  test('switches the mode and saves the width once the slider is released', async () => {
    const resets: unknown[] = [];
    const onReset = (event: Event) => resets.push((event as CustomEvent).detail);
    window.addEventListener('xhunt:reset-panel-position', onReset);
    render(<FloatingPanelSettings />);
    await userEvent.click(screen.getByTestId('settings-floating-mode-persistent'));
    expect(getMemoryValue('@xhunt/floatingPanelMode')).toBe('persistent');

    screen.getByRole('slider', { name: 'panelWidth' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(getMemoryValue('@xhunt/panelWidth')).toBe(350));
    expect(screen.getByText('350px')).toBeTruthy();
    await waitFor(() => expect(resets).toEqual([{ storageKey: 'fixed-twitter-panel', rightOffset: 30, y: 50 }]));
    window.removeEventListener('xhunt:reset-panel-position', onReset);
  });

  test('clamps widths to 300–400 in steps of 10', () => {
    expect([clampWidth(250), clampWidth(347), clampWidth('x'), clampWidth(999)]).toEqual([300, 350, 340, 400]);
  });
});
```

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现**

```tsx file=src/ui/settings/FloatingPanelSettings.tsx
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '@ui-sdk/react/slider';
import { useDebounceFn } from 'ahooks';
import { useEffect, useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { SegmentedControl } from '../primitives';
import { cx } from '../primitives/cx';
import { ROW_PAD, SettingRow } from './SettingRow';

export function clampWidth(value: unknown) {
  return Math.min(400, Math.max(300, Math.round((Number(value) || 340) / 10) * 10));
}

export function FloatingPanelSettings() {
  const { t } = useI18n();
  const [mode, setMode] = useLocalStorage<'default' | 'persistent'>('@xhunt/floatingPanelMode', 'default');
  const [width, setWidth] = useLocalStorage<number>('@xhunt/panelWidth', 340);
  const [draft, setDraft] = useState(() => clampWidth(width));
  useEffect(() => setDraft(clampWidth(width)), [width]);

  const { run: resetPosition } = useDebounceFn(
    () => {
      try {
        window.dispatchEvent(
          new CustomEvent('xhunt:reset-panel-position', {
            detail: { storageKey: 'fixed-twitter-panel', rightOffset: 30, y: 50 },
          }),
        );
      } catch {}
    },
    { wait: 200 },
  );

  return (
    <>
      <SettingRow
        label={t('floatingPanelMode')}
        control={
          <SegmentedControl
            aria-label={t('floatingPanelMode')}
            size='sm'
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'default', label: t('floatingPanelModeDefault'), testId: 'settings-floating-mode-default' },
              { value: 'persistent', label: t('floatingPanelModePersistent'), testId: 'settings-floating-mode-persistent' },
            ]}
          />
        }
      />
      <div className={cx('flex flex-col gap-2', ROW_PAD)}>
        <div className='flex items-center justify-between gap-3 text-[12.5px] native:text-[15px]'>
          <span>{t('panelWidth')}</span>
          <span className='font-xh-num tabular-nums text-xh-fg-2'>{draft}px</span>
        </div>
        <Slider
          value={draft}
          min={300}
          max={400}
          step={10}
          onValueChange={(next) => setDraft(clampWidth(next))}
          onValueCommit={async (next) => {
            await setWidth(clampWidth(next));
            resetPosition();
          }}
          className='xh-slider'
        >
          <SliderControl className='xh-slider-control'>
            <SliderTrack className='xh-slider-track'>
              <SliderIndicator className='xh-slider-indicator' />
              <SliderThumb
                aria-label={t('panelWidth')}
                className='xh-slider-thumb'
                data-xhunt-testid='settings-panel-width-range'
              />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </div>
    </>
  );
}
```

`primitives.css`：

```css
  .xh-slider {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .xh-slider-control {
    display: flex;
    align-items: center;
    width: 100%;
    height: 20px;
    touch-action: none;
    cursor: pointer;
  }
  .xh-slider-track {
    width: 100%;
    height: 4px;
    border-radius: 9999px;
    background: var(--xh-sunken);
  }
  [data-skin='obsidian'] .xh-slider-track {
    background: color-mix(in oklab, var(--xh-fg) 12%, transparent);
  }
  .xh-slider-indicator {
    border-radius: inherit;
    background: var(--xh-accent-fg);
  }
  .xh-slider-thumb {
    width: 16px;
    height: 16px;
    border-radius: 9999px;
    background: var(--xh-accent-fg);
    box-shadow: 0 0 0 2px var(--xh-surface), 0 1px 3px rgba(0, 0, 0, 0.25);
  }
  .xh-slider-thumb:has(:focus-visible) {
    outline: 2px solid var(--xh-accent-fg);
    outline-offset: 3px;
  }
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): add floating panel settings with a slider`

---

### Task 8: EVM 地址

**Files:** Create `src/ui/settings/EvmAddressSettings.tsx`；Test `EvmAddressSettings.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx file=src/ui/settings/EvmAddressSettings.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { EvmAddressSettings, formatEvmInput, shortAddress } from './EvmAddressSettings';

const update = vi.hoisted(() => vi.fn());
vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~contents/services/review.ts', () => ({ updateEvmAddresses: (addresses: string[]) => update(addresses) }));
vi.mock('~utils/dataValidation', () => ({ cleanErrorMessage: (message: unknown) => String(message) }));

const GOOD = `0x${'a'.repeat(40)}`;

describe('EvmAddressSettings', () => {
  test('formats the input, flags a bad address and saves a good one', async () => {
    update.mockResolvedValueOnce({ evmAddresses: [GOOD] });
    const onSaved = vi.fn();
    render(<EvmAddressSettings onSaved={onSaved} />);
    const box = screen.getByRole('textbox', { name: 'evmAddressBinding' }) as HTMLInputElement;
    await userEvent.type(box, 'zz12');
    expect(box.value).toBe('0x12');
    expect(screen.getByText('mantleHunterEvmAddressFormatIncorrect')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'save' }).hasAttribute('disabled')).toBe(true);

    await userEvent.clear(box);
    await userEvent.type(box, 'a'.repeat(40));
    await userEvent.click(screen.getByRole('button', { name: 'save' }));
    expect(update).toHaveBeenCalledWith([GOOD]);
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('evmBindSuccess'));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  test('starts from the bound address and shows server errors', async () => {
    update.mockRejectedValueOnce({ errorDetails: { message: 'Only once a month' } });
    render(<EvmAddressSettings userInfo={{ evmAddresses: [GOOD] } as never} onSaved={() => {}} />);
    expect((screen.getByRole('textbox', { name: 'evmAddressBinding' }) as HTMLInputElement).value).toBe(GOOD);
    await userEvent.click(screen.getByRole('button', { name: 'modify' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Only once a month'));
  });

  test('formats and shortens addresses', () => {
    expect([formatEvmInput(''), formatEvmInput('12'), formatEvmInput(`0x${'1'.repeat(41)}`)]).toEqual(['', '0x12', null]);
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });
});
```

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现**

```tsx file=src/ui/settings/EvmAddressSettings.tsx
import { useEffect, useState } from 'react';
import { updateEvmAddresses } from '~contents/services/review.ts';
import { useI18n } from '~contents/hooks/i18n';
import type { UserInfo } from '~types/review.ts';
import { cleanErrorMessage } from '~utils/dataValidation';
import { Button, TextField } from '../primitives';
import { cx } from '../primitives/cx';
import { ROW_PAD } from './SettingRow';

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export const isValidEvmAddress = (address: string) => !address || EVM_ADDRESS.test(address);

export function formatEvmInput(value: string): string | null {
  const cleaned = value.replace(/[^a-fA-F0-9x]/g, '');
  if (!cleaned) return '';
  const formatted = cleaned !== '0' && !cleaned.startsWith('0x') ? `0x${cleaned}` : cleaned;
  return formatted.length <= 42 ? formatted : null;
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function EvmAddressSettings({ userInfo, onSaved }: { userInfo?: UserInfo | null; onSaved: () => void }) {
  const { t } = useI18n();
  const bound: string = userInfo?.evmAddresses?.[0] ?? '';
  const [address, setAddress] = useState(bound);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setAddress(bound), [bound]);

  const invalid = address.length > 0 && !isValidEvmAddress(address);

  const change = (value: string) => {
    const next = formatEvmInput(value);
    if (next === null) return;
    setAddress(next);
    setError('');
    setSuccess('');
  };

  const save = async () => {
    if (saving) return;
    if (address && !isValidEvmAddress(address)) {
      setError(t('mantleHunterEvmAddressFormatIncorrect') || 'Invalid EVM address format');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateEvmAddresses(address.trim() ? [address.trim()] : []);
      if (updated) {
        onSaved();
        setSuccess(t('evmBindSuccess'));
      } else {
        setError(t('noteSaveFailed') || 'Save failed');
      }
    } catch (err: any) {
      if (err?.errorDetails) {
        const { error: code, message } = err.errorDetails;
        setError(cleanErrorMessage(message || code || err || ''));
      } else {
        setError(cleanErrorMessage(err?.message || t('noteSaveFailed') || 'Save failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cx('flex flex-col gap-2.5', ROW_PAD)}>
      <p className='text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]'>{t('evmAddressBindingTip')}</p>
      <div className='flex items-center gap-2'>
        <TextField
          aria-label={t('evmAddressBinding')}
          placeholder={t('mantleHunterPlaceholderEvmAddress') || '0x...'}
          value={address}
          onValueChange={change}
          onSubmit={() => {
            if (!invalid) void save();
          }}
          invalid={invalid || Boolean(error)}
          className='min-w-0 flex-1 font-xh-mono'
          testId='settings-evm-address-input'
        />
        <Button size='sm' variant='primary' disabled={saving || invalid} aria-busy={saving || undefined} onClick={() => void save()}>
          {saving ? (
            <span aria-hidden='true' className='size-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
          ) : null}
          {bound ? t('modify') : t('save')}
        </Button>
      </div>
      {success ? (
        <p role='status' className='text-[11.5px] font-medium text-xh-up'>
          {success}
        </p>
      ) : null}
      {error || invalid ? (
        <p role={error ? 'alert' : undefined} className='text-[11.5px] font-medium text-xh-down'>
          {error || t('mantleHunterEvmAddressFormatIncorrect')}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): add EVM address binding`

---

### Task 9: 信息流净化

**Files:** Modify `src/compontents/cleaner/FeedCleanerSettingsSection.tsx`（逻辑不动，去掉折叠头，渲染改写）；Test `FeedCleanerSettingsSection.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx file=src/compontents/cleaner/FeedCleanerSettingsSection.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { launchNativeBlock } from '~contents/utils/cleaner/profileBlockLauncher';
import { getMemoryValue, setMemoryValue } from '../../test/memoryStorage';
import { FeedCleanerSettingsSection } from './FeedCleanerSettingsSection';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~storage/index', async () => {
  const memory = await import('../../test/memoryStorage');
  return { localStorageInstance: { get: async (key: string) => memory.getMemoryValue(key) ?? null } };
});
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => ({ settingsRemoveItem: 'Remove {item}', settingsAddTo: 'Add to {list}' })[key] ?? key,
    lang: 'zh',
    setLang: () => {},
  }),
}));
vi.mock('~utils/rankCacheManager', () => ({
  RankCacheManager: { preload: async () => {} },
  hasKolRankInCache: (handle: string) => handle === 'famous',
}));
vi.mock('~contents/utils/cleaner/profileBlockLauncher', () => ({ launchNativeBlock: vi.fn() }));
vi.mock('~contents/utils/navigateInX', () => ({ navigateInX: vi.fn() }));

describe('FeedCleanerSettingsSection', () => {
  test('turns cleaning on, picks a mode and edits keywords and the whitelist', async () => {
    render(<FeedCleanerSettingsSection />);
    expect(screen.queryByRole('radiogroup', { name: 'cleanerModeTitle' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'cleanerEnableTitle' }));
    expect(getMemoryValue('@settings/cleaner-enabled')).toBe(true);
    await userEvent.click(screen.getByRole('radio', { name: 'cleanerModeHide' }));
    expect(getMemoryValue('@settings/cleaner-mode')).toBe('hide');

    await userEvent.click(screen.getByRole('button', { name: 'cleanerCustomKeywordsTitle (0)' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'cleanerCustomKeywordsTitle' }), 'spam, a, 广告{Enter}');
    expect(getMemoryValue('@xhunt/cleaner-custom-keywords')).toEqual(['spam', '广告']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove spam' }));
    expect(getMemoryValue('@xhunt/cleaner-custom-keywords')).toEqual(['广告']);

    await userEvent.click(screen.getByRole('button', { name: 'cleanerWhitelistTitle (0)' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'cleanerWhitelistTitle' }), '@Mira');
    await userEvent.click(screen.getByRole('button', { name: 'Add to cleanerWhitelistTitle' }));
    expect(getMemoryValue('@xhunt/cleaner-whitelist')).toEqual(['mira']);
  });

  test('lists intercepted accounts without ranked ones and hands blocking to X', async () => {
    setMemoryValue('@settings/cleaner-enabled', true);
    setMemoryValue('@xhunt/cleaner-intercepted-accounts', [
      { handle: 'spam1', name: 'Spam One', isBlocked: false },
      { handle: 'famous', name: 'Famous', isBlocked: false },
    ]);
    render(<FeedCleanerSettingsSection />);
    await userEvent.click(screen.getByRole('button', { name: /cleanerInterceptedTitle/ }));
    await waitFor(() => expect(screen.getByRole('link', { name: /Spam One/ })).toBeTruthy());
    expect(screen.queryByRole('link', { name: /Famous/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'cleanerBlockBtn @spam1' }));
    expect(launchNativeBlock).toHaveBeenCalledWith('spam1', 'block');
  });

  test('a focus request shows the guide bubble', () => {
    render(<FeedCleanerSettingsSection focusRequest={1} />);
    expect(screen.getByText('cleanerConfigBubbleDesc')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 确认失败**（现在没有命名的开关、分段控件和文本框）

- [ ] **Step 3: 改写**：保留原文件第 1–235 行的状态、事件和处理函数，做以下改动，再把 `return (...)` 换成下面的渲染：

1. 导入改为：

```tsx
import React, { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { localStorageInstance } from '~storage/index';
import { useI18n } from '~contents/hooks/i18n';
import type { CleanerMode, InterceptedAccount } from '~contents/utils/cleaner/types';
import { launchNativeBlock } from '~contents/utils/cleaner/profileBlockLauncher';
import { RankCacheManager, hasKolRankInCache } from '~utils/rankCacheManager';
import { navigateInX } from '~contents/utils/navigateInX';
import { CloseIcon } from '~/ui/icons';
import { Avatar, Button, CollapsibleSection, IconButton, SegmentedControl, Switch, TextField } from '~/ui/primitives';
import { cx } from '~/ui/primitives/cx';
import { ROW_PAD, SettingRow } from '~/ui/settings/SettingRow';
import { GuideBubble } from '~/ui/shells/GuideBubble';
```

2. 组件签名改为 `export const FeedCleanerSettingsSection: React.FC<{ focusRequest?: number }> = ({ focusRequest = 0 }) => {`；删掉 `isExpanded` 状态和 `handleFocusCleaner` 里的 `setIsExpanded(true)`；在原来的事件监听 `useEffect` 之后加：

```tsx
  useEffect(() => {
    if (focusRequest) handleFocusCleaner();
  }, [focusRequest, handleFocusCleaner]);
```

3. `handleToggleOpenIntercepted` 换成：

```tsx
  const handleOpenIntercepted = async (open: boolean) => {
    setOpenIntercepted(open);
    if (!open) return;
    try {
      const stored = (await localStorageInstance.get(
        '@xhunt/cleaner-intercepted-accounts'
      )) as InterceptedAccount[] | null;
      if (Array.isArray(stored)) {
        setInterceptedAccounts(stored);
      }
    } catch {
      // ignore
    }
  };
```

4. 删掉 `hoveredUnblockHandle` 状态；`handleUnblockAccount` 只保留 `launchNativeBlock(targetHandle, 'unblock');`。

5. 渲染：

```tsx
  const modeValue: CleanerMode = mode === 'hide' || mode === 'collapse' ? mode : 'mark';

  return (
    <div
      ref={sectionRef}
      id='xhunt-feed-cleaner-settings'
      className={cx(
        'flex flex-col rounded-xh-card transition-shadow soft:divide-y soft:divide-xh-line',
        isHighlighted && 'shadow-[0_0_0_2px_var(--xh-accent-fg)]',
      )}
    >
      {showBubbleTip ? (
        <div className={ROW_PAD}>
          <GuideBubble placement='inline' text={t('cleanerConfigBubbleDesc')} onDismiss={() => setShowBubbleTip(false)} />
        </div>
      ) : null}
      <SettingRow
        labelled
        label={t('cleanerEnableTitle')}
        control={<Switch checked={enabled} onCheckedChange={setEnabled} data-xhunt-testid='settings-cleaner-enabled' />}
      />
      {enabled ? (
        <>
          <SettingRow
            label={t('cleanerModeTitle')}
            control={
              <SegmentedControl
                aria-label={t('cleanerModeTitle')}
                size='sm'
                value={modeValue}
                onValueChange={setMode}
                options={[
                  { value: 'collapse', label: t('cleanerModeCollapse') },
                  { value: 'mark', label: t('cleanerModeMark') },
                  { value: 'hide', label: t('cleanerModeHide') },
                ]}
              />
            }
          />
          <ListSection title={t('cleanerCustomKeywordsTitle')} count={customKeywords.length} open={openKeywords} onOpenChange={setOpenKeywords}>
            <p className='text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]'>{t('cleanerCustomKeywordsTip')}</p>
            <AddRow
              list={t('cleanerCustomKeywordsTitle')}
              placeholder={t('cleanerCustomKeywordsPlaceholder')}
              value={keywordInput}
              onValueChange={setKeywordInput}
              onAdd={handleAddKeywords}
            />
            <Chips items={customKeywords} onRemove={handleRemoveKeyword} />
          </ListSection>
          <ListSection title={t('cleanerWhitelistTitle')} count={whitelist.length} open={openWhitelist} onOpenChange={setOpenWhitelist}>
            <AddRow
              list={t('cleanerWhitelistTitle')}
              placeholder={t('cleanerWhitelistPlaceholder')}
              value={whitelistInput}
              onValueChange={setWhitelistInput}
              onAdd={handleAddWhitelist}
            />
            <Chips items={whitelist} format={(handle) => `@${handle}`} onRemove={handleRemoveWhitelist} />
          </ListSection>
          <ListSection
            title={t('cleanerInterceptedTitle')}
            count={visibleInterceptedAccounts.length}
            open={openIntercepted}
            onOpenChange={(open) => void handleOpenIntercepted(open)}
          >
            {visibleInterceptedAccounts.length === 0 ? (
              <p className='py-3 text-center text-[11.5px] text-xh-fg-2'>{t('cleanerInterceptedEmpty')}</p>
            ) : (
              <>
                <p className='text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]'>{t('cleanerBlockTitle')}</p>
                <ul className='flex max-h-60 flex-col gap-0.5 overflow-y-auto'>
                  {visibleInterceptedAccounts.map((account) => (
                    <InterceptedRow
                      key={account.handle}
                      account={account}
                      onBlock={handleBlockAccount}
                      onUnblock={handleUnblockAccount}
                    />
                  ))}
                </ul>
              </>
            )}
          </ListSection>
        </>
      ) : null}
    </div>
  );
};

function ListSection({
  title,
  count,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <CollapsibleSection title={`${title} (${count})`} open={open} onOpenChange={onOpenChange} className={ROW_PAD}>
      <div className='flex flex-col gap-2 pt-1'>{children}</div>
    </CollapsibleSection>
  );
}

function AddRow({
  list,
  placeholder,
  value,
  onValueChange,
  onAdd,
}: {
  list: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className='flex items-center gap-1.5'>
      <TextField aria-label={list} placeholder={placeholder} value={value} onValueChange={onValueChange} onSubmit={onAdd} className='min-w-0 flex-1' />
      <Button size='sm' onClick={onAdd} aria-label={t('settingsAddTo').replace('{list}', list)}>
        {t('cleanerAddBtn')}
      </Button>
    </div>
  );
}

function Chips({
  items,
  format = (item) => item,
  onRemove,
}: {
  items: string[];
  format?: (item: string) => string;
  onRemove: (item: string) => void;
}) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <ul className='flex max-h-24 flex-wrap gap-1 overflow-y-auto'>
      {items.map((item) => (
        <li key={item} className='xh-tag pr-1'>
          {format(item)}
          <IconButton
            label={t('settingsRemoveItem').replace('{item}', format(item))}
            size='sm'
            className='size-4 rounded-full'
            onClick={() => onRemove(item)}
          >
            <CloseIcon size={10} />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

function InterceptedRow({
  account,
  onBlock,
  onUnblock,
}: {
  account: InterceptedAccount;
  onBlock: (handle: string) => void;
  onUnblock: (handle: string) => void;
}) {
  const { t } = useI18n();
  const [hover, setHover] = useState(false);
  const handle = account.handle;
  return (
    <li className='flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-xh-hover'>
      <a
        href={`https://x.com/${handle}`}
        target='_blank'
        rel='noopener noreferrer'
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          navigateInX(`https://x.com/${handle}`);
        }}
        className='xh-link flex min-w-0 flex-1 items-center gap-2'
      >
        <Avatar name={account.name || handle} src={account.avatar} size='sm' />
        <span className='min-w-0 truncate text-[12px] font-medium'>{account.name || handle}</span>
        <span className='min-w-0 truncate text-[11px] text-xh-fg-2'>@{handle}</span>
      </a>
      {account.isBlocked ? (
        <Button
          size='sm'
          variant={hover ? 'default' : 'soft'}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => setHover(false)}
          onClick={() => {
            setHover(false);
            onUnblock(handle);
          }}
          aria-label={`${t('cleanerBlockedStatus')} · ${t('cleanerUnblockBtn')} @${handle}`}
        >
          {hover ? t('cleanerUnblockBtn') : t('cleanerBlockedStatus')}
        </Button>
      ) : (
        <Button size='sm' variant='primary' onClick={() => onBlock(handle)} aria-label={`${t('cleanerBlockBtn')} @${handle}`}>
          {t('cleanerBlockBtn')}
        </Button>
      )}
    </li>
  );
}
```

- [ ] **Step 4: 确认通过**，Commit `feat(settings): restyle feed cleaner settings with primitives`

---

### Task 10: 设置页容器

**Files:** Modify `src/compontents/pages/SettingsPage.tsx`（重写）、`src/ui/shells/PanelPageHeader.tsx`（`onBack`）、`src/compontents/UserAuthPanel.tsx`（导出 `SocialLinks`）；Test `src/compontents/pages/SettingsPage.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx file=src/compontents/pages/SettingsPage.test.tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAgent } from '@ui-sdk/react/agent';
import { describe, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '~/ui/skin/skins';
import { SettingsPage } from './SettingsPage';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~storage/index.ts', () => ({
  localStorageInstance: { get: async () => null, set: async () => {}, clear: async () => {} },
}));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~/utils/settingsManager.ts', async () => {
  const React = await import('react');
  const KEYS = [
    'showSidebarIcon',
    'showTokenAnalysis',
    'showTweetAIAnalysis',
    'showAiDetectButton',
    'showAvatarRank',
    'showInvestors',
    'showHotVote',
    'showHotTrendingAi',
  ];
  return {
    settingsConfig: { nameRight: [{ key: 'showInvestors', label: 'showInvestors' }], followedRight: [] },
    useAllSettings: () => {
      const [values, setValues] = React.useState<Record<string, boolean>>(() =>
        Object.fromEntries(KEYS.map((key) => [key, true])),
      );
      const settingStates = Object.fromEntries(
        KEYS.map((key) => [key, { get: values[key], set: (value: boolean) => setValues((prev) => ({ ...prev, [key]: value })) }]),
      );
      return { settingStates, isLoading: false };
    },
  };
});
vi.mock('~utils/configManager.ts', () => ({ configManager: { getConfig: () => ({}) } }));
vi.mock('~contents/utils/helpers.ts', () => ({ getCurrentUsername: async () => 'mira' }));
vi.mock('~contents/services/review.ts', () => ({
  updateUserInfo: async () => ({ evmAddresses: [] }),
  updateEvmAddresses: async () => null,
}));
vi.mock('~contents/hooks/useAvatarSkin', () => ({ useAvatarSkinState: () => ({ skin: 'skin-1', setSkinCustomized: () => {} }) }));
vi.mock('~compontents/pages/constants.tsx', () => ({ defaultSound: { url: 'https://cdn.example/15011.mp3', data: 'data:default' } }));
vi.mock('~/compontents/cleaner/FeedCleanerSettingsSection', () => ({
  FeedCleanerSettingsSection: ({ focusRequest }: { focusRequest?: number }) => <p>cleaner focus {focusRequest}</p>,
}));
vi.mock('~/compontents/navigation/PanelNavigator', () => ({
  useNavigation: () => ({ navigateTo: () => {}, goBack: () => {}, history: ['/home', '/settings'], currentRoute: '/settings' }),
}));
vi.mock('~/compontents/navigation/PanelContext', () => ({ usePanelContext: () => ({ onMinimize: () => {} }) }));
vi.mock('~/utils/messageManager', () => ({
  messageManager: {
    init: () => {},
    getState: () => ({ messages: [], hasUnread: false, isLoading: false }),
    addCallback: () => () => {},
    markAllAsRead: () => {},
  },
}));

function renderPage(skin: 'soft' | 'obsidian' | 'native') {
  setMemoryValue(UI_SKIN_STORAGE_KEY, skin);
  setMemoryValue('@xhunt/user-domain-preference', { domains: ['web3'], primaryDomain: 'web3' });
  setMemoryValue('@xhunt/user-domain-setup-completed', true);
  setMemoryValue('@settings/avatarRankMode', 'web3');
  return render(<SettingsPage onClose={() => {}} />);
}

describe('SettingsPage', () => {
  test('lists the common groups and opens a section from More, then goes back', async () => {
    renderPage('soft');
    expect(screen.getByTestId('settings-group-others')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
    expect(screen.getByTestId('settings-group-header-aiOnlySettings').textContent).toContain('settingsOff');

    await userEvent.click(screen.getByTestId('settings-group-header-floatingPanel'));
    expect(screen.getByRole('heading', { level: 2, name: 'floatingPanelSettings' })).toBeTruthy();
    expect(screen.getByTestId('settings-group-floatingPanel')).toBeTruthy();
    expect(screen.queryByRole('searchbox', { name: 'settingsSearchLabel' })).toBeNull();

    await userEvent.click(screen.getByTestId('panel-section-back-button'));
    expect(screen.getByRole('heading', { level: 2, name: 'settingsTitle' })).toBeTruthy();
  });

  test('keeps domain-only switches off until the domain is on', async () => {
    renderPage('native');
    await userEvent.click(screen.getByTestId('settings-group-header-aiOnlySettings'));
    expect(screen.getByText('settingsDomainDisabled')).toBeTruthy();
    const toggle = screen.getByRole('switch', { name: 'showHotTrendingAi' });
    expect(toggle.hasAttribute('disabled') || toggle.getAttribute('aria-disabled') === 'true').toBe(true);
  });

  test('search shows matching switches and jumps to sections', async () => {
    renderPage('obsidian');
    const search = screen.getByRole('searchbox', { name: 'settingsSearchLabel' });
    await userEvent.type(search, 'showSide');
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'showTokenAnalysis' })).toBeNull();

    await userEvent.clear(search);
    await userEvent.type(search, 'panelWidth');
    await userEvent.click(screen.getByRole('button', { name: /panelWidth/ }));
    expect(screen.getByTestId('settings-group-floatingPanel')).toBeTruthy();
  });

  test('says when nothing matches', async () => {
    renderPage('soft');
    await userEvent.type(screen.getByRole('searchbox', { name: 'settingsSearchLabel' }), 'zzz');
    expect(screen.getByText('settingsNoResults')).toBeTruthy();
  });

  test('a cleaner link from the timeline opens the cleaner section', () => {
    renderPage('soft');
    act(() => {
      window.dispatchEvent(new CustomEvent('xhunt:focus-cleaner-settings'));
    });
    expect(screen.getByText('cleaner focus 1')).toBeTruthy();
    expect(screen.getByTestId('settings-group-cleaner')).toBeTruthy();
  });

  test('an agent can find and use the main settings by name', async () => {
    renderPage('soft');
    const agent = createAgent();
    const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== 'more');
    for (const entry of components) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    const labels = components.map((entry) => entry.label);
    for (const label of ['settingsSearchLabel', 'uiSkinLabel', 'language', 'soundEffect', 'showSidebarIcon', 'avatarSkinSelectorTitle']) {
      expect(labels, `${label} is missing from the snapshot`).toContain(label);
    }
    const result = await agent.act({
      steps: [
        { ref: 'showTweetAIAnalysis', action: 'setChecked', args: [false] },
        { ref: 'settingsSearchLabel', action: 'setValue', args: ['showSide'] },
      ],
    });
    expect(result.ok, result.error?.message).toBe(true);
    expect(screen.queryByRole('switch', { name: 'showTokenAnalysis' })).toBeNull();
    expect(screen.getByRole('switch', { name: 'showSidebarIcon' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: 确认失败**

- [ ] **Step 3: 实现**

`PanelPageHeader.tsx`：参数加 `onBack?: () => void;`，`canGoBack` 改为 `const canGoBack = Boolean(onBack) || (skin !== 'obsidian' && showBack && history.length > 1);`，返回按钮改为 `onClick={onBack ?? goBack}`、`data-xhunt-testid={onBack ? 'panel-section-back-button' : 'panel-back-button'}`。

`UserAuthPanel.tsx`：把未登录视图里的社交链接抽成导出的 `SocialLinks`，未登录视图改用它：

```tsx
export function SocialLinks() {
  return (
    <>
      {SOCIAL_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={link.label}
          title={link.label}
          className='xh-iconbtn'
          data-size='sm'
        >
          {link.icon}
        </a>
      ))}
    </>
  );
}
```

```tsx file=src/compontents/pages/SettingsPage.tsx
import React, { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import packageJson from '../../../package.json';
import { FeedCleanerSettingsSection } from '~/compontents/cleaner/FeedCleanerSettingsSection';
import { SocialLinks } from '~/compontents/UserAuthPanel';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { updateUserInfo } from '~contents/services/review.ts';
import { getCurrentUsername } from '~contents/utils/helpers.ts';
import { localStorageInstance } from '~storage/index.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import type { UserInfo } from '~types/review.ts';
import { configManager } from '~utils/configManager.ts';
import { settingsConfig, useAllSettings } from '~/utils/settingsManager.ts';
import { EmptyState } from '~/ui/panel/PanelSection';
import { Button, SearchField } from '~/ui/primitives';
import { cx } from '~/ui/primitives/cx';
import { AVATAR_RANK_MODE_KEY, AvatarRankSettings } from '~/ui/settings/AvatarRankSettings';
import { DomainSettings } from '~/ui/settings/DomainSettings';
import { EvmAddressSettings, shortAddress } from '~/ui/settings/EvmAddressSettings';
import { FloatingPanelSettings, clampWidth } from '~/ui/settings/FloatingPanelSettings';
import { GeneralSettings, LanguageSetting, SkinSetting, SoundSetting } from '~/ui/settings/GeneralSettings';
import { groupSettings, type SettingGroups } from '~/ui/settings/groupSettings';
import { reloadPage } from '~/ui/settings/reloadPage';
import { DrillRow, ROW_PAD, SettingsGroup, SwitchSetting } from '~/ui/settings/SettingRow';
import { SettingsProvider, type RealtimeMode } from '~/ui/settings/SettingsContext';
import { PanelPageHeader } from '~/ui/shells/PanelPageHeader';

// Chrome 类型声明
declare const chrome: any;

type SectionId =
  | 'domainPreference'
  | 'cleaner'
  | 'profilePage'
  | 'homeRightSidebar'
  | 'web3OnlySettings'
  | 'aiOnlySettings'
  | 'floatingPanel'
  | 'evm';

interface SettingsPageProps {
  showBackButton?: boolean;
  onClose?: () => void;
}

interface SearchEntry {
  id: string;
  label: string;
  render: () => ReactNode;
}

const CLEANER_ANCHOR = 'xhunt-feed-cleaner-settings';
const SWITCH_GROUPS: Array<keyof SettingGroups> = [
  'others',
  'avatarSettings',
  'profilePage',
  'homeRightSidebar',
  'web3OnlySettings',
  'aiOnlySettings',
];
const PRESERVED_KEYS = [
  '@xhunt/user-domain-preference',
  '@xhunt/user-domain-setup-completed',
  '@xhunt/domain-setup-visible',
];
const SECTION_BODY =
  'xh-rise flex flex-col soft:divide-y soft:divide-xh-line soft:rounded-xh-card soft:bg-xh-raised soft:shadow-xh-card';

function useRealtimeMode(active: boolean) {
  const [mode, setMode] = useState<RealtimeMode>('Inactive');
  useEffect(() => {
    if (!active) {
      setMode('Inactive');
      return;
    }
    const fetchStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_REALTIME_STATUS' });
        if (response?.success && response?.data) setMode(response.data.mode || 'Inactive');
      } catch {}
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 4000);
    return () => clearInterval(timer);
  }, [active]);
  return mode;
}

// 清理扩展本地存储和网页 localStorage 里与 xhunt 相关的键，保留领域选择
async function clearXhuntCache(confirmText: string) {
  try {
    if (!window.confirm(confirmText || 'Are you sure you want to clear all XHunt caches? This cannot be undone.')) return;
  } catch {}
  const preserved: Record<string, unknown> = {};
  try {
    for (const key of PRESERVED_KEYS) preserved[key] = await localStorageInstance.get(key);
  } catch {}
  try {
    await localStorageInstance.clear();
  } catch {}
  try {
    if (chrome?.storage?.local?.clear) {
      await new Promise<void>((resolve) => chrome.storage.local.clear(() => resolve()));
    }
  } catch {}
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i) || '');
    keys.forEach((key) => {
      if (key.includes('xhunt') || key.includes('@xhunt')) window.localStorage.removeItem(key);
    });
  } catch {}
  try {
    for (const key of PRESERVED_KEYS) {
      if (preserved[key] !== undefined) await localStorageInstance.set(key, preserved[key]);
    }
  } catch {}
  try {
    window.location.reload();
  } catch {}
}

function SettingsFooter({ token }: { token: string }) {
  const { t, lang } = useI18n();
  return (
    <div className='flex items-center gap-1 soft:px-1 soft:pt-2 obsidian:border-t obsidian:border-xh-line obsidian:px-3 obsidian:py-2 native:border-t native:border-xh-line native:px-4 native:py-2.5'>
      {token ? <SocialLinks /> : null}
      <span className='min-w-0 flex-1 truncate px-1 text-[11px] text-xh-fg-2 obsidian:font-xh-mono native:text-[13px]'>
        {lang === 'zh' ? `${t('version')} ` : ''}
        {packageJson.version}
      </span>
      <Button size='sm' title={t('clearCacheTooltip')} onClick={() => void clearXhuntCache(t('clearCacheConfirm'))}>
        {t('clearCache')}
      </Button>
    </div>
  );
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ showBackButton = true, onClose }) => {
  const { t } = useI18n();
  const { settingStates, isLoading } = useAllSettings();
  const { domains } = useUserDomain();
  const [token] = useLocalStorage('@xhunt/token', '');
  const [rankMode, setRankMode] = useLocalStorage<'web3' | 'ai'>(AVATAR_RANK_MODE_KEY, 'web3');
  const [cleanerEnabled] = useLocalStorage<boolean>('@settings/cleaner-enabled', false);
  const [cleanerMode] = useLocalStorage<string>('@settings/cleaner-mode', 'collapse');
  const [panelMode] = useLocalStorage<'default' | 'persistent'>('@xhunt/floatingPanelMode', 'default');
  const [panelWidth] = useLocalStorage<number>('@xhunt/panelWidth', 340);
  // 用户信息缓存时间戳，用于绕过协商缓存
  const [cacheBust, setCacheBust] = useLocalStorage<number>('@xhunt/userInfoCacheBust', Date.now());
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [section, setSection] = useState<SectionId | null>(null);
  const [query, setQuery] = useState('');
  const [cleanerFocus, setCleanerFocus] = useState(0);
  const realtimeMode = useRealtimeMode(Boolean(settingStates.showRealtimeSubscription?.get));
  const groups = useMemo(
    () => groupSettings(settingsConfig, configManager.getConfig() as never, username || undefined),
    [username],
  );

  useEffect(() => {
    getCurrentUsername()
      .then((name) => setUsername(name || ''))
      .catch(() => setUsername(''));
  }, []);

  // 只剩一个领域时，头像排名类型跟着它走
  useEffect(() => {
    if (domains.length === 1 && rankMode !== domains[0]) {
      setRankMode(domains[0]);
      reloadPage();
    }
  }, [domains, rankMode, setRankMode]);

  // 打开设置页时同步一次用户信息（updateUserInfo 会写回 @xhunt/user）
  useEffect(() => {
    if (!token) {
      setUserInfo(undefined);
      return;
    }
    updateUserInfo(cacheBust).then((info) => {
      if (info) setUserInfo(info);
    });
  }, [token, cacheBust]);

  useEffect(() => {
    const openCleaner = () => {
      setQuery('');
      setSection('cleaner');
      setCleanerFocus((count) => count + 1);
    };
    const onRouteRequest = (event: Event) => {
      const props = (event as CustomEvent<{ props?: Record<string, unknown> }>).detail?.props;
      if (props?.highlightCleaner || props?.scrollToId === CLEANER_ANCHOR) openCleaner();
    };
    window.addEventListener('xhunt:focus-cleaner-settings', openCleaner);
    window.addEventListener('xhunt:route-request', onRouteRequest);
    return () => {
      window.removeEventListener('xhunt:focus-cleaner-settings', openCleaner);
      window.removeEventListener('xhunt:route-request', onRouteRequest);
    };
  }, []);

  const domainOff = (id: string) =>
    (id === 'web3OnlySettings' && !domains.includes('web3')) || (id === 'aiOnlySettings' && !domains.includes('ai'));
  const count = (n: number) => t('settingsItemCount').replace('{count}', String(n));
  const modeLabels: Record<string, string> = {
    collapse: t('cleanerModeCollapse'),
    mark: t('cleanerModeMark'),
    hide: t('cleanerModeHide'),
  };
  const titles: Record<SectionId, string> = {
    domainPreference: t('domainPreferenceTitle') || '感兴趣领域',
    cleaner: t('cleanerSettingsTitle'),
    profilePage: t('profilePageSettings'),
    homeRightSidebar: t('homeRightSidebar'),
    web3OnlySettings: t('web3OnlySettings') || 'Web3 领域设置',
    aiOnlySettings: t('aiOnlySettings') || 'AI 领域设置',
    floatingPanel: t('floatingPanelSettings'),
    evm: t('evmAddressBinding'),
  };
  const evmAddress: string = userInfo?.evmAddresses?.[0] ?? '';

  const open = (id: SectionId | null) => {
    setQuery('');
    setSection(id);
  };

  const drillRows: Array<{ id: SectionId; summary: string }> = [
    { id: 'domainPreference', summary: domains.map((domain) => (domain === 'ai' ? 'AI' : 'Web3')).join(' · ') },
    {
      id: 'cleaner',
      summary: cleanerEnabled ? `${t('settingsOn')} · ${modeLabels[cleanerMode] ?? modeLabels.mark}` : t('settingsOff'),
    },
    { id: 'profilePage', summary: count(groups.profilePage.length) },
    ...(groups.homeRightSidebar.length
      ? [{ id: 'homeRightSidebar' as const, summary: count(groups.homeRightSidebar.length) }]
      : []),
    {
      id: 'web3OnlySettings',
      summary: domainOff('web3OnlySettings') ? t('settingsOff') : count(groups.web3OnlySettings.length),
    },
    {
      id: 'aiOnlySettings',
      summary: domainOff('aiOnlySettings') ? t('settingsOff') : count(groups.aiOnlySettings.length),
    },
    {
      id: 'floatingPanel',
      summary: `${panelMode === 'persistent' ? t('floatingPanelModePersistent') : t('floatingPanelModeDefault')} · ${clampWidth(panelWidth)}px`,
    },
    ...(token
      ? [{ id: 'evm' as const, summary: evmAddress ? shortAddress(evmAddress) : t('settingsNotBound') }]
      : []),
  ];

  const searchEntries = (): SearchEntry[] => {
    const entries: SearchEntry[] = [
      { id: 'uiSkin', label: t('uiSkinLabel'), render: () => <SkinSetting /> },
      { id: 'language', label: t('language'), render: () => <LanguageSetting /> },
      { id: 'sound', label: t('soundEffect'), render: () => <SoundSetting /> },
    ];
    const seen = new Set<string>();
    for (const groupId of SWITCH_GROUPS) {
      for (const item of groups[groupId]) {
        if (seen.has(item.key)) continue;
        seen.add(item.key);
        const disabled = SWITCH_GROUPS.every(
          (id) => !groups[id].some((other) => other.key === item.key) || domainOff(id),
        );
        entries.push({
          id: item.key,
          label: t(item.label),
          render: () => <SwitchSetting setting={item} disabled={disabled} />,
        });
      }
    }
    const jump = (label: string, target: SectionId | null, summary: string): SearchEntry => ({
      id: `jump-${label}`,
      label,
      render: () => <DrillRow label={label} summary={summary} onOpen={() => open(target)} />,
    });
    entries.push(
      jump(t('avatarRankModeSelectorTitle'), null, t('avatarSettings')),
      jump(t('avatarSkinSelectorTitle'), null, t('avatarSettings')),
      jump(t('domainPriorityTitle'), 'domainPreference', titles.domainPreference),
      jump(t('cleanerEnableTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerModeTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerCustomKeywordsTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerWhitelistTitle'), 'cleaner', titles.cleaner),
      jump(t('cleanerInterceptedTitle'), 'cleaner', titles.cleaner),
      jump(t('floatingPanelMode'), 'floatingPanel', titles.floatingPanel),
      jump(t('panelWidth'), 'floatingPanel', titles.floatingPanel),
      ...drillRows.map((row) => jump(titles[row.id], row.id, row.summary)),
    );
    return entries;
  };

  const renderSection = (id: SectionId): ReactNode => {
    if (id === 'cleaner') return <FeedCleanerSettingsSection focusRequest={cleanerFocus} />;
    if (id === 'domainPreference') return <DomainSettings />;
    if (id === 'floatingPanel') return <FloatingPanelSettings />;
    if (id === 'evm') return <EvmAddressSettings userInfo={userInfo} onSaved={() => setCacheBust(Date.now())} />;
    const disabled = domainOff(id);
    return (
      <>
        {disabled ? (
          <p className={cx('text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]', ROW_PAD)}>
            {t('settingsDomainDisabled')}
          </p>
        ) : null}
        {groups[id].map((item) => (
          <SwitchSetting key={item.key} setting={item} disabled={disabled} />
        ))}
      </>
    );
  };

  const q = query.trim().toLowerCase();
  const results = q ? searchEntries().filter((entry) => entry.label.toLowerCase().includes(q)) : [];

  return (
    <div data-xhunt-testid='settings-page' className='flex h-full min-h-0 flex-col'>
      <PanelPageHeader
        title={section ? titles[section] : t('settingsTitle')}
        showBack={showBackButton}
        onBack={section ? () => setSection(null) : undefined}
        onClose={onClose}
      />
      {isLoading ? (
        <div className='flex flex-1 items-center justify-center py-10'>
          <span aria-hidden='true' className='size-6 animate-spin rounded-full border-2 border-xh-fg-3 border-t-transparent' />
        </div>
      ) : (
        <SettingsProvider value={{ settingStates, realtimeMode }}>
          {section ? null : (
            <div className='soft:pb-2 obsidian:px-3 obsidian:pb-2 native:px-4 native:pb-2'>
              <SearchField
                aria-label={t('settingsSearchLabel')}
                placeholder={t('settingsSearchPlaceholder')}
                value={query}
                onValueChange={setQuery}
                testId='settings-search'
              />
            </div>
          )}
          <div className='custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden obsidian:px-3 obsidian:pb-2'>
            {section ? (
              <section key={section} data-xhunt-testid={`settings-group-${section}`}>
                <div data-settings-body='' className={SECTION_BODY}>
                  {renderSection(section)}
                </div>
              </section>
            ) : q ? (
              <div data-settings-body='' className={SECTION_BODY}>
                {results.length ? (
                  results.map((entry) => <Fragment key={entry.id}>{entry.render()}</Fragment>)
                ) : (
                  <EmptyState>{t('settingsNoResults')}</EmptyState>
                )}
              </div>
            ) : (
              <div className='flex flex-col soft:gap-2'>
                <SettingsGroup id='others' title={t('settingsGroupGeneral')}>
                  <GeneralSettings items={groups.others} />
                </SettingsGroup>
                <SettingsGroup id='avatarSettings' title={t('avatarSettings')}>
                  <AvatarRankSettings items={groups.avatarSettings} />
                </SettingsGroup>
                <SettingsGroup id='more' title={t('settingsGroupMore')} collapsible={false}>
                  {drillRows.map((row) => (
                    <DrillRow
                      key={row.id}
                      testId={`settings-group-header-${row.id}`}
                      label={titles[row.id]}
                      summary={row.summary}
                      onOpen={() => open(row.id)}
                    />
                  ))}
                </SettingsGroup>
              </div>
            )}
          </div>
          <SettingsFooter token={token} />
        </SettingsProvider>
      )}
    </div>
  );
};

export default SettingsPage;
```

- [ ] **Step 4: 全部测试 + 类型检查**，Commit `feat(settings): rebuild the settings page as a list with sections and search`

---

### Task 11: 端到端辅助函数和沙盒

**Files:** Modify `tests/e2e/setup/xhuntUi.ts`、`tests/e2e/panel/settings.spec.ts`、`dev/sandbox/mocks/review.ts`

1. 两处 `setSettingChecked` 里的 `await item.locator('label').first().click();` 都换成 `await toggle.click();`（开关现在是 `role="switch"` 的按钮，Playwright 的 `isChecked` / `toBeChecked` 认 `aria-checked`）。
2. `expandSettingsGroup` 换成同时适配可折叠分组和二级页的写法：

```ts
export async function expandSettingsGroup(page: Page, key: string) {
  const group = page.locator(xhuntSelectors.settingsGroup(key)).first();
  const header = page.locator(xhuntSelectors.settingsGroupHeader(key)).first();
  const body = group.locator('[data-settings-body]').first();

  if ((await group.count()) > 0 && (await body.isVisible().catch(() => false))) return;

  await expect(header, `设置分组 ${key} 应该可见`).toBeVisible({ timeout: 30_000 });
  await header.scrollIntoViewIfNeeded();
  await header.click();
  await expect(page.locator(xhuntSelectors.settingsGroup(key)).locator('[data-settings-body]').first()).toBeVisible({
    timeout: 30_000,
  });
}
```

（主列表分组和二级页都是「`settings-group-{key}` 根节点 + 后代 `[data-settings-body]` 内容区」，柔光折叠后内容区不可见，二级页没打开时根节点不存在，两种情况都会去点 `settings-group-header-{key}`。）

3. 沙盒 `mocks/review.ts` 加：

```ts
export const updateUserInfo = async () => ({ ...MOCK_USER, evmAddresses: [] as string[] });
export const updateEvmAddresses = async (addresses: string[]) => ({ ...MOCK_USER, evmAddresses: addresses });
```

- [ ] Commit `test(e2e): drive settings switches and sections with the new semantics` 和 `chore(sandbox): mock user info for the settings page`

---

### Task 12: 验收

- [ ] `pnpm vitest run` 全部通过；类型检查没有新增错误；`pnpm exec plasmo build` 成功，测试标记都在包里；`pnpm exec playwright test --list` 能加载端到端用例。
- [ ] 沙盒 3 种风格 × 3 种 X 背景：主列表、每个二级页、搜索、返回；所有可见文字 ≥ 4.5:1，开关、滑块把手、选中的徽章色块边缘 ≥ 3:1。

---

## 执行中的调整

1. **二级页和搜索结果的结构**：根节点 `section[data-xhunt-testid=settings-group-{key}]`，内容放在后代 `div[data-settings-body]` 里，和主列表分组一致，端到端的 `expandSettingsGroup` 才能用同一套判断（Task 11 的说明已同步）。
2. **`SearchField` 抽出守卫时脚本截错位置**，留下两行残余代码，测试报错后手工删掉。
3. **`updateUserInfo` 的返回值补了类型**（原页面就有这个隐式 any），类型错误从 76 个降到 75 个。
4. **验收时发现并修掉的问题**：
   - 从柔光切到黑曜时面板多出 48px 图标栏，右边超出屏幕 34px，要等浏览器窗口缩放才会收回来（阶段 1b 遗留）。`DraggablePanel` 在宽度变大时做一次边界收拢，变窄时位置不动，补了测试。
   - 徽章皮肤色块在柔光下第 10 个挤到第二行，色块改成 20px、间距 6px。

## 验收结果

- `pnpm vitest run`：49 个测试文件、144 个测试全部通过（含设置页的 agent 测试）。
- 类型检查：75 个错误，全部是原有的，没有新增。
- `pnpm exec plasmo build` 成功；设置页的测试标记都在包里。`Main.js` 4,390,330 字节，比阶段 1c 结束时多约 16KB。
- `pnpm exec playwright test --list` 能加载受影响的 3 个端到端用例（设置页、设置生效、语言切换）；端到端用例需要登录的 x.com 和私有模块，这里跑不了。
- 沙盒 3 种风格 × 3 种 X 背景：主列表、8 个二级页逐一打开再返回，搜索、跳转都正常；所有可用状态下的可见文字对比度 ≥ 4.5:1，最低 4.77:1（原生纯黑的次要文字）；停用的开关按规范不计。
- 没能验证的：真实 x.com 上的效果；键盘焦点环只核对了样式规则（浏览器面板在后台，拿不到焦点）。
