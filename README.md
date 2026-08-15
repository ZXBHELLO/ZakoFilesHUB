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
npm install      # 安装依赖
npm run dev      # 启动开发服务器
npm run build    # 构建项目
npm run preview  # 预览项目在本地环境
```

## 部署

Fork 代码到 GitHub仓库，然后拉取部署：

**Cloudflare Pages**
1. Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 构建命令 `npm run build`，输出目录 `dist`

其他部署方式类似，根据具体平台进行配置。

## License

非商用可自由使用、修改、分发，需保留原作者信息。商用需联系作者获取授权。
