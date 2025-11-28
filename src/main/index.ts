// main/index.ts

import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron'
import { join, dirname, extname } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'
import * as https from 'https'
import { writeFile } from 'fs/promises'
import * as XLSX from 'xlsx'

// 调用签名数据文件路径
const isDev = process.env.NODE_ENV === 'development'
const DATA_PATH = isDev
  ? join(app.getAppPath(), 'src', 'renderer', 'src', 'data', 'callsign.json')
  : join(app.getPath('userData'), 'callsign.json')
// 设备数据文件路径
const DEVICE_PATH = isDev
  ? join(app.getAppPath(), 'src', 'renderer', 'src', 'data', 'device.json')
  : join(app.getPath('userData'), 'device.json')

// 确保数据目录和文件存在
async function ensureDataFileAsync() {
  const dataDir = dirname(DATA_PATH)
  await ensureDirAsync(dataDir); // 使用异步目录创建

  try {
    await fs.access(DATA_PATH) // 检查文件是否存在
  } catch {
    // 文件不存在，创建默认文件
    await fs.writeFile(DATA_PATH, JSON.stringify({ callsign: '' }, null, 2))
  }
}

// 确保设备数据文件存在
async function ensureDeviceDataFileAsync() {
  const deviceDir = dirname(DEVICE_PATH)
  await ensureDirAsync(deviceDir); // 使用异步目录创建

  try {
    await fs.access(DEVICE_PATH) // 检查文件是否存在
  } catch {
    // 文件不存在，创建默认设备文件
    await fs.writeFile(DEVICE_PATH, JSON.stringify({ deviceList: [] }, null, 2))
  }
}

// 检查是否是首次安装或重新安装，如果是则重置数据
async function checkFirstRun() {
  const userDataPath = app.getPath('userData')
  const firstRunFlagPath = join(userDataPath, '.firstrun')
  const versionFlagPath = join(userDataPath, '.version')

  try {
    // 获取当前应用版本
    const currentVersion = app.getVersion()
    console.log('Current app version:', currentVersion)

    // 检查版本标记文件是否存在且版本一致
    let isVersionChanged = false
    try {
      const savedVersion = await fs.readFile(versionFlagPath, 'utf-8')
      isVersionChanged = savedVersion !== currentVersion
      console.log('Saved version:', savedVersion, 'Version changed:', isVersionChanged)
    } catch {
      // 版本文件不存在，说明是首次安装或版本文件被删除
      isVersionChanged = true
      console.log('Version file not found, marking as reset needed')
    }

    // 检查首次运行标记文件是否存在
    let isFirstRun = false
    try {
      await fs.access(firstRunFlagPath)
      isFirstRun = false
    } catch {
      isFirstRun = true
    }

    // 如果是首次运行或版本变化，则重置数据
    if (isFirstRun || isVersionChanged) {
      console.log('First run or version change detected, resetting app data...')

      // 重置应用数据
      await resetAppData()

      // 创建首次运行标记文件
      await fs.writeFile(firstRunFlagPath, new Date().toISOString())

      // 创建版本标记文件
      await fs.writeFile(versionFlagPath, currentVersion)

      console.log('App data reset completed')
    }
  } catch (error) {
    console.error('Error checking first run status:', error)
  }
}

