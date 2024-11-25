<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <!-- 加载状态 -->
    <loading-spinner :show="loading" :message="loadingMessage" />

    <!-- 错误提示 -->
    <error-alert
      :show="!!error"
      :message="error"
      @close="error = null"
    />

    <!-- 标题区域 -->
    <div class="mb-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold">テスト実行</h1>
      <button
        @click="handleOpenStudentWindow"
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        学生画面を開く
      </button>
    </div>

    <!-- 主内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧：测试信息 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 测试信息 -->
        <test-info
          :current-question="currentQuestionIndex"
          :total-questions="totalQuestions"
          :remaining-time="remainingTime"
          :correct-rate="currentStats.correctRate"
          :average-time="currentStats.averageTime"
        />

        <!-- 测试控制按钮 -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="space-y-4">
            <!-- 未开始状态 -->
            <button
              v-if="!isStarted"
              @click="handleStartTest"
              class="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              テスト開始
            </button>

            <!-- 进行中状态 -->
            <template v-else>
              <button
                v-if="isPlaying"
                @click="handlePauseTest"
                class="w-full py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                一時停止
              </button>
              <button
                v-else-if="isPaused"
                @click="handleResumeTest"
                class="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                再開
              </button>
              <button
                @click="handleStopTest"
                class="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                テスト終了
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- 右侧：学生状态和答题情况 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 当前阶段指示 -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">現在のステージ</h3>
            <span class="text-gray-500">
              {{ getStageText(playingStage) }}
            </span>
          </div>
          <!-- 播放阶段进度指示 -->
          <div class="mt-4 flex justify-center space-x-8">
            <div
              v-for="stage in ['wait', 'audio1', 'pause', 'audio2', 'answer']"
              :key="stage"
              class="text-center"
            >
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="getStageIndicatorClass(stage)"
              ></div>
              <span class="text-xs text-gray-600">{{ getStageText(stage) }}</span>
            </div>
          </div>
        </div>

        <!-- 学生列表和答题状态 -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-4 border-b">
            <h3 class="text-lg font-medium">学生の状況</h3>
          </div>
          <div class="p-4">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      学生
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      回答状況
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      正答率
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr
                    v-for="student in students"
                    :key="student.id"
                    :class="getStudentStatusClass(student)"
                  >
                    <td class="px-6 py-4 whitespace-nowrap">
                      {{ student.name || `学生${student.id}` }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {{ getAnswerStatus(student) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      {{ student.correctRate.toFixed(1) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 测试结果对话框 -->
    <test-result-dialog
      v-if="showResults"
      :show="showResults"
      :students="students"
      :question-stats="questionStats"
      :overall-stats="overallStats"
      @close="handleCloseResults"
      @export="handleExportResults"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { WebSocketClient } from '../utils/websocket'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ErrorAlert from '../components/ErrorAlert.vue'
import TestInfo from '../components/TestInfo.vue'
import TestResultDialog from '../components/TestResultDialog.vue'
import type { 
  TestData,
  Student, 
  QuestionStats 
} from '../types'

// 状态管理
const loading = ref(false)
const loadingMessage = ref('')
const error = ref<string | null>(null)

// 测试状态
const isStarted = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const currentQuestionIndex = ref(-1)
const totalQuestions = ref(0)
const remainingTime = ref(0)
const showResults = ref(false)

// 播放阶段
const playingStage = ref<'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null>(null)

// 数据状态
const testData = ref<TestData | null>(null)
const students = ref<Student[]>([])
const currentStats = ref({
  correctRate: 0,
  averageTime: 0
})
const questionStats = ref<QuestionStats[]>([])
const overallStats = ref({
  correctRate: 0,
  averageTime: 0
})

// WebSocket 客户端
let ws: WebSocketClient | null = null
let countdownInterval: number | null = null
let questionSequenceTimeout: number | null = null

// 方法
const getStageText = (stage: string | null) => {
  switch (stage) {
    case 'wait': return '開始待ち'
    case 'audio1': return '音源1'
    case 'pause': return '休止'
    case 'audio2': return '音源2'
    case 'answer': return '回答'
    default: return '待機中'
  }
}

const getStageIndicatorClass = (stage: string) => {
  return {
    'bg-blue-500': playingStage.value === stage,
    'bg-gray-300': playingStage.value !== stage
  }
}

const getStudentStatusClass = (student: Student) => {
  if (!student.currentAnswer) return 'bg-gray-50'
  if (playingStage.value === 'answer' && student.currentAnswer === currentQuestion.value?.correctOption) {
    return 'bg-green-50'
  }
  return 'bg-blue-50'
}

const getAnswerStatus = (student: Student) => {
  if (!student.currentAnswer) return '未回答'
  return `回答済み: ${student.currentAnswer}`
}

const currentQuestion = computed(() => {
  if (!testData.value || currentQuestionIndex.value === -1) return null
  return testData.value.sequences[currentQuestionIndex.value]
})

const startAnswerTimer = () => {
  if (countdownInterval) clearInterval(countdownInterval)
  
  countdownInterval = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      clearInterval(countdownInterval)
      handleQuestionEnd()
    }
  }, 1000) as unknown as number
}

const clearAllTimeouts = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (questionSequenceTimeout) {
    clearTimeout(questionSequenceTimeout)
    questionSequenceTimeout = null
  }
}

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => {
    questionSequenceTimeout = setTimeout(resolve, ms) as unknown as number
  })

