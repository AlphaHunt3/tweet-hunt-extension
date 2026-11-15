# UI 风格切换 · 阶段 2c（资料页详情卡片）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 资料页 13 种详情卡片（2b 里由弹层承载的旧内容）按三套风格重做：统一的卡片结构（头部、正文、页脚）、用设计变量取代写死的颜色，修掉盘点出的问题。数据、行为、测试标记不变。

**Architecture:** 新增共用的 `DetailCard`（头部、正文、分节、页脚）和 `MeterRow`、`RadarChart`（SVG，替代两个手写 canvas 图），各详情内容改写为 `src/ui/profile/details/*.tsx`；旧组件里只被资料页用到的删除，被其他地方用到的保留导出或改为转调新组件。

总览见 `docs/superpowers/plans/2026-11-15-ui-skins-phase2-overview.md`；画布对应 `.claude/design-canvas/profile-spec.md` 第 7 节。

---

## 设计要点（画布第 7 节）

- **三套风格同一结构**：头部（图标或头像、标题、副标题）→ 正文 → 页脚（小字、上分隔线）。
  - 柔光：白色弹层圆角 16，头部 `12px 10px 10px 12px`，页脚 11px；进度条 6px、强调色。
  - 黑曜：圆角 14，数字用等宽字体，进度条 4px，分析段落是描边小卡片，页脚等宽小字。
  - 原生：X 悬停卡片样式，正文 14–15px，分节之间用 X 的分隔线；灵魂指数这类卡片去掉雷达图、只留进度条。
- **灵魂指数卡**（画布唯一画全的一张）：头像、名字、@handle；右侧「灵魂指数 · 优秀」和大号分数（柔光带「分」）；雷达图 + 5 行进度条（账户、内容、互动数据、XHunt 排名、KOL 互动）；分析原因；页脚「基于近 90 天最多 100 条原创推文 · 更新时间」和「AI 生成，仅供参考」。
- **排名卡**（动效画布第 6 块）：行式「全球影响力 #1,234 / 华语影响力 #56 / 7 天变化 ↑12」。
- **弹层内边距**：`[data-skin='native'] .xh-popover` 的 16px 内边距会盖过 `.xh-detail-pop` 的 0（优先级更高），原生下详情会多一圈内边距。2c 里由 `DetailCard` 自己管内边距，弹层统一为 0。

## 现状要点（盘点结果，第一批：投资、代币、删帖、改帖、讨论、关联人物）

**通用**：这些文件里没有 `data-xhunt-testid`；保留 `xhunt-post-list`、`xhunt-post-card`（style.css 里有兄弟卡片变暗和悬停阴影）、`custom-scrollbar`。日期都没按界面语言格式化（dayjs 没设 locale），要改成 `zh-cn`/`en`。沙盒里只有 90 天收益、提及代币、删帖能打开（删帖是非 VIP 提示）。

**投资** `InvestmentPanel.tsx`（198 行）：`renderInvestorList(title, investors, totalFunding, projectLink, showLogo, classicStyle)` 是普通函数；面板的 `OverviewView`、`PortraitView` 用 `<InvestmentPanel data classicStyle/>`（测试里按命名导出 mock，要保留）。字段：`name`、`avatar`、`twitter`、`lead_investor`；领投排前面；有融资额显示 `$12.5M`（`formatFunding`），否则显示人数；头像失败显示首字母；领投加黄点；名字链接到 `twitter`；`showLogo` 时显示 RootData 来源链接（`t('source')`）。问题：`data.invested.investors.length` 没有可选链，只有一边数据时会崩；`.sort()` 改了 props 里的数组；`title === 'Investment'` 分支永远不成立；颜色写死、深色专用边框 `#1a2634`。

