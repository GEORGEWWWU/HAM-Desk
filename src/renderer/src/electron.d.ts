/// <reference types="vite/client" />

export { } // 变为模块作用域

declare global {
  interface Window {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>
      on(channel: string, listener: (...args: any[]) => void): void
      removeAllListeners(channel: string): void
    }
    electronAPI: {
      callsignRead(): Promise<string>
      callsignWrite(val: string): Promise<void>
      getSysTheme(): Promise<'light' | 'dark'>
      logOpenDir(): unknown
      // 日志相关
      logGetDir(): Promise<string>
      logSetDir(dir: string): Promise<void>
      logResetDir(): Promise<string>
      logSelectDir(): Promise<string | null>
      logRead(): Promise<any>
      logWrite(d: any): Promise<void>
      // 应用版本相关
      getAppVersion(): Promise<string>
      // 文件操作相关
      showSaveDialog: (options: SaveDialogOptions) => Promise<{ filePath?: string }>
      writeFile: (path: string, data: Buffer) => Promise<void>
      openFile: (filename: string) => Promise<{ success: boolean; error?: string }>
      // 复制资源文件
      copyAssetFile: (fileName: string, destPath: string) => Promise<{ success: boolean; error?: string }>
      // 获取资源文件路径
      getAssetPath: (fileName: string) => Promise<string>
      // 用户信息相关
      userRead: () => Promise<{ callsign: string; cert: string; devices: number; hamAge: number }>
      userWrite: (data: { callsign: string; cert: string; devices: number; hamAge: number }) => Promise<{ callsign: string; cert: string; devices: number; hamAge: number }>
      // 头像相关
      avatarUpdate: (tempPath: string) => Promise<{ success: boolean; error?: string; path?: string }>
      avatarSaveBlob: (blobUrl: string) => Promise<string>
      getUserAvatarPath: () => Promise<string>
      // 设备数据相关
      deviceRead: () => Promise<{ deviceList: Array<{ id: number; deviceName: string; deviceType: string }> }>
      deviceWrite: (data: { deviceList: Array<{ id: number; deviceName: string; deviceType: string }> }) => Promise<{ success: boolean; error?: any }>
      // HAM 地图数据相关
      getHamRss: () => Promise<string>
      // HAM地图相关
      openHamMaps: () => Promise<void>
    }
  }
}
