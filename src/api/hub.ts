import {
  whoAmI,
  createRepo,
  repoExists,
  listFiles,
  uploadFilesWithProgress,
  deleteFiles,
} from '@huggingface/hub'
import type { ListFileEntry } from '@huggingface/hub'
import type { HfUser, HfFile } from './types'
import { buildDirectUrl } from '../utils/url'
import { isImageFile, getFileName, getFileExt, getAlbum } from '../utils/file'

export async function verifyToken(accessToken: string): Promise<HfUser> {
  const info = await whoAmI({ accessToken })
  if (!info) throw new Error('Token 无效')
  return {
    name: info.name,
    fullname: (info as any).fullname,
    organizations: (info as any).orgs,
  }
}

export async function ensureRepo(
  repo: string,
  accessToken: string
): Promise<boolean> {
  const exists = await repoExists({
    repo: { type: 'dataset', name: repo },
    accessToken,
  })
  if (exists) return false

  await createRepo({
    repo,
    repoType: 'dataset',
    accessToken,
    private: false,
  })
  return true
}

export async function fetchFiles(
  repo: string,
  accessToken: string
): Promise<HfFile[]> {
  const files: HfFile[] = []

  for await (const entry of listFiles({
    repo: { type: 'dataset', name: repo },
    recursive: true,
    expand: true,
    accessToken,
  })) {
    if (entry.type !== 'file') continue
    if (!isImageFile(entry.path)) continue

    files.push({
      path: entry.path,
      type: 'file',
      size: entry.lfs?.size ?? entry.size,
      oid: entry.oid,
      lfs: entry.lfs as any,
      url: buildDirectUrl(repo, entry.path),
      name: getFileName(entry.path),
      ext: getFileExt(entry.path),
      album: getAlbum(entry.path),
    })
  }

  return files
}

export interface UploadFileEntry {
  file: File
  path: string
}

export async function uploadImages(
  repo: string,
  files: UploadFileEntry[],
  accessToken: string,
  onProgress?: (path: string, progress: number, state: string) => void
): Promise<void> {
  const operations = files.map(f => ({
    path: f.path,
    content: f.file as Blob,
  }))

  const generator = uploadFilesWithProgress({
    repo: { type: 'dataset', name: repo },
    files: operations,
    accessToken,
  })

  for await (const event of generator) {
    if (event.event === 'fileProgress' && onProgress) {
      onProgress(event.path, event.progress, event.state)
    }
  }
}

export async function removeFiles(
  repo: string,
  paths: string[],
  accessToken: string
): Promise<void> {
  await deleteFiles({
    repo: { type: 'dataset', name: repo },
    paths,
    accessToken,
  })
}

export type { ListFileEntry }
