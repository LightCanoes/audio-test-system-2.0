// Vue component type declarations
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Audio file type
interface AudioFile {
  id: string
  name: string
  path: string
  duration: number
  size: number
  createdAt: string
  updatedAt: string
}

// Student type
interface Student {
  id: string
  name: string
  answers: {
    questionId: string
    answer: string
    isCorrect: boolean
    responseTime: number
  }[]
}

// Question statistics
interface QuestionStats {
  questionId: string
  totalAnswers: number
  correctCount: number
  averageResponseTime: number
  averageTime: number
}

// Test state interface
interface TestState {
  students: Student[]
  currentQuestionStats: QuestionStats
  questionStats: QuestionStats[]
  currentStage: 'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null
  remainingTime: number
}

// Strongly typed electron API
interface ElectronAPI {
  // Test data management
  saveTestData: (data: TestData) => Promise<void>
  loadTestData: () => Promise<TestData>
  
  // Audio management
  getAudioFiles: () => Promise<AudioFile[]>
  playAudio: (fileId: string) => Promise<boolean>
  stopAudio: () => Promise<boolean>
  pauseAudio: () => Promise<boolean>
  resumeAudio: () => Promise<boolean>
  importAudioFiles: () => Promise<AudioFile[]>
  deleteAudioFile: (fileId: string) => Promise<boolean>
  
  // Window management
  createTestWindow: (data: TestData) => Promise<void>
  createStudentWindow: () => Promise<void>
  
  // Audio event handlers
  onPlayAudio: (callback: (path: string) => void) => () => void
  onStopAudio: (callback: () => void) => () => void
  
  // Test control
  startTest: (testData: TestData) => Promise<void>
  nextQuestion: () => Promise<void>
  endTest: () => Promise<void>

  // Test state event handlers
  onInitTestData: (callback: (data: TestData) => void) => () => void
  onTestStateUpdate: (callback: (state: TestState) => void) => () => void

  // Event handling
  on: (channel: string, callback: (...args: any[]) => void) => void
  once: (channel: string, callback: (...args: any[]) => void) => void
  removeListener: (channel: string, callback: (...args: any[]) => void) => void
}

// Extend window interface to include electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {
  AudioFile,
  Student,
  QuestionStats,
  TestState,
  ElectronAPI
}
