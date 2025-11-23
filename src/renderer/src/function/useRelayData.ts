// function/useRelayData.ts
import { ref } from 'vue'

// 中继台数据类型定义
export interface RelayData {
  序号: string
  中继名称: string
  带宽: string
  接收频率: string
  发送频率: string
  频差: string
  接收亚音?: string
  发射亚音?: string
  模式: string
  省份: string
  城市: string
}

// 解析后的中继台数据
export interface ParsedRelayData {
  mode: string
  name: string
  receiveFreq: string
  transmitFreq: string
  offset: string
  tone: string
  city: string
}

// 读取Excel文件
export const useRelayData = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdateDate = ref<string>('')

  // 解析亚音显示格式
  const parseTone = (receiveTone: string, transmitTone: string): string => {
    if (!receiveTone && !transmitTone) return '';

    if (receiveTone && transmitTone) {
      return `TSQ${transmitTone}`;
    } else if (transmitTone) {
      return `T${transmitTone}`;
    } else {
      return `R${receiveTone}`;
    }
  };

  // 解析Excel数据
  const parseExcelData = (data: RelayData[]): ParsedRelayData[] => {
    return data.map(item => {
      const receiveTone = String(item.接收亚音 ?? '').trim()
      const transmitTone = String(item.发射亚音 ?? '').trim()

      return {
        mode: item.模式 || '模拟',
        name: item.中继名称 || '',
        receiveFreq: String(item.接收频率 ?? ''),
        transmitFreq: String(item.发送频率 ?? ''),
        offset: String(item.频差 ?? ''),
        tone: parseTone(receiveTone, transmitTone),
        city: item.城市 || ''
      };
    }).filter(item => item.name && item.receiveFreq && item.transmitFreq);
  };

  // 读取Excel文件
  const loadRelayData = async (): Promise<ParsedRelayData[]> => {
    loading.value = true
    error.value = null

    try {

      // 通过主进程读取Excel文件
      if (!window.electronAPI || !window.electronAPI.readRelayExcel) {
        throw new Error('无法读取Excel文件，请检查Electron API是否可用')
      }

      const excelData = await window.electronAPI.readRelayExcel('全国UV段模拟中继（BD8FTD维护）.xlsx')

      if (!excelData || !excelData.success) {
        throw new Error(excelData?.error || '读取Excel文件失败')
      }

      // 直接使用返回的JSON数据，添加类型检查
      const jsonData: RelayData[] = excelData.data || []

      if (!jsonData || jsonData.length === 0) {
        throw new Error('Excel文件中没有数据')
      }

      // 解析数据
      const parsedData = parseExcelData(jsonData)
      lastUpdateDate.value = new Date().toISOString().split('T')[0]

      return parsedData

    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('加载中继数据失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // 根据城市筛选中继台数据
  const filterRelayByCity = (data: ParsedRelayData[], city: string): ParsedRelayData[] => {
    if (!city || city === '***') return []

    return data.filter(item => {
      if (!item.city) return false

      // 多种匹配方式：
      // 1. 直接包含城市名
      if (item.city.includes(city)) return true

      // 2. 如果城市字段包含逗号，检查城市部分
      if (item.city.includes(',')) {
        const parts = item.city.split(',')
        if (parts.length >= 2) {
          const cityPart = parts[1].trim()
          if (cityPart.includes(city)) return true
        }
      }

      // 3. 不区分大小写匹配
      if (item.city.toLowerCase().includes(city.toLowerCase())) return true

      return false
    })
  }

  // 手动重载数据
  const reloadData = async (): Promise<ParsedRelayData[]> => {
    // 直接重新加载数据，无需清除缓存
    return await loadRelayData()
  }

  return {
    loading,
    error,
    lastUpdateDate,
    loadRelayData,
    filterRelayByCity,
    reloadData
  }
}
