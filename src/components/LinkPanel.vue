<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HfFile, LinkFormat } from '../api/types'
import { buildLink } from '../utils/url'
import { copyToClipboard, formatSize, isImageFile, isVideoFile, isTextFile, getFileDisplayIcon, getFileExt } from '../utils/file'
import { toProxyUrl } from '../utils/url'
import { useToast } from '../composables/useToast'
import { useImages } from '../composables/useImages'
import { useAuth } from '../composables/useAuth'

const props = defineProps<{ file: HfFile }>()
const emit = defineEmits<{ close: []; delete: [path: string]; move: [path: string]; view: [] }>()

const { show } = useToast()
const { downloadFile, rename } = useImages()
const { state: authState } = useAuth()
const activeFormat = ref<LinkFormat>('url')
const renaming = ref(false)
const newBaseName = ref(props.file.name.replace(/\.[^.]+$/, ''))
const saving = ref(false)
const canView = computed(() => isImageFile(props.file.path) || isVideoFile(props.file.path) || isTextFile(props.file.path))

const formats: { key: LinkFormat; label: string }[] = [
  { key: 'url', label: 'URL' },
  { key: 'markdown', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'bbcode', label: 'BBCode' },
]

// 当前格式的分享链接（响应式计算，避免模板中重复调用）
const currentLink = computed(() => buildLink(activeFormat.value, props.file.url, props.file.name))

async function copyLink() {
  const ok = await copyToClipboard(currentLink.value)
  show(ok ? '已复制到剪贴板' : '复制失败')
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

async function handleRename() {
  if (!newBaseName.value.trim()) {
    show('文件名不能为空')
    return
  }
  saving.value = true
  try {
    await rename(
      props.file.path,
      newBaseName.value.trim(),
      authState.token,
      authState.repo,
      authState.repoType,
      authState.useMirror
    )
    show('已重命名')
    emit('close')
  } catch (e: any) {
    show(e.message || '重命名失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="link-panel">
      <div class="preview" @click="canView && $emit('view')">
        <img
          v-if="isImageFile(file.path)"
          :src="toProxyUrl(file.url)"
          :alt="file.name"
          loading="lazy"
          referrerpolicy="no-referrer"
          :class="{ clickable: canView }"
        />
        <div v-else-if="isVideoFile(file.path)" class="file-icon-large clickable">🎬</div>
        <div v-else-if="isTextFile(file.path)" class="file-icon-large clickable">📃</div>
        <div v-else class="file-icon-large">{{ getFileDisplayIcon(file.path) }}</div>
      </div>

      <div class="info">
        <div class="info-row">
          <span class="label">文件名</span>
          <span class="value">{{ file.name }}</span>
        </div>
        <div class="info-row">
          <span class="label">大小</span>
          <span class="value">{{ formatSize(file.size) }}</span>
        </div>
        <div class="info-row">
          <span class="label">路径</span>
          <span class="value mono">{{ file.path }}</span>
        </div>
      </div>

      <div v-if="isImageFile(file.path)" class="formats">
        <button
          v-for="fmt in formats"
          :key="fmt.key"
          class="format-tab"
          :class="{ active: activeFormat === fmt.key }"
          @click="activeFormat = fmt.key"
        >
          {{ fmt.label }}
        </button>
      </div>

      <div v-if="isImageFile(file.path)" class="link-box">
        <code>{{ currentLink }}</code>
          <button class="btn-primary copy-btn" @click="copyLink">复制</button>
      </div>

      <Transition name="fade">
        <div v-if="renaming" class="rename-box">
          <input
            v-model="newBaseName"
            type="text"
            placeholder="新文件名"
            @keyup.enter="handleRename"
          />
          <span class="ext-suffix">{{ getFileExt(file.name) }}</span>
          <button class="btn-primary btn-sm" :disabled="saving" @click="handleRename">
            {{ saving ? '处理中...' : '确认' }}
          </button>
          <button class="btn-ghost btn-sm" @click="renaming = false">取消</button>
        </div>
      </Transition>

      <div class="panel-actions">
        <button v-if="canView" class="btn-primary" @click="$emit('view')">查看</button>
        <button class="btn-ghost" @click="handleDownload">下载</button>
        <button class="btn-ghost" @click="renaming = !renaming">重命名</button>
        <button class="btn-ghost" @click="$emit('move', file.path)">移动</button>
        <button class="btn-danger" @click="$emit('delete', file.path)">删除</button>
        <button class="btn-ghost" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.link-panel {
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  max-width: 560px;
  width: 100%;
  overflow: hidden;
}

.preview {
  background: var(--bg);
  padding: 24px;
  text-align: center;
  max-height: 320px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview img {
  max-width: 100%;
  max-height: 280px;
  border-radius: var(--radius-sm);
  object-fit: contain;
}
.file-icon-large {
  font-size: 4rem;
  opacity: 0.6;
}
.clickable {
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s var(--ease);
}
.clickable:hover {
  opacity: 1;
  transform: scale(1.05);
}

.info {
  padding: 16px 20px;
  border-bottom: 1px solid var(--rule);
}
.info-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  font-size: 0.85rem;
}
.label {
  width: 48px;
  color: var(--muted);
  flex-shrink: 0;
}
.value {
  color: var(--ink);
  word-break: break-all;
}
.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }

.formats {
  display: flex;
  gap: 4px;
  padding: 12px 20px 0;
}
.format-tab {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
  padding: 5px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  cursor: pointer;
}
.format-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.link-box {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  align-items: center;
}
.link-box code {
  flex: 1;
  background: var(--bg);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--muted);
  word-break: break-all;
}
.copy-btn { padding: 8px 16px; font-size: 0.8rem; flex-shrink: 0; }

.rename-box {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  align-items: center;
  border-bottom: 1px solid var(--rule);
}
.rename-box input {
  flex: 1;
  min-width: 0;
}
.ext-suffix {
  color: var(--muted);
  font-size: 0.85rem;
  font-family: 'JetBrains Mono', monospace;
}
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }

.panel-actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .link-panel {
    max-width: 100%;
    border-radius: 0;
  }
  .preview {
    max-height: 200px;
    padding: 16px;
  }
  .panel-actions {
    padding: 12px;
    gap: 6px;
  }
  .panel-actions button {
    padding: 6px 10px;
    font-size: 0.78rem;
  }
  .link-box {
    padding: 10px 12px;
  }
  .info {
    padding: 12px;
  }
}
</style>
