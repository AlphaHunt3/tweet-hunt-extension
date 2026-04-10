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

### 🔒 隐私和安全

- 所有用户数据本地存储，不上传敏感信息
- 使用 HTTPS 加密传输
- 实现请求签名验证，防止恶意请求

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

### 🔒 Privacy and Security

- All user data stored locally, no sensitive information uploaded
- HTTPS encrypted transmission
- Request signature verification to prevent malicious requests

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
