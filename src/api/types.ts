export type RepoType = 'model' | 'dataset'

export interface HfUser {
  name: string
  fullname?: string
  organizations?: string[]
}

export interface HfFile {
  path: string
  type: 'file' | 'directory'
  size?: number
  oid?: string
  lfs?: {
    size: number
    oid: string
    pointerSize: number
  }
  url: string
  name: string
  ext: string
  album: string
}

export interface UploadTask {
  id: string
  file: File
  path: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

export type LinkFormat = 'url' | 'markdown' | 'html' | 'bbcode'

export type ViewMode = 'grid' | 'list'

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif']

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v']

export const TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.json', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.vue', '.py', '.yaml', '.yml', '.xml', '.csv', '.log', '.sh', '.bat', '.ini', '.conf', '.toml', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.sql']

export const FILE_ICONS: Record<string, string> = {
  '.pdf': '📄',
  '.doc': '📝', '.docx': '📝',
  '.xls': '📊', '.xlsx': '📊', '.csv': '📊',
  '.ppt': '📽', '.pptx': '📽',
  '.zip': '📦', '.rar': '📦', '.7z': '📦', '.gz': '📦', '.tar': '📦',
  '.mp4': '🎬', '.avi': '🎬', '.mov': '🎬', '.mkv': '🎬', '.webm': '🎬',
  '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵', '.ogg': '🎵',
  '.txt': '📃', '.md': '📃',
  '.js': '⚙', '.ts': '⚙', '.json': '⚙', '.html': '⚙', '.css': '⚙', '.vue': '⚙', '.py': '⚙',
  '.exe': '🔧', '.dmg': '🔧', '.apk': '🔧',
}

export function getFileIcon(ext: string): string {
  return FILE_ICONS[ext] || '📁'
}
