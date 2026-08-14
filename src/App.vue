<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useImages } from './composables/useImages'
import { useToast } from './composables/useToast'
import AlbumSidebar from './components/AlbumSidebar.vue'
import UploadZone from './components/UploadZone.vue'
import ImageGrid from './components/ImageGrid.vue'
import LinkPanel from './components/LinkPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import type { HfFile } from './api/types'

const { state: authState, isAuthenticated, restoreSession, logout } = useAuth()
const { state: imageState, filteredFiles, loadImages, deleteSelected } = useImages()
const { message, visible, show } = useToast()

const showSettings = ref(false)
const selectedFile = ref<HfFile | null>(null)

onMounted(async () => {
  if (authState.token) {
    const ok = await restoreSession()
    if (ok) {
      await loadImages(authState.token, authState.repo)
    } else {
      showSettings.value = true
    }
  } else {
    showSettings.value = true
  }
})

watch(isAuthenticated, async (val) => {
  if (val) {
    await loadImages(authState.token, authState.repo)
  }
})

function openFile(file: HfFile) {
  selectedFile.value = file
}

async function handleDelete(path: string) {
  try {
    imageState.selectedPaths.add(path)
    await deleteSelected(authState.token, authState.repo)
    selectedFile.value = null
    show('已删除')
  } catch (e: any) {
    show(e.message || '删除失败')
  }
}

async function handleBatchDelete() {
  try {
    await deleteSelected(authState.token, authState.repo)
    show('已删除选中图片')
  } catch (e: any) {
    show(e.message || '删除失败')
  }
}
</script>

<template>
  <div class="app">
    <AlbumSidebar v-if="isAuthenticated" @open-settings="showSettings = true" />

    <main class="main">
      <template v-if="isAuthenticated">
        <header class="topbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="imageState.searchQuery"
              type="text"
              placeholder="搜索图片..."
              class="search-input"
            />
          </div>
          <div class="topbar-actions">
            <button
              v-if="imageState.selectedPaths.size > 0"
              class="btn-danger"
              @click="handleBatchDelete"
            >
              删除选中 ({{ imageState.selectedPaths.size }})
            </button>
          </div>
        </header>

        <div class="content">
          <UploadZone />
          <ImageGrid @open-file="openFile" />
        </div>
      </template>

      <div v-else class="welcome">
        <div class="welcome-content">
          <h1>HF Image Hub</h1>
          <p>基于 Hugging Face Hub 的免费图床管理系统</p>
          <p class="welcome-desc">
            无限免费公开存储 · 纯前端零后端 · 拖拽上传 · 批量管理
          </p>
          <button class="btn-primary welcome-btn" @click="showSettings = true">
            开始使用
          </button>
        </div>
      </div>
    </main>

    <SettingsModal
      v-if="showSettings"
      @close="showSettings = false"
      @saved="showSettings = false"
    />

    <LinkPanel
      v-if="selectedFile"
      :file="selectedFile"
      @close="selectedFile = null"
      @delete="handleDelete"
    />

    <div v-if="visible" class="toast">{{ message }}</div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--rule);
  gap: 16px;
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

.content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.welcome-content {
  text-align: center;
  max-width: 480px;
}
.welcome-content h1 {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
}
.welcome-content > p {
  font-size: 1.1rem;
  color: var(--ink);
  margin-bottom: 8px;
}
.welcome-desc {
  font-size: 0.9rem !important;
  color: var(--muted) !important;
  margin-bottom: 28px !important;
}
.welcome-btn {
  padding: 12px 32px;
  font-size: 1rem;
}
</style>