// 重置应用数据
async function resetAppData() {
  try {
    const userDataPath = app.getPath('userData')
    const dataDir = join(userDataPath, 'data')

    // 要删除的数据文件列表
    const dataFiles = [
      join(userDataPath, 'callsign.json'),
      join(userDataPath, 'device.json'),
      join(userDataPath, 'log.json')
    ]

    // 删除数据文件
    for (const filePath of dataFiles) {
      try {
        // 使用异步检查文件是否存在
        try {
          await fs.access(filePath)
          // 如果文件存在，删除它
          await fs.unlink(filePath)
          console.log(`Deleted file: ${filePath}`)
        } catch {
          // 文件不存在，跳过
        }
      } catch (error) {
        console.error(`Failed to delete file ${filePath}:`, error)
      }
    }

    // 删除data目录及其内容
    try {
      // 使用异步检查目录是否存在
      try {
        await fs.access(dataDir)
        // 如果目录存在，读取其内容
        const files = await fs.readdir(dataDir)
        // 删除目录中的所有文件
        for (const file of files) {
          const filePath = join(dataDir, file)
          await fs.unlink(filePath)
        }
        // 删除空目录
        await fs.rmdir(dataDir)
        console.log(`Deleted directory: ${dataDir}`)
      } catch {
        // 目录不存在，跳过
      }
    } catch (error) {
      console.error(`Failed to delete directory ${dataDir}:`, error)
    }

    // 重新创建默认数据文件
    await ensureDataFileAsync()
    await ensureDeviceDataFileAsync()
  } catch (error) {
    console.error('Error resetting app data:', error)
  }
}

// 创建主窗口
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 900,
    minHeight: 640,
    maxWidth: 998,
    maxHeight: 725,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 锁定窗口宽高比例
  mainWindow.setAspectRatio(900 / 640)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    sendTheme(mainWindow) //启动推送主题
    nativeTheme.on('updated', () => sendTheme(mainWindow)) //变化更新推送主题
    
    // 应用启动时发送自动检查更新消息
    mainWindow.webContents.send('app:startup')
  })

  // 添加页面加载失败处理
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Page load failed:', errorCode, errorDescription)
    // 即使加载失败也显示窗口，避免应用卡在后台
    mainWindow.show()
  })

  // 添加控制台消息监听，便于调试
  if (!is.dev) {
    mainWindow.webContents.on('console-message', (_event, level, message, _line, _sourceId) => {
      if (level >= 2) { // 只记录警告和错误
        console.error(`[Renderer] ${message}`)
      }
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载渲染进程
  // 开发环境：加载远程URL
  // 生产环境：加载本地HTML文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch(err => {
      console.error('Failed to load HTML file:', err)
      // 即使加载失败也显示窗口
      mainWindow.show()
    })
  }
}

// 创建HAM地图窗口
let mapsWindow: BrowserWindow | null = null
function createMapsWindow(): void {
  // 如果窗口已存在，聚焦到现有窗口而不是创建新窗口
  if (mapsWindow && !mapsWindow.isDestroyed()) {
    if (mapsWindow.isMinimized()) {
      mapsWindow.restore()
    }
    mapsWindow.focus()
    return
  }

  mapsWindow = new BrowserWindow({
    width: 930,
    height: 630,
    minWidth: 930,
    minHeight: 630,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/preload-maps.js'),
      contextIsolation: true,
      sandbox: false
    }
  })

  // 锁定窗口宽高比例（820:590 ≈ 1.39:1）
  mapsWindow.setAspectRatio(820 / 590)

  mapsWindow.on('ready-to-show', () => {
    mapsWindow!.show()
    sendTheme(mapsWindow!) //启动推送主题
    nativeTheme.on('updated', () => sendTheme(mapsWindow!)) //变化更新推送主题
  })

  // 窗口关闭时清理引用
  mapsWindow.on('closed', () => {
    mapsWindow = null
  })

  mapsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const mapsHTML = is.dev
    ? `${process.env.ELECTRON_RENDERER_URL}/maps.html`
    : `file://${join(__dirname, '../renderer/maps.html')}`

  mapsWindow.loadURL(mapsHTML).catch(err => {
    console.error('Failed to load maps HTML file:', err)
    // 即使加载失败也显示窗口
    mapsWindow!.show()
  })
}

// IPC通信：打开HAM地图窗口
ipcMain.handle('open-ham-maps', () => {
  createMapsWindow()
})