**代币表现** `TokenPerformanceSection.tsx`（109 行）+ `TokenWordCloud.tsx`（244 行，d3-cloud）：资料页只用 90 天的 `Metrics`（胜率、平均最大收益、平均当前收益，各带「TOP x%」）和 `WordCloud` 两种。字段 `kolTokenMention.day90.{tokenMentions, winRate, winRatePct, maxProfitAvg, maxProfitAvgPct, nowProfitAvg, nowProfitAvgPct}`。问题：指标标签写死英文（Win Rate、Avg Max Profit、Avg Now Profit、TOP、N/A）；值为 0 显示 N/A；`*Pct` 缺失时显示 `(TOP N/A)`；词云每次重绘随机配色、背景 `#101823` 深色专用、永远不会触发的悬停提示（还会往 body 插节点）。词云另被 `ReviewHeader` 的 `ReviewTooltip`（未登录时的点评标签）使用。

**删帖** `DeletedTweetsSection.tsx`（361 行）+ `TweetContent.tsx`（146 行）：字段 `id`、`create_time`、`text`、`info.html`、`profile.{profile_image_url, name, username, is_blue_verified}`、`quote_status`、`statistic.{reply_count, retweet_count, likes, views, bookmark_count}`。非 VIP 显示 `t('deletedTweetNoVipDetail')`；VIP 时过滤正文等于「您暂时无法查看详细删帖内容」的条目，有被过滤的显示 `t('deletedTweets24hOnly')`；点卡片 `fetchDeletedStatus(id)` 后 `navigateInX` 到推文；点名字到主页。另被右栏 `PersonalAnalysisPanel` 使用（右栏是阶段 3，接口不能变）。问题：`No content`、`No data` 写死（已有 `tweet_list_no_content`、`noData`）；`theme-bg-tertiary/30` 不是有效类；卡片是可点的 `div`，没有键盘操作；日期只有英文。

**改帖** `EditedTweetsSection.tsx`（365 行）+ `editedTweetDiff.ts`（纯函数，不改）：VIP 门槛（`!access || detail_scope === 'count_only'`）显示锁图标、`editedTweetCountTitle`、`editedTweetVipRequired` 和申请 VIP 按钮（远程链接）；列表：加载、失败重试、无详情、卡片（每次修改的差异、查看最终帖子、首次发布）、加载更多。文案都已有 key（`editedTweet*`）。问题：列表下方「加载更多失败」的重试调的是 `onLoadMore`（`hasMore` 为假时什么都不做），应调 `onRetry`；首次请求前会画出空列表框；日期只有英文。差异颜色在 `TweetContent` 里写死红绿。

**讨论** `DiscussionPanel.tsx`（99 行）：按语言取 `discussion{1d|7d}{Cn|En}`，显示正负面百分比和观点列表。问题：`No Data` 写死；`positiveBulletPoints.length` 没有可选链；百分比缺失显示 `NaN%`；加载文案借用了 AI 分身的「思考中」。

**关联人物** `ProjectMembersSection.tsx`（549 行）：优先用 `rootData.members`（网格，链接到 twitter），否则按角色分组（`founder/executive`、`member`、`investor/advisor`、`contributor`、`ex-member`、`alumni`）的标签页，组内按头像排名排序（`rankService.getRanks`，`@settings/avatarRankMode`），每人带官方标签。问题：**提前返回之后调用 Hook**（数据从有到无切换会报错）；排名请求的依赖漏了 `avatarRankMode`、没有卸载清理、标签页切换会竞态；防闪烁延迟不起作用（每次切标签页都先隐藏网格）；官方标签背景色 `${hsl}20` 是无效 CSS；官方标签同步读取，管理器初始化前为空；`Loading...` 写死；`aiGenerated` 的英文是「AI Generation Probability」；与资料页计数口径不一致（资料页数所有分组，面板只数固定的 6 组）。

## 现状要点（第二批：灵魂指数、能力模型、排名、KOL 粉丝、MBTI、改名）

**通用**：卡片渲染在 `SkinScope` 里（弹层在原位进顶层，不走 portal），`soft:`/`obsidian:`/`native:`、`dark:`、`--xh-*` 都可用。灵魂指数、能力、排名卡自己又画了一层 `--xh-canvas` 背景（和弹层的 `--xh-surface` 不同色）。`hover:theme-text-primary`、`hover:theme-bg-tertiary` 根本没生成 CSS。`t(key)` 缺 key 时返回 key 本身，所以 `t(x) || 默认值` 永远不生效。没有单测引用这六个组件；e2e 只粗略匹配「Soul Index|MBTI|能力|灵魂」等文字。

