import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { AudioManager } from './audioManager'
import { TestManager } from './testManager'

let mainWindow: BrowserWindow | null = null
let testWindow: BrowserWindow | null = null
let studentWindow: BrowserWindow | null = null
let audioManager: AudioManager | null = null
let testManager: TestManager | null = null

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
  // 如果测试窗口已存在则聚焦
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
    // 停止WebSocket服务器
    testManager?.stopServer()
    // 关闭所有学生窗口
    if (studentWindow) {
      studentWindow.close()
      studentWindow = null
    }
  })
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
  } else {
    await studentWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'student'
    })
  }

  studentWindow.on('closed', () => {
    studentWindow = null
  })
}

// 设置IPC处理程序
const setupIpcHandlers = () => {
  // 测试窗口相关
  ipcMain.handle('create-test-window', async (event, testData) => {
    await createTestWindow(testData)
  })

  // 学生窗口相关
  ipcMain.handle('create-student-window', async () => {
    await createStudentWindow()
  })

  // 音频相关
  ipcMain.handle('play-audio', (event, path) => {
    return audioManager?.playAudio(path)
  })

  ipcMain.handle('stop-audio', () => {
    return audioManager?.stopAudio()
  })

  // 测试管理相关
  ipcMain.handle('start-test', (event, testData) => {
    testManager?.startTest(testData)
  })

  ipcMain.handle('next-question', () => {
    testManager?.nextQuestion()
  })

  ipcMain.handle('end-test', () => {
    testManager?.endTest()
  })

  // 音频文件管理
  ipcMain.handle('get-audio-files', () => audioManager?.getAudioFiles())
  ipcMain.handle('import-audio-files', () => audioManager?.importAudioFiles())
  ipcMain.handle('delete-audio-file', (event, fileId) => audioManager?.deleteAudioFile(fileId))
}

// 添加开发菜单（便于测试）
const createDevMenu = () => {
  if (!app.isPackaged) {
    mainWindow?.webContents.on('context-menu', (_, params) => {
      const menu = require('electron').Menu.buildFromTemplate([
        {
          label: '打开开发者工具',
          click: () => mainWindow?.webContents.openDevTools()
        },
        {
          label: 'テストビューを開く',
          click: () => createTestWindow({})
        },
        {
          label: '学生ビューを開く',
          click: () => createStudentWindow()
        }
      ])
      menu.popup()
    })
  }
}

app.whenReady().then(async () => {
  createMainWindow()
  
  // 初始化管理器
  audioManager = new AudioManager(app.getPath('userData'))
  await audioManager.loadInitialFiles()
  
  testManager = new TestManager()

  // 设置IPC处理程序
  setupIpcHandlers()

  // 开发菜单
  createDevMenu()
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

// 确保应用退出时清理资源
app.on('before-quit', () => {
  testManager?.stopServer()
})