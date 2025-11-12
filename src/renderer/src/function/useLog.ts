import { ref } from 'vue'

// 日志条目类型
export interface LogEntry {
  datetime: string
  call: string
  freq: string
  mode: string
  rstS: string
  rstR: string
  remark?: string
}

export function useLog() {
  const logDir = ref('')
  const logs = ref<LogEntry[]>([])

  // 初始加载
  async function load() {
    logDir.value = await window.electronAPI.logGetDir()
    logs.value = await window.electronAPI.logRead()
  }

  // 保存一条
  async function save(entry: LogEntry) {
    logs.value.push(entry)
    await window.electronAPI.logWrite(logs.value)
  }

  // 更改目录
  async function changeDir() {
    const dir = await window.electronAPI.logSelectDir()
    if (dir) {
      await window.electronAPI.logSetDir(dir)
      logDir.value = dir
      logs.value = await window.electronAPI.logRead()
    }
  }

  // 恢复默认
  async function resetDir() {
    logDir.value = await window.electronAPI.logResetDir()
    logs.value = await window.electronAPI.logRead()
  }

  // 首次加载
  load()

  return { logDir, logs, save, changeDir, resetDir }
}
