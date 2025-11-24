// function/useVersion.ts
import { ref } from 'vue'

// 版本管理
export function useVersion() {
  const version = ref('')

  // 首次加载
  window.electronAPI.getAppVersion().then((v: string) => {
    version.value = v
  })

  return { version }
}