// 头像：渲染进程把文件路径发过来，主进程复制到用户数据目录
ipcMain.handle('avatar:update', async (_, tempPath: string) => {
  try {
    // 在生产环境中，将头像保存到用户数据目录，而不是应用安装目录
    const userDataDir = app.getPath('userData')
    const assetsDir = isDev
      ? join(app.getAppPath(), 'src', 'renderer', 'src', 'assets')
      : userDataDir

    // 确保目录存在
    await ensureDirAsync(assetsDir) // 使用异步目录创建

    const target = join(assetsDir, 'userAvatar.png')
    // 使用异步复制替代同步复制
    await fs.copyFile(tempPath, target)
    return { success: true, path: target }
  } catch (error) {
    console.error('[avatar:update]', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})
// 渲染层把 blob URL 发过来，主进程下载到临时目录并返回真实路径
ipcMain.handle('avatar:saveBlob', async (_, blobUrl: string) => {
  const temp = join(app.getPath('temp'), 'ham_avatar_tmp.png')
  const wc = BrowserWindow.getFocusedWindow()!.webContents
  return new Promise<string>((resolve, reject) => {
    wc.session.once('will-download', (_, item) => {
      item.setSavePath(temp)
      item.once('done', (_, state) => {
        if (state === 'completed') resolve(temp)
        else reject(new Error('download failed'))
      })
    })
    wc.downloadURL(blobUrl)
  })
})

// 用户信息读写（合并字段）
const USER_JSON = isDev
  ? join(app.getAppPath(), 'src', 'renderer', 'src', 'data', 'callsign.json')
  : join(app.getPath('userData'), 'callsign.json')
ipcMain.handle('user:read', async () => {
  try {
    // 确保用户数据文件存在
    const userDir = dirname(USER_JSON)
    await ensureDirAsync(userDir) // 使用异步目录创建

    try {
      await fs.access(USER_JSON) // 使用异步检查文件是否存在
    } catch {
      // 文件不存在，创建默认文件
      await fs.writeFile(USER_JSON, JSON.stringify({ callsign: '', cert: 'A', devices: 0, hamAge: 0 }, null, 2))
    }

    const data = await fs.readFile(USER_JSON, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { callsign: '', cert: 'A', devices: 0, hamAge: 0 }
  }
})
// 用户信息写入（合并字段）
const userWriteHandler = async (_, data) => {
  try {
    // 确保用户数据文件存在
    const userDir = dirname(USER_JSON)
    await ensureDirAsync(userDir) // 使用异步目录创建

    try {
      await fs.access(USER_JSON) // 使用异步检查文件是否存在
    } catch {
      // 文件不存在，创建默认文件
      await fs.writeFile(USER_JSON, JSON.stringify({ callsign: '', cert: 'A', devices: 0, hamAge: 0 }, null, 2))
    }

    const old = JSON.parse(await fs.readFile(USER_JSON, 'utf-8'))
    const merged = { ...old, ...data }          // 合并
    if (JSON.stringify(merged) !== JSON.stringify(old)) {
      await fs.writeFile(USER_JSON, JSON.stringify(merged, null, 2))
    }
    return merged
  } catch (e) {
    console.error('[user:write]', e)
    // 如果出错，返回传入的数据作为默认值
    return data
  }
}

// 使用焦点管理包装用户信息写入操作
wrapIpcWithFocusManagement('user:write', userWriteHandler)

// 调用签名数据读写
ipcMain.handle('callsign:read', async () => {
  try {
    await ensureDataFileAsync() // 使用异步版本确保文件存在
    const data = await fs.readFile(DATA_PATH, 'utf-8')
    return JSON.parse(data).callsign ?? ''
  } catch (e) {
    console.error('[callsign:read]', e)
    return ''
  }
})

// 调用签名数据写入
const callsignWriteHandler = async (_, val: string) => {
  try {
    await ensureDataFileAsync() // 使用异步版本确保文件存在
    await fs.writeFile(DATA_PATH, JSON.stringify({ callsign: val }, null, 2))
  } catch (e) {
    console.error('[callsign:write]', e)
  }
}

// 使用焦点管理包装呼号写入操作
wrapIpcWithFocusManagement('callsign:write', callsignWriteHandler)

// 设备数据读取
ipcMain.handle('device:read', async () => {
  try {
    await ensureDeviceDataFileAsync() // 使用异步版本确保文件存在
    const data = await fs.readFile(DEVICE_PATH, 'utf-8')
    const parsedData = JSON.parse(data)

    // 兼容两种数据格式：直接数组格式和包含deviceList属性的对象格式
    if (Array.isArray(parsedData)) {
      // 如果是直接数组格式，直接返回
      return parsedData
    } else if (parsedData && parsedData.deviceList && Array.isArray(parsedData.deviceList)) {
      // 如果是包含deviceList属性的对象格式，返回整个对象
      return parsedData
    } else {
      // 其他情况，返回默认格式
      console.warn('[device:read] 设备数据格式不正确，返回默认格式:', parsedData)
      return { deviceList: [] }
    }
  } catch (e) {
    console.error('[device:read]', e)
    return { deviceList: [] }
  }
})

// 设备数据写入
const deviceWriteHandler = async (_, data: any) => {
  const timeout = 10000 // 10秒超时

  try {

    // 使用Promise.race实现超时保护
    const writePromise = async () => {
      await ensureDeviceDataFileAsync()
      await fs.writeFile(DEVICE_PATH, JSON.stringify(data, null, 2))
      return { success: true }
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('写入操作超时')), timeout)
    })

    const result = await Promise.race([writePromise(), timeoutPromise])

    return result
  } catch (e) {
    console.error('[device:write] 写入失败:', e)
    console.error('[device:write] 错误详情:', e instanceof Error ? e.stack : String(e))
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// 使用焦点管理包装设备数据写入操作
wrapIpcWithFocusManagement('device:write', deviceWriteHandler)

// 日志数据写入 - 添加超时保护和优化
const logWriteHandler = async (_, data: any) => {
  const timeout = 10000 // 10秒超时

  try {

    // 确保数据是正确的格式
    let logData
    if (data && typeof data === 'object' && 'logs' in data) {
      // 已经是正确的LogData格式
      logData = data
    } else if (Array.isArray(data)) {
      // 如果是数组，转换为LogData格式
      logData = {
        logs: data,
        statistics: {
          totalContacts: data.length,
          lastContact: data.length > 0 ? data[data.length - 1].datetime || new Date().toISOString() : new Date().toISOString()
        }
      }
    } else {
      console.error('[log:write] 无效的数据格式:', data)
      return { success: false, error: '无效的数据格式' }
    }

    // 使用Promise.race实现超时保护
    const writePromise = async () => {
      const dir = (global as any).logDir || DEFAULT_DIR
      await ensureDirAsync(dir) // 使用异步目录创建
      const file = join(dir, 'log.json')

      await fs.writeFile(file, JSON.stringify(logData, null, 2))
      return { success: true }
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('写入操作超时')), timeout)
    })

    const result = await Promise.race([writePromise(), timeoutPromise])

    return result
  } catch (error) {
    console.error('[log:write] 写入失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 使用焦点管理包装日志数据写入操作
wrapIpcWithFocusManagement('log:write', logWriteHandler)

// 默认目录：开发：src/renderer/src/data，发行：<exe>/data
const DEFAULT_DIR = isDev
  ? join(__dirname, '../../src/renderer/src/data')
  : join(app.getPath('userData'), 'data')

// 异步初始化默认目录
async function initDefaultDir() {
  await ensureDirAsync(DEFAULT_DIR)
}

// 异步版本的ensureDirSync
async function ensureDirAsync(dir: string) {
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

// 读取日志目录（若用户改过则优先用存储的）
ipcMain.handle('log:getDir', () => {
  const saved = (global as any).logDir // 临时放全局，后面可换 electron-store
  return saved || DEFAULT_DIR
})

// 保存日志目录
ipcMain.handle('log:setDir', (_, dir: string) => {
  ; (global as any).logDir = dir
})

// 恢复默认目录
ipcMain.handle('log:resetDir', () => {
  ; (global as any).logDir = null
  return DEFAULT_DIR
})

// 打开选择目录对话框
ipcMain.handle('log:selectDir', async () => {
  const res = await dialog.showOpenDialog({
    title: '选择日志存储目录',
    properties: ['openDirectory']
  })
  return res.canceled ? null : res.filePaths[0]
})

// 读/写 log.json（文件名为 log.json）
ipcMain.handle('log:read', async () => {
  const dir = (global as any).logDir || DEFAULT_DIR
  const file = join(dir, 'log.json')
  try {
    const data = JSON.parse(await fs.readFile(file, 'utf-8'))
    // 确保返回的数据格式一致
    if (data && typeof data === 'object' && 'logs' in data) {
      return data
    } else if (Array.isArray(data)) {
      // 如果是数组格式，转换为对象格式
      return { logs: data, statistics: { totalContacts: data.length, lastContact: new Date().toISOString() } }
    } else {
      // 默认返回空数据结构
      return { logs: [], statistics: { totalContacts: 0, lastContact: new Date().toISOString() } }
    }
  } catch (error) {
    console.error('[log:read] 读取日志文件失败:', error)
    // 首次或错误时返回默认结构
    return { logs: [], statistics: { totalContacts: 0, lastContact: new Date().toISOString() } }
  }
})

// 打开日志存储目录
ipcMain.handle('log:openDir', async () => {
  const dir = (global as any).logDir || DEFAULT_DIR
  // 确保目录存在再打开
  await ensureDirAsync(dir) // 使用异步目录创建
  // 打开资源管理器并选中目录
  await shell.openPath(dir)
})

// 获取data目录下所有JSON文件
ipcMain.handle('data:getAllJsonFiles', async () => {
  try {
    const dir = (global as any).logDir || DEFAULT_DIR
    await ensureDirAsync(dir) // 确保目录存在

    // 读取目录中的所有文件
    const files = await fs.readdir(dir)

    // 过滤出JSON文件
    const jsonFiles = files.filter(file => file.endsWith('.json'))

    // 读取每个JSON文件的内容
    const jsonData = {}
    for (const file of jsonFiles) {
      const filePath = join(dir, file)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        jsonData[file] = JSON.parse(content)
      } catch (error) {
        console.error(`Failed to read file ${file}:`, error)
      }
    }

    return jsonData
  } catch (error) {
    console.error('Failed to get JSON files:', error)
    return {}
  }
})

// 导出日志数据为CSV
ipcMain.handle('log:exportToCsv', async () => {
  try {
    const dir = (global as any).logDir || DEFAULT_DIR
    await ensureDirAsync(dir) // 确保目录存在

    // 读取日志文件
    const logFilePath = join(dir, 'log.json')
    const logContent = await fs.readFile(logFilePath, 'utf-8')
    const logData = JSON.parse(logContent)

    // 检查是否有日志数据
    if (!logData.logs || !Array.isArray(logData.logs) || logData.logs.length === 0) {
      return { success: false, error: '没有日志数据可导出' }
    }

    // 返回日志数据，由渲染进程处理CSV转换
    return { success: true, data: logData.logs }
  } catch (error) {
    console.error('Failed to export log to CSV:', error)
    return { success: false, error: '导出日志失败' }
  }
})

// 注册给渲染进程用的版本号通道
ipcMain.handle('app:getVersion', async () => {
  const pkg = join(app.getAppPath(), 'package.json')
  return JSON.parse(await fs.readFile(pkg, 'utf-8')).version
})

// 系统主题读取
ipcMain.handle('sys:getTheme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')

// 系统主题推送
function sendTheme(win: BrowserWindow) {
  const current = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  win.webContents.send('sys-theme', current)
}

// 太平洋网络 IP 接口（无 key、无 QPS）
ipcMain.handle('ip-geo', async () => {
  try {
    // 用浏览器标签加载，等页面跑完再拿结果
    const { BrowserWindow } = require('electron')
    const capture = new BrowserWindow({
      width: 500, height: 400, show: false, webPreferences: { sandbox: true }
    })
    await capture.loadURL('https://whois.pconline.com.cn/ipJson.jsp?json=true ', {
      userAgent: 'Mozilla/5.0' // 防止拦截
    })
    // 等 JS 执行完直接拿 body 文本
    const txt: string = await capture.webContents.executeJavaScript(
      'document.body.innerText || document.body.textContent'
    )
    capture.close() // 立刻关掉，用户无感知
    const j = JSON.parse(txt.trim())
    return j.city ? `${j.pro}, ${j.city}` : j.pro
  } catch {
    return '未知地区，请检查网络连接或重新开启定位服务'
  }
})

// 打开文件
ipcMain.handle('file:open', async (_, filename: string) => {
  try {
    const filePath = join(app.getAppPath(), filename)
    await shell.openPath(filePath)
    return { success: true }
  } catch (error) {
    console.error('[file:open]', error)
    return { success: false, error: '无法打开文件' }
  }
})

// 复制资源文件到用户指定位置
ipcMain.handle('copy-asset-file', async (_, fileName: string, destPath: string) => {
  try {
    // 确保目标目录存在
    const destDir = dirname(destPath)
    await ensureDirAsync(destDir) // 使用异步目录创建

    // 开发环境
    if (isDev) {
      const srcPath = join(app.getAppPath(), 'src', 'renderer', 'src', 'assets', fileName)
      console.log('开发环境复制文件:', srcPath, '->', destPath)
      await fs.copyFile(srcPath, destPath) // 使用异步复制
      return { success: true }
    }

    // 生产环境 - 尝试多个可能的资源路径
    let srcPath: string | undefined

    // 提取文件名和扩展名，用于匹配带哈希的文件
    const baseName = fileName.substring(0, fileName.lastIndexOf('.'))
    const extension = fileName.substring(fileName.lastIndexOf('.'))

    // 根据electron-builder的配置，资源文件会被复制到process.resourcesPath下的assets目录
    const possiblePaths = [
      join(process.resourcesPath, 'assets', fileName), // 首选路径：extraResources配置的路径
      join(process.resourcesPath, 'app.asar.unpacked', 'renderer', 'assets', fileName), // asarUnpack配置的路径
      join(app.getAppPath(), '..', 'app.asar.unpacked', 'renderer', 'assets', fileName),
      join(app.getAppPath(), 'resources', 'assets', fileName),
      join(app.getAppPath(), 'out', 'renderer', 'assets', fileName)
    ]

    // 打印所有可能的路径用于调试
    console.log('尝试以下路径查找文件:', fileName)
    console.log('process.resourcesPath:', process.resourcesPath)
    console.log('app.getAppPath():', app.getAppPath())

    // 首先尝试直接匹配文件名
    for (const path of possiblePaths) {
      // 使用异步检查文件是否存在
      try {
        await fs.access(path)
        console.log(`找到文件: ${path}`)
        srcPath = path
        break
      } catch {
        // 文件不存在，继续尝试下一个路径
        console.log(`文件不存在: ${path}`)
      }
    }

    // 如果直接匹配失败，尝试匹配带哈希的文件
    if (!srcPath) {
      console.log('直接匹配失败，尝试匹配带哈希的文件...')

      // 检查每个可能的目录
      const possibleDirs = [
        join(process.resourcesPath, 'assets'), // 首选目录
        join(process.resourcesPath, 'app.asar.unpacked', 'renderer', 'assets'),
        join(app.getAppPath(), '..', 'app.asar.unpacked', 'renderer', 'assets'),
        join(app.getAppPath(), 'resources', 'assets'),
        join(app.getAppPath(), 'out', 'renderer', 'assets')
      ]

      for (const dir of possibleDirs) {
        // 使用异步检查目录是否存在
        try {
          await fs.access(dir)
          const files = await fs.readdir(dir)
          // 查找匹配模式的文件（文件名包含原始名称，扩展名相同）
          const matchedFile = files.find(file => {
            return file.includes(baseName) && file.endsWith(extension)
          })

          if (matchedFile) {
            srcPath = join(dir, matchedFile)
            console.log(`找到匹配文件: ${srcPath}`)
            break
          }
        } catch (error) {
          console.error(`读取目录失败: ${dir}`, error)
        }
      }
    }

    if (!srcPath) {
      throw new Error(`找不到资源文件: ${fileName}，已尝试以下路径:\n${possiblePaths.join('\n')}`)
    }

    console.log('生产环境复制文件:', srcPath, '->', destPath)
    await fs.copyFile(srcPath, destPath) // 使用异步复制
    return { success: true }
  } catch (error: any) {
    console.error('Failed to copy asset file:', error)
    return { success: false, error: error.message }
  }
})

// 获取资源文件路径
ipcMain.handle('get-asset-path', async (_, fileName: string) => {
  // 开发环境直接返回资源URL
  if (isDev) {
    return new URL(`../renderer/src/assets/${fileName}`, import.meta.url).href
  }

  // 生产环境需要读取资源文件并返回base64编码的data URL
  try {
    // 首先尝试从resources目录读取
    const resourcePath = join(process.resourcesPath, 'assets', fileName)
    const fileBuffer = await fs.readFile(resourcePath)
    const base64Data = fileBuffer.toString('base64')

    // 根据文件扩展名确定MIME类型
    const ext = extname(fileName).toLowerCase()
    let mimeType = 'image/png'

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg'
        break
      case '.gif':
        mimeType = 'image/gif'
        break
      case '.svg':
        mimeType = 'image/svg+xml'
        break
      case '.png':
        mimeType = 'image/png'
        break
    }

    return `data:${mimeType};base64,${base64Data}`
  } catch (error) {
    console.error('Failed to load asset:', fileName, error)
    throw error
  }
})

// 获取用户头像路径
ipcMain.handle('get-user-avatar-path', async () => {
  try {
    // 在生产环境中，用户头像保存在用户数据目录
    const userDataDir = app.getPath('userData')
    const avatarPath = isDev
      ? join(app.getAppPath(), 'src', 'renderer', 'src', 'assets', 'userAvatar.png')
      : join(userDataDir, 'userAvatar.png')

    // 使用异步检查文件是否存在
    try {
      await fs.access(avatarPath)
      // 读取文件并返回base64编码的data URL
      const fileBuffer = await fs.readFile(avatarPath)
      const base64Data = fileBuffer.toString('base64')
      return `data:image/png;base64,${base64Data}`
    } catch {
      // 如果用户头像不存在，返回默认头像
      if (isDev) {
        return new URL(`../renderer/src/assets/userAvatar_default.png`, import.meta.url).href
      } else {
        // 生产环境中，默认头像也需要从资源目录读取
        const defaultAvatarPath = join(process.resourcesPath, 'assets', 'userAvatar_default.png')
        const fileBuffer = await fs.readFile(defaultAvatarPath)
        const base64Data = fileBuffer.toString('base64')
        return `data:image/png;base64,${base64Data}`
      }
    }
  } catch (error) {
    console.error('Failed to get user avatar path:', error)
    // 出错时返回默认头像
    if (isDev) {
      return new URL(`../renderer/src/assets/userAvatar_default.png`, import.meta.url).href
    } else {
      try {
        const defaultAvatarPath = join(process.resourcesPath, 'assets', 'userAvatar_default.png')
        const fileBuffer = await fs.readFile(defaultAvatarPath)
        const base64Data = fileBuffer.toString('base64')
        return `data:image/png;base64,${base64Data}`
      } catch (defaultError) {
        console.error('Failed to load default avatar:', defaultError)
        throw error
      }
    }
  }
})

// 地图保存对话框
ipcMain.handle('show-save-dialog', (_, options) => {
  return dialog.showSaveDialog(options)
})

// 写入地图文件
ipcMain.handle('write-file', async (_, path, buffer) => {
  return await writeFile(path, Buffer.from(buffer))
})

// 获取 HAM 地图数据
ipcMain.handle('get-ham-rss', async () => {
  return new Promise<string>((resolve, reject) => {
    https.get('https://www.hamqsl.com/solarrss.php', res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve(body))
    }).on('error', reject)
  }) // 异步获取 RSS 内容（后续维护需更换订阅地址则修改这里）
})

