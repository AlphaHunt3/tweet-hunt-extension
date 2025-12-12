# MantleHunter 组件库

这个文件夹包含了重构后的 MantleHunter 相关组件，将原来一个大的 `MantleHunterBanner.tsx` 文件分割成了多个更小、更易维护的组件。

## 文件结构

```
MantleHunter/
├── README.md                    # 本文档
├── index.ts                     # 主入口文件，导出所有组件
├── types.ts                     # 类型定义
├── MantleHunterBanner.tsx      # 主组件，整合所有子组件
├── ActivityHeader.tsx           # 活动标题区域组件
├── MantleHunterCaptain.tsx     # Mantle Hunter Captain 统计组件
├── MantleLeaderboard.tsx       # 排行榜和热门推文组件
├── RegisteredContent.tsx        # 已注册状态的内容组件
├── UnregisteredContent.tsx     # 未注册状态的内容组件
└── XLogo.tsx                   # X Logo 图标组件
```

## 组件职责

### 1. MantleHunterBanner.tsx (主组件)

- 整合所有子组件
- 管理全局状态和逻辑
- 处理钱包验证、任务管理、注册等核心功能

### 2. ActivityHeader.tsx

- 显示活动标题和 Logo
- 包含展开/收起按钮
- 显示活动描述信息

### 3. MantleHunterCaptain.tsx

- 显示全局统计数据（参与人数、推文数、桥接数）
- 使用 API 获取实时数据

### 4. MantleLeaderboard.tsx

- 显示排行榜（Mindshare 和 Workshare）
- 显示热门推文
- 包含 Tab 切换功能

### 5. RegisteredContent.tsx

- 已注册用户的状态显示
- 显示用户排名、邀请码、邀请数量
- 提供跳转到官方页面的按钮

### 6. UnregisteredContent.tsx

- 未注册用户的任务列表
- 钱包验证功能
- 邀请码输入
- 报名按钮和表单

### 7. XLogo.tsx

- 可复用的 X (Twitter) Logo 组件
- 支持自定义样式类名

### 8. types.ts

- 定义组件间共享的类型接口
- 包含 Task 和 MantleHunterBannerProps 等类型

### 9. index.ts

- 统一导出所有组件和类型
- 提供便捷的导入入口

## 使用方式

### 导入主组件

```tsx
import { MantleHunterBanner } from '~compontents/MantleHunter';
```

### 导入特定子组件

```tsx
import { ActivityHeader, MantleLeaderboard } from '~compontents/MantleHunter';
```

### 导入类型

```tsx
import type { Task, MantleHunterBannerProps } from '~compontents/MantleHunter';
```

## 重构优势

1. **可维护性**: 每个组件职责单一，代码更清晰
2. **可复用性**: 子组件可以在其他地方独立使用
3. **可测试性**: 可以单独测试每个组件的功能
4. **团队协作**: 不同开发者可以并行开发不同组件
5. **代码审查**: 更小的文件更容易进行代码审查

## 注意事项

- 所有组件都通过 `index.ts` 统一导出
- 类型定义集中在 `types.ts` 中
- 主组件保持向后兼容，不影响现有使用方式
- 子组件之间通过 props 传递数据和回调函数
