/**
 * 文件管理核心 Composable
 *
 * 管理文件列表、上传、删除、重命名、移动、文件夹等所有文件操作。
 * 使用模块级 reactive 单例，所有组件共享同一份状态。
 *
 * 数据流：
 *   loadImages() → fetchFiles API → state.files
 *   filteredFiles (computed) ← state.files + currentAlbum + searchQuery + showHidden
 *   upload() → uploadImages API → onProgress 回调更新 task → loadImages 刷新
 */
import { reactive, computed } from 'vue'
import { fetchFiles, uploadImages, removeFiles, renameFile, moveFile, createFolder, downloadFileContent, commitTextFile } from '../api/hub'
import type { HfFile, UploadTask, RepoType, ViewMode } from '../api/types'
import { generateUploadPath, getFileExt } from '../utils/file'

interface ImagesState {
  files: HfFile[]
  loading: boolean
  error: string
  currentAlbum: string
  searchQuery: string
  selectedPaths: Set<string>
  uploadTasks: UploadTask[]
  uploading: boolean
  selectMode: boolean
  viewMode: ViewMode
  moving: boolean
  showHidden: boolean
}

// 模块级单例状态
const state = reactive<ImagesState>({
  files: [],
  loading: false,
  error: '',
  currentAlbum: '/',
  searchQuery: '',
  selectedPaths: new Set(),
  uploadTasks: [],
  uploading: false,
  selectMode: false,
  viewMode: 'grid',
  moving: false,
  showHidden: false,
})

