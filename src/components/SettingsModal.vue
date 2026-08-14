<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const emit = defineEmits<{ close: []; saved: [] }>()

const { state, login, logout } = useAuth()
const { show } = useToast()

const tokenInput = ref(state.token)
const repoInput = ref(state.repo)
const saving = ref(false)

async function handleSave() {
  if (!tokenInput.value.trim()) {
    show('请输入 Access Token')
    return
  }
  saving.value = true
  try {
    const result = await login(tokenInput.value.trim(), repoInput.value.trim())
    show(result.created ? `仓库 ${result.repo} 已创建` : '验证成功')
    emit('saved')
    emit('close')
  } catch (e: any) {
    show(e.message || '验证失败，请检查 Token')
  } finally {
    saving.value = false
  }
}

function handleLogout() {
  logout()
  tokenInput.value = ''
  repoInput.value = ''
  show('已退出登录')
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>设置</h2>

      <div v-if="state.user" class="user-info">
        <div class="avatar">{{ state.user.name.charAt(0).toUpperCase() }}</div>
        <div>
          <div class="username">{{ state.user.name }}</div>
          <div class="repo-name">{{ state.repo }}</div>
        </div>
      </div>

      <div class="form-group">
        <label>Hugging Face Access Token</label>
        <input
          v-model="tokenInput"
          type="password"
          placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
          @keyup.enter="handleSave"
        />
        <p class="hint">
          在
          <a href="https://huggingface.co/settings/tokens" target="_blank">HF Settings</a>
          创建 Token，需要 Write 权限
        </p>
      </div>

      <div class="form-group">
        <label>Dataset 仓库</label>
        <input
          v-model="repoInput"
          type="text"
          placeholder="username/image-bed"
          @keyup.enter="handleSave"
        />
        <p class="hint">留空则自动使用 {用户名}/image-bed</p>
      </div>

      <div class="actions">
        <button v-if="state.user" class="btn-danger" @click="handleLogout">退出登录</button>
        <button class="btn-ghost" @click="$emit('close')">取消</button>
        <button class="btn-primary" :disabled="saving" @click="handleSave">
          {{ saving ? '验证中...' : '验证并保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg3);
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
}
.username { font-weight: 600; }
.repo-name { font-size: 0.8rem; color: var(--muted); }

.form-group { margin-bottom: 16px; }
label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--muted);
}
.hint {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 4px;
}
.hint a { color: var(--accent); }

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>
