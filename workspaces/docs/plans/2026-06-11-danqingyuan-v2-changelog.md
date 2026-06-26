# 丹青院 v2 改动明细（2026-06-11）

**用途：** 汇总 2026-06-11 全天四轮改动的实现位置与依据，供后续修改参照。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`
- 美术清单：`2026-06-10-danqingyuan-v2-art-assets.md`（接入状态见其 F 节）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径均以此为根）

> 行号为本文档落笔时的快照，后续编辑会漂移；定位以「文件 + 符号/选择器名」为准。

---

## 一、宿舍夜间开启 + 就寝收日（拍板来源：明明口述「应当强制规定：宿舍只能夜间开启，在宿舍休息后，这一天才算过完，然后开启次日」+ 同日拍板：晚间娱乐不限次数 / 早歇并入就寝 / 小憩片刻移除）

### 1.1 规则总览
- 晚间娱乐**不推进时间、不限次数**，以体力/钱文为闸；
- 宿舍**仅晚间可前往**，白日右栏显示灰牌「晚间方开」；
- 「就寝」签是晚间**唯一收日出口**；当晚未玩任何娱乐（`evening_fun_d{day}` 未落）= 自动「早歇」，次日晨体力 +1；
- 「早歇」「小憩片刻」两张卡删除；讨碗热茶去掉晚间档（防无限刷体力）；
- 体力归零强制入夜仍为兜底（statePatches while-loop 不动）。

### 1.2 代码位置

| 改动 | 位置 |
|---|---|
| ActionType 增加 `'sleep'` | `src/types/actions.ts` |
| 晚间行动 = 娱乐卡 + 就寝签 | `src/engine/gameEngine.ts:133-138`（getSlotActions case 'evening'） |
| 宿舍仅晚间可走动 | `src/engine/gameEngine.ts:146-159`（getMoveActions 过滤 `locId !== 'dormitory' \|\| timeSlot === 'evening'`） |
| 就寝签各处可见（点击自动前往宿舍） | `src/engine/gameEngine.ts:161-173`（getAvailableActions 例外：attend_class / take_exam / **sleep**） |
| 晚间活动不推时间 + 落娱乐旗标 | `src/engine/gameEngine.ts:175-198`（resolveActivity：`isEvening` → `timeAdvance: !isEvening`、`flagsSet: evening_fun_d{day}`） |
| 就寝结算（早歇判定 + 文案） | `src/engine/gameEngine.ts:288-296`（applyAction `action.type === 'sleep'`：无娱乐则 `nextDayStaminaBonus = 1`） |
| 次日晨体力 = 基础 + 修正 | `src/engine/statePatches.ts:65-66, 112-113`（nextDayStaminaBonus 在 timeAdvance **之前**累加，收日时消费并清零——一个 patch 即可完成就寝） |
| 就寝不走 LLM 场景 | `src/engine/sceneEngine.ts:25-27`（isSceneAction 不含 sleep，纯模板文本） |
| 白日宿舍灰牌「晚间方开」 | `src/components/MainGameScreen.tsx:564-579`（dormClosed 判定 + 文案） |

### 1.3 活动卡数值（`src/content/activities.ts`，EVENING_ACTIVITIES / IDLE_ACTIVITIES）
- 全部晚间卡加体力消耗：投壶/弈棋/听琴/听曲/夜市/夜读 **-1**、蹴鞠 **-2**（蹴鞠另有 `nextDayStaminaBonus: -1`）；夜市原 staminaGain+1 已删。
  - **Why：** 晚间不推进时间后，免费娱乐 = 无限刷心情；体力是唯一闸门。
- `eve_rest`（早歇）、`idle_nap`（小憩片刻）整卡删除；`idle_tea`（讨碗热茶）timeSlots 收紧为 `['forenoon','afternoon']`。

### 1.4 文档同步
- 设计总纲 §2（时段表晚间行）、§5.1（讨碗热茶注释）、§5.3（晚间规则段落 + 新表含体力列 + 就寝行）已重写。
- 记忆条目：`project_danqingyuan_v2_redesign.md` 第 34 条。

---

## 二、P0/P1 美术资产全量接入（拍板来源：明明「对照清单和美术文件夹里的 png 文件名，把还没有加的图片加进去」）

### 2.1 接入策略（关键约定，后续加图照此办理）
- 新产出 PNG 均为 **RGB 不透明白底**（PIL 验证）→ 放在浅色纸面上用 CSS `mix-blend-mode: multiply` 融合；
- **深色底（顶部夜牌）不能直接 multiply**（白底会糊成白块）→ 先垫浅纸小圆片（`#ece1c8` 圆形 chip）再在 chip 内 multiply；
- 面板/场景类整图直接做背景图，无需处理；
- 资产位置约定：场景图在 `public/` 根（`{name}-bg.png`）、活动卡图在 `public/cards/`、图标与 UI 件在 `public/ui/`；
- 尺寸（sips 预缩）：图标 128px、卡图 256px、结算笺 1024px、水牌 768px。

