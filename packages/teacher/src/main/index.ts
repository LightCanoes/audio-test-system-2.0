// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { AudioManager } from './audioManager'
import { TestManager } from './testManager'
import { DataManager } from './dataManager'
import { networkInterfaces } from 'os'
import type { TestSettings } from '../renderer/types'

// 添加这个配置来禁用字体警告
app.commandLine.appendSwitch('disable-features', 'DebugCTFontUsage')

let mainWindow: BrowserWindow | null = null
let testWindow: BrowserWindow | null = null
let audioManager: AudioManager | null = null
let testManager: TestManager | null = null
let dataManager: DataManager | null = null

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1600,  // 更大的默认窗口尺寸
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      // 添加以下配置
      defaultFontFamily: {
        standard: 'Helvetica',
        sansSerif: 'Helvetica',
        serif: 'Helvetica',
      },
      defaultFontSize: 16
    },
    backgroundColor: '#ffffff'
  })

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 创建测试窗口时启动服务器
const createTestWindow = async (testData: TestSettings) => {
  console.log('Main process received test data:', testData)

  if (!testManager?.startServer()) {
    console.error('Failed to start test server')
    return
  }

  if (testWindow) {
    testWindow.focus()
    return
  }

  testWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      // 添加以下配置
      defaultFontFamily: {
        standard: 'Helvetica',
        sansSerif: 'Helvetica',
        serif: 'Helvetica',
      },
      defaultFontSize: 16
    },
    backgroundColor: '#ffffff'
  })
  // 先保存测试数据到TestManager
  testManager.setTestData(testData)
  console.log('Test data saved to manager:', testManager.getTestData())

  // 加载窗口内容
  if (!app.isPackaged) {
    await testWindow.loadURL('http://localhost:5173/#/test')
  } else {
    await testWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'test'
    })
  }

  // 确保在窗口加载完成后发送数据
  testWindow.webContents.once('did-finish-load', () => {
    console.log('Test window loaded, sending initial data')
    if (testWindow) {
      console.log('Sending initial test data to window')
      testWindow.webContents.send('init-test-data', testData)
    }
  })

  testWindow.webContents.on('did-fail-load', (event, code, description) => {
    console.error('Test window failed to load:', code, description)
  })

  testWindow.on('closed', () => {
    testWindow = null
    testManager?.stopServer()
  })
  
}

const setupIpcHandlers = () => {
  // 音声ファイル管理
  ipcMain.handle('get-audio-files', () => audioManager?.getAudioFiles())
  ipcMain.handle('select-audio-files', () => audioManager?.importAudioFiles())
  ipcMain.handle('delete-audio-file', (_, fileId) => audioManager?.deleteAudioFile(fileId))
  ipcMain.handle('set-audio-files', (_, files) => audioManager?.setAudioFiles(files))

  // 音声再生制御
  ipcMain.handle('play-audio', (event, fileId) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return audioManager?.playAudio(fileId, window)
  })
  ipcMain.handle('pause-audio', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return audioManager?.pauseAudio(window)
  })
  ipcMain.handle('resume-audio', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return audioManager?.resumeAudio(window)
  })
  ipcMain.handle('stop-audio', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return audioManager?.stopAudio(window)
  })

  // ネットワークアドレス取得
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

  // データ管理
  ipcMain.handle('save-test-data', async (_, data) => {
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

  // テストウィンドウ管理
  ipcMain.handle('create-test-window', async (_, testData) => {
    await createTestWindow(testData)
  })

  // ファイル管理
  ipcMain.handle('save-test-settings-to-file', async (_, data) => {
    try {
      return await dataManager?.saveTestSettingsToFile(data)
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  })

  ipcMain.handle('load-test-settings-from-file', () => {
    return dataManager?.loadTestSettingsFromFile()
  })

  // テスト制御
  ipcMain.handle('start-test', async (_, testData) => {
    try {
      if (!testManager) {
        throw new Error('Test manager not initialized')
      }
      console.log('Starting test with data:', testData)
      return testManager.startTest(testData)
    } catch (error) {
      console.error('Failed to start test:', error)
      throw error
    }
  })
  ipcMain.handle('pause-test', () => testManager?.pauseTest())
  ipcMain.handle('resume-test', () => testManager?.resumeTest())
  ipcMain.handle('stop-test', () => testManager?.stopTest())
  ipcMain.handle('next-question', () => testManager?.nextQuestion())
}

app.whenReady().then(async () => {
  // 初始化各个管理器
  audioManager = new AudioManager(app.getPath('userData'))  // 确保传入正确的路径
  try {
    audioManager.setupProtocol()
  } catch (error) {
    console.error('Failed to setup protocol:', error)
  }
  dataManager = new DataManager(app.getPath('userData'))
  await dataManager.init()
  testManager = new TestManager()

  // 设置IPC处理器
  setupIpcHandlers()

  // 创建主窗口
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