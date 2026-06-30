# 丹青院 v2 · 项目向导（CLAUDE.md）

> 宋代翰林图画院**生活模拟养成**游戏（参考《火山的女儿》）。React + Vite 前端 + Node LLM 代理。
> 本文件每次会话自动加载，免去重读代码。深入细节看 §文档指针。

## 新 session 自检（每次开窗口先做）
1. 本文件已自动加载 → 架构/铁律/进度已在上下文。本机 `~/.claude/.../memory/` 决策编年通常也自动加载。
2. **若本机无记忆（换了电脑/新机）**：先读 `workspaces/docs/project-memory/project_danqingyuan_v2_redesign.md`（决策全编年）+ 最新 `workspaces/docs/plans/*-changelog.md`，等同于补回记忆。
3. 确认当前分支：开发在 **`danqingyuan-v2-baseline`** 分支（不在 main）。两个常驻服务（proxy:8787 / dev:5176）若没起，按 §启动 拉起。
4. 用户开场通常只给一个指向（"继续做成长数值"/"试玩发现X"）——背景已在上下文，不必再问"项目是什么"，直接干。

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
8. **数值带正反馈/免费补给必两端封顶+保底**（好感日涨封顶12、neutral保底+1、陌路quota6）。**凡"确定性给数值"的成长点都要每日封顶**——午/晚沙盒有免费回体力(讨茶+1)，无封顶=免费补给循环无限刷（技能 DAILY_SKILL_CAP=4、学识 DAILY_KNOWLEDGE_CAP=3，仅练习签计入，晨课不限）。新增同类资源默认就上封顶。
9. **prompt 改动必重启 proxy**；scene/dialogue prompt 版本号前后端常量须一致。
10. **沙盒练习（practice track）走独立轻量路径**：调 LLM 但**不进 isLlmScene→startScene 三件套**（isLlmScene 只认 growth/narrative）；runPractice 拿单段文即 setActiveScene(null) 结算，不写主线账本、不推时段。技能收益引擎确定性给（computePracticeGain，卡可 practiceAmount 覆盖），技能日封顶4/学识日封顶3。
11. **心情有真作用（06-28，勿当死数值）**：moodGrowthModifier ≥8+1/≤3-1 作用练习+晨课成长收益（clamp≥1，封顶前）；isPracticeMoodLocked 心情≤3 锁练习签（dock 置灰「心绪不宁」+applyAction 防御 no-op），**晨课不锁**（morning_class 无调心情手段，靠收益-1 软惩罚）。**下降通道（否则惩罚永不触发）**：晨课/练习每场 mood-1（叙事 wander/follow 不扣）、体力归零强制入夜额外 -2（正常就寝不扣）；饮食/娱乐回补。
12. **练习生文用 PRACTICE_SEGMENT_MIN/MAX(60/150)**，非全局 SEGMENT(200/500)——练习是轻量单段沉浸，勿用长预算。

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
- ✅ **成长数值重设计（06-27，沙盒练习成长系统）**：午/晚沙盒玩家自主走书房/后花园/街市点"练习签"主动练技能——第四条行动路径 `practice`，调 LLM 出单段沉浸文（runPractice，不进三件套）+ 引擎确定性给技能（本科+2/副+1/学识+1，每日封顶4，体力闸防刷）。
- ✅ **数值打磨（06-28）**：学识每日封顶3、心情双向作用（≥8+1/≤3-1反哺成长+≤3锁练习）、心情下降通道（晨课/练习-1、体力归零-2）、练习生文≤150字。
- ✅ **晚间宿舍温书自测（06-28，周中小测）**：晚间回宿舍出「温书自测」签，1~6日每晚1题、答对小额加成不罚、复用丹青试出卷评分基建（examMode 分流，第7日丹青试硬编码不动）。
- ✅ **丹青试目标线（06-28）+ 平衡修（06-29）**：技能 gating（本科<**30** 封顶59分）+ 多维结局（分数定档+好感/暗线修饰）+ 独立结局页 EndingScreen；温书自测脱离心情修正（答对稳+1）。
- ✅ **史实对齐·职称+结局双入口（06-29，依据宋代画院史料）**：通过授最低阶「祗候」（择端=画院待诏最高阶）；结局双入口——秘阁=通过即解锁、希孟画室=通过+好感知己(60)，双开预热后续篇章。靖康暗线/小测以诗入画（改prompt）留后续轮。
- ✅ **结局序列重设计（06-30，批一+批二完整）**：丹青试交卷后多段立绘演出——【导师点评(LLM)】→（落第→【补考保底过】）→【授衔(CSS朱印授祗候+七日回顾+解锁入口)】→（好感≥知己→【引希孟线过场→见希孟(LLM预热话)】）→【收尾动画(打字机)】。新建 `engine/endingSequence.ts`（EndingStage 纯函数状态机）+ EndingDialogue/TitleGrantOverlay/XimengBridge/EpilogueScreen 组件；rank/解锁推迟到授衔段提交（落第补考保底过 finalScore≥60 才授名分）；character_dialogue v7（examReview 点评 + endingMeet 见希孟，前后端一致）。
- ✅ **主线增强（06-30，依据宋代画院史料）**：①靖康暗线前奏——ambience THEME_BEATS 第6~7日加亡国前奏（花石搬空/乡间乱子/北边边关/粮价涨，**半架空不用金辽徽宗靖康真名、只透风声不说破**）+ scene prompt v18 + 结局 themeNote 点；②以诗入画 poem_intent 新题型——取古诗句考虚字（藏/锁/香），三选项=不同"怎么画出虚字"巧思，复用 hiddenRubric 评分，丹青试+温书自测都可能出（painting_prompt v2，诗句 LLM 自选）。
- **下一个主攻**：丹青试题型改法（明明另定）→ 秘阁三幕重做+8张线索 → 扩充择端/嵩/李唐好感线。
- **待补美术/增强**：温书自测 UI + 结局页各档卷轴/配图 + 结局 LLM 散文（见 project-memory 待补美术区）。

## 工作流约定
- **每完成一个改动就 git commit**，message 对应 changelog 条目（如「希孟多轮闲聊系统」）。`git log`=改动历史，`git diff A B`=任意两版代码 diff。
- 大改动收尾时：更新 changelog（docs/plans）+ 同步 project-memory + commit。
- `~/.claude/.../memory/` 是本机活记忆（会话间）；`docs/project-memory/` 是入库镜像（随仓库走、换电脑用），收尾时保持同步。