### 2.2 数据层
| 改动 | 位置 |
|---|---|
| ActivityCard 新增 `art?: string` 字段 | `src/content/activities.ts:25` |
| 19 张活动卡全部配图 | `src/content/activities.ts`（food-\*→午膳5、play-\*→晚间6、tool-\*→书房查证/街市写生/观景/请教导师、buy-teahouse→茶坊+热茶、buy-night-snack→夜市+街边吃食） |

### 2.3 主界面（`src/components/MainGameScreen.tsx`）
| 改动 | 位置 |
|---|---|
| 五时段图标映射 `timeSlotIcons` | `:68`（/ui/icon-slot-{morning,forenoon,noon,afternoon,evening}.png） |
| 行动签配图函数 `actionArt()` | `:77`（activity→ACTIVITY_BY_ID art；attend_class→prop-checkin-tag；take_exam→prop-exam-summon） |
| 场景态背景覆盖 `sceneActivityBackgrounds` | `:85`（teahouse→/teahouse-bg、eve_tingqu→/washe-theater-bg、eve_nightmarket→/night-market-bg）；`backgroundUrl` 组合逻辑在 `:251`（场景态优先 → 晚间后花园 `/garden-night-bg.png` → 地点底图；`secret_archive` 底图换 `/archive-gate-bg.png`） |
| 名牌时段 chip + 属性图标 | `:293` 一带（gm-np-slot-chip / gm-np-stat-chip；「体力/心情/学识/钱」文字标签已删，体力点仍在） |
| 今日课业水牌 | `:376`（gm-roster-board，课目取 `state.curriculum[day]`，第 7 日固定「丹青试」） |
| 结算纸签换图 | `:463`（结构未动，样式换底见 2.5） |
| 行动签缩略图 | `:477-485`（`gm-action-tag-art`，置于竖排标题上方） |

### 2.4 对话页好感梅花（与主界面同一套点亮逻辑）
- 点亮公式：`affinity <= 0 ? 0 : min(5, 1 + floor(affinity / 20))`，主界面在 `MainGameScreen.tsx:249` 一带（ximengPlumsLit），对话页在 `DialogueScreen.tsx`（plumsLit）。
- DialogueScreen 新增 `affinity: number` prop；App 传入 `state.relationships[npcId].hiddenAffinity`（`src/app/App.tsx:980`）。
- 好感浮签梅花列：`DialogueScreen.tsx:143`（dlg-affinity-plums，竖列 5 瓣）。

### 2.5 样式（`src/styles/app.css`，全部新选择器）
| 选择器 | 位置 | 要点 |
|---|---|---|
| `.gm-np-slot` / `.gm-np-slot-chip` / `.gm-np-stat-chip` | `:149` 一带 | 18px/16px 浅纸圆片 #ece1c8，内图 multiply；`.gm-np-slot.slot-other` opacity 0.55 |
| `.gm-roster-board` | `:337` | 74×152 + padding-top 20px（牌顶是挂绳，文字往牌面中心压）；透明底 PNG 100%/100% |
| `.gm-settlement-slip` | `:603` | 背景换 `/ui/prop-result-slip.png`（原渐变删）；`.gm-settlement-seal` display:none（图自带朱印）；阴影改 drop-shadow |
| `.gm-action-tag-art` | `:682` | 28px multiply；`.gm-action-tag` padding-top 30→22 腾位、title 加 flex:1 + overflow hidden |
| `.gm-ximeng-plums` | `:938` | 横排 5 瓣 16px multiply（便签是浅纸底，直接 multiply） |
| `.dlg-affinity-plums` | `:2984` | 竖列 14px；对话页底图偏暗 → 垫 #ece1c8 圆角纸条再 multiply |

### 2.6 图片后处理记录（可复现）
- **结算笺** `public/ui/prop-result-slip.png`：PIL 按「与纯白 diff > 18」取 bbox 裁掉白边（1024×341 → 936×165）。
- **水牌** `public/ui/prop-roster-board.png`：三步——① 同上 bbox 裁边（512×768 → 360×752）；② **边缘泛洪填充**把外围白底（RGB>232 且与边界连通）转透明（清 49k 像素）；③ 顶部 0~130px 内残留白（挂绳圈内封闭白三角）按阈值直接清。已在深色底合成验证无白边。
  - **教训：仅裁 bbox 不等于抠图**——异形道具（带挂绳/雕花）必须泛洪去底，封闭区域还要补刀。
- 立绘 12 张此前已用 rembg（isnet-anime）抠透明（第四轮拍板记录，记忆第 32 条）。

### 2.7 暂缓资产（系统未建，做时再接）
| 资产 | 等待的系统 |
|---|---|
| C4-4 偶遇面板 prop-encounter-panel | NPC 偶遇事件（下一轮） |
| C4-6 秘阁钥匙 prop-archive-key | 秘阁解锁奖励展示 |
| C5-1 钱袋 / C5-4 听曲牌筹 | 消费确认弹窗（当前消费直接结算） |
| C4-5 召集令的仪式感弹窗 | 丹青试流程轮（目前仅作丹青试签缩略图） |

---

## 三、希孟便签 gating + 书房首遇掷点（拍板来源：明明「好感度牌应该在书房偶遇希孟后出现…只显示梅花好感状态」「不能让玩家第一次进入书房就固定遇到希孟，可以 roll 点数概率」）

