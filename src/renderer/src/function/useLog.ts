import { ref } from 'vue'

// 日志条目类型
export interface LogEntry {
  id: string
  datetime: string
  call: string
  freq: string
  mode: string
  rstS: string
  rstR: string
  power: string
  device: string
  qth: string
  atn: string
  message: string
  qsl: string
  weather: string
  antenna: string
}

// 统计信息类型
export interface LogStatistics {
  totalContacts: number
  lastContact: string
}

// 日志数据类型
export interface LogData {
  logs: LogEntry[]
  statistics: LogStatistics
}

export function useLog() {
  const logDir = ref('')
  const logs = ref<LogEntry[]>([])

  // 加载日志数据
  const load = async () => {
    try {
      // 获取日志目录
      logDir.value = await window.electronAPI.logGetDir()
      
      // 从log.json文件加载数据
      const logData = await window.electronAPI.logRead()
      
      // 检查数据格式并提取logs数组
      if (logData && typeof logData === 'object') {
        // 如果数据是包含logs属性的对象
        if ('logs' in logData && Array.isArray(logData.logs)) {
          logs.value = logData.logs
        } 
        // 如果数据本身就是数组
        else if (Array.isArray(logData)) {
          logs.value = logData
        }
        // 其他情况，设置为空数组
        else {
          logs.value = []
        }
      } else {
        logs.value = []
      }
      
      console.log('日志数据加载完成:', logs.value)
    } catch (error) {
      console.error('加载日志数据失败:', error)
      logs.value = []
    }
  }

  // 保存一条（预留功能，暂时不实现）
  async function save(entry: LogEntry) {
    // 暂时不实现保存功能，只预留接口
    console.log('保存日志条目功能预留:', entry)
    // 以下是完整实现，暂时注释掉
    /*
    logs.value.push(entry)
    // 构建完整的LogData对象
    const logData: LogData = {
      logs: logs.value,
      statistics: {
        totalContacts: logs.value.length,
        lastContact: entry.datetime
      }
    }
    await window.electronAPI.logWrite(logData)
    */
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
