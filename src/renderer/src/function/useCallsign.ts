// src/renderer/src/function/useCallsign.ts
import { ref } from 'vue'

// 校验调用符是否有效（呼号合法化）
export function isValidCallsign(v: string): boolean {
  return /^[A-Za-z0-9]{1,6}$/.test(v)
}

// 调用符管理
export function useCallsign() {
  const userCallSign = ref('')

  window.electronAPI.callsignRead().then(v => userCallSign.value = v)

  // 保存调用符
  const saveCallsign = async (val: string) => {
    if (!val) return
    if (!isValidCallsign(val)) return
    await window.electronAPI.callsignWrite(val)
    userCallSign.value = val
  }

  return { userCallSign, saveCallsign }
}
