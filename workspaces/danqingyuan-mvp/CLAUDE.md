# 丹青院 v2 · 项目向导（CLAUDE.md）

> 宋代翰林图画院**生活模拟养成**游戏（参考《火山的女儿》）。React + Vite 前端 + Node LLM 代理。
> 本文件每次会话自动加载，免去重读代码。深入细节看 §文档指针。

## 启动（两个常驻服务）
```
cd workspaces/danqingyuan-mvp
npm run llm:proxy      # LLM 代理 :8787（改了 server/prompts/* 或 server/*.mjs 必须重启）
npm run dev:proxy      # 前端 :5176（vite HMR，前端改动自动热载）
```
- 验证：`npm run build`（tsc + vite）。
- node 引擎单测：用缓存 tsx `~/.npm/_npx/<hash>/node_modules/.bin/tsx`，**串行单跑**（npx tsx 冷启动慢、并发会互挂；勿 pkill 打断运行中实例）。

## 架构地图
- **引擎（纯函数，state in→out）**：`src/engine/`
  - `gameEngine.ts` applyAction/getAvailableActions（行动分发、时段推进出口）；`statePatches.ts` applyValidatedStatePatch + advanceTime（跨日清零）；`sceneEngine.ts` 场景输入构建/clamp/NPC在场；`initialState.ts`；`ambience.ts`。
- **状态/类型**：`src/types/core.ts`（GameState/TimeState/关系/好感档 helper）、`actions.ts`、`llm.ts`（各 LLM role 的 In/Out）。
- **内容数据**：`src/content/`（activities 活动卡 / courses 课表 / characters NPC人设 / tutorialScripts 教程引导 / locations / mainlineSeeds 主线种子 / worldbook）。
- **UI**：`src/components/`（MainGameScreen 主界面 / DialogueScreen 闲聊 / SchedulePlanner 课表 / ExamScreen / PuzzleScreen 秘阁 / GuideDialogue 小书童 / ArchiveScreen 画案手记）+ `src/app/App.tsx`（编排：runAction/startScene/continueScene/concludeScene/endScene/submitDialogue/openDialogue + 自动开场 useEffect）。
- **LLM**：`src/llm/`（adapter 工厂 + mockAdapter）；代理在 `server/`（llm-proxy.mjs 路由+重试、llm-validation.mjs 校验+sanitize、llm-providers/deepseek 等、prompts/*.md 五个 role 提示词）。
- **存档**：`src/persistence/storage.ts`（localStorage，SCHEMA_VERSION + 链式 migrate，当前 v11）。

## 核心循环（已稳定，改前先懂）
- 一日 5 时段：晨课→上午→午间→下午→晚间。**叙事时段（晨课/上午/下午）= 连续 LLM 流**：进时段自动开场 wander → 三件套（继续 sceneCanContinue / 推荐 suggestedActions / 去别处 shouldConclude）→ **报时钟收尾签推进时段**（演完≥1场可点，满 MAX_SLOT_SCENES=3 高亮）。**沙盒时段（午/晚）= 机械活动不推时间**，点歇晌/就寝出口推进。
- 「去别处」= concludeScene：**不推进时段、不调 LLM**，回主界面自由走动，写 locationThreads 供回访衔接。
- LLM 失败有兜底（fallback 模板句），但加固后大多能 sanitize/retry 救回。

## 铁律（已确定，改动勿破坏）
1. **NPC 行动签绝不用 `type:'activity'`+假 activityId**：getActionTrack 查不到卡判 mechanical→不调 LLM。须新 ActionType + getActionTrack 显式认 growth。
2. **commitPendingSettlement 写 pendingHooks/lastSceneEnding/intents 必须在 next 链末尾**（next 起于行动前快照，早写被覆盖）。
3. **多个 useEffect 监听同一 [state]，执行顺序=定义顺序**：渐进解锁/自动触发须让"状态变更 effect"先于"消费 effect"（曾因此困死院堂）。
4. **改时段/场景模型后必重算字数预算**（DAY_CHARS_MAX）等常量。
5. **好感档（affinityStage）必须喂 scene_narrator**，否则好感不影响正文态度（孤岛）。
6. **NPC canon**：希孟=17-18青年特招画师（非同门/非杂役）；择端=中年男界画先生；李唐=须发灰白长者总教习；**嵩=中年男人物先生**（原"宋姑娘"已于06-26改男）。称谓用古代（师兄/师妹/先生，禁"学妹"）。
7. **闲聊计次=一句一次**，DialogueScreen 进场快照 budget（勿让 maxTurns 随 chatsToday 重渲染递减→双扣 bug）。
8. **数值带正反馈必须两端封顶+保底**（好感日涨封顶12、neutral保底+1、陌路quota6）。
9. **prompt 改动必重启 proxy**；scene/dialogue prompt 版本号前后端常量须一致。

## 防返工纪律（每轮收尾自检）
1. 临时调试 console.log 当轮清除（`grep -rn "console.log" src/ server/` 应只剩 proxy 启动横幅）。
2. 改公共枢纽函数（commitPendingSettlement/applyAction catch/advanceTime/getAvailableActions）前列出所有调用场景防误伤。
3. 删 props/字段/卡片前 grep 全部引用。
4. 收尾必跑 `npm run build` + 针对本轮核心写 node 引擎单测 + 关键回归点（时段推进/跨日/好感）。
5. 试玩报"老问题又现"时先怀疑本轮误伤，git diff / 引擎模拟定位。

## 文档指针
- **改动历史（changelog，按日期）**：`workspaces/docs/plans/2026-06-*-danqingyuan-v2-changelog.md`（06-11起，最新 06-25 含 NPC+LLM加固+数值平衡）。
- **设计总纲**：`workspaces/docs/plans/2026-06-10-danqingyuan-v2-design.md`（冲突以 changelog 新决策为准）。
- **决策全编年（68+条）**：`workspaces/docs/project-memory/project_danqingyuan_v2_redesign.md`（每条含落点+依据，最权威的"改了什么/为什么"）。
- **防返工纪律详版**：`workspaces/docs/project-memory/feedback_no_regression_discipline.md`。
- 美术清单：`workspaces/docs/plans/2026-06-10-danqingyuan-v2-art-assets.md`。

## 当前进度 / 下一步
- ✅ 引擎/活动卡/剧情写作器/A+C叙事时段重构/希孟NPC完整系统（好感融叙事+多轮闲聊+数值平衡+OOC约束）/LLM调用加固。
- **下一个主攻：成长数值重设计**（退役固定签后技能/学识近乎冻结，叙事场景不给数值，"画院养成"支柱空缺。待决策见 project-memory 末尾"成长数值重设计待决策"）。
- 之后：目标线（小测考官/丹青试gating/秘阁三幕重做+8张线索）→ 扩充择端/嵩/李唐好感线 → 地图引擎（待出图）。

## 工作流约定
- **每完成一个改动就 git commit**，message 对应 changelog 条目（如「希孟多轮闲聊系统」）。`git log`=改动历史，`git diff A B`=任意两版代码 diff。
- 大改动收尾时：更新 changelog（docs/plans）+ 同步 project-memory + commit。
- `~/.claude/.../memory/` 是本机活记忆（会话间）；`docs/project-memory/` 是入库镜像（随仓库走、换电脑用），收尾时保持同步。
