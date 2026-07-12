# 丹青院 v2 改动明细（2026-07-12）

**用途：** 首页主菜单 + 设置面板；BYOK 收敛为唯一接入方式（去主办方额度）；模型列表更新。
**代码仓：** `workspaces/danqingyuan-mvp`，分支 `danqingyuan-v2-baseline`。

---

## 一、首页主菜单（原「点击进入」gate → 三按钮）
- 新增 `src/components/TitleScreen.tsx`：泼彩标题背景（bg-opening-title）+ 竖排**水平居中**三按钮 **开始游戏 / 读取存档 / 设置**。
  - 开始游戏 → 开场序列（片头视频→引语）→ 填名录（新游戏）。
  - 读取存档 → 直接载入自动存档进游戏（无存档置灰）；load 时补 `setPrologueSeen(true)`，音频导演正常接管（否则开场守卫会吞掉 BGM）。
  - 设置 → 弹出设置面板。
- `ProloguePage`：去掉 `gate` 阶段（入口手势交由 TitleScreen），开场从 `video` 起。
- `App`：入口流程 `menuStep: 'title' | 'opening'`；移除强制 LlmAccessScreen 拦路门（删该组件）；新游戏填名录页隐藏重复的「继续旧档」（读档统一走首页）。
- 居中修复：`.title-menu` 曾复用 `modalIn` 动画，其 `transform` 覆盖了 `translateX(-50%)` 致右移；改专用关键帧 `titleMenuIn`（保留居中位移，仅淡入+上浮）。

## 二、设置面板（API Key + 音乐开关）
- **音乐与音效开关**：`audioManager` 加 `setMuted/isMuted`（localStorage `dqy_audio_muted_v1` 持久）；静音→两声道淡出并暂停，取消→恢复各自音量。
- **大模型 API（BYOK）**：厂商切换 + Key（password）+ **模型下拉**（预设列表，首项推荐）+「自定义」手填兜底。

## 三、BYOK 收敛为唯一接入（2026-07-12 明明：不再接入主办方模型）
- 去掉「用主办方额度」跳过路径：`byokConfig` 删 `setByokSkipped/byokSkipped/LS_SKIP`；`llmAccessReady() = !NEEDS_LLM_ACCESS || 已配置 key`。
- 首页开始/读取前守卫：走代理且未配置 key → 自动弹设置引导先填。

## 四、模型列表更新（按明明适配表）+ 超时兜底
- 移除 MiniMax。三家预设（前端下拉 + 后端 `BYOK_PRESETS`）：
  - DeepSeek `api.deepseek.com`：deepseek-v4-flash（默认）/ deepseek-v4-pro。
  - 智谱 GLM `open.bigmodel.cn/api/paas/v4`：glm-4.6（默认）/ glm-4-flash / glm-4-plus / glm-5.2。
  - Kimi `api.moonshot.cn/v1`：moonshot-v1-128k（默认）/ moonshot-v1-32k / kimi-k2.6 / kimi-k2.5 / kimi-k2.7-code / kimi-k2.7-code-highspeed。
- `openai-compatible-provider.mjs`：加 **90s 请求超时**（AbortController，`LLM_REQUEST_TIMEOUT_MS` 可调）——之前无超时，某家挂起即「一直没有响应」卡死；现超时/连接失败抛明确可重试错误。

## 五、验证
`npm run build`✅；无 console.log；proxy 重启 health 200（后端预设改动需重启）。

## 六、部署上线前准备（VPS 单服务 + 隧道 HTTPS）
- **单服务托管**：`server/llm-proxy.mjs` 增加静态托管——`SERVE_STATIC=1` 时同源提供 `dist/`（SPA 回退 index.html），含 **Range 支持**（mp4/mp3 可拖动/播放）、路径穿越防护（编码 `..` → 403）、按类型 Cache-Control（assets 长缓存、index 不缓存）。绑定地址改 `LLM_PROXY_HOST`（dev 默认 127.0.0.1，生产设 0.0.0.0）。默认关闭静态，dev 行为不变。
- **脚本**：`build:prod`（`VITE_LLM_ADAPTER=proxy` → 前端相对 `/api/llm` 同源）；`start`（`SERVE_STATIC=1 LLM_PROXY_HOST=0.0.0.0`）。
- **Dockerfile**（多阶段）+ `.dockerignore`：构建阶段跑 build:prod，运行阶段仅 node+server+dist（运行期无 npm 依赖），含 HEALTHCHECK。
- **部署指南** `docs/plans/2026-07-12-deploy-guide.md`：Docker/裸 Node/pm2 三法 + Cloudflare Tunnel 自动 HTTPS + 上线自检清单 + 已知（500MB 资源体量、无鉴权限流、二期挂点）。
- **BYOK-only 简化**：服务端无需任何模型 key（provider 默认 mock，仅收到 clientProvider 才转发），部署零密钥。
- 冒烟验证：build:prod ✅；8790 起 prod-mode 服务，/health serveStatic:true、GET / 200 text/html、SPA 回退 200、hashed asset 200、编码穿越 403、mp3 Range 206 Content-Range 正确。
