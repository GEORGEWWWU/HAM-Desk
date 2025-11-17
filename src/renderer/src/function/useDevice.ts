// function/useDevice.ts

import { ref, nextTick } from 'vue'

export interface Device {
  id: number
  deviceName: string
  deviceType: string
}

export interface DeviceData {
  deviceList: Device[]
}

// 创建一个防抖函数
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  }
}

// 创建全局事件总线
class DeviceEventBus {
  private listeners: Set<() => void> = new Set()

  emit() {
    this.listeners.forEach(listener => listener())
  }

  on(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export const deviceEventBus = new DeviceEventBus()

export function useDevice() {
  const devices = ref<Device[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isSaving = ref(false)

  // 优化的防抖保存函数 - 完全非阻塞模式
  const debouncedSave = debounce(() => {
    if (isSaving.value) return // 防止重复保存

    isSaving.value = true

    // 立即返回，不阻塞UI
    // 直接使用异步函数，避免Promise.resolve().then()的嵌套
    async function saveData() {
      try {
        // 确保数据是完全可序列化的普通JavaScript对象
        // 使用JSON序列化/反序列化来创建纯数据对象，避免任何不可序列化的引用
        const serializableDevices = JSON.parse(JSON.stringify(devices.value))

        // 发送到主进程但不等待完成，实现真正的非阻塞
        window.electronAPI.deviceWrite({ deviceList: serializableDevices }).then(result => {
          if (!result?.success) {
            console.error('[useDevice] 保存设备失败:', result?.error || '未知错误')
          }
        }).catch(err => {
          console.error('[useDevice] 设备数据保存失败:', err)
          error.value = err instanceof Error ? err.message : '保存设备数据失败'
        })
      } catch (err) {
        console.error('[useDevice] 准备保存数据时出错:', err)
        error.value = err instanceof Error ? err.message : '保存设备数据失败'
      } finally {
        // 立即释放保存状态，不使用setTimeout延迟
        isSaving.value = false
      }
    }

    saveData()
  }, 300) // 减少防抖延迟，提高响应速度

  // 直接加载设备数据
  const loadDevices = async (): Promise<void> => {
    if (isLoading.value) return // 防止重复加载

    isLoading.value = true
    error.value = null

    try {
      // 直接使用Electron API
      const data = await window.electronAPI.deviceRead()

      // 兼容两种数据格式
      if (Array.isArray(data)) {
        devices.value = data
      } else if (data && typeof data === 'object' && 'deviceList' in data) {
        devices.value = data.deviceList || []
      } else {
        devices.value = []
      }
    } catch (err) {
      console.error('[useDevice] 加载设备数据失败:', err)
      error.value = err instanceof Error ? err.message : '加载设备数据失败'
    } finally {
      isLoading.value = false
    }
  }

  // 添加新设备
  const addDevice = async (deviceName: string, deviceType: string): Promise<void> => {
    try {
      // 生成新ID
      const newId = devices.value.length > 0 ? Math.max(...devices.value.map(d => d.id)) + 1 : 1

      // 创建新设备对象
      const newDevice: Device = {
        id: newId,
        deviceName,
        deviceType
      }

      // 添加到设备列表
      devices.value.push(newDevice)

      // 使用nextTick确保DOM更新完成后再保存和通知
      await nextTick()

      // 触发保存（防抖）
      debouncedSave()

      // 触发事件总线通知
      deviceEventBus.emit()

      console.log('[useDevice] 设备添加成功:', newDevice)
    } catch (err) {
      console.error('[useDevice] 添加设备失败:', err)
      throw err
    }
  }

  // 删除设备
  const deleteDevice = async (id: number): Promise<void> => {
    try {
      // 查找设备索引
      const index = devices.value.findIndex(device => device.id === id)
      if (index === -1) {
        throw new Error('设备不存在')
      }

      // 删除设备
      devices.value.splice(index, 1)

      // 使用nextTick确保DOM更新完成后再保存和通知
      await nextTick()

      // 触发保存（防抖）
      debouncedSave()

      // 触发事件总线通知
      deviceEventBus.emit()

      console.log('[useDevice] 设备删除成功，ID:', id)
    } catch (err) {
      console.error('[useDevice] 删除设备失败:', err)
      throw err
    }
  }

  // 编辑设备
  const editDevice = async (id: number, deviceName: string, deviceType: string): Promise<void> => {
    try {
      // 查找设备
      const device = devices.value.find(device => device.id === id)
      if (!device) {
        throw new Error('设备不存在')
      }

      // 更新设备信息
      device.deviceName = deviceName
      device.deviceType = deviceType

      // 使用nextTick确保DOM更新完成后再保存和通知
      await nextTick()

      // 触发保存（防抖）
      debouncedSave()

      // 触发事件总线通知
      deviceEventBus.emit()

      console.log('[useDevice] 设备编辑成功，ID:', id)
    } catch (err) {
      console.error('[useDevice] 编辑设备失败:', err)
      throw err
    }
  }

  // 根据设备类型ID获取设备类型名称
  const getDeviceTypeName = (typeId: string): string => {
    const typeMap: Record<string, string> = {
      '1': '手持台',
      '2': '车载台',
      '3': '基地台',
      '4': '中继台',
      '5': '其他'
    }
    return typeMap[typeId] || '其他'
  }

  return {
    devices,
    isLoading,
    error,
    isSaving,
    loadDevices,
    addDevice,
    deleteDevice,
    editDevice,
    getDeviceTypeName
  }
}
