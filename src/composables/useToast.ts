/**
 * Toast 提示 Composable
 *
 * 管理全局 Toast 消息的显示和自动隐藏。
 * 模块级单例，所有组件共享同一个 Toast 实例。
 */
import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  /** 显示提示消息，duration 毫秒后自动隐藏 */
  function show(msg: string, duration = 2500) {
    message.value = msg
    visible.value = true
    // 清除上一个定时器，避免消息被提前隐藏
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, duration)
  }

  /** 手动隐藏提示，同时清除定时器避免冗余触发 */
  function hide() {
    clearTimeout(timer)
    visible.value = false
  }

  return { message, visible, show, hide }
}
