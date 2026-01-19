# satyayuga
for vibe coding

## GitHub Pages 部署

本项目使用 Vite 构建，部署到 GitHub Pages 需要设置正确的 `base` 路径。

### 1. 构建
```bash
npm install
npm run build
```

### 2. 发布
- 将 `dist/` 目录上传到 `gh-pages` 分支，或在 GitHub Actions 中发布。
- 仓库名为 `satyayuga`，因此访问路径为：
  `https://<你的用户名>.github.io/satyayuga/`

### 3. 常见问题
- 打开页面空白或资源 404：确认 `vite.config.ts` 中 `base` 为 `/satyayuga/`。
