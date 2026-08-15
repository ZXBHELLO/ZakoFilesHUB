/**
 * 文件工具函数
 *
 * 提供文件类型判断、路径解析、大小格式化、上传路径生成等功能。
 */
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, TEXT_EXTENSIONS, getFileIcon } from '../api/types'

/** 判断文件是否为图片（按扩展名匹配） */
export function isImageFile(path: string): boolean {
  const lower = path.toLowerCase()
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))
}

/** 判断文件是否为视频（按扩展名匹配） */
export function isVideoFile(path: string): boolean {
  const lower = path.toLowerCase()
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext))
}

/** 判断文件是否为文本文件（按扩展名匹配） */
export function isTextFile(path: string): boolean {
  const lower = path.toLowerCase()
  return TEXT_EXTENSIONS.some(ext => lower.endsWith(ext))
}

/** 从完整路径中提取文件名（最后一段） */
export function getFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

/** 从文件名中提取扩展名（含点号，如 .jpg），无扩展名时返回空字符串 */
export function getFileExt(path: string): string {
  const name = getFileName(path)
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

/** 从完整路径中提取所属文件夹路径（无文件夹时返回 '/'） */
export function getAlbum(path: string): string {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '/'
}

/** 将字节数格式化为人类可读的大小字符串（如 1.5 MB） */
export function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/** 生成唯一的上传路径：时间戳_随机字符串+扩展名，避免文件名冲突 */
export function generateUploadPath(file: File, album: string): string {
  const ext = getFileExt(file.name)
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const fileName = `${timestamp}_${random}${ext}`
  return album === '/' ? fileName : `${album}/${fileName}`
}

/** 获取文件显示图标：图片无图标（用缩略图），其他类型返回对应 emoji */
export function getFileDisplayIcon(path: string): string {
  if (isImageFile(path)) return ''
  return getFileIcon(getFileExt(path))
}

/**
 * 复制文本到剪贴板
 * 优先使用现代 Clipboard API，降级到 execCommand 方案
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案：创建临时 textarea 执行 execCommand
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  }
}
