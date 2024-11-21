import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'

interface Answer {
  questionId: number
  option: string
  timestamp: number
  startTime: number
}

interface Student {
  id: string
  name?: string
  answers: Answer[]
  currentAnswer?: string
  correctCount: number
  totalAnswered: number
  correctRate: number
}

interface QuestionStats {
  totalAnswers: number
  correctAnswers: number
  correctRate: number
  averageTime: number
  optionCounts: Record<string, number>
  answers: Record<string, { option: string; time: number }>
}

interface TestStats {
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

export class TestManager extends EventEmitter {
  private wss: WebSocketServer | null = null
  private students: Map<string, Student> = new Map()
  private test: any = null
  private currentQuestionIndex: number = -1
  private stats: TestStats | null = null

  constructor() {
    super()
  }

  startServer() {
    if (this.wss) return

    this.wss = new WebSocketServer({ port: 8080 })

    this.wss.on('connection', (ws, request) => {
      const clientId = Date.now().toString()
      const isTeacher = request.url?.includes('teacher')

      if (!isTeacher) {
        // 初始化学生数据
        this.students.set(clientId, {
          id: clientId,
          answers: [],
          correctCount: 0,
          totalAnswered: 0,
          correctRate: 0
        })

        // 通知教师新学生连接
        this.broadcastToTeachers({
          type: 'student-connected',
          student: this.students.get(clientId)
        })
      }

      // 发送初始状态
      this.sendToClient(ws, {
        type: 'connection-status',
        status: 'connected',
        id: clientId,
        role: isTeacher ? 'teacher' : 'student'
      })

      if (this.test) {
        // 发送当前测试状态
        this.sendToClient(ws, {
          type: 'test-state',
          test: this.test,
          currentQuestionIndex: this.currentQuestionIndex,
          stats: this.stats
        })
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
        if (!isTeacher) {
          this.students.delete(clientId)
          this.broadcastToTeachers({
            type: 'student-disconnected',
            studentId: clientId
          })
        }
      })
    })
  }

  private handleMessage(clientId: string, message: any, ws: WebSocket) {
    const student = this.students.get(clientId)

    switch (message.type) {
      case 'answer':
        if (student && this.test) {
          const answer = message.answer
          const question = this.test.sequences[this.currentQuestionIndex]
          const isCorrect = answer.option === question.correctOption

          // 更新学生答案
          student.answers.push(answer)
          student.currentAnswer = answer.option
          if (isCorrect) student.correctCount++
          student.totalAnswered++
          student.correctRate = (student.correctCount / student.totalAnswered) * 100

          // 更新统计
          this.updateStats(student, answer, isCorrect)

          // 通知教师新答案
          this.broadcastToTeachers({
            type: 'answer-submitted',
            studentId: clientId,
            answer: {
              ...answer,
              isCorrect
            }
          })

          // 通知学生答案结果
          this.sendToClient(ws, {
            type: 'answer-result',
            result: isCorrect ? 'correct' : 'wrong'
          })
        }
        break

      case 'request-stats':
        if (this.stats) {
          this.sendToClient(ws, {
            type: 'stats-update',
            stats: this.stats
          })
        }
        break
    }
  }

  private updateStats(student: Student, answer: Answer, isCorrect: boolean) {
    if (!this.stats) {
      this.initializeStats()
    }

    if (this.stats) {
      const currentStats = this.stats.currentQuestionStats
      const questionStats = this.stats.questionStats[this.currentQuestionIndex]

      // 更新当前问题统计
      currentStats.totalAnswers++
      if (isCorrect) currentStats.correctAnswers++
      currentStats.correctRate = (currentStats.correctAnswers / currentStats.totalAnswers) * 100
      currentStats.optionCounts[answer.option] = (currentStats.optionCounts[answer.option] || 0) + 1
      currentStats.answers[student.id] = { option: answer.option, time: answer.timestamp - answer.startTime }
      currentStats.averageTime = Object.values(currentStats.answers)
        .reduce((sum, a) => sum + a.time, 0) / currentStats.totalAnswers

      // 更新问题统计历史
      questionStats.totalAnswers = currentStats.totalAnswers
      questionStats.correctAnswers = currentStats.correctAnswers
      questionStats.correctRate = currentStats.correctRate
      questionStats.averageTime = currentStats.averageTime
      questionStats.optionCounts = { ...currentStats.optionCounts }
      questionStats.answers = { ...currentStats.answers }

      // 更新总体统计
      const totalAnswers = this.stats.questionStats.reduce((sum, q) => sum + q.totalAnswers, 0)
      const totalCorrect = this.stats.questionStats.reduce((sum, q) => sum + q.correctAnswers, 0)
      const totalTime = this.stats.questionStats.reduce((sum, q) => sum + q.averageTime * q.totalAnswers, 0)

      this.stats.overallStats = {
        totalAnswers,
        correctAnswers: totalCorrect,
        correctRate: totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0,
        averageTime: totalAnswers > 0 ? totalTime / totalAnswers : 0
      }

      // 广播统计更新
      this.broadcastToTeachers({
        type: 'stats-update',
        stats: this.stats
      })
    }
  }

  private initializeStats() {
    if (!this.test) return

    const questionStats = this.test.sequences.map(() => ({
      totalAnswers: 0,
      correctAnswers: 0,
      correctRate: 0,
      averageTime: 0,
      optionCounts: {},
      answers: {}
    }))

    this.stats = {
      currentQuestionStats: {
        totalAnswers: 0,
        correctAnswers: 0,
        correctRate: 0,
        averageTime: 0,
        optionCounts: {},
        answers: {}
      },
      questionStats,
      overallStats: {
        totalAnswers: 0,
        correctAnswers: 0,
        correctRate: 0,
        averageTime: 0
      },
      students: Array.from(this.students.values())
    }
  }

  private broadcastToTeachers(message: any) {
    if (!this.wss) return
  
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          const isTeacher = (client as any)._isTeacher
          if (isTeacher) {
            client.send(JSON.stringify(message))
          }
        } catch (error) {
          console.error('Error broadcasting to teachers:', error)
        }
      }
    })
  }
  
  private sendToClient(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending to client:', error)
      }
    }
  }
  
  startTest(testData: any) {
    this.test = testData
    this.currentQuestionIndex = 0
    this.initializeStats()
  
    this.wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, {
          type: 'test-start',
          currentQuestionIndex: this.currentQuestionIndex,
          totalQuestions: this.test.sequences.length,
          options: this.test.sequences[0].options,
          instruction: this.test.instruction,
          lightSettings: this.test.lightSettings
        })
      }
    })
  }
  
  nextQuestion() {
    if (!this.test || this.currentQuestionIndex >= this.test.sequences.length - 1) return
  
    this.currentQuestionIndex++
    const question = this.test.sequences[this.currentQuestionIndex]
  
    this.wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, {
          type: 'next-question',
          questionIndex: this.currentQuestionIndex,
          options: question.options
        })
      }
    })
  }
  
  endTest() {
    if (!this.test) return
  
    this.wss?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, {
          type: 'test-end',
          stats: this.stats
        })
      }
    })
  
    // Reset test state
    this.test = null
    this.currentQuestionIndex = -1
    this.stats = null
  }
  
  stopServer() {
    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server closed')
      })
      this.wss = null
    }
  }
}