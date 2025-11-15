// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

// 使用 contextBridge 暴露 API
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

// 使用 contextBridge 暴露 IPC 事件
contextBridge.exposeInMainWorld('electronAPI', {
  // 呼号读写相关
  callsignRead: () => ipcRenderer.invoke('callsign:read'),
  callsignWrite: (val: string) => ipcRenderer.invoke('callsign:write', val),
  // 系统主题相关
  getSysTheme: () => ipcRenderer.invoke('sys:getTheme'),
  // 日志相关
  logGetDir: () => ipcRenderer.invoke('log:getDir'),
  logSetDir: (dir: string) => ipcRenderer.invoke('log:setDir', dir),
  logResetDir: () => ipcRenderer.invoke('log:resetDir'),
  logSelectDir: () => ipcRenderer.invoke('log:selectDir'),
  logRead: () => ipcRenderer.invoke('log:read'),
  logWrite: (d: any[]) => ipcRenderer.invoke('log:write', d),
  logOpenDir: () => ipcRenderer.invoke('log:openDir'),
  // 应用版本相关
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  // 文件操作相关
  openFile: (filename: string) => ipcRenderer.invoke('file:open', filename),
  avatarUpdate: (tempPath: string) => ipcRenderer.invoke('avatar:update', tempPath),
  getUserAvatarPath: () => ipcRenderer.invoke('get-user-avatar-path'),
  userRead: () => ipcRenderer.invoke('user:read'),
  userWrite: (data: any) => ipcRenderer.invoke('user:write', data),
  avatarSaveBlob: (blobUrl: string) => ipcRenderer.invoke('avatar:saveBlob', blobUrl),
  downloadImage: (filename: string) => ipcRenderer.invoke('file:downloadImage', filename),
  // 复制资源文件
  copyAssetFile: (fileName: string, destPath: string) => ipcRenderer.invoke('copy-asset-file', fileName, destPath),
  // 获取资源文件路径
  getAssetPath: (fileName: string) => ipcRenderer.invoke('get-asset-path', fileName),
  // 设备数据相关
  deviceRead: () => ipcRenderer.invoke('device:read'),
  deviceWrite: (data: any) => ipcRenderer.invoke('device:write', data),
  // HAM 地图数据相关
  getHamRss: () => ipcRenderer.invoke('get-ham-rss'),
  // HAM地图相关
  openHamMaps: () => ipcRenderer.invoke('open-ham-maps')
})

// 监听系统主题变化事件
ipcRenderer.on('sys-theme', (_, t: 'light' | 'dark') => {
  window.dispatchEvent(new CustomEvent('sys-theme', { detail: t }))
})

// 暴露 ipcRenderer.invoke 方法
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
})
