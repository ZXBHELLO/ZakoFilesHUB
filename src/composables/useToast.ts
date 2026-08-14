import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout>

export function useToast() {
  function show(msg: string, duration = 2500) {
    message.value = msg
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, duration)
  }

  function hide() {
    visible.value = false
  }

  return { message, visible, show, hide }
}
