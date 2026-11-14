# UI 风格切换 · 阶段 1a（基础组件）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出面板会用到的基础组件（按钮、图标按钮、开关、分段控件、标签页、下拉、搜索框、可折叠分组、徽标、标签、头像、进度条），三套风格各自的样子都对，键盘和读屏可用，agent 能按名字操作。

**Architecture:** 组件是对 ui-sdk 的薄封装，放在 `src/ui/primitives/`，功能组件只从这里引用。样式写在 `src/css/primitives.css`，按 `xh-*` 类名和 ui-sdk 的状态属性（`data-checked`、`data-selected`、`data-open`）写；三套风格的差异挂在界面根节点的 `data-skin` 上（阶段 1 的 Task 0 已经加好）。整份样式包在 `@layer xh-primitives` 里，组件上另加的 Tailwind 类永远能覆盖默认样式。

**Tech Stack:** React 19、@ui-sdk/react 0.1.0-beta.1、Tailwind 3.4、Vitest + Testing Library。

对应设计文档：`docs/superpowers/specs/2026-11-14-xhunt-ui-skins-design.md`（第 4.3、5 节）。尺寸、圆角、字号取自画布（`A/B/C-profile.dc.html`、`A/B/C-pages.dc.html`、`xh-a/b/c.css`）。

---

## 已完成的前置（阶段 1 Task 0，commit 67edb06）

- Tailwind 变体 `soft:` / `obsidian:` / `native:`，匹配自身或祖先的 `[data-skin=…]`。
- `Main.tsx` 根节点和沙盒根节点挂 `data-skin`。

## 设计取舍

