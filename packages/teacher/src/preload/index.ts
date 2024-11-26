import { contextBridge, ipcRenderer } from 'electron'
import type { AudioFile, TestSettings } from '../renderer/types'

// 类型定义
type AudioControlEvent = {
  type: 'play' | 'pause' | 'resume' | 'stop'
  path?: string
  id?: string
}

// IPC API
contextBridge.exposeInMainWorld('electronAPI', {
  // 音频文件管理
  getAudioFiles: () => ipcRenderer.invoke('get-audio-files'),
  importAudioFiles: () => ipcRenderer.invoke('import-audio-files'),
  deleteAudioFile: (fileId: string) => ipcRenderer.invoke('delete-audio-file', fileId),
  
  // 音频播放控制
  playAudio: (fileId: string) => ipcRenderer.invoke('play-audio', fileId),
  pauseAudio: () => ipcRenderer.invoke('pause-audio'),
  resumeAudio: () => ipcRenderer.invoke('resume-audio'),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  
  // 音频控制事件监听
  onAudioControl: (callback: (event: AudioControlEvent) => void) => {
    ipcRenderer.on('audio-control', (_, data) => callback(data))
    return () => {
      ipcRenderer.removeAllListeners('audio-control')
    }
  },

  // 测试设置文件操作
  saveTestSettingsToFile: () => ipcRenderer.invoke('save-test-settings-to-file'),
  loadTestSettingsFromFile: () => ipcRenderer.invoke('load-test-settings-from-file'),

  // 测试数据管理
  saveTestData: (data: TestSettings) => ipcRenderer.invoke('save-test-data', data),
  loadTestData: () => ipcRenderer.invoke('load-test-data'),
  
  // 测试窗口管理
  createTestWindow: (testData: TestSettings) => ipcRenderer.invoke('create-test-window', testData),
  
  // 测试控制
  startTest: (testData: TestSettings) => ipcRenderer.invoke('start-test', testData),
  pauseTest: () => ipcRenderer.invoke('pause-test'),
  resumeTest: () => ipcRenderer.invoke('resume-test'),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  nextQuestion: () => ipcRenderer.invoke('next-question'),
  
  // 网络相关
  getNetworkAddresses: () => ipcRenderer.invoke('get-network-addresses'),
  
  // 事件监听
  onTestStateUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on('test-state-update', (_, state) => callback(state))
    return () => {
      ipcRenderer.removeAllListeners('test-state-update')
    }
  },
  
  onInitTestData: (callback: (data: TestSettings) => void) => {
    ipcRenderer.on('init-test-data', (_, data) => callback(data))
    return () => {
      ipcRenderer.removeAllListeners('init-test-data')
    }
  }
})

// 类型声明添加到全局 Window 接口
declare global {
  interface Window {
    electronAPI: {
      getAudioFiles: () => Promise<AudioFile[]>
      importAudioFiles: () => Promise<AudioFile[]>
      deleteAudioFile: (fileId: string) => Promise<boolean>
      
      playAudio: (fileId: string) => Promise<boolean>
      pauseAudio: () => Promise<boolean>
      resumeAudio: () => Promise<boolean>
      stopAudio: () => Promise<boolean>
      onAudioControl: (callback: (event: AudioControlEvent) => void) => () => void
      
      saveTestSettingsToFile: () => Promise<void>
      loadTestSettingsFromFile: () => Promise<TestSettings | null>
      
      saveTestData: (data: TestSettings) => Promise<void>
      loadTestData: () => Promise<TestSettings>
      
      createTestWindow: (testData: TestSettings) => Promise<void>
      
      startTest: (testData: TestSettings) => Promise<void>
      pauseTest: () => Promise<void>
      resumeTest: () => Promise<void>
      stopTest: () => Promise<void>
      nextQuestion: () => Promise<void>
      
      getNetworkAddresses: () => Promise<string[]>
      
      onTestStateUpdate: (callback: (state: any) => void) => () => void
      onInitTestData: (callback: (data: TestSettings) => void) => () => void
    }
  }
}