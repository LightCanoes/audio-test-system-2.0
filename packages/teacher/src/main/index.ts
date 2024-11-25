import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { AudioManager } from './audioManager'
import { TestManager } from './testManager'
import { DataManager } from './dataManager'

let mainWindow: BrowserWindow | null = null
let testWindow: BrowserWindow | null = null
let studentWindow: BrowserWindow | null = null
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
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 设置 AudioManager 的主窗口引用
  audioManager?.setMainWindow(mainWindow)
}

const createTestWindow = async (testData: any) => {
  if (testWindow) {
    testWindow.focus()
    return
  }

  // 启动 WebSocket 服务器
  await testManager?.startServer()

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

  if (!app.isPackaged) {
    testWindow.webContents.openDevTools()
  }

  testWindow.on('closed', () => {
    testWindow = null
    testManager?.stopServer()
    if (studentWindow) {
      studentWindow.close()
      studentWindow = null
    }
  })

  audioManager?.setMainWindow(testWindow)
}

const createStudentWindow = async () => {
  if (studentWindow) {
    studentWindow.focus()
    return
  }

  studentWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (!app.isPackaged) {
    await studentWindow.loadURL('http://localhost:5173/#/student')
    studentWindow.webContents.openDevTools()
  } else {
    await studentWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'student'
    })
  }

  studentWindow.on('closed', () => {
    studentWindow = null
  })
}

const setupIpcHandlers = () => {
  // 窗口管理
  ipcMain.handle('create-test-window', async (event, testData) => {
    await createTestWindow(testData)
  })

  ipcMain.handle('create-student-window', async () => {
    await createStudentWindow()
  })

  // 音频管理
  ipcMain.handle('play-audio', async (_event, fileId) => {
    try {
      return await audioManager?.playAudio(fileId)
    } catch (error) {
      console.error('Failed to play audio:', error)
      throw error
    }
  })
  ipcMain.handle('stop-audio', () => audioManager?.stopAudio())
  ipcMain.handle('get-audio-files', () => audioManager?.getAudioFiles())
  ipcMain.handle('import-audio-files', () => audioManager?.importAudioFiles())
  ipcMain.handle('delete-audio-file', (event, fileId) => audioManager?.deleteAudioFile(fileId))

  // 数据管理相关
  ipcMain.handle('save-test-data', async (_event, data) => {
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

  // 测试管理
  ipcMain.handle('start-test', (event, testData) => {
    testManager?.startTest(testData)
  })

  ipcMain.handle('next-question', () => {
    testManager?.nextQuestion()
  })

  ipcMain.handle('end-test', () => {
    testManager?.endTest()
  })
}

app.whenReady().then(async () => {
  // 初始化管理器
  audioManager = new AudioManager(app.getPath('userData'))
  await audioManager.loadInitialFiles()
  
  dataManager = new DataManager(app.getPath('userData'))
  await dataManager.init()
  
  testManager = new TestManager()

  // 设置 IPC 处理程序
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