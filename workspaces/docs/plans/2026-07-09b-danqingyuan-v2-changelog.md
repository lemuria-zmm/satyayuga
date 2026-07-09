# 丹青院 v2 改动明细（2026-07-09b）

**用途：** 开场页 + 入院页 视觉/交互重设计——把单薄的"纯黑打字机开场 + 朴素卡片入院页"升级为"电影级片头视频 → 穿越引语落印 → 卷轴迎帖入院"的有氛围序列。
**代码仓：** `workspaces/danqingyuan-mvp`，分支 `danqingyuan-v2-baseline`。

> 前情：美术已交付电影级片头 `美术/场景图/开场动画.mp4`（10s 无水印，青绿山水千里江山风→大毛笔泼彩「丹青院·墨枢秘录」标题，自带 aac 配乐），此前未接。明明拍板重做开场+入院页。

---

## 一、开场页 Prologue 四阶段（`components/ProloguePage.tsx` 重写）
状态机 `gate → video → freeze → verse`：
1. **入场 gate**：近黑场「丹青院 / 墨枢秘录 / 点击进入」——点击=用户手势，解锁带声自动播放。
2. **片头视频**：全屏播 `/opening.mp4`（`object-fit:cover`、`playsInline`），右下「点击跳过」。
3. **片尾定格**：视频 `onEnded` 停末帧（泼彩标题）+ 暗罩 + 「点击继续」脉冲。
4. **穿越引语**：交叉淡化到压暗山水静帧 `/bg-prologue-verse.png`（视频抽帧、Ken-Burns 缓推）+ 暗角 scrim；引语逐行打字，末行落 `seal-small-red` 朱印，「点击继续·填写入院名录」。点击中途→全部直出。

**文案改写**（去希孟消失/《千里江山卷》，改隐晦）：宣和年间汴京→盛世也是史册不肯细说的前夜→千年之后一梦成画学生→"满城锦绣之下仿佛有什么正被悄悄抹去"→以同窗身份在笔墨间看这一切展开。

**声音**：片头用视频自带 aac 配乐；视频毕接低音量循环 `/opening-bgm.mp3`（竹林 whispers）续到 verse+名录+入院，入院进游戏时止。新建 `src/audio/openingAudio.ts`（`<Audio>` 单例 play/stop，自动播放被拒 try/catch 兜底）；`App.enterAcademy` 调 `stopOpeningBgm()`。

## 二、入院页 AdmissionTransition 卷轴迎帖（`components/AdmissionTransition.tsx` 重写）
- 背景 `bg-admission-hall.png` + 暖调院落暗角/景深。
- **小书童全身像**左下滑入（`admBoyIn`）+ 极缓浮动（`admBoyFloat`）。
- **中央卷轴**（`admission-scroll-bg.png` 展开 `admScrollIn`）：顶匾额 `academy-plaque-bg.png`「入院·小书童来迎」；LLM 入院引文**逐字打字**（`null` 时「院门将启，墨正落纸……」墨点脉冲，点击卷面快进）；角落 `seal-small-red.png` 朱印引文毕盖下。
- **「随小书童入院」印章红按钮**，引文放完才亮起可点。

## 三、资源（拷入 public/）
`开场动画.mp4`→`opening.mp4`(26MB)；视频抽帧`bg-prologue-verse.png`（第1.5s 干净山水）；`sounds/kaazoom-whispers-of-the-bamboo-forest`→`opening-bgm.mp3`。

## 四、验证
- `npm run build`（tsc+vite）✅；回归 `test-activity-backgrounds` 23/0、`test-weather` 14/0。
- src 无 console.log；旧 `adm-transition-card/portrait/body/title` 类无残留引用。
- dev :5176 七项资源全 200（opening.mp4/bg-prologue-verse/opening-bgm/scroll/plaque/seal/书童全身）。
- **待明明真机走查**：①点击进入→片头带声→可跳过；②定格→点击→山水上引语逐行+落印→继续；③入院书童滑入→卷轴展开→引文打字→朱印→按钮亮→入院；④有档跳开场不误触发。

## 待明明确认
引语文案 / 入院匾额文字 / BGM 选曲，均可后调（文案在 `PROLOGUE_LINES`、映射一处）。

## 六、追加（明明看图反馈，同日）
1. **开场 gate 背景**换 `开场画面.png`→`public/bg-opening-title.png`（图内已含「丹青院·墨枢秘录」标题）——去掉 CSS 标题/副题，仅留「点击进入」。
2. **片头视频**换 `开场动画2.mp4`→覆盖 `public/opening.mp4`（10s，自带配乐；音乐后续统一调）。
3. **穿越引语页背景**换 `引语页背景.png`→`public/bg-verse-paper.png`（深框宣纸），引语文字改**深墨色**（原压暗山水静帧 bg-prologue-verse 弃用删除）。
4. **入院名录（SetupScreen）修版式**：牌匾下移（top 20→48）；卷轴加高（640→700）+ 内容区下沿抬高（inset bottom 38→92），令院印「未盖章」+「请先补全入院名帖」落回纸面内、不再超框到卷杆外。
5. 引语文案 / 入院匾额「入院·小书童来迎」明明确认 OK。
- 重验 build✅ + 三资源 200 + 无 bg-prologue-verse 残留。

## 七、再追加（明明看图反馈二，同日）
1. **引语页顶部黑边**：`bg-verse-paper.png` 自带黑色 letterbox（上168/下94px），PIL 裁掉黑边→纯宣纸，cover 铺满不再露黑边。
2. **入院名录清理+紧凑**：删 SetupScreen 残留穿越引语块 `.adm-prologue`（还含希孟消失/千里江山卷旧文，已与开场引语重复）+ 相关 CSS；**去掉「性格」栏**（personality 传空）；姓名栏下移（content inset top 52→74 避开纸卷撕边）；行间距收紧（form-row margin-bottom 8→5）。
3. **点击跳转黑场**：确为加载/淡入间隙露底色——video 加 `poster=bg-opening-title`（gate→视频无缝）、预载 bg-verse-paper（视频→引语）与 bg-admission-hall（引语→名录）、gate 淡入 1600→600ms、引语页底色改宣纸米色、`.adm-page` 加米色兜底底。黑场消除。
- 重验 build✅。
