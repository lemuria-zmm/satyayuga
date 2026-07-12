# 丹青院 v2 · 内测部署指南（VPS 单服务 + 隧道 HTTPS，2026-07-12）

> 目标：一台 Linux 云服务器/VPS，用**单个 Node 进程**同源托管前端与 `/api/llm`；HTTPS 由 **Cloudflare Tunnel** 自动签发（无需自己配证书/开公网端口）。
> 玩家**自带 API Key（BYOK）**，服务端不需要任何模型 key。

---

## 架构
```
玩家浏览器 ──HTTPS──▶ Cloudflare Tunnel ──HTTP──▶ VPS: Node 服务 :8787
                                                   ├─ GET /*          → dist 静态（前端，SPA 回退 index.html，mp4/mp3 支持 Range）
                                                   └─ POST /api/llm   → 校验+重试，用请求里的 clientProvider（玩家 key）转发到 DeepSeek/GLM/Kimi
```
- 前端与 API **同源**（都在这个 Node 服务下），前端请求 `/api/llm` 相对路径，免跨域配置。
- 服务端 provider 默认 `mock`，只有收到玩家 `clientProvider` 才临时建 provider 转发；**key 只过内存，不落库、不写日志**。

## 关键环境变量（server/llm-proxy.mjs 读取）
| 变量 | 默认 | 生产建议 | 说明 |
|---|---|---|---|
| `LLM_PROXY_HOST` | `127.0.0.1` | `0.0.0.0` | 绑定地址；对外可达需 0.0.0.0 |
| `LLM_PROXY_PORT` | `8787` | `8787` | 监听端口 |
| `SERVE_STATIC` | 关 | `1` | 开启静态托管（同源提供 dist） |
| `STATIC_DIR` | `./dist` | `./dist` | 静态目录 |
| `LLM_REQUEST_TIMEOUT_MS` | `90000` | 按需 | 单次 BYOK 调用超时 |

（`npm start` 已内置 `SERVE_STATIC=1 LLM_PROXY_HOST=0.0.0.0`。）

---

## 方式一：Docker（推荐）
在 VPS 上拉代码后：
```bash
cd danqingyuan-mvp
docker build -t danqingyuan:latest .
docker run -d --name danqingyuan --restart unless-stopped -p 8787:8787 danqingyuan:latest
curl -s http://127.0.0.1:8787/health   # {"ok":true,...,"serveStatic":true}
```
镜像多阶段构建：构建阶段跑 `build:prod`（`VITE_LLM_ADAPTER=proxy`），运行阶段只含 node + `server/` + `dist/`（运行期无 npm 依赖）。

## 方式二：裸 Node（无 Docker）
需 Node 20+：
```bash
cd danqingyuan-mvp
npm install
npm run build:prod          # 产出 dist（VITE_LLM_ADAPTER=proxy）
npm start                   # = SERVE_STATIC=1 LLM_PROXY_HOST=0.0.0.0 node server/llm-proxy.mjs
```
用 pm2 常驻：
```bash
npm i -g pm2
SERVE_STATIC=1 LLM_PROXY_HOST=0.0.0.0 pm2 start server/llm-proxy.mjs --name danqingyuan
pm2 save && pm2 startup      # 开机自启
```

---

## HTTPS：Cloudflare Tunnel（自动证书，免开公网端口）
```bash
# VPS 上装 cloudflared 后：
cloudflared tunnel login
cloudflared tunnel create danqingyuan
# 将隧道指向本机服务，并绑定你的域名（示例）
cloudflared tunnel route dns danqingyuan danqingyuan.example.com
cloudflared tunnel run --url http://127.0.0.1:8787 danqingyuan
```
玩家访问 `https://danqingyuan.example.com` 即可。（ngrok 亦可：`ngrok http 8787`，临时地址给内测。）

---

## 上线前自检
- [ ] `npm run build:prod` 通过；`dist/` 含 `index.html` + `assets/` + 图/音/视频。
- [ ] `curl /health` → `serveStatic:true`。
- [ ] 打开首页 → 三按钮；进「设置」填一家 API Key（DeepSeek/GLM/Kimi）→ 保存 → 开始游戏能出剧情（走通一次 LLM）。
- [ ] mp4 片头 / mp3 BGM 能播（Range 206 已支持）。
- [ ] 隧道 HTTPS 可访问。

## 已知与后续
- **资源体量**：`dist` 约 500MB（含 400MB 音视频/立绘）。单机托管内测足够；规模化再把 `public` 静态资源挪 CDN/OSS、前端与 API 分离。
- **无鉴权/限流**：内测阶段 `/api/llm` 开放；因走玩家自带 key，滥用只耗对方额度。若要防蹭，可后续加 access code（`routeLlmRequest` 已留 else 分支挂点）。
- **第二期**（兑换码 + token 额度 + 主办方额度）暂缓，按需再开。
