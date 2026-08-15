/**
 * Hugging Face API 层
 *
 * 封装所有与 Hugging Face Hub 的网络交互：
 * - 用户认证（verifyToken）
 * - 仓库管理（ensureRepo）
 * - 文件列表（fetchFiles）
 * - 文件上传（uploadImages / commitTextFile）
 * - 文件删除（removeFiles）
 * - 文件下载（downloadFileContent）
 * - 文件重命名/移动（renameFile / moveFile）
 * - 文件夹创建（createFolder）
 *
 * 所有 API 请求通过 Vite 代理（/hf-proxy）转发到 hf-mirror.com，
 * CDN 请求（文件下载、S3 上传）通过自定义中间件（/hf-cdn）代理。
 */
import type { HfUser, HfFile, RepoType } from './types'
import { buildDirectUrl } from '../utils/url'
import { getFileName, getFileExt, getAlbum } from '../utils/file'

// API 基础路径：通过 Vite 代理转发到 hf-mirror.com
const API_BASE = window.location.origin + '/hf-proxy'

/**
 * 构建 CDN 代理 URL
 * 将外部 URL 通过 /hf-cdn 自定义中间件代理，避免 CORS 和网络问题
 */
function cdnProxy(url: string): string {
  return `${window.location.origin}/hf-cdn?url=${encodeURIComponent(url)}`
}

/** 根据仓库类型返回 API 路径前缀：dataset → datasets，model → models */
function apiPrefix(repoType: RepoType): string {
  return `${repoType}s`
}

/** LFS Batch API 路径前缀：dataset 需要额外加 datasets/，model 不需要 */
function lfsPrefix(repoType: RepoType): string {
  return repoType === 'dataset' ? 'datasets/' : ''
}

/** 构建认证请求头 */
function authHeader(token: string): Record<string, string> {
  return { 'Authorization': `Bearer ${token}` }
}

/**
 * 统一响应检查：非 2xx 状态码时抛出中文错误信息
 * 根据状态码提供更友好的错误提示
 */
async function checkResponse(res: Response, action: string): Promise<void> {
  if (res.ok) return
  let text = ''
  try { text = await res.text() } catch {}
  const snippet = text.slice(0, 300)

  if (res.status === 401) throw new Error(`${action}失败：Token 无效或已过期`)
  if (res.status === 403) throw new Error(`${action}失败：Token 没有 Write 权限`)
  if (res.status === 404) throw new Error(`${action}失败：仓库不存在，请检查仓库名称和类型`)
  throw new Error(`${action}失败 (${res.status}): ${snippet}`)
}

/** 计算 File 的 SHA-256 哈希值（用于 LFS 上传） */
async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 将 File 转为 base64 编码字符串（用于非 LFS 文件 commit） */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 生成文件前 512 字节的 base64 采样（用于 preupload 判断是否需要上传） */
async function generateSample(file: File): Promise<string> {
  const slice = file.slice(0, 512)
  const buffer = await slice.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** 验证 Token 有效性并返回用户信息 */
export async function verifyToken(accessToken: string): Promise<HfUser> {
  const res = await fetch(`${API_BASE}/api/whoami-v2`, {
    headers: authHeader(accessToken),
  })
  await checkResponse(res, '验证 Token')
  const data = await res.json()
  return {
    name: data.name,
    fullname: data.fullname,
    organizations: (data.orgs || []).map((o: any) => o.name),
  }
}

/** 检查仓库是否存在，不存在则自动创建。返回 true 表示已新建 */
export async function ensureRepo(
  repo: string,
  accessToken: string,
  repoType: RepoType
): Promise<boolean> {
  const prefix = apiPrefix(repoType)

  // 先检查仓库是否已存在
  const checkRes = await fetch(`${API_BASE}/api/${prefix}/${repo}`, {
    headers: authHeader(accessToken),
  })
  if (checkRes.ok) return false
  if (checkRes.status !== 404) {
    await checkResponse(checkRes, '检查仓库')
  }

  // 仓库不存在，创建新仓库
  const createRes = await fetch(`${API_BASE}/api/repos/create`, {
    method: 'POST',
    headers: {
      ...authHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: repoType, name: repo }),
  })

  if (!createRes.ok) {
    // 409 表示仓库已存在（并发创建的情况）
    if (createRes.status === 409) return false
    await checkResponse(createRes, '创建仓库')
  }

  return true
}

