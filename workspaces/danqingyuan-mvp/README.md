# 丹青院 MVP

文字养成 + LLM 丹青试 + 秘阁解谜的 React/TypeScript MVP 骨架。

## Commands

```bash
npm run dev
npm run llm:proxy
npm run llm:proxy:openai
npm run llm:proxy:deepseek
npm run llm:smoke
npm run dev:proxy
npm run build
```

本项目复用上级 `workspaces/node_modules` 中的 Vite/React/TypeScript 依赖，不需要重新安装依赖。

## LLM 模式

- 默认 `npm run dev` 使用前端内置 `MockLlmAdapter`，适合无后端快速试玩。
- `npm run llm:proxy` 启动本地 LLM 代理服务，地址为 `http://127.0.0.1:8787/api/llm`。
- `npm run dev:proxy` 启动前端 proxy 模式，将角色对白、丹青试出题、考试/秘阁评估都转发给本地代理。
- 当前代理默认使用 `LLM_PROVIDER=mock` 返回 mock 数据，但请求/响应 envelope 已固定；后续接真实模型时在 `server/llm-providers/` 增加 provider，不把 API key 放进前端。
- 代理会校验请求 envelope 和三类 LLM 输出 schema，并扫描玩家可见文本中的主线剧透与世界观漂移；校验失败会自动重试，重试耗尽后返回 `422`。
- 三类系统 prompt 已文件化在 `server/prompts/`，代理会按 role 加载 prompt 并把文件版本写入响应 `promptVersion`。
- `GET /api/prompts` 可查看当前加载的 prompt role、version 与文件路径。
- `GET /health` 可查看代理是否可用，以及当前 provider 名称。

真实模型 provider 骨架已预留：

- 设置 `LLM_PROVIDER=openai` 后，代理会调用 `server/llm-providers/openai-provider.mjs`。
- 设置 `LLM_PROVIDER=deepseek` 后，代理会调用 `server/llm-providers/deepseek-provider.mjs`。
- `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` 只在本地代理进程读取，不能放进前端环境变量。
- provider 会把 `server/prompts/` 的系统 prompt、请求 envelope、记忆上下文和 retry 修复提示发送给模型。
- 模型输出仍会经过本地 schema + 剧透/世界观漂移校验；校验失败由代理自动重试。
- 代理启动时会自动读取 `.env.local`；该文件已被 `.gitignore` 忽略。

DeepSeek API 联调步骤：

```bash
cp .env.example .env.local
# 编辑 .env.local，把 LLM_PROVIDER 改为 deepseek，并填入 DEEPSEEK_API_KEY
npm run llm:proxy:deepseek
```

另开一个终端：

```bash
npm run llm:smoke
```

可选环境变量：

```bash
VITE_LLM_ADAPTER=proxy
VITE_LLM_PROXY_URL=http://127.0.0.1:8787/api/llm
LLM_PROVIDER=mock
LLM_PROXY_PORT=8787
LLM_VALIDATION_RETRIES=2

# Optional real provider:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=
# OPENAI_MODEL=gpt-4.1-mini
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MAX_OUTPUT_TOKENS=1400

# Optional DeepSeek provider:
# LLM_PROVIDER=deepseek
# DEEPSEEK_API_KEY=
# DEEPSEEK_MODEL=deepseek-v4-flash
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MAX_TOKENS=1400
# DEEPSEEK_THINKING=disabled
```
