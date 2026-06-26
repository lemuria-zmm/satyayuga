# 丹青院 v2 改动明细（2026-06-25 ~ 06-26）

**用途：** 汇总希孟 NPC 系统（好感融入叙事流 → 多轮选项闲聊 → 数值平衡 → OOC/衔接打磨）与 LLM 调用加固两条主线。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`
- 前序改动：`2026-06-18-danqingyuan-v2-changelog.md`（退役固定签→A+C叙事时段重构→七日打磨）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径以此为根）

> 本阶段主线：**让 NPC（希孟）好感真正影响"读到的故事 + 看到的画面"，把孤儿深谈系统重做成多轮选项闲聊，并修一连串数值/OOC/衔接问题。** 记忆决策编号 60~68。

---

## 一、希孟 NPC 系统：好感融入叙事流 + 立绘 + 深谈（2026-06-25，拍板：明明「好感系统与LLM正文割裂、希孟少出场、好感无影响、缺聊天入口」）

### 1.1 病根
好感系统是**孤岛**：`hiddenAffinity` 只驱动梅花格 + 便签氛围句，**不喂 scene_narrator**；删畅谈后 `DialogueScreen/handleChat/character_dialogue` 成**孤儿**；`stage`（关系档）init 后**从不更新**（statePatches 只 bump affinity）。

### 1.2 改动
| 改动 | 位置 |
|---|---|
| 修 stage bug：`stageFromAffinity(n)`（陌路0/同僚20/同道40/知己60/莫逆80）+ `RELATIONSHIP_STAGE_LABELS`，statePatches relationshipDelta 后重算 stage | `types/core.ts`/`engine/statePatches.ts` |
| **好感喂 LLM（核心-影响阅读）**：`npcIdsToCards(ids,relationships)` 对希孟带 `affinityStage` 中文档；SceneNarratorInput.npcsPresent 加 affinityStage | `engine/sceneEngine.ts`/`types/llm.ts`/`App.tsx buildSceneInput` |
| 希孟出场率：NPC_HAUNTS library 加 ximeng | `engine/sceneEngine.ts` |
| 立绘差分（影响视觉）：场景含希孟时按 stage 换图（后移入深谈界面，见 §2） | — |
| 深谈接回：便签卡好感≥同僚可点→DialogueScreen | `App.tsx`/`MainGameScreen.tsx` |
| 画室解锁：好感≥知己(60) 解锁 ximeng_studio + 专属 facts | `App.tsx useEffect`/`engine/sceneEngine.ts` |
| prompt v11→v12「在场人物的关系」段（按 affinityStage 写态度：陌路冷淡→莫逆无话不谈） | `scene_narrator.md` |

---

## 二、立绘改入深谈界面（2026-06-25，拍板：明明「正文浮动立绘挡学科牌、不与对话结合意义不大」）

- 撤掉 MainGameScreen 正文场景的浮动立绘（移除 JSX+css+计算）。
- 改在 `DialogueScreen` 按好感差分显示（`ximengPortraitByAffinity`：≥60 smile / ≥40 painting / else normal）。立绘与对话结合。

---

## 三、希孟闲聊系统：多轮选项 + 每日限次（2026-06-25，拍板：明明「没单独入口、深谈只一轮、好感无增减机制」）

### 3.1 拍板数值
- 便签卡**首遇(metXimeng)即解锁**（去掉好感≥20门槛，破死锁）。
- 首遇初始好感：非山水 +5 / 山水 +12（都陌路档）。
- 每日闲聊次数按好感档：陌路3/同僚10/同道20/知己30/莫逆40（**§7 后调整**）。
- 闲聊 = **选项制(warm/neutral/probing) + 一个自由输入口，多轮连续**；进场扣体力 -1。

### 3.2 改动
| 改动 | 位置 |
|---|---|
| `dailyChatQuota(stage)` + CharacterRelationshipState.chatsToday（跨日清零） | `types/core.ts`/`engine/statePatches.ts` |
| 首遇好感在 completeGuideStep 给（山水12/其余5）；首遇不计次（dialogueIsFirstMeet） | `App.tsx` |
| CharacterDialogueOutput 加 replyOptions[{text,tone}]；Input 加 playerReply/replyTone/recentDialogue；校验+mock 两处 | `types/llm.ts`/`llm-validation.mjs`/`mockAdapter.ts`/`mock-provider.mjs` |
| submitDialogue 重构为单轮（tone 兜底裁决 delta，clamp±3）；DialogueScreen 全重写多轮 | `App.tsx`/`DialogueScreen.tsx` |
| prompt `character_dialogue@v2`（多轮 + tone→好感倾向 + 按 stage 写亲疏） | `character_dialogue.md` |
| 存档 SCHEMA 8→9→10（slotSceneCount/chatsToday）+迁移 | `storage.ts` |

### 3.3 LLM 拟自然结束语（取代模板）
次数耗尽时传 `isFinalExchange`，prompt 指引「回完玩家这问、再自然带一句作别、replyOptions 给空」；删 DialogueScreen 的 FAREWELL_LINES 模板。prompt v3。

---

## 四、闲聊三问题修正（2026-06-26）

| # | 问题 | 修复 | 位置 |
|---|---|---|---|
| 1 | **计次双重扣减 bug**：显3句聊2句到顶 | maxTurns 取 `quota-chatsToday` + submitDialogue 每句 chatsToday+1 让 maxTurns 递减，**同时**本地 turnsUsed 也递增→减半。**DialogueScreen 进场 useState 快照 budget**（不随 prop 递减） | `DialogueScreen.tsx` |
| 2 | 对话历史不持久、无衔接、看不到记录 | CharacterRelationshipState 加 `chatHistory`（SCHEMA 11+migrateV10，跨日保留）；submitDialogue push 末30条 + 喂 recentDialogue 衔接；DialogueScreen 加「往来」折叠记录区 | `types/core.ts`/`storage.ts`/`App.tsx`/`DialogueScreen.tsx` |
| 3 | 好感与 tone/自由输入没连；自由输入写死 neutral | submitFree 传 tone=undefined；**三路裁决**——boundaryViolation→降一档(stageFloor-1)/选项 tone 保底/自由输入纯信 LLM 语义判 | `App.tsx`/`character_dialogue.md v4` |

**安全越界规则**：问 AI/大模型/元游戏 → LLM 返 `boundaryViolation:true` → 希孟不出戏回避 + 引擎直接降一档（绕过 ±3 clamp）。`stageFloor()` 助手 + 输出字段 + 校验 + mock 越界检测。

---

## 五、LLM 调用失败全面加固（2026-06-26，proxy 诊断日志锁定根因）

**根因**：DeepSeek 输出质量 + 校验过严 + 解析脆弱 → 频繁 fallback（兜底句替代正文）。422：narrativeText 超字/locationId 非法/npcId 非法；400：中文全角引号 ""（JSON 非法）/结构截断。**且原 createValidatedEnvelope 只重试 422，解析失败(400)直接抛不重试。**

**三管齐下**（`llm-proxy.mjs`/`deepseek-provider.mjs`/`llm-validation.mjs`）：
- **A** proxy createValidatedEnvelope 把 outputFactory 抛错也纳入重试循环（try/catch continue）。
- **B** deepseek parseJsonOutput 解析失败时 `repairJsonQuotes` 修复**结构位的全角引号**（仅替换 `:[{,` 后 / `]},` 前的 ""→英文"，不误伤字符串内真中文引号）再重试。
- **C** 新增 `sanitizeLlmOutputForRole`（校验前就地清理）：scene narrativeText 超 segmentMax 截断、suggestedActions 非法 location/npc 项**过滤而非整体拒**。

proxy 保留 `[retry]`/`[FAIL]` 精简运维日志（LLM 失败率可见）。

---

## 六、第二轮试玩修正（2026-06-26）

| # | 问题 | 修复 |
|---|---|---|
| 嵩 canon | 明明指嵩应是中年男子，但**原设定嵩=女性"宋姑娘"**——拍板改中年男子（characters.persona/入院引导/scene prompt 全量改） |
| 首遇独立计次 | 首遇也限次但与主动闲聊分开：DialogueScreen 本地 turnsUsed 自管，`FIRST_MEET_CHAT_TURNS=4`，首遇不占当日额度 |
| 未遇希孟提前出场 | SceneNarratorInput 加 `ximengMet`，prompt v14「ximengMet=false 时希孟不得出场」 |
| 希孟首遇兜底 | applyAction move_to library 未遇时**100%落 ximeng_in_library**（删 45% roll）。遗留：仍需玩家进书房 |
| OOC（画杂活/称学妹/重复描外貌） | scene prompt v15：身份准且前后一致（特招画师非杂役）+ 古代称谓（禁"学妹"）+ 已认识不重新介绍外貌 |
| 闲聊 UI | 立绘移左、往来面板移右 + 限高（不被底部对话框遮） |
| 闲聊开场衔接 | DialogueScreen 加 onOpen + mount effect：有历史时进场希孟**延续上次话题主动开口**；Input 加 `isOpening`，dialogue prompt v5；mock 适配 |

---

## 七、好感数值平衡（2026-06-26，拍板：明明「算清升降曲线防极端」）

**模拟暴露正反馈失衡**：好感越高 quota 越大（30/40）→ ①山水+warm(+3) **第1日就拉满莫逆**（失控）；②neutral 给0/低增量时陌路 quota 仅3句/日 → **7日还陌路甚至永远卡死**。富者愈富、贫者愈贫。

**三项调整**（`types/core.ts`/`App.tsx submitDialogue`/`statePatches.ts`）：
- **neutral 下限 0→保底+1**（治低档卡死，至多+2）。
- **每日好感涨幅封顶 `DAILY_AFFINITY_CAP=12`**（正增量当日累计满12后归零，降好感与越界降档不受限）。新增 `affinityGainedToday`（跨日清零）。
- **dailyChatQuota 陌路 3→6**（治前3日闷在陌路）。

**终版曲线**（已模拟）：最快山水+warm D3知己/D5莫逆/D7满（不再一日满）；最慢 neutral 保底 D2出陌路进同僚/D7莫逆（不再卡死）；平均 D2同僚、D4-6同道知己。

**前端**：去掉好感 ↑/↓ 提示（后端照算，删 lastDelta + 右侧 affinity-note）；「往来」按钮改常显。

---

## 八、本阶段已知坑 / 教训

1. **好感系统与叙事主流要打通**：好感档（affinityStage）必须喂 scene_narrator，否则好感再高正文态度不变（孤岛）。
2. **带正反馈的养成数值必须模拟两端极端**：高档解锁更多机会→富者愈富要封顶，贫者愈贫要保底+提低档机会，否则一端失控一端卡死。
3. **LLM 输出校验应"能修则修(sanitize)、能重试则重试"**，不轻易整体拒绝→fallback；DeepSeek 常见破损 = 全角引号 + 超字数 + 非法枚举值，都可在 proxy 侧吸收。
4. **OOC 靠 prompt 约束只能降概率非根治**：persona 喂入 + 强约束（身份/年纪/称呼/不重复介绍），真实 LLM 仍可能偶发，高频时再加 proxy 端词扫描兜底。
5. **prompt 改动必重启 proxy**（promptCache）；scene/dialogue 版本前后端常量须一致。
6. **canon 冲突先问**：嵩"宋姑娘"原是有意设定，明明记反了——改 canon 前先确认是否真要推翻。

---

## 九、决策溯源索引

| 决策 | 来源 |
|---|---|
| 好感融入叙事流 / 立绘 / 深谈奖励 / 只做希孟 | 明明 2026-06-25 AskUserQuestion |
| 立绘移入深谈界面 | 明明 2026-06-25 试玩 |
| 多轮选项闲聊 / 首遇即解锁 / 每日限次数值 | 明明 2026-06-25 AskUserQuestion（二轮敲定数值）|
| 计次=一句 / 持久历史+衔接 / 自由输入按语义+好感档判 / 越界降一档 | 明明 2026-06-26 AskUserQuestion |
| 嵩改中年男子 / 首遇独立计次 / 希孟首遇兜底 / 未遇不出场 | 明明 2026-06-26 AskUserQuestion |
| LLM 调用全面加固 | 明明 2026-06-26 复现日志 + AskUserQuestion |
| 好感数值平衡（neutral保底/日涨封顶12/陌路quota6）/ 去前端好感提示 | 明明 2026-06-26 模拟 + AskUserQuestion |
| OOC约束 / 闲聊UI布局 / 开场衔接 | 明明 2026-06-26 试玩 + AskUserQuestion |