// 获取应用路径
ipcMain.handle('get-app-path', () => {
  return app.getAppPath()
})

// 读取中继台Excel数据
ipcMain.handle('read-relay-excel', async () => {
  try {
    // 确定Excel文件路径
    const excelFilePath = isDev
      ? join(app.getAppPath(), 'src', 'renderer', 'src', 'data', '全国UV段模拟中继（BD8FTD维护）.xlsx')
      : join(process.resourcesPath, 'data', '全国UV段模拟中继（BD8FTD维护）.xlsx')

    // 检查文件是否存在
    try {
      await fs.access(excelFilePath)
    } catch (error) {
      console.error('Excel文件不存在:', excelFilePath)
      return { success: false, error: 'Excel文件不存在', data: [] }
    }

    // 读取Excel文件
    const fileBuffer = await fs.readFile(excelFilePath)
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // 将工作表转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    return { success: true, data: jsonData }
  } catch (error) {
    console.error('读取Excel文件失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error), data: [] }
  }
})


// 窗口焦点管理函数
async function refreshWindowFocus() {
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 记录当前焦点状态
    const wasFocused = mainWindow.isFocused()

    // 如果窗口当前有焦点，先使其失去焦点
    if (wasFocused) {
      mainWindow.blur()

      // 短暂延迟后重新获得焦点
      await new Promise(resolve => setTimeout(resolve, 10))

      // 重新聚焦窗口
      mainWindow.focus()
    }
  }
}

