# 丹青院 · 墨枢秘录 —— 单服务部署镜像（2026-07-12）
# 前端 dist 与 /api/llm 由同一个 Node 进程同源托管。玩家自带 API Key（BYOK），
# 服务端无需任何模型 key；provider 默认 mock，仅在收到 clientProvider 时临时转发。

# —— 构建阶段：装依赖 + 生产构建（VITE_LLM_ADAPTER=proxy）——
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:prod

# —— 运行阶段：仅 node + server + dist（运行期无 npm 依赖，镜像精简）——
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    SERVE_STATIC=1 \
    LLM_PROXY_HOST=0.0.0.0 \
    LLM_PROXY_PORT=8787
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
EXPOSE 8787
# 健康检查：/health 返回 200
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["node", "server/llm-proxy.mjs"]