// 事件处理
const handleOpenStudentWindow = async () => {
  try {
    setLoading(true, '学生画面を開いています...')
    await window.electronAPI.createStudentWindow()
  } catch (error) {
    handleError('学生画面の起動に失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleStartTest = async () => {
  if (!testData.value) {
    handleError('テストデータが見つかりません')
    return
  }

  try {
    setLoading(true, 'テストを開始しています...')
    isStarted.value = true
    isPlaying.value = true
    currentQuestionIndex.value = 0
    await window.electronAPI.startTest(testData.value)
    await startQuestionSequence()
  } catch (err) {
    handleError('テストの開始に失敗しました')
    isStarted.value = false
    isPlaying.value = false
  } finally {
    setLoading(false)
  }
}

const handlePauseTest = async () => {
  try {
    setLoading(true, 'テストを一時停止しています...')
    isPlaying.value = false
    isPaused.value = true
    clearAllTimeouts()
    await window.electronAPI.stopAudio()
  } catch (err) {
    handleError('テストの一時停止に失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleResumeTest = async () => {
  try {
    setLoading(true, 'テストを再開しています...')
    isPlaying.value = true
    isPaused.value = false
    await startQuestionSequence()
  } catch (err) {
    handleError('テストの再開に失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleStopTest = async () => {
  try {
    setLoading(true, 'テストを終了しています...')
    clearAllTimeouts()
    await window.electronAPI.stopAudio()
    await window.electronAPI.endTest()
    isPlaying.value = false
    isPaused.value = false
    showResults.value = true
  } catch (err) {
    handleError('テストの終了に失敗しました')
  } finally {
    setLoading(false)
  }
}

const startQuestionSequence = async () => {
  const question = currentQuestion.value
  if (!question) {
    handleError('問題データが見つかりません')
    return
  }

  try {
    // Wait time
    playingStage.value = 'wait'
    await sleep(question.waitTime * 1000)

    // Play audio 1
    playingStage.value = 'audio1'
    await window.electronAPI.playAudio(question.audio1)

    // Pause time
    playingStage.value = 'pause'
    await sleep(question.pauseTime * 1000)

    // Play audio 2
    playingStage.value = 'audio2'
    await window.electronAPI.playAudio(question.audio2)

    // Answer time
    playingStage.value = 'answer'
    remainingTime.value = question.answerTime
    startAnswerTimer()
  } catch (err) {
    handleError('問題シーケンスの実行に失敗しました')
    await handleStopTest()
  }
}

const handleQuestionEnd = async () => {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
    await startQuestionSequence()
  } else {
    await handleStopTest()
  }
}

const handleCloseResults = () => {
  showResults.value = false
  isStarted.value = false
  currentQuestionIndex.value = -1
  playingStage.value = null
}

const handleExportResults = async () => {
  try {
    setLoading(true, '結果をエクスポートしています...')
    
    const exportData = {
      timestamp: new Date().toISOString(),
      overallStats: overallStats.value,
      questionStats: questionStats.value,
      students: students.value,
    }

    // Create JSON file for download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `test-results-${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    handleError('結果のエクスポートに失敗しました')
  } finally {
    setLoading(false)
  }
}

const handleError = (message: string) => {
  error.value = message
  setLoading(false)
}

const setLoading = (isLoading: boolean, message: string = '') => {
  loading.value = isLoading
  loadingMessage.value = message
}

// ... 前面的代码保持不变 ...

// 初始化和清理
onMounted(() => {
  window.electronAPI.onInitTestData((data: TestData) => {
    testData.value = data
    totalQuestions.value = data.sequences.length
  })

  // WebSocket 事件处理
  ws = new WebSocketClient('ws://localhost:8080/teacher')
  
  ws.on('student-connected', (data) => {
    students.value.push(data.student)
  })

  ws.on('student-disconnected', (data) => {
    const index = students.value.findIndex(s => s.id === data.studentId)
    if (index !== -1) {
      students.value.splice(index, 1)
    }
  })

  ws.on('answer-submitted', (data) => {
    const student = students.value.find(s => s.id === data.studentId)
    if (student) {
      student.currentAnswer = data.answer.option
      if (data.answer.isCorrect) {
        student.correctCount++
      }
      student.totalAnswered++
      student.correctRate = (student.correctCount / student.totalAnswered) * 100
    }
  })

  ws.on('stats-update', (data) => {
    currentStats.value = data.currentQuestionStats
    questionStats.value = data.questionStats
    overallStats.value = data.overallStats
  })

  // 连接 WebSocket 服务器
  ws.connect()
})

onUnmounted(() => {
  // 清理定时器
  clearAllTimeouts()
  
  // 清理 WebSocket 连接
  if (ws) {
    ws.close()
    ws = null
  }
  
  // 重置状态
  isStarted.value = false
  isPlaying.value = false
  isPaused.value = false
  currentQuestionIndex.value = -1
  playingStage.value = null
  showResults.value = false
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>