import { IMAGE_EXTENSIONS } from '../api/types'

export function isImageFile(path: string): boolean {
  const lower = path.toLowerCase()
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export function getFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

export function getFileExt(path: string): string {
  const name = getFileName(path)
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

export function getAlbum(path: string): string {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '/'
}

export function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function generateUploadPath(file: File, album: string): string {
  const ext = getFileExt(file.name)
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 8)
  const fileName = `${timestamp}_${random}${ext}`
  return album === '/' ? fileName : `${album}/${fileName}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
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
