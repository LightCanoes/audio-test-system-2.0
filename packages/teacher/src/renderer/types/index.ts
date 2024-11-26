// src/renderer/types/index.ts

export interface AudioFile {
  id: string
  name: string
  path: string
  originalPath: string
  comment?: string  // 追加コメント欄
}

export interface TestOption {
  value: string    // ボタンID
  label: string    // ボタン表示名
}

export interface TestSequence {
  id: string           // draggable のために必要
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
  instruction: string          // 教示文
  options: TestOption[]        // ボタン設定
  sequences: TestSequence[]    // スケジュールリスト
  lightSettings: LightSettings // ランプ設定
  audioFiles?: AudioFile[]     // 保存用の刺激リスト
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