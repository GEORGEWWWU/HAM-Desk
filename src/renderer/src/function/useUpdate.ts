import { ref } from 'vue'
import { GITHUB_REPO } from '../const'

export function useUpdate() {
  const checking = ref(false)
  const hasNew   = ref(false)
  const newVer   = ref('')
  let CURRENT    = '' // 异步赋值

  async function checkUpdate() {
    checking.value = true
    hasNew.value   = false
    newVer.value   = ''
    try {
      // ① 先拿本地版本号
      if (!CURRENT) CURRENT = await window.ipcRenderer.invoke('app:getVersion')
      // ② 再问 GitHub
      const rsp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      if (!rsp.ok) throw new Error('网络异常')
      const js = await rsp.json()
      if (js.tag_name && js.tag_name !== `v${CURRENT}`) {
        hasNew.value = true
        newVer.value = js.tag_name
      }
    } catch {
      // 网络失败留空，外部弹窗
    } finally {
      checking.value = false
    }
  }

  return { checking, hasNew, newVer, checkUpdate }
}
