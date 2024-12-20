// src/main/testManager.ts
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import * as http from 'http'
import type { TestSettings, TestSequence, } from '../renderer/types'

interface Student {
  id: string
  answers: Answer[]
  correctCount: number
  totalAnswered: number
  correctRate: number
  currentAnswer?: string
}

interface Answer {
  questionId: number
  option: string
  timestamp: number
  startTime: number
  isCorrect: boolean
}

interface QuestionStats {
  totalAnswers: number
  correctAnswers: number
  correctRate: number
  averageTime: number
  optionCounts: Record<string, number>
  answers: Record<string, { option: string; time: number }>
}

export class TestManager extends EventEmitter {
  private server: http.Server
  private wss: WebSocketServer | null = null
  private students: Map<string, Student> = new Map()
  private test: TestSettings | null = null
  private currentQuestionIndex: number = -1

  private stats: {
    currentQuestionStats: QuestionStats
    questionStats: QuestionStats[]
    overallStats: {
      totalAnswers: number
      correctAnswers: number
      correctRate: number
      averageTime: number
    }
    students: Student[]
  } | null = null

  private testState = {
    isStarted: false,
    isPlaying: false,
    isPaused: false,
    playingStage: null as 'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null,
    remainingTime: 0
  }

  constructor() {
    super()
    this.server = http.createServer((req, res) => {
      // 重定向到 Vite 开发服务器
      res.writeHead(301, {
        'Location': 'http://localhost:5173/#/student'  // 使用 hash 路由
      })
      res.end()
    })
  }

  public startServer(): boolean {
    if (this.wss) return false

    try {
      // 先启动 HTTP 服务器
      this.server.listen(8080, () => {
        console.log('HTTP server is running on port 8080')

        // 创建 WebSocket 服务器
        this.wss = new WebSocketServer({ 
          server: this.server,
          perMessageDeflate: false
        })

        this.setupServerHandlers()
      })

      return true
    } catch (error) {
      console.error('Failed to start server:', error)
      this.stopServer()
      return false
    }
  }

