// main/index.ts

import { app, shell, BrowserWindow, ipcMain, nativeTheme, dialog } from 'electron'
import { join, dirname, extname } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs, existsSync, unlinkSync, readdirSync, rmdirSync } from 'fs'
import { readFileSync, writeFileSync, copyFileSync } from 'fs'
import { ensureDirSync } from 'fs-extra'
import * as https from 'https'
import { writeFile } from 'fs/promises'

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
function ensureDataFile() {
  const dataDir = dirname(DATA_PATH)
  ensureDirSync(dataDir)

  try {
    readFileSync(DATA_PATH, 'utf-8')
  } catch {
    // 文件不存在，创建默认文件
    writeFileSync(DATA_PATH, JSON.stringify({ callsign: '' }, null, 2))
  }
}

// 确保设备数据文件存在
function ensureDeviceDataFile() {
  const dataDir = dirname(DEVICE_PATH)
  ensureDirSync(dataDir)

  try {
    readFileSync(DEVICE_PATH, 'utf-8')
  } catch {
    // 文件不存在，创建默认文件
    writeFileSync(DEVICE_PATH, JSON.stringify({ deviceList: [] }, null, 2))
  }
}

// 检查是否是首次安装或重新安装，如果是则重置数据
function checkFirstRun() {
  const userDataPath = app.getPath('userData')
  const firstRunFlagPath = join(userDataPath, '.firstrun')
  const versionFlagPath = join(userDataPath, '.version')

  try {
    // 获取当前应用版本
    const currentVersion = app.getVersion()
    console.log('当前应用版本:', currentVersion)

    // 检查版本标记文件是否存在且版本一致
    let isVersionChanged = false
    try {
      const savedVersion = readFileSync(versionFlagPath, 'utf-8')
      isVersionChanged = savedVersion !== currentVersion
      console.log('已保存版本:', savedVersion, '版本是否变化:', isVersionChanged)
    } catch {
      // 版本文件不存在，说明是首次安装或版本文件被删除
      isVersionChanged = true
      console.log('版本文件不存在，标记为需要重置')
    }

    // 检查首次运行标记文件是否存在
    const isFirstRun = !existsSync(firstRunFlagPath)

    // 如果是首次运行或版本变化，则重置数据
    if (isFirstRun || isVersionChanged) {
      console.log('检测到首次安装或版本变化，正在重置应用数据...')

      // 重置应用数据
      resetAppData()

      // 创建首次运行标记文件
      writeFileSync(firstRunFlagPath, new Date().toISOString())

      // 创建版本标记文件
      writeFileSync(versionFlagPath, currentVersion)

      console.log('应用数据重置完成')
    }
  } catch (error) {
    console.error('检查首次安装状态时出错:', error)
  }
}

// 重置应用数据
function resetAppData() {
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
    dataFiles.forEach(filePath => {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath)
          console.log(`已删除文件: ${filePath}`)
        }
      } catch (error) {
        console.error(`删除文件失败 ${filePath}:`, error)
      }
    })

    // 删除data目录及其内容
    try {
      if (existsSync(dataDir)) {
        const files = readdirSync(dataDir)
        files.forEach(file => {
          const filePath = join(dataDir, file)
          unlinkSync(filePath)
        })
        rmdirSync(dataDir)
        console.log(`已删除目录: ${dataDir}`)
      }
    } catch (error) {
      console.error(`删除目录失败 ${dataDir}:`, error)
    }

    // 重新创建默认数据文件
    ensureDataFile()
    ensureDeviceDataFile()
  } catch (error) {
    console.error('重置应用数据时出错:', error)
  }
}

