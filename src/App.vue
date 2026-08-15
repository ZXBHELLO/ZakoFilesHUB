<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useImages } from './composables/useImages'
import { useToast } from './composables/useToast'
import { ensureRepo } from './api/hub'
import AlbumSidebar from './components/AlbumSidebar.vue'
import UploadZone from './components/UploadZone.vue'
import ImageGrid from './components/ImageGrid.vue'
import LinkPanel from './components/LinkPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import MoveModal from './components/MoveModal.vue'
import FileViewer from './components/FileViewer.vue'
import HelpModal from './components/HelpModal.vue'
import type { HfFile } from './api/types'

const { state: authState, isAuthenticated, restoreSession } = useAuth()
const {
  state: imageState,
  filteredFiles,
  loadImages,
  deleteSelected,
  deleteFile,
  toggleSelectMode,
  setViewMode,
  selectAll,
  clearSelection,
  toggleShowHidden,
  removeTask,
} = useImages()
const { message, visible, show } = useToast()

const showSettings = ref(false)
const helpModalType = ref<'info' | 'tutorial' | null>(null)
const selectedFile = ref<HfFile | null>(null)
const sidebarOpen = ref(false)
const showMoveModal = ref(false)
const moveSinglePath = ref<string | null>(null)
const uploadPanelCollapsed = ref(false)
const viewerFile = ref<HfFile | null>(null)

onMounted(async () => {
  if (authState.token) {
    const ok = await restoreSession()
    if (ok) {
      try {
        await ensureRepo(authState.repo, authState.token, authState.repoType)
        await loadImages(authState.token, authState.repo, authState.repoType, authState.useMirror)
      } catch (e: any) {
        show(e.message || '仓库初始化失败，请检查 Token 权限')
        showSettings.value = true
      }
    } else {
      showSettings.value = true
    }
  } else {
    showSettings.value = true
  }
})

watch(isAuthenticated, async (val) => {
  if (val) {
    await loadImages(authState.token, authState.repo, authState.repoType, authState.useMirror)
  }
})

function openFile(file: HfFile) {
  selectedFile.value = file
}

function onAlbumSelect() {
  sidebarOpen.value = false
}

async function handleRefresh() {
  await loadImages(authState.token, authState.repo, authState.repoType, authState.useMirror)
  show('已刷新')
}

async function handleDelete(path: string) {
  try {
    await deleteFile(path, authState.token, authState.repo, authState.repoType, authState.useMirror)
    selectedFile.value = null
    show('已删除')
  } catch (e: any) {
    show(e.message || '删除失败')
  }
}

async function handleBatchDelete() {
  try {
    await deleteSelected(authState.token, authState.repo, authState.repoType, authState.useMirror)
    show('已删除选中文件')
  } catch (e: any) {
    show(e.message || '删除失败')
  }
}

function handleMoveSingle(path: string) {
  moveSinglePath.value = path
  selectedFile.value = null
  showMoveModal.value = true
}

function handleBatchMove() {
  moveSinglePath.value = null
  showMoveModal.value = true
}

function onMoveComplete() {
  moveSinglePath.value = null
}

function handleView() {
  if (selectedFile.value) {
    viewerFile.value = selectedFile.value
  }
}
</script>

