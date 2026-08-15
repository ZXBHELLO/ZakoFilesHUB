<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useImages } from '../composables/useImages'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const { state, upload } = useImages()
const { state: authState } = useAuth()
const { show } = useToast()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024

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
  if (!files.length) return
  const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
  if (oversized.length) {
    const names = oversized.map(f => f.name).join('、')
    show(`文件 ${names} 超过 5GB 限制，无法上传`)
    return
  }
  try {
    await upload(files, state.currentAlbum, authState.token, authState.repo, authState.repoType, authState.useMirror)
    show(`已上传 ${files.length} 个文件`)
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
        style="display:none"
        @change="handleSelect"
      />
      <div class="dropzone-content">
        <span class="drop-icon">📤</span>
        <p>拖拽文件到此处、点击选择、或 Ctrl+V 粘贴</p>
        <p class="sub">支持图片 / 文档 / 压缩包 / 视频等任意文件类型 · 单文件最大 5GB</p>
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
  transition: border-color 0.2s var(--ease), background 0.2s var(--ease), transform 0.15s var(--ease);
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dropzone.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: scale(1.01);
}
.drop-icon { font-size: 2rem; display: block; margin-bottom: 8px; }
.dropzone-content p { font-size: 0.875rem; color: var(--ink); }
.dropzone-content .sub { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
</style>