// 创建主窗口
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 900,
    minHeight: 640,
    maxWidth: 984,
    maxHeight: 708,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 锁定窗口宽高比例（900:640 ≈ 1.41:1）
  mainWindow.setAspectRatio(900 / 640)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    sendTheme(mainWindow) //启动推送主题
    nativeTheme.on('updated', () => sendTheme(mainWindow)) //变化更新推送主题
  })

  // 添加页面加载失败处理
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('页面加载失败:', errorCode, errorDescription)
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
      console.error('加载HTML文件失败:', err)
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
    console.error('加载地图HTML文件失败:', err)
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
    ensureDirSync(assetsDir)

    const target = join(assetsDir, 'userAvatar.png')
    copyFileSync(tempPath, target)
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
ipcMain.handle('user:read', () => {
  try {
    // 确保用户数据文件存在
    const userDir = dirname(USER_JSON)
    ensureDirSync(userDir)

    try {
      readFileSync(USER_JSON, 'utf-8')
    } catch {
      // 文件不存在，创建默认文件
      writeFileSync(USER_JSON, JSON.stringify({ callsign: '', cert: 'A', devices: 0, hamAge: 0 }, null, 2))
    }

    return JSON.parse(readFileSync(USER_JSON, 'utf-8'))
  } catch {
    return { callsign: '', cert: 'A', devices: 0, hamAge: 0 }
  }
})
ipcMain.handle('user:write', (_, data) => {
  try {
    // 确保用户数据文件存在
    const userDir = dirname(USER_JSON)
    ensureDirSync(userDir)

    const old = JSON.parse(readFileSync(USER_JSON, 'utf-8'))
    const merged = { ...old, ...data }          // 合并
    if (JSON.stringify(merged) !== JSON.stringify(old)) {
      writeFileSync(USER_JSON, JSON.stringify(merged, null, 2))
    }
    return merged
  } catch (e) {
    console.error('[user:write]', e)
    // 如果出错，返回传入的数据作为默认值
    return data
  }
})

// 调用签名数据读写
ipcMain.handle('callsign:read', () => {
  try {
    ensureDataFile() // 确保文件存在
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8')).callsign ?? ''
  } catch (e) {
    console.error('[callsign:read]', e)
    return ''
  }
})

// 调用签名数据写入
ipcMain.handle('callsign:write', (_, val: string) => {
  try {
    ensureDataFile() // 确保文件存在
    writeFileSync(DATA_PATH, JSON.stringify({ callsign: val }, null, 2))
  } catch (e) {
    console.error('[callsign:write]', e)
  }
})

// 设备数据读取
ipcMain.handle('device:read', () => {
  try {
    ensureDeviceDataFile() // 确保文件存在
    return JSON.parse(readFileSync(DEVICE_PATH, 'utf-8'))
  } catch (e) {
    console.error('[device:read]', e)
    return { deviceList: [] }
  }
})

// 修改设备数据写入 IPC 处理器
ipcMain.handle('device:write', async (_, data: any) => {
  const startTime = Date.now()
  try {
    console.log('[device:write] 开始写入设备数据...')
    await ensureDeviceDataFileAsync() // 改为异步
    await fs.writeFile(DEVICE_PATH, JSON.stringify(data, null, 2)) // 异步写入
    console.log(`[device:write] 文件写入完成，总耗时: ${Date.now() - startTime}ms`)
    return { success: true }
  } catch (e) {
    console.error('[device:write]', e)
    return { success: false, error: e }
  }
})

// 新增异步版本的 ensure 函数
async function ensureDeviceDataFileAsync() {
  const dataDir = dirname(DEVICE_PATH)
  ensureDirSync(dataDir) // 目录创建可以保持同步

  try {
    await fs.access(DEVICE_PATH) // 检查文件是否存在
  } catch {
    // 文件不存在，创建默认文件
    await fs.writeFile(DEVICE_PATH, JSON.stringify({ deviceList: [] }, null, 2))
  }
}

// 默认目录：开发：src/renderer/src/data，发行：<exe>/data
const DEFAULT_DIR = isDev
  ? join(__dirname, '../../src/renderer/src/data')
  : join(app.getPath('userData'), 'data')

