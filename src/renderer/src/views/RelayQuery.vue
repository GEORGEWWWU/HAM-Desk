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
        <div class="relayCard">
          <div class="relayName">
            <span>模拟</span>
            <h1>中继名称</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>000.000</span></p>
              <p>/</p>
              <p>发射 <span>000.000</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>0</span></p>
              <p>/</p>
              <p>亚音 <span>TSQ88.5</span></p>
            </div>
          </div>
        </div>
        <div class="relayCard">
          <div class="relayName">
            <span>模拟</span>
            <h1>中继名称</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>000.000</span></p>
              <p>/</p>
              <p>发射 <span>000.000</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>0</span></p>
              <p>/</p>
              <p>亚音 <span>TSQ88.5</span></p>
            </div>
          </div>
        </div>
        <div class="relayCard">
          <div class="relayName">
            <span>模拟</span>
            <h1>中继名称</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>000.000</span></p>
              <p>/</p>
              <p>发射 <span>000.000</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>0</span></p>
              <p>/</p>
              <p>亚音 <span>TSQ88.5</span></p>
            </div>
          </div>
        </div>
        <div class="relayCard">
          <div class="relayName">
            <span>模拟</span>
            <h1>中继名称</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>000.000</span></p>
              <p>/</p>
              <p>发射 <span>000.000</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>0</span></p>
              <p>/</p>
              <p>亚音 <span>TSQ88.5</span></p>
            </div>
          </div>
        </div>
        <div class="relayCard">
          <div class="relayName">
            <span>模拟</span>
            <h1>中继名称</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>000.000</span></p>
              <p>/</p>
              <p>发射 <span>000.000</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>0</span></p>
              <p>/</p>
              <p>亚音 <span>TSQ88.5</span></p>
            </div>
          </div>
        </div>
        <div class="relayCard">
          <div class="relayName">
            <span>模拟</span>
            <h1>中继名称</h1>
          </div>
          <div class="relayFreq">
            <div class="frep_item">
              <p>接收 <span>000.000</span></p>
              <p>/</p>
              <p>发射 <span>000.000</span></p>
            </div>
            <div class="frep_item">
              <p>差频 <span>0</span></p>
              <p>/</p>
              <p>亚音 <span>TSQ88.5</span></p>
            </div>
          </div>
        </div>
      </div>
      <!--中继翻页胶囊-->
      <div class="relayList_page">
        <div class="pageitem pageActive"></div>
        <div class="pageitem"></div>
      </div>
    </div>

    <!--全部中继-->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../function/useTheme'
import { useLocation, on, off } from '../function/useLocation'
const theme = useTheme()
const { enabled, locationText } = useLocation()

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

// 解析定位文本，提取城市信息
const parseLocationText = (text: string): string => {
  if (!text || text === '定位中…' || text === '未启用位置服务') {
    return '***'
  }

  // 定位文本格式可能是 "省份, 城市" 或 "省份"
  if (text.includes(',')) {
    const parts = text.split(',')
    if (parts.length >= 2) {
      return parts[1].trim()
    } else {
      return parts[0].trim()
    }
  } else {
    return text.trim()
  }
}

// 处理定位服务状态变化
const handleLocationUpdate = (data: { enabled: boolean; text: string }) => {
  console.log('定位服务状态更新:', data)

  // 强制重新渲染组件
  renderKey.value += 1

  if (data.enabled && data.text) {
    const newCity = parseLocationText(data.text)
    const cachedCity = getCachedCity()

    // 只有当新城市与缓存不同时才更新显示和缓存
    if (newCity !== cachedCity) {
      locationCity.value = newCity
      saveCityToCache(newCity)
    } else if (locationCity.value === '***') {
      // 如果当前显示的是***，则使用缓存的城市
      locationCity.value = cachedCity
    }
  } else {
    locationCity.value = '***'
  }
}

// 监听定位服务状态和定位文本变化
watch([enabled, locationText], ([isEnabled, text]) => {
  console.log('监听到定位状态变化:', isEnabled, text)
  handleLocationUpdate({ enabled: isEnabled, text: text || '未启用位置服务' })
}, { immediate: true }) // 添加immediate: true确保立即执行一次

// 页面加载时，先从缓存获取城市
onMounted(() => {
  console.log('中继页面加载，当前定位状态:', enabled.value, locationText.value)

  const cachedCity = getCachedCity()
  if (cachedCity !== '***') {
    locationCity.value = cachedCity
  }

  // 监听定位服务状态变化事件
  on('location-updated', handleLocationUpdate)

  // 立即检查一次定位状态
  handleLocationUpdate({ enabled: enabled.value, text: locationText.value })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  off('location-updated', handleLocationUpdate)
})

// 导入所有图标
const icons = {
  中继查询: new URL('../assets/中继查询.svg', import.meta.url).href,
  中继查询_white: new URL('../assets/中继查询_white.svg', import.meta.url).href,
  搜索: new URL('../assets/搜索.svg', import.meta.url).href,
  搜索_white: new URL('../assets/搜索_white.svg', import.meta.url).href,
}
// 根据当前主题动态获取图标路径
const getIconPath = (iconName: string) => {
  const iconKey = theme.theme.value === 'dark' ? `${iconName}_white` : iconName
  return (icons as Record<string, string>)[iconKey]
}
</script>

<style scoped lang="less">
@import '../style/mixins.less';
@import '../style/hamrelay.less';
</style>
