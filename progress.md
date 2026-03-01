Original prompt: 恋人模拟器 (Love Simulator) - 完整开发计划 项目概述 一款基于AI的剧情驱动型文字恋爱冒险游戏，支持双语（中/英）。玩家将经历完整的恋爱旅程（6个阶段，18-30个事件），通过多维数值系统决定5种结局。核心亮点是"镜像视角"——结局后揭示恋人在整段感情中隐藏的内心独白。

TODO:
- 初始化项目结构并实现双语欢迎页/设置页
- 实现6阶段剧情引擎、三维数值与关键节点输入
- 实现5结局计算、结局页与镜像视角时间轴
- 接入可选 OpenAI/Gemini API（无 key 时本地生成）
- 按 develop-web-game 技能用 Playwright 客户端验证交互与界面

Notes:
- 仓库为空，从零创建可直接运行的静态 Web 版本。

Update 1:
- 已创建 index.html / src/styles.css / src/main.js。
- 已实现双语欢迎页、三步设置、6阶段18事件剧情、三维数值、5结局、镜像视角时间轴。
- 已实现关键节点自由输入弹窗（可跳过自动补全）和 localStorage 持久化。
- 已加入可选 OpenAI/Gemini 结局润色（失败自动降级本地文案）。
- 已暴露 window.render_game_to_text 与 window.advanceTime，支持自动化脚本读取状态。

Update 2:
- 尝试安装 Playwright 失败：网络受限（ENOTFOUND registry.npmjs.org）。
- 改为执行本地可运行性验证并记录限制。

Update 3:
- 修复关键输入弹窗键盘可达性：弹窗期间 Enter/Space 可直接提交自动补全。
- 修复模板占位符缺省回退：未输入关键节点时会使用内置回退文案，不再出现空句。
- 新增结局页键盘快捷：Enter/Space 可进入镜像视角，便于自动化覆盖。
- package.json 更新为 type=module，记录 Playwright 依赖和测试脚本。

Validation:
- node --check src/main.js 通过。
- Playwright 客户端回归（headless）通过：
  - output/web-game/state-0.json => screen=ending, event_index=18, mirror_events=18。
  - output/web-game-mirror/state-0.json => screen=mirror。
  - output/web-game-en/state-0.json => lang=en, screen=welcome。
- 自动化未生成 errors-*.json，未发现新的 console/pageerror。

TODO / Suggestions:
- 可追加音效与打字机节奏，增强情绪张力。
- 若要严格符合最初技术栈，可迁移到 React + framer-motion + Lucide 版本。
- 可增加多条剧情分支（当前为 18 个固定主线事件）。

Update 4:
- 新增 README.md（功能说明 + 运行与测试方式）。
- 新增 .gitignore（忽略 node_modules 与 output 产物）。

Update 5 (React Migration):
- 完成架构迁移到 React + framer-motion + lucide-react。
- 新增 Vite 工程入口：index.html -> src/main.jsx。
- 新增语言上下文：src/context/LanguageContext.jsx。
- 将原剧情/文案/配置常量提取为 src/gameData.js（保留 6 阶段 18 事件）。
- 重写主应用为 React 组件：src/App.jsx（欢迎/设置/游戏/结局/镜像、键盘交互、本地存档、AI润色、雷达图）。
- 保留自动化接口：window.render_game_to_text 与 window.advanceTime。

Validation (post-migration):
- npm run build 通过。
- Playwright 客户端验证通过：
  - output/react-web-game/state-0.json => screen=mirror, event_index=18, mirror_events=18。
  - output/react-web-game-en/state-0.json => lang=en, screen=welcome。
- 未发现 errors-*.json。

Update 6 (TypeScript + Modular Refactor):
- 将入口与核心文件迁移为 TS/TSX：
  - src/main.tsx
  - src/App.tsx
  - src/context/LanguageContext.tsx
  - src/gameData.ts
- 新增类型与工具层：
  - src/types.ts
  - src/utils/storage.ts
  - src/utils/gameUtils.ts
