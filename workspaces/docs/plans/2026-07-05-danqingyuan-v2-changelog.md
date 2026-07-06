# 丹青院 v2 改动明细（2026-07-05）

**用途：** 第七日流程整体重构——把"考完即终章"改为"考后日常余韵 → 日终收尾序列"，修复第七日通玩断裂（P0），并顺带**秘阁前置隐藏** + **考后靖康前奏强化**。
**配套：** 结局序列初版见 `2026-06-30`；秘阁五幕见 `2026-07-02`；canon 见 `2026-06-30-worldview-rework-canon.md`。
**代码仓：** `workspaces/danqingyuan-mvp`。

> 本轮主线：明明第七日通玩发现——授衔（红朱印仪式页）后点「推门而入」没进秘阁，反而回院堂日常流水线，希孟还说"明日丹青试"。**根因**：终章冻结（finalChapter）拖到"授衔"才设，而丹青试考完时段已推进到上午；玩家看点评/授衔/收尾页时，**后台"进上午自动开场 wander"没被结局演出挡住**（auto-wander useEffect 不查 endingStage），偷起一场日常把玩家拽回流水线。明明拍板重构第七日：考后保留日常余韵，日终就寝后再收尾。

---

## 一、新第七日流程（明明 AskUserQuestion 拍板）

1. **上午** 丹青试 → 交卷 → **简短导师点评**（exam_review，只反馈考得如何，不授衔）→「继续」回日常（落第→就地补考保底过）
2. **午间/下午/晚间** 正常日常时段，故事**围绕考后**（放榜后余韵）+ **靖康前奏顶上来**（尤其市井，有高潮不平淡）
3. **晚间就寝 → 日终收尾序列**（就寝 advanceTime 设 finalChapter 触发）：**① 授衔**（授祗候）→（好感≥知己 **见希孟**）→ **② 秘阁·最后一幕**（引桥门虚掩→五幕解谜→骸游图揭卷）→ **③ 收尾文章**（固定模板，续作预热）→ 重新开始

**决策**：秘阁=作日终最后一幕 / 授衔=并入日终收尾 / 收尾文章=固定模板 / 考后引靖康尤其市井 / 略有高潮。

## 二、架构改动

| 改动 | 位置 |
|---|---|
| **结局序列拆两段**：`EndingStage` 增 `exam_review`/`puzzle`/`reveal`，`mentor_review`→`exam_review`；`nextEndingStage` 只覆盖日终链（title_grant→[知己 ximeng_bridge→ximeng_meet]→archive_bridge→puzzle→reveal→epilogue） | `engine/endingSequence.ts` |
| **考后简评**：submitExam final 改 `setEndingStage('exam_review')`（不走完整序列）；`advanceExamReview`（落第→launchRetake 就地补考保底过；通过→setEndingStage(null) 回日常）；retake 分支改存 ending+回 exam_review（不再直授衔） | `app/App.tsx` submitExam |
| **日终触发 useEffect**：finalChapter&&ending&&endingStage===null → 按持久 flag 断点续演（!firstExamPassed→title_grant / !haiyouRevealed→archive_bridge / else→epilogue），reload 安全 | `app/App.tsx` |
| **秘阁进序列**：删主界面 solve_puzzle 行动（getDaySlotActions/getFinalChapterActions 清空）；advanceEndingStage 处理 puzzle 幕（生成观画 prompt）→ PuzzleScreen（endingStage==='puzzle' 渲，onCancel 可选=无退出）；submitPuzzle 落 haiyouRevealed→setEndingStage('reveal')→HaiyouRevealScreen→advanceEndingStage→epilogue | `engine/gameEngine.ts`/`app/App.tsx`/`components/PuzzleScreen.tsx` |
| **auto-wander 加 `if(endingStage) return`**（治后台乱入根因）；commitTitleGrant 去 finalChapter（日终已 true）；删 enterEndingLocation/archiveBridgeOpen/endingDismissed/isPuzzleOpen/pendingPuzzleSettlement 及旧 fallback EndingScreen | `app/App.tsx` |
| **收尾文章固定模板**：新建 `content/epilogueText.ts`（按结局档开篇 + 统一续作预热尾声"骸游图/希孟去向/盛世裂缝…后续章节敬请期待"）；EpilogueScreen 改逐行打字机、只留重新开始 | `content/epilogueText.ts`/`components/EpilogueScreen.tsx` |

## 三、秘阁前置隐藏（#6，与新流程强耦合——秘阁现只在日终首现）

- 地点面板未解锁**完全不列** secret_archive/ximeng_studio（原显"未启·门锁未启"泄露）——`MainGameScreen`
- 希孟便签 avoidant "你提到秘阁时…"→"你提到那处不便去的地方时…"；终章正文去"秘阁门前"
- characters.ts 希孟 persona 去"秘阁"
- prompt：character_dialogue（4 处"秘阁"→"日后机缘/真相揭开前/隐秘去处"）、scene_narrator（去处清单去秘阁+加"结局揭开前主线去处绝不出现/暗示"、archive/place 示例去秘阁、约定地点/四人共创边界改"真相揭开前"）

## 四、考后靖康强化（考后生文要有高潮不平淡）

- `sceneEngine.buildTodayPlan`：第七日 firstExamTaken → "丹青试已考毕，此刻是放榜之后——院中人松了口气，却各怀心事，对前路半是期许半是怅惘"
- scene_narrator 亡国前奏段加"第七日考后（放榜之后）尤其市井，把前奏顶得更实一笔（花石搬空太湖石/粮铺长队/北边逃难面孔/说书人被拦），压出考后松弛里乱世将至的沉沉阴云、别太平淡，仍不用真名不说破"

