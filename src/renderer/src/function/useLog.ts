// function/useLog.ts

import { ref } from 'vue'
import Papa from 'papaparse'
import { saveAs } from 'file-saver'

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
  qslSentDate?: string // QSL发送日期（可选）
  qslReceivedDate?: string // QSL接收日期（可选）
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

// 创建一个防抖函数
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// 确保对象可以被序列化
function ensureSerializable(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => ensureSerializable(item))
  }

  // 处理普通对象
  const result: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // 只包含可序列化的属性
      const value = obj[key]
      if (value === null || value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean') {
        result[key] = value
      } else if (typeof value === 'object') {
        // 递归处理嵌套对象
        result[key] = ensureSerializable(value)
      }
    }
  }
  return result
}

// 日志管理
export function useLog() {
  const logDir = ref('')
  const logs = ref<LogEntry[]>([])
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  // 优化的防抖保存函数 - 完全非阻塞模式
  const debouncedSave = debounce((saveData: LogData) => {
    if (isSaving.value) return

    isSaving.value = true

    // 直接使用异步函数，避免Promise.resolve().then()的嵌套
    async function saveDataAsync() {
      try {
        console.log('[useLog] 开始保存日志数据，条目数:', saveData.logs.length)

        // 确保日志数据可以被序列化
        const serializableData = ensureSerializable(saveData)

        // 发送到主进程但不等待完成，实现真正的非阻塞
        window.electronAPI.logWrite(serializableData).then((result: any) => {
          console.log('[useLog] 日志写入结果:', result?.success ? '成功' : '失败')
        }).catch(err => {
          console.error('[useLog] 日志保存失败:', err)
          error.value = err instanceof Error ? err.message : '保存日志失败'
        })
      } catch (err) {
        console.error('[useLog] 准备保存日志时出错:', err)
      } finally {
        // 立即释放状态锁，不使用setTimeout延迟
        isSaving.value = false
      }
    }

    saveDataAsync()
  }, 300)

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
          // 按日期时间倒序排列，最新的在最前面
          logs.value = logData.logs.sort((a: any, b: any) => {
            // 如果datetime字段存在，则按datetime排序
            if (a.datetime && b.datetime) {
              return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
            }
            // 如果没有datetime字段，则按其他方式排序
            return 0
          })
        }
        // 如果数据本身就是数组
        else if (Array.isArray(logData)) {
          // 按日期时间倒序排列，最新的在最前面
          logs.value = logData.sort((a: any, b: any) => {
            // 如果datetime字段存在，则按datetime排序
            if (a.datetime && b.datetime) {
              return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
            }
            // 如果没有datetime字段，则按其他方式排序
            return 0
          })
        }
        // 其他情况，设置为空数组
        else {
          logs.value = []
        }
      } else {
        logs.value = []
      }
    } catch (error) {
      console.error('加载日志数据失败:', error)
      logs.value = []
    }
  }

  // 保存日志
  async function save(entry: LogEntry) {
    try {
      // 将新条目添加到logs数组的开头，而不是结尾
      logs.value.unshift(entry)

      // 构建包含logs数组的对象
      const logData = {
        logs: logs.value,
        statistics: {
          totalContacts: logs.value.length,
          lastContact: logs.value.length > 0 ? logs.value[0].datetime : ''
        }
      }

      // 异步保存，不等待完成
      debouncedSave(logData)

      console.log('日志条目保存请求已发送:', entry)
    } catch (err) {
      console.error('保存日志条目失败:', err)
      // 如果发生错误，从logs数组中移除刚添加的条目
      logs.value.shift()
      error.value = err instanceof Error ? err.message : '保存日志失败'
    }
  }

  // 删除日志
  async function deleteLogEntry(id: string) {
    try {
      const index = logs.value.findIndex(entry => entry.id === id)
      if (index !== -1) {
        logs.value.splice(index, 1)

        // 构建新的日志数据对象
        const logData = {
          logs: logs.value,
          statistics: {
            totalContacts: logs.value.length,
            lastContact: logs.value.length > 0 ? logs.value[logs.value.length - 1].datetime : ''
          }
        }

        // 异步保存，不等待完成
        debouncedSave(logData)
      }
    } catch (err) {
      console.error('删除日志条目失败:', err)
      error.value = err instanceof Error ? err.message : '删除日志失败'
    }
  }

  // 导出日志为CSV
  async function exportToCsv() {
    try {
      // 调用主进程API获取日志数据
      const result = await window.electronAPI.logExportToCsv() as unknown as { success: boolean; error?: string; data?: any[] }

      if (!result.success) {
        console.error('导出失败:', result.error)
        return { success: false, error: result.error }
      }

      // 获取日志数据
      const logData = result.data

      // 检查是否有数据
      if (!logData || logData.length === 0) {
        console.warn('没有日志数据可导出')
        return { success: false, error: '没有日志数据可导出' }
      }

      // 转换数据为CSV格式，使用实际数据字段
      const csvData = logData.map((log: any) => {
        // 分割datetime为date和time
        let date = ''
        let time = ''
        if (log.datetime) {
          const parts = log.datetime.split(' ')
          date = parts[0] || ''
          time = parts[1] || ''
        }

        // 分割qsl为qsl_sent和qsl_received
        let qsl_sent = '未发送'
        let qsl_received = '未接收'
        if (log.qsl) {
          const qslParts = log.qsl.split('/')
          qsl_sent = qslParts[0] || '未发送'
          qsl_received = qslParts[1] || '未接收'
        }

        return {
          '日期': date,
          '时间': time,
          '呼号': log.call || '',
          '模式': log.mode || '',
          '频率(MHz)': log.freq || '',
          '发送信号报告': log.rstS || '',
          '接收信号报告': log.rstR || '',
          '功率(W)': log.power || '',
          '通联内容': log.message || '',
          'QSL发送状态': qsl_sent,
          'QSL接收状态': qsl_received,
          'QSL卡片QTH': log.qth || ''
        }
      })

      // 使用Papa Parse转换为CSV
      const csv = Papa.unparse(csvData, {
        quotes: true, // 所有字段都加引号
        delimiter: ',', // 使用逗号作为分隔符
        header: true // 包含标题行
      })

      // 生成文件名（包含时间戳）
      const now = new Date()
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
      const fileName = `ham_log_${timestamp}.csv`

      // 使用file-saver保存文件
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }) // 添加BOM以支持中文
      saveAs(blob, fileName)

      console.log('CSV导出成功:', fileName)
      return { success: true, fileName }
    } catch (error) {
      console.error('导出CSV时出错:', error)
      return { success: false, error: '导出CSV时出错' }
    }
  }

  // 首次加载
  load()

  return {
    logDir,
    logs,
    save,
    deleteLogEntry,
    exportToCsv,
    isSaving,
    error
  }
}
