<!--componenets/DeviceManage.vue-->
<template>
  <div class="app">
    <!--组件标题控件-->
    <div class="component_ctl">
      <div class="ctl_title">
        <h1>{{ componentTitle }}</h1>
      </div>
      <div class="ctl_btn">
        <button class="add_btn" @click="showAddDeviceForm">+ 添加设备</button>
        <button @click="closeModal">关闭</button>
      </div>
    </div>
    <!--设备列表-->
    <div class="device_list">
      <div class="deviceItem" v-for="device in devices" :key="device.id">
        <div class="deviceInfo">
          <div class="deviceName">
            <p>{{ device.deviceName }}</p>
          </div>
          <div class="deviceType">
            <p>{{ device.deviceType }}</p>
          </div>
        </div>
        <div class="deviceCtrl">
          <button title="联动控制"><img :src="getIconPath('联动控制')"></button>
          <button title="编辑" @click="startEditDevice(device)"><img :src="getIconPath('编辑')"></button>
          <button class="device_delete" title="删除" @click="handleDeleteDevice(device.id)"><img
              :src="getIconPath('删除')"></button>
        </div>
      </div>
      <!--添加/编辑容器-->
      <div class="deviceItem add_device_item" v-show="isAddDevice">
        <div class="deviceInfo">
          <div class="deviceName">
            <input type="text" placeholder="请输入设备名称" v-model="deviceName" required ref="deviceNameInput">
          </div>
          <div class="deviceType">
            <select v-model="deviceType">
              <option value="1">手持台</option>
              <option value="2">车载台</option>
              <option value="3">基地台</option>
              <option value="4">中继台</option>
              <option value="5">其他</option>
            </select>
          </div>
        </div>
        <div class="deviceCtrl">
          <button class="cancel_btn" @click="cancelOperation">
            <p>取消</p>
          </button>
          <button class="confirm_btn" @click="isEditing ? handleEditDevice() : handleAddDevice()">
            <p>确定</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useTheme } from '../function/useTheme'
import { useDevice, type Device } from '../function/useDevice'

const theme = useTheme()
const { devices, loadDevices, addDevice, deleteDevice, editDevice, getDeviceTypeName } = useDevice()
const componentTitle = '设备管理'

// 定义添加设备状态
const isAddDevice = ref(false)
const isEditing = ref(false)
const editingDevice = ref<Device | null>(null)
const deviceNameInput = ref<HTMLInputElement | null>(null)

// 表单数据
const deviceName = ref('')
const deviceType = ref('1')

// 定义关闭事件
const emit = defineEmits<{
  close: []
}>()

// 关闭弹窗函数
const closeModal = () => {
  emit('close')
}

// 导入所有图标
const icons = {
  联动控制: new URL('../assets/联动控制.svg', import.meta.url).toString(),
  联动控制_white: new URL('../assets/联动控制_white.svg', import.meta.url).toString(),
  编辑: new URL('../assets/编辑.svg', import.meta.url).toString(),
  编辑_white: new URL('../assets/编辑_white.svg', import.meta.url).toString(),
  删除: new URL('../assets/删除.svg', import.meta.url).toString(),
  删除_white: new URL('../assets/删除_white.svg', import.meta.url).toString(),
}

// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}

// 重置表单
const resetForm = () => {
  console.log('重置表单开始')
  deviceName.value = ''
  deviceType.value = '1'
  isEditing.value = false
  editingDevice.value = null
  isAddDevice.value = false
  console.log('重置表单完成，isAddDevice:', isAddDevice.value)
}

// 添加设备
const handleAddDevice = async () => {
  console.log('开始添加设备，设备名称:', deviceName.value)
  if (!deviceName.value.trim()) {
    alert('请输入设备名称')
    return
  }

  try {
    console.log('调用addDevice函数')
    await addDevice(deviceName.value.trim(), getDeviceTypeName(deviceType.value))
    console.log('设备添加成功，准备重置表单')
    resetForm()
    console.log('表单已重置')
  } catch (error) {
    console.error('添加设备失败:', error)
    alert('添加设备失败: ' + (error as Error).message)
  }
}

// 编辑设备
const handleEditDevice = async () => {
  if (!deviceName.value.trim() || !editingDevice.value) {
    alert('请输入设备名称')
    return
  }

  try {
    await editDevice(editingDevice.value.id, deviceName.value.trim(), getDeviceTypeName(deviceType.value))
    resetForm()
  } catch (error) {
    alert('编辑设备失败: ' + (error as Error).message)
  }
}

// 开始编辑设备
const startEditDevice = (device: Device) => {
  editingDevice.value = device
  deviceName.value = device.deviceName
  // 根据设备类型名称找到对应的值
  const typeMap: Record<string, string> = {
    '手持台': '1',
    '车载台': '2',
    '基地台': '3',
    '中继台': '4',
    '其他': '5'
  }
  deviceType.value = typeMap[device.deviceType] || '5'
  isEditing.value = true
  isAddDevice.value = true
  nextTick(() => {
    deviceNameInput.value?.focus()
  })
}

// 删除设备
const handleDeleteDevice = async (deviceId: number) => {
  if (confirm('确定要删除这个设备吗？')) {
    try {
      await deleteDevice(deviceId)
      // 删除后重置表单状态，防止状态残留
      if (isAddDevice.value) {
        resetForm() // 如果正在添加/编辑，立即取消
      }
    } catch (error) {
      alert('删除设备失败: ' + (error as Error).message)
    }
  }
}

// 取消操作
const cancelOperation = () => {
  resetForm()
}

// 显示添加设备表单
const showAddDeviceForm = () => {
  isAddDevice.value = true
  isEditing.value = false
  editingDevice.value = null
  deviceName.value = ''
  deviceType.value = '1'

  // 延迟聚焦，等待DOM更新完成
  nextTick(() => {
    deviceNameInput.value?.focus()
  })
}

// 组件挂载时加载设备数据
onMounted(async () => {
  await loadDevices()
})
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/deviceManage.less';

.app {
  .bg-color();
  .text-color();
  width: 100vw !important;
  display: grid !important;
  justify-items: center !important;
  align-content: flex-start !important;
}

button {
  .bg-color();
  .text-color();
  background: none;
}
</style>
