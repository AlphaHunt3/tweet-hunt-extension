# UI 风格切换 · 阶段 2a（资料页地基、标签与备注、AI 叙事）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让资料页这一层能用上三套风格：每个挂载点加风格作用域、改成开放的 Shadow Root，补上弹层基础组件；按画布重做名字下面的标签与备注（备注编辑改成弹层）和 AI 叙事；沙盒新增「资料页」视图。

**Architecture:** 新组件放在 `src/ui/profile/`，数据逻辑拆成 `useOfficialTags`、`useProfileNote` 两个钩子；`NameRightData` 只换掉 `NotesSection`、`NarrativeSection` 两处和根元素，洞察部分留给 2b。样式写在新的 `src/css/profile.css`（由 `style.css` 引入，进 `xh-primitives` 图层），三套风格用 `[data-skin]` 选择器区分。

**Tech Stack:** React 19、ui-sdk Popover/Input、ahooks `useRequest`、Plasmo storage 钩子、Vitest + Testing Library、ui-sdk agent 测试。

总览见 `docs/superpowers/plans/2026-11-15-ui-skins-phase2-overview.md`；画布对应 `.claude/design-canvas/profile-spec.md` 第 0、1、3 节。

---

## 设计要点

- **风格作用域**：X 页面里每个挂载点是独立的 Shadow Root，看不到主文档 `<html>` 上的风格属性。`SkinScope` 是 `display: contents` 的 `div`，带 `data-skin` 和 `data-theme`，包住 `NameRightData`、`FollowedRightData`、`SocialCircleFeature`（两处）、`KolAiChatButton` 的根元素。设计变量本身通过继承穿过 Shadow 边界，不需要额外处理。
- **开放的 Shadow Root**：这 4 个挂载点改用 `shadowMode: 'open'`，测试和 e2e 才能进去。
- **弹层**：`Popover` 包一层 ui-sdk 的 popover，统一外观（`xh-popover`）：柔光圆角 16、黑曜 12、原生 16 且用 X 悬停卡片的阴影（已在 `--xh-shadow-pop` 里）；进入 150ms 缩放淡入，退出 50ms。
- **标签与备注**（画布第 1 节）：
  - 柔光：22px 胶囊；标签灰底带标签图标；备注是虚线描边，加号 +「添加备注」，悬停时文字和描边变深。
  - 黑曜：20px、圆角 6 的小方标签，标签不带图标；备注虚线、加号 +「备注」。
  - 原生：没有底色和描边的行内文字，14px；标签灰色带图标，备注是蓝色的笔记图标 +「添加备注」，悬停下划线。
  - 已有备注时：按钮显示备注内容（超长省略，`title` 给全文），实线浅底；无障碍名称是「编辑备注：内容」。
  - 点按钮打开弹层：已登录是编辑框（标题「备注 · 仅自己可见」、单行输入框、30 字计数、取消/保存，回车保存，Esc 关闭）；未登录是一句说明加「用 X 登录」。
  - 行为保持：`showOfficialTags`、`showNotes` 开关；自己的主页不显示备注；没登录时按钮显示「添加备注」/「备注」而不是备注内容；保存成功和失败的提示文案不变；保存时从 X 页面读头像、显示名、链接。
  - 输入框从多行改成单行：上限 30 字，单行够用，回车保存更自然。
