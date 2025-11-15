// function/useDevice.ts

import { ref, computed } from 'vue'

export interface Device {
  id: number
  deviceName: string
  deviceType: string
}

export interface DeviceData {
  deviceList: Device[]
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

  // 注意：useDevice不再监听自身的事件，避免循环触发
  // 只有其他组件需要响应设备数据变更时才监听事件

  // 直接加载设备数据（像useCallsign一样）
  const loadDevices = async (): Promise<void> => {
    isLoading.value = true
    error.value = null

    try {
      // 直接使用Electron API，不检查环境
      const data = await window.electronAPI.deviceRead()
      devices.value = data.deviceList || []
    } catch (err) {
      console.error('加载设备数据失败:', err)
      error.value = err instanceof Error ? err.message : '加载设备数据失败'
      devices.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 保存设备数据
  const saveDevices = async (): Promise<boolean> => {
    if (isSaving.value) {
      console.warn('保存正在进行中，请勿重复操作')
      return false
    }

    isSaving.value = true
    try {
      const plainDevices = JSON.parse(JSON.stringify(devices.value))
      const result = await window.electronAPI.deviceWrite({ deviceList: plainDevices })
      return result?.success ?? false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存设备数据失败'
      return false
    } finally {
      isSaving.value = false
    }
  }

  // 添加设备
  const addDevice = async (deviceName: string, deviceType: string): Promise<void> => {
    try {
      console.log('开始添加设备:', deviceName, deviceType)
      const newDevice: Device = {
        id: Date.now(), // 使用时间戳作为ID
        deviceName,
        deviceType
      }

      console.log('新设备对象:', newDevice)
      console.log('当前设备列表长度:', devices.value.length)
      devices.value.push(newDevice)
      console.log('添加后设备列表长度:', devices.value.length)
      console.log('设备列表内容:', devices.value)

      const saved = await saveDevices()
      console.log('保存结果:', saved)
      if (!saved) {
        // 如果保存失败，回滚操作
        devices.value.pop()
        throw new Error('保存设备数据失败')
      }
      console.log('设备已添加并保存:', newDevice)
    } catch (err) {
      console.error('添加设备失败:', err)
      error.value = err instanceof Error ? err.message : '添加设备失败'
      throw err
    }
  }

  // 删除设备
  const deleteDevice = async (deviceId: number): Promise<void> => {
    console.log('deleteDevice开始执行，设备ID:', deviceId)
    const startTime = Date.now()

    try {
      const index = devices.value.findIndex(device => device.id === deviceId)
      console.log('找到设备索引:', index)
      if (index === -1) {
        throw new Error('设备不存在')
      }

      const deletedDevice = devices.value.splice(index, 1)[0]
      console.log('设备已从数组中移除:', deletedDevice)
      console.log('当前设备数组长度:', devices.value.length)

      console.log('开始保存设备数据...')
      const saved = await saveDevices()
      console.log('设备数据保存结果:', saved)

      if (!saved) {
        // 如果保存失败，回滚操作
        console.log('保存失败，回滚操作')
        devices.value.splice(index, 0, deletedDevice)
        throw new Error('保存设备数据失败')
      }

      // 添加一个小延迟，让UI有时间更新
      await new Promise(resolve => setTimeout(resolve, 100))

      const endTime = Date.now()
      console.log(`设备已删除并保存完成，总耗时: ${endTime - startTime}ms`)
    } catch (err) {
      console.error('deleteDevice执行失败:', err)
      error.value = err instanceof Error ? err.message : '删除设备失败'
      throw err
    }
  }

  // 编辑设备
  const editDevice = async (deviceId: number, deviceName: string, deviceType: string): Promise<void> => {
    try {
      const device = devices.value.find(device => device.id === deviceId)
      if (!device) {
        throw new Error('设备不存在')
      }

      // 保存原始数据以便回滚
      const originalDevice = { ...device }

      device.deviceName = deviceName
      device.deviceType = deviceType

      const saved = await saveDevices()
      if (!saved) {
        // 如果保存失败，回滚操作
        Object.assign(device, originalDevice)
        throw new Error('保存设备数据失败')
      }
      console.log('设备已更新并保存:', device)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '编辑设备失败'
      throw err
    }
  }

  // 获取设备类型名称
  const getDeviceTypeName = (typeValue: string): string => {
    const typeMap: Record<string, string> = {
      '1': '手持台',
      '2': '车载台',
      '3': '基地台',
      '4': '中继台',
      '5': '其他'
    }
    return typeMap[typeValue] || typeValue
  }

  return {
    devices,
    isLoading,
    error,
    loadDevices,
    saveDevices,
    addDevice,
    deleteDevice,
    editDevice,
    getDeviceTypeName,
    deviceCount: computed(() => devices.value.length)
  }
}
