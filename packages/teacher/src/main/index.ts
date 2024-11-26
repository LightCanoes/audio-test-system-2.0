import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { AudioManager } from './audioManager'
import { TestManager } from './testManager'
import { DataManager } from './dataManager'
import { networkInterfaces } from 'os'
import type { TestSettings } from '../renderer/types'

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
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const createTestWindow = async (testData: TestSettings) => {
  if (testWindow) {
    testWindow.focus()
    return
  }

  // WebSocketサーバーを起動
  testManager?.startServer()

  testWindow = new BrowserWindow({
    width: 1600,
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
  // 音声ファイル管理
  ipcMain.handle('get-audio-files', () => audioManager?.getAudioFiles())
  ipcMain.handle('select-audio-files', () => audioManager?.importAudioFiles())
  ipcMain.handle('delete-audio-file', (_, fileId) => audioManager?.deleteAudioFile(fileId))

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
  ipcMain.handle('save-test-settings-to-file', () => {
    return dataManager?.saveTestSettingsToFile()
  })

  ipcMain.handle('load-test-settings-from-file', () => {
    return dataManager?.loadTestSettingsFromFile()
  })

  // テスト制御
  ipcMain.handle('start-test', (_, data) => testManager?.startTest(data))
  ipcMain.handle('pause-test', () => testManager?.pauseTest())
  ipcMain.handle('resume-test', () => testManager?.resumeTest())
  ipcMain.handle('stop-test', () => testManager?.stopTest())
  ipcMain.handle('next-question', () => testManager?.nextQuestion())
}

app.whenReady().then(async () => {
  // 各マネージャーの初期化
  audioManager = new AudioManager()
  
  dataManager = new DataManager(app.getPath('userData'))
  await dataManager.init()
  
  testManager = new TestManager()

  // IPC ハンドラーの設定
  setupIpcHandlers()

  // メインウィンドウの作成
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