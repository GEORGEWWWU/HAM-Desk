// src/renderer/src/function/useTheme.ts

/// <reference types="../env.d.ts" />
import { ref, watchEffect } from 'vue'

// 从 localStorage 加载初始值，首次默认开启跟随系统主题颜色
const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
const savedFollow = localStorage.getItem('followSystem')
if (savedFollow === null) {
  localStorage.setItem('followSystem', 'true')
}
// 跟随系统主题颜色开关
export const followSystem = ref(savedFollow === null ? true : savedFollow === 'true')
// 当前主题
export const theme = ref<'light' | 'dark'>(savedTheme || 'light')

// 系统主题推送事件
window.addEventListener('sys-theme', (e: Event) => {
  const custom = e as CustomEvent<'light' | 'dark'>
  if (followSystem.value) theme.value = custom.detail
})

// 主题切换函数
export function useTheme() {
  const toggleTheme = () => {
    followSystem.value = false
    localStorage.setItem('followSystem', 'false')
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  // 跟随系统切换函数
  const toggleFollowSystem = async (on: boolean) => {
    followSystem.value = on
    localStorage.setItem('followSystem', String(on))
    if (on) {
      // 立即应用当前系统色（通过 preload 接口）
      const current = await window.electronAPI.getSysTheme()
      theme.value = current
    }
  }

  // 监听 theme 变化，更新文档属性
  watchEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.value)
    if (!followSystem.value) localStorage.setItem('theme', theme.value)
  })

  // 返回主题相关状态和函数
  return { theme, toggleTheme, followSystem, toggleFollowSystem }
}
