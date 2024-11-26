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
  // 音声ファイル管理
  getAudioFiles: () => ipcRenderer.invoke('get-audio-files'),
  importAudioFiles: () => ipcRenderer.invoke('select-audio-files'),  // renamed to clarify purpose
  deleteAudioFile: (fileId: string) => ipcRenderer.invoke('delete-audio-file', fileId),
  
  // 音声再生制御
  playAudio: (fileId: string) => ipcRenderer.invoke('play-audio', fileId),
  pauseAudio: () => ipcRenderer.invoke('pause-audio'),
  resumeAudio: () => ipcRenderer.invoke('resume-audio'),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  
  // 音声制御イベント
  onAudioControl: (callback: (event: AudioControlEvent) => void) => {
    ipcRenderer.on('audio-control', (_, data) => callback(data))
    return () => {
      ipcRenderer.removeAllListeners('audio-control')
    }
  },

  // 設定ファイル操作
  saveTestSettingsToFile: () => ipcRenderer.invoke('save-test-settings-to-file'),
  loadTestSettingsFromFile: () => ipcRenderer.invoke('load-test-settings-from-file'),

  // テストデータ管理
  saveTestData: (data: TestSettings) => ipcRenderer.invoke('save-test-data', data),
  loadTestData: () => ipcRenderer.invoke('load-test-data'),
  
  // テストウィンドウ管理
  createTestWindow: (testData: TestSettings) => ipcRenderer.invoke('create-test-window', testData),
  
  // テスト制御
  startTest: (testData: TestSettings) => ipcRenderer.invoke('start-test', testData),
  pauseTest: () => ipcRenderer.invoke('pause-test'),
  resumeTest: () => ipcRenderer.invoke('resume-test'),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  nextQuestion: () => ipcRenderer.invoke('next-question'),
  
  // ネットワーク関連
  getNetworkAddresses: () => ipcRenderer.invoke('get-network-addresses'),
  
  // イベントリスナー
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

// Window インターフェースの拡張
declare global {
  interface Window {
    electronAPI: {
      // 音声ファイル管理
      getAudioFiles: () => Promise<AudioFile[]>
      importAudioFiles: () => Promise<AudioFile[]>
      deleteAudioFile: (fileId: string) => Promise<boolean>
      
      // 音声再生制御
      playAudio: (fileId: string) => Promise<boolean>
      pauseAudio: () => Promise<boolean>
      resumeAudio: () => Promise<boolean>
      stopAudio: () => Promise<boolean>
      onAudioControl: (callback: (event: AudioControlEvent) => void) => () => void
      
      // 設定ファイル操作
      saveTestSettingsToFile: () => Promise<void>
      loadTestSettingsFromFile: () => Promise<TestSettings | null>
      
      // テストデータ管理
      saveTestData: (data: TestSettings) => Promise<void>
      loadTestData: () => Promise<TestSettings>
      
      // テストウィンドウ管理
      createTestWindow: (testData: TestSettings) => Promise<void>
      
      // テスト制御
      startTest: (testData: TestSettings) => Promise<void>
      pauseTest: () => Promise<void>
      resumeTest: () => Promise<void>
      stopTest: () => Promise<void>
      nextQuestion: () => Promise<void>
      
      // ネットワーク関連
      getNetworkAddresses: () => Promise<string[]>
      
      // イベントリスナー
      onTestStateUpdate: (callback: (state: any) => void) => () => void
      onInitTestData: (callback: (data: TestSettings) => void) => () => void
    }
  }
}