// 确保目录存在
ensureDirSync(DEFAULT_DIR)

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
ipcMain.handle('log:read', () => {
  const dir = (global as any).logDir || DEFAULT_DIR
  const file = join(dir, 'log.json')
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'))
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
ipcMain.handle('log:write', (_, data: any) => {
  const dir = (global as any).logDir || DEFAULT_DIR
  ensureDirSync(dir)
  const file = join(dir, 'log.json')

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

    writeFileSync(file, JSON.stringify(logData, null, 2))
    console.log('[log:write] 日志数据写入成功')
    return { success: true }
  } catch (error) {
    console.error('[log:write] 写入日志文件失败:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 打开日志存储目录
ipcMain.handle('log:openDir', async () => {
  const dir = (global as any).logDir || DEFAULT_DIR
  // 确保目录存在再打开
  ensureDirSync(dir)
  // 打开资源管理器并选中目录
  await shell.openPath(dir)
})

// 注册给渲染进程用的版本号通道
ipcMain.handle('app:getVersion', () => {
  const pkg = join(app.getAppPath(), 'package.json')
  return JSON.parse(readFileSync(pkg, 'utf-8')).version
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
    ensureDirSync(destDir)

    // 开发环境
    if (isDev) {
      const srcPath = join(app.getAppPath(), 'src', 'renderer', 'src', 'assets', fileName)
      console.log('开发环境复制文件:', srcPath, '->', destPath)
      copyFileSync(srcPath, destPath)
      return { success: true }
    }

    // 生产环境 - 尝试多个可能的资源路径
    let srcPath: string | undefined

    // 提取文件名和扩展名，用于匹配带哈希的文件
    const baseName = fileName.substring(0, fileName.lastIndexOf('.'))
    const extension = fileName.substring(fileName.lastIndexOf('.'))

    const possiblePaths = [
      join(process.resourcesPath, 'assets', fileName),
      join(process.resourcesPath, 'app.asar.unpacked', 'renderer', 'assets', fileName),
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
      console.log(`检查路径: ${path}, 存在: ${existsSync(path)}`)
      if (existsSync(path)) {
        srcPath = path
        break
      }
    }

    // 如果直接匹配失败，尝试匹配带哈希的文件
    if (!srcPath) {
      console.log('直接匹配失败，尝试匹配带哈希的文件...')

      // 检查每个可能的目录
      const possibleDirs = [
        join(process.resourcesPath, 'assets'),
        join(process.resourcesPath, 'app.asar.unpacked', 'renderer', 'assets'),
        join(app.getAppPath(), '..', 'app.asar.unpacked', 'renderer', 'assets'),
        join(app.getAppPath(), 'resources', 'assets'),
        join(app.getAppPath(), 'out', 'renderer', 'assets')
      ]

      for (const dir of possibleDirs) {
        if (existsSync(dir)) {
          try {
            const files = readdirSync(dir)
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
    }

    if (!srcPath) {
      throw new Error(`找不到资源文件: ${fileName}，已尝试以下路径:\n${possiblePaths.join('\n')}`)
    }

    console.log('生产环境复制文件:', srcPath, '->', destPath)
    copyFileSync(srcPath, destPath)
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
    const fileBuffer = readFileSync(resourcePath)
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

    // 检查文件是否存在
    if (existsSync(avatarPath)) {
      // 读取文件并返回base64编码的data URL
      const fileBuffer = readFileSync(avatarPath)
      const base64Data = fileBuffer.toString('base64')
      return `data:image/png;base64,${base64Data}`
    } else {
      // 如果用户头像不存在，返回默认头像
      if (isDev) {
        return new URL(`../renderer/src/assets/userAvatar_default.png`, import.meta.url).href
      } else {
        // 生产环境中，默认头像也需要从资源目录读取
        const defaultAvatarPath = join(process.resourcesPath, 'assets', 'userAvatar_default.png')
        const fileBuffer = readFileSync(defaultAvatarPath)
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
        const fileBuffer = readFileSync(defaultAvatarPath)
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
ipcMain.handle('write-file', (_, path, buffer) => {
  return writeFile(path, Buffer.from(buffer))
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

// 当 Electron 完成初始化并准备创建浏览器窗口时调用
// 一些 API 只能在该事件发生后使用
app.whenReady().then(() => {
  // 设置应用用户模型 ID 用于 Windows
  electronApp.setAppUserModelId('com.hamdesk.app')

  // 检查是否是首次安装或重新安装
  checkFirstRun()

  // 应用启动时确保数据文件存在
  ensureDataFile()
  ensureDeviceDataFile()

  createWindow()

  app.on('activate', function () {
    // 在 macOS 上，当 dock icon 被点击且没有其他窗口打开时，重新创建窗口
    // 这是 macOS 应用的标准行为
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

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
