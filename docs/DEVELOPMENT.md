# 恋人模拟器开发文档

## 1. UI 设计与交互规范

### 1.1 页面结构
- 欢迎页
  - 背景：浪漫渐变动画（粉色 #FFE4EC → 薰衣草 #E8DEFF）。
  - 主按钮：「开始你的爱情故事」。
  - 语言切换按钮：中/英即时切换。
- 设置页（分步表单）
  - Step 1：我的资料（基础 + 爱好 + 特殊记忆）。
  - Step 2：恋人设定（基础 + 性格标签 + 兴趣 + 特殊设定）。
  - Step 3：API 配置（Provider、Key、Base URL、模型）。
  - 右侧可预览角色卡片（后续扩展）。
- 游戏主界面
  - 顶部：阶段指示器 + 三维数值条。
  - 中部：聊天式剧情展示 + 关键节点输入框。
  - 底部：4 个选项按钮。
- 结局页
  - 结局标题与摘要。
  - 雷达图展示三维数值。
  - 按钮：「查看真相」进入镜像视角。
- 镜像视角
  - 全屏遮罩，色调反转（暗紫 + 神秘蓝）。
  - 时间轴回放阶段与隐藏独白。

### 1.2 交互细节
- 每一选项都会触发数值更新 + 进入下一事件。
- 关键节点输入可跳过，AI 将自动补全。
- 结局后可选择镜像视角或重新开始。

## 2. 技术架构与代码结构

### 2.1 技术栈
- React + TypeScript + Vite
- framer-motion：页面/组件动画
- lucide-react：图标
- localStorage：进度与 API Key 持久化

### 2.2 目录结构
```
/ (repo)
  /docs
    DEVELOPMENT.md
  /src
    /components
    /contexts
    /data
    /types
    App.tsx
    main.tsx
    styles.css
  package.json
  tsconfig.json
  vite.config.ts
```

## 3. TypeScript 类型定义
- `PhaseDefinition`：恋爱阶段元数据
- `StoryEvent`：剧情事件（包含 key inputs + choices）
- `MetricsState`：好感度、默契值、理解度
- `EndingResult`：结局计算结果
- `ApiSettings`：API 配置结构
- `GameState`：全局游戏状态

## 4. AI 集成方案

### 4.1 API 入口
- 支持 OpenAI/Gemini
- 用户在设置页填写 Key、Base URL、模型
- 保存到 localStorage

### 4.2 Prompt 结构
- 系统：提供整体世界观（6 阶段）
- 用户：当前事件上下文 + 角色资料 + 历史事件
- 产出：剧情描述 + 恋人独白 + 分支选项

### 4.3 示例 JSON
```json
{
  "event": "第一次见面",
  "player": {"name": "Lina"},
  "lover": {"name": "Kai"},
  "metrics": {"affection": 64}
}
```

## 5. 动画效果实现
- framer-motion 用于页面切换、按钮轻微浮动。
- 镜像视角全屏淡入。
- 阶段切换淡入 + 数值条渐进。

## 6. 数据管理策略
- React Context 存储状态
- localStorage 保存：
  - 当前阶段/事件索引
  - 角色信息
  - API Key
- 所有事件 & 阶段 JSON 数据化（易扩展）

## 7. 开发路线图
1. **MVP**
   - 完整 UI 框架 + 事件数据结构
   - 基础数值系统
2. **AI 接入**
   - API 设置与测试
   - 动态剧情生成
3. **镜像视角**
   - 完整时间轴回放 + 隐藏独白
4. **多语言完善**
   - 中/英完整语言包
5. **部署与优化**
   - 资源压缩 + CDN 缓存

## 8. 性能优化方案
- 事件数据懒加载
- 使用 memoization 避免不必要重渲染
- 动画组件减少 DOM 层级

## 9. 可扩展功能
- 更多恋人角色模板
- 语音配音
- 成就系统
- 社交分享与存档

---

## 10. 开始开发（当前仓库已创建的基础结构）
- 已完成基础 UI、Context 状态管理和类型定义。
- 已搭建 Vite + React + TS 框架。
- 已实现基础游戏流程（欢迎页 → 设置 → 剧情 → 结局）。
