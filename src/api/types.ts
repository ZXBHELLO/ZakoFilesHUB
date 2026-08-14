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

export interface HfRepoInfo {
  id: string
  name: string
  private: boolean
  size?: number
  downloads?: number
  likes?: number
  lastModified?: string
}

export interface UploadProgress {
  file: string
  progress: number
  loaded: number
  total: number
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

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']
