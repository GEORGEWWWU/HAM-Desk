<template>
  <div class="logapp">
    <!--添加QSO-->
    <div class="addQSO">
      <div class="addQSOcontainer">
        <div class="addQSO_input">
          <div class="addbtn" :class="{ addActive: isInputFocused }">
            <input type="text" placeholder="输入呼号" ref="callsignInput" v-model="callsignValue"
              @focus="isInputFocused = true" @blur="isInputFocused = false" @input="handleCallsignInput" maxlength="6">
            <button @click="addQSO">
              <p>添加 QSO</p>
            </button>
          </div>
        </div>
        <div class="QSO_info">
          <p>QSO数量：<span>{{ logs.length }}</span></p>
          <span>|</span>
          <p>默认日志本</p>
        </div>
      </div>
    </div>
    <!--QSO列表容器-->
    <div class="QSO_Contianer">
      <!--QSO列表-->
      <div class="qsoList">
        <!--表格-->
        <table>
          <thead>
            <tr>
              <th>日期时间</th>
              <th>呼号 <span class="rxtext">RX</span></th>
              <th>频率 <span class="txtext">TX</span></th>
              <th>模式 <span class="rxtext">RX</span></th>
              <th>信号 <span class="txtext">TX</span></th>
              <th>信号 <span class="rxtext">RX</span></th>
              <th>对方设备</th>
              <th>对方位置</th>
              <th>通联内容</th>
              <th>QSL状态</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="i in pageSize" :key="i">
              <tr v-if="currentPageData[i - 1]">
                <td>{{ currentPageData[i - 1].datetime }}</td>
                <td>{{ currentPageData[i - 1].call }}</td>
                <td>{{ currentPageData[i - 1].freq }}</td>
                <td>{{ currentPageData[i - 1].mode }}</td>
                <td>{{ currentPageData[i - 1].rstS }}</td>
                <td>{{ currentPageData[i - 1].rstR }}</td>
                <td>{{ currentPageData[i - 1].device }}</td>
                <td>{{ currentPageData[i - 1].qth }}</td>
                <td>{{ currentPageData[i - 1].message }}</td>
                <td>{{ currentPageData[i - 1].qsl }}</td>
              </tr>
              <tr v-else>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <!--操作和提示-->
      <div class="logOption">
        <div class="logop_left">
          <p>共 {{ logs.length }} 条记录，最后一次通联时间：{{ logs[0]?.datetime || '暂无' }}</p>
        </div>
        <div class="logop_right">
          <button class="pagebtn" @click="prevPage" :disabled="currentPage === 1">
            <img :src="getIconPath('leftar')">
          </button>
          <p class="pageIndex">{{ currentPage }} / {{ totalPages }}</p>
          <button class="pagebtn" @click="nextPage" :disabled="currentPage === totalPages">
            <img :src="getIconPath('rightar')">
          </button>
          <button class="optbtn">选项操作</button>
        </div>
      </div>
    </div>

    <!--编辑QSO弹窗-->
    <div class="editQSO">
      <div class="edit_container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useTheme } from '../function/useTheme'
import { useLog } from '../function/useLog'
const theme = useTheme()
const { logs } = useLog()

// 输入框聚焦状态
const isInputFocused = ref(false)
// 输入框引用
const callsignInput = ref<HTMLInputElement>()
// 呼号输入值
const callsignValue = ref('')

// 处理呼号输入，只允许字母和数字，并转换为大写
const handleCallsignInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  // 只保留字母和数字，并转换为大写
  callsignValue.value = target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

// 添加QSO
const addQSO = () => {
  if (!callsignValue.value.trim()) {
    // 如果呼号为空，不执行任何操作
    return
  }

  // 这里可以添加实际的QSO添加逻辑
  // 例如：调用API添加新的QSO记录

  // 添加完成后清空输入框
  callsignValue.value = ''

  // 重新聚焦到输入框
  if (callsignInput.value) {
    callsignInput.value.focus()
  }
}

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(12) // 默认每页显示12条数据
const viewportWidth = ref(window.innerWidth)

// 根据视口宽度动态调整每页显示的行数
const updatePageSize = () => {
  viewportWidth.value = window.innerWidth
  if (viewportWidth.value > 970) {
    pageSize.value = 14
  } else {
    pageSize.value = 12
  }
}

// 监听窗口大小变化
window.addEventListener('resize', updatePageSize)
// 初始化时设置正确的页面大小
updatePageSize()

// 计算总页数
const totalPages = computed(() => {
  return Math.max(1, Math.ceil(logs.value.length / pageSize.value))
})

// 计算当前页显示的数据
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return logs.value.slice(start, end)
})

// 上一页
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// 下一页
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// 监听logs变化，重置页码
watch(logs, () => {
  currentPage.value = 1
})

// 组件挂载后自动聚焦输入框
onMounted(() => {
  nextTick(() => {
    if (callsignInput.value) {
      callsignInput.value.focus()
      isInputFocused.value = true
    }
  })
})

// 导入所有图标
const icons = {
  leftar: new URL('../assets/leftar.svg', import.meta.url).href,
  leftar_white: new URL('../assets/leftar_white.svg', import.meta.url).href,
  rightar: new URL('../assets/rightar.svg', import.meta.url).href,
  rightar_white: new URL('../assets/rightar_white.svg', import.meta.url).href,
}
// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/hamlog.less';
</style>
