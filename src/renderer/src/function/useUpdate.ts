import { ref } from 'vue'
import { GITHUB_REPO } from '../const'

export function useUpdate() {
  const checking = ref(false)
  const hasNew = ref(false)
  const newVer = ref('')
  let CURRENT = '' // 异步赋值

  async function checkUpdate() {
    checking.value = true
    hasNew.value = false
    newVer.value = ''
    try {
      // ① 先拿本地版本号
      if (!CURRENT) CURRENT = await window.electronAPI.getAppVersion()
      
      // ② 再问 GitHub - 使用正确的API获取最新发行版
      const rsp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      
      if (!rsp.ok) {
        if (rsp.status === 404) {
          // 仓库不存在或没有发布版本
          console.warn(`GitHub仓库 ${GITHUB_REPO} 不存在或没有发布版本`)
          throw new Error('仓库不存在或没有发布版本')
        } else if (rsp.status === 403) {
          // API限制
          console.warn('GitHub API访问受限')
          throw new Error('API访问受限，请稍后再试')
        } else {
          throw new Error(`网络错误: ${rsp.status}`)
        }
      }
      
      const release = await rsp.json()
      
      // 检查是否有新版本
      if (release.tag_name && release.tag_name !== `v${CURRENT}`) {
        hasNew.value = true
        newVer.value = release.tag_name
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      // 重新抛出错误，让外部处理
      throw error
    } finally {
      checking.value = false
    }
  }

  return { checking, hasNew, newVer, checkUpdate }
}
