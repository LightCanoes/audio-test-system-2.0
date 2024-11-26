import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import { join } from 'path'
import { AudioManager } from './audioManager'
import { TestManager } from './testManager'
import { DataManager } from './dataManager'
import { networkInterfaces } from 'os'

let mainWindow: BrowserWindow | null = null
let testWindow: BrowserWindow | null = null
let audioManager: AudioManager | null = null
let testManager: TestManager | null = null
let dataManager: DataManager | null = null

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const createTestWindow = async (testData: any) => {
  if (testWindow) {
    testWindow.focus()
    return
  }

  // 启动WebSocket服务器
  testManager?.startServer()

  testWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (!app.isPackaged) {
    await testWindow.loadURL('http://localhost:5173/#/test')
  } else {
    await testWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'test'
    })
  }

  testWindow.webContents.once('did-finish-load', () => {
    testWindow?.webContents.send('init-test-data', testData)
  })

  testWindow.on('closed', () => {
    testWindow = null
    testManager?.stopServer()
  })
}

const setupIpcHandlers = () => {
  // 音频相关
  ipcMain.handle('play-audio', (event, fileId) => audioManager?.playAudio(fileId))
  ipcMain.handle('pause-audio', () => audioManager?.pauseAudio())
  ipcMain.handle('resume-audio', () => audioManager?.resumeAudio())
  ipcMain.handle('stop-audio', () => audioManager?.stopAudio())
  ipcMain.handle('get-audio-files', () => audioManager?.getAudioFiles())
  ipcMain.handle('import-audio-files', () => audioManager?.importAudioFiles())
  ipcMain.handle('delete-audio-file', (event, fileId) => audioManager?.deleteAudioFile(fileId))

  // 获取网络地址
  ipcMain.handle('get-network-addresses', () => {
    const nets = networkInterfaces()
    const addresses: string[] = []
    
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name]
      if (interfaces) {
        for (const net of interfaces) {
          if (net.family === 'IPv4' && !net.internal) {
            addresses.push(net.address)
          }
        }
      }
    }
    
    return addresses
  })

  // 数据管理相关
  ipcMain.handle('save-test-data', async (event, data) => {
    try {
      await dataManager?.saveTestData(data)
    } catch (error) {
      console.error('Failed to save test data:', error)
      throw error
    }
  })

  ipcMain.handle('load-test-data', async () => {
    try {
      return await dataManager?.loadTestData()
    } catch (error) {
      console.error('Failed to load test data:', error)
      throw error
    }
  })

  // 测试窗口相关
  ipcMain.handle('create-test-window', async (event, testData) => {
    await createTestWindow(testData)
  })

  // 文件管理相关
  ipcMain.handle('save-test-settings-to-file', () => {
    return dataManager?.saveTestSettingsToFile()
  })

  ipcMain.handle('load-test-settings-from-file', () => {
    return dataManager?.loadTestSettingsFromFile()
  })
}

app.whenReady().then(async () => {
  // 注册自定义协议
  protocol.registerFileProtocol('audio-file', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('audio-file://', ''))
    callback({ path: filePath })
  })

  // 初始化管理器
  audioManager = new AudioManager(app.getPath('userData'))
  await audioManager.loadInitialFiles()
  
  dataManager = new DataManager(app.getPath('userData'))
  await dataManager.init()
  
  testManager = new TestManager()

  // 设置IPC处理程序
  setupIpcHandlers()

  // 创建窗口
  createMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.on('before-quit', () => {
  testManager?.stopServer()
})