/** 获取仓库文件列表（递归获取所有文件） */
export async function fetchFiles(
  repo: string,
  accessToken: string,
  repoType: RepoType,
  useMirror: boolean
): Promise<HfFile[]> {
  const prefix = apiPrefix(repoType)
  const res = await fetch(
    `${API_BASE}/api/${prefix}/${repo}/tree/main?recursive=true&expand=true`,
    { headers: authHeader(accessToken) }
  )
  await checkResponse(res, '加载文件列表')

  const entries = await res.json()
  const files: HfFile[] = []

  for (const entry of entries) {
    if (entry.type !== 'file') continue

    files.push({
      path: entry.path,
      type: 'file',
      size: entry.lfs?.size ?? entry.size,
      oid: entry.oid,
      lfs: entry.lfs as any,
      url: buildDirectUrl(repo, entry.path, repoType, 'main', useMirror),
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

/**
 * 上传文件到 Hugging Face 仓库
 *
 * 上传流程：
 * 1. Preupload：发送文件采样信息，服务器判断是否需要上传
 * 2a. LFS 模式（大文件）：计算 SHA256 → 请求 LFS Batch API → 上传到 S3 → Commit
 * 2b. 普通模式（小文件）：base64 编码后直接 Commit
 *
 * @param onProgress 进度回调 (path, progress百分比, 状态描述)
 */
export async function uploadImages(
  repo: string,
  files: UploadFileEntry[],
  accessToken: string,
  repoType: RepoType,
  onProgress?: (path: string, progress: number, state: string) => void
): Promise<void> {
  const prefix = apiPrefix(repoType)
  const apiBase = `${API_BASE}/api/${prefix}/${repo}`

  for (const { file, path } of files) {
    if (onProgress) onProgress(path, 5, '准备中')

    const sample = await generateSample(file)
    const size = file.size

    // 步骤1：Preupload — 发送文件采样，服务器判断是否需要上传
    const preuploadRes = await fetch(`${apiBase}/preupload/main`, {
      method: 'POST',
      headers: {
        ...authHeader(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: [{ path, size, sample }] }),
    })
    await checkResponse(preuploadRes, '上传(preupload)')

    const preuploadData = await preuploadRes.json()
    const fileInfo = preuploadData.files?.[0]

    if (!fileInfo) throw new Error('服务器未返回文件信息')

    // 服务器判断文件内容未变化，跳过上传
    if (fileInfo.shouldIgnore) {
      if (onProgress) onProgress(path, 100, '完成')
      continue
    }

    const isLfs = fileInfo.uploadMode === 'lfs'

    if (isLfs) {
      // === LFS 上传路径（大文件） ===

      // 步骤2a：计算 SHA256 哈希作为文件唯一标识
      if (onProgress) onProgress(path, 15, '计算哈希')
      const oid = await computeSha256(file)

      // 步骤2b：请求 LFS Batch API 获取上传地址
      if (onProgress) onProgress(path, 25, '请求上传地址')
      const lfsUrl = `${API_BASE}/${lfsPrefix(repoType)}${repo}.git/info/lfs/objects/batch`
      const lfsRes = await fetch(lfsUrl, {
        method: 'POST',
        headers: {
          ...authHeader(accessToken),
          'Accept': 'application/vnd.git-lfs+json',
          'Content-Type': 'application/vnd.git-lfs+json',
        },
        body: JSON.stringify({
          operation: 'upload',
          transfers: ['basic', 'multipart'],
          hash_algo: 'sha_256',
          ref: { name: 'main' },
          objects: [{ oid, size }],
        }),
      })
      await checkResponse(lfsRes, '上传(LFS batch)')

      const lfsData = await lfsRes.json()
      const lfsObj = lfsData.objects?.[0]

      if (lfsObj?.error) {
        throw new Error(`LFS 错误: ${lfsObj.error.message}`)
      }

      // 步骤2c：如果服务器返回了上传地址，上传文件到 S3
      if (lfsObj?.actions?.upload) {
        if (onProgress) onProgress(path, 40, '上传中')

        // S3 预签名 URL 需要通过 CDN 代理访问
        let uploadUrl: string = lfsObj.actions.upload.href
        if (uploadUrl.startsWith('http')) {
          uploadUrl = cdnProxy(uploadUrl)
        } else {
          uploadUrl = `${API_BASE}${uploadUrl}`
        }

        // S3 预签名 URL 通过查询参数认证，不能包含 Authorization 头
        // 否则会触发 "Only one auth mechanism allowed" 400 错误
        const lfsHeaders: Record<string, string> = { ...(lfsObj.actions.upload.header || {}) }
        delete lfsHeaders['Authorization']
        delete lfsHeaders['authorization']

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            ...lfsHeaders,
          },
          body: file,
        })
        if (!uploadRes.ok) {
          const text = await uploadRes.text().catch(() => '')
          throw new Error(`上传失败 (CDN ${uploadRes.status}): ${text.slice(0, 300)}`)
        }

        // 步骤2d：LFS Verify（可选，hf-mirror 可能返回 502，忽略错误不影响上传）
        if (lfsObj.actions.verify) {
          let verifyUrl: string = lfsObj.actions.verify.href
          if (verifyUrl.startsWith('http')) {
            verifyUrl = cdnProxy(verifyUrl)
          } else {
            verifyUrl = `${API_BASE}${verifyUrl}`
          }
          try {
            await fetch(verifyUrl, {
              method: 'POST',
              headers: {
                ...authHeader(accessToken),
                'Content-Type': 'application/vnd.git-lfs+json',
              },
              body: JSON.stringify({ oid, size }),
            })
          } catch {}
        }
      }

      if (onProgress) onProgress(path, 85, '提交中')

      // 步骤3：提交 LFS 文件指针到仓库
      const commitLines = [
        JSON.stringify({
          key: 'header',
          value: { summary: `Upload ${path}`, description: '' },
        }),
        JSON.stringify({
          key: 'lfsFile',
          value: { path, algo: 'sha256', size, oid },
        }),
      ]

      const commitRes = await fetch(`${apiBase}/commit/main`, {
        method: 'POST',
        headers: {
          ...authHeader(accessToken),
          'Content-Type': 'application/x-ndjson',
        },
        body: commitLines.join('\n') + '\n',
      })
      await checkResponse(commitRes, '上传(commit)')
    } else {
      // === 普通文件上传路径（小文件，base64 直接 commit） ===

      if (onProgress) onProgress(path, 40, '上传中')

      const base64 = await toBase64(file)

      if (onProgress) onProgress(path, 80, '提交中')

      const commitLines = [
        JSON.stringify({
          key: 'header',
          value: { summary: `Upload ${path}`, description: '' },
        }),
        JSON.stringify({
          key: 'file',
          value: { content: base64, path, encoding: 'base64' },
        }),
      ]

      const commitRes = await fetch(`${apiBase}/commit/main`, {
        method: 'POST',
        headers: {
          ...authHeader(accessToken),
          'Content-Type': 'application/x-ndjson',
        },
        body: commitLines.join('\n') + '\n',
      })
      await checkResponse(commitRes, '上传(commit)')
    }

    if (onProgress) onProgress(path, 100, '完成')
  }
}

/** 批量删除文件（通过 commit deletedFile 操作） */
export async function removeFiles(
  repo: string,
  paths: string[],
  accessToken: string,
  repoType: RepoType
): Promise<void> {
  const prefix = apiPrefix(repoType)
  const apiBase = `${API_BASE}/api/${prefix}/${repo}`

  const commitLines: string[] = [
    JSON.stringify({
      key: 'header',
      value: { summary: `Delete ${paths.length} file(s)`, description: '' },
    }),
    ...paths.map(path =>
      JSON.stringify({ key: 'deletedFile', value: { path } })
    ),
  ]

  const res = await fetch(`${apiBase}/commit/main`, {
    method: 'POST',
    headers: {
      ...authHeader(accessToken),
      'Content-Type': 'application/x-ndjson',
    },
    body: commitLines.join('\n'),
  })
  await checkResponse(res, '删除文件')
}

/**
 * 下载文件内容
 * 通过 /hf-cdn 自定义中间件代理，避免 Vite 代理的 SPA 回退问题
 * @param url 文件的直接访问 URL（huggingface.co 或 hf-mirror.com）
 * @param noCache 是否绕过缓存（添加时间戳查询参数）
 */
export async function downloadFileContent(url: string, noCache = false): Promise<Blob> {
  let target = url
  if (noCache) {
    // 添加时间戳查询参数绕过浏览器和 CDN 缓存
    try {
      const u = new URL(url)
      u.searchParams.set('_t', String(Date.now()))
      target = u.toString()
    } catch {
      // URL 解析失败时直接拼接时间戳
      target = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    }
  }
  const proxyUrl = cdnProxy(target)
  const response = await fetch(proxyUrl)
  if (!response.ok) throw new Error(`下载失败: ${response.status}`)
  return response.blob()
}

/**
 * 直接 commit 文本文件内容（绕过 preupload 步骤）
 *
 * 用于文本文件编辑保存。preupload 的 shouldIgnore 可能误判导致跳过 commit，
 * 此函数直接使用 base64 commit 写入文件内容，确保保存生效。
 */
export async function commitTextFile(
  repo: string,
  path: string,
  content: string,
  accessToken: string,
  repoType: RepoType
): Promise<void> {
  const prefix = apiPrefix(repoType)
  const apiBase = `${API_BASE}/api/${prefix}/${repo}`

  // 将文本内容编码为 base64
  const blob = new Blob([content], { type: 'text/plain' })
  const file = new File([blob], getFileName(path), { type: 'text/plain' })
  const base64 = await toBase64(file)

  // 构建 NDJSON commit 请求体（header + file，不包含 end 标记）
  const commitLines = [
    JSON.stringify({
      key: 'header',
      value: { summary: `Update ${path}`, description: '' },
    }),
    JSON.stringify({
      key: 'file',
      value: { content: base64, path, encoding: 'base64' },
    }),
  ]

  const commitRes = await fetch(`${apiBase}/commit/main`, {
    method: 'POST',
    headers: {
      ...authHeader(accessToken),
      'Content-Type': 'application/x-ndjson',
    },
    body: commitLines.join('\n') + '\n',
  })
  await checkResponse(commitRes, '保存文件')
}

/**
 * 重命名文件：下载原文件 → 上传到新路径 → 删除原文件
 * 注意：如果删除步骤失败，会出现重复文件
 */
export async function renameFile(
  repo: string,
  oldPath: string,
  newPath: string,
  accessToken: string,
  repoType: RepoType,
  fileUrl: string
): Promise<void> {
  const blob = await downloadFileContent(fileUrl)
  const file = new File([blob], getFileName(newPath), { type: blob.type || 'application/octet-stream' })
  await uploadImages(repo, [{ file, path: newPath }], accessToken, repoType)
  await removeFiles(repo, [oldPath], accessToken, repoType)
}

/** 移动文件（语义上等同于重命名） */
export async function moveFile(
  repo: string,
  oldPath: string,
  newPath: string,
  accessToken: string,
  repoType: RepoType,
  fileUrl: string
): Promise<void> {
  return renameFile(repo, oldPath, newPath, accessToken, repoType, fileUrl)
}

/** 创建文件夹（上传 .gitkeep 占位文件） */
export async function createFolder(
  repo: string,
  folderPath: string,
  accessToken: string,
  repoType: RepoType
): Promise<void> {
  const keepPath = `${folderPath}/.gitkeep`
  const file = new File([''], '.gitkeep', { type: 'application/octet-stream' })
  await uploadImages(repo, [{ file, path: keepPath }], accessToken, repoType)
}
