<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import type { RepoType } from '../api/types'

const emit = defineEmits<{ close: []; saved: [] }>()

const { state, login, logout } = useAuth()
const { show } = useToast()

const tokenInput = ref(state.token)
const repoInput = ref(state.repo)
const typeInput = ref<RepoType>(state.repoType)
const mirrorInput = ref(state.useMirror)
const rememberInput = ref(state.remember)
const saving = ref(false)
const errorMsg = ref('')
const wasAuthenticated = ref(!!state.user)

async function handleSave() {
  if (!tokenInput.value.trim()) {
    show('请输入 Access Token')
    return
  }
  saving.value = true
  errorMsg.value = ''
  try {
    const result = await login(tokenInput.value.trim(), repoInput.value.trim(), typeInput.value, mirrorInput.value, rememberInput.value)
    show(result.created ? `仓库 ${result.repo} 已创建` : '验证成功')
    emit('saved')
    emit('close')
  } catch (e: any) {
    errorMsg.value = e.message || '验证失败，请检查 Token'
    show(errorMsg.value)
  } finally {
    saving.value = false
  }
}

function handleLogout() {
  logout()
  tokenInput.value = ''
  repoInput.value = ''
  typeInput.value = 'dataset'
  mirrorInput.value = false
  rememberInput.value = false
  show('已退出登录')
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>设置</h2>

      <div v-if="wasAuthenticated && state.user" class="user-info">
        <div class="avatar">{{ state.user.name.charAt(0).toUpperCase() }}</div>
        <div>
          <div class="username">{{ state.user.name }}</div>
          <div class="repo-name">{{ state.repo }}</div>
        </div>
      </div>

      <div class="form-group">
        <label>Access Token</label>
        <input
          v-model="tokenInput"
          type="password"
          placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keyup.enter="handleSave"
        />
        <p class="hint">
          <a href="https://huggingface.co/settings/tokens" target="_blank">HF Settings</a> 创建，需 Write 权限
        </p>
      </div>

      <Transition name="fade">
        <div v-if="errorMsg" class="error-box">
          {{ errorMsg }}
        </div>
      </Transition>

      <div class="form-group">
        <label>仓库类型</label>
        <div class="type-selector">
          <button
            class="type-btn"
            :class="{ active: typeInput === 'dataset' }"
            @click="typeInput = 'dataset'"
          >Dataset</button>
          <button
            class="type-btn"
            :class="{ active: typeInput === 'model' }"
            @click="typeInput = 'model'"
          >Model</button>
        </div>
        <p class="hint">URL 含 <code>/datasets/</code> 选 Dataset，否则 Model</p>
      </div>

      <div class="form-group">
        <label>仓库名称</label>
        <input
          v-model="repoInput"
          type="text"
          placeholder="username/image-bed"
          @keyup.enter="handleSave"
        />
        <p class="hint">留空则用 {用户名}/image-bed</p>
      </div>

      <div class="form-group">
        <label>国内镜像加速</label>
        <div class="mirror-toggle">
          <label class="switch">
            <input type="checkbox" v-model="mirrorInput">
            <span class="slider round"></span>
          </label>
          <span class="mirror-status">{{ mirrorInput ? '已开启' : '未开启' }}</span>
        </div>
        <p class="hint">图片直链走 hf-mirror.com 加速</p>
      </div>

      <div class="form-group">
        <label class="checkbox-row">
          <input type="checkbox" v-model="rememberInput" class="checkbox-input">
          <span>记住配置（下次自动登录）</span>
        </label>
      </div>

      <div class="actions">
        <button v-if="wasAuthenticated" class="btn-danger" @click="handleLogout">退出登录</button>
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
.hint code {
  background: var(--bg3);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.75rem;
}

.type-selector {
  display: flex;
  gap: 0;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.type-btn {
  flex: 1;
  background: var(--bg);
  color: var(--muted);
  border: none;
  padding: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 0;
  transition: background 0.15s, color 0.15s;
}
.type-btn:hover { background: var(--bg3); }
.type-btn.active {
  background: var(--accent);
  color: #fff;
}

.mirror-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mirror-status {
  font-size: 0.82rem;
  color: var(--ink);
}
.switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg3);
  border: 1px solid var(--rule);
  transition: 0.2s var(--ease);
}
.slider:before {
  content: "";
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: var(--muted);
  transition: 0.2s var(--ease);
}
input:checked + .slider {
  background: var(--accent);
  border-color: var(--accent);
}
input:checked + .slider:before {
  transform: translateX(18px);
  background: #fff;
}
.slider.round {
  border-radius: 24px;
}
.slider.round:before {
  border-radius: 50%;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
  flex-wrap: wrap;
}

.error-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  margin-bottom: 16px;
  word-break: break-word;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 0;
}
.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}
</style>
