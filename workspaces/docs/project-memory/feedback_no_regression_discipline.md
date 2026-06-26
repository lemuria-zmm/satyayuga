---
name: ""
description: 丹青院项目多次返工教训——改完一个任务后，确定的内容被后续改动破坏。工作纪律约束。
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1b066c27-035c-4cc7-a6a4-c3b71e8c4e27
---

明明 2026-06-25 明确反馈：**每次改完一个大任务后，必须保证已确定的内容不被后续修改污染。之前几次反复出现改坏先前已强调过的正确逻辑，返工降低效率。**

**Why:** 丹青院开发中反复发生回归：①改 A+C 时 open 失败 catch 分支把沙盒推进逻辑改坏；②改字数预算漏算新模型节奏致 fallback；③删畅谈按钮时连 onChat prop 一起删，做 NPC 系统时又得加回；④临时 console 调试日志多次残留在源码里。每次返工都是在修一个之前已经做对、被无意破坏的东西。

**How to apply（每次改动后自检清单）：**
1. **临时调试代码必须当轮清除**：console.log、proxy 临时日志、临时探针等改完即删。收尾前跑 `grep -rn "console.log" src/ server/` 确认只剩合理的（如启动横幅）。这些是最常见的污染。
2. **改公共函数/分支前，先问"这条路径还服务哪些已确定的场景"**：尤其 commitPendingSettlement / applyAction 的 catch 与兜底分支 / advanceTime / getAvailableActions 这类被多场景复用的枢纽。改一个分支前列出它的所有调用场景，确认不误伤。
3. **删 props/字段/卡片前 grep 全部引用**：删 onChat/onQuickExam 那类公共 prop 前先 `grep` 看谁还用、将来会不会用；宁可留注释标记"暂不用"也别直接删，避免下轮重建。
4. **改时段/场景/数值模型后，重算依赖该模型的常量**：预算（DAY_CHARS_MAX）、上限（MAX_SLOT_SCENES）、阈值等常按旧模型定，模型一变要回头核对。
5. **每个大任务收尾必做**：`npm run build` + 针对本轮核心逻辑写 node 引擎单测（用缓存 tsx：`~/.npm/_npx/<hash>/node_modules/.bin/tsx`，串行单跑勿打断）+ 关键回归点（午间→下午→晚间推进、跨日、好感重算等）至少跑一遍验证没破坏。
6. **回归优先于新功能**：试玩报"之前的问题又出现了"时，先怀疑本轮改动是否误伤，用 git diff / 引擎模拟定位，而非假设是老 bug。

参见 [[project_danqingyuan_v2_redesign]] 的历次 changelog——多条记录都含"修 X 时连带改坏 Y"的连带坑。