## 五、验证

- `npm run build` ✅；node 引擎单测 **49/0**（ending-sequence 11 新拓扑[好感低/知己链/见希孟后进秘阁/exam_review 不进日终链/门槛边界]、puzzle-acts 10、clue-grants 12、migrate-v16 16）。
- prompt 升版 scene v22→**v23** / dialogue v10→**v11**，**已重启 proxy**。真 LLM 冒烟：第七日考后下午市井生文 214 字——考期已过+粮价涨+北边商路不太平+粮铺长队，**禁词命中无**（秘阁/金/辽/徽宗/靖康/方腊全无），考后怅惘+乱世阴流到位。
- grep：src 无 console.log 残留；玩家可见处无 finalChapter 前"秘阁"泄露（仅剩 DEV「开秘阁」+ 解锁后地点描述）。

## 六、待玩家通玩验证（e2e）

1~6 日照常、秘阁/画室不出现在地点面板、无处见"秘阁"；第7日上午只有丹青试→考完简评→回日常；考后午/下午/晚场景围绕考后+靖康前奏有高潮；晚间就寝→日终：授衔→(见希孟?)→秘阁引桥→五幕（幕一显 carried 线索）→揭卷→收尾文章→重新开始；落第→考后补考保底过→日终照走。

## 七、分阶段（Stage 1 完成；后续轮）

- **Stage 2（P1）** ✅ 完成（2026-07-06，见下八）。
- **Stage 3（P2）** ✅ 完成（2026-07-06，见下九；#3 文化小百科经明明拍板去掉）。

---

## 八、Stage 2（2026-07-06）：练习封顶反馈 + 体力平衡 + 希孟首遇清干扰

**#4a 后花园练习只显体力/心情、不见山水增长** —— 根因**不是** bug：练习收益走引擎确定性给（对景写生首练本科山水+2，node 测证实），但**每日技能封顶 DAILY_SKILL_CAP=4** 一到（山水本科玩家 2 次练习即满），后续练习收益被裁为 0，而结算笺 `buildSettlementLines` 过滤 0 值 → 只剩体力/心情，玩家不知是封顶。**修**：`ValidatedStatePatch` 加 `cappedNote`，`resolvePractice` 封顶归零时置"今日画技已臻精进之限，明日再来"/"今日学识已积到尽头，明日再进"，结算笺渲染。

**#4b 数值不合理（同收益不同消耗）** —— 你举的例子（听琴/写生学识+2）与码不符（写生给山水非学识、听琴给心情），真实失衡是：**观竹石听泉/速写市井人物/画桥梁屋宇 体力2，但给的标准练习收益与体力1的对景写生/研读画论一样** → 严格更差。**修**：三卡 体力2→1（对齐"标准单点练习=体力1"；唯 `钻研旧档` 保持体力2，因给学识+2，双倍收益双倍消耗，合理）。

**#1 希孟首遇前 LLM 写不合情理** —— 根因：`rollNpcsPresent` **未 gate metXimeng**，希孟有 40% 被滚入书房/后花园 wander 场景（首遇脚本之前），与 prompt"未遇不出场"冲突，逼 LLM 写绕弯/牵强首现。**决策（AskUserQuestion）**：保留书房固定首遇脚本、只清干扰 / 首遇前可极轻旁人铺垫。**修**：①引擎 `rollNpcsPresent` 首遇前不滚希孟入场；②scene prompt 希孟出场门槛段简化——"未遇时他根本不在你笔下场景，不必为回避写绕弯，至多旁人极轻一提；首遇后按好感严格生疏→熟"。prompt scene v23→**v24** 重启 proxy。

**验证**：build ✅；node 引擎单测 **59/0**（+practice-cap 10：首练山水+2 证非显示 bug/封顶出提示/学识封顶提示/三卡体力对齐）。真 LLM 冒烟：首遇前后花园信步自然写景（脚店伙计叹气暗线一笔），希孟无台词、无牵强回避。

---

## 九、Stage 3（2026-07-06）：练习签改固定模板 + 主界面院堂换图（#3 文化小百科去掉）

**#2 固定成长签改模板句省 token** —— 练习卡（对景写生/研读画论等 7 张）原每次调 LLM（scene_narrator practice phase）出单段沉浸文，费 token 且无太大必要。**改**：`runPractice` 不再调 LLM，改从卡 `narratives` 池随机取一句（避开上一句 anti-repeat）直接结算；7 张练习卡模板池从 2 句扩到 **6~7 句**（书房学识/后花园山水/街市人物界画各写足，避免重复）。练习变即时无 loading、零 token。清 `PRACTICE_SEGMENT_MIN/MAX` 孤儿引用；scene_narrator practice phase 就此无调用（prompt 段留存不清）。

**#5 主界面院堂换新场景图** —— 新院堂场景图 `bg-main-hall.png`(日)/`bg-main-hall-night.png`(夜) 从 `美术/场景图` 复制到 `public/`，`MainGameScreen` hall 日/夜背景 + 档案库 backdrop 指向新图（替原 `main-bg`/`main-night-bg`）。**注**：实际文件名是 `bg-main-hall`（明明口述的 "bg-the-main-hall" 近似）；同套还有 `-class`/`-afterclass`/`-rainday` 变体，留**场景图池接入轮**（地点×时段×活动/晨课选图）。

**#3 文化小百科 Tips**：明明拍板**去掉**，不做。

**验证**：build ✅；node 引擎单测 **59/0** 全绿；练习模板池每卡 6~7 句核实。
