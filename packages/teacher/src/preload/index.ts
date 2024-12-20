// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { 
  AudioFile, 
  TestSettings, 
  StudentStats, 
  QuestionStats 
} from '../renderer/types'

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
  importAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  deleteAudioFile: (fileId: string) => ipcRenderer.invoke('delete-audio-file', fileId),
  setAudioFiles: (files: AudioFile[]) => ipcRenderer.invoke('set-audio-files', files),
  
  // 音声再生制御
  playAudio: (fileId: string) => ipcRenderer.invoke('play-audio', fileId),
  pauseAudio: () => ipcRenderer.invoke('pause-audio'),
  resumeAudio: () => ipcRenderer.invoke('resume-audio'),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  
  // 音声制御イベント
  onAudioControl: (callback: (event: AudioControlEvent) => void) => {
    const cleanup = () => {
      ipcRenderer.removeAllListeners('audio-control')
    }
    
    ipcRenderer.on('audio-control', (_, data) => callback(data))
    return cleanup
  },

  // 設定ファイル操作
  saveTestSettingsToFile: (data: TestSettings) => 
    ipcRenderer.invoke('save-test-settings-to-file', data),
  
  loadTestSettingsFromFile: () => 
    ipcRenderer.invoke('load-test-settings-from-file'),

  // テストデータ管理
  saveTestData: (data: TestSettings) => 
    ipcRenderer.invoke('save-test-data', data),
  
  loadTestData: () => 
    ipcRenderer.invoke('load-test-data'),
  
  // テストウィンドウ管理
  createTestWindow: (testData: TestSettings) => 
    ipcRenderer.invoke('create-test-window', testData),
  
  // テスト制御
  startTest: (testData: TestSettings) => ipcRenderer.invoke('start-test', testData) as Promise<boolean>,
  
  pauseTest: () => ipcRenderer.invoke('pause-test'),
  resumeTest: () => ipcRenderer.invoke('resume-test'),
  stopTest: () => ipcRenderer.invoke('stop-test'),
  nextQuestion: () => ipcRenderer.invoke('next-question'),
  
  // ネットワーク関連
  getNetworkAddresses: () => 
    ipcRenderer.invoke('get-network-addresses'),
  
  // イベントリスナー
  onTestStateUpdate: (callback: (state: any) => void) => {
    const cleanup = () => {
      ipcRenderer.removeAllListeners('test-state-update')
    }
    
    ipcRenderer.on('test-state-update', (_, state) => callback(state))
    return cleanup
  },
  
  onInitTestData: (callback: (data: TestSettings) => void) => {
    console.log('Registering onInitTestData handler')
    const cleanup = () => {
      ipcRenderer.removeAllListeners('init-test-data')
    }
    
    ipcRenderer.on('init-test-data', (_, data) => {
      console.log('Preload received init-test-data:', data)
      callback(data)
    })
    return cleanup
  },
  onStudentListUpdate: (callback: (students: StudentStats[]) => void) => {
    const cleanup = () => {
      ipcRenderer.removeAllListeners('student-list-update')
    }
    
    ipcRenderer.on('student-list-update', (_, data) => callback(data))
    return cleanup
  },

  onStatsUpdate: (callback: (stats: {
    currentQuestionStats: QuestionStats
    questionStats: QuestionStats[]
    overallStats: {
      totalAnswers: number
      correctAnswers: number
      correctRate: number
      averageTime: number
    }
  }) => void) => {
    const cleanup = () => {
      ipcRenderer.removeAllListeners('stats-update')
    }
    
    ipcRenderer.on('stats-update', (_, data) => callback(data))
    return cleanup
  }
})

// Window インターフェースの拡張
declare global {
  interface Window {
    electronAPI: {
      getAudioFiles: () => Promise<AudioFile[]>
      importAudioFiles: () => Promise<AudioFile[]>
      deleteAudioFile: (fileId: string) => Promise<boolean>
      setAudioFiles: (files: AudioFile[]) => Promise<void>
      
      playAudio: (fileId: string) => Promise<boolean>
      pauseAudio: () => Promise<boolean>
      resumeAudio: () => Promise<boolean>
      stopAudio: () => Promise<boolean>
      onAudioControl: (callback: (event: AudioControlEvent) => void) => () => void
      
      saveTestSettingsToFile: (data: TestSettings) => Promise<void>
      loadTestSettingsFromFile: () => Promise<TestSettings | null>
      
      saveTestData: (data: TestSettings) => Promise<void>
      loadTestData: () => Promise<TestSettings>
      
      createTestWindow: (testData: TestSettings) => Promise<void>
      
      startTest: (testData: TestSettings) => Promise<boolean>
      pauseTest: () => Promise<void>
      resumeTest: () => Promise<void>
      stopTest: () => Promise<void>
      nextQuestion: () => Promise<void>
      
      getNetworkAddresses: () => Promise<string[]>
      
      onTestStateUpdate: (callback: (state: any) => void) => () => void
      onInitTestData: (callback: (data: TestSettings) => void) => () => void
      onStudentListUpdate: (callback: (students: StudentStats[]) => void) => () => void
      onStatsUpdate: (callback: (stats: {
        currentQuestionStats: QuestionStats
        questionStats: QuestionStats[]
        overallStats: {
          totalAnswers: number
          correctAnswers: number
          correctRate: number
          averageTime: number
        }
      }) => void) => () => void
    }
  }
}