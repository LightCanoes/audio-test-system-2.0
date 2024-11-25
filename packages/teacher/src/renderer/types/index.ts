// src/renderer/types/index.ts

export interface AudioFile {
    id: string
    name: string
    path: string
    originalPath: string
  }
  
  export interface Option {
    value: string
    label: string
  }
  
  export interface LightSettings {
    showPlayingIndicator: boolean
    showCorrectLight: boolean
    showWrongLight: boolean
    showAlmostLight: boolean
  }
  
  export interface Sequence {
    id: string
    name: string
    waitTime: number
    pauseTime: number
    answerTime: number
    audio1: string
    audio2: string
    options: Option[]
    correctOption: string
    instruction: string
    lightSettings: LightSettings
  }
  
  export interface TestData {
    sequences: Sequence[]
  }
  
  export interface StudentAnswer {
    questionId: number
    option: string
    timestamp: number
    startTime: number
  }
  
  export interface Student {
    id: string
    name?: string
    answers: StudentAnswer[]
    currentAnswer?: string
    correctCount: number
    totalAnswered: number
    correctRate: number
  }
  
  export interface QuestionStats {
    totalAnswers: number
    correctAnswers: number
    correctRate: number
    averageTime: number
    optionCounts: Record<string, number>
    answers: Record<string, { option: string; time: number }>
  }
  
  export interface TestStats {
    currentQuestionStats: QuestionStats
    questionStats: QuestionStats[]
    overallStats: {
      totalAnswers: number
      correctAnswers: number
      correctRate: number
      averageTime: number
    }
    students: Student[]
  }