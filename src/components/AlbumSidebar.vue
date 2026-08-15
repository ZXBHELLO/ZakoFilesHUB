/**
 * 文件夹侧边栏组件
 *
 * 显示文件夹列表，支持：
 * - 切换当前文件夹
 * - 创建新文件夹
 * - 删除文件夹（含确认）
 *
 * 移动端：侧边栏变为抽屉式，通过 props.open 控制显隐
 * 触摸设备：删除按钮始终可见（无 hover 状态）
 */
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useImages } from '../composables/useImages'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ openSettings: []; openInfo: []; openTutorial: []; select: [] }>()

const { state, albums, setAlbum, createNewFolder, deleteFolder } = useImages()
const { state: authState } = useAuth()
const { show } = useToast()

/**
 * 各文件夹的文件数量统计
 * 统一过滤 .gitkeep 和隐藏文件，避免重复逻辑
 */
const visibleFiles = computed(() =>
  state.files.filter(f =>
    !f.path.endsWith('.gitkeep') &&
    (state.showHidden || !f.name.startsWith('.'))
  )
)

const albumCounts = computed(() => {
  const counts: Record<string, number> = {}
  visibleFiles.value.forEach(f => {
    counts[f.album] = (counts[f.album] || 0) + 1
  })
  return counts
})

const totalCount = computed(() => visibleFiles.value.length)

const showNewFolderInput = ref(false)
const newFolderName = ref('')
const creating = ref(false)
const deletingFolder = ref<string | null>(null)
const deleting = ref(false)

/** 选择文件夹并通知父组件关闭抽屉 */
function selectAlbum(album: string) {
  setAlbum(album)
  emit('select')
}

/** 创建新文件夹，验证名称不能为空且不含 / */
async function handleCreateFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    show('请输入文件夹名称')
    return
  }
  if (name.includes('/')) {
    show('文件夹名称不能包含 /')
    return
  }
  creating.value = true
  try {
    await createNewFolder(name, authState.token, authState.repo, authState.repoType, authState.useMirror)
    show('文件夹已创建')
    showNewFolderInput.value = false
    newFolderName.value = ''
  } catch (e: any) {
    show(e.message || '创建文件夹失败')
  } finally {
    creating.value = false
  }
}

/** 显示删除确认 */
function confirmDelete(album: string) {
  deletingFolder.value = album
}

/** 取消删除 */
function cancelDelete() {
  deletingFolder.value = null
}

/** 执行删除文件夹 */
async function handleDeleteFolder(album: string) {
  deleting.value = true
  try {
    await deleteFolder(album, authState.token, authState.repo, authState.repoType, authState.useMirror)
    show(`已删除文件夹 "${album}" 及其中所有文件`)
    deletingFolder.value = null
  } catch (e: any) {
    show(e.message || '删除文件夹失败')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <aside class="sidebar" :class="{ open }">
    <div class="sidebar-header">
      <span class="logo">Zako Files HUB</span>
    </div>

    <div class="album-list">
      <div class="album-section">
        <span>文件夹</span>
        <button
          v-if="!showNewFolderInput"
          class="add-folder-btn"
          title="新建文件夹"
          @click="showNewFolderInput = true"
        >+</button>
      </div>

      <Transition name="fade">
        <div v-if="showNewFolderInput" class="new-folder-box">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="文件夹名称"
            @keyup.enter="handleCreateFolder"
          />
          <div class="new-folder-actions">
            <button class="btn-primary btn-sm" :disabled="creating" @click="handleCreateFolder">
              {{ creating ? '...' : '创建' }}
            </button>
            <button class="btn-ghost btn-sm" @click="showNewFolderInput = false; newFolderName = ''">取消</button>
          </div>
        </div>
      </Transition>

      <div
        v-for="album in albums"
        :key="album"
        class="album-row"
      >
        <button
          class="album-item"
          :class="{ active: state.currentAlbum === album }"
          @click="selectAlbum(album)"
        >
          <span class="album-icon">{{ album === '/' ? '🏠' : '📁' }}</span>
          <span class="album-name">{{ album === '/' ? '全部文件' : album }}</span>
          <span class="album-count">
            {{ album === '/' ? totalCount : (albumCounts[album] || 0) }}
          </span>
        </button>
        <button
          v-if="album !== '/' && deletingFolder !== album"
          class="album-delete-btn"
          title="删除文件夹"
          @click.stop="confirmDelete(album)"
        >✕</button>
        <div v-if="deletingFolder === album" class="album-confirm">
          <div class="confirm-warning">
            <span class="confirm-icon">⚠</span>
            <span class="confirm-text">将删除文件夹 "{{ album }}" 及其中所有文件，此操作不可撤销</span>
          </div>
          <div class="confirm-actions">
            <button class="confirm-yes" :disabled="deleting" @click.stop="handleDeleteFolder(album)">
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
            <button class="confirm-no" @click.stop="cancelDelete">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="btn-ghost footer-btn" @click="$emit('openInfo')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>项目信息</span>
      </button>
      <button class="btn-ghost footer-btn" @click="$emit('openTutorial')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <span>使用教程</span>
      </button>
      <button class="btn-ghost footer-btn" @click="$emit('openSettings')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>系统设置</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* 侧边栏容器：桌面端固定定位，移动端抽屉式 */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg2);
  border-right: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}

.sidebar-header {
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top, 0px));
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  padding: 8px 12px 4px;
  font-weight: 600;
}
.add-folder-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 1.2rem;
  padding: 4px 8px;
  line-height: 1;
  min-height: 32px;
  min-width: 32px;
}
.add-folder-btn:hover { color: var(--accent); }

