import { reactive, computed, ref } from 'vue'
import { fetchFiles, uploadImages, removeFiles } from '../api/hub'
import type { HfFile, UploadTask } from '../api/types'
import { generateUploadPath } from '../utils/file'

interface ImagesState {
  files: HfFile[]
  loading: boolean
  error: string
  currentAlbum: string
  searchQuery: string
  selectedPaths: Set<string>
  uploadTasks: UploadTask[]
  uploading: boolean
}

const state = reactive<ImagesState>({
  files: [],
  loading: false,
  error: '',
  currentAlbum: '/',
  searchQuery: '',
  selectedPaths: new Set(),
  uploadTasks: [],
  uploading: false,
})

export function useImages() {
  const albums = computed(() => {
    const set = new Set<string>()
    set.add('/')
    state.files.forEach(f => set.add(f.album))
    return Array.from(set).sort()
  })

  const filteredFiles = computed(() => {
    let result = state.files
    if (state.currentAlbum !== '/') {
      result = result.filter(f => f.album === state.currentAlbum)
    }
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(q))
    }
    return result
  })

  async function loadImages(token: string, repo: string) {
    state.loading = true
    state.error = ''
    try {
      state.files = await fetchFiles(repo, token)
    } catch (e: any) {
      state.error = e.message || '加载失败'
    } finally {
      state.loading = false
    }
  }

  async function upload(
    files: File[],
    album: string,
    token: string,
    repo: string
  ) {
    state.uploading = true
    const tasks: UploadTask[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      path: generateUploadPath(file, album),
      status: 'pending' as const,
      progress: 0,
    }))
    state.uploadTasks.push(...tasks)

    try {
      const entries = tasks.map(t => ({ file: t.file, path: t.path }))
      await uploadImages(repo, entries, token, (path, progress, stateStr) => {
        const task = state.uploadTasks.find(t => t.path === path)
        if (task) {
          task.progress = Math.round(progress * 100)
          task.status = stateStr === 'error' ? 'error' : 'uploading'
        }
      })

      tasks.forEach(t => {
        t.status = 'done'
        t.progress = 100
      })

      await loadImages(token, repo)
    } catch (e: any) {
      tasks.forEach(t => {
        t.status = 'error'
        t.error = e.message
      })
      throw e
    } finally {
      state.uploading = false
      setTimeout(() => {
        state.uploadTasks = state.uploadTasks.filter(t => t.status !== 'done')
      }, 3000)
    }
  }

  async function deleteSelected(token: string, repo: string) {
    const paths = Array.from(state.selectedPaths)
    if (!paths.length) return
    try {
      await removeFiles(repo, paths, token)
      state.selectedPaths.clear()
      await loadImages(token, repo)
    } catch (e: any) {
      state.error = e.message || '删除失败'
      throw e
    }
  }

  function toggleSelect(path: string) {
    if (state.selectedPaths.has(path)) {
      state.selectedPaths.delete(path)
    } else {
      state.selectedPaths.add(path)
    }
  }

  function selectAll() {
    filteredFiles.value.forEach(f => state.selectedPaths.add(f.path))
  }

  function clearSelection() {
    state.selectedPaths.clear()
  }

  function setAlbum(album: string) {
    state.currentAlbum = album
    state.selectedPaths.clear()
  }

  return {
    state,
    albums,
    filteredFiles,
    loadImages,
    upload,
    deleteSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    setAlbum,
  }
}