**灵魂指数** `SoulDensity.tsx`（只有 NRD 用）：字段 `score`、五个维度 `profile_analysis`/`content_analysis`/`engagement_analysis`/`xhunt_analysis`/`kol_interaction`（缺失按 50 画）、`reason`/`reason_en`、`last_updated`。头部身份取自 `usePlacementTracking()`（沙盒里没有名字头像，显示 Unknown User）。分数颜色按 10 档写死；维度说明是纯 CSS 悬停（键盘、触屏用不了）且位置和画布标签对不上；canvas 360×260 固定尺寸，比容器高；首字母头像在浅色下是白字无底看不见；`canvasContextManager` 每次绘制都新增一条且卸载时释放不掉（只靠 10 秒定时清理）；中文界面只有 `reason_en` 时分析段是空的；高分时顶轴分数压住标签。等级文字（优秀）代码和语言包里都没有，只有画布有；现成的分档只有 `PortraitView` 的 `soulTone`（≥80 up、≥60 warn、其余 down）。

**能力模型** `KolAbilityRadar.tsx` + NRD 里的 `AbilityModelPanel`/`AbilityModelDetailPanel`：数据 `[{名称: 分数}]` 来自 `getAbilityModelData`（`src/utils/abilityModel.ts`，AI 领域只留 ≥70 分）；≥3 项画雷达（只画前 8 项），1–2 项画列表；领域切换（Web3/AI）的按钮代码重复两份、没有 aria、渐变色写死；头部身份代码重复三份（灵魂、雷达、列表）；无效分数在雷达按 50、列表按 0；没有总结时页脚也不显示；`buildAbilityFooter` 和 `buildSoulFooter` 在模板含 `{date}` 时结果相同；大量注释掉的缓存代码。领域偏好存在 `@xhunt/name-ability-domain`，和 FRD 的 `@xhunt/followed-active-domain` 分开。

**排名** FRD 里的 `RankTooltip`（`RANK_TYPES`：`rankGlobal→followers`、`rankCn→chinese`、`rankEn→english`、`rankProject→project`）：1/7/30 天标签页只切换「排名变化」一个数；描述用文案片段拼接（英文会出现「ranked 1234 th」）；全球排名没有「超出总数」的封顶（卡片说第 250000 名，标签说 >200K）；排名没有千分位；打开状态下切换到别的排名，选中的天数会沿用。字段：`kolRankChange`/`kolProjectRankChange`/`kolCnRankChange`/`kolGlobalRankChange` 的 `day1/day7/day30`，排名 `kolRank20W`/`kolProjectRank`/`kolCnRank`/`kolGlobalRank`，AI 版加 `Ai` 后缀；总数：全球 20 万（AI 5 万）、华语 `kolCnRankTotal`（AI 3000）、英文 `kolEnRankTotal`、项目 `kolProjectRankTotal`。

**KOL 粉丝** `KolFollowersSection.tsx`（只有 FRD 用，且只走悬停模式）：列表字段 `globalKolFollowers`/`topKolFollowers`/`cnKolFollowers`（AI 加 `Ai`），每人 `username`/`name`/`avatar`；4 列头像网格，每人最多 2 个官方标签（同步读取，管理器初始化前为空）。问题：柔光、黑曜是一个合并的触发器，悬停永远只打开第一个列表，TOP100 和中文 KOL 列表看不到；`defaultTab` 只在挂载时读取；标签背景 `${hsl}20` 无效；头像没有加载失败的兜底；列表为空时是空白卡片；名字和标签各有两个提示（原生 title + 自绘）。

**MBTI** `MBTISection.tsx`：`mbti`、`keyword[]`、`explanation`，页脚 `mbtiFooter`（日期写死在文案里）。`getMBTIColor` 只给 16 型里的 8 型配了色，只有它在用。`data` 可能是 undefined（当前语言的条目缺失时）会崩。

**改名** `NameHistorySection.tsx`：`screen_names: {handle: [开始, 结束]}`，按对象插入顺序显示；标题里的数量是名字数不是改名次数；`screen_names` 缺失会崩；日期缺失显示今天或 Invalid Date。

