# 丹青院 v2 改动明细（2026-06-12）

**用途：** 汇总 2026-06-12 三轮改动（行动三分法+双轨叙事 / 学识 gate / 钱与出身重平衡）的实现位置与依据，供后续修改参照。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`（§3.1/§3.4/§5.1/§6.5 已同步本轮数值）
- 美术清单：`2026-06-10-danqingyuan-v2-art-assets.md`（C6 节 + F 节待替换占位图）
- 前一日改动：`2026-06-11-danqingyuan-v2-changelog.md`
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径均以此为根）

> 行号为本文档落笔时的快照，后续编辑会漂移；定位以「文件 + 符号/选择器名」为准。

---

## 一、行动三分法 + 双轨叙事（拍板来源：明明「行动签会影响正文生成，应当独立开来」「机械类先走模板，预留小游戏接口」「叙事类推主线明线、成长类照民生暗线，围绕同一大事件」）

### 1.1 规则总览
- 行动分三轨：**机械类**（午膳/喝茶/投壶/夜市/弈棋等）走纯模板 + 数值结算**不调 LLM**，预留小游戏接口；**成长类**（晨课/写生/观景/查证/请教/夜读）调 LLM 两阶段场景、行动仅作背景、保留分支；**叙事类**（偶遇/首次到地/主线节拍日）完整 LLM（本轮偶遇系统未做，仅 prompt 层预留区分）。
- **双轨叙事**（类比《燕云十六声》明线+暗线）：叙事类侧重推 `mainlineBeat`（明线·大事件线索），成长类侧重借行动照见 `themeBeat`（暗线·民生百态），七日围绕**同一条**《骸游图》主线收敛，不铺第二条线。
- 字数预算只被成长/叙事类消耗（机械类不再吃预算）。

### 1.2 代码位置

| 改动 | 位置 |
|---|---|
| ActivityCard 加 `track?`/`minigameId?` 字段 | `src/content/activities.ts`（接口定义；5 张成长卡标 `track:'growth'`：library_research/market_sketch/garden_view/consult_teacher/eve_yedu） |
| 单一判定源 `getActionTrack`/`isLlmScene`（删 `isSceneAction`） | `src/engine/sceneEngine.ts`（晨课恒 growth；activity 读 card.track 默认 mechanical；其余 type 防御 mechanical） |
| runAction 三分流 + minigameId 占位 | `src/app/App.tsx`（runAction：minigameId 有值则 return 占位；isLlmScene 才走 startScene；机械类结算已完成不调 LLM） |
| 双轨 prompt + narrativeTrack 字段 | `server/prompts/scene_narrator.md`（actionLabel 降级为背景、新增「双轨叙事」段、主线收敛为唯一一条；bump `scene_narrator@2026-06-12.v6`）；`src/types/llm.ts`（SceneNarratorInput 加 `narrativeTrack?`）；`buildSceneInput` 传入（App.tsx） |

### 1.3 关键事实（预研结论）
- `practice_skill` 是**死路径**（getAvailableActions 从不生成），本轮只需处理 attend_class/activity。
- `server/llm-validation.mjs` 只校验 LLM **输出** schema，input 自由透传，新增 `narrativeTrack` **零校验改动**。
- 机械类文本继续走 `lastRenderedText`（applyAction 已写入），不再被 startScene 清空覆盖。
- `gameEngine.ts` 的 `isLlmSceneAction`（决定模板文本是否入 storyLedger）**不动**：机械类不进 storyLedger 是合理的（午膳投壶不该占 recentLedger 的最近 2 条窗口）。

### 1.4 e2e 实测（DeepSeek 真连，PASSED）
- 机械类（午膳/讨碗热茶/投壶）点击后**无 LLM loading**、走模板结算；成长类（晨课/书房查证）仍跑 2 轮分支场景。
- 意外验证：书房查证（成长类）场景自然出现主线伏笔物件「瓷瓶/药瓶」——双轨设计落地。

---

## 二、小书童引导面板与 LLM 正文同时出现（bug 修复，拍板来源：明明「应当先让小书童对话完后，再让 llm 生成正文」）

### 2.1 真凶时序
LLM 场景 resolve/失败 → `setActiveScene(null)` → 同一 render `guideStep` 重新计算 → 若此时 `getActiveGuideStep(state)` 非 null（如第 1 日 noon/evening 引导待播），GuideDialogue 立刻挂出，与刚 resolve 的 `lastRenderedText` 叠加。

### 2.2 修复（`src/app/App.tsx`，pending 暂存 + 放行时再查）
- 加状态 `pendingAction`：runAction 启动 LLM 前查 `getActiveGuideStep(nextState)`，非 null 则暂存并清空 `lastRenderedText`（背景留白）后 return。
- `completeGuideStep` 末尾放行：仅当 `getActiveGuideStep(patched) == null` 才 startScene；仍有引导待播则保留 pendingAction 顺延（noon 播完 evening 又来时不会提前触发）。
- 对自动开讲无破坏：课表确认时 timeSlot=morning_class、ximeng_in_library=false → getActiveGuideStep 返回 null → 晨课立即开讲（e2e 验证）。
- **副作用（已在 e2e 同步）**：成长类行动若推进时段触发引导，引导先播、场景后放行——`/tmp/e2e-danqingyuan.py` 步骤⑤已改为「先 click_through_guide(shutong_noon) 再 play_scene」。

---

## 三、空时段「四处走走」兜底签（拍板来源：明明「点击书房/后花园/京城街市无事可做」）

### 3.1 落点
- `src/engine/gameEngine.ts` `getAvailableActions`：当前地点本时段 slotActions 过滤后为空且非终章时，注入零成本 `activity` 签 `{ activityId:'look_around', staminaCost:0 }`。
- `resolveActivity` 特判 `look_around`：`timeAdvance:false`、不耗体力、不调 LLM，文本一句通用过场（地点氛围 `locationAtmosphere` 已常驻显示在 `gm-scene-atmosphere`，正文不重复）。
- **将来 NPC 偶遇 roll 的挂载点**：下一轮在此分支 roll，命中转 narrative track；本轮 roll 概率 0。
- 复核：晚间 slotActions 永含 `sleep`，真正空洞是 **noon 的书房/后花园**（e2e 实测确认「书房午间行动签: ['四处走走']」）。

---

## 四、学识 gate（拍板来源：明明「增加学识在后续流程中没发挥作用」「先做学识 gate 再调数值」；范围拍板：③考试加成 + ①深层查证；加成形式：引擎确定性 + LLM 软加成）

### 4.1 Gate③ 考试/小测学识加成（两者结合）
| 改动 | 位置 |
|---|---|
| 评估器 input 加 `knowledge?` | `src/types/llm.ts`（PaintingIntentEvaluatorInput）；App.tsx 两处（submitExam / submitPuzzle）传 `state.stats.knowledge` |
| 引擎确定性加分 | `src/app/App.tsx` submitExam：`averageScore = clamp(rawScore + floor(knowledge/5), 0, 100)`，0~10 分，学识满 50 → +10；60 线不变 |
| LLM 软加成段 | `server/prompts/painting_intent_evaluator.md`「学识的影响」段（高学识宽一档、批语带出见识深浅，不报数字、不唯学识论）；bump `painting_intent_evaluator@2026-06-12` |
- 小测与丹青试共用 submitExam，两者都吃加成。

### 4.2 Gate① 书房深查（降级版，不接线索）
| 改动 | 位置 |
|---|---|
| ActivityCard 加 `minKnowledge?` | `src/content/activities.ts` |
| 新卡 `library_deep_research`（书房深查，growth，体力-2，学识+3，minKnowledge:10） | `src/content/activities.ts`（narratives 触及旧档夹缝被动手脚，为秘阁线索埋钩） |
| 按学识过滤 | `src/engine/gameEngine.ts` `getActivitySlotActions`：`knowledge >= card.minKnowledge ?? 0` |
- 实测：学识<10 只见「书房查证」，≥10 多出「书房深查」。

### 4.3 暂缓（留秘阁重做轮）
Gate② 秘阁线索（≥20）+ 前 6 日 8 张线索积累系统——依赖秘阁三幕重做，工程量大。现状线索只 3 张且全在秘阁内部闭环。

---

## 五、钱文重平衡 + 出身持续优势（拍板来源：明明「初始增加学识没用、商贾+5 因每日发钱也无感，需重新考虑初始数值与后续的关系」；范围拍板：降例钱+增消费深度 / 加持续性优势 / 钩子给三出身 / 买画材一次性 buff）

### 5.1 钱：降例钱 + 增消费深度
| 改动 | 位置 |
|---|---|
| `DAILY_ALLOWANCE` 10→5 | `src/types/core.ts`（7 日总收入约 35 文） |
| 初始钱基线 10→5 | `src/engine/initialState.ts`（与 DAILY_ALLOWANCE 一致 + 出身修正） |
| 新消费卡 `rent_book`（赁书，6 文，学识+1）、`buy_art_supplies`（买画材，10 文，落 buff） | `src/content/activities.ts`（街市，forenoon/afternoon） |
| ActivityCard 加 `setsFlag?` | `src/content/activities.ts`；买画材 `setsFlag:'art_supplies_ready'` |
| buff 旗标 `art_supplies_ready` | `src/content/flags.ts` |

### 5.2 出身持续优势（三出身有持续钩子）
| 出身 | 一次性（保留，initialState.ORIGIN_EFFECTS） | 持续优势（新，gameEngine） |
|---|---|---|
| 商贩之家 | 钱+5 | **市井消费 8 折** `effectiveMoneyCost`（floor，至少 1 文） |
| 耕读之家 | 学识+3 | **学识收益+1** `applyGrowthBonuses` |
| 匠作之家 | 界画+2 | **界画成长+1** `applyGrowthBonuses` |
| 官宦旁支 | 钱+5 学识+2 心情-1 | 一次性 |
| 流民出身 | 体力上限+1 钱-5 | （体力上限本身即持续优势） |

| 改动 | 位置 |
|---|---|
| `effectiveMoneyCost(cost, origin)` 折扣纯函数 | `src/engine/gameEngine.ts`；`activityToAction` 透传 origin → 折后价贯穿生成/可负担过滤/扣款/UI |
| `applyGrowthBonuses(state, patch, track)`：耕读学识+1 / 匠作界画+1 / 买画材 buff（成长类下技能优先或学识+1，生效落旗标清除） | `src/engine/gameEngine.ts`；resolveActivity 与 resolveMorningClass 都调用 |
| 扣款改用 `action.moneyCost`（已含折扣），非 `card.moneyCost` | `src/engine/gameEngine.ts` resolveActivity |
| 表单出身 hint 补持续优势 | `src/components/SetupScreen.tsx`（originOptions） |

### 5.3 引擎实测（node + 真实引擎函数）
- 商贾折扣：茶坊5→4、赁书6→4、买画材10→8；初始钱商贾/官宦 10、耕读/匠作 5、流民 0。
- 耕读书房查证学识 2→3；匠作街市写生界画 1→2；买画材 buff → 下次书房查证学识 2→3 且 buff 自动清除。

---

## 六、本日已知坑 / 注意事项

1. **持续钩子必须用 `action.moneyCost` 扣款**：商贾折后价在 `activityToAction` 写入 action.moneyCost，若 resolveActivity 仍读 card.moneyCost 会按原价扣，折扣失效。
2. **node 跑引擎验证脚本须用绝对 import 路径**：`/tmp/*.mjs` 里写相对路径会解析到 `/tmp/src/...` 报 ERR_MODULE_NOT_FOUND；用项目绝对路径 import + `npx tsx`。
3. **改 prompt 后必须重启 llm-proxy**：proxy 用 `promptCache` Map 缓存 bundle，不重启仍发旧版本；重启后 `curl /api/prompts` 验证版本号。
4. **buff 只在成长类消费**：`applyGrowthBonuses` 第三参传 track，买画材自身 track=mechanical，不会消费自己刚落的 buff。
5. 历史教训仍有效：源码编辑禁用 sed -i；异步收尾以 stateRef.current 为基底；白底道具图深色底须垫浅纸 chip 再 multiply。

---

## 七、本轮待办（衍生）

| 待办 | 说明 |
|---|---|
| C6-1 赁书 / C6-2 买画材专属图 | 当前借用 tool-scroll-stack / tool-pigment-dishes 占位（美术清单 C6 节 + F 节已记），明明出图后替换 |
| 书房深查视觉区分（可选） | 暂与书房查证同图 tool-scroll-stack；若要区分可补「第四层旧档/积尘函匣」专属图 |
| 召集令仪式感弹窗 | C4-5 已接为丹青试签缩略图，正式弹窗待丹青试流程轮 |

---

## 八、决策溯源索引

| 决策 | 来源 |
|---|---|
| 行动三分法 / 双轨叙事 / 机械类预留小游戏口 | 明明 2026-06-12 口述拍板（行动签独立于正文、机械类先模板预留接口、明线暗线围绕同一大事件） |
| 引导先于正文 / 空时段兜底签 | 明明 2026-06-12 口述拍板 |
| 学识 gate 范围（③考试+①深查）/ 加成形式（确定性+软加成） | 明明 2026-06-12 AskUserQuestion 拍板 |
| 钱降例钱+增消费 / 出身持续优势 / 钩子给三出身 / 买画材一次性 buff | 明明 2026-06-12 AskUserQuestion 拍板 |
| Gate② 秘阁线索 + 线索积累系统留秘阁重做轮 | 明明 2026-06-12 拍板（范围控制） |
