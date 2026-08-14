<script setup lang="ts">
import { useImages } from '../composables/useImages'
import ImageCard from './ImageCard.vue'
import type { HfFile } from '../api/types'

const { state, filteredFiles, toggleSelect, selectAll, clearSelection } = useImages()

const emit = defineEmits<{
  openFile: [file: HfFile]
}>()
</script>

<template>
  <div class="grid-container">
    <div v-if="state.selectedPaths.size > 0" class="batch-bar">
      <span>已选 {{ state.selectedPaths.size }} 项</span>
      <div class="batch-actions">
        <button class="btn-ghost btn-sm" @click="selectAll">全选</button>
        <button class="btn-ghost btn-sm" @click="clearSelection">取消选择</button>
      </div>
    </div>

    <div v-if="state.loading" class="empty">
      <div class="spinner" />
      <p>加载中...</p>
    </div>

    <div v-else-if="filteredFiles.length === 0" class="empty">
      <p class="empty-icon">🖼</p>
      <p>暂无图片，拖拽文件到上方上传</p>
    </div>

    <div v-else class="grid">
      <ImageCard
        v-for="file in filteredFiles"
        :key="file.path"
        :file="file"
        :selected="state.selectedPaths.has(file.path)"
        @click="emit('openFile', file)"
        @toggle-select="toggleSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.grid-container { min-height: 300px; }

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 500;
}
.batch-actions { display: flex; gap: 8px; }
.btn-sm { padding: 4px 12px; font-size: 0.78rem; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  color: var(--muted);
  gap: 12px;
}
.empty-icon { font-size: 3rem; }
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
