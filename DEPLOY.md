# HF Image Hub 部署教程

基于 Hugging Face Hub 的免费图床管理系统，支持部署到 Cloudflare Pages 或 GitHub Pages。

## 前置准备

1. **Hugging Face 账号**：前往 [huggingface.co](https://huggingface.co) 注册
2. **Hugging Face Access Token**：在 [Settings → Tokens](https://huggingface.co/settings/tokens) 创建，权限选择 **Write**
3. **Cloudflare 账号**（推荐）：前往 [cloudflare.com](https://cloudflare.com) 注册
4. **GitHub 账号**：用于托管代码和 CI/CD

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

开发服务器运行在 `http://localhost:5173`。

---

## 部署方式一：Cloudflare Pages CLI（推荐）

全球 CDN 加速，国内访问较好，无限带宽。

### 步骤

```bash
# 1. 登录 Cloudflare（首次需要浏览器授权）
npx wrangler login

# 2. 一键部署（自动构建 + 发布）
npm run deploy
```

首次部署会自动创建 Cloudflare Pages 项目，部署完成后获得地址：

```
https://hf-image-hub.pages.dev
```

### 验证

- 访问 `https://hf-image-hub.pages.dev`
- 粘贴 Hugging Face Access Token
- 上传图片测试
- 复制图片外链验证可访问

---

## 部署方式二：Cloudflare Pages + GitHub Git 集成

推送代码自动触发部署，适合持续开发。

### 步骤

1. **推送代码到 GitHub**

```bash
git init
git add .
git commit -m "Initial commit: HF Image Hub"
git branch -M main
git remote add origin https://github.com/{你的用户名}/hf-image-hub.git
git push -u origin main
```

2. **在 Cloudflare Dashboard 连接仓库**

- 进入 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
- 点击 **Create** → **Pages** → **Connect to Git**
- 选择 GitHub 仓库 `hf-image-hub`
- 填写构建设置：

| 配置项 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |

- 点击 **Save and Deploy**

3. **等待构建完成**

Cloudflare 会自动安装依赖、构建项目并部署。后续每次 push 到 `main` 分支自动触发部署。

---

## 部署方式三：GitHub Actions CI/CD

项目已内置 `.github/workflows/deploy-cloudflare.yml`，push 到 main 自动部署到 Cloudflare Pages。

### 步骤

1. **获取 Cloudflare 凭据**

- **API Token**：Dashboard → My Profile → API Tokens → Create Token → 选择 "Edit Cloudflare Workers" 模板
- **Account ID**：Dashboard 首页右侧栏

2. **在 GitHub 仓库添加 Secrets**

进入仓库 Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称 | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 上一步获取的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | 上一步获取的 Account ID |

3. **推送到 main**

```bash
git add .
git commit -m "deploy: add cloudflare pages workflow"
git push origin main
```

GitHub Actions 会自动构建并部署到 Cloudflare Pages。

---

## 部署方式四：GitHub Pages

如果不需要 Cloudflare，也可以用 GitHub Pages。

### 步骤

1. **修改 `vite.config.ts` 的 base 路径**

```ts
export default defineConfig({
  base: '/你的仓库名/',  // 例如 '/hf-image-hub/'
  // ...
})
```

2. **添加 GitHub Pages 部署 workflow**

创建 `.github/workflows/deploy-gh-pages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. **在 GitHub 仓库设置 Pages**

Settings → Pages → Source → GitHub Actions

4. **推送到 main**

部署后地址为 `https://{用户名}.github.io/hf-image-hub/`

---

## Cloudflare Pages vs GitHub Pages

| 特性 | Cloudflare Pages | GitHub Pages |
|---|---|---|
| 全球 CDN | 300+ 节点 | 一般 |
| 国内访问 | 较好 | 经常不稳定 |
| 带宽 | 无限 | 100GB/月 |
| 构建次数 | 无限 | 10 次/月（Actions） |
| 自定义域名 | 支持 + 自动 HTTPS | 支持 |
| 部署速度 | 快 | 较慢 |

**推荐使用 Cloudflare Pages。**

---

## 首次使用

部署完成后，打开网站：

1. 点击 **开始使用**
2. 粘贴 Hugging Face Access Token
3. 填写 Dataset 仓库名（留空则自动创建 `{用户名}/image-bed`）
4. 点击 **验证并保存**
5. 拖拽图片到上传区域，或 Ctrl+V 粘贴
6. 点击图片，复制 URL / Markdown / HTML / BBCode 格式链接

图片外链格式：

```
https://huggingface.co/datasets/{用户名}/{仓库名}/resolve/main/{路径}
```

---

## 常见问题

### Q: 上传失败提示 401

Token 权限不足，确保创建 Token 时选择了 **Write** 权限。

### Q: 图片无法显示

Hugging Face 在部分地区可能被墙。可考虑使用 Cloudflare Workers 做反代，或搭配 jsDelivr CDN。

### Q: Token 安全吗

Token 仅存储在浏览器 localStorage 中，不上传到任何服务器。退出登录会自动清除。

### Q: 存储空间有限制吗

Hugging Face 公开 Dataset 仓库存储免费且无限量，单文件上限 5GB。

### Q: 会被封号吗

Hugging Face TOS 禁止"托管过量无关数据"，但未定义阈值。个人轻量使用目前安全，不建议作为大规模生产存储。
