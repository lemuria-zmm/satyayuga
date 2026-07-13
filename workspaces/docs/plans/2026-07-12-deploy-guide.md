# 丹青院 v2 · 内测部署指南（阿里云 ECS 单服务 + 域名 Caddy HTTPS）

> 更新 2026-07-13：按**实际跑通**的方案重写。线上：阿里云香港 ECS + Docker + 域名 `danqingyuan.xyz` + Caddy 自动 HTTPS。
> 玩家**自带 API Key（BYOK）**，服务端不需要任何模型 key。

---

## 架构（最终方案）
```
玩家浏览器 ──HTTPS(443)──▶ Caddy(反代/自动证书) ──HTTP──▶ Docker: Node 服务 :8787
                                                          ├─ GET /*        → dist 静态（前端；SPA 回退；mp4/mp3 支持 Range）
                                                          └─ POST /api/llm → 校验+重试，用请求里的 clientProvider(玩家 key) 转发 DeepSeek/GLM/Kimi
```
- 前端与 API **同源**（同一 Node 进程），前端用相对路径 `/api/llm`，免跨域。
- 服务端 provider 默认 `mock`，仅在收到玩家 `clientProvider` 时临时建 provider 转发；**key 只过内存，不落库、不写日志**。
- **为什么不用 Cloudflare 免费隧道**：实测对中国大陆用户线路绕远、抖动 → 音频断续、请求慢。改**直连香港 + Caddy**（香港区免 ICP 备案）后顺畅。隧道仅作"无域名快速验证"的备选（见附录）。

## 关键环境变量（server/llm-proxy.mjs）
| 变量 | 默认 | 生产 | 说明 |
|---|---|---|---|
| `LLM_PROXY_HOST` | `127.0.0.1` | `0.0.0.0` | 绑定地址（Docker 镜像已内置 0.0.0.0） |
| `LLM_PROXY_PORT` | `8787` | `8787` | 监听端口 |
| `SERVE_STATIC` | 关 | `1` | 同源托管 dist（镜像已内置 1） |
| `STATIC_DIR` | `./dist` | `./dist` | 静态目录 |
| `LLM_REQUEST_TIMEOUT_MS` | `90000` | 按需 | 单次 BYOK 调用超时 |

---

## 一、买 ECS
- 阿里云 ECS，**香港地域**（免 ICP 备案，关键）；2vCPU 4GiB、系统盘 40GiB ESSD、Ubuntu 22.04 64 位。
- 按量付费（灵活，用完释放）或包年包月（长期挂机更省）。
- 记下公网 IP（示例 `8.217.129.250`）；控制台「重置密码」设 root 密码。

## 二、安全组入方向规则
只需三条（`0.0.0.0/0`，SSH 建议限本人 IP）：
- SSH **22**（来源限你的 IP 更安全）
- 自定义 TCP **80**（Let's Encrypt 证书验证要用）
- 自定义 TCP **443**（玩家 HTTPS 访问）
- ❌ **8787 不对公网开**（Caddy 在本机内部反代到它）。仅临时直连冒烟测试可临时加，测完删。

## 三、装 Docker
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker -v
```

## 四、拉代码（私有仓）
分支是 **`danqingyuan-v2-baseline`**（默认分支几乎是空的，务必指定）。用**只读部署密钥**：
```bash
ssh-keygen -t ed25519 -C "ecs-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub   # 加到 GitHub 仓库 Settings → Deploy keys（只读）
```
克隆（浅克隆，避开 700MB 历史；仍会拉 ~400MB 资源）：
```bash
git clone -b danqingyuan-v2-baseline --depth 1 git@github.com:lemuria-zmm/satyayuga.git
cd satyayuga/workspaces/danqingyuan-mvp && ls   # 应见 Dockerfile / server / public / src
```
> HTTPS+令牌亦可：`git clone -b danqingyuan-v2-baseline --depth 1 https://<TOKEN>@github.com/lemuria-zmm/satyayuga.git`

## 五、构建 + 运行容器
```bash
docker build -t danqingyuan:latest .
docker run -d --name danqingyuan --restart unless-stopped -p 8787:8787 danqingyuan:latest
docker logs danqingyuan          # "listening on http://0.0.0.0:8787" + 静态托管
curl -s localhost:8787/health    # {"ok":true,"mode":"mock",...,"serveStatic":true}
```
`--restart unless-stopped` 让容器随 Docker/重启自动拉起。

## 六、域名解析
- 买域名（阿里云等），`.xyz` 便宜；**新域名要做实名认证，通过前解析不生效**（几小时~次日）。
- 云解析 DNS 加 **A 记录**：`@` 和 `www` → 你的公网 IP。
- 本地验证：`dig danqingyuan.xyz +short` 返回该 IP 即生效。

