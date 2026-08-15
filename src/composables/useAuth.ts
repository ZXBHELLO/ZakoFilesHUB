/**
 * 认证状态管理 Composable
 *
 * 负责管理 Hugging Face 的登录令牌、仓库信息和用户会话。
 * 使用模块级 reactive 单例，所有组件共享同一份认证状态。
 * 当 remember=true 时，凭证持久化到 localStorage；否则仅存在于内存中。
 */
import { reactive, computed } from 'vue'
import { verifyToken, ensureRepo } from '../api/hub'
import type { HfUser, RepoType } from '../api/types'

// localStorage 键名常量
const TOKEN_KEY = 'hf_image_hub_token'
const REPO_KEY = 'hf_image_hub_repo'
const TYPE_KEY = 'hf_image_hub_type'
const MIRROR_KEY = 'hf_image_hub_mirror'
const REMEMBER_KEY = 'hf_image_hub_remember'

interface AuthState {
  token: string
  repo: string
  repoType: RepoType
  useMirror: boolean
  remember: boolean
  user: HfUser | null
  loading: boolean
  error: string
  restoring: boolean
}

// 读取"记住我"偏好：默认为 true，仅在显式设为 'false' 时关闭
const rememberEnabled = localStorage.getItem(REMEMBER_KEY) !== 'false'

// 模块级单例状态 —— 应用生命周期内共享
const state = reactive<AuthState>({
  token: rememberEnabled ? (localStorage.getItem(TOKEN_KEY) || '') : '',
  repo: rememberEnabled ? (localStorage.getItem(REPO_KEY) || '') : '',
  repoType: rememberEnabled ? ((localStorage.getItem(TYPE_KEY) as RepoType) || 'dataset') : 'dataset',
  useMirror: rememberEnabled ? localStorage.getItem(MIRROR_KEY) === 'true' : false,
  remember: rememberEnabled,
  user: null,
  loading: false,
  error: '',
  restoring: false,
})

export function useAuth() {
  // 已认证 = 同时拥有 token 和用户信息
  const isAuthenticated = computed(() => !!state.token && !!state.user)

  /**
   * 登录流程：验证 Token → 确保仓库存在 → 持久化状态
   * 任一步骤失败都会清除 user，避免出现"user 已设置但 token 为空"的不一致状态
   */
  async function login(token: string, repo: string, repoType: RepoType, useMirror: boolean, remember: boolean) {
    state.loading = true
    state.error = ''
    try {
      // 步骤1：验证 Token 有效性，获取用户信息
      state.user = await verifyToken(token)

      // 步骤2：如果未指定仓库名，使用默认命名规则 {username}/image-bed
      if (!repo) {
        repo = `${state.user.name}/image-bed`
      }

      // 步骤3：确保仓库存在（不存在则自动创建）
      const created = await ensureRepo(repo, token, repoType)

      // 步骤4：所有验证通过，写入状态
      state.token = token
      state.repo = repo
      state.repoType = repoType
      state.useMirror = useMirror
      state.remember = remember

      // 步骤5：根据"记住我"偏好持久化或清除 localStorage
      localStorage.setItem(REMEMBER_KEY, remember.toString())
      if (remember) {
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(REPO_KEY, repo)
        localStorage.setItem(TYPE_KEY, repoType)
        localStorage.setItem(MIRROR_KEY, useMirror.toString())
      } else {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REPO_KEY)
        localStorage.removeItem(TYPE_KEY)
        localStorage.removeItem(MIRROR_KEY)
      }
      return { created, repo }
    } catch (e: any) {
      // 关键：失败时清除 user，防止出现"user 已设置但 token 为空"的不一致状态
      state.user = null
      state.error = e.message || '验证失败'
      throw e
    } finally {
      state.loading = false
    }
  }

  /**
   * 恢复会话：应用刷新后从 localStorage 读取 token，向服务器验证有效性
   * 验证失败（token 过期/无效）时自动登出
   */
  async function restoreSession() {
    if (!state.token) return false
    state.restoring = true
    try {
      state.user = await verifyToken(state.token)
      return true
    } catch {
      // Token 已过期或无效，清除所有状态
      logout()
      return false
    } finally {
      state.restoring = false
    }
  }

  /** 登出：清除内存状态和 localStorage 持久化数据 */
  function logout() {
    state.token = ''
    state.repo = ''
    state.repoType = 'dataset'
    state.useMirror = false
    state.remember = false
    state.user = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REPO_KEY)
    localStorage.removeItem(TYPE_KEY)
    localStorage.removeItem(MIRROR_KEY)
    localStorage.removeItem(REMEMBER_KEY)
  }

  return {
    state,
    isAuthenticated,
    login,
    restoreSession,
    logout,
  }
}
