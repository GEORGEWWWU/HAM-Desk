import { ref } from 'vue'

const STORAGE_KEY = 'ham_last_location'

/** 通过主进程拿定位，不走渲染网络 */
async function ipLocate(): Promise<string> {
  return await window.ipcRenderer.invoke('ip-geo')
}

// 创建一个简单的事件发布订阅系统
type EventHandler = (...args: any[]) => void
const eventListeners: Record<string, EventHandler[]> = {}

export function on(event: string, handler: EventHandler) {
  if (!eventListeners[event]) {
    eventListeners[event] = []
  }
  eventListeners[event].push(handler)
}

export function off(event: string, handler: EventHandler) {
  if (eventListeners[event]) {
    const index = eventListeners[event].indexOf(handler)
    if (index > -1) {
      eventListeners[event].splice(index, 1)
    }
  }
}

function emit(event: string, ...args: any[]) {
  if (eventListeners[event]) {
    eventListeners[event].forEach(handler => {
      handler(...args)
    })
  }
}

// 全局状态
const enabled = ref(false)
const locationText = ref('未启用位置服务')

// 初始化定位状态
const initLocation = () => {
  const cachedEnabled = localStorage.getItem('ham_location_enabled')
  if (cachedEnabled === 'true') {
    enabled.value = true
    locationText.value = '定位中…'
    ipLocate().then(txt => {
      locationText.value = txt
      localStorage.setItem(STORAGE_KEY, txt)
      // 发出定位完成事件
      emit('location-updated', { enabled: true, text: txt })
    })
  }
}

// 初始化一次
initLocation()

// 位置服务管理
export function useLocation() {
  const toggleLocation = async (on: boolean) => {

    // 切换定位服务状态
    enabled.value = on
    localStorage.setItem('ham_location_enabled', String(on))

    if (!on) {
      locationText.value = '未启用位置服务'
      // 发出定位服务关闭事件
      emit('location-updated', { enabled: false, text: locationText.value })
      return
    }

    locationText.value = '定位中…'
    // 发出定位开始事件
    emit('location-updated', { enabled: true, text: locationText.value })

    const txt = await ipLocate()
    locationText.value = txt
    localStorage.setItem(STORAGE_KEY, txt)
    // 发出定位完成事件
    emit('location-updated', { enabled: true, text: txt })
  }

  return { enabled, locationText, toggleLocation }
}
