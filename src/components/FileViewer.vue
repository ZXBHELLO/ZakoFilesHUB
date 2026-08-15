<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { HfFile } from '../api/types'
import { isImageFile, isVideoFile, isTextFile, formatSize } from '../utils/file'
import { toProxyUrl } from '../utils/url'
import { useImages } from '../composables/useImages'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { downloadFileContent } from '../api/hub'

const props = defineProps<{ file: HfFile }>()
const emit = defineEmits<{ close: [] }>()

const { saveTextFile, downloadFile } = useImages()
const { state: authState } = useAuth()
const { show } = useToast()

const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isPanning = ref(false)
const panStartX = ref(0)
const panStartY = ref(0)
const panStartTX = ref(0)
const panStartTY = ref(0)

const textContent = ref('')
const textLoading = ref(false)
const textSaving = ref(false)
const isEditing = ref(false)
const editedContent = ref('')

const imageType = computed(() => isImageFile(props.file.path))
const videoType = computed(() => isVideoFile(props.file.path))
const textType = computed(() => isTextFile(props.file.path))

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  scale.value = Math.max(0.2, Math.min(8, scale.value * delta))
}

function onPointerDown(e: PointerEvent) {
  if (!imageType.value) return
  isPanning.value = true
  panStartX.value = e.clientX
  panStartY.value = e.clientY
  panStartTX.value = translateX.value
  panStartTY.value = translateY.value
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isPanning.value) return
  translateX.value = panStartTX.value + (e.clientX - panStartX.value)
  translateY.value = panStartTY.value + (e.clientY - panStartY.value)
}

function onPointerUp() {
  isPanning.value = false
}

function resetView() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

async function loadText() {
  textLoading.value = true
  try {
    const blob = await downloadFileContent(props.file.url, true)
    textContent.value = await blob.text()
    editedContent.value = textContent.value
  } catch (e: any) {
    show('加载文件内容失败')
  } finally {
    textLoading.value = false
  }
}

function startEdit() {
  editedContent.value = textContent.value
  isEditing.value = true
}

function cancelEdit() {
  editedContent.value = textContent.value
  isEditing.value = false
}

async function saveEdit() {
  textSaving.value = true
  try {
    await saveTextFile(
      props.file.path,
      editedContent.value,
      authState.token,
      authState.repo,
      authState.repoType,
      authState.useMirror
    )
    textContent.value = editedContent.value
    isEditing.value = false
    show('已保存')
  } catch (e: any) {
    show(e.message || '保存失败')
  } finally {
    textSaving.value = false
  }
}

async function handleDownload() {
  try {
    show('下载中...')
    await downloadFile(props.file)
    show('下载完成')
  } catch (e: any) {
    show(e.message || '下载失败')
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  if (textType.value) loadText()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="viewer-overlay" @click.self="$emit('close')">
    <div class="viewer-bar">
      <span class="viewer-name" :title="file.name">{{ file.name }}</span>
      <span class="viewer-meta">{{ formatSize(file.size) }}</span>
      <div class="viewer-actions">
        <button v-if="imageType" class="viewer-btn" @click="resetView" title="重置缩放">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button class="viewer-btn" @click="handleDownload" title="下载">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button class="viewer-btn close-btn" @click="$emit('close')" title="关闭">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <div class="viewer-body">
      <!-- Image viewer with zoom/pan -->
      <div
        v-if="imageType"
        class="image-stage"
        @wheel.prevent="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @dblclick="resetView"
      >
        <img
          :src="toProxyUrl(file.url)"
          :alt="file.name"
          referrerpolicy="no-referrer"
          class="zoomable-image"
          :style="{
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          }"
          draggable="false"
        />
      </div>

      <!-- Video player -->
      <div v-else-if="videoType" class="video-stage">
        <video
          :src="toProxyUrl(file.url)"
          controls
          autoplay
          class="video-player"
          referrerpolicy="no-referrer"
        >
          您的浏览器不支持视频播放
        </video>
      </div>

      <!-- Text editor -->
      <div v-else-if="textType" class="text-stage">
        <div v-if="textLoading" class="text-loading">
          <div class="spinner" />
          <p>加载中...</p>
        </div>
        <template v-else>
          <div class="text-toolbar">
            <span class="text-info">{{ file.name }}</span>
            <div class="text-actions">
              <template v-if="!isEditing">
                <button class="btn-ghost btn-sm" @click="startEdit">编辑</button>
              </template>
              <template v-else>
                <button class="btn-primary btn-sm" :disabled="textSaving" @click="saveEdit">
                  {{ textSaving ? '保存中...' : '保存' }}
                </button>
                <button class="btn-ghost btn-sm" @click="cancelEdit">取消</button>
              </template>
            </div>
          </div>
          <textarea
            v-if="isEditing"
            v-model="editedContent"
            class="text-editor"
            spellcheck="false"
          />
          <pre v-else class="text-viewer">{{ textContent }}</pre>
        </template>
      </div>

      <!-- Unsupported file type -->
      <div v-else class="unsupported">
        <p class="unsupported-icon">📎</p>
        <p>此文件类型暂不支持在线预览</p>
        <button class="btn-primary" @click="handleDownload">下载文件</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 150;
  display: flex;
  flex-direction: column;
}

.viewer-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid var(--rule);
  flex-shrink: 0;
  animation: viewer-bar-in 0.25s var(--ease-out);
}
@keyframes viewer-bar-in {
  from { transform: translateY(-12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.viewer-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.viewer-meta {
  font-size: 0.75rem;
  color: var(--muted);
  flex-shrink: 0;
}
.viewer-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.viewer-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  padding: 6px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.viewer-btn:hover {
  background: var(--bg3);
  color: var(--ink);
}
.close-btn:hover {
  color: var(--danger);
}

.viewer-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}
.image-stage:active { cursor: grabbing; }
.zoomable-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  transition: transform 0.05s linear;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

.video-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.video-player {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-sm);
}

.text-stage {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
}
.text-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  padding: 60px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rule);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.text-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
  flex-shrink: 0;
}
.text-info {
  font-size: 0.85rem;
  color: var(--muted);
}
.text-actions {
  display: flex;
  gap: 6px;
}

.text-viewer {
  flex: 1;
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: 20px;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.text-editor {
  flex: 1;
  background: var(--bg2);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 20px;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--ink);
  resize: none;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
}

.unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--muted);
}
.unsupported-icon { font-size: 4rem; }

.btn-sm { padding: 5px 14px; font-size: 0.78rem; }
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .viewer-bar { padding: 10px 12px; gap: 8px; }
  .viewer-name { font-size: 0.78rem; }
  .viewer-meta { display: none; }
  .text-stage { padding: 12px; }
  .text-viewer, .text-editor { padding: 12px; font-size: 0.78rem; }
}
</style>
