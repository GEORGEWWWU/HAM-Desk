// function/exportUtils.ts

import Papa from 'papaparse'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// 将JSON数据转换为CSV格式
export function jsonToCsv(jsonData: any): string {
  if (!jsonData || typeof jsonData !== 'object') {
    return ''
  }

  // 如果是数组，直接转换
  if (Array.isArray(jsonData)) {
    return Papa.unparse(jsonData)
  }

  // 如果是对象，尝试获取数组字段
  const arrayFields = Object.keys(jsonData).filter(key =>
    Array.isArray(jsonData[key])
  )

  // 如果有数组字段，转换第一个数组字段
  if (arrayFields.length > 0) {
    const firstArrayField = arrayFields[0]
    return Papa.unparse(jsonData[firstArrayField])
  }

  // 如果没有数组字段，将对象转换为单行数据
  return Papa.unparse([jsonData])
}

// 将复杂JSON数据扁平化为适合CSV的格式
function flattenJson(data: any, parentKey = ''): Record<string, any> {
  if (!data || typeof data !== 'object') {
    return { [parentKey]: data }
  }

  const result: Record<string, any> = {}

  // 遍历对象的每个属性
  for (const key in data) {
    const newKey = parentKey ? `${parentKey}.${key}` : key

    if (Array.isArray(data[key])) {
      // 处理数组
      if (data[key].length === 0) {
        result[newKey] = ''
      } else if (typeof data[key][0] === 'object') {
        // 如果数组元素是对象，将其转换为JSON字符串
        result[newKey] = JSON.stringify(data[key])
      } else {
        // 如果数组元素是基本类型，用逗号连接
        result[newKey] = data[key].join(', ')
      }
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      // 递归处理嵌套对象
      const flattened = flattenJson(data[key], newKey)
      Object.assign(result, flattened)
    } else {
      // 基本类型直接赋值
      result[newKey] = data[key]
    }
  }

  return result
}

// 将复杂JSON数据转换为CSV格式
export function complexJsonToCsv(jsonData: any): string {
  if (!jsonData || typeof jsonData !== 'object') {
    return ''
  }

  // 如果是数组，将每个元素扁平化
  if (Array.isArray(jsonData)) {
    const flattenedData = jsonData.map(item => flattenJson(item))
    return Papa.unparse(flattenedData)
  }

  // 如果是对象，尝试获取数组字段
  const arrayFields = Object.keys(jsonData).filter(key =>
    Array.isArray(jsonData[key])
  )

  // 如果有数组字段，转换第一个数组字段
  if (arrayFields.length > 0) {
    const firstArrayField = arrayFields[0]
    const arrayData = jsonData[firstArrayField]
    const flattenedData = Array.isArray(arrayData)
      ? arrayData.map(item => flattenJson(item))
      : [flattenJson(arrayData)]
    return Papa.unparse(flattenedData)
  }

  // 如果没有数组字段，将对象扁平化后转换为单行数据
  const flattenedData = flattenJson(jsonData)
  return Papa.unparse([flattenedData])
}

/**
 * 导出数据为CSV压缩包
 * @param jsonData 包含所有JSON数据的对象，键为文件名，值为JSON数据
 * @param zipFileName 压缩包文件名（不包含扩展名）
 */
export async function exportDataToZip(jsonData: Record<string, any>, zipFileName?: string): Promise<void> {
  try {
    // 创建新的JSZip实例
    const zip = new JSZip()

    // 获取当前日期时间作为文件名
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const finalZipFileName = zipFileName || `data-export-${timestamp}`

    // 将每个JSON文件转换为CSV并添加到压缩包
    for (const [fileName, data] of Object.entries(jsonData)) {
      try {
        const csvData = complexJsonToCsv(data)
        // 将文件名从.json改为.csv
        const csvFileName = fileName.replace('.json', '.csv')
        zip.file(csvFileName, csvData)
      } catch (error) {
        console.error(`Error converting ${fileName} to CSV:`, error)
      }
    }

    // 生成压缩包并保存
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${finalZipFileName}.zip`)
  } catch (error) {
    console.error('Error exporting data to ZIP:', error)
    throw error
  }
}

// 获取当前日期时间字符串，用于文件命名
export function getCurrentTimestamp(): string {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}
