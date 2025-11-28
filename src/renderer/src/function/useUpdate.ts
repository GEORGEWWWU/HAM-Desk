// function/useUpdate.ts

import { ref } from 'vue'
import { GITHUB_REPO } from '../const'

// 更新检查管理
export function useUpdate() {
  const checking = ref(false)
  const hasNew = ref(false)
  const newVer = ref('')
  let CURRENT = '' // 异步赋值

  // 检查更新
  async function checkUpdate(isAutoCheck = false) {
    checking.value = true
    hasNew.value = false
    newVer.value = ''
    try {
      // 先拿本地版本号
      if (!CURRENT) CURRENT = await window.electronAPI.getAppVersion()

      // 再问 GitHub - 使用正确的API获取最新发行版
      const rsp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)

      if (!rsp.ok) {
        if (rsp.status === 404) {
          // 仓库不存在或没有发布版本
          console.warn(`GitHub仓库 ${GITHUB_REPO} 不存在或没有发布版本`)
          if (!isAutoCheck) {
            throw new Error('仓库不存在或没有发布版本')
          }
        } else if (rsp.status === 403) {
          // API限制
          console.warn('GitHub API访问受限')
          if (!isAutoCheck) {
            throw new Error('API访问受限，请稍后再试')
          }
        } else {
          if (!isAutoCheck) {
            throw new Error(`网络错误: ${rsp.status}`)
          }
        }
      } else {
        const release = await rsp.json()

        // 检查是否有新版本
        if (release.tag_name && release.tag_name !== `v${CURRENT}`) {
          hasNew.value = true
          newVer.value = release.tag_name
          
          // 自动检查时有新版本则直接跳转到仓库
          if (isAutoCheck) {
            window.open(`https://github.com/${GITHUB_REPO}/releases/tag/${release.tag_name}`, '_blank')
          }
        } else {
          // 自动检查时无新版本，只输出控制台信息
          if (isAutoCheck) {
            console.log('当前已是最新版本')
          }
        }
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      // 自动检查时不抛出错误，避免弹窗
      if (!isAutoCheck) {
        // 重新抛出错误，让外部处理
        throw error
      }
    } finally {
      checking.value = false
    }
  }

  return { checking, hasNew, newVer, checkUpdate }
}
