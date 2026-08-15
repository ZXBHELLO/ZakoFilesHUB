/**
 * URL 工具函数
 *
 * 构建 Hugging Face 文件直链、分享链接、代理 URL 等。
 * 支持官方域名和 hf-mirror.com 镜像域名切换。
 */
import type { LinkFormat, RepoType } from '../api/types'

// Hugging Face 官方域名和镜像域名
const HF_BASE = 'https://huggingface.co'
const MIRROR_BASE = 'https://hf-mirror.com'

/** 根据仓库类型返回路径前缀：dataset 需要 datasets/ 前缀，model 不需要 */
function typePrefix(repoType: RepoType): string {
  return repoType === 'dataset' ? 'datasets/' : ''
}

/**
 * 构建文件直接访问 URL（CDN 链接）
 * 格式：{base}/{typePrefix}{repo}/resolve/{branch}/{path}
 */
export function buildDirectUrl(
  repo: string,
  path: string,
  repoType: RepoType = 'dataset',
  branch = 'main',
  useMirror: boolean = false
): string {
  const base = useMirror ? MIRROR_BASE : HF_BASE
  return `${base}/${typePrefix(repoType)}${repo}/resolve/${branch}/${path}`
}

/** 构建分享链接（URL / Markdown / HTML / BBCode 格式） */
export function buildLink(format: LinkFormat, url: string, name?: string): string {
  const label = name || 'image'
  switch (format) {
    case 'url':
      return url
    case 'markdown':
      return `![${label}](${url})`
    case 'html':
      return `<img src="${url}" alt="${label}" />`
    case 'bbcode':
      return `[img]${url}[/img]`
  }
}

/** 构建仓库主页 URL */
export function buildRepoUrl(repo: string, repoType: RepoType = 'dataset', useMirror: boolean = false): string {
  const base = useMirror ? MIRROR_BASE : HF_BASE
  return `${base}/${typePrefix(repoType)}${repo}`
}

/**
 * 将外部 URL 转换为 Vite 代理 URL
 * 用于图片等资源的代理访问，避免 CORS 问题
 * 返回相对路径，由 Vite 代理转发到 hf-mirror.com
 */
export function toProxyUrl(url: string): string {
  try {
    const target = new URL(url)
    return `/hf-proxy${target.pathname}${target.search}`
  } catch {
    // URL 解析失败时返回原始 URL
    return url
  }
}