<template>
  <div class="app" :class="{ 'select-active': imageState.selectMode && imageState.selectedPaths.size > 0 }">
    <Transition name="fade">
      <div
        v-if="sidebarOpen"
        class="sidebar-backdrop"
        @click="sidebarOpen = false"
      />
    </Transition>

    <AlbumSidebar
      v-if="isAuthenticated"
      :open="sidebarOpen"
      @open-settings="showSettings = true"
      @open-info="helpModalType = 'info'"
      @open-tutorial="helpModalType = 'tutorial'"
      @select="onAlbumSelect"
    />

    <main class="main">
      <template v-if="isAuthenticated">
        <header class="topbar">
          <button class="hamburger" @click="sidebarOpen = !sidebarOpen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="imageState.searchQuery"
              type="text"
              placeholder="搜索文件..."
              class="search-input"
            />
          </div>

          <div class="topbar-actions">
            <Transition name="batch">
              <div v-if="imageState.selectMode && imageState.selectedPaths.size > 0" class="batch-group">
                <span class="select-count">已选 {{ imageState.selectedPaths.size }}</span>
                <button class="btn-ghost btn-sm" @click="selectAll">全选</button>
                <button class="btn-ghost btn-sm" @click="clearSelection">取消</button>
                <button class="btn-ghost btn-sm" @click="handleBatchMove" :disabled="imageState.moving">
                  {{ imageState.moving ? '移动中...' : '移动' }}
                </button>
                <button class="btn-danger btn-sm" @click="handleBatchDelete">删除</button>
              </div>
            </Transition>
            <button
              class="icon-btn"
              :class="{ active: imageState.selectMode }"
              @click="toggleSelectMode"
              title="多选模式"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>

            <button
              class="icon-btn view-toggle"
              :class="{ active: imageState.viewMode === 'grid' }"
              @click="setViewMode('grid')"
              title="网格视图"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="8" height="8" rx="1" />
                <rect x="13" y="3" width="8" height="8" rx="1" />
                <rect x="3" y="13" width="8" height="8" rx="1" />
                <rect x="13" y="13" width="8" height="8" rx="1" />
              </svg>
            </button>

            <button
              class="icon-btn view-toggle"
              :class="{ active: imageState.viewMode === 'list' }"
              @click="setViewMode('list')"
              title="列表视图"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1" />
                <circle cx="4" cy="12" r="1" />
                <circle cx="4" cy="18" r="1" />
              </svg>
            </button>

            <button
              class="icon-btn hidden-toggle"
              :class="{ active: imageState.showHidden }"
              @click="toggleShowHidden"
              :title="imageState.showHidden ? '隐藏点文件' : '显示隐藏文件'"
            >
              <svg v-if="!imageState.showHidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>

            <button class="icon-btn refresh-btn" @click="handleRefresh" title="刷新">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </header>

        <div class="content">
          <UploadZone />
          <ImageGrid @open-file="openFile" @retry="showSettings = true" />
        </div>
      </template>

      <div v-else-if="authState.restoring" class="restoring">
        <div class="spinner" />
        <p>正在恢复会话...</p>
      </div>

      <div v-else class="welcome">
        <div class="welcome-bg">
          <div class="orb orb-1" />
          <div class="orb orb-2" />
          <div class="orb orb-3" />
          <div class="grid-overlay" />
        </div>

        <div class="welcome-card">
          <h1 class="welcome-title">Zako Files HUB</h1>
          <p class="welcome-subtitle">免费 · 开源 · 纯前端文件管理系统</p>

          <div class="welcome-features">
            <div class="feature-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/>
              </svg>
              <span>无限存储</span>
            </div>
            <div class="feature-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>拖拽上传</span>
            </div>
            <div class="feature-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>批量管理</span>
            </div>
            <div class="feature-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>快捷分享</span>
            </div>
            <div class="feature-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
              </svg>
              <span>快速部署</span>
            </div>
            <div class="feature-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>在线预览</span>
            </div>
          </div>

          <button class="welcome-btn" @click="showSettings = true">
            <span>开始使用</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>
    </main>

    <Transition name="modal-overlay">
      <SettingsModal
        v-if="showSettings"
        @close="showSettings = false"
        @saved="showSettings = false"
      />
    </Transition>

    <Transition name="modal-overlay">
      <LinkPanel
        v-if="selectedFile"
        :file="selectedFile"
        @close="selectedFile = null"
        @delete="handleDelete"
        @move="handleMoveSingle"
        @view="handleView"
      />
    </Transition>

    <Transition name="viewer-fade">
      <FileViewer
        v-if="viewerFile"
        :file="viewerFile"
        @close="viewerFile = null"
      />
    </Transition>

    <Transition name="modal-overlay">
      <MoveModal
        v-if="showMoveModal"
        :file-count="moveSinglePath ? 1 : imageState.selectedPaths.size"
        :single-path="moveSinglePath || undefined"
        @close="showMoveModal = false"
        @moved="onMoveComplete"
      />
    </Transition>

    <Transition name="modal-overlay">
      <HelpModal
        v-if="helpModalType"
        :type="helpModalType"
        @close="helpModalType = null"
      />
    </Transition>

    <Transition name="upload-panel">
      <div v-if="imageState.uploadTasks.length" class="upload-panel" :class="{ collapsed: uploadPanelCollapsed }">
        <div class="panel-header" @click="uploadPanelCollapsed = !uploadPanelCollapsed">
          <span class="panel-title">
            上传 ({{ imageState.uploadTasks.filter(t => t.status !== 'done' && t.status !== 'error').length }}/{{ imageState.uploadTasks.length }})
          </span>
          <svg class="panel-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div v-show="!uploadPanelCollapsed" class="panel-body">
          <div v-for="task in imageState.uploadTasks" :key="task.id" class="panel-task">
            <div class="task-row">
              <span class="task-name" :title="task.file.name">{{ task.file.name }}</span>
              <span class="task-status" :class="task.status">
                {{ task.status === 'done' ? '✓' : task.status === 'error' ? '✕' : `${task.progress}%` }}
              </span>
              <button class="task-dismiss" @click.stop="removeTask(task.id)">✕</button>
            </div>
            <div class="task-bar">
              <div class="task-progress" :class="task.status" :style="{ width: Math.min(task.progress, 100) + '%' }" />
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="toast">
      <div v-if="visible" class="toast">{{ message }}</div>
    </Transition>

    <Transition name="mobile-batch">
      <div
        v-if="imageState.selectMode && imageState.selectedPaths.size > 0"
        class="mobile-batch-bar"
      >
        <span class="mobile-select-count">已选 {{ imageState.selectedPaths.size }}</span>
        <div class="mobile-batch-actions">
          <button class="btn-ghost btn-sm" @click="selectAll">全选</button>
          <button class="btn-ghost btn-sm" @click="clearSelection">取消</button>
          <button class="btn-ghost btn-sm" @click="handleBatchMove" :disabled="imageState.moving">
            {{ imageState.moving ? '...' : '移动' }}
          </button>
          <button class="btn-danger btn-sm" @click="handleBatchDelete">删除</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  min-height: 100vh;
}