## 七、Caddy 自动 HTTPS
安装（apt 装到 **`/usr/bin/caddy`**）：
```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
which caddy    # 确认路径，多为 /usr/bin/caddy
```
> 若上面带管道 `|` 的命令在你的终端粘贴断行，改二进制直装：`curl -fL -o /usr/local/bin/caddy "https://caddyserver.com/api/download?os=linux&arch=amd64"`（URL 含 `&`，**务必带引号整行**），再 `chmod +x`。之后 systemd 里 ExecStart 用对应路径。

配置（反代到容器；`printf` 一行避免断行）：
```bash
mkdir -p /etc/caddy
printf 'danqingyuan.xyz, www.danqingyuan.xyz {\n\treverse_proxy 127.0.0.1:8787\n}\n' > /etc/caddy/Caddyfile
```

systemd 开机自启（**ExecStart 路径必须与 `which caddy` 一致**，否则 `203/EXEC`）。多行 `printf` 易被粘贴打断 → 用逐行 `echo` 写：
```bash
F=/etc/systemd/system/caddy.service
echo '[Unit]' > $F
echo 'Description=Caddy' >> $F
echo 'After=network.target' >> $F
echo '[Service]' >> $F
echo 'ExecStart=/usr/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile' >> $F
echo 'ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile' >> $F
echo 'Restart=always' >> $F
echo 'User=root' >> $F
echo '[Install]' >> $F
echo 'WantedBy=multi-user.target' >> $F
```
启用并验证：
```bash
systemctl daemon-reload
systemctl reset-failed caddy
systemctl enable --now caddy
systemctl status caddy --no-pager      # Active: active (running)
curl -sI https://danqingyuan.xyz       # HTTP/2 200
```

## 八、上线前自检
- [ ] `systemctl status caddy` = active (running)；`docker ps` 里 `danqingyuan` 为 Up。
- [ ] **换台设备/无痕窗口**打开 `https://danqingyuan.xyz`，走新玩家流程：设置 → 填一家 API Key → 开始游戏能出剧情。
- [ ] 片头 mp4 / BGM 能播（Range 206 已支持）。
- [ ] 删掉临时 8787 安全组规则。

## 九、更新线上版本
```bash
cd ~/satyayuga/workspaces/danqingyuan-mvp
git pull
docker build -t danqingyuan:latest .
docker restart danqingyuan        # Caddy 不用动
```

---

## 玩家须知（发给内测者）
- 链接 **https://danqingyuan.xyz**，**用电脑宽屏浏览器**（界面按 ≥1024px 设计，手机会错乱）。
- **普通窗口，别用无痕**——API Key 与存档存在浏览器 localStorage，无痕关掉即丢。
- 首次进入：**设置 → 选厂商(DeepSeek/GLM/Kimi) → 填自己的 API Key → 保存 → 开始游戏**。没 Key 玩不了；想免费用智谱 `glm-4-flash`。模型选带「（推荐）」的最快。
- 点「开始游戏」后音视频才播（浏览器要求先有点击手势），正常。

## 踩坑备忘（省得下次再犯）
- **多行 / 带管道 `|` / URL 含 `&` 的命令，粘贴到某些终端会被拆断**（cloud shell 尤甚）：`gpg --dearmor`、`| tee`、长 URL 都中过招。对策：单行化、逐行 `echo`、`&` 的 URL 加双引号，或干脆手动敲。
- **Caddy `203/EXEC`**：systemd ExecStart 路径 ≠ 实际 `which caddy`（apt 装在 `/usr/bin/caddy`，我们一开始误写 `/usr/local/bin/caddy`）。
- **能拿到证书但浏览器打不开**：多半 **443 没对外开**（服务器本机 `curl` 走回环会成功，误导人）。从**外部/本地机**测 `curl -sI https://域名` 才准。
- **git clone 只拉到几十 KB**：拉成了默认空分支，必须 `-b danqingyuan-v2-baseline`。
- **新域名 ping 不出 IP**：实名认证未通过 / NS 未同步，等几小时~次日。

## 已知与后续
- **资源体量**：`dist` ~500MB（含 400MB 音视频/立绘）。浏览器缓存兜底，少量内测流量很小；规模化再把 `public` 挪 CDN/OSS。
- **无鉴权/限流**：`/api/llm` 开放；因走玩家自带 key，滥用只耗对方额度。想防蹭可给 Caddy 加 Basic Auth，或加 access code（`routeLlmRequest` 已留 else 分支挂点）。
- **计费**：按量付费实例一直开就一直计费；内测结束不用就停机/释放。
- **第二期**（兑换码 + token 额度 + 主办方额度）暂缓。

## 附录：无域名快速验证（Cloudflare Quick Tunnel）
临时、免域名、自带 HTTPS，但链接每次重启变、且对国内线路较慢，仅用于自测：
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
nohup cloudflared tunnel --url http://localhost:8787 > ~/tunnel.log 2>&1 &
grep -o 'https://.*trycloudflare.com' ~/tunnel.log | tail -1
```