## 设计决定

1. **共用结构** `src/ui/profile/details/DetailCard.tsx`：`DetailCard`（头部：图标或头像、标题、副标题、右侧区；正文；页脚左右两段）、`DetailSection`（分节，原生下用 X 分隔线）、`DetailNote`（分析段：柔光 `--xh-canvas` 底、黑曜描边小卡、原生正文）、`DetailEmpty`。内边距全部由卡片自己管，`.xh-detail-pop` 在三套风格下都是 0（修掉原生多出的 16px）。样式放新文件 `src/css/details.css`，在 `style.css` 里接在 `profile.css` 之后引入。
2. **进度条行** `MeterRow`：用现有的 `Meter` 原件（ui-sdk Meter），网格「标签 / 条 / 数值」，柔光 6px、黑曜和原生 4px（原件已有）。维度说明放在标签的 `title` 上。
3. **雷达图** `RadarChart`：SVG，几何按画布（中心 80,78，半径 62，四圈 100/75/50/25%，点 r=2.6），颜色全用设计变量；标签过长时截断（中文 4 字、英文 8 字符）；`role="img"`，`aria-label` 含全部数值。原生风格不渲染雷达（按画布 C）。不再用 canvas 和 `canvasContextManager`（它还给 `TokenWordCloud` 用，保留）。
4. **灵魂指数卡**：按画布第 7 节三套结构。等级三档与 `soulTone` 一致：≥80 优秀（up）、≥60 良好（warn）、其余偏低（down），新 key `soulLevelExcellent/Good/Low`。雷达短标签新 key `soulAxis*`。身份（名字、@handle、头像）读 X 页面（复用 2a 的 `readProfileIdentity`），头像用 `Avatar` 原件（首字母兜底）。页脚左「近 90 天 · 最多 100 条原创 · 11/12 更新」，右「XHunt AI · 仅供参考」（保留指向 @xhunt_ai 的链接）。
5. **能力卡**：合并三份旧代码。头部与灵魂卡同构，右侧是「KOL 能力模型」小字 + 领域切换（`SegmentedControl` 小号，只有一个领域时显示文字）；正文雷达（≥3 项，原生不显示）+ 进度条行（全部能力）；有总结时显示分析段；页脚不再依赖总结。无效分数统一按 0。
6. **排名卡**：去掉天数标签页，三个周期同时列出（悬停卡片里不需要交互）。头部：标题为排名名称，副标题「总样本 20 万」，右侧大号排名（`#1,234`、`>20 万`、`未上榜`）；正文三行「1 天变化 ↑3 / 7 天变化 ↑12 / 30 天变化 ↑51」（画布动效第 6 块的行式）；页脚是原来的排名说明。全球排名补上封顶，数字加千分位。逻辑抽成纯函数 `buildRankDetail` 单测。
7. **KOL 粉丝卡**：带标签页（`Tabs` 原件 segmented），列出所有已开启的列表，初始选中悬停的那个——柔光、黑曜的合并触发器也能看到三个列表；`key` 跟随初始列表，原生下换触发器会重置。头像用 `Avatar`，官方标签用 `useOfficialTags`（异步初始化），标签统一用中性小胶囊（去掉无效的 hsl 色）。空列表显示 `noData`。
8. **MBTI、改名、讨论**：MBTI 类型统一用强调色（不再按类型配色，删 `getMBTIColor`）；改名按开始日期倒序、当前名字标「当前」；讨论的正负面用一条双色比例条 + 两组观点；缺数据都显示空状态而不是崩溃。
9. **代币**：90 天收益卡用三行指标（胜率、平均最大收益、平均当前收益，各带「前 x%」），0 显示 0%，缺失显示「—」；提及代币卡改成按次数排序的代币胶囊（前三名强调色），不再用 d3 词云（`TokenWordCloud` 还给点评提示用，保留）。
10. **删帖、改帖、投资、关联人物**：这几个有别处在用（右栏的 `PersonalAnalysisPanel`、面板的 `InvestmentPanel`），保留导出和参数，在原文件里换成设计变量、修问题；资料页用 `DetailCard` 包一层头部和页脚。关联人物重写成不在提前返回后调用 Hook 的版本，角色分组用 `Tabs` 原件。
11. **日期**统一走 `formatDay(value, lang)`：中文 `2026/11/01`、英文 `Nov 1, 2026`；页脚的短日期 `formatShortDay`：同年省略年份。纯日期字符串按本地日期解析（避免时区差一天），小于 1e12 的数字按秒处理。
12. 沙盒补齐假数据，让 13 种卡片都能打开；验收时每种卡片截三套风格（深浅各一张拼图），对比度在三种 X 背景下算一遍。