  private setupServerHandlers() {
    if (!this.wss) return

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New client connected')
      const clientId = Date.now().toString()
      
      // 初始化学生数据
      this.students.set(clientId, {
        id: clientId,
        answers: [],
        correctCount: 0,
        totalAnswered: 0,
        correctRate: 0
      })

      // 如果有测试数据，发送给新连接的客户端
      if (this.test) {
        ws.send(JSON.stringify({
          type: 'init',
          data: {
            test: this.test,
            currentQuestion: this.currentQuestionIndex,
            testState: this.testState
          }
        }))
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(clientId, message, ws)
        } catch (error) {
          console.error('Error handling message:', error)
        }
      })

      ws.on('close', () => {
        console.log('Client disconnected:', clientId)
        this.students.delete(clientId)
        this.broadcastStudentList()
      })

      // 发送当前学生列表
      this.broadcastStudentList()
    })
  }

  private handleMessage(clientId: string, message: any, ws: WebSocket) {
    const student = this.students.get(clientId)
    if (!student) return

    switch (message.type) {
      case 'answer':
        this.handleAnswer(student, message.data, ws)
        break
    }
  }

  private handleAnswer(student: Student, answer: Answer, ws: WebSocket) {
    if (!this.test || !this.testState.isStarted) return

    const sequence = this.test.sequences[this.currentQuestionIndex]
    const isCorrect = answer.option === sequence.correctOption

    // 更新学生统计
    student.answers.push({
      ...answer,
      isCorrect
    })
    student.currentAnswer = answer.option
    if (isCorrect) student.correctCount++
    student.totalAnswered++
    student.correctRate = (student.correctCount / student.totalAnswered) * 100

    // 更新问题统计
    this.updateQuestionStats(student, answer, isCorrect)

    // 发送结果给学生
    ws.send(JSON.stringify({
      type: 'answer-result',
      data: {
        isCorrect,
        correctOption: sequence.correctOption
      }
    }))

    // 广播更新
    this.broadcastStudentList()
    this.broadcastStats()
  }

  private updateQuestionStats(student: Student, answer: Answer, isCorrect: boolean) {
    if (!this.stats) this.initializeStats()
    if (!this.stats) return

    const currentStats = this.stats.currentQuestionStats
    const questionStats = this.stats.questionStats[this.currentQuestionIndex]

    // 更新当前问题统计
    currentStats.totalAnswers++
    if (isCorrect) currentStats.correctAnswers++
    currentStats.correctRate = (currentStats.correctAnswers / currentStats.totalAnswers) * 100
    currentStats.optionCounts[answer.option] = (currentStats.optionCounts[answer.option] || 0) + 1
    currentStats.answers[student.id] = {
      option: answer.option,
      time: answer.timestamp - answer.startTime
    }

    // 更新问题统计历史
    Object.assign(questionStats, currentStats)

    // 更新总体统计
    const totalAnswers = this.stats.questionStats.reduce((sum, q) => sum + q.totalAnswers, 0)
    const totalCorrect = this.stats.questionStats.reduce((sum, q) => sum + q.correctAnswers, 0)
    const totalTime = this.stats.questionStats.reduce((sum, q) => {
      const times = Object.values(q.answers).map(a => a.time)
      return sum + (times.reduce((a, b) => a + b, 0) / times.length || 0)
    }, 0)

    this.stats.overallStats = {
      totalAnswers,
      correctAnswers: totalCorrect,
      correctRate: totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0,
      averageTime: totalAnswers > 0 ? totalTime / this.stats.questionStats.length : 0
    }
  }

  private initializeStats() {
    if (!this.test) return

    const emptyStats = () => ({
      totalAnswers: 0,
      correctAnswers: 0,
      correctRate: 0,
      averageTime: 0,
      optionCounts: {},
      answers: {}
    })

    this.stats = {
      currentQuestionStats: emptyStats(),
      questionStats: Array(this.test.sequences.length).fill(null).map(() => emptyStats()),
      overallStats: {
        totalAnswers: 0,
        correctAnswers: 0,
        correctRate: 0,
        averageTime: 0
      },
      students: Array.from(this.students.values())
    }
  }

  public startTest(testData: TestSettings): boolean {
    if (!this.wss || this.testState.isStarted) return false
    
    try {
      this.test = testData
      this.currentQuestionIndex = 0
      
      this.testState = {
        isStarted: true,
        isPlaying: true,
        isPaused: false,
        playingStage: 'wait',
        remainingTime: this.test.sequences[0].waitTime
      }

      this.initializeStats()
      
      // 广播测试开始
      this.broadcastToAll({
        type: 'test-start',
        data: {
          test: this.test,
          currentQuestion: this.currentQuestionIndex,
          testState: this.testState
        }
      })

      // 开始第一个问题
      this.startCurrentQuestion()
      return true
    } catch (error) {
      console.error('Error starting test:', error)
      return false
    }
  }

  public pauseTest(): boolean {
    if (!this.testState.isStarted || this.testState.isPaused) return false

    this.testState.isPlaying = false
    this.testState.isPaused = true
    this.broadcastTestState()

    return true
  }

  public resumeTest(): boolean {
    if (!this.testState.isStarted || !this.testState.isPaused) return false

    this.testState.isPlaying = true
    this.testState.isPaused = false
    this.broadcastTestState()

    return true
  }

  public stopTest(): boolean {
    if (!this.testState.isStarted) return false

    this.testState = {
      isStarted: false,
      isPlaying: false,
      isPaused: false,
      playingStage: null,
      remainingTime: 0
    }

    // 广播测试结束和最终统计
    this.broadcastToAll({
      type: 'test-end',
      data: {
        stats: this.stats
      }
    })

    return true
  }

  private startCurrentQuestion() {
    if (!this.test || !this.testState.isStarted || this.testState.isPaused) return

    const sequence = this.test.sequences[this.currentQuestionIndex]
    this.runQuestionSequence(sequence)
  }

  private async runQuestionSequence(sequence: TestSequence) {
    // 等待时间
    this.updateStage('wait', sequence.waitTime)
    await this.wait(sequence.waitTime)
    if (!this.testState.isPlaying) return

    // 音频1
    this.updateStage('audio1', 0)
    this.broadcastToAll({
      type: 'play-audio',
      data: { audioId: sequence.audio1 }
    })
    await this.wait(5) // 假设音频长度为5秒
    if (!this.testState.isPlaying) return

    // 休止时间
    this.updateStage('pause', sequence.pauseTime)
    await this.wait(sequence.pauseTime)
    if (!this.testState.isPlaying) return

    // 音频2
    this.updateStage('audio2', 0)
    this.broadcastToAll({
      type: 'play-audio',
      data: { audioId: sequence.audio2 }
    })
    await this.wait(5) // 假设音频长度为5秒
    if (!this.testState.isPlaying) return

    // 回答时间
    this.updateStage('answer', sequence.answerTime)
    this.broadcastToAll({ type: 'can-answer' })
    await this.wait(sequence.answerTime)
    if (!this.testState.isPlaying) return

    // 显示答案
    this.showAnswer()
    await this.wait(5)
    if (!this.testState.isPlaying) return

    this.nextQuestion()
  }

  private wait(seconds: number): Promise<void> {
    return new Promise(resolve => {
      let remaining = seconds
      const timer = setInterval(() => {
        if (this.testState.isPaused) {
          clearInterval(timer)
          resolve()
          return
        }

        remaining--
        this.testState.remainingTime = remaining
        this.broadcastTestState()

        if (remaining <= 0) {
          clearInterval(timer)
          resolve()
        }
      }, 1000)
    })
  }

  private updateStage(stage: typeof this.testState.playingStage, remainingTime: number) {
    this.testState.playingStage = stage
    this.testState.remainingTime = remainingTime
    this.broadcastTestState()
  }

  private showAnswer() {
    if (!this.test) return

    const sequence = this.test.sequences[this.currentQuestionIndex]
    this.broadcastToAll({
      type: 'show-answer',
      data: { correctOption: sequence.correctOption }
    })
  }

  setTestData(data: TestSettings) {
    this.test = data
  }

  getTestData() {
    return this.test
  }
   nextQuestion() {
    if (!this.test) return

    this.currentQuestionIndex++
    if (this.currentQuestionIndex >= this.test.sequences.length) {
      this.stopTest()
    } else {
      this.startCurrentQuestion()
    }
  }

  private broadcastStudentList() {
    const studentList = Array.from(this.students.values()).map(student => ({
      id: student.id,
      correctRate: student.correctRate,
      totalAnswered: student.totalAnswered,
      currentAnswer: student.currentAnswer
    }))

    this.broadcastToAll({
      type: 'student-list',
      data: studentList
    })
  }

  private broadcastStats() {
    if (!this.stats) return

    this.broadcastToAll({
      type: 'stats-update',
      data: this.stats
    })
  }

  private broadcastTestState() {
    this.broadcastToAll({
      type: 'test-state',
      data: this.testState
    })
  }

  private broadcastToAll(message: any) {
    if (!this.wss) return

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message))
        } catch (error) {
          console.error('Error broadcasting message:', error)
        }
      }
    })
  }

  public stopServer(): void {
    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server closed')
      })
      this.wss = null
    }
    if (this.server) {
      this.server.close(() => {
        console.log('HTTP server closed')
      })
    }
  }
}