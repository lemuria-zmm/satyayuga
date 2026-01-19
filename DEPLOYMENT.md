# GitHub Pages 部署指引

以下步骤以 **GitHub Pages** 为例，快速将本项目的静态页面公开发布。

## 方式一：GitHub Pages（/public）

1. 将本仓库推送到你的 GitHub 账号（例如 `yourname/love-simulator`）。
2. 进入仓库 **Settings → Pages**。
3. 在 **Build and deployment** 中：
   - Source 选择 **Deploy from a branch**。
   - Branch 选择 `main`（或你的默认分支）。
   - Folder 选择 **/public**。
4. 点击 **Save**。
5. 等待几分钟后，GitHub Pages 会给出一个公开 URL（形如 `https://yourname.github.io/love-simulator/`）。

> 由于当前入口文件位于 `public/index.html`，选择 `/public` 目录即可直接部署。

## 方式二：GitHub Pages（根目录）

如果你希望使用根目录部署，可将 `public/` 中的内容移动到仓库根目录，并确保 `index.html` 在根目录，然后在 **Pages** 中选择 **/(root)**。

## 常见问题

- **页面加载为空或资源 404**：确认 `public/index.html` 中的 CSS/JS 引用是相对路径（本项目当前使用相对路径）。
- **更新未生效**：GitHub Pages 有缓存，等待 1-2 分钟后刷新，或检查是否推送到已选分支。