## 任务

每个任务先写测试，再实现，跑通后单独提交。

- [x] **任务 1 共用部分**：`details/DetailCard.tsx`、`details/MeterRow.tsx`、`details/RadarChart.tsx`、`details/format.ts`（`formatDay`、`formatShortDay`、`formatTotal`）；`src/css/details.css`；`.xh-detail-pop` 原生内边距。测试：卡片头部和页脚按需出现；`MeterRow` 的无障碍名称和「—」；雷达点数、`aria-label`、截断；日期和总数格式（中英文、秒和毫秒、无效值）。
- [x] **任务 2 灵魂指数卡** `details/SoulCard.tsx`（替换 `SoulDensity`，删除旧文件）。测试：等级分档、中文只有英文原因时回退、三套风格结构（原生无雷达）、页脚日期。
- [x] **任务 3 能力卡** `details/AbilityCard.tsx`（替换 `KolAbilityRadar` 和 NRD 里的两个面板）。测试：≥3 项有雷达、1–2 项只有进度条、领域切换回调、只有一个领域时不显示切换、无总结时仍有页脚。
- [x] **任务 4 排名卡和 KOL 粉丝卡** `details/RankCard.tsx`（含 `buildRankDetail`）、`details/KolFollowersCard.tsx`（替换 `RankTooltip`、`KolFollowersSection`）。测试：四种排名的封顶、未上榜、千分位、AI 总数；粉丝卡标签页初始值、空列表。
- [x] **任务 5 MBTI、改名、讨论** `details/MbtiCard.tsx`、`details/RenameCard.tsx`、`details/DiscussionCard.tsx`。测试：缺数据不崩、改名倒序和「当前」、讨论百分比缺失不出 NaN。
- [x] **任务 6 代币卡** `details/TokenReturnCard.tsx`、`details/TokenMentionsCard.tsx`。测试：0 和缺失的显示、排序和前三名标记、文案走 key。
- [x] **任务 7 删帖和改帖**：`DeletedTweetsSection`、`TweetContent`、`EditedTweetsSection` 原地改样式和修问题（卡片可用键盘打开、日期按语言、改帖「加载更多失败」重试调 `onRetry`）；NRD 用 `DetailCard` 包装。
- [x] **任务 8 投资和关联人物**：`InvestmentPanel` 原地改（修崩溃、不改 props 数组）；`details/MembersCard.tsx` 替换 `ProjectMembersSection`。
- [x] **任务 9 沙盒和验收**：假数据补齐；截图拼图、对比度、单测、类型检查、构建；记录执行中的调整和验收结果。

## 执行中的调整

