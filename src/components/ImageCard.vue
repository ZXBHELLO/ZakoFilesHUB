<script setup lang="ts">
import type { HfFile } from '../api/types'
import { formatSize, isImageFile, getFileDisplayIcon } from '../utils/file'
import { toProxyUrl } from '../utils/url'

const props = defineProps<{
  file: HfFile
  selected: boolean
  index: number
  selectMode: boolean
  dragging?: boolean
}>()

const emit = defineEmits<{
  click: [path: string]
  dragSelectStart: [path: string]
}>()
</script>

<template>
  <div
    class="card"
    :class="{ selected, 'select-mode': selectMode, 'drag-active': dragging }"
    :style="{ animationDelay: Math.min(index * 30, 300) + 'ms' }"
    @click="!selectMode && emit('click', file.path)"
    @mouseenter="selectMode && dragging && emit('dragSelectStart', file.path)"
  >
    <div class="thumb">
      <img
        v-if="isImageFile(file.path)"
        :src="toProxyUrl(file.url)"
        :alt="file.name"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <div v-else class="file-icon">{{ getFileDisplayIcon(file.path) }}</div>
      <div v-if="selectMode" class="select-overlay" :class="{ checked: selected }">
        <div class="select-check">
          <svg v-if="selected" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    </div>
    <div class="meta">
      <span class="name" :title="file.name">{{ file.name }}</span>
      <span class="size">{{ formatSize(file.size) }}</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg2);
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s var(--ease), transform 0.15s var(--ease);
  animation: card-in 0.4s var(--ease-out) both;
  position: relative;
}
.card:hover {
  border-color: var(--rule);
  transform: translateY(-2px);
}
.card:active { transform: scale(0.97); }
.card.selected { border-color: var(--accent); }
.card.drag-active { border-color: var(--accent); }

.thumb {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
  transition: transform 0.3s var(--ease-out);
}
.card:hover .thumb img { transform: scale(1.08); }

.file-icon {
  font-size: 2.5rem;
  opacity: 0.6;
}

.select-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid rgba(255,255,255,0.7);
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.select-overlay.checked {
  background: var(--accent);
  border-color: var(--accent);
}

.meta {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name {
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
}
.size {
  font-size: 0.72rem;
  color: var(--muted);
}
</style>
