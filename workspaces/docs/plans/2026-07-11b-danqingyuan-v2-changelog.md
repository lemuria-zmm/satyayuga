# 丹青院 v2 改动明细（补记 2026-07-11 下午）

（承 2026-07-11 changelog；真实通玩反馈三项）

## 一、正文说话立绘表情不随文字（明明：LLM 写"笑了笑"，立绘却是常态脸）
根因：正文 VN 说话立绘一直固定 `calm`（2026-07-07 决策，因当时 segment 无情绪信号、闲聊 emotionState 与场景文不同步）。**现改为由 scene_narrator 逐句给神情**：
- `SceneSegment` 加 `emotion?: calm|smile|stern|surprise|sad`（仅 speaker 非 null 时）。
- scene_narrator 分段输出规范加 `emotion` 说明（须与该句正文相符，"他笑了"→smile、"冷下脸"→stern…），prompt 升版 **v27→v28**，已重启 proxy。
- `llm-validation` sanitize：非法/旁白 emotion 剔除。
- `npcSprites` 加 `npcExpressionSprite(npcId, expr)`（该 NPC 无此表情回退 calm）；MainGameScreen 正文立绘改 `src={npcExpressionSprite(speaker, curSeg.emotion)}`、key 带 emotion 使切换重挂。

## 二、书房 desk 雨景补充
`bg-library-desk-rainy.png` 拷 public；activityBackgrounds 的 `practice_read_treatise`/`practice_view_scrolls` 加 `rainy` 变体（雨天白日在书案研读画论/阅古画卷用雨景）。

## 三、谢幕回顾文案改（明明：不提告别，只写对几位导师的了解与回顾）
`curtainCallText` 重写：保留四背影逐一入画消融的视觉，但文字从"作别/后会有期"改为**玩家这几日对四位先生的了解追忆**（李唐痴于山水的严厉、择端笔下的人间烟火、嵩要画人身上补不起的破洞、希孟废寝忘食的青绿与那点将落未落的念头），落幕两句改"了解才刚开始/都还在未画完的长卷里"。

## 验证
`npm run build`✅；回归 23/0·14/0；无 console.log；proxy 重启 health 200；desk-rainy 资源 200。
**待真机验**：正文里 NPC 有明显情绪的句子，立绘是否随之变表情（笑/严肃/讶异等）。
