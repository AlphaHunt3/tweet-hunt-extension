# UI 风格切换 · 阶段 2（资料页）总览

阶段 2 按设计文档第 6、9 节改资料页：XHunt 插进 X 个人主页的所有组件，加上从它们弹出的卡片。完成标准是「所有资料页设置项在三种风格下表现正确」。这一层约 1.16 万行，一次做完风险太大，拆成三个子阶段，每个子阶段单独写计划、单独验收、都能单独发布。

参考材料：
- 设计文档：`docs/superpowers/specs/2026-11-14-xhunt-ui-skins-design.md` 第 4.3、6、7 节。
- 画布：`.claude/design-canvas/project/{A,B,C}-profile.dc.html`，样式在 `xh-{a,b,c}.css`（本地设计稿，不进 git）。
- 从画布整理出的逐项样式说明：`.claude/design-canvas/profile-spec.md`（本地，不进 git）。

## 子阶段

| 子阶段 | 内容 | 完成标准 |
|---|---|---|
| 2a 地基 | 资料页各挂载点加风格作用域、改成开放的 Shadow Root；弹层基础组件；标签与备注（含备注编辑弹层）；AI 叙事；沙盒「资料页」视图和假数据 | 标签、备注、叙事三套风格正确；`showOfficialTags`、`showNotes`、`showNarrative` 生效 |
| 2b 资料页主体 | 洞察（柔光卡片可收起、黑曜数据标签、原生行内文字）；KOL 粉丝、排名与领域切换；点评卡与写点评弹层；AI 分身与社交圈按钮；各指标改用弹层承载现有的悬停内容 | 18 个资料页设置项、Web3/AI 领域设置项在三种风格下正确 |
| 2c 悬停卡片 | 13 种卡片内容按三套风格重做；去掉这一层对 HoverStatItem、FloatingContainer 的使用和它们对 X 页面的改动 | 所有卡片三种风格正确；不再淡化 X 顶栏、不再自动滚动 |

## 现状（盘点结果）

**挂载**：`src/contents/Main.tsx` 的 `FeatureLayer` 往 X 页面插 4 处，都用 `useShadowContainer`（默认封闭的 Shadow Root，每处一份完整的 `style.css`）：

| 组件 | 挂在哪 | 内容 |
|---|---|---|
| `NameRightData`（991 行） | `div[data-testid="UserName"]` 本身 | 标签与备注（`NotesSection`）、洞察、叙事（`NarrativeSection`） |
| `FollowedRightData`（907 行） | UserName 父级里第一个同时含「Following/Followers」（或简中、繁中、日文写法）的元素，即关注数那一行 | KOL 粉丝与排名、领域切换、点评卡（`ReviewHeader`） |
| `SocialCircleFeature`、`KolAiChatButton` | 关注按钮（`placementTracking`）或编辑资料按钮左侧插入的占位元素 | 社交圈、AI 分身按钮 |

**弹层**：悬停卡片是 `HoverStatItem`（836 行）每次往 `body` 插一个宿主；备注、点评、社交圈用 `FloatingContainer`（固定定位加遮罩）。两者都没有 Esc 和焦点处理，`HoverStatItem` 打开时还会改 X 页面（淡化顶栏、改层级、自动滚动 200px）。

**风格**：这一层的根元素只设了 `data-theme`，没有 `data-skin`，所以 `soft:`/`obsidian:`/`native:` 变体和 `[data-skin]` 规则都不生效；颜色靠旧的 `theme-*` 别名跟随。

**设置项**：「Profile 页面设置」18 项里 16 项属于这一层（`showGhostFollowing`、`showSearchPanel` 在右栏）；「Web3 领域设置」「AI 领域设置」各有 7~9 项控制 KOL 粉丝和排名。

**测试**：这一层没有单元测试；e2e 的选择器大多在封闭的 Shadow Root 里，Playwright 进不去。

## 决定

1. **风格作用域**：新增 `SkinScope`（`display: contents` 的 `div`，带 `data-skin`、`data-theme`），包住这一层每个挂载点的根元素。
2. **开放的 Shadow Root**：资料页 4 个挂载点改用 `shadowMode: 'open'`，测试和 e2e 才能进去。封闭模式对 X 页面没有隔离作用，只挡住了自己的测试。
3. **指标详情用弹层，不用悬停卡片**：ui-sdk 的 HoverCard 只用于链接预览，触屏和读屏用户打不开。洞察指标是按钮，改用 `Popover` 加 `openOnHover`：鼠标停留打开，点击、键盘、触屏也能打开。这是对设计文档第 4.3 节映射表的修正。
4. **弹层原地渲染在顶层**：ui-sdk 的弹层在组件所在的 Shadow Root 里渲染、显示在浏览器顶层，样式照常生效，不再需要 `FloatingContainer` 的遮罩和手写 z-index。
5. **补焦点样式**：画布里这几块都没有焦点样式，统一用强调色 2px 描边、偏移 2px。

## 顺带修的问题（各子阶段处理）

- 2b：中文下华语排名、项目排名的分母缺文案（`kolCnRankTotal`、`kolProjectRankTotal` 只有英文），会显示成 `1,234/0`。
- 2b：领域切换在三个地方各实现一遍，合成一个。
- 2b：`KolAiChatButton` 在列表接口返回 `null` 时报错（`useRequest` 的默认值只在 `undefined` 时生效）。
- 2c：`ProjectMembersSection` 在提前返回之后调用 Hook，数据变化时会报错。
- 2c：`MBTISection` 只给 16 种类型里的 8 种配了颜色。
- 2c：90 天收益、投资面板写死了深色专用的颜色，浅色下对比度不够。
- 2c：写死的中英文字符串（`+N个标签`、`No Data`、`Loading...`、`7D/30D/90D` 等）改用文案。
- `ReviewSection` 评论框 `maxLength=200` 但截到 300（2b 一并修）。

## 完成情况

- 2a 基础：完成（`2026-11-15-ui-skins-phase2a-foundation.md`）。
- 2b 资料页主体：完成（`2026-11-15-ui-skins-phase2b-profile-body.md`）。
- 2c 详情卡片：完成（`2026-11-15-ui-skins-phase2c-detail-cards.md`）。13 种悬停卡片统一为头部、正文、页脚结构，三套风格各自成形；顺带修了盘点出的崩溃和文案问题。
