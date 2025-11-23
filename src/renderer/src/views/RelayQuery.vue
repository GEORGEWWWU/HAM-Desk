<template>
  <div class="relay_app" :key="renderKey">
    <!--中继索引与查询-->
    <div class="relay_index">
      <!--中继索引-->
      <div class="relayIndex">
        <div class="relay_title">
          <img :src="getIconPath('中继查询')">
          <p><span>{{ locationCity }}</span> 中继列表</p>
          <h2 v-if="!enabled">暂未开启定位服务！</h2>
        </div>
        <div class="titlecircle">
          <div class="circle_border"></div>
        </div>
      </div>
      <!--中继查询-->
      <div class="relay_search">
        <div class="saerchbox">
          <input type="text" placeholder="城市/频率/中继名称">
          <button>
            <img :src="getIconPath('搜索')">
          </button>
        </div>
      </div>
    </div>

    <!--附近中继-->
    <div class="relay_list">
      <!--中继列表-->
      <div class="relayList">
        <!--中继台卡片-->
        <div class="relayCard" v-for="relay in currentCityRelays" :key="relay.name">
          <div class="relayName">
            <span>{{ relay.mode }}</span>
            <h1>{{ relay.name }}</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>{{ relay.receiveFreq }}</span></p>
              <p>/</p>
              <p>发射 <span>{{ relay.transmitFreq }}</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>{{ calculateOffset(relay.receiveFreq, relay.transmitFreq) }}</span></p>
              <p>/</p>
              <p>亚音 <span>{{ relay.tone }}</span></p>
            </div>
          </div>
        </div>
        <!--加载动画-->
        <div class="loading" v-if="loading">
          <img :src="getIconPath('loading')">
        </div>
        <!--无数据提示-->
        <div class="no-data" v-if="!loading && currentCityRelays.length === 0 && locationCity !== '***'">
          <p>当前城市暂无中继台数据</p>
        </div>
        <!--未定位提示-->
        <div class="no-data" v-if="!loading && locationCity === '***'">
          <p>请开启定位服务以查看中继台数据</p>
        </div>
      </div>
      <!-- 移除分页器，改为滚动显示 -->
    </div>

    <!--中继数据-->
    <div class="relay_data">
      <div class="relayData">
        <div class="relaydata">
          <p>共 {{ currentCityRelays.length }} 个中继台</p>
          <span>|</span>
          <p>数据获取日期：{{ lastUpdateDate }}</p>
        </div>
        <button @click="reloadRelayData">
          <p>重载数据</p>
        </button>
      </div>
    </div>

    <!--全部中继-->
    <div class="relay_all">
      <img src="../assets/relay_all_back.png">
      <div class="relayAll_title">
        <h1><button>查看</button> 全国中继列表</h1>
        <p>由 <span>BD8FTD</span> 维护更新数据</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../function/useTheme'
import { useLocation, on, off } from '../function/useLocation'
import { useRelayData, type ParsedRelayData } from '../function/useRelayData'

const theme = useTheme()
const { enabled, locationText } = useLocation()
const {
  loading,
  error,
  lastUpdateDate,
  loadRelayData,
  filterRelayByCity,
  reloadData
} = useRelayData()

// 所有中继台数据
const allRelayData = ref<ParsedRelayData[]>([])

// 当前城市的中继台数据
const currentCityRelays = ref<ParsedRelayData[]>([])

// 缓存键名
const CACHE_KEY = 'relay_location_city'

// 定位城市
const locationCity = ref('***')

// 强制渲染组件的key，当定位状态变化时更新
const renderKey = ref(0)

// 从localStorage获取缓存的城市
const getCachedCity = (): string => {
  try {
    return localStorage.getItem(CACHE_KEY) || '***'
  } catch (error) {
    console.error('获取缓存城市失败:', error)
    return '***'
  }
}

// 保存城市到localStorage
const saveCityToCache = (city: string): void => {
  try {
    localStorage.setItem(CACHE_KEY, city)
  } catch (error) {
    console.error('保存城市到缓存失败:', error)
  }
}

// 解析定位文本，提取城市名称
const parseLocationText = (text: string): string => {
  if (!text || text === '未启用位置服务') {
    return '***'
  }

  // 定位文本格式可能是 "省份, 城市" 或 "省份"
  if (text.includes(',')) {
    const parts = text.split(',')
    if (parts.length >= 2) {
      // 去掉城市名称中的"市"字
      return parts[1].trim().replace(/市$/, '')
    } else {
      return parts[0].trim().replace(/市$/, '')
    }
  } else {
    return text.trim().replace(/市$/, '')
  }
}