.new-folder-box {
  padding: 8px 12px;
}
.new-folder-box input {
  font-size: 0.82rem;
  margin-bottom: 6px;
}
.new-folder-actions {
  display: flex;
  gap: 6px;
}

/* 文件夹按钮：满足 44px 最小触摸目标 */
.album-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: transparent;
  color: var(--ink);
  border: none;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 2px;
  min-height: 44px;
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
  transition: opacity 0.15s;
}
.album-item.active .album-count {
  background: var(--accent);
  color: #fff;
}

.album-row {
  position: relative;
  margin-bottom: 2px;
}

/* 删除按钮：触摸设备始终可见，桌面端 hover 显示 */
.album-delete-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg2);
  border: none;
  color: var(--muted);
  font-size: 0.7rem;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  min-height: 32px;
  min-width: 32px;
  z-index: 1;
  transition: opacity 0.15s, color 0.15s;
}

/* 桌面端：hover 时显示删除按钮，隐藏计数器 */
@media (hover: hover) {
  .album-delete-btn { opacity: 0; }
  .album-row:hover .album-delete-btn { opacity: 1; }
  .album-row:hover .album-count { opacity: 0; }
}
/* 触摸设备：删除按钮始终半透明可见 */
@media (hover: none) {
  .album-delete-btn { opacity: 0.5; }
}
.album-delete-btn:hover { color: var(--danger); }

/* 删除确认操作栏 */
.album-confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  font-size: 0.78rem;
  min-height: 44px;
}
.confirm-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.confirm-icon { color: var(--danger); flex-shrink: 0; }
.confirm-text { color: var(--danger); flex: 1; line-height: 1.4; }
.confirm-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.confirm-yes {
  background: var(--danger);
  color: #fff;
  padding: 6px 14px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  min-height: 32px;
}
.confirm-no {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
  padding: 6px 14px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  min-height: 32px;
}

.sidebar-footer {
  padding: 8px;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.footer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 0.85rem;
  min-height: 40px;
}
.footer-btn svg {
  flex-shrink: 0;
  color: var(--muted);
  transition: color 0.15s;
}
.footer-btn:hover svg {
  color: var(--accent);
}
.btn-sm { padding: 6px 12px; font-size: 0.78rem; min-height: 36px; }

/* 移动端：侧边栏变为抽屉式，通过 transform 滑入滑出 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s var(--ease-out);
  }
  .sidebar.open {
    transform: translateX(0);
  }
}
</style>