// 包装数据操作IPC处理函数，添加焦点管理
function wrapIpcWithFocusManagement(channel: string, originalHandler: Function) {
  ipcMain.handle(channel, async (...args: any[]) => {
    try {
      // 执行原始数据操作
      const result = await originalHandler(...args)

      // 数据操作完成后刷新窗口焦点
      await refreshWindowFocus()

      return result
    } catch (error) {
      console.error(`[${channel}] 操作失败:`, error)
      throw error
    }
  })
}

// 添加全局异常处理，防止应用静默崩溃
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
  // 确保窗口显示，即使用户界面出现错误
  const windows = BrowserWindow.getAllWindows()
  windows.forEach(win => {
    if (!win.isDestroyed() && !win.isVisible()) {
      win.show()
    }
  })
})

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason)
})

// 当 Electron 完成初始化并准备创建浏览器窗口时调用
// 一些 API 只能在该事件发生后使用
app.whenReady().then(async () => {
  // 设置应用用户模型 ID 用于 Windows
  electronApp.setAppUserModelId('com.hamdesk.app')

  // 异步初始化默认目录
  await initDefaultDir()

  // 检查是否是首次安装或重新安装
  await checkFirstRun()

  // 应用启动时确保数据文件存在
  await ensureDataFileAsync()
  await ensureDeviceDataFileAsync()

  createWindow()

  app.on('activate', function () {
    // 在 macOS 上，当 dock icon 被点击且没有其他窗口打开时，重新创建窗口
    // 这是 macOS 应用的标准行为
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 当所有窗口关闭时调用
// 除非在 macOS 上，否则应用会继续运行，直到用户显式退出（Cmd + Q）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  // 这里可以添加退出前的清理工作
})

// 应用卸载时清理数据
if (process.platform === 'win32') {
  const squirrelEvent = process.argv[1]
  switch (squirrelEvent) {
    case '--squirrel-uninstall':
      // 卸载时删除用户数据目录
      try {
        const userDataPath = app.getPath('userData')
        console.log('应用卸载，清理用户数据:', userDataPath)
        // 这里可以添加删除用户数据的逻辑
      } catch (error) {
        console.error('卸载清理失败:', error)
      }
      app.quit()
      break
  }
}
