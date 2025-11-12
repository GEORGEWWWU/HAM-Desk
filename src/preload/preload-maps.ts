// preload/preload-maps.ts
import { contextBridge, ipcRenderer } from 'electron'

// 使用 contextBridge 暴露 IPC 事件给地图窗口
contextBridge.exposeInMainWorld('electronAPI', {
  // HAM 地图数据相关 - 这是最关键的函数
  getHamRss: () => ipcRenderer.invoke('get-ham-rss'),
  // 文件操作相关 - 下载图片
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),
  // 复制资源文件
  copyAssetFile: (fileName, destPath) => ipcRenderer.invoke('copy-asset-file', fileName, destPath),
  // 获取资源文件路径
  getAssetPath: (fileName) => ipcRenderer.invoke('get-asset-path', fileName),
  // 系统主题相关
  getSysTheme: () => ipcRenderer.invoke('sys:getTheme'),
})

// 监听系统主题变化事件
ipcRenderer.on('sys-theme', (_, t: 'light' | 'dark') => {
  window.dispatchEvent(new CustomEvent('sys-theme', { detail: t }))
})
