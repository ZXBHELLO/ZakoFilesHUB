import { reactive, computed } from 'vue'
import { verifyToken, ensureRepo } from '../api/hub'
import type { HfUser } from '../api/types'

const TOKEN_KEY = 'hf_image_hub_token'
const REPO_KEY = 'hf_image_hub_repo'

interface AuthState {
  token: string
  repo: string
  user: HfUser | null
  loading: boolean
  error: string
}

const state = reactive<AuthState>({
  token: localStorage.getItem(TOKEN_KEY) || '',
  repo: localStorage.getItem(REPO_KEY) || '',
  user: null,
  loading: false,
  error: '',
})

export function useAuth() {
  const isAuthenticated = computed(() => !!state.token && !!state.user)

  async function login(token: string, repo: string) {
    state.loading = true
    state.error = ''
    try {
      state.user = await verifyToken(token)
      if (!repo) {
        repo = `${state.user.name}/image-bed`
      }
      const created = await ensureRepo(repo, token)
      state.token = token
      state.repo = repo
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(REPO_KEY, repo)
      return { created, repo }
    } catch (e: any) {
      state.error = e.message || '验证失败'
      throw e
    } finally {
      state.loading = false
    }
  }

  async function restoreSession() {
    if (!state.token) return false
    try {
      state.user = await verifyToken(state.token)
      return true
    } catch {
      logout()
      return false
    }
  }

  function logout() {
    state.token = ''
    state.repo = ''
    state.user = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REPO_KEY)
  }

  return {
    state,
    isAuthenticated,
    login,
    restoreSession,
    logout,
  }
}
