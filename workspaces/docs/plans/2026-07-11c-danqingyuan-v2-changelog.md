# 丹青院 v2 改动明细（2026-07-11c）

**用途：** 内测付费通道·第一期 —— **BYOK（玩家自带 API Key）**。玩家选厂商（DeepSeek/智谱GLM/Kimi/MiniMax）填自己的 Key 即可游玩；Key 只存本机、随请求转发、服务端不落库。（兑换码+token 额度为第二期。）
**代码仓：** `workspaces/danqingyuan-mvp`，分支 `danqingyuan-v2-baseline`。

---

## 一、后端：通用 OpenAI 兼容 provider + 每请求注入
- 新增 `server/llm-providers/openai-compatible-provider.mjs`：四家厂商预设（baseUrl/默认模型），`createProviderFromClientConfig({provider,apiKey,model?})` 按玩家配置临时建 provider（OpenAI 兼容 /chat/completions；含 JSON 修复/去围栏；MiniMax 错误格式兼容）。key 只过内存、不日志。
- `llm-proxy.mjs` `routeLlmRequest`：请求带 `clientProvider` → 用玩家 key 临时 provider 跑；否则用服务端默认 provider。校验层对额外字段宽容，无需改校验。

## 二、前端：接入门 + 配置
- `src/llm/byokConfig.ts`：`ByokConfig`、四家预设、localStorage 读写、跳过标记、`llmAccessReady()`；`NEEDS_LLM_ACCESS = VITE_LLM_ADAPTER==='proxy'`。
- `proxyAdapter.post`：有 BYOK 配置则请求体附 `clientProvider`（key 只此刻转发）。
- `LlmAccessScreen`：走代理且未配置时的接入门——选厂商 + 填 Key +（可选）模型 → 保存进入；或「暂用主办方额度 · 直接进入」（跳过，用服务端 env key，若配了）。App 在 `state===null` 且 `!llmReady` 时先渲染它（prologue 之前）。
- 说明文案强调 Key 只存本机、不上传服务器。

## 三、验证
`npm run build`✅；回归 23/0·14/0；无 console.log；proxy 重启 health 200；envelope 校验对 clientProvider 宽容不误拒。

## 四、部署前提（提醒）
- 生产必须以 `VITE_LLM_ADAPTER=proxy` 构建（现仅 dev:proxy 设了），否则前端走 mock、也不出接入门。上线时补 `build:prod`。
- BYOK 门只在 `adapter=proxy` 时出现（dev:proxy / 生产）；纯 `dev`（mock）不出。
- 第二期（兑换码+token 额度+可选支付网关）：`routeLlmRequest` 已留 else 分支用服务端 key，后续加 `accessCode` 校验+额度扣减即可对接。
