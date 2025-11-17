<!--© 2025 HAM Desk APP. All rights reserved.-->
<!--Vue3+Electron+TypeScript+Less / 2025-10-27 / GEORGEWU-->

<template>
  <div class="ham-home-wrapper">
    <!--主容器（主题切换）-->
    <div class="app">
      <!--侧边栏-->
      <aside>
        <div class="aside_menu">
          <button @click="$router.push('/')"><img :src="getIconPath('HAM')"></button>
          <button @click="$router.push('/log')"><img :src="getIconPath('通联日志')"></button>
          <button @click="$router.push('/relay')"><img :src="getIconPath('中继查询')"></button>
          <button @click="$router.push('/exam')"><img :src="getIconPath('HAM考试')"></button>
        </div>
        <div class="aside_settings">
          <button @click="toggleSettings()">
            <img :src="getIconPath('设置')">
          </button>
        </div>
      </aside>
      <!--内容区域-->
      <main>
        <!--组件化页面-->
        <div class="main_left_fixed"></div>
        <router-view class="main_content" />
      </main>
    </div>

    <!--设置弹窗-->
    <div class="settings" v-if="settings">
      <div class="setting">
        <div class="setting_button">
          <button class="checkversion" @click="handleCheckUpdate" :disabled="checking">
            <p>{{ checking ? '获取中...' : '检查更新' }}</p>
            <img :src="getIconPath('检查更新')">
          </button>
          <button @click="activeSetting = 'system_setting'"
            :class="{ 'active_setting': activeSetting === 'system_setting' }">
            <p>系统设置</p>
            <img :src="getIconPath('right')">
          </button>
          <button @click="activeSetting = 'log_setting'" :class="{ 'active_setting': activeSetting === 'log_setting' }">
            <p>日志设置</p>
            <img :src="getIconPath('right')">
          </button>
          <button @click="activeSetting = 'relay_submit'"
            :class="{ 'active_setting': activeSetting === 'relay_submit' }">
            <p>中继提交</p>
            <img :src="getIconPath('right')">
          </button>
          <!--关于软件-->
          <button @click="activeSetting = 'about_software'"
            :class="{ 'active_setting': activeSetting === 'about_software' }">
            <p>关于软件</p>
            <img :src="getIconPath('right')">
          </button>
          <a class="close_setting" @click="toggleSettings()">
            <img :src="getIconPath('设置')">
            <p>返回</p>
          </a>
        </div>
        <div class="setting_page">
          <!--显示对应页面/默认系统设置-->
          <div v-if="activeSetting === 'system_setting'" class="system_setting">
            <!--呼号设置-->
            <div class="system_item">
              <div class="system_item_box">
                <div class="user_title">
                  <img src="./assets/icon.png">
                  <!-- 非编辑态显示呼号 -->
                  <p v-if="!isEditing">{{ userCallSign }}</p>
                  <!-- 编辑态显示输入框 -->
                  <input v-if="isEditing" ref="inputEl" v-model="editText" type="text" maxlength="6" placeholder="请输入呼号"
                    class="callsign-input" @input="editText = editText.toUpperCase()" @keyup.enter="handleEditClick">
                </div>
                <div class="user_button">
                  <!-- 按钮文字动态切换 -->
                  <button @click="handleEditClick">
                    <p>{{ isEditing ? '确认修改' : '修改呼号' }}</p>
                  </button>
                </div>
              </div>
              <div class="system_item_box">
                <div class="callsign_search_title">
                  <p>呼号查询与管理</p>
                </div>
                <div class="callsign_search_button">
                  <button @click="openQRZ">
                    <p>QRZ.com</p>
                    <img :src="getIconPath('right')">
                  </button>
                </div>
              </div>
            </div>
            <!--主题与语言设置-->
            <div class="system_item">
              <div class="system_item_box">
                <div class="theme_title">
                  <p>主题颜色</p>
                </div>
                <div class="theme_button">
                  <button @click="toggleTheme">{{ theme === 'light' ? '切换暗色' : '切换亮色' }}</button>
                  <span>|</span>
                  <div class="followSystem">
                    <p>跟随系统</p>
                    <label class="toggle-switch">
                      <input type="checkbox" :checked="followSystem" @change="handleFollowToggle" />
                      <div class="toggle-switch-background">
                        <div class="toggle-switch-handle"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div class="system_item_box">
                <div class="lang_title">
                  <p>语言</p>
                </div>
                <div class="lang_button">
                  <button disabled>
                    <p>简体中文</p>
                  </button>
                </div>
              </div>
            </div>
            <!--定位服务-->
            <div class="system_item">
              <div class="system_item_box">
                <div class="location_title">
                  <p>定位服务</p>
                  <img :src="getIconPath('疑问')">
                  <span>开启后可使用地图定位相关服务</span>
                </div>
                <div class="location_button">
                  <label class="toggle-switch">
                    <input type="checkbox" :checked="enabled"
                      @change="e => toggleLocation((e.target as HTMLInputElement).checked)" />
                    <div class="toggle-switch-background">
                      <div class="toggle-switch-handle"></div>
                    </div>
                  </label>
                </div>
              </div>
              <div class="system_item_box">
                <div class="location_title">
                  <p class="location_text">{{ locationText }}</p>
                </div>
              </div>
            </div>
            <!--自动检查更新-->
            <div class="system_item">
              <div class="system_item_box">
                <div class="update_title">
                  <p>启动自动检查更新</p>
                </div>
                <div class="update_button">
                  <label class="toggle-switch">
                    <input type="checkbox" disabled />
                    <div class="toggle-switch-background">
                      <div class="toggle-switch-handle"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <!--日志设置-->
          <div v-if="activeSetting === 'log_setting'" class="log_setting">
            <div class="log_item">
              <div class="log_item_box">
                <div class="saveLocation_title">
                  <p>日志存储位置</p>
                  <span>{{ logDir }}</span>
                </div>
                <div class="saveLocation_button">
                  <button :title="logDir" @click="openLogDir">
                    <p>打开目录</p>
                  </button>
                </div>
              </div>
              <div class="log_item_box">
                <div class="dataCopy_title">
                  <p>数据备份</p>
                </div>
                <div class="dataCopy_button">
                  <button class="export_button" @click="handleExportData">
                    <p>导出数据</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!--中继提交-->
          <div v-if="activeSetting === 'relay_submit'" class="relay_submit">
            <div class="relay_item">
              <div class="relay_item_box">
                <div class="relay_title">
                  <p>中继详情</p>
                </div>
                <div class="relay_button">
                  <button>
                    <p>更新</p>
                  </button>
                </div>
              </div>
              <div class="relay_item_box">
                <div class="relayCount">
                  <img :src="getIconPath('中继查询')">
                  <p>数据库中继数量：0</p>
                </div>
              </div>
            </div>
          </div>
          <!--关于软件-->
          <div v-if="activeSetting === 'about_software'" class="about_software">
            <div class="about_item">
              <div class="about_item_app_box">
                <div class="app_info">
                  <img src="./assets/icon.png" />
                  <h1>HAM Desk <span>Beta</span></h1>
                  <p>版本 {{ version }}</p>
                </div>
              </div>
              <div class="about_item_box">
                <div class="feedback_title">
                  <p>开源地址</p>
                </div>
                <div class="feedback_button">
                  <button @click="openGithub">
                    <p>打开项目仓库</p>
                    <img :src="getIconPath('right')">
                  </button>
                </div>
              </div>
            </div>
            <div class="about_footer">
              <div class="footer_btn">
                <button @click="openPrivacyPolicy">
                  <p>隐私政策</p>
                </button>
                <span>|</span>
                <button @click="openDisclaimer">
                  <p>免责声明</p>
                </button>
                <span>|</span>
                <button @click="openOfficialWebsite">
                  <p>官方网站</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!------------数据交互部分------------>
