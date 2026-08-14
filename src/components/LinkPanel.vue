<script setup lang="ts">
import { ref } from 'vue'
import type { HfFile, LinkFormat } from '../api/types'
import { buildLink } from '../utils/url'
import { copyToClipboard, formatSize } from '../utils/file'
import { useToast } from '../composables/useToast'

const props = defineProps<{ file: HfFile }>()
const emit = defineEmits<{ close: []; delete: [path: string] }>()

const { show } = useToast()
const activeFormat = ref<LinkFormat>('url')

const formats: { key: LinkFormat; label: string }[] = [
  { key: 'url', label: 'URL' },
  { key: 'markdown', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'bbcode', label: 'BBCode' },
]

function getLink(format: LinkFormat): string {
  return buildLink(format, props.file.url, props.file.name)
}

async function copyLink(format: LinkFormat) {
  const ok = await copyToClipboard(getLink(format))
  show(ok ? '已复制到剪贴板' : '复制失败')
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="link-panel">
      <div class="preview">
        <img :src="file.url" :alt="file.name" loading="lazy" />
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

      <div class="formats">
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

      <div class="link-box">
        <code>{{ getLink(activeFormat) }}</code>
        <button class="btn-primary copy-btn" @click="copyLink(activeFormat)">
          复制
        </button>
      </div>

      <div class="panel-actions">
        <button class="btn-danger" @click="$emit('delete', file.path)">
          删除图片
        </button>
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
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  word-break: break-all;
  color: var(--ink);
  border: 1px solid var(--rule);
}
.copy-btn { flex-shrink: 0; }

.panel-actions {
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px;
  justify-content: flex-end;
}
</style>
