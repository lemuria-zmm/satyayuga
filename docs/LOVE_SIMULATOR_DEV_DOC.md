# 恋人模拟器（Love Simulator）开发文档

## 1. 产品目标与玩家体验
- **目标**：打造一款 AI 驱动的剧情文字恋爱冒险，支持中/英双语，并通过「镜像视角」揭示隐藏信息，增强情感反转体验。
- **玩家体验关键点**：
  1. 代入感：角色信息与关键节点输入贯穿剧情。
  2. 成长感：三维数值影响剧情与结局。
  3. 反转感：镜像视角重演并揭示真相。

---

## 2. UI 设计与交互规范（详细）

### 2.1 整体布局
- **全局**：响应式布局，桌面优先，移动端使用纵向卡片式布局。
- **字体**：推荐 `"Noto Sans SC"` 或系统默认字体；标题半粗体，正文正常。
- **配色**：
  - 明亮模式：`#FFE4EC`（粉色）、`#E8DEFF`（薰衣草）
  - 镜像模式：`#1A1625`（深紫）、`#4A3B6B`（神秘蓝）

### 2.2 页面与组件
#### 欢迎页
- **元素**：Logo/标题、语言切换（中/英）、开始按钮。
- **交互**：
  - 语言切换即时生效。
  - `开始你的爱情故事` 按钮触发入场动画并进入设置页。
- **动画**：背景渐变缓慢移动；按钮 hover 轻微放大。

#### 设置页（分步表单）
- **步骤**：我的资料 → 恋人设定 → API 配置。
- **元素**：
  - 单选/多选标签（支持搜索或筛选）。
  - 预览卡片实时展示角色信息。
- **交互**：
  - 表单验证与错误提示（必填字段）。
  - 下一步按钮仅在当前步骤校验通过后激活。

#### 游戏主界面
- **顶部**：阶段指示器 + 三维数值条（Affection / Chemistry / Understanding）。
- **中部**：聊天式剧情（系统文字 + 角色对话）。
- **底部**：4 个选项按钮（包含简短反馈文本）。
- **交互**：
  - 选项点击后：触发数值变化 + 进入下一事件。
  - 关键节点输入弹窗：
    - 可跳过，跳过时由 AI 自动补全。
    - 输入内容写入事件变量并回流到未来剧情。

#### 结局页
- **内容**：结局标题、AI 生成故事总结、三维雷达图、查看真相按钮。
- **交互**：点击查看真相进入镜像视角。

#### 镜像视角
- **UI 风格**：色调反转（粉色 → 深紫），文字变为幽暗主题。
- **内容**：时间轴回放，逐阶段显示隐藏独白。
- **交互**：
  - 逐条淡入动画。
  - 可跳转至任意阶段查看隐藏独白。

---

## 3. 技术架构与代码结构

### 3.1 架构概览
- **前端**：React + TypeScript + Vite
- **动画**：Framer Motion
- **图标**：Lucide React
- **状态管理**：React Context + localStorage
- **AI 接入**：支持 OpenAI / Gemini 风格 API

### 3.2 代码结构
```
/src
  /components
    StageIndicator.tsx
    StatBar.tsx
    StoryPanel.tsx
    ChoiceGrid.tsx
    LanguageToggle.tsx
  /context
    GameContext.tsx
    LanguageContext.tsx
  /data
    stages.ts
    i18n.ts
  /types
    game.ts
  App.tsx
  main.tsx
  styles.css
```

---

## 4. TypeScript 类型定义
- **角色信息**：`PlayerProfile`, `PartnerProfile`
- **剧情节点**：`Stage`, `EventNode`, `ChoiceOption`
- **游戏状态**：`GameState`, `StageProgress`, `StatScores`
- **镜像视角**：`MirrorEntry`

---

## 5. AI 集成方案

### 5.1 接口支持
- **兼容 OpenAI**：`POST /v1/chat/completions`
- **兼容 Gemini**：`POST /v1beta/models/{model}:generateContent`
- **配置入口**：设置页提供 API Key + URL。

### 5.2 Prompt 模板
- **系统提示**：指定语气、阶段、角色信息、当前数值、玩家输入变量。
- **用户提示**：当前事件描述 + 玩家选择。

### 5.3 降级策略
- 无 API 时：使用内置脚本数据继续剧情。
- API 超时：回退到最近缓存文本。

---

## 6. 动画效果实现
- **背景渐变**：使用 CSS `keyframes`。
- **页面转场**：Framer Motion `AnimatePresence` + `motion.div`。
- **按钮反馈**：`whileHover` 放大，`whileTap` 缩小。
- **镜像视角**：色调反转 + 逐条淡入。

---

## 7. 数据管理策略
- **React Context**：保存游戏状态、语言、API 配置。
- **localStorage**：
  - 游戏进度（阶段、事件索引）
  - 三维数值（Affection/Chemistry/Understanding）
  - API 配置（仅本地保存）
- **版本迁移**：增加 `storageVersion` 字段。

---

## 8. 开发路线图
1. **MVP**
   - 基础 UI + 6 阶段流程 + 分支选择
   - localStorage 保存进度
2. **AI 剧情**
   - 接入 API + 动态生成剧情
3. **镜像视角**
   - 结局后反转体验 + 隐藏独白
4. **视觉与动画**
   - 全局动画 + UI 细节优化
5. **扩展功能**
   - 多角色 + 自定义事件

---

## 9. 性能优化方案
- **懒加载事件数据**：仅加载当前阶段相关数据。
- **缓存 AI 输出**：减少重复生成。
- **轻量状态更新**：避免不必要的 re-render。

---

## 10. 可扩展功能
- 多结局动画 CG。
- 语音配音与背景音乐。
- 社交分享与故事导出。
- 在线存档与多设备同步。

---

## 11. 开始开发（本仓库 MVP）
- 已搭建 Vite + React + TypeScript 基础框架。
- 初始化核心类型定义与上下文状态管理。
- 基础 UI 草图：阶段指示器、数值条、剧情面板、选项按钮、语言切换。

