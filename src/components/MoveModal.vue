<script setup lang="ts">
import { ref, computed } from 'vue'
import { useImages } from '../composables/useImages'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const props = defineProps<{
  fileCount: number
  singlePath?: string
}>()
const emit = defineEmits<{ close: []; moved: [] }>()

const { state, albums, batchMove, move, createNewFolder } = useImages()
const { state: authState } = useAuth()
const { show } = useToast()

const selectedFolder = ref('/')
const newFolderName = ref('')
const showNewFolderInput = ref(false)
const creatingFolder = ref(false)
const moving = ref(false)

// 过滤掉根目录，只显示用户创建的文件夹
const folderList = computed(() => albums.value.filter(a => a !== '/'))

function selectFolder(folder: string) {
  selectedFolder.value = folder
  showNewFolderInput.value = false
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
  creatingFolder.value = true
  try {
    await createNewFolder(name, authState.token, authState.repo, authState.repoType, authState.useMirror)
    selectedFolder.value = name
    showNewFolderInput.value = false
    newFolderName.value = ''
    show('文件夹已创建')
  } catch (e: any) {
    show(e.message || '创建文件夹失败')
  } finally {
    creatingFolder.value = false
  }
}

/** 执行移动操作：单个文件或批量移动 */
async function handleMove() {
  moving.value = true
  try {
    if (props.singlePath) {
      await move(props.singlePath, selectedFolder.value, authState.token, authState.repo, authState.repoType, authState.useMirror)
    } else {
      await batchMove(selectedFolder.value, authState.token, authState.repo, authState.repoType, authState.useMirror)
    }
    show(`已移动到 ${selectedFolder.value === '/' ? '根目录' : selectedFolder.value}`)
    emit('moved')
    emit('close')
  } catch (e: any) {
    show(e.message || '移动失败')
  } finally {
    moving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal move-modal">
      <h2>移动到文件夹</h2>
      <p class="move-desc">选择目标文件夹，将移动 {{ fileCount }} 个文件</p>

      <div class="folder-list">
        <button
          class="folder-item"
          :class="{ active: selectedFolder === '/' && !showNewFolderInput }"
          @click="selectFolder('/')"
        >
          <span class="folder-icon">🏠</span>
          <div class="folder-info">
            <span class="folder-name">根目录</span>
            <span class="folder-desc">不在任何文件夹内</span>
          </div>
        </button>
        <button
          v-for="album in folderList"
          :key="album"
          class="folder-item"
          :class="{ active: selectedFolder === album && !showNewFolderInput }"
          @click="selectFolder(album)"
        >
          <span class="folder-icon">📁</span>
          <span class="folder-name">{{ album }}</span>
        </button>
      </div>

      <div class="new-folder-section">
        <button
          v-if="!showNewFolderInput"
          class="btn-ghost new-folder-btn"
          @click="showNewFolderInput = true"
        >
          + 新建文件夹
        </button>
        <div v-else class="new-folder-input">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="文件夹名称"
            @keyup.enter="handleCreateFolder"
          />
          <button class="btn-primary btn-sm" :disabled="creatingFolder" @click="handleCreateFolder">
            {{ creatingFolder ? '...' : '创建' }}
          </button>
          <button class="btn-ghost btn-sm" @click="showNewFolderInput = false">取消</button>
        </div>
      </div>

      <div v-if="!showNewFolderInput" class="selected-hint">
        目标: {{ selectedFolder === '/' ? '🏠 根目录' : '📁 ' + selectedFolder }}
      </div>

      <div class="actions">
        <button class="btn-ghost" @click="$emit('close')">取消</button>
        <button class="btn-primary" :disabled="moving" @click="handleMove">
          {{ moving ? '移动中...' : '确认移动' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.move-modal {
  max-width: 420px;
}

.move-desc {
  font-size: 0.82rem;
  color: var(--muted);
  margin-bottom: 16px;
}

.folder-list {
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: transparent;
  color: var(--ink);
  border: 1px solid transparent;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 2px;
  min-height: 44px;
}
.folder-item:hover { background: var(--bg3); }
.folder-item.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.folder-icon { font-size: 0.9rem; }
.folder-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  overflow: hidden;
}
.folder-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-desc {
  font-size: 0.72rem;
  color: var(--muted);
  font-weight: 400;
}

.new-folder-section {
  margin-bottom: 12px;
}
.new-folder-btn {
  width: 100%;
  padding: 8px;
  font-size: 0.82rem;
}
.new-folder-input {
  display: flex;
  gap: 8px;
  align-items: center;
}
.new-folder-input input { flex: 1; }

.selected-hint {
  font-size: 0.8rem;
  color: var(--accent);
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
  flex-wrap: wrap;
}
.btn-sm { padding: 6px 12px; font-size: 0.8rem; }
</style>
