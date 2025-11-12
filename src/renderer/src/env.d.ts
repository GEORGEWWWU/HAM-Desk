/// <reference types="vite/client" />
export interface ElectronAPI {
  callsignRead(): Promise<string>
  callsignWrite(val: string): Promise<void>
  getSysTheme(): Promise<'light' | 'dark'>
  logGetDir(): Promise<string>
  logSetDir(dir: string): Promise<void>
  logResetDir(): Promise<string>
  logSelectDir(): Promise<string | null>
  logRead(): Promise<any[]>
  logWrite(d: any[]): Promise<void>
  logOpenDir(): Promise<void>
  getAppVersion(): Promise<string>
}

interface Window {
  electronAPI: ElectronAPI
  ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, listener: (...args: any[]) => void): void
    removeAllListeners(channel: string): void
  }
}
