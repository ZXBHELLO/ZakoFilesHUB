<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useImages } from '../composables/useImages'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { isImageFile, formatSize } from '../utils/file'

const { state, upload } = useImages()
const { state: authState } = useAuth()
const { show } = useToast()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  handleFiles(files)
}

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  const files: File[] = []
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length) handleFiles(files)
}

function handleSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  handleFiles(files)
  target.value = ''
}

async function handleFiles(files: File[]) {
  const images = files.filter(f => isImageFile(f.name))
  if (!images.length) {
    show('未检测到图片文件')
    return
  }
  try {
    await upload(images, state.currentAlbum, authState.token, authState.repo)
    show(`已上传 ${images.length} 张图片`)
  } catch (e: any) {
    show(e.message || '上传失败')
  }
}

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})
onUnmounted(() => {
  window.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div class="upload-wrapper">
    <div
      class="dropzone"
      :class="{ dragging: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*"
        style="display:none"
        @change="handleSelect"
      />
      <div class="dropzone-content">
        <span class="drop-icon">📤</span>
        <p>拖拽图片到此处、点击选择、或 Ctrl+V 粘贴</p>
        <p class="sub">支持 PNG / JPG / GIF / WebP / SVG / BMP</p>
      </div>
    </div>

    <div v-if="state.uploadTasks.length" class="upload-tasks">
      <div v-for="task in state.uploadTasks" :key="task.id" class="task">
        <div class="task-info">
          <span class="task-name">{{ task.file.name }}</span>
          <span class="task-status" :class="task.status">
            {{ task.status === 'done' ? '完成' : task.status === 'error' ? '失败' : `${task.progress}%` }}
          </span>
        </div>
        <div class="task-bar">
          <div
            class="task-progress"
            :class="task.status"
            :style="{ width: task.progress + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-wrapper { margin-bottom: 20px; }

.dropzone {
  border: 2px dashed var(--rule);
  border-radius: var(--radius);
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover, .dropzone.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.drop-icon { font-size: 2rem; display: block; margin-bottom: 8px; }
.dropzone-content p { font-size: 0.875rem; color: var(--ink); }
.dropzone-content .sub { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }

.upload-tasks {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.task {
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
}
.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.task-name {
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}
.task-status { font-size: 0.75rem; font-weight: 600; }
.task-status.uploading { color: var(--accent); }
.task-status.done { color: var(--success); }
.task-status.error { color: var(--danger); }

.task-bar {
  height: 3px;
  background: var(--bg3);
  border-radius: 2px;
  overflow: hidden;
}
.task-progress {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}
.task-progress.uploading { background: var(--accent); }
.task-progress.done { background: var(--success); }
.task-progress.error { background: var(--danger); }
</style>
