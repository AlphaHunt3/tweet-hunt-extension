# XHunt - AI 驱动的 Web3 KOLFi 平台

<div align="center">

![XHunt Logo](https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/xhunt_new.jpg)

**XHunt 提供透明的 KOL 指标、即时的投研分析，以及智能的营销协作能力，用 AI 驱动的方式精准对接优质项目方与可信赖的 KOL。致力于重构 KOL 信任，重塑项目投研方式，重建创作者生态，打造更加透明、高效与安全的 Web3 创作者生态。**

[![Version](https://img.shields.io/badge/version-0.2.05-blue.svg)](https://github.com/AlphaHunt3/tweet-hunt-extension)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

[官网](https://xhunt.ai/) | [Chrome 插件下载](https://chromewebstore.google.com/detail/xhunt-%E2%80%93-your-crypto-co-pi/gonmfafjcdkngkbhcpmcphlgfhabkeji) | [English](#english) | [中文](#中文)

</div>

---

## 中文

### 🚀 功能特色

#### 📊 **KOL 分析**

- **关注者质量分析** - 深度分析 KOL 的关注者构成和质量
- **影响力排名** - 实时显示全球、中文、项目等多维度排名变化
- **MBTI 性格分析** - AI 驱动的推特用户性格类型识别
- **能力模型雷达图** - 多维度展示 KOL 在不同领域的专业能力
- **灵魂浓度分析** - AI 驱动的账户质量评估，包含内容、互动、KOL 互动等多维度分析

#### 💰 **代币分析**

- **智能代币识别** - 自动识别推文中的代币符号和合约地址
- **AI 分析面板** - 提供代币相关推文和 AI 生成的深度分析
- **表现追踪** - 跟踪 KOL 提及代币的历史表现和收益率
- **代币词云可视化** - 直观展示代币提及频率和热度

#### 🔍 **数据洞察**

- **删帖监控** - 追踪和显示已删除的推文内容
- **投资关系** - 展示项目的投资方和投资组合关系
- **改名历史** - 记录用户的历史用户名变更
- **讨论热度** - 分析项目在社区中的讨论情况和情感倾向
- **实时热门追踪** - 展示热门代币、讨论话题、关注项目和 KOL
- **资料变更追踪** - 监控用户头像、简介、横幅等资料的历史变更

#### 👤 **用户功能**

- **个人备注** - 为任何用户添加私人备注
- **评分系统** - 对 KOL 和项目进行评分和标签化
- **头像排名** - 在用户头像上显示影响力排名徽章
- **叙事分析** - AI 生成的项目核心叙事和定位分析
- **项目成员关系** - 展示项目相关的创始人、投资人、成员等角色

#### 🎯 **新增功能**

- **灵魂指数评分** - 基于多维度数据的账户质量评分系统
- **热门趋势面板** - 实时展示热门代币、讨论、关注和 KOL 数据
- **资料变更历史** - 详细的用户资料变更记录和对比
- **AI 叙事生成** - 基于项目定位的智能叙事分析
- **项目成员分析** - 展示项目相关人物的角色和关系

### 🛠️ 技术栈

- **框架**: [Plasmo](https://www.plasmo.com/) - 现代浏览器扩展开发框架
- **前端**: React 18 + TypeScript + Tailwind CSS
- **状态管理**: Plasmo Storage + ahooks
- **数据可视化**: D3.js + Recharts + Canvas API
- **UI / 动效**: lucide-react + lottie-react + 自定义组件
- **构建工具**: Plasmo（内置构建链路）+ PostCSS + Autoprefixer
- **工具库**: tippy.js（tooltip）、dayjs（日期处理）、uuid、numeral、qrcode、axios

### 📦 安装和开发

#### 环境要求

- Node.js 16+
- Yarn 4.x (使用 nodeLinker: node-modules)

#### 快速开始

```bash
# 克隆项目
git clone https://github.com/AlphaHunt3/tweet-hunt-extension.git
cd tweet-hunt-extension

# 安装依赖
yarn install

# 开发模式 (生产环境)
yarn dev

# 开发模式 (测试环境)
yarn dev-test

# 构建生产版本
yarn build
```

#### 浏览器安装

1. 运行 `yarn build` 构建扩展
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录下的 `build/chrome-mv3-prod` 文件夹

### 🏗️ 项目结构

```
src/
├── background/           # 后台脚本
├── compontents/         # React 组件
│   ├── area/           # 区域组件 (面板、侧边栏等)
│   ├── HotProjectsKOLs/ # 热门项目和KOL组件
│   └── ...             # 通用组件
├── contents/           # 内容脚本
│   ├── hooks/          # 自定义 Hooks
│   ├── services/       # API 服务
│   └── utils/          # 工具函数
├── css/               # 样式文件
├── locales/           # 国际化文件
├── storage/           # 存储管理
├── types/             # TypeScript 类型定义
└── utils/             # 通用工具
```

### 🔧 核心功能实现

#### 数据获取和安全

- 使用 Chrome Extension Message Passing 进行安全的跨域请求
- 实现设备指纹和请求签名验证
- 支持请求取消和错误处理

#### 动态内容注入

- Shadow DOM 隔离样式，避免与页面冲突
- MutationObserver 监听 DOM 变化，实时更新内容
- 防抖和节流优化性能

#### 数据可视化

- Canvas 绘制的动态雷达图，支持任意数量的数据维度
- D3.js 驱动的词云图，展示代币提及情况
- 响应式图表，适配不同屏幕尺寸
- 树形图可视化，展示热门代币分布

#### AI 分析功能

- 灵魂浓度多维度评估算法
- MBTI 性格类型识别
- 项目叙事智能生成
- 内容质量和互动数据分析

### 🌍 国际化

支持中文和英文两种语言，自动检测用户浏览器语言设置。

### 🔒 用户服务与隐私协议

**版本更新日期：2026年4月2日**

欢迎使用 XHunt。本协议由 XHunt 运营团队（以下简称“平台”）与使用 XHunt 服务的个人或实体（以下简称“用户”）共同订立。用户通过访问 xhunt.ai 官网或安装 XHunt 浏览器插件，即视为已阅读并同意本协议的所有条款。

#### 第一部分：服务条款

**1. 服务内容**

XHunt 是一款基于 AI 驱动的社交情报工具，提供包括但不限于 KOL 影响力分析、推文情绪监测、项目热度追踪等服务。

**2. 平台合规性声明**

平台通过 X (Twitter) 官方 API 获取公开数据，并遵守 X (Twitter) 开发者服务协议及相关平台政策。

本平台不对第三方平台政策的变更或服务中断承担责任。

**3. 用户行为准则**

- **合法用途**：用户应仅将 XHunt 用于合法的个人研究或商业情报目的。
- **禁止滥用**：禁止利用 XHunt 发起任何形式的自动化攻击、恶意大规模爬取或滥用数据、或试图绕过或干扰 API 频率限制。
- **资产安全**：XHunt 绝不触碰私钥。用户需自行负责加密货币钱包的安全管理，因个人操作失误导致的资产损失与本平台无关。

**4. AI 免责声明**

- **非投资建议**：XHunt 提供的所有 AI 分析结果、评分及指标仅供参考，不构成任何投资建议（NFA）。投资风险高，请自行研究（DYOR）。
- **数据说明**：受 AI 模型及推特数据源影响，分析结果可能存在延迟、偏差或不完整情况。

**5. 知识产权**

平台资产：XHunt 品牌、核心算法及界面设计均归本平台所有。插件源码在 GitHub 开源，用户可根据开源协议审计或贡献，但未经许可不得将其用于商业化二次包装。

#### 第二部分：隐私政策

**6. 数据采集与处理**

本平台遵循“最小化原则”处理非身份识别信息：

- **页面交互逻辑**：仅当用户主动触发 AI 推文分析功能时，插件会读取当前选定推文的文本内容以完成即时任务；除此之外，插件不会在后台自动读取、抓取或记录任何其他页面内容或用户的浏览轨迹。
- **脱敏设备特征**：采集的浏览器参数仅用于 API 频率限制及反机器人（Bot）防御，且均经过脱敏处理，无法关联至特定用户身份。

**7. 隐私红线与禁制事项**

XHunt 严格遵守以下隐私标准，确保用户信息与操作的高度隔离：

- **零 IP 记录**：服务器不采集、不存储用户的 IP 地址，确保用户的网络轨迹处于匿名状态。
- **不触碰敏感信息**：绝不请求、不读取、不存储助记词、私钥或任何形式的加密资产访问权限。
- **不读取隐私通讯**：不访问私信（DM）、书签或任何非公开的通讯内容。
- **不跨站追踪**：不追踪用户在 X (Twitter) 及其相关服务域名之外的任何网络行为。
- **不读取个人 Cookie**：不采集浏览器 Cookie 记录，确保用户的账户登录状态与 AI 处理流程完全隔离。
- **不关联与不共享**：本平台承诺绝不将数据与个人身份关联，且不向任何第三方机构出售或共享用户数据。

**8. 用户权利与退出机制**

用户享有对其数据隐私的完全知情权与自主控制权：

- **自主卸载权**：如用户对本协议或隐私处理逻辑有任何异议，可随时通过浏览器扩展管理页面自行卸载 XHunt 插件。卸载后，所有关联服务将立即终止。
- **源码审计**：插件源码已在 GitHub (AlphaHunt3/tweet-hunt-extension) 开源，用户有权对代码逻辑进行审计以验证隐私承诺。
- **本地数据管理**：用户可随时通过插件设置页面的“清除缓存”功能，一键删除存储在本地设备上的配置及分析记录。
- **安全建议**：建议用户避免在社交媒体公开互动中泄露私钥、敏感联系方式或精确地理位置。

#### 第三部分：其他条款

**9. 安全技术标准**

- **加密传输**：全量数据交换均通过 SSL/TLS 高强度加密协议完成。
- **透明发布**：重大变更将通过官网或官方推特 (@XHunt_ai) 进行公示。

**10. 协议更新与联系反馈**

- **协议更新**：本平台保留适时更新本协议的权利。用户持续使用 XHunt 服务即视为接受更新后的条款。
- **联系渠道**：如有关于隐私保护、数据删除或商务合作的疑问，请通过以下渠道提交反馈：
  - GitHub Issues：提交技术建议与 Bug 反馈
  - 官方邮箱：contact@xhunt.ai
  - X 官推：@XHunt_ai

### 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 📞 联系我们

- Twitter: [@xhunt_ai](https://x.com/xhunt_ai)
- Telegram: [xhunt_ai](https://t.me/xhunt_ai)
- GitHub: [AlphaHunt3/tweet-hunt-extension](https://github.com/AlphaHunt3/tweet-hunt-extension)

---

## English

### 🚀 Features

#### 📊 **KOL Analysis**

- **Follower Quality Analysis** - Deep analysis of KOL follower composition and quality
- **Influence Rankings** - Real-time display of ranking changes across global, Chinese, and project dimensions
- **MBTI Personality Analysis** - AI-driven Twitter user personality type identification
- **Ability Model Radar Chart** - Multi-dimensional display of KOL expertise across different fields
- **Soul Density Analysis** - AI-driven account quality assessment with multi-dimensional analysis

#### 💰 **Token Analysis**

- **Smart Token Recognition** - Automatically identify token symbols and contract addresses in tweets
- **AI Analysis Panel** - Provides token-related tweets and AI-generated in-depth analysis
- **Performance Tracking** - Track historical performance and returns of tokens mentioned by KOLs
- **Token Word Cloud Visualization** - Intuitive display of token mention frequency and popularity

#### 🔍 **Data Insights**

- **Deleted Tweet Monitoring** - Track and display deleted tweet content
- **Investment Relations** - Show project investors and portfolio relationships
- **Name History** - Record user's historical username changes
- **Discussion Heat** - Analyze project discussion levels and sentiment trends in the community
- **Real-time Trending** - Display hot tokens, discussion topics, followed projects and KOLs
- **Profile Change Tracking** - Monitor historical changes in user avatars, bios, banners, etc.

#### 👤 **User Features**

- **Personal Notes** - Add private notes for any user
- **Rating System** - Rate and tag KOLs and projects
- **Avatar Rankings** - Display influence ranking badges on user avatars
- **Narrative Analysis** - AI-generated project core narrative and positioning analysis
- **Project Member Relations** - Display project-related founders, investors, members and other roles

#### 🎯 **New Features**

- **Soul Index Scoring** - Account quality scoring system based on multi-dimensional data
- **Hot Trending Panel** - Real-time display of hot tokens, discussions, follows and KOL data
- **Profile Change History** - Detailed user profile change records and comparisons
- **AI Narrative Generation** - Intelligent narrative analysis based on project positioning
- **Project Member Analysis** - Display project-related character roles and relationships

### 🛠️ Tech Stack

- **Framework**: [Plasmo](https://www.plasmo.com/) - Modern browser extension development framework
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Plasmo Storage + ahooks
- **Data Visualization**: D3.js + Recharts + Canvas API
- **UI / Motion**: lucide-react + lottie-react + custom components
- **Build Tools**: Plasmo (built-in bundling) + PostCSS + Autoprefixer
- **Utility Libraries**: tippy.js (tooltip), dayjs (date handling), uuid, numeral, qrcode, axios

### 📦 Installation and Development

#### Requirements

- Node.js 16+
- Yarn 4.x (using nodeLinker: node-modules)

#### Quick Start

```bash
# Clone the project
git clone https://github.com/AlphaHunt3/tweet-hunt-extension.git
cd tweet-hunt-extension

# Install dependencies
yarn install

# Development mode (production environment)
yarn dev

# Development mode (test environment)
yarn dev-test

# Build for production
yarn build
```

#### Browser Installation

1. Run `yarn build` to build the extension
2. Open Chrome browser and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `build/chrome-mv3-prod` folder in the project root directory

### 🏗️ Project Structure

```
src/
├── background/           # Background scripts
├── compontents/         # React components
│   ├── area/           # Area components (panels, sidebar, etc.)
│   ├── HotProjectsKOLs/ # Hot projects and KOL components
│   └── ...             # Common components
├── contents/           # Content scripts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   └── utils/          # Utility functions
├── css/               # Style files
├── locales/           # Internationalization files
├── storage/           # Storage management
├── types/             # TypeScript type definitions
└── utils/             # Common utilities
```

### 🔧 Core Implementation

#### Data Fetching and Security

- Uses Chrome Extension Message Passing for secure cross-origin requests
- Implements device fingerprinting and request signature verification
- Supports request cancellation and error handling

#### Dynamic Content Injection

- Shadow DOM isolates styles to avoid conflicts with the page
- MutationObserver monitors DOM changes for real-time content updates
- Debouncing and throttling for performance optimization

#### Data Visualization

- Canvas-rendered dynamic radar charts supporting arbitrary data dimensions
- D3.js-powered word clouds showing token mentions
- Responsive charts adapting to different screen sizes
- Treemap visualization for hot token distribution

#### AI Analysis Features

- Multi-dimensional soul density assessment algorithm
- MBTI personality type identification
- Intelligent project narrative generation
- Content quality and interaction data analysis

### 🌍 Internationalization

Supports both Chinese and English, automatically detecting user browser language settings.

### 🔒 User Service & Privacy Policy

**Last Updated: April 2, 2026**

Welcome to XHunt. This agreement is entered into by the XHunt operations team (hereinafter referred to as the “Platform”) and the individual or entity using XHunt services (hereinafter referred to as the “User”). By accessing the xhunt.ai website or installing the XHunt browser extension, you acknowledge that you have read and agree to all the terms of this agreement.

#### Part I: Terms of Service

**1. Scope of Service**

XHunt is an AI-driven social intelligence tool providing services including, but not limited to, KOL influence analysis, tweet sentiment monitoring, and project hype tracking.

**2. Platform Compliance Statement**

The Platform retrieves public data via the official X (Twitter) API and complies with the X Developer Agreement and related platform policies. The Platform assumes no responsibility for changes in third-party platform policies or service interruptions.

**3. User Code of Conduct**

- **Legal Use**: Users shall use XHunt solely for lawful personal research or business intelligence purposes.
- **Prohibition of Abuse**: Users are prohibited from using XHunt to launch automated attacks, conduct malicious large-scale data scraping, or attempt to bypass API rate limits.
- **Asset Security**: XHunt never touches private keys. Users are solely responsible for the security of their cryptocurrency wallets. The Platform is not liable for any asset loss resulting from user error or negligence.

**4. AI Disclaimer**

- **Non-Financial Advice (NFA)**: All AI analysis results, scores, and indicators provided by XHunt are for reference only and do not constitute investment advice. Investing involves high risk; please Do Your Own Research (DYOR).
- **Data Accuracy**: Due to the nature of AI models and Twitter data sources, analysis results may be subject to delays, biases, or incompleteness.

**5. Intellectual Property**

Platform Assets: The XHunt brand, core algorithms, and interface designs are owned by the Platform. Open Source: The extension source code is open-sourced on GitHub. Users may audit or contribute according to the open-source license; however, unauthorized commercial repackaging is strictly prohibited.

#### Part II: Privacy Policy

**6. Data Collection and Processing**

The Platform follows the "Principle of Minimization" when handling non-identifiable information:

- **Interaction Logic**: The extension reads the text content of a selected tweet only when the user actively triggers an AI analysis. It does not automatically read, scrape, or record background page content or browsing history.
- **Anonymized Device Features**: Collected browser parameters are used solely for API rate limiting and anti-bot defense. This data is anonymized and cannot be linked to a specific user identity.

**7. Strict Prohibitions (Privacy Red Lines)**

- **Zero IP Logging**: Our servers do not collect or store user IP addresses, ensuring your network footprint remains anonymous.
- **No Sensitive Info Access**: We never request, read, or store seed phrases, private keys, or any form of crypto-asset access permissions.
- **No Private Communication Access**: We do not access Direct Messages (DMs), bookmarks, or any non-public communication.
- **No Cross-Site Tracking**: We do not track user behavior outside of X (Twitter) and its related service domains.
- **No Personal Cookie Collection**: We do not collect browser cookies, ensuring your account login state remains completely isolated from the AI processing flow.
- **No Association or Sharing**: We pledge never to associate data with personal identities and will not sell or share user data with third-party organizations.

**8. User Rights & Actions**

- **Right to Uninstall**: If you disagree with this agreement or our privacy logic, you may uninstall the XHunt extension at any time. All associated services will terminate immediately upon uninstallation.
- **Source Code Audit**: The extension code is open-sourced on GitHub (AlphaHunt3/tweet-hunt-extension). Users have the right to audit the code to verify our privacy commitments.
- **Local Data Management**: Users can delete local configurations and analysis records at any time via the "Clear Cache" function in the extension settings.
- **Security Recommendation**: We strongly advise users to avoid disclosing private keys, sensitive contact info, or precise locations during public social media interactions.

#### Part III: General Provisions

**9. Technical Security Standards**

- **Encrypted Transmission**: All data exchange is performed via high-strength SSL/TLS encryption protocols.
- **Transparent Updates**: Major changes will be announced via the official website or our official X account (@XHunt_ai).

**10. Updates and Contact**

- **Agreement Updates**: The Platform reserves the right to update this agreement. Continued use of XHunt services constitutes acceptance of the updated terms.
- **Contact Us**:
  - GitHub Issues: For technical suggestions and bug reports
  - Official Email: contact@xhunt.ai
  - Official X: @XHunt_ai

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🤝 Contributing

Issues and Pull Requests are welcome!

### 📞 Contact Us

- Twitter: [@xhunt_ai](https://x.com/xhunt_ai)
- Telegram: [xhunt_ai](https://t.me/xhunt_ai)
- GitHub: [AlphaHunt3/tweet-hunt-extension](https://github.com/AlphaHunt3/tweet-hunt-extension)

---

<div align="center">

**Made with ❤️ by the XHunt Team**

</div>