.sidebar-backdrop {
  display: none;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 顶栏：搜索框 + 操作按钮，使用 min-height 允许内容换行时自动扩展 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  padding-top: max(12px, env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--rule);
  gap: 12px;
  min-height: 56px;
  flex-shrink: 0;
}

.hamburger {
  display: none;
  background: transparent;
  border: none;
  color: var(--ink);
  padding: 8px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  cursor: pointer;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  opacity: 0.5;
}
.search-input {
  padding-left: 36px;
  background: var(--bg2);
}

.select-count {
  font-size: 0.78rem;
  color: var(--accent);
  font-weight: 500;
  white-space: nowrap;
  padding-right: 4px;
}

.batch-enter-active,
.batch-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.2s var(--ease-out);
}
.batch-enter-from,
.batch-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

.mobile-batch-bar {
  display: none;
}
.mobile-batch-enter-active,
.mobile-batch-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.25s var(--ease-out);
}
.mobile-batch-enter-from,
.mobile-batch-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
/* 批量操作按钮组：允许换行，防止窄屏溢出 */
.batch-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.2s var(--ease);
}
.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

.btn-sm { padding: 6px 12px; font-size: 0.78rem; min-height: 36px; }
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* 图标按钮：最小触摸目标 36px */
.icon-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.icon-btn:hover {
  background: var(--bg2);
  color: var(--ink);
}
.icon-btn.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}

.content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.restoring {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--muted);
}
.restoring .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.welcome-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: orb-float 20s ease-in-out infinite;
}
.orb-1 {
  width: 400px;
  height: 400px;
  background: var(--accent);
  top: -10%;
  left: -5%;
  animation-delay: 0s;
}
.orb-2 {
  width: 350px;
  height: 350px;
  background: var(--accent2);
  bottom: -10%;
  right: -5%;
  animation-delay: -7s;
}
.orb-3 {
  width: 300px;
  height: 300px;
  background: #3b82f6;
  top: 40%;
  left: 50%;
  animation-delay: -14s;
  opacity: 0.2;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
  33% { transform: translate(30px, -30px) scale(1.05); opacity: 0.45; }
  66% { transform: translate(-20px, 20px) scale(0.95); opacity: 0.3; }
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 80%);
}

.welcome-card {
  position: relative;
  text-align: center;
  max-width: 480px;
  padding: 48px 40px;
  background: rgba(26, 29, 40, 0.6);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: card-enter 0.6s var(--ease-out) both;
}

.welcome-title {
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #818cf8, #c084fc, #f0abfc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
  text-shadow: 0 0 80px rgba(99, 102, 241, 0.3);
}

