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

- **Stage 2（P1）**：#4a 后花园练习签数值显示（查封顶/结算）、#4b 数值平衡（收益高则消耗低，需明明指认具体卡）、#1 希孟初遇规则（取消书房前不出场规则/严格写初遇循序渐进，改 scene prompt）。
- **Stage 3（P2）**：#2 固定成长签改模板句（储备文案库省 token）、#3 食物/娱乐文化小百科 Tips、#5 主界面换 bg-the-main-hall。
