# 丹青院 v2 改动明细（2026-06-15 ~ 06-16）

**用途：** 汇总 06-15「第一日流程双沙盒重构」+「场景完才推进/关系表归一」+ 06-16「晚间地点修复」三轮改动，供后续参照。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`
- 前序改动：`2026-06-12-danqingyuan-v2-changelog.md`（行动三分法/学识gate/钱与出身）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径以此为根）

> 行号为落笔快照，定位以「文件 + 符号名」为准。

---

## 一、第一日流程重构：白天「时段-行动」+ 午/晚双沙盒（2026-06-15，拍板来源：明明「白天-时段-行动 +（中午一个沙盒+晚间一个沙盒），自由活动不局限于夜间」）

### 1.1 病根
旧时段模型四不像——成长行动推进时段、晚间娱乐又不推，白天两套逻辑交错打架，连锁出：引导与正文同屏、成长做完时段突跳被引导打断、行动签空洞、去书房有正文回院堂没正文的割裂。

### 1.2 新模型（`isSandboxSlot(slot)=noon||evening`，gameEngine.ts）
| 时段 | 性质 | 时间推进 |
|---|---|---|
| 晨课 | 叙事·锁院堂 | 做完→上午 |
| 上午 | 叙事·成长签→LLM | 做完→午间 |
| **午间** | **沙盒·饮食** | 机械不推；点「用罢午膳·歇晌」→下午 |
| 下午 | 叙事·成长签→LLM | 做完→晚间 |
| **晚间** | **沙盒·娱乐** | 机械不推；点「就寝」→次日 |

正交：`track`（走不走LLM）与 `slot类型`（推不推时间）独立——晚间夜读 growth 走 LLM 但不推时间。

### 1.3 代码位置
| 改动 | 位置 |
|---|---|
| `isSandboxSlot` + resolveActivity `timeAdvance:!isSandbox` | `src/engine/gameEngine.ts` |
| 午间「歇晌」rest 出口 + applyAction `rest` 分支 | `gameEngine.ts` getSlotActions noon / applyAction |
| 晨课锁院堂（getMoveActions morning_class 返回 []） | `gameEngine.ts` |
| 机械活动移入沙盒（茶坊/讨茶→noon；赁书/买画材→noon,evening） | `src/content/activities.ts` |
| 引导改「时段开头弹」（删整套 pendingAction 挂起） | `src/app/App.tsx` |
| 引导态隐藏背景正文与 dock（guideActive prop） | `src/components/MainGameScreen.tsx` |

---

## 二、场景完才推进 + 行动签关系表归一（2026-06-15 晚，拍板来源：明明试玩发现 5 个 bug；总纲是「把地点×时段×行动签×场景×时间推进当一张完整表设计」）

### 2.1 五问根因（三个结构缺陷）
1. **#1 时间脱节**：runAction 点击即 applyAction（时段已跳）+setState（进度条跳），再异步跑 LLM →「晨课正文刚出、进度条已上午」。
2. **#2 收尾签到处显示**：歇晌/就寝用 `locationId:当前地点` → 每地点都显示。
3. **#3 午膳免费刷体力**：6 餐 staminaGain 2~3 无 moneyCost。
4. **#4 沙盒空地点挂无关签 + 走动突兀跳**：小测/畅谈恒显示；look_around 兜底签污染。
5. **#5 缺关系表**：逐场景打补丁，顾此失彼。

### 2.2 关系表（总纲）
格子三类：**叙事(N)** 成长签→LLM→**场景完才推进**；**沙盒(S)** 机械签不推+收尾签推；**空(E)** 只走动+空提示不推。

| 时段＼地点 | 院堂 | 书房 | 后花园 | 食堂 | 市井 | 宿舍 |
|---|---|---|---|---|---|---|
| 晨课 | N(锁走动) | N画理 | — | — | — | — |
| 上午 | N请教 | N查证/深查 | N观景 | E | N写生 | 闭 |
| 午间 | E | E | E | **S餐×5+歇晌** | S街边吃食 | 闭 |
| 下午 | N请教 | N查证/深查 | N观景 | E | N写生 | 闭 |
| 晚间 | E(06-16歇业) | N夜读 | S听琴 | E(06-16歇业) | **S投壶/弈棋/蹴鞠/听曲/夜市** | **S就寝** |

### 2.3 #1 延迟结算（最高风险核心，`src/app/App.tsx`）
`applyAction` 是纯函数 → runAction 对成长行动**照常算出 nextState 但缓存进 ActiveScene 先不提交**（不 setState/不 save/不推进），仅进 loading 发起 LLM。
- ActiveScene 加 `pendingSettledState` / `pendingSettlePatch`。
- 新增 `commitPendingSettlement`，统一三条提交路径：**正常 resolve / 预算跳过 / open 失败**（后两条**必须也提交否则成长行动按了不推进→卡死**）。
- 三个陷阱（Plan agent 挖出 + 实现已处理）：①回灌后台 `mainline`（settled 基于行动前 base 不含它，直接 setState 会覆盖 ensureMainline 写入）；②`narrativeCharsToday` 用 `stateRef.current`（已含本场 open+mid）+resolveText 长度，不用 settled 的（漏字数）；③数值签合并 `mergeSettlementPatch(enginePatch, clamped)` 一起 showSettlement（否则看不到晨课技能+1）。
- saveGameState 只在 commit + 机械行动；成长行动场景中刷新=回落行动前存档（合理的中断回滚）。
- `clampSceneSuggestedPatch` 只输出 mood/affinity/clue，永不带 timeAdvance/stamina → 叠加 LLM patch 不会二次推进时间（已核）。

### 2.4 #2/#3/#4 配套
- **#2**：getSlotActions noon 的 rest 仅 `dining_hall` 注入、evening 的 sleep 仅 `dormitory`；getAvailableActions 过滤白名单去掉 `type==='sleep'`（靠 locationId 天然只在宿舍）。
- **#3**：MEAL_ACTIVITIES 重定 moneyCost/staminaGain（炊饼1文+1/共膳1文+1/馒头2文+2/馎饦2文+2/蜜煎3文+1mood2/街边4文+2）；**idle_tea 讨碗热茶留免费**作穷玩家保底；dock 按 type 加 className 区分（收尾签 `.gm-action-tag-closing` 赭色 / 餐签 `.gm-action-tag-meal` 米黄）；穿帮文案修（小书童「不收钱文」→「按例收几枚钱文」、facts「例钱十文」→「五文」）。
- **#4**：废弃 look_around 兜底（删 getAvailableActions 注入 + resolveActivity 分支），空格统一走 dock 空提示；小测=院堂白天(forenoon/afternoon)、畅谈=`!isSandbox`（MainGameScreen canQuickExam/canChat）。

### 2.5 第1日没钱/低体力分析（不卡死）
吃饭非强制（可直接歇晌免费）；流民 0 文时餐被过滤只剩歇晌+免费热茶；体力初始 8、晨课-1 上午-1~2，午间不吃仍 5~6 够下午成长；跨日发 5 文缓冲。良性张力。

---

## 三、晚间地点修复（2026-06-16，拍板来源：明明试玩 3 个 bug）

| # | 问题 | 修复 | 位置 |
|---|---|---|---|
| 1 | 晚间投壶/弈棋/蹴鞠在院堂 | locationId hall→**market**（叙事也改为街市口吻） | `activities.ts` eve_touhu/weiqi/cuju |
| 2 | 晚间食堂/院堂仍开放 | getMoveActions 晚间过滤 `eveningClosed=['hall','dining_hall']` | `gameEngine.ts` |
| 3 | 小书童午饭弹窗仍与 LLM 重叠 | **实证真因**：`gd-overlay` 半透明(0.55)遮罩下**结算笺 gm-settlement-slip 透出**（非 LLM 正文，正文上轮已被 guideActive 挡）→ 结算笺加 `!guideActive` 条件 | `MainGameScreen.tsx` |

> #3 排查方法：写浏览器探针跑到午间引导出现瞬间 dump 同屏可见元素，定位到 `gm-settlement-slip 可见:True`（其余 narrative/loading/dock 已隐藏），修后探针确认 `False`。**教训：e2e 只验状态不验视觉，视觉重叠须用 is_visible 探针定位。**

---

## 四、本期已知坑

1. **延迟结算 ≠ 一定推进时段**：commit 只交付引擎算好的 settled，`timeAdvance` 由引擎定（晚间夜读 growth 走 LLM 但不推）。别在 commit 里硬编码推进。
2. **成长行动场景中刷新页面**：回落行动前存档（runAction 未 save），重见行动签——预期的中断回滚，非 bug。
3. **引导态须隐藏所有底层浮层**：narrative/dock/结算笺都要 `!guideActive`（半透明遮罩会透）。新增浮层记得一并挡。
4. 历史教训仍有效：源码编辑禁用 sed -i；异步收尾以 stateRef.current 为基底回灌后台字段；node 跑引擎验证用绝对 import；改 prompt 重启 llm-proxy。

---

## 五、第1日午间饮食沙盒的教程局限（非 bug，记一笔）

第1日午间街市尚未解锁（下午才静默解锁），故午间饮食沙盒只有食堂 5 餐 + 免费热茶；**第2日起街市全开**，午间才能逛茶坊/赁书/买画材。教程节奏使然。若希望第1日午间即可逛街市，可把街市静默解锁提前到午间。

---

## 六、决策溯源索引

| 决策 | 来源 |
|---|---|
| 白天时段-行动 + 午/晚双沙盒 | 明明 2026-06-15 口述拍板 |
| 场景完才推进 / 收尾签绑地点 / 午膳收费砍体力 | 明明 2026-06-15 AskUserQuestion 拍板 |
| 晚间娱乐移街市 / 晚间院堂食堂歇业 / 结算笺隐藏修重叠 | 明明 2026-06-16 口述拍板 |