export function useImages() {
  /** 所有文件夹列表（从文件路径中提取，始终包含根目录） */
  const albums = computed(() => {
    const set = new Set<string>()
    set.add('/')
    state.files.forEach(f => set.add(f.album))
    return Array.from(set).sort()
  })

  /**
   * 过滤后的文件列表（响应式计算）
   * 过滤顺序：移除 .gitkeep → 过滤隐藏文件 → 按文件夹筛选 → 按搜索词筛选
   */
  const filteredFiles = computed(() => {
    let result = state.files.filter(f => !f.path.endsWith('.gitkeep'))
    if (!state.showHidden) {
      result = result.filter(f => !f.name.startsWith('.'))
    }
    if (state.currentAlbum !== '/') {
      result = result.filter(f => f.album === state.currentAlbum)
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(q))
    }
    return result
  })

  /** 从服务器加载文件列表 */
  async function loadImages(token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    state.loading = true
    state.error = ''
    try {
      state.files = await fetchFiles(repo, token, repoType, useMirror)
    } catch (e: any) {
      state.error = e.message || '加载失败'
    } finally {
      state.loading = false
    }
  }

  /**
   * 上传文件
   *
   * 创建上传任务 → 调用 uploadImages API → 进度回调更新任务状态 → 刷新文件列表
   * 错误处理：仅标记未完成的任务为 error，已完成的任务保持 done 状态
   */
  async function upload(
    files: File[],
    album: string,
    token: string,
    repo: string,
    repoType: RepoType,
    useMirror: boolean
  ) {
    state.uploading = true
    // 为每个文件创建上传任务
    const tasks: UploadTask[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      path: generateUploadPath(file, album),
      status: 'pending' as const,
      progress: 0,
    }))
    state.uploadTasks.push(...tasks)

    try {
      const entries = tasks.map(t => ({ file: t.file, path: t.path }))
      await uploadImages(repo, entries, token, repoType, (path, progress, stateStr) => {
        const task = state.uploadTasks.find(t => t.path === path)
        if (task) {
          task.progress = Math.round(progress)
          // 进度回调中实时更新任务状态
          if (progress === 100) {
            task.status = 'done'
          } else if (stateStr === 'error') {
            task.status = 'error'
          } else {
            task.status = 'uploading'
          }
        }
      })

      // 所有文件上传成功后刷新文件列表
      await loadImages(token, repo, repoType, useMirror)
    } catch (e: any) {
      // 仅标记未完成的任务为 error（已完成的保持 done 状态）
      tasks.forEach(t => {
        if (t.status !== 'done') {
          t.status = 'error'
          t.error = e.message
        }
      })
      throw e
    } finally {
      state.uploading = false
      // 8 秒后自动清理已完成的任务
      setTimeout(() => {
        state.uploadTasks = state.uploadTasks.filter(t => t.status !== 'done')
      }, 8000)
    }
  }

  /** 批量删除选中的文件 */
  async function deleteSelected(token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    const paths = Array.from(state.selectedPaths)
    if (!paths.length) return
    try {
      await removeFiles(repo, paths, token, repoType)
      state.selectedPaths.clear()
      await loadImages(token, repo, repoType, useMirror)
    } catch (e: any) {
      state.error = e.message || '删除失败'
      throw e
    }
  }

  /** 删除单个文件 */
  async function deleteFile(path: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    await removeFiles(repo, [path], token, repoType)
    await loadImages(token, repo, repoType, useMirror)
  }

  /** 重命名文件（保留扩展名和所在文件夹） */
  async function rename(path: string, newName: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    const file = state.files.find(f => f.path === path)
    if (!file) return
    const ext = getFileExt(path)
    const dir = file.album === '/' ? '' : file.album + '/'
    const newPath = `${dir}${newName}${ext}`
    if (newPath === path) return
    await renameFile(repo, path, newPath, token, repoType, file.url)
    await loadImages(token, repo, repoType, useMirror)
  }

  /** 移动单个文件到目标文件夹 */
  async function move(path: string, targetFolder: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    const file = state.files.find(f => f.path === path)
    if (!file) return
    const newPath = targetFolder === '/' ? file.name : `${targetFolder}/${file.name}`
    if (newPath === path) return
    await moveFile(repo, path, newPath, token, repoType, file.url)
    await loadImages(token, repo, repoType, useMirror)
  }

  /**
   * 批量移动选中的文件到目标文件夹
   * 顺序执行，如果某个文件移动失败则中止并报错
   */
  async function batchMove(targetFolder: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    const paths = Array.from(state.selectedPaths)
    if (!paths.length) return
    state.moving = true
    try {
      for (const path of paths) {
        const file = state.files.find(f => f.path === path)
        if (!file) continue
        const newPath = targetFolder === '/' ? file.name : `${targetFolder}/${file.name}`
        if (newPath === path) continue
        await moveFile(repo, path, newPath, token, repoType, file.url)
      }
      state.selectedPaths.clear()
      state.selectMode = false
      await loadImages(token, repo, repoType, useMirror)
    } catch (e: any) {
      state.error = e.message || '移动失败'
      throw e
    } finally {
      state.moving = false
    }
  }

  /** 在当前文件夹下创建新文件夹（通过上传 .gitkeep 占位文件） */
  async function createNewFolder(folderName: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    const parent = state.currentAlbum === '/' ? '' : state.currentAlbum + '/'
    const folderPath = `${parent}${folderName}`
    await createFolder(repo, folderPath, token, repoType)
    await loadImages(token, repo, repoType, useMirror)
  }

  /**
   * 删除文件夹及其所有内容（包括子文件夹中的文件）
   * 先从 UI 移除（乐观更新），再调用 API 删除
   * 如果 API 失败，重新加载文件列表恢复正确状态
   */
  async function deleteFolder(folder: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    // 匹配文件夹下所有文件（包括子文件夹中的文件）
    const paths = state.files
      .filter(f => f.path.startsWith(folder + '/'))
      .map(f => f.path)
    if (!paths.length) return

    // 乐观更新：先从 UI 中移除
    const pathSet = new Set(paths)
    state.files = state.files.filter(f => !pathSet.has(f.path))
    if (state.currentAlbum === folder) {
      state.currentAlbum = '/'
    }

    try {
      await removeFiles(repo, paths, token, repoType)
    } catch (e: any) {
      // API 失败：重新加载恢复正确状态
      await loadImages(token, repo, repoType, useMirror)
      throw e
    }
  }

  /** 下载文件到本地 */
  async function downloadFile(file: HfFile) {
    try {
      const blob = await downloadFileContent(file.url)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      throw new Error(`下载失败: ${e.message}`)
    }
  }

  /** 保存文本文件内容（直接 commit，绕过 preupload） */
  async function saveTextFile(path: string, content: string, token: string, repo: string, repoType: RepoType, useMirror: boolean) {
    await commitTextFile(repo, path, content, token, repoType)
    await loadImages(token, repo, repoType, useMirror)
  }

  /** 切换单个文件的选中状态 */
  function toggleSelect(path: string) {
    if (state.selectedPaths.has(path)) {
      state.selectedPaths.delete(path)
    } else {
      state.selectedPaths.add(path)
    }
  }

  /** 切换多选模式，退出时清空选中 */
  function toggleSelectMode() {
    state.selectMode = !state.selectMode
    if (!state.selectMode) {
      state.selectedPaths.clear()
    }
  }

  /** 全选当前过滤后的文件 */
  function selectAll() {
    filteredFiles.value.forEach(f => state.selectedPaths.add(f.path))
  }

  /** 清空选中 */
  function clearSelection() {
    state.selectedPaths.clear()
  }

  /** 切换当前文件夹并清空选中 */
  function setAlbum(album: string) {
    state.currentAlbum = album
    state.selectedPaths.clear()
  }

  /** 设置视图模式（网格/列表） */
  function setViewMode(mode: ViewMode) {
    state.viewMode = mode
  }

  /** 切换显示/隐藏隐藏文件（以 . 开头的文件） */
  function toggleShowHidden() {
    state.showHidden = !state.showHidden
  }

  /** 从上传任务列表中移除指定任务 */
  function removeTask(taskId: string) {
    const idx = state.uploadTasks.findIndex(t => t.id === taskId)
    if (idx !== -1) {
      state.uploadTasks.splice(idx, 1)
    }
  }

  return {
    state,
    albums,
    filteredFiles,
    loadImages,
    upload,
    deleteSelected,
    deleteFile,
    rename,
    move,
    batchMove,
    createNewFolder,
    deleteFolder,
    downloadFile,
    saveTextFile,
    toggleSelect,
    toggleSelectMode,
    selectAll,
    clearSelection,
    setAlbum,
    setViewMode,
    toggleShowHidden,
    removeTask,
  }
}
