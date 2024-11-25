import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // 音频相关
  playAudio: (fileId: string) => ipcRenderer.invoke('play-audio', fileId),
  pauseAudio: () => ipcRenderer.invoke('pause-audio'),
  resumeAudio: () => ipcRenderer.invoke('resume-audio'),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  getAudioFiles: () => ipcRenderer.invoke('get-audio-files'),
  importAudioFiles: () => ipcRenderer.invoke('import-audio-files'),
  deleteAudioFile: (fileId: string) => ipcRenderer.invoke('delete-audio-file', fileId),

  // 数据管理
  saveTestData: (data: any) => ipcRenderer.invoke('save-test-data', data),
  loadTestData: () => ipcRenderer.invoke('load-test-data'),

  // 测试控制
  createTestWindow: (testData: any) => ipcRenderer.invoke('create-test-window', testData),
  createStudentWindow: () => ipcRenderer.invoke('create-student-window'),
  startTest: (testData: any) => ipcRenderer.invoke('start-test', testData),
  nextQuestion: () => ipcRenderer.invoke('next-question'),
  endTest: () => ipcRenderer.invoke('end-test'),

  // 事件监听
  onPlayAudio: (callback: (path: string) => void) => {
    ipcRenderer.on('play-audio-file', (_event, path) => callback(path))
    return () => {
      ipcRenderer.removeListener('play-audio-file', (_event, path) => callback(path))
    }
  },

  onStopAudio: (callback: () => void) => {
    ipcRenderer.on('stop-audio-file', () => callback())
    return () => {
      ipcRenderer.removeListener('stop-audio-file', () => callback())
    }
  },

  onTestStateUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on('test-state-update', (_event, state) => callback(state))
    return () => {
      ipcRenderer.removeListener('test-state-update', (_event, state) => callback(state))
    }
  }
}

// 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', api)

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof api
  }
}