/**
 * 文件网格/列表组件
 *
 * 负责展示文件列表，支持网格视图和列表视图两种模式。
 * 多选模式下支持拖动选择（长按 400ms 激活）。
 * 移动端支持长按 500ms 进入多选模式。
 */
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useImages } from '../composables/useImages'
import ImageCard from './ImageCard.vue'
import type { HfFile } from '../api/types'
import { formatSize, isImageFile, getFileDisplayIcon } from '../utils/file'

const { state, filteredFiles, toggleSelect, toggleSelectMode } = useImages()

const emit = defineEmits<{
  openFile: [file: HfFile]
  retry: []
}>()

// 拖动选择状态
const isDragging = ref(false)
const dragStartPath = ref<string | null>(null)
const dragMode = ref<'select' | 'deselect'>('select')

/** 点击文件卡片：打开文件查看器 */
function onCardClick(path: string) {
  const file = filteredFiles.value.find(f => f.path === path)
  if (file) emit('openFile', file)
}

/**
 * 拖动选择：在拖动经过的卡片上切换选中状态
 * - select 模式：选中未选中的文件
 * - deselect 模式：取消选中已选中的文件
 */
function startDragSelect(path: string) {
  if (!state.selectMode) return
  if (!isDragging.value) return
  if (dragMode.value === 'select') {
    if (!state.selectedPaths.has(path)) toggleSelect(path)
  } else {
    if (state.selectedPaths.has(path)) toggleSelect(path)
  }
}

/**
 * 指针按下事件处理
 *
 * 多选模式下：
 *   - 立即切换选中状态
 *   - 400ms 后激活拖动选择模式（如果指针仍未释放）
 *
 * 触摸模式下（非多选）：
 *   - 500ms 长按进入多选模式并选中当前文件
 *
 * 关键：同时监听 pointerup 和 pointercancel，防止触摸取消时定时器泄漏
 */
function onPointerDown(path: string, e: PointerEvent) {
  if (state.selectMode) {
    // 多选模式：立即切换选中，400ms 后激活拖动
    dragStartPath.value = path
    dragMode.value = state.selectedPaths.has(path) ? 'deselect' : 'select'
    toggleSelect(path)
    e.preventDefault()

    const timer = setTimeout(() => {
      isDragging.value = true
    }, 400)

    // 同时监听 pointerup 和 pointercancel，防止触摸取消时定时器泄漏
    const cleanup = () => clearTimeout(timer)
    window.addEventListener('pointerup', cleanup, { once: true })
    window.addEventListener('pointercancel', cleanup, { once: true })
    return
  }

  if (e.pointerType === 'touch') {
    // 触摸模式：500ms 长按进入多选模式
    const timer = setTimeout(() => {
      toggleSelectMode()
      isDragging.value = true
      dragStartPath.value = path
      dragMode.value = 'select'
      if (!state.selectedPaths.has(path)) toggleSelect(path)
    }, 500)

    const cancel = () => {
      clearTimeout(timer)
      window.removeEventListener('pointerup', cancel)
      window.removeEventListener('pointercancel', cancel)
    }
    window.addEventListener('pointerup', cancel, { once: true })
    window.addEventListener('pointercancel', cancel, { once: true })
  }
}

/** 指针释放：结束拖动选择 */
function onPointerUp() {
  isDragging.value = false
  dragStartPath.value = null
}

/** 指针进入卡片：拖动选择时切换选中 */
function onPointerEnter(path: string) {
  if (isDragging.value && state.selectMode) {
    startDragSelect(path)
  }
}

// 全局监听指针释放和取消，确保拖动状态正确清理
onMounted(() => {
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
})

onUnmounted(() => {
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})
</script>

<template>
  <div class="grid-container">
    <!-- 加载中状态 -->
    <div v-if="state.loading" class="empty">
      <div class="spinner" />
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="state.error" class="empty error-state">
      <p class="empty-icon">⚠️</p>
      <p class="error-msg">{{ state.error }}</p>
      <button class="btn-primary" @click="emit('retry')">重新配置</button>
    </div>

    <Transition name="fade" mode="out-in">
      <!-- 空状态 -->
      <div v-if="!state.loading && !state.error && filteredFiles.length === 0" key="empty" class="empty">
        <p class="empty-icon">📁</p>
        <p>暂无文件，拖拽文件到上方上传</p>
      </div>

      <template v-else-if="!state.loading && !state.error">
        <!-- 网格视图 -->
        <div
          v-if="state.viewMode === 'grid'"
          :key="'grid-' + state.currentAlbum"
          class="grid"
        >
          <div
            v-for="(file, i) in filteredFiles"
            :key="file.path"
            @pointerdown="onPointerDown(file.path, $event)"
            @pointerenter="onPointerEnter(file.path)"
          >
            <ImageCard
              :file="file"
              :index="i"
              :selected="state.selectedPaths.has(file.path)"
              :select-mode="state.selectMode"
              :dragging="isDragging"
              @click="onCardClick(file.path)"
              @drag-select-start="startDragSelect"
            />
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else :key="'list-' + state.currentAlbum" class="file-list">
          <div class="list-header">
            <span class="col-name">名称</span>
            <span class="col-size">大小</span>
            <span class="col-path">路径</span>
          </div>
          <div
            v-for="file in filteredFiles"
            :key="file.path"
            class="list-row"
            :class="{ selected: state.selectedPaths.has(file.path) }"
            @click="onCardClick(file.path)"
          >
            <span class="col-name">
              <span class="list-icon">
                {{ isImageFile(file.path) ? '🖼' : getFileDisplayIcon(file.path) }}
              </span>
              {{ file.name }}
              <span v-if="state.selectMode && state.selectedPaths.has(file.path)" class="check-mark">✓</span>
            </span>
            <span class="col-size">{{ formatSize(file.size) }}</span>
            <span class="col-path">{{ file.album }}</span>
          </div>
        </div>
      </template>
    </Transition>
  </div>
</template>

<style scoped>
.grid-container { min-height: 300px; }

/* 网格视图：自适应列数，最小卡片宽度 160px（移动端 120px） */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

/* 列表视图 */
.file-list {
  background: var(--bg2);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.list-header {
  display: flex;
  padding: 10px 16px;
  font-size: 0.78rem;
  color: var(--muted);
  border-bottom: 1px solid var(--rule);
  font-weight: 500;
}
.list-row {
  display: flex;
  padding: 10px 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--rule);
  align-items: center;
  min-height: 44px; /* 移动端触摸目标最小高度 */
}
.list-row:hover { background: var(--bg3); }
.list-row.selected { background: var(--accent-soft); }
.list-icon { margin-right: 8px; }
.check-mark { color: var(--accent); margin-left: 8px; }

.col-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-size { width: 80px; text-align: right; color: var(--muted); flex-shrink: 0; }
.col-path { width: 120px; color: var(--muted); margin-left: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }

/* 移动端：缩小网格卡片，隐藏路径列 */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }
  .col-path { display: none; }
  .col-size { width: 60px; font-size: 0.78rem; }
}

/* 空状态和错误状态 */
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

.error-state { gap: 8px; }
.error-msg {
  color: var(--danger);
  font-size: 0.95rem;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
  max-width: 400px;
}

/* 加载旋转动画 */
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
