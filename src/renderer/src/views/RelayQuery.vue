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
        <!--搜索框-->
        <div class="saerchbox">
          <input type="text" placeholder="城市名称" v-model="searchQuery" @input="handleSearchInput">
          <button>
            <img :src="getIconPath('搜索')">
          </button>
        </div>
        <!--搜索结果-->
        <div class="searchResult" v-if="searchResults.length > 0">
          <div class="result_item" v-for="city in searchResults" :key="city">
            <button @click="selectCity(city)">
              <p>{{ city }}</p>
            </button>
          </div>
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
              <p>接收 <span>{{ formatFrequency(relay.receiveFreq) }}</span></p>
              <p>/</p>
              <p>发射 <span>{{ formatFrequency(relay.transmitFreq) }}</span></p>
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
    </div>

    <!--中继数据-->
    <div class="relay_data">
      <div class="relayData">
        <div class="relaydata">
          <p>共 {{ currentCityRelays.length }} 个中继台</p>
          <span>|</span>
          <p>本地数据日期：{{ lastUpdateDate }}</p>
        </div>
        <div class="relaybutton">
          <button @click="restoreToLocatedCity" :disabled="!enabled">
            <p>恢复至定位城市</p>
          </button>
          <button @click="reloadRelayData">
            <p>重载数据</p>
          </button>
        </div>
      </div>
    </div>

    <!--全部中继-->
    <div class="relay_all">
      <img src="../assets/relay_all_back.png">
      <div class="relayAll_title">
        <h1><button @click="navigateToAllRelays">查看</button> 全国中继列表</h1>
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
  lastUpdateDate,
  loadRelayData,
  filterRelayByCity,
  reloadData
} = useRelayData()

// 所有中继台数据
const allRelayData = ref<ParsedRelayData[]>([])

// 当前城市的中继台数据
const currentCityRelays = ref<ParsedRelayData[]>([])

// 搜索查询字符串
const searchQuery = ref('')

// 搜索结果列表
const searchResults = ref<string[]>([])

// 所有城市列表（用于搜索）
const allCities = ref<string[]>([])

// 缓存键名
const CACHE_KEY = 'relay_location_city'

// 定位城市
const locationCity = ref('***')

// 强制渲染组件的key，当定位状态变化时更新
const renderKey = ref(0)

// 导航到全部中继页面
const navigateToAllRelays = () => {
  window.open('https://www.kdocs.cn/l/civsNrKrVaTj', '_blank')
}

// 处理搜索输入
const handleSearchInput = () => {
  // 如果搜索框为空，清空搜索结果
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  // 执行模糊搜索
  performFuzzySearch(searchQuery.value.trim())
}

// 执行城市名模糊搜索
const performFuzzySearch = (query: string) => {
  if (!query || allCities.value.length === 0) {
    searchResults.value = []
    return
  }

  // 将搜索词转为小写，以便不区分大小写匹配
  const lowerQuery = query.toLowerCase()

  // 过滤出包含搜索词的城市名
  const results = allCities.value.filter(city =>
    city.toLowerCase().includes(lowerQuery)
  )

  // 限制结果数量，避免显示太多
  searchResults.value = results.slice(0, 10)
}

// 选择城市
const selectCity = async (city: string) => {
  // 更新定位城市
  locationCity.value = city
  saveCityToCache(city)

  // 清空搜索框和搜索结果
  searchQuery.value = ''
  searchResults.value = []

  // 加载选中城市的中继数据
  await loadRelayDataForCity(city)
}

// 从所有中继数据中提取城市列表
const extractCitiesFromRelayData = (relayData: ParsedRelayData[]) => {
  // 使用 Set 去重
  const cities = new Set<string>()

  relayData.forEach(relay => {
    if (relay.city) {
      cities.add(relay.city)
    }
  })

  // 转换为数组并排序
  return Array.from(cities).sort()
}

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
  // 如果城市为空或为***，清空当前城市数据
  if (!city || city === '***') {
    currentCityRelays.value = []
    return
  }

  try {
    // 如果还没有加载过数据，先加载所有数据
    if (allRelayData.value.length === 0) {
      allRelayData.value = await loadRelayData()
      // 提取所有城市列表
      allCities.value = extractCitiesFromRelayData(allRelayData.value)
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

// 格式化频率显示，确保小数位为4位，不足则补0
const formatFrequency = (freq: string): string => {
  try {
    // 如果已经是4位小数，直接返回
    if (freq.includes('.') && freq.split('.')[1].length === 4) {
      return freq
    }

    // 转换为数字再格式化为4位小数
    const num = parseFloat(freq)
    if (isNaN(num)) {
      return freq
    }

    return num.toFixed(4)
  } catch (error) {
    console.error('格式化频率失败:', error)
    return freq
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
    const formattedOffset = offset.toFixed(3)

    // 如果是正数，前面加"+"号
    return offset > 0 ? `+${formattedOffset}` : formattedOffset
  } catch (error) {
    console.error('计算差频失败:', error)
    return '0.000'
  }
}

// 恢复至定位城市
const restoreToLocatedCity = async () => {
  // 如果定位服务未启用，不执行任何操作
  if (!enabled.value) {
    return
  }

  // 如果没有定位文本或正在定位中，不执行任何操作
  if (!locationText.value || locationText.value === '定位中…') {
    return
  }

  // 解析定位文本获取城市名称
  const locatedCity = parseLocationText(locationText.value)

  // 如果定位城市与当前显示城市相同，不需要操作
  if (locatedCity === locationCity.value) {
    return
  }

  // 更新当前城市
  locationCity.value = locatedCity
  // 保存到缓存
  saveCityToCache(locatedCity)

  // 加载对应城市的中继台数据
  await loadRelayDataForCity(locatedCity)
}

// 重载数据
const reloadRelayData = async () => {
  try {
    allRelayData.value = await reloadData()
    // 更新城市列表
    allCities.value = extractCitiesFromRelayData(allRelayData.value)

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

  if (data.enabled && data.text && data.text !== '定位中…') {
    const newCity = parseLocationText(data.text)
    const cachedCity = getCachedCity()

    // 只有当新城市与缓存不同时才更新缓存
    if (newCity !== cachedCity) {
      saveCityToCache(newCity)
    }

    // 只有当城市真正发生变化时才更新显示和加载数据
    if (newCity !== locationCity.value) {
      locationCity.value = newCity

      // 强制重新渲染组件
      renderKey.value += 1

      // 加载对应城市的中继台数据
      await loadRelayDataForCity(newCity)
    }
  } else if (!data.enabled) {
    // 定位服务关闭时显示***
    if (locationCity.value !== '***') {
      locationCity.value = '***'
      currentCityRelays.value = []
      // 强制重新渲染组件
      renderKey.value += 1
    }
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

  // 加载所有中继数据
  allRelayData.value = await reloadData()
  // 提取所有城市列表
  allCities.value = extractCitiesFromRelayData(allRelayData.value)

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
