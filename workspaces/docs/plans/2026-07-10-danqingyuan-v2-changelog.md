# 丹青院 v2 改动明细（2026-07-10）

**用途：** 结尾**谢幕落幕页**——青绿山水作幕布，四位主创（希孟/择端/李唐/嵩）背影 multiply「融画」逐一入画谢幕 + 固定模板回顾文字逐行 + 水墨溶解 + 落朱印/标题/重新开始。接在 epilogue 之后作真正终幕。
**代码仓：** `workspaces/danqingyuan-mvp`，分支 `danqingyuan-v2-baseline`。明明拍板：混合(CSS主体+水墨溶解粒子)、回顾文字固定模板、谢幕接 epilogue 后。

---

## 一、立意
四张背影立绘 + 青绿山水 = "人转身走入自己画的江山、隐入烟岚"的谢幕。背影袍上山水/桥楼纹样 multiply 融进画里群山，呼应骸游图四人共创 + 希孟入画消失。李唐→择端→嵩→**希孟(压轴)** 逐一淡入·驻拍·递退入画(缩+上移向雾中灭点+淡出+水墨溶散)，末位希孟尽入画→朱印+标题「丹青院·墨枢秘录」+重新开始。

## 二、关键美术处理
4 张背影是 **RGB 白底（无 alpha，非抠图）**，李唐/择端还烘进灰棋盘格。用 `mix-blend-mode: multiply`（白→隐形）叠山水上，实测惊艳（纱袍纹样融入群山）。PIL 预处理**近白/棋盘格底洗纯白**（min通道≥210 且低饱和→纯白，多 multiply 下浅袍本近隐形、无损观感）后拷 public/char。青绿山水→ public/bg-shanshui.png。

## 三、改动
| 改动 | 位置 |
|---|---|
| 结局序列加 `curtain_call`（epilogue→curtain_call→null，终幕） | `engine/endingSequence.ts` |
| EpilogueScreen 加 `buttonLabel`（接谢幕时按钮=「落幕」推进而非重开） | `components/EpilogueScreen.tsx` |
| App：epilogue 分支 onReset→`advanceEndingStage('epilogue')`+buttonLabel；新 curtain_call 分支渲 CurtainCallScreen(onReset=resetGame)；import | `app/App.tsx` |
| **谢幕组件**：山水bg+雾+四人背影(multiply,before/enter/exit)+水墨溶解宿主+逐行文字+终幕朱印/标题/重开；行推进时对上一角色位置撒墨 | `components/CurtainCallScreen.tsx` |
| **固定模板文案**：`buildCurtainCallLines(tier)`——档变体开篇+引子+四人致意各1句+落幕2句（化名安全，无汴京/宣和） | `content/curtainCallText.ts` |
| **水墨溶解**：原生 canvas 粒子（墨/石青/石绿点+金粉，向上飘散晕开淡出），DPR 清晰，`prefers-reduced-motion` 下不创建 | `effects/inkDissolve.ts` |
| `.cc-*` 样式（page/bg[KenBurns]/mist/figure[multiply+enter·exit动画]/vignette/ink/text/finale[朱印·标题·重开]） | `styles/app.css` |
| DEV「预览谢幕」按钮（import.meta.env.DEV，塞 mock ending 直跳 curtain_call） | `MainGameScreen`/`App` |

**p5 说明**：明明选"p5 水墨溶解"，但本轮 npm 环境不可用 + 为避装依赖/网络风险，按方案兜底用**原生 canvas** 实现同款水墨溶解（效果一致、零依赖、bundle 仅+5KB）。日后要换 p5 只需替 `inkDissolve.ts` 内部，接口不变。

## 四、验证
- `npm run build`（tsc+vite）✅（bundle 376→381KB）；回归 `test-activity-backgrounds` 23/0、`test-weather` 14/0；src 无 console.log；五资源 dev :5176 全 200。
- **待明明真机走查**（:5176 主界面「预览谢幕」直跳）：山水淡入·缓推、四人 multiply 融画逐一谢幕、水墨溶散、回顾逐行、末位希孟入画→朱印+标题+重开；点击可跳过/快进；reduce-motion 无粒子仍完整。通玩：…→揭卷→epilogue(落幕)→谢幕→重开不断裂。

## 五、看图反馈一（同日）
1. **四人四位置**（明明：不要都居中）：李唐左下(不太靠下)/择端右上/嵩右下/希孟中间(压轴略大)，均不贴边。`.cc-figure` 改 `--cc-tx` 变量支持混合锚点 + `.cc-fig-{key}` 各自 left/right/top/bottom/height。
2. **粒子太大→改细密**（明明：身体化成非常细密的粒子飘散）：inkDissolve 重写为**按人物轮廓采样**——把背影 `<img>`(同源白底)缩到 ~3.2px 网格 `drawImage`+`getImageData` 读身体像素(跳纯白底)，每身体像素撒一枚**微粒(r 0.5~1.5px、取像素本色)**，上限 4200；轻微湍流散开、缓淡出=身体化成细密烟尘。`.cc-figure--exit` 改**原地淡出为主**(仅极轻上飘缩)，让 canvas 粒子承载溶解。build✅。

## 待明明确认（可后调）
- 四人致意文案（`curtainCallText.ts`）；② multiply「融画」ghostly 风格 vs 日后透明底"实体+溶解"（透明底到位去 multiply 一键切）；③ 各段时长/字速、figure 大小位置；④ 是否要换真 p5（现原生 canvas 效果一致）；⑤ DEV「预览谢幕」按钮上线前删。
