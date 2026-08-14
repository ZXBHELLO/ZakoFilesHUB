<script setup lang="ts">
import type { HfFile } from '../api/types'
import { formatSize } from '../utils/file'

defineProps<{
  file: HfFile
  selected: boolean
}>()

const emit = defineEmits<{
  click: [path: string]
  toggleSelect: [path: string]
}>()
</script>

<template>
  <div
    class="card"
    :class="{ selected }"
    @click="emit('click', file.path)"
  >
    <div class="thumb">
      <img :src="file.url" :alt="file.name" loading="lazy" />
      <div class="overlay">
        <button
          class="select-btn"
          :class="{ checked: selected }"
          @click.stop="emit('toggleSelect', file.path)"
        >
          <svg v-if="selected" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
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
  transition: border-color 0.15s, transform 0.1s;
}
.card:hover { border-color: var(--rule); }
.card.selected { border-color: var(--accent); }

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
  transition: transform 0.2s;
}
.card:hover .thumb img { transform: scale(1.05); }

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%);
  opacity: 0;
  transition: opacity 0.15s;
}
.card:hover .overlay { opacity: 1; }
.card.selected .overlay { opacity: 1; }

.select-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 2px solid rgba(255,255,255,0.8);
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.select-btn.checked {
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
