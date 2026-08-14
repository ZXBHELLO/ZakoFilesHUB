<script setup lang="ts">
import { computed } from 'vue'
import { useImages } from '../composables/useImages'

const emit = defineEmits<{ openSettings: [] }>()

const { state, albums, setAlbum } = useImages()

const albumCounts = computed(() => {
  const counts: Record<string, number> = {}
  state.files.forEach(f => {
    counts[f.album] = (counts[f.album] || 0) + 1
  })
  return counts
})

const totalCount = computed(() => state.files.length)
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="logo">HF Image Hub</span>
    </div>

    <div class="album-list">
      <div class="album-section">相册</div>
      <button
        v-for="album in albums"
        :key="album"
        class="album-item"
        :class="{ active: state.currentAlbum === album }"
        @click="setAlbum(album)"
      >
        <span class="album-icon">{{ album === '/' ? '🏠' : '📁' }}</span>
        <span class="album-name">{{ album === '/' ? '全部图片' : album }}</span>
        <span class="album-count">
          {{ album === '/' ? totalCount : (albumCounts[album] || 0) }}
        </span>
      </button>
    </div>

    <div class="sidebar-footer">
      <button class="btn-ghost settings-btn" @click="$emit('openSettings')">
        ⚙ 设置
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: var(--bg2);
  border-right: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--rule);
}
.logo {
  font-size: 1.1rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.album-list {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
}
.album-section {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  padding: 8px 12px 4px;
  font-weight: 600;
}

.album-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: transparent;
  color: var(--ink);
  border: none;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 2px;
}
.album-item:hover { background: var(--bg3); }
.album-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.album-icon { font-size: 0.9rem; }
.album-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.album-count {
  font-size: 0.75rem;
  color: var(--muted);
  background: var(--bg3);
  padding: 1px 7px;
  border-radius: 100px;
}
.album-item.active .album-count {
  background: var(--accent);
  color: #fff;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--rule);
}
.settings-btn { width: 100%; }
</style>
