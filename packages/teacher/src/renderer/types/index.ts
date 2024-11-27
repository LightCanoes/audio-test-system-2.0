// src/renderer/types/index.ts
export interface AudioFile {
  id: string
  name: string
  path: string
  originalPath: string
  comment?: string
}

export interface TestOption {
  value: string    // 数值ID (1, 2, 3...)
  label: string    // 显示文字 (同value)
}

export interface TestSequence {
  id: string
  repeatCount: number  // 反復回数
  waitTime: number     // 開始時間（秒）
  audio1: string       // 刺激1のID
  pauseTime: number    // 休止時間（秒）
  audio2: string       // 刺激2のID
  answerTime: number   // 制限時間（秒）
  correctOption: string // 正答ボタンのID
}

export interface LightSettings {
  showPlayingIndicator: boolean  // 音源呈示ランプ
  showCorrectLight: boolean      // 正解ランプ
  showWrongLight: boolean        // 不正解ランプ
  showAlmostLight: boolean       // おしいランプ
}

export interface TestSettings {
  instruction: string
  options: TestOption[]
  sequences: TestSequence[]
  lightSettings: LightSettings
  audioFiles?: AudioFile[]     // 保存用
}

export interface StudentStats {
  id: string
  name?: string
  correctCount: number
  totalAnswered: number
  correctRate: number
  averageTime: number
  answers: Answer[]
  currentAnswer?: string
}

export interface Answer {
  questionId: number
  option: string
  timestamp: number
  startTime: number
  isCorrect: boolean
}

export interface QuestionStats {
  totalAnswers: number
  correctAnswers: number
  correctRate: number
  averageTime: number
  optionCounts: Record<string, number>
  answers: Record<string, { option: string; time: number }>
}

export interface OverallStats {
  totalAnswers: number
  correctAnswers: number
  correctRate: number
  averageTime: number
}

export interface TestStats {
  currentQuestionStats: QuestionStats
  questionStats: QuestionStats[]
  overallStats: OverallStats
  students: StudentStats[]
}