- **对比度优先于画布**：开关关闭态的轨道用 `--xh-fg-3`（画布是更浅的灰，只有 1.2–1.5:1，达不到控件边缘 3:1）；选中的分段和标签一律加粗，不只靠颜色区分。
- **原生的主按钮用黑白反色**：和 X 现在的「关注」按钮一致，也避开白字配 X 蓝只有 3:1 的问题。
- **画布没画的状态**：焦点环统一 2px `--xh-accent-fg`；禁用态半透明。
- **样式文件用 `@import` 并入 `style.css`**：已验证 Parcel 会把它内联进每份 `data-text:` 产物。

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/css/skin-tokens.css` | 新增 `--xh-hover`、`--xh-line-2`、`--xh-shadow-card`，黑曜另加 `--xh-rail` |
| `src/css/primitives.css` | 全部基础组件的样式，含三套风格的差异和关键帧 |
| `src/css/style.css` | 图层顺序 `@layer ui-sdk, xh-primitives;`，引入 `primitives.css` |
| `tailwind.config.js` | 新增 `xh-hover`、`xh-line-2` 颜色和 `shadow-xh-card` |
| `src/ui/icons.tsx` | 画布里的线性图标 |
| `src/ui/primitives/cx.ts` | 拼类名 |
| `src/ui/primitives/Button.tsx` | `Button`、`IconButton` |
| `src/ui/primitives/Switch.tsx` | 开关 |
| `src/ui/primitives/SegmentedControl.tsx` | 分段控件（原生风格下是胶囊筛选条） |
| `src/ui/primitives/Tabs.tsx` | `Tabs`、`TabList`、`TabPanel`，三种外观：分段、下划线、图标栏 |
| `src/ui/primitives/Select.tsx` | 下拉选择 |
| `src/ui/primitives/SearchField.tsx` | 搜索框，焦点在框内时挡住 X 的快捷键 |
| `src/ui/primitives/CollapsibleSection.tsx` | 可折叠分组 |
| `src/ui/primitives/Badge.tsx` | `Badge`、`Tag` |
| `src/ui/primitives/Avatar.tsx` | 头像，图片失败时显示首字母 |
| `src/ui/primitives/Meter.tsx` | 进度条 |
| `src/ui/primitives/index.ts` | 统一导出 |
| `dev/sandbox/Gallery.tsx` | 沙盒里的组件陈列页 |

---

### Task 1: 变量、图层和样式文件骨架

**Files:**
- Test: `src/ui/skin/skinTokens.test.ts`
- Modify: `src/css/skin-tokens.css`、`src/css/style.css:1`、`tailwind.config.js`
- Create: `src/css/primitives.css`

- [ ] **Step 1: 写失败的测试**

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/css/skin-tokens.css'), 'utf8');

const BLOCKS = [
  "html[data-xh-skin='soft'][data-xh-theme='light']",
  "html[data-xh-skin='soft'][data-xh-theme='dark']",
  "html[data-xh-skin='obsidian'][data-xh-theme='dark']",
  "html[data-xh-skin='obsidian'][data-xh-theme='light']",
  "html[data-xh-skin='native'][data-xh-palette='default']",
  "html[data-xh-skin='native'][data-xh-palette='dim']",
  "html[data-xh-skin='native'][data-xh-palette='lights-out']",
];

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is missing`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('skin tokens', () => {
  test.each(BLOCKS)('%s defines hover, strong line and card shadow', (selector) => {
    const body = block(selector);
    for (const token of ['--xh-hover:', '--xh-line-2:', '--xh-shadow-card:']) {
      expect(body).toContain(token);
    }
  });

  test('obsidian defines a rail background for both themes', () => {
    expect(block("html[data-xh-skin='obsidian'][data-xh-theme='dark']")).toContain('--xh-rail:');
    expect(block("html[data-xh-skin='obsidian'][data-xh-theme='light']")).toContain('--xh-rail:');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/skin/skinTokens.test.ts`
Expected: FAIL，7 个块都缺 `--xh-hover:`。

- [ ] **Step 3: 在 `src/css/skin-tokens.css` 的七个块里补变量**

每个块末尾（`}` 之前）加：

| 块 | 新增 |
|---|---|
| 柔光·浅 | `--xh-hover: #f0f0f0; --xh-line-2: #dedede; --xh-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.05);` |
| 柔光·深 | `--xh-hover: #262626; --xh-line-2: #363636; --xh-shadow-card: 0 0 0 1px rgba(255, 255, 255, 0.035);` |
| 黑曜·深 | `--xh-hover: rgba(255, 255, 255, 0.065); --xh-line-2: rgba(255, 255, 255, 0.13); --xh-shadow-card: inset 0 0 0 1px rgba(255, 255, 255, 0.075); --xh-rail: #070708;` |
| 黑曜·浅 | `--xh-hover: rgba(0, 0, 0, 0.05); --xh-line-2: rgba(0, 0, 0, 0.15); --xh-shadow-card: inset 0 0 0 1px rgba(0, 0, 0, 0.085); --xh-rail: #f4f4f5;` |
| 原生·浅色 | `--xh-hover: rgba(15, 20, 25, 0.035); --xh-line-2: #cfd9de; --xh-shadow-card: none;` |
| 原生·昏暗 | `--xh-hover: rgba(247, 249, 249, 0.035); --xh-line-2: #4c5c6b; --xh-shadow-card: none;` |
| 原生·纯黑 | `--xh-hover: rgba(231, 233, 234, 0.035); --xh-line-2: #536471; --xh-shadow-card: none;` |

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/skin/skinTokens.test.ts`
Expected: 8 passed。

- [ ] **Step 5: 新建 `src/css/primitives.css`（骨架：共用焦点环、关键帧、入场动画、减弱动效）**

```css
/* 基础组件：按 xh-* 类名和 ui-sdk 状态属性写；包在图层里，组件上另加的 Tailwind 类总能覆盖 */
@layer xh-primitives {
  .xh-btn:focus-visible,
  .xh-iconbtn:focus-visible,
  .xh-switch:focus-visible,
  .xh-select:focus-visible,
  .xh-collapsible-trigger:focus-visible {
    outline: 2px solid var(--xh-accent-fg);
    outline-offset: 2px;
  }

  .xh-seg-item:focus-visible,
  .xh-tabs-tab:focus-visible {
    outline: 2px solid var(--xh-accent-fg);
    outline-offset: -2px;
  }

  .xh-rise {
    animation: xh-rise var(--xh-d-lg) var(--xh-ease-out) both;
    animation-delay: calc(var(--xh-i, 0) * 40ms);
  }

  @keyframes xh-rise {
    from {
      opacity: 0;
      transform: translateY(var(--xh-rise));
      filter: blur(var(--xh-blur-in));
    }
  }

  @keyframes xh-badge {
    0% {
      opacity: 0;
      transform: scale(0.4);
    }
    60% {
      opacity: 1;
      transform: scale(1.12);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes xh-grow-x {
    from {
      transform: scaleX(0);
    }
  }

  @keyframes xh-pulse {
    50% {
      opacity: 0.55;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .xh-seg-indicator,
    .xh-tabs-indicator,
    .xh-switch-thumb {
      transition-duration: 1ms;
    }
  }
}
```

- [ ] **Step 6: `src/css/style.css` 第一行改为图层顺序并引入样式文件**

把第一行 `@layer ui-sdk;` 换成：

```css
@layer ui-sdk, xh-primitives;
@import './primitives.css';
```

- [ ] **Step 7: `tailwind.config.js` 补语义名**

`colors.xh` 里加 `hover: 'var(--xh-hover)'`、`'line-2': 'var(--xh-line-2)'`；`boxShadow` 里加 `'xh-card': 'var(--xh-shadow-card)'`。

- [ ] **Step 8: 跑全部测试，构建，Commit**

Run: `pnpm test`，Expected: 全部通过。
Run: `pnpm exec plasmo build && grep -c "xh-primitives" build/chrome-mv3-prod/Main.*.js`，Expected: 构建成功，计数大于 0。

```bash
git add src/css/skin-tokens.css src/css/primitives.css src/css/style.css tailwind.config.js src/ui/skin/skinTokens.test.ts
git commit -m "feat(ui): add primitive tokens, layer and stylesheet skeleton"
```

---

### Task 2: 图标和 `cx`

**Files:**
- Create: `src/ui/icons.tsx`、`src/ui/primitives/cx.ts`
- Test: `src/ui/icons.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { BellIcon, GripIcon, StarIcon } from './icons';
import { cx } from './primitives/cx';

describe('icons', () => {
  test('render decorative 24px-grid svgs at the requested size', () => {
    const { container } = render(<BellIcon size={18} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
  });

  test('filled icons use currentColor fill', () => {
    const { container } = render(
      <>
        <StarIcon />
        <GripIcon />
      </>,
    );
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('fill')).toBe('currentColor');
      expect(svg.getAttribute('stroke')).toBe('none');
    }
    expect(container.querySelectorAll('svg')[1].querySelectorAll('circle')).toHaveLength(6);
  });
});

describe('cx', () => {
  test('joins truthy class names', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/icons.test.tsx`
Expected: FAIL，找不到 `./icons`。

- [ ] **Step 3: 实现 `src/ui/primitives/cx.ts`**

```ts
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}
```

- [ ] **Step 4: 实现 `src/ui/icons.tsx`（路径来自画布）**

```tsx
import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function makeIcon(paths: ReactNode, filled = false) {
  return function Icon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        viewBox='0 0 24 24'
        width={size}
        height={size}
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={1.75}
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
        focusable='false'
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

const GRID = [6, 12, 18];

export const LogoIcon = makeIcon(
  <>
    <circle cx='12' cy='12' r='6.5' />
    <path d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5' />
  </>,
);
export const BellIcon = makeIcon(
  <>
    <path d='M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z' />
    <path d='M10 20.5a2 2 0 0 0 4 0' />
  </>,
);
export const SlidersIcon = makeIcon(
  <>
    <path d='M4 7h10M18 7h2M4 17h4M12 17h8' />
    <circle cx='16' cy='7' r='2' />
    <circle cx='10' cy='17' r='2' />
  </>,
);
export const GripIcon = makeIcon(
  <>
    {GRID.map((y) => (
      <g key={y}>
        <circle cx='9' cy={y} r='1.3' />
        <circle cx='15' cy={y} r='1.3' />
      </g>
    ))}
  </>,
  true,
);
export const MoreIcon = makeIcon(
  <>
    <circle cx='12' cy='5.5' r='1.3' />
    <circle cx='12' cy='12' r='1.3' />
    <circle cx='12' cy='18.5' r='1.3' />
  </>,
  true,
);
export const MinimizeIcon = makeIcon(<path d='M4 14h6v6M20 10h-6V4M14 10l6-6M4 20l6-6' />);
export const SidebarIcon = makeIcon(
  <>
    <rect x='4' y='4' width='16' height='16' rx='3' />
    <path d='M9 4v16' />
  </>,
);
export const PopOutIcon = makeIcon(
  <>
    <path d='M14 4h6v6M20 4l-8 8' />
    <path d='M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' />
  </>,
);
export const OverviewIcon = makeIcon(
  <>
    <rect x='4' y='4' width='7' height='7' rx='1.5' />
    <rect x='13' y='4' width='7' height='7' rx='1.5' />
    <rect x='4' y='13' width='7' height='7' rx='1.5' />
    <rect x='13' y='13' width='7' height='7' rx='1.5' />
  </>,
);
export const UsersIcon = makeIcon(
  <>
    <circle cx='9' cy='8' r='3.5' />
    <path d='M2.5 20a6.5 6.5 0 0 1 13 0' />
    <path d='M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6' />
  </>,
);
export const PortraitIcon = makeIcon(
  <>
    <path d='M12 3 21 9.5 17.5 20h-11L3 9.5 12 3Z' />
    <path d='M12 8.5l3.6 2.6-1.4 4.4H9.8L8.4 11.1 12 8.5Z' />
  </>,
);
export const StarIcon = makeIcon(
  <path d='m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z' />,
  true,
);
export const SparkleIcon = makeIcon(
  <path d='M12 3.5c.7 4.1 3.4 6.8 7.5 7.5-4.1.7-6.8 3.4-7.5 7.5-.7-4.1-3.4-6.8-7.5-7.5 4.1-.7 6.8-3.4 7.5-7.5Z' />,
);
export const SearchIcon = makeIcon(
  <>
    <circle cx='11' cy='11' r='7' />
    <path d='m20 20-3.5-3.5' />
  </>,
);
export const ChevronRightIcon = makeIcon(<path d='m9 6 6 6-6 6' />);
export const ChevronLeftIcon = makeIcon(<path d='m15 6-6 6 6 6' />);
export const ChevronDownIcon = makeIcon(<path d='m6 9 6 6 6-6' />);
export const ArrowLeftIcon = makeIcon(<path d='M19 12H5M11 6l-6 6 6 6' />);
export const CloseIcon = makeIcon(<path d='M18 6 6 18M6 6l12 12' />);
export const PlayIcon = makeIcon(<path d='M7 5v14l11-7L7 5Z' />);
export const InfoIcon = makeIcon(
  <>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 11v5M12 8h.01' />
  </>,
);
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/icons.test.tsx`
Expected: 3 passed。

```bash
git add src/ui/icons.tsx src/ui/icons.test.tsx src/ui/primitives/cx.ts
git commit -m "feat(ui): add canvas icon set and class helper"
```

---

### Task 3: `Button` 和 `IconButton`

**Files:**
- Create: `src/ui/primitives/Button.tsx`
- Test: `src/ui/primitives/Button.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { Button, IconButton } from './Button';

describe('Button', () => {
  test('renders a native button with its variant and size', async () => {
    const onClick = vi.fn();
    render(
      <Button variant='primary' size='sm' onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.dataset.variant).toBe('primary');
    expect(button.dataset.size).toBe('sm');
    expect(button.className).toContain('xh-btn');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('marks block buttons', () => {
    render(<Button block>Full</Button>);
    expect(screen.getByRole('button', { name: 'Full' }).hasAttribute('data-block')).toBe(true);
  });
});

describe('IconButton', () => {
  test('is named by its label and can show an unread dot', () => {
    const { container } = render(
      <IconButton label='Messages, unread' dot>
        <svg />
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Messages, unread' });
    expect(button.getAttribute('title')).toBe('Messages, unread');
    expect(container.querySelector('.xh-iconbtn-dot')).not.toBeNull();
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/Button.test.tsx`
Expected: FAIL，找不到 `./Button`。

- [ ] **Step 3: 实现 `src/ui/primitives/Button.tsx`**

```tsx
import { Button as UiButton } from '@ui-sdk/react/button';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

type UiButtonProps = Omit<ComponentProps<typeof UiButton>, 'className'>;

export type ButtonVariant = 'default' | 'primary' | 'soft' | 'inverse';

export interface ButtonProps extends UiButtonProps {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  className?: string;
}

export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <UiButton
      {...props}
      className={cx('xh-btn', className)}
      data-variant={variant}
      data-size={size}
      data-block={block ? '' : undefined}
    />
  );
}

export interface IconButtonProps extends Omit<UiButtonProps, 'children' | 'aria-label'> {
  label: string;
  children: ReactNode;
  dot?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

export function IconButton({
  label,
  dot = false,
  size = 'md',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <UiButton
      {...props}
      aria-label={label}
      title={label}
      className={cx('xh-iconbtn', className)}
      data-size={size}
    >
      {children}
      {dot ? <span aria-hidden='true' className='xh-iconbtn-dot' /> : null}
    </UiButton>
  );
}
```

- [ ] **Step 4: 追加样式到 `src/css/primitives.css`（放进 `@layer xh-primitives { … }` 内）**

```css
  .xh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--xh-line);
    border-radius: 10px;
    background: var(--xh-surface);
    color: var(--xh-fg);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition-property: background-color, border-color, color, box-shadow, transform;
    transition-duration: var(--xh-d-xs);
    transition-timing-function: var(--xh-ease-out);
  }
  .xh-btn:hover {
    border-color: var(--xh-line-2);
    background: var(--xh-hover);
  }
  .xh-btn:active {
    transform: scale(0.97);
  }
  .xh-btn:disabled,
  .xh-btn[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  .xh-btn[data-size='sm'] {
    height: 26px;
    padding: 0 9px;
    border-radius: 8px;
    font-size: 12px;
  }
  .xh-btn[data-block] {
    width: 100%;
  }
  .xh-btn[data-variant='primary'] {
    border-color: transparent;
    background: var(--xh-accent);
    color: var(--xh-on-accent);
  }
  .xh-btn[data-variant='primary']:hover {
    background: color-mix(in oklab, var(--xh-accent) 88%, black);
  }
  .xh-btn[data-variant='soft'] {
    border-color: transparent;
    background: var(--xh-accent-soft);
    color: var(--xh-accent-fg);
  }
  .xh-btn[data-variant='soft']:hover {
    background: color-mix(in oklab, var(--xh-accent-soft), var(--xh-accent) 12%);
  }
  .xh-btn[data-variant='inverse'] {
    border-color: transparent;
    background: var(--xh-fg);
    color: var(--xh-surface);
  }
  .xh-btn[data-variant='inverse']:hover {
    background: color-mix(in oklab, var(--xh-fg) 86%, var(--xh-surface));
  }

  [data-skin='obsidian'] .xh-btn {
    height: 30px;
    padding: 0 11px;
    border-color: transparent;
    border-radius: 8px;
    background: var(--xh-hover);
    box-shadow: inset 0 0 0 1px var(--xh-line);
  }
  [data-skin='obsidian'] .xh-btn:hover {
    background: color-mix(in oklab, var(--xh-fg) 10%, transparent);
    box-shadow: inset 0 0 0 1px var(--xh-line-2);
  }
  [data-skin='obsidian'] .xh-btn[data-size='sm'] {
    height: 26px;
    padding: 0 9px;
    border-radius: 7px;
    font-size: 12px;
  }
  [data-skin='obsidian'] .xh-btn[data-variant='primary'] {
    background: var(--xh-accent);
    color: var(--xh-on-accent);
    box-shadow: none;
  }
  [data-skin='obsidian'] .xh-btn[data-variant='primary']:hover {
    background: color-mix(in oklab, var(--xh-accent) 88%, white);
  }
  [data-skin='obsidian'] .xh-btn[data-variant='soft'] {
    background: var(--xh-hover);
    color: var(--xh-fg);
  }
  [data-skin='obsidian'] .xh-btn[data-variant='soft'] svg {
    color: var(--xh-accent);
  }
  [data-skin='obsidian'] .xh-btn[data-variant='inverse'] {
    background: var(--xh-fg);
    color: var(--xh-canvas);
    box-shadow: none;
  }

  [data-skin='native'] .xh-btn {
    padding: 0 16px;
    border-color: var(--xh-line-2);
    border-radius: 9999px;
    background: transparent;
    font-size: 14px;
    font-weight: 700;
  }
  [data-skin='native'] .xh-btn:active {
    transform: none;
  }
  [data-skin='native'] .xh-btn[data-size='sm'] {
    height: 28px;
    padding: 0 12px;
    border-radius: 9999px;
    font-size: 13px;
  }
  [data-skin='native'] .xh-btn[data-variant='primary'],
  [data-skin='native'] .xh-btn[data-variant='inverse'] {
    border-color: transparent;
    background: var(--xh-fg);
    color: var(--xh-surface);
  }
  [data-skin='native'] .xh-btn[data-variant='primary']:hover,
  [data-skin='native'] .xh-btn[data-variant='inverse']:hover {
    background: color-mix(in oklab, var(--xh-fg) 88%, var(--xh-surface));
  }
  [data-skin='native'] .xh-btn[data-variant='soft'] {
    border-color: var(--xh-line-2);
    background: transparent;
    color: var(--xh-fg);
  }

  .xh-iconbtn {
    position: relative;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--xh-fg-2);
    cursor: pointer;
    transition-property: background-color, color, transform;
    transition-duration: var(--xh-d-xs);
    transition-timing-function: var(--xh-ease-out);
  }
  .xh-iconbtn:hover {
    background: var(--xh-hover);
    color: var(--xh-fg);
  }
  .xh-iconbtn:active {
    transform: scale(0.94);
  }
  .xh-iconbtn[data-size='sm'] {
    width: 28px;
    height: 28px;
    border-radius: 9px;
  }
  .xh-iconbtn-dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 7px;
    height: 7px;
    border-radius: 9999px;
    background: #f04461;
    box-shadow: 0 0 0 2px var(--xh-canvas);
    animation: xh-badge var(--xh-d-xl) var(--xh-ease-pop) both;
  }
  [data-skin='obsidian'] .xh-iconbtn {
    border-radius: 9px;
  }
  [data-skin='obsidian'] .xh-iconbtn-dot {
    width: 6px;
    height: 6px;
    background: var(--xh-accent);
    animation: none;
  }
  [data-skin='native'] .xh-iconbtn {
    width: 34px;
    height: 34px;
    border-radius: 9999px;
    color: var(--xh-fg);
  }
  [data-skin='native'] .xh-iconbtn[data-size='sm'] {
    width: 30px;
    height: 30px;
  }
  [data-skin='native'] .xh-iconbtn:active {
    transform: none;
  }
  [data-skin='native'] .xh-iconbtn-dot {
    top: 6px;
    right: 6px;
    width: 8px;
    height: 8px;
    background: var(--xh-accent);
    animation: none;
  }
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/Button.test.tsx`
Expected: 3 passed。

```bash
git add src/ui/primitives/Button.tsx src/ui/primitives/Button.test.tsx src/css/primitives.css
git commit -m "feat(ui): add button and icon button primitives"
```

---

### Task 4: `Switch`

**Files:**
- Create: `src/ui/primitives/Switch.tsx`
- Test: `src/ui/primitives/Switch.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Switch } from './Switch';

function Labelled({ onChange }: { onChange: (v: boolean) => void }) {
  const [on, setOn] = useState(false);
  return (
    <label>
      Token analysis
      <Switch
        checked={on}
        onCheckedChange={(next) => {
          setOn(next);
          onChange(next);
        }}
        data-xhunt-testid='settings-toggle-showTokenAnalysis'
      />
    </label>
  );
}

describe('Switch', () => {
  test('is a switch named by its label and toggles with Space', async () => {
    const onChange = vi.fn();
    render(<Labelled onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Token analysis' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('settings-toggle-showTokenAnalysis')).toBe(toggle);
  });

  test('clicking the label toggles it', async () => {
    const onChange = vi.fn();
    render(<Labelled onChange={onChange} />);
    await userEvent.click(screen.getByText('Token analysis'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/Switch.test.tsx`
Expected: FAIL，找不到 `./Switch`。

- [ ] **Step 3: 实现 `src/ui/primitives/Switch.tsx`**

```tsx
import { Switch as UiSwitch, SwitchThumb } from '@ui-sdk/react/switch';
import type { ComponentProps } from 'react';
import { cx } from './cx';

export interface SwitchProps extends Omit<ComponentProps<typeof UiSwitch>, 'className' | 'children'> {
  className?: string;
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <UiSwitch {...props} className={cx('xh-switch', className)}>
      <SwitchThumb className='xh-switch-thumb' />
    </UiSwitch>
  );
}
```

- [ ] **Step 4: 追加样式**

```css
  .xh-switch {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 20px;
    padding: 0;
    border: 0;
    border-radius: 9999px;
    background: var(--xh-fg-3);
    cursor: pointer;
    transition: background-color var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-switch[data-checked] {
    background: var(--xh-accent);
  }
  .xh-switch[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .xh-switch-thumb {
    position: absolute;
    top: 2px;
    inset-inline-start: 2px;
    width: 16px;
    height: 16px;
    border-radius: 9999px;
    background: linear-gradient(#fff, #f3f3f3);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: translate var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-switch-thumb[data-checked] {
    translate: 14px 0;
  }
  .xh-switch-thumb[data-checked]:dir(rtl) {
    translate: -14px 0;
  }
  [data-skin='obsidian'] .xh-switch {
    width: 30px;
    height: 18px;
  }
  [data-skin='obsidian'] .xh-switch-thumb {
    width: 14px;
    height: 14px;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }
  [data-skin='obsidian'] .xh-switch-thumb[data-checked] {
    translate: 12px 0;
  }
  [data-skin='obsidian'] .xh-switch-thumb[data-checked]:dir(rtl) {
    translate: -12px 0;
  }
  [data-skin='native'] .xh-switch {
    width: 40px;
    height: 24px;
  }
  [data-skin='native'] .xh-switch-thumb {
    top: 3px;
    inset-inline-start: 3px;
    width: 18px;
    height: 18px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  }
  [data-skin='native'] .xh-switch-thumb[data-checked] {
    translate: 16px 0;
  }
  [data-skin='native'] .xh-switch-thumb[data-checked]:dir(rtl) {
    translate: -16px 0;
  }
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/Switch.test.tsx`
Expected: 2 passed。

```bash
git add src/ui/primitives/Switch.tsx src/ui/primitives/Switch.test.tsx src/css/primitives.css
git commit -m "feat(ui): add switch primitive"
```

---

### Task 5: `SegmentedControl`

**Files:**
- Create: `src/ui/primitives/SegmentedControl.tsx`
- Test: `src/ui/primitives/SegmentedControl.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

function Language() {
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  return (
    <>
      <SegmentedControl
        aria-label='Language'
        value={lang}
        onValueChange={setLang}
        options={[
          { value: 'en', label: 'EN', testId: 'settings-language-en' },
          { value: 'zh', label: '中', testId: 'settings-language-zh' },
        ]}
      />
      <output>{lang}</output>
    </>
  );
}

describe('SegmentedControl', () => {
  test('is a named radio group with the current value checked', () => {
    render(<Language />);
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '中' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('settings-language-en')).toBe(screen.getByRole('radio', { name: 'EN' }));
  });

  test('clicks and arrow keys change the value', async () => {
    render(<Language />);
    await userEvent.click(screen.getByRole('radio', { name: 'EN' }));
    expect(screen.getByRole('status').textContent).toBe('en');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status').textContent).toBe('zh');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/SegmentedControl.test.tsx`
Expected: FAIL，找不到 `./SegmentedControl`。

- [ ] **Step 3: 实现 `src/ui/primitives/SegmentedControl.tsx`**

```tsx
import {
  SegmentedControl as UiSegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  testId?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  'aria-label': string;
  size?: 'md' | 'sm';
  block?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  block = false,
  disabled,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <UiSegmentedControl
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as T);
      }}
      disabled={disabled}
      aria-label={rest['aria-label']}
      className={cx('xh-seg', className)}
      data-size={size}
      data-block={block ? '' : undefined}
    >
      <SegmentedControlIndicator className='xh-seg-indicator' />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className='xh-seg-item'
          data-xhunt-testid={option.testId}
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </UiSegmentedControl>
  );
}
```

- [ ] **Step 4: 追加样式**

```css
  .xh-seg {
    position: relative;
    display: inline-grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    isolation: isolate;
    padding: 3px;
    border-radius: 12px;
    background: var(--xh-sunken);
  }
  .xh-seg[data-block] {
    display: grid;
    width: 100%;
  }
  .xh-seg-indicator {
    position: absolute;
    z-index: 0;
    top: var(--segmented-control-indicator-top);
    left: 0;
    width: var(--segmented-control-indicator-width);
    height: var(--segmented-control-indicator-height);
    translate: var(--segmented-control-indicator-left) 0;
    border-radius: 9px;
    background: var(--xh-surface);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
    transition:
      translate var(--xh-d-sm) var(--xh-ease-pop),
      width var(--xh-d-sm) var(--xh-ease-pop);
  }
  .xh-seg-item {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 30px;
    padding: 0 12px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--xh-fg-2);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: color var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-seg-item:hover {
    color: var(--xh-fg);
  }
  .xh-seg-item[data-checked] {
    color: var(--xh-fg);
    font-weight: 600;
  }
  .xh-seg-item[data-disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .xh-seg[data-size='sm'] {
    padding: 2px;
    border-radius: 10px;
  }
  .xh-seg[data-size='sm'] .xh-seg-indicator {
    border-radius: 8px;
  }
  .xh-seg[data-size='sm'] .xh-seg-item {
    height: 26px;
    border-radius: 8px;
    font-size: 12px;
  }
  [data-skin='soft'][data-theme='dark'] .xh-seg-indicator {
    background: #2b2b2b;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
  }

  [data-skin='obsidian'] .xh-seg {
    padding: 2px;
    border-radius: 10px;
    background: var(--xh-raised);
    box-shadow: inset 0 0 0 1px var(--xh-line);
  }
  [data-skin='obsidian'] .xh-seg-indicator {
    border-radius: 7px;
    background: color-mix(in oklab, var(--xh-fg) 10%, transparent);
    box-shadow: none;
    transition-timing-function: var(--xh-ease-out);
  }
  [data-skin='obsidian'] .xh-seg-item {
    height: 26px;
    padding: 0 10px;
    border-radius: 7px;
    font-size: 12px;
  }

  [data-skin='native'] .xh-seg,
  [data-skin='native'] .xh-seg[data-block] {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 8px;
    width: auto;
    padding: 0;
    border-radius: 0;
    background: transparent;
  }
  [data-skin='native'] .xh-seg-indicator {
    display: none;
  }
  [data-skin='native'] .xh-seg-item {
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--xh-line-2);
    border-radius: 9999px;
    color: var(--xh-fg);
    font-size: 13px;
    font-weight: 600;
    transition: background-color var(--xh-d-xs) var(--xh-ease-out);
  }
  [data-skin='native'] .xh-seg-item:hover {
    background: var(--xh-hover);
  }
  [data-skin='native'] .xh-seg-item[data-checked] {
    border-color: transparent;
    background: var(--xh-fg);
    color: var(--xh-surface);
  }
  [data-skin='native'] .xh-seg[data-size='sm'] .xh-seg-item {
    height: 28px;
  }
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/SegmentedControl.test.tsx`
Expected: 2 passed。

```bash
git add src/ui/primitives/SegmentedControl.tsx src/ui/primitives/SegmentedControl.test.tsx src/css/primitives.css
git commit -m "feat(ui): add segmented control primitive"
```

---

### Task 6: `Tabs`

柔光用分段外观，原生用下划线，黑曜用竖排图标栏。图标栏的文字用 `sr-only` 藏起来，读屏和 agent 仍能读到名字。

**Files:**
- Create: `src/ui/primitives/Tabs.tsx`
- Test: `src/ui/primitives/Tabs.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { TabList, TabPanel, Tabs, type TabsVariant } from './Tabs';

type View = 'followers' | 'portrait' | 'reviews';

function Panel({ variant }: { variant: TabsVariant }) {
  const [view, setView] = useState<View>('followers');
  return (
    <Tabs value={view} onValueChange={setView} variant={variant}>
      <TabList
        aria-label='Panel sections'
        items={[
          { value: 'followers', label: 'Followers', icon: <svg />, testId: 'tab-followers' },
          { value: 'portrait', label: 'Portrait', icon: <svg /> },
          { value: 'reviews', label: 'Reviews', icon: <svg />, dot: true, spaceBefore: true },
        ]}
      />
      <TabPanel value='followers'>followers view</TabPanel>
      <TabPanel value='portrait'>portrait view</TabPanel>
      <TabPanel value='reviews'>reviews view</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  test('selects with clicks and arrow keys and shows the matching panel', async () => {
    render(<Panel variant='segmented' />);
    expect(screen.getByRole('tablist', { name: 'Panel sections' })).toBeTruthy();
    expect(screen.getByText('followers view')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Portrait' }));
    expect(screen.getByText('portrait view')).toBeTruthy();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Reviews' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('tab-followers')).toBe(screen.getByRole('tab', { name: 'Followers' }));
  });

  test('the rail is vertical and keeps names for icon-only tabs', async () => {
    const { container } = render(<Panel variant='rail' />);
    const list = screen.getByRole('tablist', { name: 'Panel sections' });
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    const tab = screen.getByRole('tab', { name: 'Portrait' });
    expect(tab.getAttribute('title')).toBe('Portrait');
    expect(tab.querySelector('.sr-only')?.textContent).toBe('Portrait');
    expect(container.querySelector('.xh-tabs-spacer')).not.toBeNull();
    tab.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Reviews' }).getAttribute('aria-selected')).toBe('true');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/Tabs.test.tsx`
Expected: FAIL，找不到 `./Tabs`。

- [ ] **Step 3: 实现 `src/ui/primitives/Tabs.tsx`**

```tsx
import { Tabs as UiTabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { createContext, Fragment, useContext, type ReactNode } from 'react';
import { cx } from './cx';

export type TabsVariant = 'segmented' | 'underline' | 'rail';

const VariantContext = createContext<TabsVariant>('segmented');

export interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  variant: TabsVariant;
  className?: string;
  children: ReactNode;
}

export function Tabs<T extends string>({ value, onValueChange, variant, className, children }: TabsProps<T>) {
  return (
    <VariantContext.Provider value={variant}>
      <UiTabs
        value={value}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next as T);
        }}
        orientation={variant === 'rail' ? 'vertical' : 'horizontal'}
        className={cx('xh-tabs', className)}
        data-variant={variant}
      >
        {children}
      </UiTabs>
    </VariantContext.Provider>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  dot?: boolean;
  spaceBefore?: boolean;
  testId?: string;
}

export interface TabListProps<T extends string> {
  items: readonly TabItem<T>[];
  'aria-label': string;
  className?: string;
}

export function TabList<T extends string>({ items, className, ...rest }: TabListProps<T>) {
  const iconOnly = useContext(VariantContext) === 'rail';
  return (
    <TabsList aria-label={rest['aria-label']} className={cx('xh-tabs-list', className)}>
      <TabsIndicator className='xh-tabs-indicator' />
      {items.map((item) => (
        <Fragment key={item.value}>
          {item.spaceBefore ? <span aria-hidden='true' className='xh-tabs-spacer' /> : null}
          <TabsTab
            value={item.value}
            title={iconOnly ? item.label : undefined}
            className='xh-tabs-tab'
            data-xhunt-testid={item.testId}
          >
            {item.icon}
            <span className={iconOnly ? 'sr-only' : undefined}>{item.label}</span>
            {item.dot ? <span aria-hidden='true' className='xh-tabs-dot' /> : null}
          </TabsTab>
        </Fragment>
      ))}
    </TabsList>
  );
}

export function TabPanel({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  return (
    <TabsPanel value={value} className={cx('xh-tabs-panel', className)}>
      {children}
    </TabsPanel>
  );
}
```

- [ ] **Step 4: 追加样式**

```css
  .xh-tabs-list {
    position: relative;
    display: flex;
    isolation: isolate;
  }
  .xh-tabs-tab {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    background: transparent;
    color: var(--xh-fg-2);
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }
  .xh-tabs-tab[data-selected] {
    color: var(--xh-fg);
  }
  .xh-tabs-tab > svg:not(:only-child) {
    display: none;
  }
  .xh-tabs[data-variant='rail'] .xh-tabs-tab > svg {
    display: block;
  }
  .xh-tabs-spacer {
    flex: 1;
  }
  .xh-tabs-dot {
    position: absolute;
    top: 7px;
    right: 7px;
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: var(--xh-accent);
    box-shadow: 0 0 0 2px var(--xh-rail, var(--xh-canvas));
  }

  .xh-tabs[data-variant='segmented'] .xh-tabs-list {
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    padding: 3px;
    border-radius: 12px;
    background: var(--xh-sunken);
  }
  .xh-tabs[data-variant='segmented'] .xh-tabs-indicator {
    position: absolute;
    z-index: 0;
    top: var(--active-tab-top);
    left: 0;
    width: var(--active-tab-width);
    height: var(--active-tab-height);
    translate: var(--active-tab-left) 0;
    border-radius: 9px;
    background: var(--xh-surface);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
    transition:
      translate var(--xh-d-sm) var(--xh-ease-pop),
      width var(--xh-d-sm) var(--xh-ease-pop);
  }
  .xh-tabs[data-variant='segmented'] .xh-tabs-tab {
    height: 30px;
    border-radius: 9px;
    font-size: 12.5px;
    font-weight: 500;
    transition: color var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-tabs[data-variant='segmented'] .xh-tabs-tab:hover,
  .xh-tabs[data-variant='segmented'] .xh-tabs-tab[data-selected] {
    color: var(--xh-fg);
  }
  .xh-tabs[data-variant='segmented'] .xh-tabs-tab[data-selected] {
    font-weight: 600;
  }
  [data-skin='soft'][data-theme='dark'] .xh-tabs[data-variant='segmented'] .xh-tabs-indicator {
    background: #2b2b2b;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
  }

  .xh-tabs[data-variant='underline'] .xh-tabs-list {
    border-bottom: 1px solid var(--xh-line);
  }
  .xh-tabs[data-variant='underline'] .xh-tabs-tab {
    flex: 1;
    height: 46px;
    font-size: 14px;
    font-weight: 500;
    transition:
      color var(--xh-d-xs) var(--xh-ease-out),
      background-color var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-tabs[data-variant='underline'] .xh-tabs-tab:hover {
    background: var(--xh-hover);
  }
  .xh-tabs[data-variant='underline'] .xh-tabs-tab[data-selected] {
    font-weight: 700;
  }
  .xh-tabs[data-variant='underline'] .xh-tabs-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    width: var(--active-tab-width);
    height: 4px;
    translate: var(--active-tab-left) 0;
    pointer-events: none;
    transition:
      translate var(--xh-d-sm) var(--xh-ease-out),
      width var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-tabs[data-variant='underline'] .xh-tabs-indicator::after {
    content: '';
    display: block;
    width: 44px;
    height: 4px;
    margin: 0 auto;
    border-radius: 4px;
    background: var(--xh-accent);
  }

  .xh-tabs[data-variant='rail'] .xh-tabs-list {
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .xh-tabs[data-variant='rail'] .xh-tabs-tab {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    color: var(--xh-fg-3);
    transition:
      color var(--xh-d-xs) var(--xh-ease-out),
      background-color var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-tabs[data-variant='rail'] .xh-tabs-tab:hover {
    background: var(--xh-raised);
    color: var(--xh-fg);
  }
  .xh-tabs[data-variant='rail'] .xh-tabs-tab[data-selected] {
    color: var(--xh-fg);
  }
  .xh-tabs[data-variant='rail'] .xh-tabs-indicator {
    position: absolute;
    z-index: 0;
    top: 0;
    left: var(--active-tab-left);
    width: var(--active-tab-width);
    height: var(--active-tab-height);
    translate: 0 var(--active-tab-top);
    border-radius: 10px;
    background: var(--xh-hover);
    box-shadow: inset 0 0 0 1px var(--xh-line);
    transition: translate var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-tabs[data-variant='rail'] .xh-tabs-indicator::before {
    content: '';
    position: absolute;
    top: 10px;
    bottom: 10px;
    left: -7px;
    width: 2px;
    border-radius: 2px;
    background: var(--xh-accent);
  }
```

说明：`.xh-tabs-tab > svg:not(:only-child)` 让分段和下划线外观只显示文字（图标只在图标栏里显示），同一份 `items` 三套风格都能用。

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/Tabs.test.tsx`
Expected: 2 passed。

```bash
git add src/ui/primitives/Tabs.tsx src/ui/primitives/Tabs.test.tsx src/css/primitives.css
git commit -m "feat(ui): add tabs primitive with segmented, underline and rail looks"
```

---

### Task 7: `Select`

**Files:**
- Create: `src/ui/primitives/Select.tsx`
- Test: `src/ui/primitives/Select.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { Select } from './Select';

const SOUNDS = [
  { value: 's1', label: 'Sound 1' },
  { value: 's8', label: 'Sound 8' },
] as const;

function Sound() {
  const [sound, setSound] = useState<'s1' | 's8'>('s8');
  return (
    <>
      <Select aria-label='Notification sound' value={sound} onValueChange={setSound} options={SOUNDS} />
      <output>{sound}</output>
    </>
  );
}

describe('Select', () => {
  test('the trigger is named and shows the selected label before opening', () => {
    render(<Sound />);
    const trigger = screen.getByRole('combobox', { name: 'Notification sound' });
    expect(trigger.textContent).toContain('Sound 8');
  });

  test('choosing an option changes the value', async () => {
    render(<Sound />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Notification sound' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Sound 1' }));
    expect(screen.getByRole('status').textContent).toBe('s1');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/Select.test.tsx`
Expected: FAIL，找不到 `./Select`。

- [ ] **Step 3: 实现 `src/ui/primitives/Select.tsx`**

```tsx
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import { ChevronDownIcon } from '../icons';
import { cx } from './cx';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  value: T | null;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  'aria-label': string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  testId,
  ...rest
}: SelectProps<T>) {
  return (
    <UiSelect
      items={options.map((option) => ({ value: option.value, label: option.label }))}
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onValueChange(next as T);
      }}
      placeholder={placeholder}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={rest['aria-label']}
        className={cx('xh-select', className)}
        data-xhunt-testid={testId}
      >
        <SelectValue className='xh-select-value' />
        <ChevronDownIcon size={12} className='xh-select-chevron' />
      </SelectTrigger>
      <SelectContent className='xh-select-content'>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className='xh-select-item'>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UiSelect>
  );
}
```

- [ ] **Step 4: 追加样式**

```css
  .xh-select {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px 0 10px;
    border: 1px solid var(--xh-line);
    border-radius: 9px;
    background: var(--xh-surface);
    color: var(--xh-fg);
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: border-color var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-select:hover,
  .xh-select[data-open] {
    border-color: var(--xh-line-2);
  }
  .xh-select-chevron {
    color: var(--xh-fg-3);
    transition: rotate var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-select[data-open] .xh-select-chevron {
    rotate: 180deg;
  }
  .xh-select-content {
    min-width: var(--anchor-width);
    max-height: min(280px, var(--available-height));
    overflow-y: auto;
    padding: 4px;
    border-radius: 12px;
    background: var(--xh-surface);
    box-shadow: var(--xh-shadow-pop);
    color: var(--xh-fg);
    font-family: var(--xh-font-ui);
    font-size: 12.5px;
    transition:
      opacity var(--xh-d-xs) var(--xh-ease-out),
      translate var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-select-content[data-starting-style],
  .xh-select-content[data-ending-style] {
    opacity: 0;
    translate: 0 -4px;
  }
  .xh-select-item {
    display: flex;
    align-items: center;
    height: 30px;
    padding: 0 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .xh-select-item[data-highlighted] {
    background: var(--xh-hover);
  }
  .xh-select-item[data-selected] {
    color: var(--xh-accent-fg);
    font-weight: 600;
  }
  [data-skin='obsidian'] .xh-select {
    height: 26px;
    padding: 0 6px 0 9px;
    border-color: transparent;
    border-radius: 7px;
    background: var(--xh-raised);
    box-shadow: inset 0 0 0 1px var(--xh-line);
    font-size: 11.5px;
  }
  [data-skin='obsidian'] .xh-select-content {
    border-radius: 10px;
  }
  [data-skin='native'] .xh-select {
    height: 32px;
    padding: 0 10px 0 14px;
    border-color: var(--xh-line-2);
    border-radius: 9999px;
    background: transparent;
    font-size: 14px;
    font-weight: 400;
  }
  [data-skin='native'] .xh-select-content {
    padding: 0;
    border-radius: 12px;
  }
  [data-skin='native'] .xh-select-item {
    height: 40px;
    padding: 0 16px;
    border-radius: 0;
    font-size: 15px;
  }
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/Select.test.tsx`
Expected: 2 passed。

```bash
git add src/ui/primitives/Select.tsx src/ui/primitives/Select.test.tsx src/css/primitives.css
git commit -m "feat(ui): add select primitive"
```

---

### Task 8: `SearchField`

焦点在搜索框里时，在 window 捕获阶段拦下按键，X 的快捷键（如 `j`、`/`、Enter）就不会触发；Enter 由组件自己执行 `onSubmit`。输入法组字过程中不拦截。

**Files:**
- Create: `src/ui/primitives/SearchField.tsx`
- Test: `src/ui/primitives/SearchField.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SearchField } from './SearchField';

function Search({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <SearchField aria-label='Search settings' placeholder='Search' value={q} onValueChange={setQ} onSubmit={onSubmit} shortcut='/' />
  );
}

describe('SearchField', () => {
  const xShortcut = vi.fn();
  afterEach(() => {
    document.removeEventListener('keydown', xShortcut, true);
    xShortcut.mockReset();
  });

  test('typing updates the value and Enter submits it', async () => {
    const onSubmit = vi.fn();
    render(<Search onSubmit={onSubmit} />);
    const input = screen.getByRole('searchbox', { name: 'Search settings' });
    await userEvent.type(input, 'avatar');
    expect((input as HTMLInputElement).value).toBe('avatar');
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('avatar');
  });

  test('keys typed in the field never reach page shortcuts', () => {
    document.addEventListener('keydown', xShortcut, true);
    render(<Search onSubmit={() => {}} />);
    const input = screen.getByRole('searchbox', { name: 'Search settings' });
    fireEvent.keyDown(input, { key: 'j' });
    expect(xShortcut).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'j' });
    expect(xShortcut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/SearchField.test.tsx`
Expected: FAIL，找不到 `./SearchField`。

- [ ] **Step 3: 实现 `src/ui/primitives/SearchField.tsx`**

```tsx
import { Input } from '@ui-sdk/react/input';
import { useEffect, useRef } from 'react';
import { SearchIcon } from '../icons';
import { cx } from './cx';

export interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  'aria-label': string;
  shortcut?: string;
  onSubmit?: (value: string) => void;
  className?: string;
  testId?: string;
}

export function SearchField({
  value,
  onValueChange,
  placeholder,
  shortcut,
  onSubmit,
  className,
  testId,
  ...rest
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    // X 的快捷键挂在 document 捕获阶段，window 捕获阶段更早，在这里挡住才来得及
    const guard = (event: KeyboardEvent) => {
      const input = inputRef.current;
      if (!input || event.isComposing || !event.composedPath().includes(input)) return;
      event.stopImmediatePropagation();
      if (event.type === 'keydown' && event.key === 'Enter') {
        event.preventDefault();
        onSubmitRef.current?.(input.value);
      }
    };
    const types = ['keydown', 'keypress', 'keyup'] as const;
    types.forEach((type) => window.addEventListener(type, guard, true));
    return () => types.forEach((type) => window.removeEventListener(type, guard, true));
  }, []);

  return (
    <label className={cx('xh-search', className)}>
      <SearchIcon size={14} className='xh-search-icon' />
      <Input
        ref={inputRef}
        type='search'
        value={value}
        onValueChange={(next) => onValueChange(next)}
        placeholder={placeholder}
        aria-label={rest['aria-label']}
        className='xh-search-input'
        data-xhunt-testid={testId}
      />
      {shortcut ? (
        <kbd aria-hidden='true' className='xh-kbd'>
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
```

- [ ] **Step 4: 追加样式**

```css
  .xh-search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 10px;
    border-radius: 11px;
    background: var(--xh-surface);
    box-shadow: 0 0 0 1px var(--xh-line);
    color: var(--xh-fg-3);
    font-size: 12.5px;
    cursor: text;
    transition: box-shadow var(--xh-d-xs) var(--xh-ease-out);
  }
  .xh-search:focus-within {
    box-shadow: 0 0 0 1.5px var(--xh-accent), 0 0 0 4px var(--xh-accent-soft);
  }
  .xh-search-icon {
    flex-shrink: 0;
  }
  .xh-search-input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--xh-fg);
    font: inherit;
  }
  .xh-search-input::placeholder {
    color: var(--xh-fg-3);
  }
  .xh-search-input::-webkit-search-cancel-button {
    display: none;
  }
  .xh-kbd {
    display: inline-grid;
    place-items: center;
    height: 18px;
    min-width: 18px;
    margin-inline-start: auto;
    padding: 0 5px;
    border-radius: 5px;
    background: var(--xh-hover);
    box-shadow: inset 0 -1px 0 var(--xh-line);
    color: var(--xh-fg-2);
    font: 500 10.5px var(--xh-font-mono);
  }
  [data-skin='obsidian'] .xh-search {
    height: 32px;
    padding: 0 7px 0 10px;
    border-radius: 9px;
    background: var(--xh-raised);
    box-shadow: inset 0 0 0 1px var(--xh-line);
  }
  [data-skin='obsidian'] .xh-search:hover {
    box-shadow: inset 0 0 0 1px var(--xh-line-2);
  }
  [data-skin='obsidian'] .xh-search:focus-within {
    box-shadow: inset 0 0 0 1px var(--xh-accent), 0 0 0 3px var(--xh-accent-soft);
  }
  [data-skin='native'] .xh-search {
    gap: 10px;
    height: 40px;
    padding: 0 14px;
    border-radius: 9999px;
    background: var(--xh-surface);
    box-shadow: inset 0 0 0 1px var(--xh-line);
    color: var(--xh-fg-2);
    font-size: 15px;
  }
  [data-skin='native'] .xh-search:focus-within {
    box-shadow: inset 0 0 0 2px var(--xh-accent);
  }
  [data-skin='native'] .xh-search-input::placeholder {
    color: var(--xh-fg-2);
  }
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/SearchField.test.tsx`
Expected: 2 passed。

```bash
git add src/ui/primitives/SearchField.tsx src/ui/primitives/SearchField.test.tsx src/css/primitives.css
git commit -m "feat(ui): add search field that shields x shortcuts"
```

---

### Task 9: `CollapsibleSection`

**Files:**
- Create: `src/ui/primitives/CollapsibleSection.tsx`
- Test: `src/ui/primitives/CollapsibleSection.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { CollapsibleSection } from './CollapsibleSection';

function Group() {
  const [open, setOpen] = useState(true);
  return (
    <CollapsibleSection title='General' open={open} onOpenChange={setOpen} testId='settings-group-others' triggerTestId='settings-group-header-others'>
      <p>Language row</p>
    </CollapsibleSection>
  );
}

describe('CollapsibleSection', () => {
  test('the header is a button that reports and toggles its state', async () => {
    render(<Group />);
    const trigger = screen.getByRole('button', { name: 'General' });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('settings-group-header-others')).toBe(trigger);
    expect(screen.getByText('Language row')).toBeTruthy();
    await userEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/CollapsibleSection.test.tsx`
Expected: FAIL，找不到 `./CollapsibleSection`。

- [ ] **Step 3: 实现 `src/ui/primitives/CollapsibleSection.tsx`**

```tsx
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from '../icons';
import { cx } from './cx';

export interface CollapsibleSectionProps {
  title: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  testId?: string;
  triggerTestId?: string;
}

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
  className,
  testId,
  triggerTestId,
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      className={cx('xh-collapsible', className)}
      data-xhunt-testid={testId}
    >
      <CollapsibleTrigger className='xh-collapsible-trigger' data-xhunt-testid={triggerTestId}>
        <span className='xh-collapsible-title'>{title}</span>
        <ChevronDownIcon size={14} className='xh-collapsible-chevron' />
      </CollapsibleTrigger>
      <CollapsiblePanel className='xh-collapsible-panel'>{children}</CollapsiblePanel>
    </Collapsible>
  );
}
```

- [ ] **Step 4: 追加样式**

```css
  .xh-collapsible-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 0 6px;
    border: 0;
    background: transparent;
    color: var(--xh-fg);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    text-align: start;
    cursor: pointer;
  }
  .xh-collapsible-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .xh-collapsible-chevron {
    flex-shrink: 0;
    margin-inline-start: auto;
    color: var(--xh-fg-3);
    transition: rotate var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-collapsible-trigger[data-open] .xh-collapsible-chevron {
    rotate: 180deg;
  }
  .xh-collapsible-panel {
    height: var(--collapsible-panel-height);
    overflow: hidden;
    transition:
      height var(--xh-d-sm) var(--xh-ease-out),
      opacity var(--xh-d-sm) var(--xh-ease-out);
  }
  .xh-collapsible-panel[data-starting-style],
  .xh-collapsible-panel[data-ending-style] {
    height: 0;
    opacity: 0;
  }
```

- [ ] **Step 5: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/CollapsibleSection.test.tsx`
Expected: 1 passed。

```bash
git add src/ui/primitives/CollapsibleSection.tsx src/ui/primitives/CollapsibleSection.test.tsx src/css/primitives.css
git commit -m "feat(ui): add collapsible section primitive"
```

---

### Task 10: `Badge`、`Tag`、`Avatar`、`Meter`

**Files:**
- Create: `src/ui/primitives/Badge.tsx`、`src/ui/primitives/Avatar.tsx`、`src/ui/primitives/Meter.tsx`
- Test: `src/ui/primitives/display.test.tsx`
- Modify: `src/css/primitives.css`（追加）

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AVATAR_COLORS, Avatar, avatarColor, initials } from './Avatar';
import { Badge, Tag } from './Badge';
import { Meter } from './Meter';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

describe('Badge and Tag', () => {
  test('carry their tone', () => {
    render(
      <>
        <Badge tone='up'>↑12</Badge>
        <Tag>DeFi</Tag>
      </>,
    );
    expect(screen.getByText('↑12').dataset.tone).toBe('up');
    expect(screen.getByText('DeFi').className).toContain('xh-tag');
  });
});

describe('Avatar', () => {
  test('falls back to initials without an image', () => {
    render(<Avatar name='Mira Chen' size='md' />);
    expect(screen.getByText('MC')).toBeTruthy();
  });

  test('initials handle handles, single words and CJK names', () => {
    expect(initials('@mira_onchain')).toBe('MO');
    expect(initials('米拉')).toBe('米拉');
    expect(initials('  ')).toBe('?');
  });

  test('picks a stable colour that keeps white initials readable', () => {
    expect(avatarColor('Mira Chen')).toBe(avatarColor('Mira Chen'));
    for (const colour of AVATAR_COLORS) {
      expect(1.05 / (luminance(colour) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Meter', () => {
  test('is a named meter with its value', () => {
    render(<Meter label='DeFi' value={86} />);
    const meter = screen.getByRole('meter', { name: 'DeFi' });
    expect(meter.getAttribute('aria-valuenow')).toBe('86');
  });
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/display.test.tsx`
Expected: FAIL，找不到 `./Avatar`。

- [ ] **Step 3: 实现 `src/ui/primitives/Badge.tsx`**

```tsx
import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'accent' | 'up' | 'down' | 'warn' | 'inverse';

export function Badge({ tone = 'neutral', className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cx('xh-badge', className)} data-tone={tone}>
      {children}
    </span>
  );
}

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx('xh-tag', className)}>{children}</span>;
}
```

- [ ] **Step 4: 实现 `src/ui/primitives/Avatar.tsx`**

```tsx
import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@ui-sdk/react/avatar';
import type { CSSProperties } from 'react';
import { cx } from './cx';

export const AVATAR_COLORS = [
  '#4f5d75',
  '#5b6b82',
  '#6a5a8c',
  '#3f6b5c',
  '#7a5644',
  '#4f6a8f',
  '#82576b',
  '#3d6574',
] as const;

export function avatarColor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name: string) {
  const words = name.trim().replace(/^@/, '').split(/[\s_.-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return (Array.from(words[0])[0] + Array.from(words[1])[0]).toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'lg' | 'md' | 'sm' | 'xs';
  className?: string;
}

export function Avatar({ name, src, size = 'lg', className }: AvatarProps) {
  return (
    <UiAvatar
      className={cx('xh-avatar', className)}
      data-size={size}
      style={{ '--xh-av': avatarColor(name) } as CSSProperties}
    >
      {src ? <AvatarImage src={src} alt='' className='xh-avatar-img' /> : null}
      <AvatarFallback className='xh-avatar-fallback'>{initials(name)}</AvatarFallback>
    </UiAvatar>
  );
}
```

- [ ] **Step 5: 实现 `src/ui/primitives/Meter.tsx`**

```tsx
import { Meter as UiMeter, MeterIndicator, MeterTrack } from '@ui-sdk/react/meter';
import { cx } from './cx';

export interface MeterProps {
  value: number;
  max?: number;
  label: string;
  tone?: 'accent' | 'up' | 'warn';
  className?: string;
}

export function Meter({ value, max = 100, label, tone = 'accent', className }: MeterProps) {
  return (
    <UiMeter value={value} max={max} aria-label={label} className={cx('xh-meter', className)} data-tone={tone}>
      <MeterTrack className='xh-meter-track'>
        <MeterIndicator className='xh-meter-indicator' />
      </MeterTrack>
    </UiMeter>
  );
}
```

- [ ] **Step 6: 追加样式**

```css
  .xh-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--xh-sunken);
    color: var(--xh-fg-2);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    white-space: nowrap;
  }
  .xh-badge[data-tone='accent'] {
    background: var(--xh-accent-soft);
    color: var(--xh-accent-fg);
  }
  .xh-badge[data-tone='up'] {
    background: var(--xh-up-bg);
    color: var(--xh-up);
  }
  .xh-badge[data-tone='down'] {
    background: var(--xh-down-bg);
    color: var(--xh-down);
  }
  .xh-badge[data-tone='warn'] {
    background: var(--xh-warn-bg);
    color: var(--xh-warn);
  }
  .xh-badge[data-tone='inverse'] {
    background: var(--xh-fg);
    color: var(--xh-surface);
  }
  [data-skin='obsidian'] .xh-badge {
    border-radius: 9999px;
    font-weight: 500;
  }
  [data-skin='obsidian'] .xh-badge[data-tone='neutral'] {
    background: var(--xh-hover);
  }
  [data-skin='native'] .xh-badge {
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
  }

  .xh-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 8px;
    border-radius: 9999px;
    background: var(--xh-sunken);
    color: var(--xh-fg-2);
    font-size: 11.5px;
    font-weight: 500;
    white-space: nowrap;
  }
  [data-skin='obsidian'] .xh-tag {
    height: 20px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--xh-hover);
    font-size: 11px;
  }
  [data-skin='native'] .xh-tag {
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--xh-line-2);
    background: transparent;
    color: var(--xh-fg);
    font-size: 13px;
    font-weight: 600;
  }

  .xh-avatar {
    position: relative;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    overflow: hidden;
    border-radius: 9999px;
    background: var(--xh-av, #5b6b82);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    user-select: none;
  }
  .xh-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .xh-avatar-fallback {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }
  .xh-avatar[data-size='md'] {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  .xh-avatar[data-size='sm'] {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
  .xh-avatar[data-size='xs'] {
    width: 20px;
    height: 20px;
    font-size: 9px;
  }
  [data-skin='obsidian'] .xh-avatar {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  [data-skin='obsidian'] .xh-avatar[data-size='md'] {
    width: 30px;
    height: 30px;
    font-size: 11px;
  }
  [data-skin='obsidian'] .xh-avatar[data-size='sm'] {
    width: 22px;
    height: 22px;
    font-size: 9.5px;
  }
  [data-skin='native'] .xh-avatar {
    font-weight: 700;
  }

  .xh-meter {
    display: block;
    width: 100%;
  }
  .xh-meter-track {
    position: relative;
    height: 6px;
    overflow: hidden;
    border-radius: 9999px;
    background: var(--xh-sunken);
  }
  .xh-meter-indicator {
    height: 100%;
    border-radius: 9999px;
    background: var(--xh-accent);
    transform-origin: left;
    animation: xh-grow-x var(--xh-d-xl) var(--xh-ease-out) both;
  }
  .xh-meter[data-tone='up'] .xh-meter-indicator {
    background: var(--xh-up);
  }
  .xh-meter[data-tone='warn'] .xh-meter-indicator {
    background: #f2b01e;
  }
  [data-skin='obsidian'] .xh-meter-track {
    height: 4px;
    background: color-mix(in oklab, var(--xh-fg) 10%, transparent);
  }
  [data-skin='obsidian'] .xh-meter[data-tone='warn'] .xh-meter-indicator {
    background: var(--xh-warn);
  }
  [data-skin='native'] .xh-meter-track {
    height: 4px;
  }
  [data-skin='native'] .xh-meter[data-tone='warn'] .xh-meter-indicator {
    background: #f5b301;
  }
```

- [ ] **Step 7: 确认通过，Commit**

Run: `pnpm test src/ui/primitives/display.test.tsx`
Expected: 5 passed。

```bash
git add src/ui/primitives/Badge.tsx src/ui/primitives/Avatar.tsx src/ui/primitives/Meter.tsx src/ui/primitives/display.test.tsx src/css/primitives.css
git commit -m "feat(ui): add badge, tag, avatar and meter primitives"
```

---

### Task 11: 统一导出和 agent 测试

**Files:**
- Create: `src/ui/primitives/index.ts`
- Test: `src/ui/primitives/primitives.agent.test.tsx`

- [ ] **Step 1: 写失败的测试**

```tsx
import { render, screen } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { useState } from 'react';
import { expect, test } from 'vitest';
import {
  Button,
  CollapsibleSection,
  IconButton,
  SearchField,
  SegmentedControl,
  Select,
  Switch,
  TabList,
  TabPanel,
  Tabs,
} from './index';

const agent = createAgent();

function Settings() {
  const [tab, setTab] = useState<'general' | 'avatar'>('general');
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [sound, setSound] = useState<'s1' | 's8'>('s8');
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');
  return (
    <div>
      <IconButton label='Close panel'>
        <svg />
      </IconButton>
      <SearchField aria-label='Search settings' placeholder='Search' value={q} onValueChange={setQ} />
      <Tabs value={tab} onValueChange={setTab} variant='segmented'>
        <TabList
          aria-label='Settings sections'
          items={[
            { value: 'general', label: 'General' },
            { value: 'avatar', label: 'Avatar rank' },
          ]}
        />
        <TabPanel value='general'>
          <CollapsibleSection title='Common' open={open} onOpenChange={setOpen}>
            <SegmentedControl aria-label='Language' value={lang} onValueChange={setLang} options={[{ value: 'en', label: 'EN' }, { value: 'zh', label: '中' }]} />
            <Select aria-label='Notification sound' value={sound} onValueChange={setSound} options={[{ value: 's1', label: 'Sound 1' }, { value: 's8', label: 'Sound 8' }]} />
            <label>
              Token analysis
              <Switch checked={on} onCheckedChange={setOn} />
            </label>
          </CollapsibleSection>
        </TabPanel>
        <TabPanel value='avatar'>avatar</TabPanel>
      </Tabs>
      <Button variant='primary'>Clear cache</Button>
    </div>
  );
}

test('an agent can find and use every primitive by name', async () => {
  render(<Settings />);
  const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== 'more');
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
  }
  const labels = components.map((entry) => entry.label);
  for (const label of ['Close panel', 'Search settings', 'Settings sections', 'Common', 'Language', 'Notification sound', 'Token analysis', 'Clear cache']) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label);
  }

  const result = await agent.act({
    steps: [
      { ref: 'Language', action: 'setValue', args: ['en'] },
      { ref: 'Notification sound', action: 'setValue', args: ['s1'] },
      { ref: 'Token analysis', action: 'setChecked', args: [false] },
      { ref: 'Search settings', action: 'setValue', args: ['avatar'] },
    ],
  });
  expect(result.ok, result.error?.message).toBe(true);
  expect(screen.getByRole('radio', { name: 'EN' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('switch', { name: 'Token analysis' }).getAttribute('aria-checked')).toBe('false');
  expect((screen.getByRole('searchbox', { name: 'Search settings' }) as HTMLInputElement).value).toBe('avatar');
});
```

- [ ] **Step 2: 确认失败**

Run: `pnpm test src/ui/primitives/primitives.agent.test.tsx`
Expected: FAIL，找不到 `./index`。

- [ ] **Step 3: 实现 `src/ui/primitives/index.ts`**

```ts
export { Avatar, avatarColor, initials } from './Avatar';
export { Badge, Tag, type BadgeTone } from './Badge';
export { Button, IconButton, type ButtonVariant } from './Button';
export { CollapsibleSection } from './CollapsibleSection';
export { cx } from './cx';
export { Meter } from './Meter';
export { SearchField } from './SearchField';
export { SegmentedControl, type SegmentedOption } from './SegmentedControl';
export { Select, type SelectOption } from './Select';
export { Switch } from './Switch';
export { TabList, TabPanel, Tabs, type TabItem, type TabsVariant } from './Tabs';
```

- [ ] **Step 4: 确认通过**

Run: `pnpm test src/ui/primitives/primitives.agent.test.tsx`
Expected: 1 passed。某个 `act` 步骤失败时，按 `result.error.message` 里给出的动作名（例如开关的动作若不叫 `setChecked`）修正步骤，再跑。

- [ ] **Step 5: Commit**

```bash
git add src/ui/primitives/index.ts src/ui/primitives/primitives.agent.test.tsx
git commit -m "test(ui): prove primitives are agent-ready"
```

---

### Task 12: 沙盒陈列页和浏览器核对

**Files:**
- Create: `dev/sandbox/Gallery.tsx`
- Modify: `dev/sandbox/main.tsx`

- [ ] **Step 1: 写 `dev/sandbox/Gallery.tsx`**

```tsx
import { useState } from 'react';
import {
  BellIcon,
  OverviewIcon,
  PortraitIcon,
  SlidersIcon,
  SparkleIcon,
  StarIcon,
  UsersIcon,
} from '~/ui/icons';
import {
  Avatar,
  Badge,
  Button,
  CollapsibleSection,
  IconButton,
  Meter,
  SearchField,
  SegmentedControl,
  Select,
  Switch,
  Tag,
  TabList,
  TabPanel,
  Tabs,
} from '~/ui/primitives';

type View = 'overview' | 'followers' | 'portrait' | 'reviews';

const VIEWS = [
  { value: 'overview', label: '概览', icon: <OverviewIcon size={18} /> },
  { value: 'followers', label: '关注者', icon: <UsersIcon size={18} /> },
  { value: 'portrait', label: '画像', icon: <PortraitIcon size={18} /> },
  { value: 'reviews', label: '点评', icon: <StarIcon size={18} />, dot: true },
] as const;

const row = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;

export function Gallery() {
  const [view, setView] = useState<View>('followers');
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [sound, setSound] = useState<'s1' | 's8'>('s8');
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--xh-fg)', fontSize: 13 }}>
      <div style={row}>
        <Button>默认</Button>
        <Button variant='primary'>主要</Button>
        <Button variant='soft'>
          <SparkleIcon size={14} />问 AI
        </Button>
        <Button variant='inverse'>反色</Button>
        <Button size='sm'>小按钮</Button>
      </div>
      <div style={row}>
        <IconButton label='消息，有未读' dot>
          <BellIcon />
        </IconButton>
        <IconButton label='设置'>
          <SlidersIcon />
        </IconButton>
        <label style={row}>
          开启 <Switch checked={on} onCheckedChange={setOn} />
        </label>
        <label style={row}>
          关闭 <Switch checked={off} onCheckedChange={setOff} />
        </label>
      </div>
      <SearchField aria-label='搜索设置' placeholder='搜索设置，例如「头像排名」' value={q} onValueChange={setQ} shortcut='/' />
      <div style={row}>
        <SegmentedControl aria-label='语言' value={lang} onValueChange={setLang} size='sm' options={[{ value: 'en', label: 'EN' }, { value: 'zh', label: '中' }]} />
        <Select aria-label='提示音效' value={sound} onValueChange={setSound} options={[{ value: 's1', label: '音频 1' }, { value: 's8', label: '音频 8' }]} />
      </div>
      <SegmentedControl
        aria-label='KOL 范围'
        block
        value={view === 'overview' ? 'followers' : view}
        onValueChange={(v) => setView(v)}
        options={[
          { value: 'followers', label: '全球 1.2K' },
          { value: 'portrait', label: '中文 312' },
          { value: 'reviews', label: 'TOP100 86' },
        ]}
      />
      {(['segmented', 'underline'] as const).map((variant) => (
        <Tabs key={variant} value={view} onValueChange={setView} variant={variant}>
          <TabList aria-label={`面板分区（${variant}）`} items={VIEWS} />
          <TabPanel value={view} className='sr-only'>
            {view}
          </TabPanel>
        </Tabs>
      ))}
      <div style={{ display: 'flex', gap: 12, height: 220 }}>
        <div style={{ width: 48, padding: '10px 0', background: 'var(--xh-rail, var(--xh-sunken))', borderRadius: 12 }}>
          <Tabs value={view} onValueChange={setView} variant='rail'>
            <TabList aria-label='面板导航（rail）' items={VIEWS} className='h-full' />
            <TabPanel value={view} className='sr-only'>
              {view}
            </TabPanel>
          </Tabs>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CollapsibleSection title='通用' open={open} onOpenChange={setOpen}>
            <div style={{ ...row, paddingBottom: 6 }}>
              <Badge>KOL</Badge>
              <Badge tone='accent'>Beta</Badge>
              <Badge tone='up'>↑12</Badge>
              <Badge tone='down'>-3</Badge>
              <Badge tone='warn'>中风险</Badge>
              <Tag>DeFi</Tag>
            </div>
          </CollapsibleSection>
          <div style={row}>
            <Avatar name='Mira Chen' />
            <Avatar name='Lumen Labs' size='md' />
            <Avatar name='0xKai' size='sm' />
            <Avatar name='Echo Lin' size='xs' />
          </div>
          <Meter label='DeFi' value={86} />
          <Meter label='5 星' value={72} tone='warn' />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 在 `dev/sandbox/main.tsx` 的面板里加入陈列页**

在 `import { useUiSkin } …` 后加 `import { Gallery } from './Gallery';`；在色块网格之后、旧组件那一行之前插入 `<Gallery />`；外层面板的 `maxWidth` 从 `360` 改成 `380`。

- [ ] **Step 3: 浏览器核对（沙盒已在 5199 端口运行）**

逐一核对 3 种风格 × 3 种 X 背景：
- 按钮、图标按钮、开关、分段、下拉、搜索框、可折叠分组、徽标、标签、头像、进度条的尺寸和圆角和画布一致（见本计划各任务的数值）。
- 分段外观的滑块、下划线的 44px 指示条、图标栏左侧 2px 强调条位置正确，切换时滑动。
- 下拉菜单展开在原位，样式正确；开关、分段、标签页、下拉都能用键盘操作，焦点环可见。
- 用脚本实测：开关关闭态轨道、所有焦点环、选中态与背景对比度不低于 3:1；徽标、标签、按钮文字不低于 4.5:1（原生的反色按钮、柔光的强调色按钮）。不达标的值在 `primitives.css` 里调整后重测。

- [ ] **Step 4: Commit**

```bash
git add dev/sandbox/Gallery.tsx dev/sandbox/main.tsx src/css/primitives.css
git commit -m "chore(sandbox): add primitives gallery"
```

---

### Task 13: 阶段 1a 验收

- [ ] Run: `pnpm test`，Expected: 全部通过。
- [ ] Run: 类型检查 diff（`$SP/xh-tsc-base.txt` 对比），Expected: 没有新增错误，`src/ui/` 下没有错误。
- [ ] Run: `pnpm exec plasmo build`，Expected: 成功；记录 `Main.*.js` 体积增量。
- [ ] 沙盒 9 种组合截图核对完毕，对比度实测通过。