.welcome-subtitle {
  font-size: 0.95rem;
  color: var(--muted);
  margin-bottom: 32px;
  letter-spacing: 0.01em;
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 36px;
}
.feature-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(37, 41, 55, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 100px;
  font-size: 0.78rem;
  color: var(--ink);
  transition: border-color 0.2s, background 0.2s;
}
.feature-chip:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.08);
}
.feature-chip svg {
  color: var(--accent);
  flex-shrink: 0;
}

.welcome-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  border: none;
  border-radius: 100px;
  box-shadow:
    0 8px 24px rgba(99, 102, 241, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: transform 0.15s var(--ease), box-shadow 0.2s var(--ease);
}
.welcome-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 12px 32px rgba(99, 102, 241, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.welcome-btn:active {
  transform: translateY(0);
}
.welcome-btn svg {
  transition: transform 0.15s var(--ease);
}
.welcome-btn:hover svg {
  transform: translateX(2px);
}

@media (max-width: 768px) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 49;
  }

  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .topbar {
    padding: 8px 12px;
    padding-top: max(8px, env(safe-area-inset-top, 0px));
    gap: 6px;
    min-height: 48px;
  }

  .search-box {
    max-width: none;
  }

  .select-active .view-toggle,
  .select-active .hidden-toggle,
  .select-active .refresh-btn {
    display: none;
  }

  .select-active .batch-group {
    display: none;
  }

  .mobile-batch-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg2);
    border-top: 1px solid var(--rule);
    padding: 10px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .mobile-select-count {
    font-size: 0.78rem;
    color: var(--accent);
    font-weight: 500;
    white-space: nowrap;
  }
  .mobile-batch-actions {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .mobile-batch-actions .btn-sm {
    padding: 6px 10px;
    font-size: 0.75rem;
  }

  .select-active .content {
    padding-bottom: 72px;
  }

  .select-active .btn-sm {
    padding: 5px 8px;
    font-size: 0.72rem;
  }

  .icon-btn {
    padding: 6px;
  }

  .content {
    padding: 12px;
  }

  .welcome-card {
    padding: 32px 20px;
    margin: 0 8px;
  }
  .welcome-title {
    font-size: 2rem;
  }
  .welcome-subtitle {
    font-size: 0.85rem;
  }
  .orb-1 { width: 280px; height: 280px; }
  .orb-2 { width: 240px; height: 240px; }
  .orb-3 { width: 200px; height: 200px; }
  .feature-chip {
    padding: 6px 6px;
    font-size: 0.68rem;
    gap: 4px;
  }
  .feature-chip svg { width: 14px; height: 14px; }

  .upload-panel {
    left: 12px !important;
    right: 12px !important;
    max-width: none !important;
  }

  .select-active .upload-panel {
    bottom: 72px !important;
  }
}

.upload-panel {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom, 0px));
  right: 24px;
  width: 360px;
  max-width: calc(100vw - 48px);
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 90;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--rule);
  transition: background 0.15s;
}
.panel-header:hover { background: var(--bg3); }
.panel-title { font-size: 0.82rem; font-weight: 600; color: var(--ink); }
.panel-chevron {
  color: var(--muted);
  transition: transform 0.2s var(--ease);
  flex-shrink: 0;
}
.upload-panel.collapsed .panel-chevron { transform: rotate(-90deg); }
.upload-panel.collapsed .panel-header { border-bottom: none; }

.panel-body {
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
}

.panel-task {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.panel-task:hover { background: var(--bg3); }

.task-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.task-name {
  flex: 1;
  font-size: 0.78rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.task-status {
  font-size: 0.72rem;
  color: var(--muted);
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
}
.task-status.done { color: var(--success); }
.task-status.error { color: var(--danger); }
.task-dismiss {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 4px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}
.task-dismiss:hover { color: var(--danger); background: rgba(239, 68, 68, 0.1); }

.task-bar {
  height: 3px;
  background: var(--bg3);
  border-radius: 2px;
  overflow: hidden;
}
.task-progress {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s var(--ease);
}
.task-progress.done { background: var(--success); }
.task-progress.error { background: var(--danger); }

.upload-panel-enter-active,
.upload-panel-leave-active {
  transition: opacity 0.2s var(--ease), transform 0.25s var(--ease-out);
}
.upload-panel-enter-from,
.upload-panel-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