- 拆分通用组件：
  - src/components/TopBar.tsx
  - src/components/MetricBox.tsx
  - src/components/InputModal.tsx
  - src/components/RadarChart.tsx
- 拆分屏幕组件：
  - src/screens/WelcomeScreen.tsx
  - src/screens/SetupScreen.tsx
  - src/screens/GameScreen.tsx
  - src/screens/EndingScreen.tsx
  - src/screens/MirrorScreen.tsx
- 新增 TS 配置与类型声明：
  - tsconfig.json
  - src/vite-env.d.ts
- 回归修复：恢复语言切换按钮 data-lang 属性，确保 Playwright 兼容。

Validation:
- npm run build 通过。
- npm run typecheck 通过。
- Playwright 客户端验证：
  - output/react-ts-web-game/state-0.json => screen=mirror, event_index=18。
  - output/react-ts-web-game-en/state-0.json => lang=en, screen=welcome。
- 未生成 errors-*.json。

Update 7 (Data Module Split):
- 将原超大数据文件拆分为模块化目录：
  - src/data/storageKeys.ts
  - src/data/text.ts
  - src/data/keyInputLibrary.ts
  - src/data/events.ts
  - src/data/defaultState.ts
- src/gameData.ts 改为 barrel 聚合导出，保持上层调用兼容。

Validation:
- npm run typecheck 通过。
- npm run build 通过。
- Playwright 客户端验证通过：
  - output/react-ts-split-web-game/state-0.json => screen=mirror。
  - output/react-ts-split-web-game-en/state-0.json => lang=en。
- 未发现 errors-*.json。

Update 8 (Engine Hook Extraction):
- 新增引擎 Hook：src/hooks/useLoveGameEngine.ts
  - 承接 App 原有状态机、持久化、副作用、键盘事件、剧情推进与结局计算。
  - 对外暴露 UI 所需状态/行为接口，App 仅负责组件编排。
- 精简 src/App.tsx，改为薄壳组件（TopBar + screen 选择）。

Validation:
- npm run typecheck 通过。
- npm run build 通过。
- Playwright 回归通过：
  - output/react-hook-web-game/state-0.json => screen=mirror, event_index=18。
  - output/react-hook-web-game-en/state-0.json => lang=en, screen=welcome。
- 未发现 errors-*.json。

Update 9 (Hook Decomposition):
- 将单体引擎 Hook 继续拆分为三层：
  - src/hooks/useNarrativeFlow.ts（剧情推进、结局计算、模板渲染、AI润色）
  - src/hooks/usePersistence.ts（localStorage 同步、进度恢复、镜像模式与测试接口）
  - src/hooks/useKeyboardControls.ts（键盘控制与快捷交互）
- src/hooks/useLoveGameEngine.ts 改为组合层，负责装配状态与子 hook。

Validation:
- npm run typecheck 通过。
- npm run build 通过。
- Playwright 回归通过：
  - output/react-subhooks-web-game/state-0.json => screen=mirror, event_index=18。
  - output/react-subhooks-web-game-en/state-0.json => lang=en, screen=welcome。
- 未发现 errors-*.json。

Update 10 (Production Release Prep):
- 新增发布前检查脚本：scripts/release-check.mjs
  - 执行 typecheck + build，并校验 dist 产物完整性（index/assets/_headers/_redirects）。
- package.json 新增脚本：
  - release:check
  - release:preview
- 新增静态托管配置：
  - public/_headers（安全头 + 缓存策略）
  - public/_redirects（SPA 回退）
  - public/robots.txt
- 新增 CI 工作流：.github/workflows/release-check.yml（push/pr/manual 自动执行发布检查并上传 dist artifact）。
- 新增部署文档：DEPLOYMENT.md（预检、托管配置、发布后烟测）。
- README 增加生产发布章节与 hooks 目录说明。

Validation:
- npm run release:check 通过。
- 预览烟测通过：vite preview 返回 HTTP 200 且首页 HTML 正常。
- 已停止临时 preview 服务，端口 4178 无监听。
