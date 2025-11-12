import { ref } from 'vue'

const STORAGE_KEY = 'ham_last_location'

/** 通过主进程拿定位，不走渲染网络 */
async function ipLocate(): Promise<string> {
  return await window.ipcRenderer.invoke('ip-geo')
}

export function useLocation() {
  const enabled = ref(false)
  const locationText = ref('未启用位置服务')

  const cachedEnabled = localStorage.getItem('ham_location_enabled')
  if (cachedEnabled === 'true') {
    enabled.value = true
    locationText.value = '定位中…'
    ipLocate().then(txt => {
      locationText.value = txt
      localStorage.setItem(STORAGE_KEY, txt)
    })
  }

  const toggleLocation = async (on: boolean) => {
    enabled.value = on
    localStorage.setItem('ham_location_enabled', String(on))
    if (!on) {
      locationText.value = '未启用位置服务'
      return
    }
    locationText.value = '定位中…'
    const txt = await ipLocate()
    locationText.value = txt
    localStorage.setItem(STORAGE_KEY, txt)
  }

  return { enabled, locationText, toggleLocation }
}
