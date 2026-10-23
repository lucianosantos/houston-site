import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useGameFullscreen(target: Ref<HTMLElement | null>) {
  const active = ref(false)
  const supported = ref(false)
  const error = ref('')
  const update = () => { active.value = document.fullscreenElement === target.value }

  onMounted(() => {
    supported.value = Boolean(document.fullscreenEnabled && target.value?.requestFullscreen)
    document.addEventListener('fullscreenchange', update)
  })
  onBeforeUnmount(() => document.removeEventListener('fullscreenchange', update))

  async function toggle() {
    error.value = ''
    try {
      if (active.value) await document.exitFullscreen()
      else await target.value?.requestFullscreen()
    } catch {
      error.value = 'Fullscreen is unavailable. You can still play in the page.'
    }
  }
  return { active, supported, error, toggle }
}

