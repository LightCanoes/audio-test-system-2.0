// src/renderer/types/index.ts

export interface AudioFile {
  id: string
  name: string
  path: string
  originalPath: string
}

export interface TestOption {
  value: string
  label: string
}

export interface TestSequence {
  id: string       // draggable のために必要
  waitTime: number // 開始待ち時間（秒）
  audio1: string   // 音声ファイル1のID
  pauseTime: number // 休止時間（秒）
  audio2: string   // 音声ファイル2のID
  answerTime: number // 回答時間（秒）
  correctOption: string // 正解選択肢の value
}

export interface LightSettings {
  showPlayingIndicator: boolean  // 音源呈示提示灯
  showCorrectLight: boolean      // 正解提示灯
  showWrongLight: boolean        // 不正解提示灯
  showAlmostLight: boolean       // おしい提示灯
}

export interface TestSettings {
  instruction: string          // 教示文
  options: TestOption[]        // 回答選択肢
  sequences: TestSequence[]    // シーケンス
  lightSettings: LightSettings // 提示灯設定
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