<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <!-- テストコントロール -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center space-x-4">
        <h1 class="text-2xl font-bold">テスト実行</h1>
        <div class="text-sm px-3 py-1 rounded-full"
          :class="{
            'bg-blue-100 text-blue-800': !isStarted,
            'bg-green-100 text-green-800': isPlaying,
            'bg-yellow-100 text-yellow-800': isPaused,
          }"
        >
          {{ statusText }}
        </div>
      </div>

      <div class="text-sm text-gray-600">
        接続URL: http://{{ serverAddress }}:8080
      </div>

      <div class="flex space-x-4">
        <button
          v-if="!isStarted"
          @click="startTest"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          テスト開始
        </button>
        <template v-else>
          <button
            v-if="isPlaying"
            @click="pauseTest"
            class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            一時停止
          </button>
          <button
            v-if="isPaused"
            @click="resumeTest"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            再開
          </button>
          <button
            @click="stopTest"
            class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            テスト終了
          </button>
        </template>
      </div>
    </div>

    <!-- メインコンテンツ -->
    <div class="grid grid-cols-3 gap-6">
      <!-- 左: 学生リスト -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium">接続中の学生</h2>
          <span class="text-sm text-gray-600">{{ students.length }}人</span>
        </div>
        <div class="space-y-2">
          <div
            v-for="student in students"
            :key="student.id"
            class="p-3 rounded-lg"
            :class="getStudentStatusClass(student)"
          >
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium">{{ student.name || `学生${student.id}` }}</div>
                <div class="text-sm text-gray-600">
                  正答率: {{ student.correctRate.toFixed(1) }}%
                </div>
              </div>
              <div v-if="student.currentAnswer" class="text-lg font-bold">
                {{ student.currentAnswer }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央: 現在の問題 -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium">現在の問題</h2>
          <div class="text-sm text-gray-600">
            {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
          </div>
        </div>

        <!-- 再生状態 -->
        <div class="space-y-4">
          <div class="relative pt-1">
            <div class="flex mb-2 items-center justify-between">
              <div class="text-sm">進行状況</div>
              <div class="text-sm">{{ remainingTime }}秒</div>
            </div>
            <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
          </div>

          <!-- 音源インジケータ -->
          <div class="flex justify-center space-x-8">
            <div class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-blue-500': playingStage === 'audio1', 'bg-gray-300': playingStage !== 'audio1' }"
              ></div>
              <span class="text-xs text-gray-600">音源1</span>
            </div>
            <div class="text-center">
              <div
                class="w-4 h-4 rounded-full mb-1 mx-auto"
                :class="{ 'bg-blue-500': playingStage === 'audio2', 'bg-gray-300': playingStage !== 'audio2' }"
              ></div>
              <span class="text-xs text-gray-600">音源2</span>
            </div>
          </div>

          <!-- シーケンス制御ボタン -->
          <div class="flex justify-center space-x-4 mt-4">
            <button
              v-if="isPlaying && !isPaused && (playingStage === 'audio1' || playingStage === 'audio2')"
              @click="pauseAudio"
              class="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              音源再生一時停止
            </button>
            <button
              v-if="isPaused && (playingStage === 'audio1' || playingStage === 'audio2')"
              @click="resumeAudio"
              class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              音源再生再開
            </button>
          </div>

          <!-- 正解表示 -->
          <div v-if="showingAnswer" class="mt-4">
            <div class="text-center font-medium mb-2">正解</div>
            <div class="grid grid-cols-2 gap-4">
              <div
                v-for="option in currentSequence?.options"
                :key="option.value"
                class="p-3 text-center rounded-lg border-2"
                :class="{
                  'border-green-500 bg-green-50': option.value === currentSequence?.correctOption,
                  'border-gray-200': option.value !== currentSequence?.correctOption
                }"
              >
                {{ option.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右: 統計情報 -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium">統計情報</h2>
        </div>

        <!-- 現在の問題の統計 -->
        <div v-if="currentQuestionStats" class="mb-6">
          <h3 class="text-sm font-medium text-gray-600 mb-2">現在の問題</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 bg-gray-50 rounded-lg text-center">
              <div class="text-2xl font-bold text-green-600">
                {{ currentQuestionStats.correctRate.toFixed(1) }}%
              </div>
              <div class="text-sm text-gray-600">正答率</div>
            </div>
            <div class="p-3 bg-gray-50 rounded-lg text-center">
              <div class="text-2xl font-bold text-blue-600">
                {{ currentQuestionStats.averageTime.toFixed(1) }}秒
              </div>
              <div class="text-sm text-gray-600">平均回答時間</div>
            </div>
          </div>

          <!-- 選択肢分布 -->
          <div v-if="showingAnswer" class="mt-4 space-y-2">
            <div
              v-for="option in currentSequence?.options"
              :key="option.value"
              class="flex items-center space-x-2"
            >
              <div class="w-8 text-center">{{ option.label }}</div>
              <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all"
                  :class="option.value === currentSequence?.correctOption ? 'bg-green-500' : 'bg-gray-400'"
                  :style="{
                    width: `${getOptionPercentage(option.value)}%`
                  }"
                ></div>
              </div>
              <div class="w-16 text-right text-sm">
                {{ getOptionCount(option.value) }}人
              </div>
            </div>
          </div>
        </div>

        <!-- 全体統計 -->
        <div v-if="questionStats.length > 0">
          <h3 class="text-sm font-medium text-gray-600 mb-2">全体</h3>
          <div class="space-y-4">
            <div class="p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600 text-center">
                {{ overallStats.correctRate.toFixed(1) }}%
              </div>
              <div class="text-sm text-gray-600 text-center">総合正答率</div>
            </div>

            <!-- 問題別正答率 -->
            <div class="space-y-2">
              <div
                v-for="(stat, index) in questionStats"
                :key="index"
                class="flex items-center space-x-2"
              >
                <div class="w-16 text-sm">問題{{ index + 1 }}</div>
                <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-green-500"
                    :style="{ width: `${stat.correctRate}%` }"
                  ></div>
                </div>
                <div class="w-16 text-right text-sm">
                  {{ stat.correctRate.toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 結果ダイアログ -->
    <TestResultDialog
      v-if="showResults"
      :show="showResults"
      :stats="testStats"
      :test="testData"
      :total-questions="totalQuestions"
      @close="closeResults"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TestResultDialog from '../components/TestResultDialog.vue'
import type { 
  TestSettings, 
  TestSequence, 
  AudioFile, 
  StudentStats, 
  QuestionStats 
} from '../types'
import { getServerAddress } from '../utils/network'

// 状態管理
const isStarted = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const playingStage = ref<'wait' | 'audio1' | 'pause' | 'audio2' | 'answer' | null>(null)
const currentQuestionIndex = ref(-1)
const remainingTime = ref(0)
const showingAnswer = ref(false)
const showResults = ref(false)

// サーバーアドレス
const serverAddress = ref('')

// テストデータ
const testData = ref<TestSettings | null>(null)
const currentSequence = computed(() => 
  testData.value?.sequences[currentQuestionIndex.value] || null
)
const totalQuestions = computed(() => 
  testData.value?.sequences.length || 0
)

// 学生と統計データ
const students = ref<StudentStats[]>([])
const currentQuestionStats = ref<QuestionStats | null>(null)
const questionStats = ref<QuestionStats[]>([])
const testStats = ref<any>(null)

// タイマー管理
let countdownInterval: NodeJS.Timer | null = null
let sequenceTimeout: NodeJS.Timeout | null = null

// 計算プロパティ
const statusText = computed(() => {
  if (!isStarted.value) return '準備中'
  if (isPaused.value) return '一時停止中'
  if (isPlaying.value) return 'テスト実行中'
  return '終了'
})

const progressPercentage = computed(() => {
  if (!currentSequence.value || remainingTime.value === 0) return 0
  const totalTime = getCurrentStageTime()
  return (remainingTime.value / totalTime) * 100
})

const overallStats = computed(() => {
  if (questionStats.value.length === 0) return { correctRate: 0 }
  const totalCorrect = questionStats.value.reduce((sum, q) => sum + q.correctAnswers, 0)
  const totalAnswers = questionStats.value.reduce((sum, q) => sum + q.totalAnswers, 0)
  return {
    correctRate: totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0
  }
})

// メソッド
const getCurrentStageTime = () => {
  if (!currentSequence.value) return 0
  
  switch (playingStage.value) {
    case 'wait':
      return currentSequence.value.waitTime
    case 'pause':
      return currentSequence.value.pauseTime
    case 'answer':
      return currentSequence.value.answerTime
    default:
      return 0
  }
}

const startTest = async () => {
  try {
    if (!testData.value) return
    
    isStarted.value = true
    isPlaying.value = true
    currentQuestionIndex.value = 0
    await window.electronAPI.startTest(testData.value)
    startQuestionSequence()
  } catch (error) {
    console.error('Failed to start test:', error)
  }
}

const pauseTest = () => {
  isPlaying.value = false
  isPaused.value = true
  clearTimeouts()
  window.electronAPI.pauseAudio()
}

const resumeTest = () => {
  isPlaying.value = true
  isPaused.value = false
  startQuestionSequence()
}

const stopTest = async () => {
  try {
    clearTimeouts()
    await window.electronAPI.stopAudio()
    await window.electronAPI.stopTest()
    isPlaying.value = false
    isPaused.value = false
    showResults.value = true
  } catch (error) {
    console.error('Failed to stop test:', error)
  }
}

const startQuestionSequence = async () => {
  if (!currentSequence.value || !isPlaying.value) return

  try {
    // 開始待ち時間
    playingStage.value = 'wait'
    remainingTime.value = currentSequence.value.waitTime
    await startTimer(currentSequence.value.waitTime * 1000)

    if (!isPlaying.value) return

    // 音源1の再生
    playingStage.value = 'audio1'
    await window.electronAPI.playAudio(currentSequence.value.audio1)
    
    if (!isPlaying.value) return

    // 休止時間
    playingStage.value = 'pause'
    remainingTime.value = currentSequence.value.pauseTime
    await startTimer(currentSequence.value.pauseTime * 1000)
    
    if (!isPlaying.value) return

    // 音源2の再生
    playingStage.value = 'audio2'
    await window.electronAPI.playAudio(currentSequence.value.audio2)
    
    if (!isPlaying.value) return

    // 回答時間
    playingStage.value = 'answer'
    remainingTime.value = currentSequence.value.answerTime
    await startTimer(currentSequence.value.answerTime * 1000)
    
    if (!isPlaying.value) return

    // 次の問題へ
    await handleQuestionEnd()
  } catch (error) {
    console.error('Error in question sequence:', error)
  }
}

const startTimer = (duration: number) => {
  return new Promise<void>((resolve) => {
    if (countdownInterval) clearInterval(countdownInterval)
    
    const startTime = Date.now()
    const endTime = startTime + duration
    
    countdownInterval = setInterval(() => {
      if (!isPlaying.value) return

      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      
      remainingTime.value = Math.ceil(remaining / 1000)
      
      if (remaining <= 0) {
        if (countdownInterval) clearInterval(countdownInterval)
        resolve()
      }
    }, 100)
  })
}

const handleQuestionEnd = async () => {
  showingAnswer.value = true
  await startTimer(5000) // 5秒間正解を表示

  if (!isPlaying.value) return
  
  showingAnswer.value = false
  
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
    window.electronAPI.nextQuestion()
    startQuestionSequence()
  } else {
    stopTest()
  }
}

const pauseAudio = async () => {
  try {
    await window.electronAPI.pauseAudio()
    isPaused.value = true
  } catch (error) {
    console.error('Failed to pause audio:', error)
  }
}

const resumeAudio = async () => {
  try {
    await window.electronAPI.resumeAudio()
    isPaused.value = false
  } catch (error) {
    console.error('Failed to resume audio:', error)
  }
}

const getStudentStatusClass = (student: StudentStats) => {
  if (!student.currentAnswer) return 'bg-gray-50'
  if (showingAnswer.value) {
    return student.currentAnswer === currentSequence.value?.correctOption
      ? 'bg-green-50'
      : 'bg-red-50'
  }
  return 'bg-blue-50'
}

const getOptionCount = (option: string) => {
  return currentQuestionStats.value?.optionCounts[option] || 0
}

const getOptionPercentage = (option: string) => {
  const count = getOptionCount(option)
  const total = currentQuestionStats.value?.totalAnswers || 0
  return total > 0 ? (count / total) * 100 : 0
}

const closeResults = () => {
  showResults.value = false
}

// 初期化とクリーンアップ
onMounted(async () => {
  // サーバーアドレスを取得して表示
  serverAddress.value = await getServerAddress()
  
  // 接続情報を表示
  const connectInfo = document.createElement('div')
  connectInfo.className = 'fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow'
  connectInfo.innerHTML = `
    <p class="text-sm font-medium">接続方法</p>
    <p class="text-xs text-gray-600">ブラウザで以下のURLにアクセス:</p>
    <p class="text-sm font-mono">http://${serverAddress.value}:8080/student</p>
  `
  document.body.appendChild(connectInfo)

  // テストデータの初期化
  window.electronAPI.onInitTestData((data) => {
    testData.value = data
    totalQuestions.value = data.sequences.length
  })

  // 状態更新の監視
  window.electronAPI.onTestStateUpdate((state) => {
    students.value = state.students
    currentQuestionStats.value = state.currentQuestionStats
    questionStats.value = state.questionStats
    testStats.value = state
  })
})

onUnmounted(() => {
  clearTimeouts()
})

const clearTimeouts = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (sequenceTimeout) {
    clearTimeout(sequenceTimeout)
    sequenceTimeout = null
  }
}
</script>