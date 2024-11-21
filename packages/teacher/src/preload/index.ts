import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 已有的API
  playAudio: (path: string) => ipcRenderer.invoke('play-audio', path),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  getAudioFiles: (fileIds?: string[]) => ipcRenderer.invoke('get-audio-files', fileIds),
  importAudioFiles: () => ipcRenderer.invoke('import-audio-files'),
  deleteAudioFile: (fileId: string) => ipcRenderer.invoke('delete-audio-file', fileId),
  
  // 测试窗口相关
  createTestWindow: (testData: any) => ipcRenderer.invoke('create-test-window', testData),
  createStudentWindow: () => ipcRenderer.invoke('create-student-window'),

  // 测试数据相关
  saveTestData: (data: any) => ipcRenderer.invoke('save-test-data', data),
  loadTestData: () => ipcRenderer.invoke('load-test-data'),

  // 测试控制
  startTest: (testData: any) => ipcRenderer.invoke('start-test', testData),
  nextQuestion: () => ipcRenderer.invoke('next-question'),
  endTest: () => ipcRenderer.invoke('end-test'),

  // 事件监听
  onTestStateUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on('test-state-update', (_, state) => callback(state))
  },
  onInitTestData: (callback: (data: any) => void) => {
    ipcRenderer.on('init-test-data', (_, data) => callback(data))
  }
})

// 添加类型定义
declare global {
  interface Window {
    electronAPI: {
      // ... 现有类型 ...
      createTestWindow: (testData: any) => Promise<void>
      createStudentWindow: () => Promise<void>
      startTest: (testData: any) => Promise<void>
      nextQuestion: () => Promise<void>
      endTest: () => Promise<void>
      saveTestData: (data: any) => Promise<void>
      loadTestData: () => Promise<any>
      onTestStateUpdate: (callback: (state: any) => void) => void
      onInitTestData: (callback: (data: any) => void) => void
    }
  }
}