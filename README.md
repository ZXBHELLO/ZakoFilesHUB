# Zako Files HUB

基于 Hugging Face Hub 的免费文件管理系统。纯前端架构，零后端，部署即用。

## 特性

- 无限免费公开存储，单文件上限 5GB
- 拖拽 / 点击 / 粘贴上传，支持所有文件类型
- 文件夹管理、批量操作、在线预览
- 多格式分享链接（URL / Markdown / HTML / BBCode）
- 国内镜像加速（hf-mirror.com）
- 响应式设计，适配桌面与移动端

## 技术栈

Vue 3 · Vite · TypeScript · Hugging Face Hub · Cloudflare Pages

## 快速开始

```bash
npm install
npm run dev
```

## 部署

推送代码到 GitHub，然后选择以下任一方式拉取部署：

**Cloudflare Pages**
1. Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 构建命令 `npm run build`，输出目录 `dist`

**GitHub Pages**
1. 修改 `vite.config.ts` 中 `base` 为 `'/你的仓库名/'`
2. Settings → Pages → Source 选择 GitHub Actions

## License

PolyForm Noncommercial 1.0.0 — 非商用可自由使用、修改、分发，需保留原作者信息。商用需联系作者获取授权。详见 [LICENSE](./LICENSE)。