<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useTheme } from './function/useTheme'
import { useCallsign } from './function/useCallsign'
import { useLocation } from './function/useLocation'
import { useUpdate } from './function/useUpdate'
import { GITHUB_REPO, PRIVACY_POLICY_FILE, DISCLAIMER_FILE, OFFICIAL_WEBSITE } from './const'
import { useLog } from './function/useLog'
import { useVersion } from './function/useVersion'
import { exportDataToZip } from './function/exportUtils'
const { version } = useVersion()
const { logDir } = useLog()
const { checking, hasNew, newVer, checkUpdate } = useUpdate()
const { toggleTheme, theme, followSystem, toggleFollowSystem } = useTheme()
const { enabled, locationText, toggleLocation } = useLocation()

// 打开日志目录
async function openLogDir() {
  await window.electronAPI.logOpenDir()
}
// 打开Github仓库地址
function openGithub() {
  window.open(GITHUB_REPO, '_blank')
}
// 导入所有图标
const icons = {
  HAM: new URL('./assets/HAM.svg', import.meta.url).href,
  HAM_white: new URL('./assets/HAM_white.svg', import.meta.url).href,
  通联日志: new URL('./assets/通联日志.svg', import.meta.url).href,
  通联日志_white: new URL('./assets/通联日志_white.svg', import.meta.url).href,
  中继查询: new URL('./assets/中继查询.svg', import.meta.url).href,
  中继查询_white: new URL('./assets/中继查询_white.svg', import.meta.url).href,
  HAM考试: new URL('./assets/HAM考试.svg', import.meta.url).href,
  HAM考试_white: new URL('./assets/HAM考试_white.svg', import.meta.url).href,
  设置: new URL('./assets/设置.svg', import.meta.url).href,
  设置_white: new URL('./assets/设置_white.svg', import.meta.url).href,
  检查更新: new URL('./assets/检查更新.svg', import.meta.url).href,
  检查更新_white: new URL('./assets/检查更新_white.svg', import.meta.url).href,
  right: new URL('./assets/right.svg', import.meta.url).href,
  right_white: new URL('./assets/right_white.svg', import.meta.url).href,
  疑问: new URL('./assets/疑问.svg', import.meta.url).href,
  疑问_white: new URL('./assets/疑问_white.svg', import.meta.url).href,
}
// 切换设置弹窗显示状态
const settings = ref(false)
const toggleSettings = () => {
  settings.value = !settings.value
}
// 检查更新按钮点击事件
async function handleCheckUpdate() {
  await checkUpdate()
  // 统一弹窗
  if (checking.value) return // 还在获取，不弹
  if (hasNew.value) {
    // 发现新版本
    const ok = confirm(`发现新版本：Version ${newVer.value}\n点击“确定”前往下载页面。`)
    if (ok) window.open(`https://github.com/${GITHUB_REPO}/releases/tag/${newVer.value}`)
  } else if (newVer.value === '') {
    alert('网络异常')
  } else {
    alert('当前已是最新版本！')
  }
}
// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}
// 设置页面显示活动项
const activeSetting = ref('system_setting')
// 处理跟随系统切换事件
function handleFollowToggle(e: Event) {
  toggleFollowSystem((e.target as HTMLInputElement).checked)
}
// 呼号相关
const { userCallSign, saveCallsign } = useCallsign()
const isEditing = ref(false)
const editText = ref('')
const inputEl = ref<HTMLInputElement>()
async function handleEditClick() {
  if (!isEditing.value) {
    // 进入编辑
    editText.value = userCallSign.value
    isEditing.value = true
    await nextTick()
    inputEl.value?.focus()
  } else {
    // 确认修改
    saveCallsign(editText.value.trim())
    isEditing.value = false
  }
}
// 打开QRZ.com并查询当前呼号
const openQRZ = () => {
  const call = userCallSign.value.trim()
  if (!call) return
  window.open(`https://www.qrz.com/db/${call}`)
}
// 打开隐私政策
const openPrivacyPolicy = async () => {
  window.open(PRIVACY_POLICY_FILE, '_blank')
}
// 打开免责声明
const openDisclaimer = async () => {
  window.open(DISCLAIMER_FILE, '_blank')
}
// 打开官方网站
const openOfficialWebsite = () => {
  window.open(OFFICIAL_WEBSITE, '_blank')
}
// 导出数据
const handleExportData = async () => {
  try {
    // 获取所有JSON文件数据
    const jsonData = await window.electronAPI.getAllJsonFiles()

    // 导出数据为ZIP压缩包
    await exportDataToZip(jsonData)
    alert('数据导出成功！')
  } catch (error) {
    console.error('导出数据失败:', error)
    alert('导出数据失败，请重试！')
  }
}
</script>

<!--------------样式部分--------------->
<style scoped lang="less">
@import './style/mixins.less';
@import './style/main.less';

.app {
  .bg-color();
  .text-color();
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
}

// 设置弹窗
.settings {
  .bg-color();
  .text-color();
  min-height: 100vh;
  width: 100vw;
}

button {
  .bg-color();
  .text-color();
  background: none;
}

.main_content {
  animation: showMainContent 0.3s ease-in-out;
}

@keyframes showMainContent {
  from {
    opacity: 0;
    transform: scale(0.995);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