### 3.1 规则
- 希孟便签（gm-ximeng-card）**只在 `metXimeng` 后渲染**；便签内「陌路 · 疏离」一行删除，好感仅以梅花格示意（氛围句 + 攀谈入口保留）。
- 首遇不再固定：**每次走进书房**（move_to）且未遇希孟时掷点——
  - **45%** 希孟在 → 落 `ximeng_in_library` 旗标 → 首遇固定脚本 → 收尾接自由对话（体力-1），脚本播完落 `metXimeng` 并清掷点旗标；
  - **25%** 撞见李唐 → 移动文案追加一行氛围句（无机制效果）；
  - **30%** 无人。
- 副作用修正：画理课晨课地点在书房，上完课人已在书房但**不会**白捡首遇（掷点只挂在 move_to 上）。
- 其余 NPC 的正式偶遇系统（好感+深谈入口）按计划留下一轮，此处李唐只是一行氛围文案。

### 3.2 代码位置
| 改动 | 位置 |
|---|---|
| 走进书房掷点 | `src/engine/gameEngine.ts:244-260`（applyAction move_to 分支内；45/25/30 三档） |
| 首遇脚本触发条件改掷点旗标 | `src/content/tutorialScripts.ts:154-156`（getActiveGuideStep 步骤③：`flags.ximeng_in_library && !flags.metXimeng`；flagsSet 同时清 ximeng_in_library） |
| 旗标注册 | `src/content/flags.ts:4`（`ximeng_in_library: false`） |
| 便签条件渲染 + 删状态行 | `src/components/MainGameScreen.tsx`（Ximeng note card 块，`{state.progress.flags.metXimeng && …}` 包裹；relationshipStageLabels / emotionStateLabels 两个常量已删，ximengAtmosphere 保留） |
| 删除孤儿样式 | `src/styles/app.css`（`.gm-ximeng-state` 规则已删） |

### 3.3 调参指南
- 概率改 `gameEngine.ts` move_to 分支内的 `0.45` / `0.7` 两个阈值；
- 想让其它地点也掷点偶遇：参考 `sceneEngine.ts:52-61` 的 `NPC_HAUNTS` 表（场景在场掷点候选池，各 40%、至多 2 人）——注意那是**场景内在场**掷点，与本节**走动偶遇**掷点是两套。

---

## 四、e2e 回归脚本同步（`/tmp/e2e-danqingyuan.py`，python3.13 + Playwright，BASE=http://127.0.0.1:5176）

| 步骤 | 覆盖 |
|---|---|
| 步骤③（书房） | 改掷点重试循环：进书房 → 查 `render_game_to_text().guide`，未中则去后花园再回，至多 20 次（45%/次，20 次全空概率 ~6e-6 视为掷点逻辑坏）；并断言未遇/掷空时 `.gm-ximeng-card` 不存在 |
| 步骤⑥-⑨（晚间/就寝） | 食堂晚间只见「就寝」；投壶后仍是 day1 晚间且娱乐签可重复；就寝 → day2 晨课醒在宿舍；day2 白日走到院堂后断言无 move-dormitory |
| play_scene | 字数预算容错：等 900ms 无场景即返回（当日 narrativeCharsToday 将满时 App.tsx:343 跳过 LLM 属设计行为，非 bug） |

最近一次全量实测（DeepSeek 真连）：**PASSED**（首遇第 2 次进书房命中；含掷空时便签不显示断言）。

---

## 五、本日已知坑（修过的，别再踩）

1. **白底道具图上深色底**：必须垫浅纸 chip 再 multiply（§2.1），直接放 = 白块。
2. **bbox 裁边 ≠ 抠图**：异形道具要泛洪去底 + 封闭白区补刀（§2.6）。
3. **getActiveGuideStep 内不能直接 Math.random()**：它在每次渲染时重算，掷点必须发生在行动结算（applyAction）里、结果落旗标（§3.2 的实现形态即由此而来）。
4. **晚间免费娱乐 = 无限刷**：任何「不推进时间」的行动都必须有体力或钱文成本（§1.3）。
5. 历史教训仍有效：源码编辑禁用 sed -i（曾清空 App.tsx）；异步收尾必须以 stateRef.current 为基底（曾 clobber 主线）。

---

## 六、决策溯源索引

| 决策 | 来源 |
|---|---|
| 宿舍夜开/就寝收日/娱乐不限次 | 明明 2026-06-11 口述拍板；记忆 `project_danqingyuan_v2_redesign.md` 第 34 条 |
| 行动签地点过滤/就寝例外 | 同记忆第 33 条 |
| 美术清单与规格 | `2026-06-10-danqingyuan-v2-art-assets.md`（接入状态 F 节） |
| 希孟便签 gating + 首遇掷点 | 明明 2026-06-11 口述拍板；记忆第 25 条（已改写为掷点版） |
| 希孟 = 特招讲师（不授课不引路） | 记忆第 28 条（第五轮拍板） |
| 好感无数字、进度条/格子显示 | 设计总纲 + 记忆第 3 条 |
