<!--views/HamHome.vue-->
<template>
  <div class="ham-home-wrapper">
    <div class="app">
      <!-- 用户 -->
      <div class="user">
        <div class="userInfo">
          <img class="userAvatar" :src="avatarUrl" alt="userAvatar">
          <div class="user_info">
            <h1>{{ user.callsign }}</h1>
            <div class="usertags">
          <span>{{ user.cert }}类操作证</span>
          <span>{{ devices.length }}个设备</span>
          <span>{{ user.hamAge }}年火腿</span>
        </div>
          </div>
        </div>
        <div class="user_edit">
          <button title="编辑信息" @click="isEdit = true">
            <img class="editIcon" :src="getIconPath('编辑')">
          </button>
        </div>
      </div>
    </div>

    <!--系统通知横幅-->
    <div class="popup" v-show="showPopup">
      <div class="popup_content">
        <img :src="getIconPath('提示')">
        <h1>{{ systemNotice }}</h1>
      </div>
      <button @click="closePopup">
        <img :src="getIconPath('close')">
      </button>
    </div>

    <!--HAM应用集合-->
    <div class="hamapps">
      <div class="appsrow">
        <!--数据与日志-->
        <div class="data_log">
          <div class="dataCount">
            <h1>0</h1>
            <div class="dataCount_text">
              <p>总计</p>
              <span>个 QSO</span>
            </div>
          </div>
          <div class="logAdd">
            <button @click="$router.push('/log')">
              <img :src="getIconPath('通联日志')">
              <p>新增通联</p>
            </button>
          </div>
        </div>
        <!--设备管理-->
        <div class="device_manage">
          <div class="device_manage_app">
            <img src="../assets/device.png">
            <button @click="showDeviceManage = true">设备管理</button>
          </div>
        </div>
        <!--HAM地图-->
        <div class="maps">
          <div class="maps_app" @click="openHamMaps">
            <p><span>HAM地图</span>传播地图/气象数据/分区图</p>
          </div>
        </div>
      </div>
      <div class="appsrow"></div>
    </div>

    <!--设备管理组件弹窗-->
    <DeviceManage class="fullscrenn_manage_popup" v-if="showDeviceManage" @close="showDeviceManage = false"></DeviceManage>

    <!-- 用户信息编辑弹窗 -->
    <div v-if="isEdit" class="userinfo_edit">
      <div v-if="!user.callsign" class="welcome_tip">
        <p>欢迎火腿！请先设置您的呼号和基本信息</p>
      </div>
      <div class="user_avatar_box">
        <img title="点击换头像" class="user_avatar" :src="avatarUrl" @click="selectAvatar" />
      </div>
      <div class="username_input">
        <input type="text" placeholder="新呼号" v-model="editForm.callsign" maxlength="6"
          @input="editForm.callsign = editForm.callsign.toUpperCase()" @keyup.enter="saveUser">
      </div>
      <div class="radio-inputs">
        <label class="radio" v-for="c in certList" :key="c">
          <input type="radio" name="radio" :value="c" v-model="editForm.cert">
          <span class="name">{{ c }}类</span>
        </label>
      </div>
      <div class="device_hamage">
        <div class="user_device">
          <span>{{ devices.length }} 个设备</span>
        </div>
        <div class="user_hamage">
          <input type="number" min="0" max="99" v-model.number="editForm.hamAge">
          <p>年火腿</p>
        </div>
      </div>
      <div class="save_button">
        <button class="save_btn" @click="saveUser">保存</button>
        <button @click="isEdit = false">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useTheme } from '../function/useTheme'
import { useDevice } from '../function/useDevice'
import DeviceManage from '../components/DeviceManage.vue'
import { openHamMaps } from '../function/useHamMaps'
const theme = useTheme()
const showDeviceManage = ref(false)
const { devices, loadDevices } = useDevice()
// 导入所有图标
const icons = {
  编辑: new URL('../assets/编辑.svg', import.meta.url).href,
  编辑_white: new URL('../assets/编辑_white.svg', import.meta.url).href,
  提示: new URL('../assets/提示.svg', import.meta.url).href,
  提示_white: new URL('../assets/提示_white.svg', import.meta.url).href,
  通联日志: new URL('../assets/通联日志.svg', import.meta.url).href,
  通联日志_white: new URL('../assets/通联日志_white.svg', import.meta.url).href,
  close: new URL('../assets/close.svg', import.meta.url).href,
  close_white: new URL('../assets/close_white.svg', import.meta.url).href,
}
// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}
// 用户数据
const user = reactive({ callsign: '', cert: 'A', devices: 0, hamAge: 0 })
const avatarUrl = ref(new URL('../assets/userAvatar.png', import.meta.url).href)
const isEdit = ref(false)
const certList = ['A', 'B', 'C']
const editForm = reactive({ ...user })
// 读用户数据
onMounted(async () => {
  const u = await window.electronAPI.userRead()
  Object.assign(user, u)
  Object.assign(editForm, u)

  // 加载用户头像
  try {
    avatarUrl.value = await window.electronAPI.getUserAvatarPath()
  } catch (error) {
    console.error('Failed to load user avatar:', error)
    // 使用默认头像
    avatarUrl.value = new URL('../assets/userAvatar_default.png', import.meta.url).href
  }

  // 加载设备数据
  await loadDevices()

  // 更新用户数据中的设备数量为实际数量
  user.devices = devices.value.length

  // 如果是新HAM（呼号为空），自动显示编辑弹窗
  if (!user.callsign || user.callsign.trim() === '') {
    isEdit.value = true
  }
})
// 选头像
async function selectAvatar() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg'
  input.onchange = async () => {
    if (!input.files?.length) return
    const file = input.files[0]
    const blobUrl = URL.createObjectURL(file)
    try {
      const realPath = await window.electronAPI.avatarSaveBlob(blobUrl)
      const result = await window.electronAPI.avatarUpdate(realPath)
      if (result.success) {
        // 更新头像显示
        avatarUrl.value = await window.electronAPI.getUserAvatarPath()
      } else {
        console.error('Failed to update avatar:', result.error)
      }
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }
  input.click()
}
// 保存（仅当字段有变化才写盘）
async function saveUser() {
  // 先转普通对象
  const plain = {
    callsign: editForm.callsign,
    cert: editForm.cert,
    devices: devices.value.length, // 使用实际的设备数量
    hamAge: editForm.hamAge
  }
  // 再比较/保存（注意：比较时也要使用实际的设备数量）
  const currentUser = {
    ...user,
    devices: devices.value.length // 使用实际的设备数量
  }
  if (JSON.stringify(plain) === JSON.stringify(currentUser)) return
  const merged = await window.electronAPI.userWrite(plain)
  Object.assign(user, merged)
  // 使用nextTick确保DOM更新完成后再关闭编辑窗口
  nextTick(() => {
    isEdit.value = false
  })
  // window.location.reload();
}
// 系统通知相关
const systemNotice = ref('当前为 Beta 版本，此版本质量不代表最终产品质量！')
const showPopup = ref(true)
function closePopup() {
  showPopup.value = false
}
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/hamhome.less';

.ham-home-wrapper {
  width: calc(100vw - 55px);
  display: grid;
  justify-items: right;
  align-content: flex-start;
  gap: 13px;
}

.app {
  .bg-color();
  .text-color();
  width: 92vw;
  display: grid;
  justify-items: center;
  align-items: flex-start;
}

button {
  .bg-color();
  .text-color();
  background: none;
}
</style>
