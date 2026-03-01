# satyayuga · 恋人模拟器 (Love Simulator)

基于 `React + framer-motion + lucide-react` 的双语（中文/English）剧情驱动文字恋爱冒险游戏。

## 架构

- 视图层：React（函数组件 + Hooks）
- 动画层：framer-motion
- 图标：lucide-react
- 语言管理：React Context（`LanguageContext`）
- 数据与剧情：`src/gameData.ts`（6阶段、18事件）
- 持久化：`localStorage`（语言、设置、进度、API 配置）

## 目录

- `src/components/`: 可复用 UI 组件（TopBar、MetricBox、InputModal、RadarChart）
- `src/screens/`: 页面级视图（Welcome/Setup/Game/Ending/Mirror）
- `src/context/`: React Context（语言）
- `src/hooks/`: 引擎与子能力 hooks（useLoveGameEngine/useNarrativeFlow/usePersistence/useKeyboardControls）
- `src/data/`: 剧情数据与语言包拆分模块（text/events/keyInput/defaultState/storageKeys）
- `src/gameData.ts`: 数据聚合导出层（兼容上层 import）
- `src/utils/`: 纯函数工具（存储、游戏数值与阶段计算）
- `src/types.ts`: 核心类型定义

## 功能

- 6 阶段剧情流程（初识/暧昧/确认关系/热恋/磨合/稳定期）
- 三维关系数值：好感度、默契值、理解度
- 关键节点自由输入（可跳过自动补全）
- 5 种结局 + 镜像视角时间轴独白
- 可选 OpenAI/Gemini 结局文案润色（无 key 自动降级本地文案）
- 自动化可读状态：`window.render_game_to_text`、`window.advanceTime(ms)`

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run typecheck
npm run preview
```

## 生产发布

```bash
npm run release:check
```

- 发布检查脚本：`scripts/release-check.mjs`
- CI 工作流：`.github/workflows/release-check.yml`
- 详细部署说明见：[DEPLOYMENT.md](./DEPLOYMENT.md)

`public/_headers` 与 `public/_redirects` 会在构建时复制到 `dist/`，用于静态托管安全头与 SPA 回退。

## Playwright 客户端回归

```bash
npm run dev -- --host 127.0.0.1 --port 4173
node ./web_game_playwright_client.js --url http://127.0.0.1:4173 --click-selector "#quick-start-btn" --actions-file actions_enter.json --iterations 1 --pause-ms 350 --screenshot-dir output/react-web-game --headless true
```