// 导入所有图标
const icons = {
  中继查询: new URL('../assets/中继查询.svg', import.meta.url).href,
  中继查询_white: new URL('../assets/中继查询_white.svg', import.meta.url).href,
  搜索: new URL('../assets/搜索.svg', import.meta.url).href,
  搜索_white: new URL('../assets/搜索_white.svg', import.meta.url).href,
  loading: new URL('../assets/loading.svg', import.meta.url).href,
  loading_white: new URL('../assets/loading_white.svg', import.meta.url).href,
}

// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}

// 加载中继台数据
const loadRelayDataForCity = async (city: string) => {
  if (!city || city === '***') {
    currentCityRelays.value = []
    return
  }

  try {
    // 如果还没有加载过数据，先加载所有数据
    if (allRelayData.value.length === 0) {
      allRelayData.value = await loadRelayData()

      // 查找成都相关的中继
      const chengduRelays = allRelayData.value.filter(item =>
        item.city && item.city.includes('成都')
      )
    }

    // 根据城市筛选数据
    const filteredData = filterRelayByCity(allRelayData.value, city)
    currentCityRelays.value = filteredData

    console.log(`为城市 ${city} 找到 ${filteredData.length} 个中继台`)

  } catch (err) {
    console.error('加载中继数据失败:', err)
    currentCityRelays.value = []
  }
}

// 计算差频：发射频率 - 接收频率
const calculateOffset = (receiveFreq: string, transmitFreq: string): string => {
  try {
    // 将频率字符串转换为数字（MHz）
    const receive = parseFloat(receiveFreq)
    const transmit = parseFloat(transmitFreq)

    // 检查是否为有效数字
    if (isNaN(receive) || isNaN(transmit)) {
      return '0.000'
    }

    // 计算差频：发射 - 接收
    const offset = transmit - receive

    // 格式化输出，保留3位小数
    return offset.toFixed(3)
  } catch (error) {
    console.error('计算差频失败:', error)
    return '0.000'
  }
}

// 重载数据
const reloadRelayData = async () => {
  try {
    allRelayData.value = await reloadData()

    // 重新筛选当前城市的数据
    if (locationCity.value && locationCity.value !== '***') {
      const filteredData = filterRelayByCity(allRelayData.value, locationCity.value)
      currentCityRelays.value = filteredData
    }
  } catch (err) {
    console.error('重载数据失败:', err)
  }
}

// 处理定位服务状态变化
const handleLocationUpdate = async (data: { enabled: boolean; text: string }) => {
  console.log('定位服务状态更新:', data)

  // 强制重新渲染组件
  renderKey.value += 1

  if (data.enabled && data.text && data.text !== '定位中…') {
    const newCity = parseLocationText(data.text)
    const cachedCity = getCachedCity()

    // 只有当新城市与缓存不同时才更新缓存
    if (newCity !== cachedCity) {
      saveCityToCache(newCity)
    }

    // 始终更新显示的城市
    locationCity.value = newCity

    // 加载对应城市的中继台数据
    await loadRelayDataForCity(newCity)
  } else if (!data.enabled) {
    // 定位服务关闭时显示***
    locationCity.value = '***'
    currentCityRelays.value = []
  }
  // 如果是定位中状态，保持当前显示不变
}

// 监听定位服务状态和定位文本变化
watch([enabled, locationText], ([isEnabled, text]) => {
  console.log('监听到定位状态变化:', isEnabled, text)
  handleLocationUpdate({ enabled: isEnabled, text: text || '未启用位置服务' })
}, { immediate: true })

// 页面加载时，先从缓存获取城市
onMounted(async () => {
  console.log('中继页面加载，当前定位状态:', enabled.value, locationText.value)

  const cachedCity = getCachedCity()
  if (cachedCity !== '***') {
    locationCity.value = cachedCity
    // 加载对应城市的中继台数据
    await loadRelayDataForCity(cachedCity)
  }

  // 监听定位服务状态变化事件
  on('location-updated', handleLocationUpdate)

  // 如果定位服务已启用且有定位文本，立即更新显示
  if (enabled.value && locationText.value && locationText.value !== '定位中…') {
    const newCity = parseLocationText(locationText.value)
    locationCity.value = newCity
    await loadRelayDataForCity(newCity)
  }

  await reloadData();
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  off('location-updated', handleLocationUpdate)
})
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/hamrelay.less';
</style>