1. **测试的写法**：每个任务的测试和实现是同一批写的，跑通后再提交，不是严格的先失败再实现。项目没有装 jest-dom，断言统一改成 `toBeTruthy()`、`getAttribute()` 这类写法。
2. **沙盒的明暗**：沙盒以前从不写 `@xhunt/theme`，`SkinScope` 一直取默认的 dark，浅色背景下也会命中 `[data-theme='dark']` 的规则（能力卡的分段控件选中块变成深色就是这个原因）。扩展里由 `useThemeWatcher` 跟随 X 写入，沙盒现在跟随所选背景写入。2a、2b 的浅色截图当时受了影响，修正后重跑 2b 的对比度，结果不变（最低 4.97:1）。
3. **沙盒的项目账号**：讨论、关联人物、投资只有项目账号才有，沙盒加了 `?view=profile&kind=project` 和「项目资料」按钮，补了讨论、获投资/已投资、分组成员、改帖（两条修改链，一条历史不完整）、删帖（VIP、带引用推文）、90 天收益指标的假数据。
4. **`DetailCard` 加了 `header`**：原生风格的灵魂指数卡头部结构完全不同（左侧大号分数、右侧头像），用 `header` 整个替换默认头部。
5. **灵魂维度文案分两套 key**：进度条用 `soulAxis*`（中文是完整说法，英文用短词，否则 64px 的标签列放不下），雷达用 `soulRadar*`（更短）。
6. **黑曜的弱化文字**：页脚和雷达标签原本用 `--xh-fg-3`，浅色背景下只有 4.0:1，改用 `--xh-fg-2`；等宽字体只留给 @handle，中文用等宽字体会把空格撑得很宽。
7. **改名卡**：「当前」标签在 320px 宽度下会压到日期上，改成两行（名字一行、日期一行）。
8. **改帖的「加载更多失败」重试不是问题**：盘点认为应改调 `onRetry`，核对 `useEditedTweets` 后发现失败时偏移量不前进，再调 `onLoadMore` 正好重试同一页；`onRetry` 会从第一页重新加载并丢掉已加载的页。保留原逻辑并加了注释。真正修的是另一个问题：首次请求前会画出一个空列表，现在显示加载中。
9. **帖子卡片的悬停效果**：`style.css` 里 `xhunt-post-list`、`xhunt-post-card` 的规则不在任何层里，会压过分层样式。这两个类只有删帖、改帖在用，所以把规则删掉，在 `details.css` 里按风格重做（柔光、黑曜是阴影加其余卡片变淡，原生是 X 式的悬停底色和分隔线）。
10. **删帖卡片可以用键盘打开**：时间改成真正的链接（`aria-label` 含「打开帖子」），鼠标点卡片任意位置的行为不变。头像统一用 `Avatar`，不再在加载失败时去拉 twimg 的默认头像。
11. **`TweetContent`**：差异的红绿和链接色改用设计变量（`--xh-down`/`--xh-up`/`--xh-accent-fg`），不再写死 `#1D9BF0`（白底上只有 3:1）。
12. **人物小卡共用**：KOL 粉丝和关联人物共用 `PersonChip`；RootData 的成员从 X 链接里解析出 handle，这样也能显示官方标签。
13. **RootData 标志图**：原来从 vercel blob 拉一张远程图片，换成文字链接「来源 · RootData」，署名保留。
14. **讨论面板保留**：`DiscussionPanel` 还被（本来就没人用的）`DiscussionSection` 引用，没有删；资料页改用新的 `DiscussionCard`。
15. **删除的文件**：`SoulDensity`、`KolAbilityRadar`、`utils/colorGenerator`、`KolFollowersSection`、`MBTISection`、`NameHistorySection`、`TokenPerformanceSection`、`ProjectMembersSection`，以及 `getMBTIColor`、`renderInvestorList`。
16. **格式化**：本地没有装 prettier，用 `npx prettier` 格式化过一次 `DetailCard.tsx`，npx 临时下载了 prettier 3.10.1，之后没再用。

## 验收结果

- 单测：68 个文件、256 个测试全部通过（2b 结束时是 60 个文件、192 个）。
- 类型检查：64 个错误，比 2b 结束时少 4 个（删掉的旧文件里的），新文件没有错误；`EditedTweetsSection` 里那条隐式 any 是原有的，只是行号变了。
- 构建：成功，`Main.js` 4,446,491 字节，比 2b 结束时多约 94KB。原因是 `style.css` 被 12 个文件用 `data-text:` 引入，在 `Main.js` 里嵌了 10 份，每加 1 字节样式实际增加约 10 字节。去重是单独的改动，没有放进本阶段。
- 对比度：13 种卡片在三套风格 × 三种 X 背景下逐个打开测量，所有文字 ≥ 4.5:1，最低是原生风格深蓝背景下改帖的删除差异 4.55:1。
- 截图：每种卡片都有三套风格的深浅两张拼图，最终版在 scratchpad 的 `shots/final/`。
