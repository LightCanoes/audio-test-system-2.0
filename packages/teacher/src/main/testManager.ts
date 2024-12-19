// src/main/testManager.ts
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import * as http from 'http'
import { URL } from 'url'
import type { TestSettings, TestSequence } from '../renderer/types'

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
  private server: http.Server
  private wss: WebSocketServer | null = null
  private students: Map<string, Student> = new Map()
  private test: TestSettings | null = null
  private currentQuestionIndex: number = -1

  private stats: TestStats | null = null
  private audioBasePath: string = ''

  private broadcastStudentList() {
    if (!this.wss) return

    const studentList = Array.from(this.students.values()).map(student => ({
      id: student.id,
      correctRate: student.correctRate,
      totalAnswered: student.totalAnswered
    }))

    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify({
            type: 'student-list',
            data: studentList
          }))
        } catch (error) {
          console.error('Error broadcasting student list:', error)
        }
      }
    })
  }

  constructor(audioBasePath: string = '') {
    super()
    this.server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/student') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Audio Test Student</title>
            </head>
            <body>
              <div id="app">
                <h1>Audio Test Student</h1>
                <p id="status">Connecting to server...</p>
              </div>
              <script>
                try {
                  // 直接使用当前地址
                  const ws = new WebSocket('ws://' + location.host);
                  
                  ws.onopen = () => {
                    console.log('Connected to server');
                    document.getElementById('status').textContent = 'Connected to server';
                  };
                  
                  ws.onmessage = (event) => {
                    console.log('Received message:', event.data);
                    document.getElementById('status').textContent = 'Message: ' + event.data;
                  };
                  
                  ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    document.getElementById('status').textContent = 'Connection error';
                  };
                  
                  ws.onclose = () => {
                    console.log('Disconnected from server');
                    document.getElementById('status').textContent = 'Disconnected from server';
                  };
                } catch (error) {
                  console.error('Error creating WebSocket:', error);
                  document.getElementById('status').textContent = 'Failed to create connection: ' + error;
                }
              </script>
            </body>
          </html>
        `)
      } else {
        console.log('404 for:', req.url)
        res.writeHead(404)
        res.end()
      }
    })
  }

  public startServer(): boolean {
    if (this.wss) return false

    try {
      // 先启动 HTTP 服务器
      this.server.listen(8080, () => {
        console.log('HTTP server is running on port 8080')

        // 创建 WebSocket 服务器，不指定 path
        this.wss = new WebSocketServer({ 
          server: this.server,
          // 移除 path 配置，让它处理所有 WebSocket 请求
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
            currentQuestion: this.currentQuestionIndex
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

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error)
    })
  }



  private getAudioPath(fileId: string): string {
    if (!this.test?.audioFiles) return ''
    const audioFile = this.test.audioFiles.find(f => f.id === fileId)
    return audioFile ? audioFile.path : ''
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
  
  public startTest(testData: TestSettings): boolean {
    if (!this.wss) return false
    
    this.test = testData
    this.currentQuestionIndex = 0
    
    // 广播测试开始消息
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'test-start',
          data: {
            test: this.test,
            currentQuestion: this.currentQuestionIndex,
            totalQuestions: this.test.sequences.length
          }
        }))
      }
    })
    
    return true
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