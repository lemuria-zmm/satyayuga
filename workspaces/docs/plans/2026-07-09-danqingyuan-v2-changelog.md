# 丹青院 v2 改动明细（2026-07-09）

**用途：** 场景图池接入轮——美术交付的结构化场景图池（地点×时段×天气×活动）接入代码，并落地明明 8 条需求。核心两块：库/市/园子场景背景补齐 + **午餐/市集夜娱改「弹窗」呈现**。
**代码仓：** `workspaces/danqingyuan-mvp`。分支 `danqingyuan-v2-baseline`。

> 背景：三批场景图与全套立绘早已交付，但**仍在 `美术/` 源目录、未拷入 `public/`**，代码引用也未接。此轮为 CLAUDE.md 标注的「下一个主攻：场景图池接入轮」。

---

## 一、明明 8 条需求 → 落点

| # | 需求 | 落点 |
|---|---|---|
| 1 | 天空转场 **点击跳过 + 兜底自动**（明明拍板） | `SkyTransition.tsx` + `app.css` |
| 2 | 书房白天子场景：研读画论/阅古画卷→desk，钻研旧档→shelf | `activityBackgrounds.ts` |
| 3 | 夜晚街市换新图 | 覆盖 `public/bg-market-night.png` |
| 4 | 白天街市吃茶→teahouse-day，雨天→teahouse-rainy | `activityBackgrounds.ts` |
| 5 | 午餐行动签→**弹窗**（食物图约1:1+体力/心情），共膳用 stove | 新 `ActivityResultPopup` + `App.tsx` |
| 6 | 市集夜娱（蹴鞠/投壶/围棋/瓦舍）→**弹窗** | 同上 |
| 7 | 小书童全身像接入（透明底新版） | `AdmissionTransition.tsx` + `app.css` |
| 8 | 新增图纳入池：后花园听琴5张、market茶室2张、竹石雨夜1张 | copy + `activityBackgrounds.ts` |

## 二、资源拷入 public/（Step 0）
从 `美术/场景图/*/` + `角色立绘/` 拷 22 个新文件入 `public/`，**中文括号名归一化**（`bg-library-desk-night（通用）.png`→`bg-library-desk-night.png`，`bg-library-night（通用）`同理）。覆盖 `bg-market-night.png`（#3）。`char-shutong-standard-full-body.png`(614×1536, **透明底已验**，四角 alpha=0) 入 `public/char/`。

## 三、架构改动

| 改动 | 位置 |
|---|---|
| **天空转场点击跳过（#1）**：`onClick={finish}` 提前 dismiss（doneRef 保证只调一次 onDone），兜底 1800→**3200ms**；css 去 `pointer-events:none`+加 `cursor:pointer`，`skyFade` 同步 3200ms，加淡「点击继续」脉冲提示 | `SkyTransition.tsx` / `app.css:5010+` |
| **背景池补齐（#2#4#8）**：`activityBackgrounds.ts` 重构——`practice_read_treatise`/`practice_view_scrolls`→desk 昼夜、`practice_deep_study`/`library_research`/`library_deep_research`→shelf 昼夜雨；`teahouse` 移入 VARIANT 天气变体；`eve_tingqin`→后花园听琴四态；`practice_garden_observe` 补 `rainyNight`=竹石雨夜。删死路径 `EVENING_STUDY_ACTIVITIES` | `content/activityBackgrounds.ts` |
| **午餐/夜娱弹窗（#5#6）**：抽 `buildSettlementLines`+`skillLabels` 到共享 `components/settlementLines.ts`（结算笺+弹窗共用）；新 `ActivityResultPopup`（中心浮出场景图+数值行+继续，点背景/按钮关）；新 `content/activityResultImages.ts`（9 签→图映射）；`App.runAction` 机械分支命中弹窗签则 `setActivityResult` 替代文字笺（`setSettlement(null)`）；overlay 并入两 render 路径 | `App.tsx` / `ActivityResultPopup.tsx` / `settlementLines.ts` / `activityResultImages.ts` / `app.css` |
| **小书童全身像（#7）**：入院页 `char-shutong-smile`→`standard-full-body`，css `object-fit:cover`→`contain`+`object-position:bottom`+`align-self:flex-end`，去半身 cover 兜底底色。**入院 gd-dialogue 仍用 smile 半身**（对话框内 bust，与他 NPC 一致） | `AdmissionTransition.tsx` / `app.css:1452` |

## 四、弹窗图映射（推断，明明可调 `ACTIVITY_POPUP_IMAGE` 一处）
- `meal_together`→`/scene-dining-gongshan.png`（明明指定共膳图）；`meal_mantou`→`/scene-dining-guanjiang.png`（灌浆）；`meal_botuo`→`/scene-botuo.png`；`meal_mijian`→`/scene-dining-mijian-diancha.png`；`meal_chuibing`→`/bg-dining-chuibing.png`
- `eve_cuju`→`/scene-market-cuju-night.png`；`eve_touhu`→touhu；`eve_weiqi`→weiqi；`eve_tingqu`→`/scene-washe-theater-night.png`（瓦舍）
- **不入弹窗**：`meal_street`（市集无专属食物图，保留 folk 背景）、`eve_tingqin`（→后花园听琴背景）、`eve_nightmarket`（→夜市背景）

## 五、验证
- `npm run build`（tsc+vite）✅。
- node 引擎单测：新建 `scripts/test-activity-backgrounds.mts` **23/0**（desk/shelf 昼夜雨、茶室天气、听琴四态、竹石雨夜、弹窗9签映射、**全引用图存在 public/ 防拼写漂移**）；`test-weather.mts` 回归 **14/0**。
- src 无 console.log 残留。

## 六、待明明真机走查（:5176 HMR 已热载）
1. **天空转场**点击可提前跳过、不点约3.2s自动过；
2. **书房**白天研读画论/阅古画卷=书案图、钻研旧档=书架图，晚间灯下；
3. **街市**白天吃茶 teahouse-day/雨 teahouse-rainy、夜晚街市新图；
4. **后花园听琴**昼/夜/雨/雨夜四态、竹石雨夜；
5. **午餐**各签弹窗（图+体力/心情，共膳=`scene-dining-gongshan`）；**夜娱**蹴鞠/投壶/围棋/瓦舍弹窗；
6. **入院页**小书童全身像（透明底、贴底居中）——若比例/裁切不佳可调 `.adm-transition-portrait` 高度。
7. 弹窗食物图映射如需换（如 chuibing 想要专属 scene 图），改 `ACTIVITY_POPUP_IMAGE`。

## 七、追加（明明看图反馈，同日）
- **膳堂换图**：明明删旧 `bg-dining-hall.png`、补 `bg-dining-morning`/`bg-dining-noon`。MainGameScreen diningVariant 改 晨·上午=morning / 午间=noon / 下午=afternoon / 雨=rainy / 晚间沿用 noon；静态兜底 `dining_hall`→noon。清 `bg-dining-hall` 全部引用（2 处）+删 public 旧图。
- **与同僚共膳**弹窗图 `bg-dining-stove`→**`scene-dining-gongshan.png`**（明明指定）。
- **雨夜听琴 / 雨夜竹石写生**：明明换了新图，重拷覆盖 `bg-garden-listening-to-qin-rainy-night` / `bg-garden-bamboo-rainy-night`。
- 重验 build✅ + test 23/0 + weather 14/0 + 无 `bg-dining-hall` 残留。