- **AI 叙事**（画布第 3 节）：柔光是强调色浅底小标「AI 叙事」+ 12.5px 正文；黑曜是等宽描边小标 + 13px 次要色正文；原生是蓝色粗体「AI 叙事」+ 15px 正文。柔光在 2b 会移进洞察卡片底部，这一阶段先单独一行。文本按界面语言取 `cn`/`en`，和原来一样不跨语言回退。
- **焦点**：备注按钮用强调色 2px 描边、偏移 2px（画布没有设计焦点样式）。
- **输入框和 Esc**：`useKeyGuard` 在 window 捕获阶段挡住 X 的快捷键，Esc 也被挡住了，弹层收不到。给它加 `onEscape`，`TextField` 透传。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/locales/zh.json`、`en.json` | 6 条新文案 |
| `src/ui/icons.tsx` | 新增标签、加号、笔记、X 标志图标 |
| `src/ui/primitives/useKeyGuard.ts` | 增加 `onEscape` |
| `src/ui/primitives/TextField.tsx` | 增加 `onEscape`、`maxLength` |
| `src/ui/skin/SkinScope.tsx` | 风格作用域 |
| `src/ui/primitives/Popover.tsx` | 弹层基础组件 |
| `src/css/primitives.css` | 弹层样式 |
| `src/css/profile.css` | 标签、备注、叙事的三套样式 |
| `src/css/style.css` | 引入 `profile.css` |
| `src/ui/profile/useOfficialTags.ts` | 官方标签 |
| `src/ui/profile/useProfileNote.ts` | 备注读取和保存 |
| `src/ui/profile/ProfileTagline.tsx` | 标签与备注 |
| `src/ui/profile/NarrativeLine.tsx` | AI 叙事 |
| `src/compontents/area/NameRightData.tsx` | 换用新组件、`SkinScope`、开放 Shadow Root |
| `src/compontents/area/FollowedRightData.tsx`、`SocialCircle/SocialCircleFeature.tsx`、`area/KolAiChatButton.tsx` | `SkinScope`、开放 Shadow Root |
| 删除 `src/compontents/NotesSection.tsx`、`NarrativeSection.tsx` | 只被 `NameRightData` 用 |
| `dev/sandbox/ProfileDemo.tsx`、`main.tsx`、`vite.config.ts`、`mocks/*` | 沙盒「资料页」视图和假数据 |
| `tests/e2e/profile/review-notes-ui.spec.ts` | 备注改成单行输入框后的用例 |

---

### Task 1: 文案和图标

**Files:**
- Modify: `src/locales/zh.json`、`src/locales/en.json`
- Modify: `src/ui/icons.tsx`

- [ ] **Step 1: 加文案**

```bash
python3 - <<'EOF'
import json
adds = {
  'zh': {
    'profileNoteAdd': '添加备注',
    'profileNoteEditLabel': '编辑备注',
    'profileNoteEditorTitle': '备注 · 仅自己可见',
    'profileLoginWithX': '用 X 登录',
    'profileTagsLabel': 'XHunt 标签',
    'aiNarrative': 'AI 叙事',
  },
  'en': {
    'profileNoteAdd': 'Add note',
    'profileNoteEditLabel': 'Edit note',
    'profileNoteEditorTitle': 'Note · only visible to you',
    'profileLoginWithX': 'Log in with X',
    'profileTagsLabel': 'XHunt tags',
    'aiNarrative': 'AI narrative',
  },
}
for lang, entries in adds.items():
    path = f'src/locales/{lang}.json'
    data = json.load(open(path, encoding='utf-8'))
    data.update(entries)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
EOF
git diff --stat src/locales
```

Expected: 两个文件各 `6 insertions(+)`、`0 deletions`（如果出现删除行，说明原文件格式和 `json.dump` 不一致，改用 Edit 手工追加）。

- [ ] **Step 2: 加图标**（追加到 `src/ui/icons.tsx` 末尾）

```tsx
export const TagIcon = makeIcon(
  <>
    <path d='M4 4h7l9 9-7 7-9-9V4Z' />
    <circle cx='8.5' cy='8.5' r='1.2' />
  </>,
);
export const PlusIcon = makeIcon(<path d='M12 5v14M5 12h14' />);
export const NoteIcon = makeIcon(
  <>
    <path d='M5 4h14v11l-5 5H5V4Z' />
    <path d='M14 20v-5h5' />
  </>,
);
export const XLogoIcon = makeIcon(
  <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />,
  true,
);
```

- [ ] **Step 3: 类型检查这两个文件不报错，提交**

Run: `pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "icons.tsx|locales" ; echo done`
Expected: 只有 `done`。

```bash
git add src/locales/zh.json src/locales/en.json src/ui/icons.tsx
git commit -m "feat(profile): add profile tagline strings and icons"
```

---

### Task 2: 输入框支持 Esc 和长度上限

**Files:**
- Modify: `src/ui/primitives/useKeyGuard.ts`
- Modify: `src/ui/primitives/TextField.tsx`
- Test: `src/ui/primitives/TextField.test.tsx`

- [ ] **Step 1: 写失败的测试**（追加到 `TextField.test.tsx` 末尾）

```tsx
function Note({ onEscape }: { onEscape: () => void }) {
  const [value, setValue] = useState('');
  return (
    <TextField aria-label='Note' value={value} onValueChange={setValue} onEscape={onEscape} maxLength={5} />
  );
}

test('Escape runs onEscape and maxLength caps the value', async () => {
  const onEscape = vi.fn();
  render(<Note onEscape={onEscape} />);
  const input = screen.getByRole('textbox', { name: 'Note' }) as HTMLInputElement;
  await userEvent.type(input, 'abcdefgh');
  expect(input.value).toBe('abcde');
  await userEvent.keyboard('{Escape}');
  expect(onEscape).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/primitives/TextField.test.tsx`
Expected: FAIL（`onEscape`、`maxLength` 不是 `TextField` 的属性，Esc 没有回调）。

- [ ] **Step 3: 实现**

`src/ui/primitives/useKeyGuard.ts` 整个替换为：

```ts
import { useEffect, useRef, type RefObject } from 'react';

// X 的快捷键挂在 document 捕获阶段，window 捕获阶段更早，在这里挡住才来得及；
// 挡住之后 React 的 onKeyDown 和弹层的 Esc 都收不到，回车和 Esc 只能在这里处理
export function useKeyGuard(
  inputRef: RefObject<HTMLInputElement | null>,
  onEnter?: (value: string) => void,
  onEscape?: () => void,
) {
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    const guard = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (!input || event.isComposing || !event.composedPath().includes(input)) return;
      event.stopImmediatePropagation();
      if (event.type !== 'keydown') return;
      if (event.key === 'Enter' && onEnterRef.current) {
        event.preventDefault();
        onEnterRef.current(input.value);
      } else if (event.key === 'Escape' && onEscapeRef.current) {
        event.preventDefault();
        onEscapeRef.current();
      }
    };
    const types = ['keydown', 'keypress', 'keyup'] as const;
    types.forEach((type) => window.addEventListener(type, guard, true));
    return () => types.forEach((type) => window.removeEventListener(type, guard, true));
  }, [inputRef]);
}
```

`src/ui/primitives/TextField.tsx`：
1. `TextFieldProps` 里加：

```ts
  onEscape?: () => void;
  maxLength?: number;
```

2. 解构参数里加 `onEscape,`、`maxLength,`；`useKeyGuard(inputRef, onSubmit);` 改成 `useKeyGuard(inputRef, onSubmit, onEscape);`。
3. `<Input` 上：`onValueChange={(next) => onValueChange(next)}` 改成

```tsx
        onValueChange={(next) => onValueChange(maxLength ? next.slice(0, maxLength) : next)}
        maxLength={maxLength}
```

- [ ] **Step 4: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/primitives/TextField.test.tsx src/ui/primitives/SearchField.test.tsx`
Expected: PASS（`SearchField` 也用 `useKeyGuard`，一起跑）。

- [ ] **Step 5: 提交**

```bash
git add src/ui/primitives/useKeyGuard.ts src/ui/primitives/TextField.tsx src/ui/primitives/TextField.test.tsx
git commit -m "feat(ui): let text fields handle Escape and cap their length"
```

---

### Task 3: 风格作用域

**Files:**
- Create: `src/ui/skin/SkinScope.tsx`
- Test: `src/ui/skin/SkinScope.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { SkinScope } from './SkinScope';
import { UI_SKIN_STORAGE_KEY } from './skins';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));

test('defaults to obsidian on dark and passes other attributes through', () => {
  const { getByTestId } = render(<SkinScope data-xhunt-testid='scope'>内容</SkinScope>);
  const scope = getByTestId('scope');
  expect(scope.dataset.skin).toBe('obsidian');
  expect(scope.dataset.theme).toBe('dark');
  expect(scope.className).toBe('contents');
  expect(scope.textContent).toBe('内容');
});

test('follows the stored skin and theme', async () => {
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  setMemoryValue('@xhunt/theme', 'light');
  const { getByTestId } = render(<SkinScope data-xhunt-testid='scope' />);
  await waitFor(() => expect(getByTestId('scope').dataset.skin).toBe('native'));
  expect(getByTestId('scope').dataset.theme).toBe('light');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/skin/SkinScope.test.tsx`
Expected: FAIL（找不到 `./SkinScope`）。

- [ ] **Step 3: 实现**

```tsx
import type { HTMLAttributes } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { cx } from '../primitives/cx';
import { useUiSkin } from './useUiSkin';

// X 页面里的挂载点各自是一个 Shadow Root，看不到主文档上的风格属性，每个根都要包一层
export function SkinScope({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { skin } = useUiSkin();
  const [theme] = useLocalStorage<string>('@xhunt/theme', 'dark');
  return (
    <div
      {...rest}
      data-skin={skin}
      data-theme={theme === 'light' ? 'light' : 'dark'}
      className={cx('contents', className)}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/skin/SkinScope.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/ui/skin/SkinScope.tsx src/ui/skin/SkinScope.test.tsx
git commit -m "feat(skin): add a skin scope for roots inside X's page"
```

---

### Task 4: 弹层基础组件

**Files:**
- Create: `src/ui/primitives/Popover.tsx`
- Modify: `src/css/primitives.css`（插在 `.xh-select-*` 规则之后、`.xh-search` 之前）
- Test: `src/ui/primitives/Popover.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from './Popover';

function Example() {
  return (
    <Popover>
      <PopoverTrigger>备注</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>添加备注</PopoverTitle>
        <PopoverDescription>只有你自己能看到</PopoverDescription>
        <PopoverClose>关闭</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

test('opens on press as a named dialog with the shared look, and closes on Escape', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: '备注' }));
  const dialog = await screen.findByRole('dialog', { name: '添加备注' });
  expect(dialog.classList.contains('xh-popover')).toBe(true);
  expect(screen.getByText('只有你自己能看到').classList.contains('xh-popover-desc')).toBe(true);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

test('the close part closes it', async () => {
  render(<Example />);
  await userEvent.click(screen.getByRole('button', { name: '备注' }));
  await userEvent.click(await screen.findByRole('button', { name: '关闭' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/primitives/Popover.test.tsx`
Expected: FAIL（找不到 `./Popover`）。

- [ ] **Step 3: 实现组件**

```tsx
import {
  Popover as UiPopover,
  PopoverClose as UiPopoverClose,
  PopoverContent as UiPopoverContent,
  PopoverDescription as UiPopoverDescription,
  PopoverTitle as UiPopoverTitle,
  PopoverTrigger as UiPopoverTrigger,
} from '@ui-sdk/react/popover';
import type { ComponentProps } from 'react';
import { cx } from './cx';

export const Popover = UiPopover;
export const PopoverTrigger = UiPopoverTrigger;
export const PopoverClose = UiPopoverClose;

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

export function PopoverContent({
  className,
  sideOffset = 8,
  collisionPadding = 12,
  ...props
}: WithClassName<ComponentProps<typeof UiPopoverContent>>) {
  return (
    <UiPopoverContent
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cx('xh-popover', className)}
      {...props}
    />
  );
}

export function PopoverTitle({ className, ...props }: WithClassName<ComponentProps<typeof UiPopoverTitle>>) {
  return <UiPopoverTitle className={cx('xh-popover-title', className)} {...props} />;
}

export function PopoverDescription({
  className,
  ...props
}: WithClassName<ComponentProps<typeof UiPopoverDescription>>) {
  return <UiPopoverDescription className={cx('xh-popover-desc', className)} {...props} />;
}
```

- [ ] **Step 4: 加样式**（`src/css/primitives.css`，和 `.xh-select-content` 同一层级、同样缩进）

```css
  .xh-popover {
    width: max-content;
    max-width: min(320px, calc(100vw - 24px));
    max-height: var(--available-height);
    overflow-y: auto;
    padding: 14px;
    border-radius: 16px;
    background: var(--xh-surface);
    box-shadow: var(--xh-shadow-pop);
    color: var(--xh-fg);
    font-family: var(--xh-font-ui);
    font-size: 13px;
    line-height: 1.45;
    text-align: start;
    transform-origin: var(--transform-origin);
    transition:
      opacity var(--xh-d-xs) var(--xh-ease-out),
      scale var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-popover[data-starting-style],
  .xh-popover[data-ending-style] {
    opacity: 0;
    scale: 0.96;
  }
  .xh-popover[data-ending-style] {
    transition-duration: 50ms;
  }
  .xh-popover-title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
  }
  .xh-popover-desc {
    margin: 0;
    color: var(--xh-fg-2);
    font-size: 12.5px;
  }
  [data-skin='obsidian'] .xh-popover {
    border-radius: 12px;
    font-size: 12.5px;
  }
  [data-skin='native'] .xh-popover {
    padding: 16px;
    font-size: 15px;
    line-height: 1.35;
  }
  [data-skin='native'] .xh-popover-title {
    font-size: 15px;
    font-weight: 700;
  }
  [data-skin='native'] .xh-popover-desc {
    font-size: 14px;
  }
```

- [ ] **Step 5: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/primitives/Popover.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/ui/primitives/Popover.tsx src/ui/primitives/Popover.test.tsx src/css/primitives.css
git commit -m "feat(ui): add a popover primitive"
```

---

### Task 5: 标签与备注

**Files:**
- Create: `src/ui/profile/useOfficialTags.ts`
- Create: `src/ui/profile/useProfileNote.ts`
- Create: `src/ui/profile/ProfileTagline.tsx`
- Test: `src/ui/profile/ProfileTagline.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { ProfileTagline } from './ProfileTagline';

const mocks = vi.hoisted(() => {
  const state = { stored: '', settings: {} as Record<string, boolean>, own: null as Element | null };
  return {
    state,
    getUserNote: vi.fn(async () => ({ note: state.stored })),
    saveUserNote: vi.fn(async ({ note }: { note: string }) => {
      state.stored = note;
      return {};
    }),
    getTwitterAuthUrl: vi.fn(async () => ({ url: 'https://x.com/i/oauth' })),
    openNewTab: vi.fn(),
    setTips: vi.fn(),
  };
});

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~utils/settingsManager.ts', () => ({
  useCrossPageSettings: () => ({ isEnabled: (key: string) => mocks.state.settings[key] ?? true }),
}));
vi.mock('~contents/hooks/useCurrentUrl', () => ({ default: () => 'https://x.com/mira_onchain' }));
vi.mock('~contents/hooks/useWaitForElement', () => ({ default: () => mocks.state.own }));
vi.mock('~/utils/officialTagsManager', () => ({
  officialTagsManager: { init: async () => {}, getUserTags: () => ['研究员', 'DeFi'] },
}));
vi.mock('~contents/services/notes.ts', () => ({
  getUserNote: mocks.getUserNote,
  saveUserNote: mocks.saveUserNote,
}));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: mocks.getTwitterAuthUrl }));
vi.mock('~contents/utils', () => ({ openNewTab: mocks.openNewTab }));
vi.mock('~compontents/area/GlobalTips.tsx', () => ({ useGlobalTips: () => [null, mocks.setTips] }));

beforeEach(() => {
  mocks.state.stored = '';
  mocks.state.settings = {};
  mocks.state.own = null;
  vi.clearAllMocks();
});

test('shows the official tags and a short note button in obsidian', async () => {
  render(<ProfileTagline handle='mira_onchain' twitterId='42' />);
  expect(await screen.findByText('研究员 · DeFi')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'note' })).toBeTruthy();
});

test('settings hide the tags, and your own profile hides the note', async () => {
  mocks.state.settings = { showOfficialTags: false };
  const { unmount } = render(<ProfileTagline handle='mira_onchain' />);
  await screen.findByRole('button', { name: 'note' });
  expect(screen.queryByText('研究员 · DeFi')).toBeNull();
  unmount();

  mocks.state.settings = {};
  mocks.state.own = document.createElement('a');
  render(<ProfileTagline handle='mira_onchain' />);
  await screen.findByText('研究员 · DeFi');
  expect(screen.queryByRole('button', { name: /note|profileNoteAdd/ })).toBeNull();
});

test('saves a note from the editor with Enter and then shows it', async () => {
  setMemoryValue('@xhunt/token', 'tok');
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'soft');
  render(<ProfileTagline handle='mira_onchain' />);
  await userEvent.click(await screen.findByRole('button', { name: 'profileNoteAdd' }));
  const dialog = await screen.findByRole('dialog', { name: 'profileNoteEditorTitle' });
  const input = within(dialog).getByRole('textbox', { name: 'note' }) as HTMLInputElement;
  await userEvent.type(input, '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十多出来的字');
  expect(input.value).toHaveLength(30);
  expect(within(dialog).getByText('30/30')).toBeTruthy();
  await userEvent.clear(input);
  await userEvent.type(input, '靠谱研究员{Enter}');
  await waitFor(() =>
    expect(mocks.saveUserNote).toHaveBeenCalledWith(expect.objectContaining({ handle: 'mira_onchain', note: '靠谱研究员' })),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByRole('button', { name: 'profileNoteEditLabel：靠谱研究员' })).toBeTruthy();
  expect(mocks.setTips).toHaveBeenCalledWith({ text: 'noteSaveSuccess', type: 'suc' });
});

test('Escape closes the editor without saving', async () => {
  setMemoryValue('@xhunt/token', 'tok');
  setMemoryValue(UI_SKIN_STORAGE_KEY, 'native');
  render(<ProfileTagline handle='mira_onchain' />);
  await userEvent.click(await screen.findByRole('button', { name: 'profileNoteAdd' }));
  const dialog = await screen.findByRole('dialog', { name: 'profileNoteEditorTitle' });
  await userEvent.type(within(dialog).getByRole('textbox', { name: 'note' }), '草稿{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(mocks.saveUserNote).not.toHaveBeenCalled();
});

test('asks to log in when signed out', async () => {
  render(<ProfileTagline handle='mira_onchain' />);
  await userEvent.click(await screen.findByRole('button', { name: 'note' }));
  const dialog = await screen.findByRole('dialog', { name: 'profileNoteEditorTitle' });
  expect(within(dialog).getByText('loginRequired2')).toBeTruthy();
  await userEvent.click(within(dialog).getByRole('button', { name: 'profileLoginWithX' }));
  await waitFor(() => expect(mocks.openNewTab).toHaveBeenCalledWith('https://x.com/i/oauth'));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/profile/ProfileTagline.test.tsx`
Expected: FAIL（找不到 `./ProfileTagline`）。

- [ ] **Step 3: 官方标签钩子** `src/ui/profile/useOfficialTags.ts`

```ts
import { useEffect, useState } from 'react';
import { officialTagsManager } from '~/utils/officialTagsManager';

export function useOfficialTags(
  handle: string,
  twitterId: string | number | null | undefined,
  lang: string,
): string[] {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    setTags([]);
    if (!handle) return;
    let alive = true;
    (async () => {
      try {
        await officialTagsManager.init();
        const next = officialTagsManager.getUserTags(
          handle,
          lang === 'en' ? 'en' : 'zh',
          twitterId == null ? null : String(twitterId),
        );
        if (alive) setTags(next || []);
      } catch {
        if (alive) setTags([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle, twitterId, lang]);

  return tags;
}
```

- [ ] **Step 4: 备注钩子** `src/ui/profile/useProfileNote.ts`

```ts
import { useRequest } from 'ahooks';
import { useEffect, useState } from 'react';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { useI18n } from '~contents/hooks/i18n';
import { getUserNote, saveUserNote } from '~contents/services/notes.ts';

export const NOTE_MAX_LENGTH = 30;

function readProfileIdentity() {
  const avatarImg = document.querySelector(
    'main [data-testid*="UserAvatar-Container"] img',
  ) as HTMLImageElement | null;
  const nameText = document.querySelector("main [data-testid='UserName']")?.textContent || '@';
  const [displayName] = nameText.split('@');
  return {
    avatar: avatarImg?.src || '',
    displayName: displayName.trim(),
    xLink: window.location.origin + window.location.pathname,
  };
}

export function useProfileNote({
  handle,
  token,
  fallbackNote,
}: {
  handle: string;
  token: string;
  fallbackNote?: string | null;
}) {
  const { t } = useI18n();
  const [, setTips] = useGlobalTips();
  const [localNote, setLocalNote] = useState('');

  const { data, run: fetchNote, loading } = useRequest(() => getUserNote(handle), { manual: true });
  const { runAsync: saveAsync, loading: saving } = useRequest(saveUserNote, { manual: true });

  useEffect(() => {
    setLocalNote('');
  }, [handle]);
  useEffect(() => {
    if (handle && token) fetchNote();
  }, [handle, token]);
  useEffect(() => {
    setLocalNote(data?.note || '');
  }, [data]);

  const save = async (note: string) => {
    if (!handle || !token) return false;
    try {
      await saveAsync({ handle, ...readProfileIdentity(), note });
      setTips({ text: t('noteSaveSuccess'), type: 'suc' });
      setLocalNote(note);
      fetchNote();
      return true;
    } catch (error) {
      setTips({ text: `${t('noteSaveFailed')}: ${error}`, type: 'fail' });
      return false;
    }
  };

  return {
    note: token ? localNote || fallbackNote || '' : '',
    loading,
    saving,
    save,
  };
}
```

- [ ] **Step 5: 组件** `src/ui/profile/ProfileTagline.tsx`

```tsx
import { useLockFn } from 'ahooks';
import { useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import useWaitForElement from '~contents/hooks/useWaitForElement';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useCrossPageSettings } from '~utils/settingsManager.ts';
import { NoteIcon, PlusIcon, TagIcon, XLogoIcon } from '../icons';
import { Button } from '../primitives/Button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '../primitives/Popover';
import { TextField } from '../primitives/TextField';
import type { UiSkin } from '../skin/skins';
import { useUiSkin } from '../skin/useUiSkin';
import { useOfficialTags } from './useOfficialTags';
import { NOTE_MAX_LENGTH, useProfileNote } from './useProfileNote';

export interface ProfileTaglineProps {
  handle: string;
  twitterId?: string | number | null;
  fallbackNote?: string | null;
}

export function ProfileTagline({ handle, twitterId, fallbackNote }: ProfileTaglineProps) {
  const { lang } = useI18n();
  const { skin } = useUiSkin();
  const { isEnabled } = useCrossPageSettings();
  const currentUrl = useCurrentUrl();
  const ownProfile = useWaitForElement('main a[data-testid="editProfileButton"]', [currentUrl]);
  const tags = useOfficialTags(handle, twitterId, lang);

  const showTags = isEnabled('showOfficialTags') && tags.length > 0;
  const showNote = isEnabled('showNotes') && !ownProfile && Boolean(handle);
  if (!showTags && !showNote) return null;

  const tagText = tags.join(' · ');
  return (
    <div className='xh-ptagline'>
      {showTags && (
        <span className='xh-ptag' title={tagText}>
          {skin !== 'obsidian' && <TagIcon size={skin === 'native' ? 14 : 12} />}
          <span className='xh-ptag-text'>{tagText}</span>
        </span>
      )}
      {showNote && <NoteControl handle={handle} skin={skin} fallbackNote={fallbackNote} />}
    </div>
  );
}

function NoteControl({
  handle,
  skin,
  fallbackNote,
}: {
  handle: string;
  skin: UiSkin;
  fallbackNote?: string | null;
}) {
  const { t } = useI18n();
  const [token] = useLocalStorage<string>('@xhunt/token', '');
  const { note, loading, saving, save } = useProfileNote({ handle, token, fallbackNote });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const login = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
      setOpen(false);
    }
  });

  const submit = async () => {
    if (saving) return;
    if (await save(draft.trim())) setOpen(false);
  };

  const emptyLabel = skin === 'obsidian' ? t('note') : t('profileNoteAdd');
  const icon =
    note || skin === 'native' ? <NoteIcon size={skin === 'native' ? 14 : 12} /> : <PlusIcon size={12} />;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(note);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        className='xh-pnote'
        data-xhunt-testid='note-entry'
        data-has-note={note ? '' : undefined}
        disabled={loading}
        title={note || undefined}
        aria-label={note ? `${t('profileNoteEditLabel')}：${note}` : undefined}
      >
        {loading ? (
          <span className='xh-pnote-text'>{t('loading')}</span>
        ) : (
          <>
            {icon}
            <span className='xh-pnote-text'>{note || emptyLabel}</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='xh-pnote-pop'
        data-xhunt-testid={token ? 'note-editor' : 'note-login'}
      >
        <PopoverTitle>{t('profileNoteEditorTitle')}</PopoverTitle>
        {token ? (
          <>
            <TextField
              value={draft}
              onValueChange={setDraft}
              aria-label={t('note')}
              placeholder={t('enterNoteHere')}
              maxLength={NOTE_MAX_LENGTH}
              onSubmit={() => void submit()}
              onEscape={() => setOpen(false)}
              testId='note-input'
            />
            <div className='xh-pnote-foot'>
              <span className='xh-pnote-count'>
                {draft.length}/{NOTE_MAX_LENGTH}
              </span>
              <Button
                size='sm'
                onClick={() => setOpen(false)}
                disabled={saving}
                data-xhunt-testid='note-cancel-button'
              >
                {t('cancel')}
              </Button>
              <Button
                size='sm'
                variant='primary'
                onClick={() => void submit()}
                disabled={saving}
                data-xhunt-testid='note-save-button'
              >
                {t('save')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <PopoverDescription>{t('loginRequired2')}</PopoverDescription>
            <Button size='sm' variant='primary' onClick={() => void login()}>
              <XLogoIcon size={14} />
              {t('profileLoginWithX')}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 6: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/profile/ProfileTagline.test.tsx`
Expected: PASS（5 个测试）。

- [ ] **Step 7: 提交**

```bash
git add src/ui/profile/useOfficialTags.ts src/ui/profile/useProfileNote.ts src/ui/profile/ProfileTagline.tsx src/ui/profile/ProfileTagline.test.tsx
git commit -m "feat(profile): add the tags and note line with a note popover"
```

---

### Task 6: AI 叙事

**Files:**
- Create: `src/ui/profile/NarrativeLine.tsx`
- Test: `src/ui/profile/NarrativeLine.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { NarrativeLine, pickNarrative } from './NarrativeLine';

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

test('shows the narrative in the interface language after the AI label', () => {
  render(<NarrativeLine narrative={{ cn: '长期跟踪再质押与链上收益策略。', en: 'Restaking.' }} />);
  const line = screen.getByText(/长期跟踪再质押/);
  expect(line.tagName).toBe('P');
  expect(line.firstElementChild?.textContent).toBe('aiNarrative');
});

test('renders nothing when the interface language has no text', () => {
  const { container } = render(<NarrativeLine narrative={{ cn: '  ', en: 'Restaking.' }} />);
  expect(container.firstChild).toBeNull();
});

test('pickNarrative follows the language without falling back', () => {
  expect(pickNarrative({ cn: '中文', en: 'English' }, 'en')).toBe('English');
  expect(pickNarrative({ cn: '', en: 'English' }, 'zh')).toBe('');
  expect(pickNarrative(null, 'zh')).toBe('');
});
```

- [ ] **Step 2: 运行，确认失败**

Run: `pnpm exec vitest run src/ui/profile/NarrativeLine.test.tsx`
Expected: FAIL（找不到 `./NarrativeLine`）。

- [ ] **Step 3: 实现**

```tsx
import { useI18n } from '~contents/hooks/i18n';

export interface Narrative {
  cn?: string | null;
  en?: string | null;
}

export function pickNarrative(narrative: Narrative | null | undefined, lang: string) {
  return (lang === 'zh' ? narrative?.cn : narrative?.en)?.trim() || '';
}

export function NarrativeLine({ narrative }: { narrative?: Narrative | null }) {
  const { t, lang } = useI18n();
  const text = pickNarrative(narrative, lang);
  if (!text) return null;
  return (
    <p className='xh-narr'>
      <span className='xh-narr-label'>{t('aiNarrative')}</span>
      {text}
    </p>
  );
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/profile/NarrativeLine.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/ui/profile/NarrativeLine.tsx src/ui/profile/NarrativeLine.test.tsx
git commit -m "feat(profile): add the AI narrative line"
```

---

### Task 7: 资料页样式

**Files:**
- Create: `src/css/profile.css`
- Modify: `src/css/style.css`（第 2 行 `@import './primitives.css';` 后面）

- [ ] **Step 1: 写样式** `src/css/profile.css`

```css
@layer xh-primitives {
  .xh-ptagline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-family: var(--xh-font-ui);
    line-height: 1.45;
  }
  .xh-ptag,
  .xh-pnote {
    display: inline-flex;
    align-items: center;
    height: 22px;
    max-width: 100%;
    padding: 0 8px;
    border-radius: 999px;
    color: var(--xh-fg-2);
    font-size: 11.5px;
    font-weight: 500;
    white-space: nowrap;
  }
  .xh-ptag {
    gap: 4px;
    background: var(--xh-sunken);
  }
  .xh-ptag-text,
  .xh-pnote-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .xh-pnote {
    gap: 3px;
    max-width: 220px;
    border: 1px dashed var(--xh-line-2);
    background: transparent;
    cursor: pointer;
    transition:
      color var(--xh-d-xs) var(--xh-ease-out),
      border-color var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-pnote:hover {
    border-color: var(--xh-fg-3);
    color: var(--xh-fg);
  }
  .xh-pnote[data-has-note] {
    border-style: solid;
    border-color: transparent;
    background: var(--xh-sunken);
  }
  .xh-pnote:focus-visible {
    outline: 2px solid var(--xh-accent);
    outline-offset: 2px;
  }
  .xh-pnote:disabled {
    cursor: default;
    opacity: 0.6;
  }
  [data-skin='obsidian'] .xh-ptag,
  [data-skin='obsidian'] .xh-pnote {
    height: 20px;
    padding: 0 7px;
    border-radius: 6px;
    font-size: 11px;
  }
  [data-skin='native'] .xh-ptagline {
    gap: 4px 12px;
    margin-top: 8px;
    color: var(--xh-fg-2);
    font-size: 14px;
    line-height: 1.35;
  }
  [data-skin='native'] .xh-ptag,
  [data-skin='native'] .xh-pnote,
  [data-skin='native'] .xh-pnote[data-has-note] {
    gap: 4px;
    height: auto;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: none;
    font-size: 14px;
    font-weight: 400;
  }
  [data-skin='native'] .xh-pnote {
    color: var(--xh-accent-fg);
  }
  [data-skin='native'] .xh-pnote:hover {
    text-decoration: underline;
  }

  .xh-pnote-pop {
    display: grid;
    gap: 10px;
    width: 280px;
  }
  .xh-pnote-foot {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .xh-pnote-count {
    margin-inline-end: auto;
    color: var(--xh-fg-3);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .xh-narr {
    margin: 10px 0 0;
    color: var(--xh-fg);
    font-family: var(--xh-font-ui);
    font-size: 12.5px;
    line-height: 1.6;
  }
  .xh-narr-label {
    display: inline-flex;
    align-items: center;
    height: 18px;
    margin-inline-end: 6px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--xh-accent-soft);
    color: var(--xh-accent-fg);
    font-size: 11px;
    font-weight: 600;
    vertical-align: 1px;
  }
  [data-skin='obsidian'] .xh-narr {
    color: var(--xh-fg-2);
    font-size: 13px;
  }
  [data-skin='obsidian'] .xh-narr-label {
    height: auto;
    padding: 1px 5px;
    border-radius: 4px;
    background: none;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--xh-accent) 45%, transparent);
    font: 500 10.5px var(--xh-font-num);
  }
  [data-skin='native'] .xh-narr {
    margin-top: 8px;
    font-size: 15px;
    line-height: 1.42;
  }
  [data-skin='native'] .xh-narr-label {
    display: inline;
    height: auto;
    padding: 0;
    background: none;
    font-size: 13px;
    font-weight: 700;
  }
}
```

- [ ] **Step 2: 在 `style.css` 引入**

`@import './primitives.css';` 下一行加：

```css
@import './profile.css';
```

- [ ] **Step 3: 确认打包后样式进了产物，提交**

Run: `pnpm exec plasmo build && grep -c "xh-ptagline" build/chrome-mv3-prod/Main.*.js`
Expected: 构建成功，计数大于 0。

```bash
git add src/css/profile.css src/css/style.css
git commit -m "feat(profile): style the tagline, note popover and narrative per skin"
```

---

### Task 8: 接进资料页，挂载点加风格作用域

**Files:**
- Modify: `src/compontents/area/NameRightData.tsx`
- Modify: `src/compontents/area/FollowedRightData.tsx`
- Modify: `src/compontents/SocialCircle/SocialCircleFeature.tsx`
- Modify: `src/compontents/area/KolAiChatButton.tsx`
- Delete: `src/compontents/NotesSection.tsx`、`src/compontents/NarrativeSection.tsx`

- [ ] **Step 1: `NameRightData`**
  1. import：删掉 `NotesSection`、`NarrativeSection` 的导入，加

```tsx
import { NarrativeLine } from '~/ui/profile/NarrativeLine';
import { ProfileTagline } from '~/ui/profile/ProfileTagline';
import { SkinScope } from '~/ui/skin/SkinScope';
```

  2. `useShadowContainer({ selector: 'div[data-testid="UserName"]', styleText: cssText })` 加一项 `shadowMode: 'open',`。
  3. `return ReactDOM.createPortal(` 下的根 `<div data-theme={theme} data-xhunt-testid='name-right-data' style={{ display: 'contents' }}>` 换成 `<SkinScope data-xhunt-testid='name-right-data'>`，对应的 `</div>` 换成 `</SkinScope>`。
  4. `<NotesSection userId={userId} twitterId={twitterId} reviewInfo={reviewInfo} />` 换成

```tsx
      <ProfileTagline
        handle={userId}
        twitterId={twitterId}
        fallbackNote={reviewInfo?.currentUserReview?.note}
      />
```

  5. 叙事那段换成（条件不变，组件换掉）：

```tsx
      {isEnabled('showNarrative') && twInfo?.narrative && !loadingTwInfo && (
        <NarrativeLine narrative={twInfo.narrative} />
      )}
```

- [ ] **Step 2: 另外三个挂载点**
  - `FollowedRightData`：`useShadowContainer({...})` 加 `shadowMode: 'open',`；根 `<div data-xhunt-testid='followed-right-data' style={{ display: 'contents' }}>` 换成 `<SkinScope data-xhunt-testid='followed-right-data'>`（闭合标签同改）；加 `import { SkinScope } from '~/ui/skin/SkinScope';`。
  - `SocialCircleFeature`：`useShadowContainer({...})` 加 `shadowMode: 'open',`；两处 `<div data-theme={theme} style={{ display: 'contents' }}>` 换成 `<SkinScope>`（闭合标签同改）；加同样的 import。`theme` 如果因此不再使用，删掉对应的 `useLocalStorage('@xhunt/theme', …)`。
  - `KolAiChatButton`：`useShadowContainer({...})` 加 `shadowMode: 'open',`；`ReactDOM.createPortal(` 的第一个参数外面包一层 `<SkinScope>…</SkinScope>`；加同样的 import。

- [ ] **Step 3: 删掉旧组件并确认没有引用**

```bash
git rm src/compontents/NotesSection.tsx src/compontents/NarrativeSection.tsx
grep -rn -E "NotesSection|NarrativeSection" src || echo "no references"
```

Expected: `no references`

- [ ] **Step 4: 类型检查没有新增错误，全量测试通过**

Run: `pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"`
Expected: `75`（与阶段 1d 结束时相同）。

Run: `pnpm test`
Expected: 全部通过。

- [ ] **Step 5: 提交**

```bash
git add -A src/compontents src/ui
git commit -m "feat(profile): mount the new tagline and narrative and scope profile roots to the skin"
```

---

### Task 9: agent 测试

**Files:**
- Test: `src/ui/profile/profile.agent.test.tsx`

- [ ] **Step 1: 写测试**（mock 与 Task 5 相同，抄过来）

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { expect, test, vi } from 'vitest';
import { setMemoryValue } from '../../test/memoryStorage';
import { UI_SKIN_STORAGE_KEY } from '../skin/skins';
import { NarrativeLine } from './NarrativeLine';
import { ProfileTagline } from './ProfileTagline';

vi.mock('~storage/useLocalStorage', () => import('../../test/memoryStorage'));
vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));
vi.mock('~utils/settingsManager.ts', () => ({ useCrossPageSettings: () => ({ isEnabled: () => true }) }));
vi.mock('~contents/hooks/useCurrentUrl', () => ({ default: () => 'https://x.com/mira_onchain' }));
vi.mock('~contents/hooks/useWaitForElement', () => ({ default: () => null }));
vi.mock('~/utils/officialTagsManager', () => ({
  officialTagsManager: { init: async () => {}, getUserTags: () => ['研究员', 'DeFi'] },
}));
vi.mock('~contents/services/notes.ts', () => ({
  getUserNote: async () => ({ note: '' }),
  saveUserNote: async () => ({}),
}));
vi.mock('~contents/services/api.ts', () => ({ getTwitterAuthUrl: async () => ({ url: '' }) }));
vi.mock('~contents/utils', () => ({ openNewTab: () => {} }));
vi.mock('~compontents/area/GlobalTips.tsx', () => ({ useGlobalTips: () => [null, () => {}] }));

const agent = createAgent();

test('an agent can find the note control by name in every skin', async () => {
  setMemoryValue('@xhunt/token', 'tok');
  for (const [skin, label] of [
    ['soft', 'profileNoteAdd'],
    ['obsidian', 'note'],
    ['native', 'profileNoteAdd'],
  ] as const) {
    setMemoryValue(UI_SKIN_STORAGE_KEY, skin);
    const { unmount } = render(
      <>
        <ProfileTagline handle='mira_onchain' />
        <NarrativeLine narrative={{ cn: '长期跟踪再质押与链上收益策略。' }} />
      </>,
    );
    await waitFor(() => expect(screen.getByText('研究员 · DeFi')).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: label })).toBeTruthy());
    const components = agent.snapshot().filter((entry) => !entry.offPage);
    for (const entry of components) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    expect(components.map((entry) => entry.label)).toContain(label);
    unmount();
  }
});
```

- [ ] **Step 2: 运行，确认通过**

Run: `pnpm exec vitest run src/ui/profile/profile.agent.test.tsx`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/ui/profile/profile.agent.test.tsx
git commit -m "test(profile): prove the tagline is agent-ready in every skin"
```

---

### Task 10: 沙盒「资料页」视图

**Files:**
- Create: `dev/sandbox/ProfileDemo.tsx`
- Create: `dev/sandbox/mocks/notes.ts`
- Modify: `dev/sandbox/mocks/api.ts`、`dev/sandbox/mocks/fixtures.ts`、`dev/sandbox/vite.config.ts`、`dev/sandbox/main.tsx`

- [ ] **Step 1: 假数据**
  - `mocks/fixtures.ts` 的 `MOCK_TW_INFO` 加：

```ts
  narrative: {
    cn: '长期跟踪再质押与链上收益策略，近 30 天重点讨论 Solana 生态 DEX 与 AI Agent 结合的机会。',
    en: 'Tracks restaking and on-chain yield strategies; lately focused on Solana DEXs and AI agents.',
  },
```

  - `mocks/api.ts` 里 `fetchXHuntUserTags` 改成：

```ts
export const fetchXHuntUserTags = async () => ({
  count: 1,
  byTwitterId: {},
  byUsername: { mira_onchain: { tagsZh: ['研究员', 'DeFi'], tagsEn: ['Researcher', 'DeFi'] } },
});
```

  - 新建 `mocks/notes.ts`：

```ts
let stored = '';

export const getUserNote = async () => ({ note: stored });
export const saveUserNote = async ({ note }: { note: string }) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  stored = note;
  return { success: true };
};
```

  - `vite.config.ts` 的 `xhunt-sandbox-mocks`：正则改成 `/services\/(api|review|notes)|nacosCacheManager/`，`mocks` 表里加 `'src/contents/services/notes.ts': 'mocks/notes.ts',`。

- [ ] **Step 2: 资料页模拟** `dev/sandbox/ProfileDemo.tsx`

X 页面的结构按真实的 `data-testid` 和文案搭，资料页组件用的是真实挂载逻辑（按选择器找节点、挂 Shadow Root）。沙盒的 Tailwind 不扫描 `dev/`，样式写在组件里的 `<style>`。

```tsx
import { FollowedRightData } from '~compontents/area/FollowedRightData';
import { KolAiChatButton } from '~compontents/area/KolAiChatButton';
import { NameRightData } from '~compontents/area/NameRightData';
import SocialCircleFeature from '~compontents/SocialCircle/SocialCircleFeature';
import { MOCK_REVIEW_INFO, MOCK_TW_INFO } from './mocks/fixtures';

const X_CSS = `
.x-col { width: 600px; margin: 0 auto; border-inline: 1px solid var(--x-line); background: var(--host-bg); color: var(--host-fg);
  font: 15px/1.3125 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif; }
.x-banner { height: 200px; background: var(--x-banner); }
.x-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px 0; height: 76px; }
.x-avatar { width: 134px; height: 134px; margin-top: -78px; border-radius: 50%; border: 4px solid var(--host-bg);
  background: #6b4f6b; color: #fff; display: grid; place-items: center; font-size: 40px; font-weight: 700; }
.x-actions { display: flex; align-items: flex-start; gap: 8px; }
.x-follow { height: 36px; padding: 0 16px; border-radius: 9999px; border: 0; background: var(--host-fg); color: var(--host-bg); font-weight: 700; font-size: 15px; }
.x-info { padding: 4px 16px 16px; }
.x-name { font-size: 20px; font-weight: 800; line-height: 24px; }
.x-handle, .x-meta, .x-counts a { color: var(--x-fg-2); }
.x-bio { margin-top: 12px; }
.x-meta { margin-top: 12px; font-size: 15px; }
.x-counts { display: flex; flex-wrap: wrap; align-items: center; margin-top: 12px; font-size: 14px; }
.x-counts a { margin-inline-end: 20px; text-decoration: none; }
.x-counts b { color: var(--host-fg); }
`;

const X_PALETTE = {
  default: { line: '#eff3f4', fg2: '#536471', banner: '#cfd9de' },
  dim: { line: '#38444d', fg2: '#8b98a5', banner: '#425364' },
  'lights-out': { line: '#2f3336', fg2: '#71767b', banner: '#333639' },
} as const;

export function ProfileDemo({ palette }: { palette: keyof typeof X_PALETTE }) {
  const colors = X_PALETTE[palette];
  const vars = { '--x-line': colors.line, '--x-fg-2': colors.fg2, '--x-banner': colors.banner } as React.CSSProperties;
  return (
    <main style={vars}>
      <style>{X_CSS}</style>
      <div data-testid='primaryColumn' className='x-col'>
        <div className='x-banner' />
        <div className='x-head'>
          <div className='x-avatar'>MC</div>
          <div className='x-actions'>
            <div data-testid='placementTracking'>
              <button type='button' className='x-follow'>
                关注
              </button>
            </div>
          </div>
        </div>
        <div className='x-info'>
          <div data-testid='UserName'>
            <div className='x-name'>Mira Chen</div>
            <div className='x-handle'>@mira_onchain</div>
          </div>
          <div data-testid='UserDescription' className='x-bio'>
            链上研究员｜DeFi 与 AI Agent｜观点不构成投资建议
          </div>
          <div className='x-meta'>新加坡 · 2019 年 3 月加入</div>
          <div className='x-counts'>
            <a href='#following'>
              <b>1,284</b> 正在关注
            </a>
            <a href='#followers'>
              <b>8.6万</b> 关注者
            </a>
          </div>
        </div>
      </div>
      <NameRightData
        newTwitterData={null}
        twInfo={MOCK_TW_INFO}
        deletedTweets={[]}
        deletedTweetsIsVip={false}
        loadingTwInfo={false}
        loadingDel={false}
        error={null}
        rootData={null}
        loadingRootData={false}
        renameInfo={null}
        reviewInfo={MOCK_REVIEW_INFO}
        loadingRenameInfo={false}
        discussionInfo={null}
        loadingDiscussionInfo={false}
        projectMemberData={null}
        loadingProjectMember={false}
      />
      <FollowedRightData
        twInfo={MOCK_TW_INFO}
        error={null}
        userId='mira_onchain'
        loadingTwInfo={false}
        reviewInfo={MOCK_REVIEW_INFO}
        refreshAsyncReviewInfo={async () => {}}
        refreshAsyncUserInfo={async () => {}}
        loadingReviewInfo={false}
      />
      <SocialCircleFeature />
      <KolAiChatButton />
    </main>
  );
}
```

- [ ] **Step 3: 视图切换** `dev/sandbox/main.tsx`
  - `import { ProfileDemo } from './ProfileDemo';`
  - `type View = 'panel' | 'gallery';` 改成 `type View = 'panel' | 'gallery' | 'profile';`
  - 视图按钮的数组改成 `(['panel', 'profile', 'gallery'] as View[])`，标签 `v === 'panel' ? '面板' : v === 'profile' ? '资料页' : '组件'`。
  - 资料页组件要找主文档里的节点，不能放进沙盒自己的 Shadow Root：在 `<div id="stage">` 里、`<div id="shadow-host" />` 之前加 `{view === 'profile' && <ProfileDemo palette={palette} />}`；`createPortal` 的面板分支改成只在 `view === 'panel'` 时渲染（`view === 'profile'` 时返回 `null`）。

- [ ] **Step 4: 打开沙盒自查**

Run: `pnpm sandbox`，打开 `http://localhost:5199/`，点「资料页」。
Expected: 名字下面出现「研究员 · DeFi」标签和备注按钮、AI 叙事一行；关注数后面出现 KOL 粉丝等旧样式的数据；切换三套风格，标签和备注、叙事按第 6 节的样子变化；点备注出现弹层，输入后回车保存，按钮变成备注内容。

- [ ] **Step 5: 提交**

```bash
git add dev/sandbox
git commit -m "chore(sandbox): add a profile view with the real profile mounts"
```

---

### Task 11: e2e 用例

**Files:**
- Modify: `tests/e2e/profile/review-notes-ui.spec.ts`

- [ ] **Step 1: 按新的输入框改用例**

打开文件，找到备注相关步骤：
- 如果用 `textarea` 选择器或 `locator('textarea')`，改成 `getByTestId('note-input')`。
- 保存方式改成 `getByTestId('note-input').press('Enter')`（点 `note-save-button` 的写法保留）。
- 断言「Ctrl+Enter 保存」提示文字的地方删掉（新界面没有这行）。

- [ ] **Step 2: 确认用例能被 Playwright 加载**

Run: `pnpm exec playwright test --list tests/e2e/profile/review-notes-ui.spec.ts | tail -3`
Expected: 列出用例、没有语法错误（这里跑不了真实 e2e）。

- [ ] **Step 3: 提交**

```bash
git add tests/e2e/profile/review-notes-ui.spec.ts
git commit -m "test(e2e): drive the note editor as a single-line field"
```

---

### Task 12: 验收

- [ ] `pnpm test` 全部通过；类型检查 75 个错误、没有新增；`pnpm exec plasmo build` 成功，`xh-ptagline`、`xh-popover` 在产物里。
- [ ] 沙盒「资料页」视图，三套风格 × X 三种背景逐一截图：标签、备注、叙事的尺寸、颜色、圆角和第 6 节一致；备注弹层在三套风格下外观正确。
- [ ] 浏览器里实测对比度：标签、备注、叙事正文对 X 页面背景至少 4.5:1；备注计数这类辅助文字至少 3:1。
- [ ] 键盘：Tab 到备注按钮有焦点描边；回车或空格打开弹层，焦点进输入框；回车保存，Esc 关闭并回到按钮。
- [ ] 关闭「显示官方标签」「备注」「叙事」三个设置项，对应部分消失。
